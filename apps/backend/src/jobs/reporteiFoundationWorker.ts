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

    const { rows: tenants } = await query<{ tenant_id: string }>(
      `SELECT DISTINCT c.tenant_id
         FROM clients c
         INNER JOIN connectors cn ON cn.client_id = c.id AND cn.provider = 'reportei'
        WHERE c.tenant_id IS NOT NULL`
    );

    for (const tenant of tenants) {
      const inventory = await refreshReporteiInventory(tenant.tenant_id, token, { includeResources: true });

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
      for (const client of clients) {
        try {
          const result = await ingestReporteiRawMetrics(tenant.tenant_id, token, {
            clientId: client.id,
            windows,
            metricsPerRequest,
          });
          payloads += result.payloads;
          console.log(
            `[reporteiFoundation] tenant=${tenant.tenant_id} client=${client.name} payloads=${result.payloads} integrations=${result.integrations}`,
          );
        } catch (error: any) {
          failures += 1;
          console.error(
            `[reporteiFoundation] tenant=${tenant.tenant_id} client=${client.name} failed:`,
            error?.message || error,
          );
        }
        await sleep(clientPauseMs);
      }

      console.log(
        `[reporteiFoundation] tenant=${tenant.tenant_id} inventory_projects=${inventory.projects} integrations=${inventory.integrations} metrics=${inventory.metrics} payloads=${payloads} failures=${failures}`,
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
