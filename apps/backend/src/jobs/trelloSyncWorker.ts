/**
 * Trello Sync Worker
 *
 * Roda a cada 30min (self-throttled).
 * Re-sincroniza boards Trello → Edro para todos os tenants com conector ativo.
 * Durante a fase de transição, mantém os dados do Edro atualizados com o Trello.
 * Após migrar completamente, basta desativar o conector — zero downtime.
 */

import { query } from '../db';
import { syncAllTrelloBoardsForTenant } from '../services/trelloSyncService';
import { analyzeAllBoardsForTenant } from '../services/trelloHistoryAnalyzer';
import { ensureAllWebhooksForTenant } from '../services/trelloWebhookService';

let lastRunAt = 0;
const MIN_INTERVAL_MS = 30 * 60 * 1000; // 30 min

export async function triggerTrelloSyncNow(): Promise<void> {
  lastRunAt = 0;
  return runTrelloSyncWorkerOnce();
}

export async function runTrelloSyncWorkerOnce(): Promise<void> {
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) return;
  lastRunAt = now;

  // Fetch all tenants with active Trello connector that have boards to sync
  const tenantsRes = await query<{ tenant_id: string }>(
    `SELECT DISTINCT tc.tenant_id
     FROM trello_connectors tc
     JOIN project_boards pb ON pb.tenant_id = tc.tenant_id
       AND pb.trello_board_id IS NOT NULL
       AND pb.is_archived = false
     WHERE tc.is_active = true`,
    [],
  );

  if (!tenantsRes.rows.length) return;

  for (const { tenant_id } of tenantsRes.rows) {
    try {
      console.log(`[trelloSync] Syncing tenant ${tenant_id}...`);
      await syncAllTrelloBoardsForTenant(tenant_id);
      // Run history analysis after sync to keep analytics fresh
      await analyzeAllBoardsForTenant(tenant_id);
      // Ensure realtime webhooks are registered for all boards (idempotent)
      await ensureAllWebhooksForTenant(tenant_id);

      await query(
        `UPDATE trello_connectors SET last_synced_at = now() WHERE tenant_id = $1`,
        [tenant_id],
      );
    } catch (err: any) {
      console.error(`[trelloSync] Error for tenant ${tenant_id}:`, err?.message);
    }
  }
}
