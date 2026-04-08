/**
 * Reportei Sync Worker — FASE 1
 *
 * Roda segunda, quarta e sexta-feira (3×/semana) e também via trigger manual.
 * Para cada cliente com connector 'reportei' configurado:
 *   1. Sincroniza insights de performance (7d, 30d, 90d) → learned_insights
 *   2. Sincroniza métricas de briefings entregues → briefing_post_metrics
 *   3. Persiste snapshot na tabela reportei_metric_snapshots para histórico
 */

import { query } from '../db';
import { ReporteiClient, PLATFORM_METRICS, ReporteiMetricRequest } from '../providers/reportei/reporteiClient';
import { getReporteiConnector } from '../providers/reportei/reporteiConnector';
import { syncAllClientsLearningRules } from '../services/reporteiLearningSync';

const WINDOWS = ['7d', '30d', '90d'];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// In-memory cache of real metric defs fetched from Reportei per slug.
// Populated once per worker run, shared across all client syncs.
const metricDefsCache: Map<string, ReporteiMetricRequest[]> = new Map();
const SLUG_TO_PLATFORM: Record<string, string> = {
  instagram_business: 'Instagram',
  linkedin:           'LinkedIn',
  facebook_ads:       'MetaAds',
  google_adwords:     'GoogleAds',
  google_analytics_4: 'GoogleAnalytics',
};
const PLATFORM_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_PLATFORM).map(([k, v]) => [v, k])
);

function normName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function numericCandidates(...values: Array<string | number | null | undefined>): number[] {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );
}

/**
 * Fetch real metric definitions from Reportei for a given platform slug.
 * Results are cached per slug for the lifetime of this worker run.
 * Falls back to hardcoded PLATFORM_METRICS if the API call fails.
 */
async function resolveMetricDefs(
  rc: ReporteiClient,
  overrides: { token: string; baseUrl?: string },
  tenantId: string,
  slug: string,
  platform: string
): Promise<ReporteiMetricRequest[]> {
  if (metricDefsCache.has(slug)) return metricDefsCache.get(slug)!;

  const hardcoded = PLATFORM_METRICS[platform] ?? [];
  const desiredKeys = hardcoded.map(m => m.id); // reference_keys from our preset

  try {
    const { rows } = await query<{
      metric_id: string;
      reference_key: string | null;
      component: string | null;
      metric_keys: any;
    }>(
      `SELECT metric_id, reference_key, component, metric_keys
         FROM reportei_metric_catalog
        WHERE tenant_id = $1
          AND integration_slug = $2
          AND ($3::text[] IS NULL OR reference_key = ANY($3::text[]))
        ORDER BY COALESCE(reference_key, metric_id) ASC`,
      [tenantId, slug, desiredKeys.length ? desiredKeys : null],
    );

    const catalogDefs = rows.map((row) => ({
      id: row.metric_id,
      reference_key: row.reference_key ?? undefined,
      metrics: Array.isArray(row.metric_keys) && row.metric_keys.length ? row.metric_keys : ['value'],
      component: (row.component as ReporteiMetricRequest['component']) ?? 'number_v1',
    }));

    if (catalogDefs.length > 0) {
      console.log(`[reporteiSync] ${platform}: using ${catalogDefs.length} metric defs from local catalog`);
      metricDefsCache.set(slug, catalogDefs);
      return catalogDefs;
    }
  } catch (e: any) {
    console.log(`[reporteiSync] ${platform}: could not load metric defs from catalog (${e.message}), trying API`);
  }

  try {
    const live = await rc.fetchMetricDefs(slug, desiredKeys, overrides);
    if (live && live.length > 0) {
      console.log(`[reporteiSync] ${platform}: fetched ${live.length} metric defs from Reportei API`);
      metricDefsCache.set(slug, live);
      return live;
    }
  } catch (e: any) {
    console.log(`[reporteiSync] ${platform}: could not fetch metric defs (${e.message}), using hardcoded`);
  }

  // Fall back to hardcoded reference_keys
  metricDefsCache.set(slug, hardcoded);
  return hardcoded;
}

/**
 * When a platform's integration ID returns "expired", fetch the live integration list
 * from Reportei and find one that matches the client name with the expected slug.
 * If a different (newer) ID is found, update the DB connector and return the new ID.
 * Returns null if no better ID was found (OAuth is truly expired or no match).
 */
async function tryRefreshPlatformId(
  tenantId: string,
  clientId: string,
  slug: string,
  currentId: number,
  clientName: string,
  token: string
): Promise<number | null> {
  try {
    const rc = new ReporteiClient();
    const res = await rc.getIntegrations({ slug, per_page: 100 }, { token });
    const integrations: any[] = res?.data ?? [];

    const clientNorm = normName(clientName);
    let bestMatch: any = null;
    for (const i of integrations) {
      const n = normName(i.name);
      if (n === clientNorm || n.includes(clientNorm) || clientNorm.includes(n)) {
        bestMatch = i;
        break;
      }
    }

    if (!bestMatch) return null;
    const newId = Number(bestMatch.id);
    if (newId === currentId) {
      // Same ID — this means Reportei OAuth is truly expired, not a stale ID
      console.log(`[reporteiSync] ${clientName} ${slug}: same ID ${currentId}, OAuth truly expired`);
      return null;
    }

    // Different ID found — update the connector in DB
    const { rows } = await query<any>(
      `SELECT payload FROM connectors WHERE tenant_id=$1 AND client_id=$2 AND provider='reportei'`,
      [tenantId, clientId]
    );
    if (rows[0]) {
      const payload = rows[0].payload ?? {};
      if (!payload.platforms) payload.platforms = {};
      payload.platforms[slug] = newId;
      // Also update primary integration_id if this is instagram
      if (slug === 'instagram_business') payload.integration_id = newId;
      await query(
        `UPDATE connectors SET payload=$3::jsonb, updated_at=now()
         WHERE tenant_id=$1 AND client_id=$2 AND provider='reportei'`,
        [tenantId, clientId, JSON.stringify(payload)]
      );
    }

    console.log(`[reporteiSync] ${clientName} ${slug}: refreshed ID ${currentId} → ${newId}`);
    return newId;
  } catch (e: any) {
    console.log(`[reporteiSync] ${clientName} ${slug}: auto-refresh failed: ${e.message}`);
    return null;
  }
}

async function resolveInventoryProjectId(
  tenantId: string,
  clientId: string,
  clientName: string | undefined,
  connector: Awaited<ReturnType<typeof getReporteiConnector>>,
): Promise<number | null> {
  const { rows: clientRows } = await query<{ reportei_account_id: string | null; name: string | null }>(
    `SELECT reportei_account_id, name
       FROM clients
      WHERE tenant_id=$1 AND id=$2
      LIMIT 1`,
    [tenantId, clientId],
  );

  const explicitProjectCandidates = numericCandidates(
    connector?.projectId,
    connector?.accountId,
    clientRows[0]?.reportei_account_id ?? null,
  );
  if (explicitProjectCandidates.length) {
    const { rows } = await query<{ reportei_project_id: number }>(
      `SELECT reportei_project_id
         FROM reportei_projects
        WHERE tenant_id=$1
          AND reportei_project_id = ANY($2::bigint[])
        ORDER BY reportei_project_id ASC
        LIMIT 1`,
      [tenantId, explicitProjectCandidates],
    );
    if (rows[0]?.reportei_project_id) return Number(rows[0].reportei_project_id);
  }

  const integrationCandidates = numericCandidates(
    connector?.integrationId,
    ...Object.values(connector?.platforms ?? {}),
  );
  if (integrationCandidates.length) {
    const { rows } = await query<{ reportei_project_id: number }>(
      `SELECT reportei_project_id
         FROM reportei_integrations
        WHERE tenant_id=$1
          AND reportei_integration_id = ANY($2::bigint[])
          AND reportei_project_id IS NOT NULL
        LIMIT 1`,
      [tenantId, integrationCandidates],
    );
    if (rows[0]?.reportei_project_id) return Number(rows[0].reportei_project_id);
  }

  const normalizedClientName = normName(clientRows[0]?.name || clientName || '');
  if (!normalizedClientName) return null;

  const { rows } = await query<{ reportei_project_id: number; name: string | null }>(
    `SELECT reportei_project_id, name
       FROM reportei_projects
      WHERE tenant_id=$1`,
    [tenantId],
  );
  const match = rows.find((row) => normName(row.name || '') === normalizedClientName);
  return match?.reportei_project_id ? Number(match.reportei_project_id) : null;
}

async function loadInventoryPlatformIds(
  tenantId: string,
  projectId: number | null,
): Promise<Record<string, number>> {
  if (!projectId) return {};
  const { rows } = await query<{ slug: string | null; reportei_integration_id: number }>(
    `SELECT slug, reportei_integration_id
       FROM reportei_integrations
      WHERE tenant_id=$1
        AND reportei_project_id=$2
        AND slug IS NOT NULL
        AND COALESCE(status, 'active') = 'active'`,
    [tenantId, projectId],
  );

  return rows.reduce<Record<string, number>>((acc, row) => {
    if (row.slug) acc[row.slug] = Number(row.reportei_integration_id);
    return acc;
  }, {});
}

let running = false;
let lastRunDate = '';

function isSyncDay(): boolean {
  // Monday=1, Wednesday=3, Friday=5
  return [1, 3, 5].includes(new Date().getDay());
}

function shouldRunToday(): boolean {
  // Run Mon/Wed/Fri — OR if forced via env
  if (process.env.REPORTEI_SYNC_FORCE === 'true') return true;
  return isSyncDay();
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

function parseMetricsObj(raw: any): Record<string, any> {
  const obj: Record<string, any> = {};
  if (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    for (const [key, val] of Object.entries(raw.data as Record<string, any>)) {
      obj[key] = {
        value: (val as any)?.values ?? (val as any)?.value ?? null,
        comparison: (val as any)?.comparison?.values ?? null,
        delta_pct: (val as any)?.comparison?.difference ?? null,
      };
    }
  } else if (Array.isArray(raw?.data)) {
    for (const item of raw.data) {
      const key: string = item.id ?? item.reference_key ?? '';
      if (!key) continue;
      obj[key] = {
        value: item.data?.value ?? item.values ?? item.value ?? null,
        comparison: item.data?.comparison ?? item.comparison ?? null,
        delta_pct: item.data?.delta_pct ?? item.delta_pct ?? null,
      };
    }
  } else {
    const arr: any[] = Array.isArray(raw) ? raw : (raw?.metrics ?? raw?.items ?? []);
    for (const item of arr) {
      const key: string = item.id ?? item.reference_key ?? '';
      if (!key) continue;
      obj[key] = {
        value: item.data?.value ?? item.values ?? item.value ?? null,
        comparison: item.data?.comparison ?? item.comparison ?? null,
        delta_pct: item.data?.delta_pct ?? item.delta_pct ?? null,
      };
    }
  }
  return obj;
}

function requestKeyBatchMeta(requestKey: string) {
  const match = /:batch:(\d+):(\d+)$/.exec(requestKey || '');
  if (!match) return null;
  return {
    index: Number(match[1]),
    total: Number(match[2]),
  };
}

async function loadRawMetricsSnapshot(
  tenantId: string,
  clientId: string,
  slug: string,
  window: string,
): Promise<{ integrationId: number; metricsObj: Record<string, any> } | null> {
  const { start, end } = windowToDates(window);
  const { rows } = await query<{
    reportei_integration_id: number;
    request_key: string;
    response_payload: any;
    synced_at: string;
  }>(
    `WITH ranked AS (
       SELECT reportei_integration_id, request_key, response_payload, synced_at,
              ROW_NUMBER() OVER (
                PARTITION BY reportei_integration_id, request_key
                ORDER BY synced_at DESC
              ) AS rn
         FROM reportei_metric_raw_payloads
        WHERE tenant_id = $1
          AND client_id = $2
          AND integration_slug = $3
          AND time_window = $4
          AND period_start = $5
          AND period_end = $6
     )
     SELECT reportei_integration_id, request_key, response_payload, synced_at
       FROM ranked
      WHERE rn = 1
      ORDER BY synced_at DESC, request_key ASC`,
    [tenantId, clientId, slug, window, start, end],
  );

  if (!rows.length) return null;

  const rowsByIntegration = new Map<number, typeof rows>();
  for (const row of rows) {
    const items = rowsByIntegration.get(row.reportei_integration_id) ?? [];
    items.push(row);
    rowsByIntegration.set(row.reportei_integration_id, items);
  }

  for (const [integrationId, integrationRows] of rowsByIntegration.entries()) {
    const batchMeta = integrationRows
      .map((row) => requestKeyBatchMeta(row.request_key))
      .filter((item): item is NonNullable<typeof item> => !!item);

    if (batchMeta.length) {
      const expectedTotal = Math.max(...batchMeta.map((item) => item.total));
      const actualBatches = new Set(batchMeta.map((item) => item.index)).size;
      if (expectedTotal > actualBatches) continue;
    }

    const metricsObj = integrationRows.reduce<Record<string, any>>((acc, row) => {
      Object.assign(acc, parseMetricsObj(row.response_payload));
      return acc;
    }, {});

    if (Object.keys(metricsObj).length > 0) {
      return { integrationId, metricsObj };
    }
  }

  return null;
}

async function fetchMetrics(
  rc: ReporteiClient,
  overrides: { token: string; baseUrl?: string },
  integrationId: number,
  metricDefs: any[],
  window: string
): Promise<Record<string, any> | null> {
  const { start, end, compStart, compEnd } = windowToDates(window);
  const raw = await rc.getMetricsData({
    integration_id: integrationId,
    start, end,
    metrics: metricDefs,
    comparison_start: compStart,
    comparison_end: compEnd,
  }, overrides);

  if (raw?.data?.code || raw?.data?.exception) {
    const msg = raw.data.exception?.message ?? raw.data.code ?? 'unknown_error';
    throw new Error(`Reportei API error: ${msg}`);
  }

  const obj = parseMetricsObj(raw);
  return Object.keys(obj).length > 0 ? obj : null;
}

async function syncClientMetrics(
  clientId: string,
  tenantId: string,
  token: string,
  clientName?: string
): Promise<{ snapshots: number; rawSnapshots: number; apiSnapshots: number; errors: string[] }> {
  const connector = await getReporteiConnector(tenantId, clientId);
  const hasAnyId = connector?.integrationId || (connector?.platforms && Object.keys(connector.platforms).length > 0);
  if (!connector || !hasAnyId) return { snapshots: 0, rawSnapshots: 0, apiSnapshots: 0, errors: ['no_integration_id'] };

  const rc = new ReporteiClient();
  const overrides = { token, baseUrl: connector.baseUrl };
  const inventoryProjectId = await resolveInventoryProjectId(tenantId, clientId, clientName, connector).catch(() => null);
  const inventoryPlatforms = await loadInventoryPlatformIds(tenantId, inventoryProjectId).catch(() => ({} as Record<string, number>));

  const toSync: Array<{ integrationId: number; platform: string; slug: string }> = [];
  const slugsToSync = new Set<string>([
    ...Object.keys(inventoryPlatforms),
    ...Object.keys(connector.platforms ?? {}),
  ]);
  if (slugsToSync.size > 0) {
    for (const slug of slugsToSync) {
      const id = inventoryPlatforms[slug] ?? connector.platforms?.[slug];
      const platform = SLUG_TO_PLATFORM[slug];
      if (id && platform && PLATFORM_METRICS[platform]?.length) {
        toSync.push({ integrationId: Number(id), platform, slug });
      }
    }
  }
  if (toSync.length === 0 && (inventoryPlatforms.instagram_business || connector.integrationId)) {
    toSync.push({
      integrationId: Number(inventoryPlatforms.instagram_business ?? connector.integrationId),
      platform: 'Instagram',
      slug: 'instagram_business',
    });
  }

  let snapshots = 0;
  let rawSnapshots = 0;
  let apiSnapshots = 0;
  const errors: string[] = [];
  // Cache refreshed IDs per platform so we only call Reportei once per platform
  const refreshedIds: Record<string, number> = {};

  for (const { integrationId: origId, platform, slug } of toSync) {
    const metricDefs = await resolveMetricDefs(rc, overrides, tenantId, slug, platform);
    if (!metricDefs?.length) continue;

    for (const window of WINDOWS) {
      const { start, end } = windowToDates(window);
      let activeId = refreshedIds[platform] ?? origId;
      try {
        let metricsObj: Record<string, any> | null = null;
        let snapshotIntegrationId = activeId;
        let usedRawSource = false;

        const rawSnapshot = await loadRawMetricsSnapshot(tenantId, clientId, slug, window).catch(() => null);
        if (rawSnapshot) {
          metricsObj = rawSnapshot.metricsObj;
          snapshotIntegrationId = rawSnapshot.integrationId;
          usedRawSource = true;
        } else {
          metricsObj = await fetchMetrics(rc, overrides, activeId, metricDefs, window);
        }

        if (!metricsObj && clientName && !refreshedIds[platform]) {
          // Empty result — try to find fresh ID
          const newId = await tryRefreshPlatformId(tenantId, clientId, slug, activeId, clientName, token);
          if (newId) {
            refreshedIds[platform] = newId;
            activeId = newId;
            metricsObj = await fetchMetrics(rc, overrides, activeId, metricDefs, window);
            snapshotIntegrationId = newId;
            usedRawSource = false;
          }
        }

        if (!metricsObj) continue;

        await query(
          `INSERT INTO reportei_metric_snapshots
             (tenant_id, client_id, integration_id, platform, time_window, period_start, period_end, metrics)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
           ON CONFLICT (client_id, integration_id, platform, time_window, period_start)
           DO UPDATE SET metrics=$8::jsonb, synced_at=now()`,
          [tenantId, clientId, snapshotIntegrationId, platform, window, start, end, JSON.stringify(metricsObj)]
        );

        await query(
          `INSERT INTO learned_insights (tenant_id, client_id, platform, time_window, payload)
           VALUES ($1,$2,$3,$4,$5::jsonb)`,
          [tenantId, clientId, platform, window, JSON.stringify({
            platform, window,
            by_format: [{ format: 'all', score: 50, kpis: Object.entries(metricsObj).map(([k, v]) => ({ metric: k, value: (v as any).value })), notes: [] }],
            by_tag: [],
            observed_at: new Date().toISOString(),
            raw: metricsObj,
          })]
        ).catch(() => {});

        snapshots++;
        if (usedRawSource) rawSnapshots++;
        else apiSnapshots++;
      } catch (e: any) {
        const msg: string = e.message ?? '';
        // If expired error and we haven't refreshed yet, auto-heal
        if (msg.includes('expired') && clientName && !refreshedIds[platform]) {
          const newId = await tryRefreshPlatformId(tenantId, clientId, slug, activeId, clientName, token);
          if (newId) {
            refreshedIds[platform] = newId;
            // Retry this window with new ID
            try {
              const { start, end } = windowToDates(window);
              const metricsObj = await fetchMetrics(rc, overrides, newId, metricDefs, window);
              if (metricsObj) {
                await query(
                  `INSERT INTO reportei_metric_snapshots
                   (tenant_id, client_id, integration_id, platform, time_window, period_start, period_end, metrics)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
                   ON CONFLICT (client_id, integration_id, platform, time_window, period_start)
                   DO UPDATE SET metrics=$8::jsonb, synced_at=now()`,
                  [tenantId, clientId, newId, platform, window, start, end, JSON.stringify(metricsObj)]
                );
                snapshots++;
                apiSnapshots++;
                await sleep(5000);
                continue;
              }
            } catch { /* fall through to error */ }
          }
        }
        errors.push(`${platform}/${window}: ${msg}`);
      }
      await sleep(2500);
    }
  }

  return { snapshots, rawSnapshots, apiSnapshots, errors };
}

async function updateConnectorStatus(tenantId: string, clientId: string, ok: boolean, error: string | null) {
  if (ok) {
    await query(
      `UPDATE connectors SET last_sync_ok=true, last_sync_at=NOW(), last_error=NULL
       WHERE tenant_id=$1 AND client_id=$2 AND provider='reportei'`,
      [tenantId, clientId]
    ).catch(() => {});
  } else {
    await query(
      `UPDATE connectors SET last_sync_ok=false, last_error=$3
       WHERE tenant_id=$1 AND client_id=$2 AND provider='reportei'`,
      [tenantId, clientId, error]
    ).catch(() => {});
  }
}

export async function runReporteiSyncWorkerOnce() {
  if (running) return;
  if (!shouldRunToday()) return;
  const today = new Date().toISOString().slice(0, 10);
  if (lastRunDate === today) return;
  running = true;

  try {
    const token = process.env.REPORTEI_TOKEN || '';
    if (!token) return;

    // Clear cached metric defs so we fetch fresh definitions each run
    metricDefsCache.clear();

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
        const result = await syncClientMetrics(client.id, client.tenant_id, token, client.name);
        console.log(
          `[reporteiSync] ${client.name}: ${result.snapshots} snapshots (raw=${result.rawSnapshots}, api=${result.apiSnapshots})` +
          `${result.errors.length ? ` | errors: ${result.errors.join(', ')}` : ''}`,
        );
        await updateConnectorStatus(client.tenant_id, client.id, result.snapshots > 0, result.errors.join('; ') || null);
      } catch (e: any) {
        console.error(`[reporteiSync] ${client.name} failed:`, e.message);
        await updateConnectorStatus(client.tenant_id, client.id, false, e.message).catch(() => {});
      }
      // Pause between clients to avoid Reportei rate limits
      await sleep(8000);
    }

    // FASE 3: generate learning rules from fresh snapshots (non-blocking)
    syncAllClientsLearningRules()
      .then(({ clients, total_rules }) =>
        console.log(`[reporteiSync] Learning sync: ${total_rules} rules for ${clients} clients`)
      )
      .catch((e) => console.error('[reporteiSync] Learning sync failed:', e.message));

    lastRunDate = today;
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

  const { rows } = await query<any>(
    `SELECT name FROM clients WHERE id=$1 LIMIT 1`,
    [clientId]
  ).catch(() => ({ rows: [] }));

  const result = await syncClientMetrics(clientId, tenantId, token, rows[0]?.name);
  await updateConnectorStatus(tenantId, clientId, result.snapshots > 0, result.errors.join('; ') || null);
  return result;
}
