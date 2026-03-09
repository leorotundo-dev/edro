/**
 * metaSyncWorker.ts
 *
 * Daily worker: for every client with an active Meta connector,
 * pulls Instagram post-level metrics → format_performance_metrics
 * → recomputeClientLearningRules (closes the CTR → LearningEngine loop).
 *
 * Self-throttles: skips clients whose connector was synced in the last 20h.
 * Processes max 8 clients per tick (5s polling interval) to avoid bursting.
 */

import { query } from '../db/db';
import { syncMetaPerformanceForClient } from '../services/integrations/metaSyncService';

const MAX_PER_TICK       = 8;

export async function runMetaSyncWorkerOnce(): Promise<void> {
  // Find clients with an active Meta connector not recently synced (cooldown: 20h)
  const { rows } = await query<{
    tenant_id: string;
    client_id: string;
    client_name: string;
    connector_id: string;
  }>(
    `SELECT
       c.tenant_id,
       c.client_id,
       cl.name AS client_name,
       c.id    AS connector_id
     FROM connectors c
     JOIN clients cl ON cl.id = c.client_id
     WHERE c.provider = 'meta'
       AND cl.status  = 'active'
       AND c.secrets_enc IS NOT NULL
       AND (
         c.last_sync_at IS NULL
         OR c.last_sync_at < now() - interval '20 hours'
       )
     ORDER BY c.last_sync_at ASC NULLS FIRST
     LIMIT $1`,
    [MAX_PER_TICK],
  );

  if (!rows.length) return;

  for (const row of rows) {
    try {
      const result = await syncMetaPerformanceForClient(row.tenant_id, row.client_id);

      // Update connector health
      await query(
        `UPDATE connectors
         SET last_sync_at  = now(),
             last_sync_ok  = true,
             last_error    = NULL,
             last_error_at = NULL
         WHERE id = $1`,
        [row.connector_id],
      );

      if (result.synced > 0 || result.errors.length > 0) {
        console.log(
          `[metaSync] ${row.client_name}: synced=${result.synced} skipped=${result.skipped} errors=${result.errors.length}`,
        );
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn(`[metaSync] ${row.client_name} failed: ${msg}`);

      await query(
        `UPDATE connectors
         SET last_sync_ok  = false,
             last_error    = $1,
             last_error_at = now()
         WHERE id = $2`,
        [msg.slice(0, 500), row.connector_id],
      ).catch(() => {});
    }
  }
}
