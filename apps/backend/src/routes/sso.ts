import { FastifyInstance } from 'fastify';
import { getOidcClient } from '../auth/oidc';
import * as oidcClient from 'openid-client';
import { findUserByEmail, upsertUser } from '../repositories/edroUserRepository';
import { ensureTenantForDomain, ensureTenantMembership, mapRoleToTenantRole } from '../repos/tenantRepo';

export default async function ssoRoutes(app: FastifyInstance) {
  app.get('/auth/sso/start', async (_request, reply) => {
    const config = await getOidcClient();
    const url = oidcClient.buildAuthorizationUrl(config, {
      scope: 'openid email profile',
      prompt: 'select_account',
    });
    return reply.redirect(url.toString());
  });

  app.get('/auth/sso/callback', async (request: any, reply: any) => {
    const config = await getOidcClient();
    const reqUrl = new URL(request.url, `http://${request.headers.host}`);
    const tokenSet = await oidcClient.authorizationCodeGrant(config, reqUrl);
    const claims = (tokenSet.claims() ?? {}) as Record<string, any>;

    const email = String(claims.email || '');
    const name = String(claims.name || claims.given_name || email || '');
    if (!email) return reply.status(400).send({ error: 'no_email' });

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return reply.status(403).send({ error: 'invalid_domain' });

    const tenant = await ensureTenantForDomain(domain, false);
    if (!tenant) return reply.status(403).send({ error: 'tenant_not_found_for_domain', domain });

    let user = await findUserByEmail(email);
    if (!user) {
      user = await upsertUser({ email, name, role: 'viewer' });
    }

    const tenantRole = mapRoleToTenantRole(user.role);
    await ensureTenantMembership({ tenant_id: tenant.id, user_id: user.id, role: tenantRole });

    const access = app.jwt.sign(
      { sub: user.id, email, role: tenantRole, tenant_id: tenant.id },
      { expiresIn: '30m' }
    );

    const webUrl = process.env.WEB_URL || 'http://localhost:3000';
    const redirect = `${webUrl}/?token=${encodeURIComponent(access)}`;
    return reply.redirect(redirect);
  });
}
