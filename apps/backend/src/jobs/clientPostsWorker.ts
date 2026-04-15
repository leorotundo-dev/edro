/**
 * clientPostsWorker.ts
 *
 * Daily worker: for every client with an active Meta connector,
 * fetches their OWN posts from Instagram + Facebook and stores them
 * in the `client_posts` table.
 *
 * Self-throttles: skips clients synced in the last 12h.
 * Processes up to 8 clients per tick.
 */

import { query } from '../db';
import { syncClientPosts } from '../services/integrations/clientPostsService';
import { linkPublishedPostsToMetrics } from '../services/performanceLinkService';

const MAX_PER_TICK = 8;
const COOLDOWN_HOURS = 12;

export async function runClientPostsWorkerOnce(): Promise<void> {
  // Ensure posts_synced_at column exists (migration may not have run yet)
  await query(
    `ALTER TABLE connectors ADD COLUMN IF NOT EXISTS posts_synced_at TIMESTAMPTZ`
  ).catch(() => {});

  const { rows } = await query<{
    tenant_id: string;
    client_id: string;
    client_name: string;
    connector_id: string;
  }>(
    `SELECT
       c.tenant_id,
       c.client_id,
       cl.name  AS client_name,
       c.id     AS connector_id
     FROM connectors c
     JOIN clients cl ON cl.id = c.client_id
     WHERE c.provider    = 'meta'
       AND cl.status     = 'active'
       AND c.secrets_enc IS NOT NULL
       AND (
         c.posts_synced_at IS NULL
         OR c.posts_synced_at < now() - ($1 || ' hours')::interval
       )
     ORDER BY c.posts_synced_at ASC NULLS FIRST
     LIMIT $2`,
    [COOLDOWN_HOURS, MAX_PER_TICK]
  );

  if (!rows.length) return;

  for (const row of rows) {
    try {
      const result = await syncClientPosts(row.tenant_id, row.client_id);

      await query(
        `UPDATE connectors SET posts_synced_at = now() WHERE id = $1`,
        [row.connector_id]
      );

      const linkedMetrics = await linkPublishedPostsToMetrics(row.tenant_id, row.client_id)
        .catch(() => ({ scanned: 0, linked: 0 }));

      if (result.instagram > 0 || result.facebook > 0 || linkedMetrics.linked > 0) {
        console.log(
          `[clientPosts] ${row.client_name}: ig=${result.instagram} fb=${result.facebook} linked=${linkedMetrics.linked}/${linkedMetrics.scanned}`
        );
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      // Don't update posts_synced_at on failure — retry sooner
      console.warn(`[clientPosts] ${row.client_name} failed: ${msg}`);
    }
  }
}
