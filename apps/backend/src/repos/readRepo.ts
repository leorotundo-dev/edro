import { query } from '../db';

export async function listClients(tenantId: string) {
  const { rows } = await query<any>(
    `SELECT id, name, country, uf, city, segment_primary, updated_at
     FROM clients
     WHERE tenant_id=$1
     ORDER BY updated_at DESC`,
    [tenantId]
  );
  return rows;
}

export async function listCalendars(tenantId: string, client_id: string, month?: string) {
  if (month) {
    const { rows } = await query<any>(
      `SELECT * FROM monthly_calendars WHERE tenant_id=$1 AND client_id=$2 AND month=$3 ORDER BY created_at DESC`,
      [tenantId, client_id, month]
    );
    return rows;
  }

  const { rows } = await query<any>(
    `SELECT * FROM monthly_calendars WHERE tenant_id=$1 AND client_id=$2 ORDER BY created_at DESC`,
    [tenantId, client_id]
  );
  return rows;
}

export async function listFlowRuns(tenantId: string, client_id: string, month?: string) {
  if (month) {
    const { rows } = await query<any>(
      `SELECT * FROM flow_runs WHERE tenant_id=$1 AND client_id=$2 AND month=$3 ORDER BY created_at DESC`,
      [tenantId, client_id, month]
    );
    return rows;
  }

  const { rows } = await query<any>(
    `SELECT * FROM flow_runs WHERE tenant_id=$1 AND client_id=$2 ORDER BY created_at DESC`,
    [tenantId, client_id]
  );
  return rows;
}
