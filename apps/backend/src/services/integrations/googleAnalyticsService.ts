import { query } from '../../db/db';
import { decryptJSON } from '../../security/secrets';

type GAReport = {
  sessions: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  rows: { dimension: string; sessions: number; pageviews: number }[];
  fetched_at: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchGoogleAnalyticsReport(
  tenantId: string,
  clientId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<GAReport> {
  const { rows } = await query(
    `SELECT payload, secrets_enc FROM connectors
     WHERE tenant_id = $1 AND client_id = $2 AND provider = 'google_analytics'`,
    [tenantId, clientId]
  );

  if (!rows[0]) throw new Error('google_analytics_not_configured');
  if (!rows[0].secrets_enc) throw new Error('google_analytics_no_credentials');

  const payload = rows[0].payload || {};
  const cache = payload._cache as GAReport | undefined;

  // Return cached data if fresh
  if (cache?.fetched_at) {
    const age = Date.now() - new Date(cache.fetched_at).getTime();
    if (age < CACHE_TTL_MS) return cache;
  }

  // Decrypt credentials
  const secrets = await decryptJSON(rows[0].secrets_enc);
  const propertyId = payload.view_id || payload.property_id;

  if (!propertyId) {
    throw new Error('google_analytics_no_property_id');
  }

  // Get access token via service account or refresh token
  let accessToken: string;

  if (secrets.service_account_json) {
    // Service account flow
    accessToken = await getServiceAccountToken(secrets.service_account_json);
  } else if (secrets.refresh_token && secrets.client_id && secrets.client_secret) {
    // OAuth2 refresh token flow
    accessToken = await refreshOAuthToken(secrets.client_id, secrets.client_secret, secrets.refresh_token);
  } else {
    throw new Error('google_analytics_incomplete_credentials');
  }

  const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = dateTo || new Date().toISOString().slice(0, 10);

  // Call GA4 Data API
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      limit: 31,
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`ga4_api_${resp.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await resp.json();
  const gaRows = (data.rows || []).map((r: any) => ({
    dimension: r.dimensionValues?.[0]?.value || '',
    sessions: parseInt(r.metricValues?.[0]?.value || '0', 10),
    pageviews: parseInt(r.metricValues?.[1]?.value || '0', 10),
  }));

  const totals = data.totals?.[0]?.metricValues || [];
  const result: GAReport = {
    sessions: parseInt(totals[0]?.value || '0', 10),
    pageviews: parseInt(totals[1]?.value || '0', 10),
    bounceRate: parseFloat(totals[2]?.value || '0'),
    avgSessionDuration: parseFloat(totals[3]?.value || '0'),
    rows: gaRows,
    fetched_at: new Date().toISOString(),
  };

  // Cache the result
  await query(
    `UPDATE connectors SET payload = payload || $1::jsonb, updated_at = now()
     WHERE tenant_id = $2 AND client_id = $3 AND provider = 'google_analytics'`,
    [JSON.stringify({ _cache: result }), tenantId, clientId]
  );

  return result;
}

async function getServiceAccountToken(serviceAccountJson: string): Promise<string> {
  // For service accounts, we need to create a JWT and exchange it
  // This is a simplified implementation - in production use google-auth-library
  const sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const scope = 'https://www.googleapis.com/auth/analytics.readonly';

  // Create JWT assertion (simplified - uses jose or manual JWT)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope,
    aud: tokenUrl,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${claims}`);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt = `${header}.${claims}.${signature}`;

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!resp.ok) throw new Error('sa_token_exchange_failed');
  const data = await resp.json();
  return data.access_token;
}

async function refreshOAuthToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`,
  });

  if (!resp.ok) throw new Error('oauth_refresh_failed');
  const data = await resp.json();
  return data.access_token;
}
