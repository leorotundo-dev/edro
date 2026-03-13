import { query } from '../db';
import { rebuildOperationalRuntime } from '../services/jobs/operationsRuntimeService';
import { syncOperationalSources } from '../services/jobs/sourceSyncService';
import { rebuildOperationalSignals } from '../services/signalService';

let running = false;
let lastRunAt = 0;

const THROTTLE_MS = 15 * 60 * 1000;

export async function runOperationsRuntimeWorkerOnce(): Promise<void> {
  if (running) return;
  if (Date.now() - lastRunAt < THROTTLE_MS) return;
  running = true;

  try {
    const { rows } = await query<{ tenant_id: string }>(
      `SELECT DISTINCT tenant_id
         FROM tenant_users
        WHERE tenant_id IS NOT NULL`,
    ).catch(() => ({ rows: [] as Array<{ tenant_id: string }> }));

    for (const row of rows) {
      const tenantId = String(row.tenant_id || '').trim();
      if (!tenantId) continue;

      try {
        await syncOperationalSources(tenantId);
        await rebuildOperationalRuntime(tenantId);
        await rebuildOperationalSignals(tenantId);
      } catch (error: any) {
        console.error(`[operationsRuntime] tenant ${tenantId} failed:`, error?.message || error);
      }
    }

    lastRunAt = Date.now();
  } finally {
    running = false;
  }
}
