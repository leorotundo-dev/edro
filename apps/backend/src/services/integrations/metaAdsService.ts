import { query } from '../../db/db';
import { decryptJSON } from '../../security/secrets';

type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  objective: string;
  insights?: {
    spend: string;
    impressions: string;
    clicks: string;
    reach: string;
  };
};

type MetaAdsResult = {
  campaigns: MetaCampaign[];
  account_id: string;
  fetched_at: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchMetaAdsCampaigns(tenantId: string, clientId: string): Promise<MetaAdsResult> {
  // Check for cached data
  const { rows } = await query(
    `SELECT payload, secrets_enc FROM connectors
     WHERE tenant_id = $1 AND client_id = $2 AND provider = 'meta_ads'`,
    [tenantId, clientId]
  );

  if (!rows[0]) throw new Error('meta_ads_not_configured');
  if (!rows[0].secrets_enc) throw new Error('meta_ads_no_credentials');

  const payload = rows[0].payload || {};
  const cache = payload._cache as MetaAdsResult | undefined;

  // Return cached data if fresh
  if (cache?.fetched_at) {
    const age = Date.now() - new Date(cache.fetched_at).getTime();
    if (age < CACHE_TTL_MS) return cache;
  }

  // Decrypt credentials
  const secrets = await decryptJSON(rows[0].secrets_enc);
  const accessToken = secrets.access_token;
  const adAccountId = payload.ad_account_id;

  if (!accessToken || !adAccountId) {
    throw new Error('meta_ads_incomplete_config');
  }

  // Fetch from Meta Graph API
  const graphVersion = process.env.META_GRAPH_VERSION || 'v18.0';
  const url = `https://graph.facebook.com/${graphVersion}/act_${adAccountId}/campaigns?fields=name,status,objective,insights{spend,impressions,clicks,reach}&limit=25&access_token=${accessToken}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`meta_api_${resp.status}: ${errBody.slice(0, 200)}`);
  }

  const data = (await resp.json()) as { data?: any[] };
  const campaigns: MetaCampaign[] = (data.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    objective: c.objective,
    insights: c.insights?.data?.[0] || null,
  }));

  const result: MetaAdsResult = {
    campaigns,
    account_id: adAccountId,
    fetched_at: new Date().toISOString(),
  };

  // Cache the result
  await query(
    `UPDATE connectors SET payload = payload || $1::jsonb, updated_at = now()
     WHERE tenant_id = $2 AND client_id = $3 AND provider = 'meta_ads'`,
    [JSON.stringify({ _cache: result }), tenantId, clientId]
  );

  return result;
}
