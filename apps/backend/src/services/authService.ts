import crypto from 'crypto';
import { allowUnsafeLocalAuthHelpers, env, portalLoginSecret } from '../env';
import { makeHash } from '../utils/hash';
import { createLoginCode, consumeLoginCode, upsertUser } from '../repositories/edroUserRepository';
import { sendEmail } from './emailService';

const DEFAULT_CODE_TTL_MINUTES = 10;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const parseList = (value?: string | null) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const allowedDomains = parseList(env.EDRO_ALLOWED_DOMAINS || 'edro.digital');
const adminEmails = parseList(env.EDRO_ADMIN_EMAILS || '');

const buildCodeHash = (email: string, code: string) =>
  makeHash(`${portalLoginSecret}:${email}:${code}`);

const generateCode = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, '0');

const resolveRole = (email: string) =>
  adminEmails.includes(email) ? 'gestor' : null;

export function isAllowedEmail(email: string) {
  if (!allowedDomains.length) return true;
  const domain = email.split('@')[1] || '';
  return allowedDomains.includes(domain.toLowerCase());
}

export async function requestLoginCode(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!isAllowedEmail(email)) {
    throw new Error('domain_not_allowed');
  }

  const code = generateCode();
  const ttlMinutes = env.EDRO_LOGIN_CODE_TTL_MINUTES ?? DEFAULT_CODE_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const codeHash = buildCodeHash(email, code);

  await createLoginCode({ email, codeHash, expiresAt });

  const subject = 'Seu codigo de acesso Edro';
  const text = `Seu codigo de acesso e: ${code}\nEste codigo expira em ${ttlMinutes} minutos.`;

  const delivery = await sendEmail({
    to: email,
    subject,
    text,
  });

  if (delivery.ok) {
    return { delivery: 'email' as const };
  }

  const allowEcho = env.EDRO_LOGIN_ECHO_CODE || allowUnsafeLocalAuthHelpers;
  if (allowEcho) {
    return { delivery: 'echo' as const, code, error: delivery.error };
  }

  console.warn('[auth] email delivery failed', delivery.error);
  throw new Error('email_failed');
}

export async function verifyLoginCode(emailInput: string, code: string) {
  const email = normalizeEmail(emailInput);
  if (!isAllowedEmail(email)) {
    throw new Error('domain_not_allowed');
  }

  // Test mode bypass: accept TEST_AUTH_CODE for any email
  if (env.NODE_ENV === 'test' && process.env.TEST_AUTH_CODE && code === process.env.TEST_AUTH_CODE) {
    const user = await upsertUser({ email, role: resolveRole(email) });
    return user;
  }

  const codeHash = buildCodeHash(email, code);
  const consumed = await consumeLoginCode({ email, codeHash });
  if (!consumed) {
    throw new Error('invalid_code');
  }

  const role = resolveRole(email);
  const user = await upsertUser({ email, role });

  return user;
}
