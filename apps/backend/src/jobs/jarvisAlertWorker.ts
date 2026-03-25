/**
 * Jarvis Alert Worker
 * Roda 2x/dia (08:00 e 16:00).
 * Cruza fontes por todos os tenants e gera alertas cross-source.
 */

import { query } from '../db';
import { runJarvisAlertEngine } from '../services/jarvisAlertEngine';

export async function runJarvisAlertWorkerOnce(): Promise<void> {
  // Reopen snoozed alerts whose snooze has expired
  await query(
    `UPDATE jarvis_alerts SET status = 'open', snoozed_until = null, updated_at = now()
     WHERE status = 'snoozed' AND snoozed_until <= now()`,
    [],
  );

  // Get all active tenants
  const tenantsRes = await query<{ tenant_id: string }>(
    `SELECT DISTINCT tenant_id FROM clients WHERE is_active = true LIMIT 100`,
    [],
  );

  let totalSaved = 0;
  for (const { tenant_id } of tenantsRes.rows) {
    try {
      const saved = await runJarvisAlertEngine(tenant_id);
      totalSaved += saved;
    } catch (err) {
      console.error(`[jarvisAlertWorker] tenant ${tenant_id} failed:`, err);
    }
  }

  if (totalSaved > 0) {
    console.log(`[jarvisAlertWorker] ${totalSaved} novos alertas gerados.`);
  }
}
