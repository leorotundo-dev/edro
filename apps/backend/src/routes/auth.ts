import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { buildPortalCodeHash, issuePortalLoginCode, requestLoginCode, verifyLoginCode } from '../services/authService';
import { findUserByEmail, findUserById, consumeLoginCode, upsertUser } from '../repositories/edroUserRepository';
import {
  findUserMfaByUserId,
  savePendingUserMfaSecret,
  enableUserMfa,
  markUserMfaVerified,
  consumeUserRecoveryCode,
} from '../repositories/edroUserMfaRepository';
import {
  generateMfaSecret,
  buildMfaOtpAuthUrl,
  verifyMfaCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  isRecoveryCodeFormat,
  encryptMfaSecret,
  decryptMfaSecret,
} from '../services/mfaService';
import { issueRefreshToken, rotateRefreshToken, revokeAllRefresh } from '../auth/refresh';
import { ensureTenantForDomain, ensureTenantMembership, getPrimaryTenantForUser, mapRoleToTenantRole } from '../repos/tenantRepo';
import { authGuard, shouldEnforcePrivilegedMfa } from '../auth/rbac';
import { sendEmail } from '../services/emailService';
import { pool } from '../db';
import { allowUnsafeLocalAuthHelpers, env } from '../env';
import { securityLog } from '../audit/securityLog';

// ── Pending-MFA token helpers ──────────────────────────────────────────────────
// A pending token is a short-lived JWT that identifies a user who has passed
// the first authentication step but still needs to complete MFA. It cannot be
// used to access protected API routes (no `mfa` claim set to true).

const PENDING_MFA_EXPIRY = '10m';

export function issuePendingMfaToken(
  app: FastifyInstance,
  params: {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
    purpose: 'mfa_challenge' | 'mfa_setup';
  },
): string {
  return app.jwt.sign(
    {
      sub: params.userId,
      email: params.email,
      role: params.role,
      tenant_id: params.tenantId,
      kind: 'pending_mfa',
      purpose: params.purpose,
    },
    { expiresIn: PENDING_MFA_EXPIRY },
  );
}

function verifyPendingMfaToken(app: FastifyInstance, token: string) {
  try {
    const payload = app.jwt.verify<{
      sub: string;
      email: string;
      role: string;
      tenant_id: string;
      kind: string;
      purpose: string;
    }>(token);
    if (payload.kind !== 'pending_mfa') return null;
    return payload;
  } catch {
    return null;
  }
}

export default async function authRoutes(app: FastifyInstance) {
  const hasActiveStaffPortalAccess = async (email: string) => {
    const normalized = email.trim().toLowerCase();
    const { rows } = await pool.query<{ tenant_id: string }>(
      `SELECT tu.tenant_id
         FROM edro_users eu
         JOIN freelancer_profiles fp
           ON fp.user_id = eu.id
          AND fp.is_active = true
         JOIN tenant_users tu
           ON tu.user_id = eu.id
        WHERE eu.email = $1
        LIMIT 1`,
      [normalized],
    );
    return rows[0]?.tenant_id ?? null;
  };

  const buildAuthUserPayload = async (params: {
    userId: string;
    email: string;
    role: string;
    tenantId?: string | null;
  }) => {
    try {
      const { rows } = await pool.query<{
        name: string | null;
        avatar_url: string | null;
      }>(
        `SELECT COALESCE(fp.display_name, eu.name, split_part(eu.email, '@', 1)) AS name,
                fp.avatar_url AS avatar_url
           FROM edro_users eu
           LEFT JOIN freelancer_profiles fp ON fp.user_id = eu.id
          WHERE eu.id = $1
          LIMIT 1`,
        [params.userId, params.tenantId ?? null],
      );

      return {
        id: params.userId,
        email: params.email,
        role: params.role,
        tenant_id: params.tenantId ?? null,
        name: rows[0]?.name ?? params.email.split('@')[0],
        avatar_url: rows[0]?.avatar_url ?? null,
      };
    } catch {
      return {
        id: params.userId,
        email: params.email,
        role: params.role,
        tenant_id: params.tenantId ?? null,
        name: params.email.split('@')[0],
        avatar_url: null,
      };
    }
  };

  const resolvePortalAuthTenantId = async (email: string, role?: 'client' | 'staff') => {
    const normalized = email.trim().toLowerCase();
    const scopes: Array<'client' | 'staff'> = role ? [role] : ['client', 'staff'];

    for (const scope of scopes) {
      if (scope === 'client') {
        // Try portal_user_id path first
        const { rows } = await pool.query<{ tenant_id: string }>(
          `SELECT c.tenant_id
             FROM edro_users eu
             JOIN clients c ON c.portal_user_id = eu.id
            WHERE eu.email = $1
            LIMIT 1`,
          [normalized],
        );
        if (rows[0]?.tenant_id) return rows[0].tenant_id;

        // Fallback: portal_contacts path
        const contactRows = await pool.query<{ tenant_id: string }>(
          `SELECT tenant_id FROM portal_contacts WHERE email = $1 AND is_active = true LIMIT 1`,
          [normalized],
        );
        if (contactRows.rows[0]?.tenant_id) return contactRows.rows[0].tenant_id;
      }

      if (scope === 'staff') {
        const { rows } = await pool.query<{ tenant_id: string }>(
          `SELECT tu.tenant_id
             FROM edro_users eu
             JOIN freelancer_profiles fp
               ON fp.user_id = eu.id
              AND fp.is_active = true
             JOIN tenant_users tu ON tu.user_id = eu.id
            WHERE eu.email = $1
            LIMIT 1`,
          [normalized],
        );
        if (rows[0]?.tenant_id) return rows[0].tenant_id;
      }
    }

    return undefined;
  };

  app.post('/auth/request', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const bodySchema = z.object({ email: z.string().email() });
    const body = bodySchema.parse(request.body);

    try {
      const result = await requestLoginCode(body.email, {
        ip: (request as any).ip,
        userAgent: request.headers['user-agent'] as string | undefined,
      });
      return reply.send({ success: true, ...result });
    } catch (error: any) {
      const message = error?.message === 'domain_not_allowed'
        ? 'Domínio não autorizado.'
        : 'Não foi possível enviar o código.';
      return reply.status(403).send({ success: false, error: message });
    }
  });

  app.post('/auth/verify', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      code: z.string().min(4),
    });

    const body = bodySchema.parse(request.body);

    try {
      const user = await verifyLoginCode(body.email, body.code, {
        ip: (request as any).ip,
        userAgent: request.headers['user-agent'] as string | undefined,
      });

      const domain = user.email.split('@')[1] || '';
      const tenant = await ensureTenantForDomain(domain, true);
      if (!tenant) {
        return reply.status(403).send({ success: false, error: 'tenant_not_found' });
      }

      const tenantRole = mapRoleToTenantRole(user.role);
      await ensureTenantMembership({
        tenant_id: tenant.id,
        user_id: user.id,
        role: tenantRole,
      });

      // If MFA enforcement is active for this role, issue a pending token instead
      if (shouldEnforcePrivilegedMfa(tenantRole)) {
        const mfaRecord = await findUserMfaByUserId(user.id);
        const mfaEnabled = Boolean(mfaRecord?.enabled_at && mfaRecord?.secret_enc);
        const purpose = mfaEnabled ? 'mfa_challenge' : 'mfa_setup';
        const pendingToken = issuePendingMfaToken(app, {
          userId: user.id,
          email: user.email,
          role: tenantRole,
          tenantId: tenant.id,
          purpose,
        });
        return reply.send({
          success: true,
          pendingToken,
          mfaRequired: mfaEnabled,
          mfaEnrollmentRequired: !mfaEnabled,
        });
      }

      const accessToken = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: tenantRole,
          tenant_id: tenant.id,
          mfa: false,
        },
        { expiresIn: '30m' }
      );

      const refreshToken = crypto.randomBytes(48).toString('hex');
      const refreshExpiresAt = await issueRefreshToken(user.id, refreshToken, 14);

      return reply.send({
        success: true,
        token: accessToken,
        accessToken,
        refreshToken,
        refreshExpiresAt,
        user: await buildAuthUserPayload({
          userId: user.id,
          email: user.email,
          role: tenantRole,
          tenantId: tenant.id,
        }),
      });
    } catch (error: any) {
      const isDomain = error?.message === 'domain_not_allowed';
      const isInvalid = error?.message === 'invalid_code';
      return reply.status(isDomain ? 403 : 401).send({
        success: false,
        error: isInvalid ? 'Código inválido ou expirado.' : 'Não autorizado.',
      });
    }
  });

  const handleMe = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      const userPayload = request.user as { email?: string; role?: string; mfa?: boolean };
      if (!userPayload?.email) {
        return reply.status(401).send({ error: 'Não autorizado.' });
      }
      // Enforce MFA for privileged sessions (returns 401, not 403, since this is an auth status endpoint)
      if (shouldEnforcePrivilegedMfa(userPayload.role) && userPayload.mfa !== true) {
        return reply.status(401).send({ error: 'mfa_required' });
      }
      const user = await findUserByEmail(userPayload.email);
      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }
      const tenant = await getPrimaryTenantForUser(user.id);
      const mfaRecord = await findUserMfaByUserId(user.id);
      const mfaEnabled = Boolean(mfaRecord?.enabled_at && mfaRecord?.secret_enc);
      const mfaEnforced = shouldEnforcePrivilegedMfa(tenant?.role ?? user.role);
      return reply.send({
        ...(await buildAuthUserPayload({
          userId: user.id,
          email: user.email,
          role: tenant?.role ?? user.role,
          tenantId: tenant?.tenant_id ?? null,
        })),
        mfa_enabled: mfaEnabled,
        mfa_enforced: mfaEnforced,
      });
    } catch (error) {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
  };

  app.get('/auth/me', handleMe);
  app.get('/me', handleMe);

  app.post('/auth/refresh', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const bodySchema = z.object({
      userId: z.string().uuid(),
      refreshToken: z.string().min(10),
    });

    const body = bodySchema.parse(request.body);
    const newRefresh = crypto.randomBytes(48).toString('hex');

    try {
      const { expiresAt: refreshExpiresAt, mfaVerified } = await rotateRefreshToken(body.userId, body.refreshToken, newRefresh);
      const user = await findUserById(body.userId);
      if (!user) {
        return reply.status(401).send({ error: 'invalid_user' });
      }

      const tenant = await getPrimaryTenantForUser(user.id);
      if (!tenant?.tenant_id) {
        return reply.status(401).send({ error: 'missing_tenant' });
      }

      // Privileged roles require MFA-verified refresh tokens
      if (shouldEnforcePrivilegedMfa(tenant.role) && !mfaVerified) {
        return reply.status(401).send({ error: 'mfa_reauth_required' });
      }

      const accessToken = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: tenant.role,
          tenant_id: tenant.tenant_id,
          mfa: mfaVerified,
        },
        { expiresIn: '30m' }
      );

      return reply.send({
        accessToken,
        refreshToken: newRefresh,
        refreshExpiresAt,
      });
    } catch (err: any) {
      return reply.status(401).send({ error: 'invalid_refresh' });
    }
  });

  app.post('/auth/logout', { preHandler: authGuard }, async (request: any) => {
    const user = request.user as { sub?: string } | undefined;
    if (user?.sub) {
      await revokeAllRefresh(user.sub);
    }
    return { ok: true };
  });

  // ── Portal magic-link auth (client + freelancer portals) ──────────────────

  // POST /auth/magic-link — generate OTP, send via email (bypasses domain check)
  app.post('/auth/magic-link', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { email, role } = z.object({
      email: z.string().email(),
      role: z.enum(['client', 'staff']).optional(),
    }).parse(request.body);

    if (role === 'staff') {
      const tenantId = await hasActiveStaffPortalAccess(email);
      if (!tenantId) {
        return reply.status(403).send({ ok: false, error: 'Nenhum perfil ativo de freelancer vinculado a este e-mail.' });
      }
    }

    const { email: normalized, code } = await issuePortalLoginCode(email, { ttlMinutes: 15 });

    const portalName = role === 'client' ? 'Portal do Cliente' : 'Portal Freelancer';
    const delivery = await sendEmail({
      to: normalized,
      subject: `Seu código de acesso — ${portalName} Edro`,
      text: `Olá!\n\nSeu código de acesso ao ${portalName} é:\n\n${code}\n\nEste código expira em 15 minutos. Não compartilhe com ninguém.\n\n— Edro Digital`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1e293b">Seu código de acesso</h2>
        <p style="color:#475569">${portalName} Edro Digital</p>
        <div style="font-size:2rem;font-weight:700;letter-spacing:.3em;background:#f1f5f9;border-radius:12px;padding:16px 24px;text-align:center;margin:24px 0;color:#0f172a">${code}</div>
        <p style="color:#94a3b8;font-size:.875rem">Expira em 15 minutos. Não compartilhe este código.</p>
      </div>`,
      tenantId: await resolvePortalAuthTenantId(normalized, role),
    });

    if (!delivery.ok) {
      console.error('[magic-link] email delivery failed:', delivery.error, '| to:', normalized);
      // In production without echo mode, surface the error explicitly.
      // When EDRO_LOGIN_ECHO_CODE=true, fall through and return the code on screen.
      if (!allowUnsafeLocalAuthHelpers && !env.EDRO_LOGIN_ECHO_CODE) {
        return reply.status(503).send({ ok: false, error: 'Falha ao enviar e-mail. Tente novamente ou entre em contato com o suporte.' });
      }
    } else {
      console.info(`[magic-link] code sent via ${(delivery as any).provider ?? 'email'} to ${normalized}`);
    }

    const resp: any = { ok: true };
    // Echo code in dev/staging or when EDRO_LOGIN_ECHO_CODE=true
    if (allowUnsafeLocalAuthHelpers || env.EDRO_LOGIN_ECHO_CODE) resp.code = code;
    return reply.send(resp);
  });

  // POST /auth/magic-link/verify — verify OTP and issue portal JWT
  app.post('/auth/magic-link/verify', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { email, code, role } = z.object({
      email: z.string().email(),
      code: z.string().min(4),
      role: z.enum(['client', 'staff']).optional(),
    }).parse(request.body);

    const normalized = email.trim().toLowerCase();
    const codeHash = buildPortalCodeHash(normalized, code);
    const consumed = await consumeLoginCode({ email: normalized, codeHash });
    if (!consumed) {
      return reply.status(401).send({ error: 'Código inválido ou expirado.' });
    }

    const user = await upsertUser({ email: normalized, role: null });

    if (role === 'client') {
      // Path 1: client linked via portal_user_id (legacy invite)
      const { rows } = await pool.query(
        `SELECT c.id AS client_id, c.tenant_id
         FROM clients c
         WHERE c.portal_user_id = $1
         LIMIT 1`,
        [user.id],
      );
      if (rows.length) {
        const { client_id, tenant_id } = rows[0];
        const token = app.jwt.sign(
          { sub: user.id, email: normalized, role: 'client', client_id, tenant_id },
          { expiresIn: '30d' },
        );
        return reply.send({ token });
      }

      // Path 2: client onboarded via portal_contacts invite token
      const contactRes = await pool.query<{
        client_id: string;
        tenant_id: string;
        contact_id: string;
        contact_role: string | null;
        name: string | null;
        client_name: string | null;
        client_logo_url: string | null;
      }>(
        `SELECT pc.client_id, pc.tenant_id, pc.id AS contact_id,
                pc.role AS contact_role, pc.name,
                c.name AS client_name,
                c.profile->>'logo_url' AS client_logo_url
           FROM portal_contacts pc
           JOIN clients c ON c.id = pc.client_id
          WHERE pc.email = $1 AND pc.is_active = true
          LIMIT 1`,
        [normalized],
      );
      if (!contactRes.rows.length) {
        return reply.status(403).send({ error: 'Nenhum portal de cliente vinculado a este e-mail.' });
      }
      const ct = contactRes.rows[0];
      await pool.query(`UPDATE portal_contacts SET last_login_at = now() WHERE id = $1`, [ct.contact_id]);
      const token = app.jwt.sign(
        {
          sub: user.id,
          email: normalized,
          role: 'client',
          client_id: ct.client_id,
          tenant_id: ct.tenant_id,
          contact_id: ct.contact_id,
          contact_role: ct.contact_role ?? null,
          name: ct.name ?? normalized.split('@')[0],
          client_name: ct.client_name ?? null,
          client_logo_url: ct.client_logo_url ?? null,
        },
        { expiresIn: '30d' },
      );
      return reply.send({ token });
    }

    if (role === 'staff') {
      // Find freelancer profile for this user
      let { rows } = await pool.query(
        `SELECT fp.id AS freelancer_id, tu.tenant_id
         FROM freelancer_profiles fp
         JOIN tenant_users tu ON tu.user_id = fp.user_id
         WHERE fp.user_id = $1
           AND fp.is_active = true
         LIMIT 1`,
        [user.id],
      );

      // Setup mode: auto-create minimal profile for admin emails or when echo is enabled
      if (!rows.length) {
        const adminEmails = (env.EDRO_ADMIN_EMAILS ?? '').split(',').map((e: string) => e.trim().toLowerCase());
        const isAdmin = adminEmails.includes(normalized);
        if (allowUnsafeLocalAuthHelpers && (isAdmin || env.EDRO_LOGIN_ECHO_CODE)) {
          // Get the first available tenant
          const { rows: tenants } = await pool.query(`SELECT id FROM tenants LIMIT 1`);
          const tenantId = tenants[0]?.id ?? null;
          if (tenantId) {
            await pool.query(
              `INSERT INTO freelancer_profiles (user_id, display_name, specialty)
               VALUES ($1, $2, 'Admin')
               ON CONFLICT (user_id) DO NOTHING`,
              [user.id, normalized.split('@')[0]],
            );
            await pool.query(
              `INSERT INTO tenant_users (user_id, tenant_id, role)
               VALUES ($1, $2, 'admin')
               ON CONFLICT (user_id, tenant_id) DO NOTHING`,
              [user.id, tenantId],
            );
            const refetch = await pool.query(
              `SELECT fp.id AS freelancer_id, tu.tenant_id
               FROM freelancer_profiles fp
               JOIN tenant_users tu ON tu.user_id = fp.user_id
               WHERE fp.user_id = $1
                 AND fp.is_active = true
               LIMIT 1`,
              [user.id],
            );
            rows = refetch.rows;
          }
        }
      }

      if (!rows.length) {
        return reply.status(403).send({ error: 'Nenhum perfil de freelancer vinculado a este e-mail.' });
      }
      const { freelancer_id, tenant_id } = rows[0];
      const token = app.jwt.sign(
        { sub: user.id, email: normalized, role: 'staff', freelancer_id, tenant_id },
        { expiresIn: '30d' },
      );
      return reply.send({ token });
    }

    // Fallback: generic portal token (admin may use this for testing)
    const tenant = await getPrimaryTenantForUser(user.id);
    const token = app.jwt.sign(
      { sub: user.id, email: normalized, role: 'guest', tenant_id: tenant?.tenant_id ?? null },
      { expiresIn: '7d' },
    );
    return reply.send({ token });
  });

  // ── MFA routes ──────────────────────────────────────────────────────────────

  // POST /auth/mfa/pending — validate a pending MFA token; returns kind + email
  app.post('/auth/mfa/pending', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request: any, reply) => {
    const { pendingToken } = z.object({ pendingToken: z.string().min(10) }).parse(request.body);
    const payload = verifyPendingMfaToken(app, pendingToken);
    if (!payload) {
      return reply.status(401).send({ error: 'invalid_pending_token' });
    }
    return reply.send({ ok: true, kind: payload.purpose, email: payload.email });
  });

  // POST /auth/mfa/enroll/start — generate TOTP secret and return QR code URL
  app.post('/auth/mfa/enroll/start', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request: any, reply) => {
    const { pendingToken } = z.object({ pendingToken: z.string().min(10) }).parse(request.body);
    const payload = verifyPendingMfaToken(app, pendingToken);
    if (!payload || payload.purpose !== 'mfa_setup') {
      return reply.status(401).send({ error: 'invalid_pending_token' });
    }

    const secret = generateMfaSecret();
    const secretEnc = encryptMfaSecret(secret);
    await savePendingUserMfaSecret(payload.sub, secretEnc);

    const otpAuthUrl = buildMfaOtpAuthUrl({ accountName: payload.email, secret });

    securityLog({
      event: 'MFA_ENROLLED',
      email: payload.email,
      user_id: payload.sub,
      tenant_id: payload.tenant_id,
      detail: { stage: 'start' },
    }).catch(() => {});

    return reply.send({ ok: true, otpAuthUrl, secret });
  });

  // POST /auth/mfa/enroll/confirm — verify first TOTP code and activate MFA
  app.post('/auth/mfa/enroll/confirm', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request: any, reply) => {
    const { pendingToken, code } = z.object({
      pendingToken: z.string().min(10),
      code: z.string().min(6).max(8),
    }).parse(request.body);

    const payload = verifyPendingMfaToken(app, pendingToken);
    if (!payload || payload.purpose !== 'mfa_setup') {
      return reply.status(401).send({ error: 'invalid_pending_token' });
    }

    const mfaRecord = await findUserMfaByUserId(payload.sub);
    if (!mfaRecord?.pending_secret_enc) {
      return reply.status(400).send({ error: 'no_pending_enrollment' });
    }

    const secret = decryptMfaSecret(mfaRecord.pending_secret_enc);
    if (!verifyMfaCode(secret, code)) {
      securityLog({ event: 'MFA_VERIFY_FAILED', email: payload.email, user_id: payload.sub, tenant_id: payload.tenant_id, detail: { stage: 'enroll_confirm' } }).catch(() => {});
      return reply.status(401).send({ error: 'invalid_mfa_code' });
    }

    const recoveryCodes = generateRecoveryCodes();
    await enableUserMfa({
      userId: payload.sub,
      secretEnc: mfaRecord.pending_secret_enc,
      recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode),
    });

    securityLog({ event: 'MFA_ENROLLED', email: payload.email, user_id: payload.sub, tenant_id: payload.tenant_id, detail: { stage: 'confirmed' } }).catch(() => {});

    const accessToken = app.jwt.sign(
      { sub: payload.sub, email: payload.email, role: payload.role, tenant_id: payload.tenant_id, mfa: true },
      { expiresIn: '30m' },
    );
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshExpiresAt = await issueRefreshToken(payload.sub, refreshToken, 14);
    return reply.send({
      ok: true,
      accessToken,
      token: accessToken,
      refreshToken,
      refreshExpiresAt,
      recoveryCodes,
      user: await buildAuthUserPayload({
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenant_id,
      }),
    });
  });

  // POST /auth/mfa/verify — verify TOTP (or recovery code) and issue session
  app.post('/auth/mfa/verify', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request: any, reply) => {
    const { pendingToken, code } = z.object({
      pendingToken: z.string().min(10),
      code: z.string().min(6).max(12),
    }).parse(request.body);

    const payload = verifyPendingMfaToken(app, pendingToken);
    if (!payload || payload.purpose !== 'mfa_challenge') {
      return reply.status(401).send({ error: 'invalid_pending_token' });
    }

    const mfaRecord = await findUserMfaByUserId(payload.sub);
    if (!mfaRecord?.enabled_at || !mfaRecord?.secret_enc) {
      return reply.status(400).send({ error: 'mfa_not_configured' });
    }

    let verified = false;
    if (isRecoveryCodeFormat(code)) {
      const hash = hashRecoveryCode(code);
      verified = await consumeUserRecoveryCode(payload.sub, hash);
    } else {
      const secret = decryptMfaSecret(mfaRecord.secret_enc);
      verified = verifyMfaCode(secret, code);
    }

    if (!verified) {
      securityLog({ event: 'MFA_VERIFY_FAILED', email: payload.email, user_id: payload.sub, tenant_id: payload.tenant_id }).catch(() => {});
      return reply.status(401).send({ error: 'invalid_mfa_code' });
    }

    await markUserMfaVerified(payload.sub);
    securityLog({ event: 'MFA_VERIFY_SUCCESS', email: payload.email, user_id: payload.sub, tenant_id: payload.tenant_id }).catch(() => {});

    const accessToken = app.jwt.sign(
      { sub: payload.sub, email: payload.email, role: payload.role, tenant_id: payload.tenant_id, mfa: true },
      { expiresIn: '30m' },
    );
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshExpiresAt = await issueRefreshToken(payload.sub, refreshToken, 14);

    return reply.send({
      ok: true,
      accessToken,
      token: accessToken,
      refreshToken,
      refreshExpiresAt,
      user: await buildAuthUserPayload({
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenant_id,
      }),
    });
  });
}
