/**
 * Structured security event logger.
 *
 * Writes to two sinks simultaneously:
 *   1. audit_log table — persistent, queryable, tenant-scoped
 *   2. stdout (JSON line) — picked up by Railway log drain and any external SIEM
 *
 * Usage:
 *   await securityLog({ event: 'LOGIN_SUCCESS', email: 'x@y.com', ip: '1.2.3.4' })
 */

import { query } from '../db';

export type SecurityEvent =
  | 'LOGIN_CODE_REQUESTED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED_INVALID_CODE'
  | 'LOGIN_FAILED_DOMAIN'
  | 'LOGIN_FAILED_EMAIL_DELIVERY'
  | 'LOGOUT'
  | 'MFA_REQUIRED_BLOCKED'
  | 'MFA_ENROLLED'
  | 'MFA_VERIFY_SUCCESS'
  | 'MFA_VERIFY_FAILED'
  | 'SESSION_EXPIRED'
  | 'PORTAL_TOKEN_ISSUED'
  | 'PORTAL_TOKEN_INVALID'
  | 'SSO_START'
  | 'SSO_CALLBACK_SUCCESS'
  | 'SSO_CALLBACK_FAILED'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_REPLAY_DETECTED'
  | 'RATE_LIMIT_HIT'
  | 'TENANT_GUARD_BLOCKED'
  | 'PERMISSION_DENIED';

export interface SecurityLogParams {
  event: SecurityEvent;
  email?: string | null;
  user_id?: string | null;
  tenant_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  detail?: Record<string, unknown> | null;
}

export async function securityLog(params: SecurityLogParams): Promise<void> {
  const ts = new Date().toISOString();

  // ── Sink 1: stdout (JSON line — Railway log drain / SIEM ingest) ────────────
  const line = JSON.stringify({
    ts,
    level: 'security',
    event: params.event,
    email: params.email ?? undefined,
    user_id: params.user_id ?? undefined,
    tenant_id: params.tenant_id ?? undefined,
    ip: params.ip ?? undefined,
    detail: params.detail ?? undefined,
  });
  process.stdout.write(line + '\n');

  // ── Sink 2: audit_log table ─────────────────────────────────────────────────
  try {
    await query(
      `INSERT INTO audit_log (actor_user_id, actor_email, action, entity_type, entity_id, before, after, ip, user_agent)
       VALUES ($1, $2, $3, 'security_event', $4, NULL, $5::jsonb, $6, $7)`,
      [
        params.user_id ?? null,
        params.email ?? null,
        params.event,
        params.event, // entity_id = event name (no specific entity)
        params.detail ? JSON.stringify(params.detail) : null,
        params.ip ?? null,
        params.user_agent ?? null,
      ]
    );
  } catch {
    // Never throw from audit sink — log to stderr but don't break the request
    process.stderr.write(`[securityLog] audit_log write failed for event ${params.event}\n`);
  }
}
