import { FastifyInstance } from 'fastify';
import { getOidcClient } from '../auth/oidc';
import * as oidcClient from 'openid-client';
import { findUserByEmail, upsertUser } from '../repositories/edroUserRepository';
import { ensureTenantForDomain, ensureTenantMembership, mapRoleToTenantRole } from '../repos/tenantRepo';
import { env } from '../env';

const SSO_STATE_COOKIE = 'edro_sso_state';
const SSO_PKCE_COOKIE = 'edro_sso_pkce';
const SSO_NONCE_COOKIE = 'edro_sso_nonce';
const SSO_COOKIE_MAX_AGE_SECONDS = 10 * 60;

function parseCookieHeader(cookieHeader?: string) {
  const jar = new Map<string, string>();
  if (!cookieHeader) return jar;

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName || rawValue.length === 0) continue;
    jar.set(rawName, decodeURIComponent(rawValue.join('=')));
  }

  return jar;
}

function buildCookie(name: string, value: string, maxAge: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function setReplyCookies(reply: any, cookies: string[]) {
  reply.header('Set-Cookie', cookies);
}

function clearSsoCookies(reply: any) {
  setReplyCookies(reply, [
    buildCookie(SSO_STATE_COOKIE, '', 0),
    buildCookie(SSO_PKCE_COOKIE, '', 0),
    buildCookie(SSO_NONCE_COOKIE, '', 0),
  ]);
}

function resolveWebUrl() {
  const webUrl = env.WEB_URL?.replace(/\/$/, '');
  if (!webUrl) {
    throw new Error('web_url_not_configured');
  }
  return webUrl;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildSsoBridgeHtml(actionUrl: string, token: string, nextPath: string) {
  const safeAction = escapeHtml(actionUrl);
  const safeToken = escapeHtml(token);
  const safeNext = escapeHtml(nextPath);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Cache-Control" content="no-store" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Concluindo login</title>
  </head>
  <body>
    <form id="sso-bridge" method="post" action="${safeAction}">
      <input type="hidden" name="token" value="${safeToken}" />
      <input type="hidden" name="next" value="${safeNext}" />
      <noscript>
        <p>Seu login está pronto. Clique abaixo para continuar.</p>
        <button type="submit">Continuar</button>
      </noscript>
    </form>
    <script>
      document.getElementById('sso-bridge')?.submit();
    </script>
  </body>
</html>`;
}

export default async function ssoRoutes(app: FastifyInstance) {
  app.get('/auth/sso/start', async (_request, reply) => {
    const config = await getOidcClient();
    const state = oidcClient.randomState();
    const pkceCodeVerifier = oidcClient.randomPKCECodeVerifier();
    const codeChallenge = await oidcClient.calculatePKCECodeChallenge(pkceCodeVerifier);
    const nonce = oidcClient.randomNonce();
    const url = oidcClient.buildAuthorizationUrl(config, {
      scope: 'openid email profile',
      prompt: 'select_account',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    setReplyCookies(reply, [
      buildCookie(SSO_STATE_COOKIE, state, SSO_COOKIE_MAX_AGE_SECONDS),
      buildCookie(SSO_PKCE_COOKIE, pkceCodeVerifier, SSO_COOKIE_MAX_AGE_SECONDS),
      buildCookie(SSO_NONCE_COOKIE, nonce, SSO_COOKIE_MAX_AGE_SECONDS),
    ]);
    return reply.redirect(url.toString());
  });

  app.get('/auth/sso/callback', async (request: any, reply: any) => {
    const config = await getOidcClient();
    const cookies = parseCookieHeader(request.headers.cookie);
    const expectedState = cookies.get(SSO_STATE_COOKIE);
    const pkceCodeVerifier = cookies.get(SSO_PKCE_COOKIE);
    const expectedNonce = cookies.get(SSO_NONCE_COOKIE);
    const reqUrl = new URL(request.raw?.url || request.url, env.OIDC_REDIRECT_URI);
    if (!expectedState || !pkceCodeVerifier || !expectedNonce) {
      clearSsoCookies(reply);
      return reply.status(400).send({ error: 'missing_sso_session' });
    }

    let tokenSet;
    try {
      tokenSet = await oidcClient.authorizationCodeGrant(config, reqUrl, {
        expectedState,
        pkceCodeVerifier,
        expectedNonce,
      });
    } catch {
      clearSsoCookies(reply);
      return reply.status(400).send({ error: 'invalid_sso_callback' });
    }

    clearSsoCookies(reply);
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

    const webUrl = resolveWebUrl();
    const actionUrl = `${webUrl}/api/auth/sso/complete`;
    const formOrigin = new URL(actionUrl).origin;

    reply
      .header('Cache-Control', 'no-store')
      .header('Content-Type', 'text/html; charset=utf-8')
      .header(
        'Content-Security-Policy',
        `default-src 'none'; base-uri 'none'; form-action ${formOrigin}; frame-ancestors 'none'; script-src 'unsafe-inline'`,
      );

    return reply.send(buildSsoBridgeHtml(actionUrl, access, '/'));
  });
}
