import { query } from '../db';
import { ClientIntelligenceService } from '../services/clientIntelligence';

let lastRunAt = 0;

function isEnabled() {
  const flag = process.env.CLIENT_INTEL_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
}

export async function runClientIntelligenceWorkerOnce() {
  if (!isEnabled()) return;

  const intervalMs = Number(process.env.CLIENT_INTEL_INTERVAL_MS || 60 * 60 * 1000);
  const now = Date.now();
  if (now - lastRunAt < intervalMs) return;
  lastRunAt = now;

  const { rows: tenants } = await query<{ id: string }>('SELECT id FROM tenants');
  for (const tenant of tenants) {
    try {
      const { rows: clients } = await query<{ id: string }>(
        `SELECT id FROM clients WHERE tenant_id=$1`,
        [tenant.id]
      );
      const service = new ClientIntelligenceService(tenant.id);
      for (const client of clients) {
        try {
          await service.refreshClient(client.id);
        } catch (error) {
          console.error('client_intel_worker_client', client.id, error);
        }
      }
    } catch (error) {
      console.error('client_intel_worker_tenant', tenant.id, error);
    }
  }
}
