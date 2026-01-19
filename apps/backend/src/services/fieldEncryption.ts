import crypto from 'crypto';

const keySourceEnv = () =>
  process.env.FIELD_ENCRYPTION_KEY ||
  process.env.DATA_ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  '';

function getKey(): Buffer {
  const source = keySourceEnv();
  if (!source) {
    throw new Error('FIELD_ENCRYPTION_KEY is required to encrypt sensitive fields');
  }
  return crypto.createHash('sha256').update(source).digest();
}

function looksEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  return parts.every((part) => /^[0-9a-f]+$/i.test(part));
}

export function encryptField(value: string): string {
  if (!value) return value;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(value: string): string {
  if (!value || !looksEncrypted(value)) return value;
  const [ivHex, tagHex, dataHex] = value.split(':');
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function hashField(value: string): string {
  const key = getKey();
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

export function maskField(value: string, visible: number = 4): string {
  if (!value) return '';
  if (value.length <= visible) return value;
  return `${'*'.repeat(value.length - visible)}${value.slice(-visible)}`;
}

export const FieldEncryption = {
  encryptField,
  decryptField,
  hashField,
  maskField,
};

export default FieldEncryption;
