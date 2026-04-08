import { query } from '../db';
import { ingestReporteiRawMetrics, refreshReporteiInventory } from '../services/reporteiInventoryService';
import { syncTenantLearningRules } from '../services/reporteiLearningSync';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let running = false;
let lastRunAt = 0;

function getWindows(): string[] {
  const raw = process.env.REPORTEI_FOUNDATION_WINDOWS || '7d,30d,90d';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => /^\d+d$/.test(item));
}

function shouldRun(now = Date.now()): boolean {
  const intervalMs = Number(process.env.REPORTEI_FOUNDATION_INTERVAL_MS || 6 * 60 * 60 * 1000);
  return now - lastRunAt >= intervalMs;
}

async function shouldRefreshInventory(tenantId: string, maxAgeMs: number) {
  const { rows } = await query<{ finished_at: string | null }>(
    `SELECT finished_at
       FROM reportei_sync_runs
      WHERE tenant_id = $1
        AND run_type = 'inventory_refresh'
        AND scope = 'company'
        AND status = 'success'
        AND finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1`,
    [tenantId],
  );

  const finishedAt = rows[0]?.finished_at ? new Date(rows[0].finished_at).getTime() : 0;
  return !finishedAt || Date.now() - finishedAt >= maxAgeMs;
}

async function shouldIngestClient(tenantId: string, clientId: string, maxAgeMs: number) {
  const scope = `client:${clientId}`;
  const { rows } = await query<{ finished_at: string | null; metadata: any }>(
    `SELECT finished_at, metadata
       FROM reportei_sync_runs
      WHERE tenant_id = $1
        AND run_type = 'raw_metrics_ingest'
        AND scope = $2
        AND status = 'success'
        AND finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1`,
    [tenantId, scope],
  );

  const latest = rows[0];
  if (!latest?.finished_at) return true;

  const finishedAt = new Date(latest.finished_at).getTime();
  if (!finishedAt || Date.now() - finishedAt >= maxAgeMs) return true;

  const throttled = latest.metadata?.throttled === true;
  const payloads = Number(latest.metadata?.payloads ?? 0);
  return throttled || payloads <= 0;
}

export async function runReporteiFoundationWorkerOnce() {
  if (running) return;
  if ((process.env.REPORTEI_FOUNDATION_ENABLED || 'true') !== 'true') return;
  if (!shouldRun()) return;

  const token = process.env.REPORTEI_TOKEN || '';
  if (!token) return;

  running = true;
  try {
    const windows = getWindows();
    const metricsPerRequest = Number(process.env.REPORTEI_FOUNDATION_METRICS_PER_REQUEST || 40);
    const clientPauseMs = Number(process.env.REPORTEI_FOUNDATION_CLIENT_PAUSE_MS || 5000);
    const throttlePauseMs = Number(process.env.REPORTEI_FOUNDATION_THROTTLE_PAUSE_MS || 60000);
    const inventoryMaxAgeMs = Number(process.env.REPORTEI_FOUNDATION_INVENTORY_MAX_AGE_MS || 24 * 60 * 60 * 1000);
    const clientMaxAgeMs = Number(process.env.REPORTEI_FOUNDATION_CLIENT_MAX_AGE_MS || 12 * 60 * 60 * 1000);

    const { rows: tenants } = await query<{ tenant_id: string }>(
      `SELECT DISTINCT c.tenant_id
         FROM clients c
         INNER JOIN connectors cn ON cn.client_id = c.id AND cn.provider = 'reportei'
        WHERE c.tenant_id IS NOT NULL`
    );

    for (const tenant of tenants) {
      let inventory: Awaited<ReturnType<typeof refreshReporteiInventory>> | null = null;
      const inventoryDue = await shouldRefreshInventory(tenant.tenant_id, inventoryMaxAgeMs).catch(() => true);
      if (inventoryDue) {
        inventory = await refreshReporteiInventory(tenant.tenant_id, token, { includeResources: true });
      }

      const { rows: clients } = await query<{ id: string; name: string }>(
        `SELECT c.id, c.name
           FROM clients c
           INNER JOIN connectors cn ON cn.client_id = c.id AND cn.provider='reportei'
          WHERE c.tenant_id = $1
          ORDER BY c.name ASC`,
        [tenant.tenant_id],
      );

      let payloads = 0;
      let failures = 0;
      let throttledClients = 0;
      let skippedClients = 0;
      for (const client of clients) {
        const ingestDue = await shouldIngestClient(tenant.tenant_id, client.id, clientMaxAgeMs).catch(() => true);
        if (!ingestDue) {
          skippedClients += 1;
          console.log(`[reporteiFoundation] tenant=${tenant.tenant_id} client=${client.name} skipped=true reason=fresh_raw`);
          continue;
        }
        try {
          const result = await ingestReporteiRawMetrics(tenant.tenant_id, token, {
            clientId: client.id,
            windows,
            metricsPerRequest,
          });
          payloads += result.payloads;
          console.log(
            `[reporteiFoundation] tenant=${tenant.tenant_id} client=${client.name} payloads=${result.payloads} integrations=${result.integrations}${result.throttled ? ' throttled=true' : ''}`,
          );
          if (result.throttled) {
            throttledClients += 1;
          }
        } catch (error: any) {
          failures += 1;
          console.error(
            `[reporteiFoundation] tenant=${tenant.tenant_id} client=${client.name} failed:`,
            error?.message || error,
          );
        }
        await sleep(throttledClients > 0 ? Math.max(clientPauseMs, throttlePauseMs) : clientPauseMs);
      }

      console.log(
        `[reporteiFoundation] tenant=${tenant.tenant_id} inventory_refreshed=${inventoryDue} inventory_projects=${inventory?.projects ?? 0} integrations=${inventory?.integrations ?? 0} metrics=${inventory?.metrics ?? 0} payloads=${payloads} failures=${failures} skipped_clients=${skippedClients} throttled_clients=${throttledClients} inventory_warnings=${Array.isArray((inventory as any)?.warnings) ? (inventory as any).warnings.length : 0}`,
      );
      syncTenantLearningRules(tenant.tenant_id)
        .then((result) => {
          console.log(
            `[reporteiFoundation] tenant=${tenant.tenant_id} learning_clients=${result.clients} learning_rules=${result.total_rules}`,
          );
        })
        .catch((error: any) => {
          console.error(
            `[reporteiFoundation] tenant=${tenant.tenant_id} learning sync failed:`,
            error?.message || error,
          );
        });
    }

    lastRunAt = Date.now();
  } finally {
    running = false;
  }
}
