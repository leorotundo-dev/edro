import crypto from 'crypto';
import { query } from '../db';
import { SocialListeningService } from './SocialListeningService';
import { env } from '../env';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { logTavilyUsage } from '../services/ai/aiUsageLogger';

let lastRunAt = 0;

function isEnabled() {
  const flag = process.env.SOCIAL_LISTENING_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
}

function hasDataApiConfig() {
  const base = env.SOCIAL_DATA_API_URL;
  const key = env.SOCIAL_DATA_API_KEY;
  return Boolean(base && key);
}

export async function runSocialListeningWorkerOnce() {
  if (!isEnabled()) return;
  if (!hasDataApiConfig()) return;

  const intervalMs = Number(process.env.SOCIAL_LISTENING_INTERVAL_MS || 6 * 60 * 60 * 1000);
  const now = Date.now();
  if (now - lastRunAt < intervalMs) return;
  lastRunAt = now;

  const limit = Math.min(Number(process.env.SOCIAL_LISTENING_COLLECT_LIMIT || 20), 100);

  const { rows } = await query<{ id: string }>('SELECT id FROM tenants');
  for (const tenant of rows) {
    try {
      const service = new SocialListeningService(tenant.id);
      await service.collectAll({ limit });
    } catch (error) {
      console.error('social_listening_worker', error);
    }

    // Also collect from tracked LinkedIn profiles (Proxycurl)
    try {
      const service = new SocialListeningService(tenant.id);
      await service.collectProfilePosts({ limit: 10 });
    } catch (error) {
      console.error('social_listening_worker_profiles', error);
    }

    // G3 — Tavily web supplement: inject web articles as mentions with platform='web'
    if (isTavilyConfigured()) {
      try {
        const { rows: kws } = await query<{ keyword: string; client_id: string | null }>(
          `SELECT keyword, client_id FROM social_listening_keywords
           WHERE tenant_id=$1 AND is_active=true
           ORDER BY created_at DESC LIMIT 3`,
          [tenant.id]
        );
        for (const { keyword, client_id } of kws) {
          const t0 = Date.now();
          const res = await tavilySearch(
            `${keyword} notícias tendência ${new Date().getFullYear()}`,
            { maxResults: 3, searchDepth: 'basic' }
          );
          logTavilyUsage({
            tenant_id: tenant.id,
            operation: 'search-basic',
            unit_count: 1,
            feature: 'social_web_supplement',
            duration_ms: Date.now() - t0,
            metadata: { keyword },
          });
          for (const r of res.results.slice(0, 2)) {
            if (!r.snippet || r.snippet.length < 50) continue;
            const externalId = crypto.createHash('md5').update(`${keyword}:${r.url}`).digest('hex');
            await query(
              `INSERT INTO social_listening_mentions
                 (tenant_id, client_id, keyword, platform, external_id, content,
                  sentiment, sentiment_score, keywords, url, published_at)
               VALUES ($1,$2,$3,'web',$4,$5,'neutral',50,$6::jsonb,$7,NOW())
               ON CONFLICT (tenant_id, platform, external_id) DO NOTHING`,
              [
                tenant.id,
                client_id,
                keyword,
                externalId,
                `${r.title}\n\n${r.snippet}`.slice(0, 2000),
                JSON.stringify([keyword]),
                r.url,
              ]
            );
          }
        }
      } catch (err: any) {
        console.error('[socialListening] tavily_supplement error:', err?.message);
      }
    }
  }
}
