import crypto from 'crypto';
import { allowUnsafeLocalAuthHelpers, env, portalLoginSecret } from '../env';
import { makeHash } from '../utils/hash';
import { createLoginCode, consumeLoginCode, findUserByEmail, upsertUser } from '../repositories/edroUserRepository';
import { sendEmail } from './emailService';
import { securityLog } from '../audit/securityLog';
import { findTenantBySlug, getPrimaryTenantForUser } from '../repos/tenantRepo';

const DEFAULT_CODE_TTL_MINUTES = 10;
const DEFAULT_PORTAL_CODE_TTL_MINUTES = 15;

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

export const buildPortalCodeHash = (email: string, code: string) =>
  makeHash(`portal:${portalLoginSecret}:${email}:${code}`);

const generateCode = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, '0');

const resolveRole = (email: string) =>
  adminEmails.includes(email) ? 'gestor' : null;

async function resolveAuthTenantId(email: string): Promise<string | undefined> {
  const user = await findUserByEmail(email);
  if (user?.id) {
    const membership = await getPrimaryTenantForUser(user.id);
    if (membership?.tenant_id) return membership.tenant_id;
  }

  const domain = email.split('@')[1] || '';
  if (!domain) return undefined;

  const tenant = await findTenantBySlug(domain.toLowerCase());
  return tenant?.id;
}

export function isAllowedEmail(email: string) {
  if (!allowedDomains.length) return true;
  const domain = email.split('@')[1] || '';
  return allowedDomains.includes(domain.toLowerCase());
}

export async function requestLoginCode(emailInput: string, meta?: { ip?: string; userAgent?: string }) {
  const email = normalizeEmail(emailInput);
  if (!isAllowedEmail(email)) {
    securityLog({ event: 'LOGIN_FAILED_DOMAIN', email, ip: meta?.ip ?? null }).catch(() => {});
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
    tenantId: await resolveAuthTenantId(email),
  });

  if (delivery.ok) {
    securityLog({ event: 'LOGIN_CODE_REQUESTED', email, ip: meta?.ip ?? null, user_agent: meta?.userAgent ?? null }).catch(() => {});
    return { delivery: 'email' as const };
  }

  const allowEcho = env.EDRO_LOGIN_ECHO_CODE || allowUnsafeLocalAuthHelpers;
  if (allowEcho) {
    securityLog({ event: 'LOGIN_CODE_REQUESTED', email, ip: meta?.ip ?? null, detail: { delivery: 'echo' } }).catch(() => {});
    return { delivery: 'echo' as const, code, error: delivery.error };
  }

  securityLog({ event: 'LOGIN_FAILED_EMAIL_DELIVERY', email, ip: meta?.ip ?? null }).catch(() => {});
  console.warn('[auth] email delivery failed', delivery.error);
  throw new Error('email_failed');
}

export async function issuePortalLoginCode(
  emailInput: string,
  options?: { ttlMinutes?: number },
) {
  const email = normalizeEmail(emailInput);
  const code = generateCode();
  const ttlMinutes = options?.ttlMinutes ?? DEFAULT_PORTAL_CODE_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await createLoginCode({
    email,
    codeHash: buildPortalCodeHash(email, code),
    expiresAt,
  });

  return {
    email,
    code,
    ttlMinutes,
    expiresAt,
  };
}

export async function verifyLoginCode(emailInput: string, code: string, meta?: { ip?: string; userAgent?: string }) {
  const email = normalizeEmail(emailInput);
  if (!isAllowedEmail(email)) {
    securityLog({ event: 'LOGIN_FAILED_DOMAIN', email, ip: meta?.ip ?? null }).catch(() => {});
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
    securityLog({ event: 'LOGIN_FAILED_INVALID_CODE', email, ip: meta?.ip ?? null, user_agent: meta?.userAgent ?? null }).catch(() => {});
    throw new Error('invalid_code');
  }

  const role = resolveRole(email);
  const user = await upsertUser({ email, role });

  securityLog({
    event: 'LOGIN_SUCCESS',
    email,
    user_id: (user as any).id ?? null,
    tenant_id: (user as any).tenant_id ?? null,
    ip: meta?.ip ?? null,
    user_agent: meta?.userAgent ?? null,
  }).catch(() => {});

  return user;
}
