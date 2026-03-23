import crypto from 'crypto';
import { makeHash } from '../utils/hash';
import { portalLoginSecret } from '../env';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const MFA_TOKEN_DIGITS = 6;
const MFA_STEP_SECONDS = 30;
const MFA_WINDOW_STEPS = 1;
const RECOVERY_CODES_COUNT = 8;

function deriveEncryptionKey() {
  return crypto.createHash('sha256').update(`edro-mfa:${portalLoginSecret}`).digest();
}

function encodeBase32(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(input: string) {
  const normalized = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('invalid_base32');
    }

    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function buildCounterBuffer(counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  return buffer;
}

function generateHotp(secret: string, counter: number) {
  const key = decodeBase32(secret);
  const hmac = crypto.createHmac('sha1', key).update(buildCounterBuffer(counter)).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** MFA_TOKEN_DIGITS).padStart(MFA_TOKEN_DIGITS, '0');
}

function normalizeNumericCode(input: string) {
  return input.replace(/\s+/g, '').replace(/-/g, '');
}

function normalizeRecoveryCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateMfaSecret() {
  return encodeBase32(crypto.randomBytes(20));
}

export function buildMfaOtpAuthUrl(params: { accountName: string; secret: string }) {
  const label = encodeURIComponent(`Edro Digital:${params.accountName}`);
  const issuer = encodeURIComponent('Edro Digital');
  return `otpauth://totp/${label}?secret=${params.secret}&issuer=${issuer}&algorithm=SHA1&digits=${MFA_TOKEN_DIGITS}&period=${MFA_STEP_SECONDS}`;
}

export function verifyMfaCode(secret: string, codeInput: string, now = Date.now()) {
  const code = normalizeNumericCode(codeInput);
  if (!/^\d{6}$/.test(code)) return false;

  const counter = Math.floor(now / 1000 / MFA_STEP_SECONDS);
  for (let offset = -MFA_WINDOW_STEPS; offset <= MFA_WINDOW_STEPS; offset += 1) {
    if (generateHotp(secret, counter + offset) === code) {
      return true;
    }
  }
  return false;
}

export function generateRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODES_COUNT }, () => {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function hashRecoveryCode(code: string) {
  return makeHash(`mfa-recovery:${normalizeRecoveryCode(code)}`);
}

export function isRecoveryCodeFormat(codeInput: string) {
  return /^[A-Z0-9]{10}$/.test(normalizeRecoveryCode(codeInput));
}

export function encryptMfaSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${ciphertext.toString('base64')}`;
}

export function decryptMfaSecret(payload: string) {
  const [ivB64, authTagB64, ciphertextB64] = payload.split('.');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('invalid_mfa_secret_payload');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveEncryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
