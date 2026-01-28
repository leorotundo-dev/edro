import { FastifyInstance } from 'fastify';
import { getOidcClient } from '../auth/oidc';
import { findUserByEmail, upsertUser } from '../repositories/edroUserRepository';
import { ensureTenantForDomain, ensureTenantMembership, mapRoleToTenantRole } from '../repos/tenantRepo';

export default async function ssoRoutes(app: FastifyInstance) {
  app.get('/auth/sso/start', async (_request, reply) => {
    const client = await getOidcClient();
    const url = client.authorizationUrl({
      scope: 'openid email profile',
      prompt: 'select_account',
    });
    return reply.redirect(url);
  });

  app.get('/auth/sso/callback', async (request: any, reply: any) => {
    const client = await getOidcClient();
    const params = client.callbackParams(request.raw);
    const tokenSet = await client.callback(process.env.OIDC_REDIRECT_URI!, params, {});
    const claims = tokenSet.claims();

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
