import { query } from '../db';
import { ClientIntelligenceService } from '../services/clientIntelligence';

async function resolveTenantId() {
  if (process.env.TENANT_ID) return process.env.TENANT_ID;
  const { rows } = await query<any>(`SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1`);
  if (!rows[0]) throw new Error('No tenant found. Set TENANT_ID env.');
  return rows[0].id as string;
}

async function main() {
  const tenantId = await resolveTenantId();
  const clientFilter = process.env.CLIENT_ID || null;

  const queryText = clientFilter
    ? `SELECT id, name FROM clients WHERE tenant_id=$1 AND id=$2 LIMIT 1`
    : `SELECT id, name FROM clients WHERE tenant_id=$1 ORDER BY name ASC`;
  const values = clientFilter ? [tenantId, clientFilter] : [tenantId];

  const { rows: clients } = await query<any>(queryText, values);
  if (!clients.length) {
    console.log('No clients found to refresh.');
    return;
  }

  const service = new ClientIntelligenceService(tenantId);
  for (const client of clients) {
    try {
      console.log(`Refreshing client intelligence: ${client.name} (${client.id})`);
      await service.refreshClient(client.id);
    } catch (error) {
      console.error('refresh_client_failed', client.id, error);
    }
  }

  console.log('Client intelligence refresh done.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
