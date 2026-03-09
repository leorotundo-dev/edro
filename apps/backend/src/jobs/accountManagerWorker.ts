/**
 * accountManagerWorker.ts
 *
 * Daily worker: for every active client, regenerates AI Account Manager alerts
 * using all available signals (health score, ROI, learning rules, invoices, activity).
 *
 * Self-throttled: skips clients computed in the last 20 hours.
 * Processes max 5 clients per tick (5s polling interval).
 */
import { query } from '../db/db';
import { computeClientAlerts } from '../services/accountManagerService';

const MAX_PER_TICK = 5;

export async function runAccountManagerWorkerOnce(): Promise<void> {
  // Find active clients whose alerts haven't been refreshed recently
  const { rows } = await query<{
    tenant_id: string;
    client_id: string;
    client_name: string;
    last_computed_at: string | null;
  }>(
    `SELECT DISTINCT
       c.tenant_id,
       c.id          AS client_id,
       c.name        AS client_name,
       ama.last_computed_at
     FROM clients c
     LEFT JOIN LATERAL (
       SELECT MAX(computed_at) AS last_computed_at
       FROM account_manager_alerts
       WHERE tenant_id = c.tenant_id::text AND client_id = c.id
     ) ama ON true
     WHERE c.status = 'active'
       AND (
         ama.last_computed_at IS NULL
         OR ama.last_computed_at < now() - interval '20 hours'
       )
     ORDER BY ama.last_computed_at ASC NULLS FIRST
     LIMIT $1`,
    [MAX_PER_TICK],
  );

  if (!rows.length) return;

  for (const row of rows) {
    try {
      const alerts = await computeClientAlerts(row.tenant_id, row.client_id);
      if (alerts.length > 0) {
        console.log(
          `[accountManager] ${row.client_name}: ${alerts.length} alert(s) — ` +
          alerts.map((a) => `${a.priority}/${a.alert_type}`).join(', '),
        );
      }
    } catch (err: any) {
      console.warn(`[accountManager] ${row.client_name} failed: ${err?.message}`);
    }
  }
}
