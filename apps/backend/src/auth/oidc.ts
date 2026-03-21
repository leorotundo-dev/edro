import { discovery } from 'openid-client';
import { env } from '../env';

export async function getOidcClient() {
  const issuerUrl = env.OIDC_ISSUER_URL;
  const clientId = env.OIDC_CLIENT_ID;
  const clientSecret = env.OIDC_CLIENT_SECRET;
  const redirectUri = env.OIDC_REDIRECT_URI;

  if (!issuerUrl || !clientId || !clientSecret || !redirectUri) {
    throw new Error('oidc_not_configured');
  }

  return discovery(
    new URL(issuerUrl),
    clientId,
    {
      client_secret: clientSecret,
      redirect_uris: [redirectUri],
      response_types: ['code'],
    },
  );
}
