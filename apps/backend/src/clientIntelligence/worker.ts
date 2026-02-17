import { query } from '../db';
import { ClientIntelligenceService } from '../services/clientIntelligence';

let lastRunAt = 0;

function isEnabled() {
  const flag = process.env.CLIENT_INTEL_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
}

const MAX_CLIENTS_PER_RUN = 5;
const STALE_DAYS = 7;

export async function runClientIntelligenceWorkerOnce() {
  if (!isEnabled()) return;

  const intervalMs = Number(process.env.CLIENT_INTEL_INTERVAL_MS || 60 * 60 * 1000);
  const now = Date.now();
  if (now - lastRunAt < intervalMs) return;
  lastRunAt = now;

  const { rows: tenants } = await query<{ id: string }>('SELECT id FROM tenants');
  for (const tenant of tenants) {
    try {
      // Only fetch clients that haven't been refreshed in STALE_DAYS
      const { rows: clients } = await query<{ id: string }>(
        `SELECT id FROM clients
         WHERE tenant_id=$1
           AND (intelligence_refreshed_at IS NULL
                OR intelligence_refreshed_at < NOW() - INTERVAL '${STALE_DAYS} days')
         ORDER BY intelligence_refreshed_at ASC NULLS FIRST
         LIMIT $2`,
        [tenant.id, MAX_CLIENTS_PER_RUN]
      );

      if (!clients.length) continue;

      const service = new ClientIntelligenceService(tenant.id);
      for (const client of clients) {
        try {
          await service.refreshClient(client.id);
          await query(
            `UPDATE clients SET intelligence_refreshed_at = NOW() WHERE id = $1 AND tenant_id = $2`,
            [client.id, tenant.id]
          );
          console.log(`[intel-worker] refreshed client ${client.id}`);
        } catch (error: any) {
          console.error(`[intel-worker] client ${client.id} failed:`, error?.message || error);
        }
      }
    } catch (error: any) {
      console.error(`[intel-worker] tenant ${tenant.id} failed:`, error?.message || error);
    }
  }
}

/**
 * Manual refresh for all active clients of a tenant.
 * Called from POST /edro/intelligence/refresh-all endpoint.
 */
export async function refreshAllClientsForTenant(tenantId: string) {
  const { rows: clients } = await query<{ id: string; name: string }>(
    `SELECT id, name FROM clients WHERE tenant_id = $1 AND status != 'archived' ORDER BY name`,
    [tenantId]
  );

  const results: { clientId: string; name: string; ok: boolean; error?: string }[] = [];
  const service = new ClientIntelligenceService(tenantId);

  for (const client of clients.slice(0, MAX_CLIENTS_PER_RUN * 2)) {
    try {
      await service.refreshClient(client.id);
      await query(
        `UPDATE clients SET intelligence_refreshed_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [client.id, tenantId]
      );
      results.push({ clientId: client.id, name: client.name, ok: true });
    } catch (error: any) {
      results.push({ clientId: client.id, name: client.name, ok: false, error: error?.message });
    }
  }

  return { total: clients.length, processed: results.length, results };
}
