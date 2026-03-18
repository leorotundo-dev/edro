import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { requestLoginCode, verifyLoginCode } from '../services/authService';
import { findUserByEmail, findUserById, createLoginCode, consumeLoginCode, upsertUser } from '../repositories/edroUserRepository';
import { issueRefreshToken, rotateRefreshToken, revokeAllRefresh } from '../auth/refresh';
import { ensureTenantForDomain, ensureTenantMembership, getPrimaryTenantForUser, mapRoleToTenantRole } from '../repos/tenantRepo';
import { authGuard } from '../auth/rbac';
import { sendEmail } from '../services/emailService';
import { makeHash } from '../utils/hash';
import { pool } from '../db';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/request', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const bodySchema = z.object({ email: z.string().email() });
    const body = bodySchema.parse(request.body);

    try {
      const result = await requestLoginCode(body.email);
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
      const user = await verifyLoginCode(body.email, body.code);

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

      const accessToken = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: tenantRole,
          tenant_id: tenant.id,
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
        user: {
          id: user.id,
          email: user.email,
          role: tenantRole,
          tenant_id: tenant.id,
        },
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
      const userPayload = request.user as { email?: string };
      if (!userPayload?.email) {
        return reply.status(401).send({ error: 'Não autorizado.' });
      }
      const user = await findUserByEmail(userPayload.email);
      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }
      const tenant = await getPrimaryTenantForUser(user.id);
      return reply.send({
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: tenant?.tenant_id ?? null,
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
      const refreshExpiresAt = await rotateRefreshToken(body.userId, body.refreshToken, newRefresh);
      const user = await findUserById(body.userId);
      if (!user) {
        return reply.status(401).send({ error: 'invalid_user' });
      }

      const tenant = await getPrimaryTenantForUser(user.id);
      if (!tenant?.tenant_id) {
        return reply.status(401).send({ error: 'missing_tenant' });
      }

      const accessToken = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: tenant.role,
          tenant_id: tenant.tenant_id,
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

  const loginSecret = process.env.EDRO_LOGIN_SECRET || process.env.JWT_SECRET || 'secret';
  const buildPortalHash = (email: string, code: string) =>
    makeHash(`portal:${loginSecret}:${email}:${code}`);

  // POST /auth/magic-link — generate OTP, send via email (bypasses domain check)
  app.post('/auth/magic-link', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { email, role } = z.object({
      email: z.string().email(),
      role: z.enum(['client', 'staff']).optional(),
    }).parse(request.body);

    const normalized = email.trim().toLowerCase();
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await createLoginCode({ email: normalized, codeHash: buildPortalHash(normalized, code), expiresAt });

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
    });

    if (!delivery.ok) {
      console.error('[magic-link] email delivery failed:', delivery.error, '| to:', normalized);
      // In production, surface the error so the user knows the code wasn't sent.
      // Internal portals (freelancer/client) can afford explicit feedback.
      if (env.NODE_ENV === 'production') {
        return reply.status(503).send({ ok: false, error: 'Falha ao enviar e-mail. Tente novamente ou entre em contato com o suporte.' });
      }
    } else {
      console.info(`[magic-link] code sent via ${(delivery as any).provider ?? 'email'} to ${normalized}`);
    }

    const resp: any = { ok: true };
    // Echo code in dev/staging or when EDRO_LOGIN_ECHO_CODE=true
    if (env.NODE_ENV !== 'production' || env.EDRO_LOGIN_ECHO_CODE || !delivery.ok) resp.code = code;
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
    const codeHash = buildPortalHash(normalized, code);
    const consumed = await consumeLoginCode({ email: normalized, codeHash });
    if (!consumed) {
      return reply.status(401).send({ error: 'Código inválido ou expirado.' });
    }

    const user = await upsertUser({ email: normalized, role: null });

    if (role === 'client') {
      // Find client linked via portal_user_id
      const { rows } = await pool.query(
        `SELECT c.id AS client_id, c.tenant_id
         FROM clients c
         WHERE c.portal_user_id = $1
         LIMIT 1`,
        [user.id],
      );
      if (!rows.length) {
        return reply.status(403).send({ error: 'Nenhum portal de cliente vinculado a este e-mail.' });
      }
      const { client_id, tenant_id } = rows[0];
      const token = app.jwt.sign(
        { sub: user.id, email: normalized, role: 'client', client_id, tenant_id },
        { expiresIn: '30d' },
      );
      return reply.send({ token });
    }

    if (role === 'staff') {
      // Find freelancer profile for this user
      const { rows } = await pool.query(
        `SELECT fp.id AS freelancer_id, tu.tenant_id
         FROM freelancer_profiles fp
         JOIN tenant_users tu ON tu.user_id = fp.user_id
         WHERE fp.user_id = $1
         LIMIT 1`,
        [user.id],
      );
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
}
