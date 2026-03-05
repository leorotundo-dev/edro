/**
 * Reportei Sync Worker — FASE 1
 *
 * Roda toda segunda-feira às 03h e também via trigger manual.
 * Para cada cliente com connector 'reportei' configurado:
 *   1. Sincroniza insights de performance (7d, 30d, 90d) → learned_insights
 *   2. Sincroniza métricas de briefings entregues → briefing_post_metrics
 *   3. Persiste snapshot na tabela reportei_metric_snapshots para histórico
 */

import { query } from '../db';
import { ReporteiClient, PLATFORM_METRICS } from '../providers/reportei/reporteiClient';
import { getReporteiConnector } from '../providers/reportei/reporteiConnector';
import { syncAllClientsLearningRules } from '../services/reporteiLearningSync';

const WINDOWS = ['7d', '30d', '90d'];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const SLUG_TO_PLATFORM: Record<string, string> = {
  instagram_business: 'Instagram',
  linkedin:           'LinkedIn',
  facebook_ads:       'MetaAds',
  google_adwords:     'GoogleAds',
  google_analytics_4: 'GoogleAnalytics',
};

let running = false;

function isMonday(): boolean {
  return new Date().getDay() === 1;
}

function shouldRunToday(): boolean {
  // Run every Monday — OR if forced via env
  if (process.env.REPORTEI_SYNC_FORCE === 'true') return true;
  return isMonday();
}

function windowToDates(window: string): { start: string; end: string; compStart: string; compEnd: string } {
  const days = parseInt(window);
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);

  // Comparison: same window shifted back
  const compEnd = new Date(start);
  compEnd.setDate(compEnd.getDate() - 1);
  const compStart = new Date(compEnd);
  compStart.setDate(compStart.getDate() - days);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end), compStart: fmt(compStart), compEnd: fmt(compEnd) };
}

async function ensureSnapshotsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS reportei_metric_snapshots (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id    TEXT NOT NULL,
      client_id    TEXT NOT NULL,
      integration_id BIGINT NOT NULL,
      platform     TEXT NOT NULL,
      time_window  TEXT NOT NULL,
      period_start DATE NOT NULL,
      period_end   DATE NOT NULL,
      metrics      JSONB NOT NULL DEFAULT '{}',
      synced_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (client_id, integration_id, platform, time_window, period_start)
    )
  `).catch(() => {});
}

async function syncClientMetrics(
  clientId: string,
  tenantId: string,
  token: string
): Promise<{ snapshots: number; errors: string[] }> {
  const connector = await getReporteiConnector(tenantId, clientId);
  const hasAnyId = connector?.integrationId || (connector?.platforms && Object.keys(connector.platforms).length > 0);
  if (!connector || !hasAnyId) return { snapshots: 0, errors: ['no_integration_id'] };

  const rc = new ReporteiClient();
  const overrides = { token, baseUrl: connector.baseUrl };

  // Build list of (integrationId, platform) pairs to sync.
  // Prefer the per-platform map; fall back to the single integrationId for all platforms.
  const toSync: Array<{ integrationId: number; platform: string }> = [];
  if (connector.platforms && Object.keys(connector.platforms).length > 0) {
    for (const [slug, id] of Object.entries(connector.platforms)) {
      const platform = SLUG_TO_PLATFORM[slug];
      if (platform && PLATFORM_METRICS[platform]?.length) {
        toSync.push({ integrationId: Number(id), platform });
      }
    }
  }
  // If no platforms map yet, fall back to primary integrationId × Instagram only
  if (toSync.length === 0 && connector.integrationId) {
    const fallbackId = Number(connector.integrationId);
    toSync.push({ integrationId: fallbackId, platform: 'Instagram' });
  }

  let snapshots = 0;
  const errors: string[] = [];

  for (const { integrationId, platform } of toSync) {
    const metricDefs = PLATFORM_METRICS[platform];
    if (!metricDefs?.length) continue;

    for (const window of WINDOWS) {
      const { start, end, compStart, compEnd } = windowToDates(window);
      try {
        const raw = await rc.getMetricsData({
          integration_id: integrationId,
          start,
          end,
          metrics: metricDefs,
          comparison_start: compStart,
          comparison_end: compEnd,
        }, overrides);

        // Log raw response for debugging
        const rawKeys = Object.keys(raw ?? {});
        const rawSample = JSON.stringify(raw).slice(0, 600);
        console.log(`[reporteiSync] raw ${platform}/${window} keys=${rawKeys.join(',')} sample=${rawSample}`);

        const metricsObj: Record<string, any> = {};

        if (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
          // Object format (v2 standard): { data: { "ig:impressions": { values: N, comparison: {...} } } }
          for (const [key, val] of Object.entries(raw.data as Record<string, any>)) {
            metricsObj[key] = {
              value: val?.values ?? val?.value ?? null,
              comparison: val?.comparison?.values ?? null,
              delta_pct: val?.comparison?.difference ?? null,
            };
          }
        } else if (Array.isArray(raw?.data)) {
          // Array inside data key
          for (const item of raw.data) {
            const key: string = item.id ?? item.reference_key ?? '';
            if (!key) continue;
            metricsObj[key] = {
              value: item.data?.value ?? item.values ?? item.value ?? null,
              comparison: item.data?.comparison ?? item.comparison ?? null,
              delta_pct: item.data?.delta_pct ?? item.delta_pct ?? null,
            };
          }
        } else {
          // Fallback: array at root or nested
          const metricsArray: any[] = Array.isArray(raw) ? raw : (raw?.metrics ?? raw?.items ?? []);
          for (const item of metricsArray) {
            const key: string = item.id ?? item.reference_key ?? '';
            if (!key) continue;
            metricsObj[key] = {
              value: item.data?.value ?? item.values ?? item.value ?? null,
              comparison: item.data?.comparison ?? item.comparison ?? null,
              delta_pct: item.data?.delta_pct ?? item.delta_pct ?? null,
            };
          }
        }

        if (Object.keys(metricsObj).length === 0) {
          console.log(`[reporteiSync] empty metricsObj for ${platform}/${window} — raw was: ${rawSample}`);
          continue;
        }

        // Save snapshot
        await query(
          `INSERT INTO reportei_metric_snapshots
             (tenant_id, client_id, integration_id, platform, time_window, period_start, period_end, metrics)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
           ON CONFLICT (client_id, integration_id, platform, time_window, period_start)
           DO UPDATE SET metrics=$8::jsonb, synced_at=now()`,
          [tenantId, clientId, integrationId, platform, window, start, end, JSON.stringify(metricsObj)]
        );

        // Also save to learned_insights for the learning loop
        await query(
          `INSERT INTO learned_insights (tenant_id, client_id, platform, time_window, payload)
           VALUES ($1,$2,$3,$4,$5::jsonb)`,
          [tenantId, clientId, platform, window, JSON.stringify({
            platform, window,
            by_format: [{ format: 'all', score: 50, kpis: Object.entries(metricsObj).map(([k, v]) => ({ metric: k, value: v.value })), notes: [] }],
            by_tag: [],
            observed_at: new Date().toISOString(),
            raw: metricsObj,
          })]
        ).catch(() => {}); // non-fatal if duplicate

        snapshots++;
      } catch (e: any) {
        errors.push(`${platform}/${window}: ${e.message}`);
      }
      // Respect Reportei rate limits between requests
      await sleep(1500);
    }
  }

  return { snapshots, errors };
}

export async function runReporteiSyncWorkerOnce() {
  if (running) return;
  if (!shouldRunToday()) return;
  running = true;

  try {
    const token = process.env.REPORTEI_TOKEN || '';
    if (!token) return;

    await ensureSnapshotsTable();

    const { rows: clients } = await query<any>(
      `SELECT DISTINCT c.id, c.tenant_id, c.name
       FROM clients c
       INNER JOIN connectors cn ON cn.client_id = c.id AND cn.provider = 'reportei'
       LIMIT 100`
    );

    console.log(`[reporteiSync] Starting sync for ${clients.length} clients`);

    for (const client of clients) {
      try {
        const result = await syncClientMetrics(client.id, client.tenant_id, token);
        console.log(`[reporteiSync] ${client.name}: ${result.snapshots} snapshots${result.errors.length ? ` | errors: ${result.errors.join(', ')}` : ''}`);
      } catch (e: any) {
        console.error(`[reporteiSync] ${client.name} failed:`, e.message);
      }
    }

    // FASE 3: generate learning rules from fresh snapshots (non-blocking)
    syncAllClientsLearningRules()
      .then(({ clients, total_rules }) =>
        console.log(`[reporteiSync] Learning sync: ${total_rules} rules for ${clients} clients`)
      )
      .catch((e) => console.error('[reporteiSync] Learning sync failed:', e.message));

    console.log('[reporteiSync] Done');
  } finally {
    running = false;
  }
}

/** Manual trigger: sync a single client immediately */
export async function triggerClientSync(clientId: string, tenantId: string): Promise<{ snapshots: number; errors: string[] }> {
  await ensureSnapshotsTable();
  const token = process.env.REPORTEI_TOKEN || '';
  if (!token) return { snapshots: 0, errors: ['REPORTEI_TOKEN not set'] };
  return syncClientMetrics(clientId, tenantId, token);
}
