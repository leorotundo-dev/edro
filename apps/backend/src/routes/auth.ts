import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { requestLoginCode, verifyLoginCode } from '../services/authService';
import { findUserByEmail, findUserById } from '../repositories/edroUserRepository';
import { issueRefreshToken, rotateRefreshToken, revokeAllRefresh } from '../auth/refresh';
import { ensureTenantForDomain, ensureTenantMembership, getPrimaryTenantForUser, mapRoleToTenantRole } from '../repos/tenantRepo';
import { authGuard } from '../auth/rbac';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/request', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const bodySchema = z.object({ email: z.string().email() });
    const body = bodySchema.parse(request.body);

    try {
      const result = await requestLoginCode(body.email);
      return reply.send({ success: true, ...result });
    } catch (error: any) {
      const message = error?.message === 'domain_not_allowed'
        ? 'Dominio nao autorizado.'
        : 'Nao foi possivel enviar o codigo.';
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
        error: isInvalid ? 'Codigo invalido ou expirado.' : 'Nao autorizado.',
      });
    }
  });

  const handleMe = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      const userPayload = request.user as { email?: string };
      if (!userPayload?.email) {
        return reply.status(401).send({ error: 'Nao autorizado.' });
      }
      const user = await findUserByEmail(userPayload.email);
      if (!user) {
        return reply.status(404).send({ error: 'Usuario nao encontrado.' });
      }
      const tenant = await getPrimaryTenantForUser(user.id);
      return reply.send({
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: tenant?.tenant_id ?? null,
      });
    } catch (error) {
      return reply.status(401).send({ error: 'Nao autorizado.' });
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
}
