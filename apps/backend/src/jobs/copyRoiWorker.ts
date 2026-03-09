/**
 * copyRoiWorker.ts
 *
 * Daily worker: for every active client with behavioral copies,
 * recomputes copy ROI scores (Fogg quality × Meta CTR × ROAS × AI cost).
 *
 * Self-throttled: skips clients computed in the last 20 hours.
 * Processes max 5 clients per tick (5s polling interval).
 * Runs after metaSyncWorker so Meta performance data is fresh.
 */
import { query } from '../db/db';
import { computeClientCopyRoi } from '../services/copyRoiService';

const MAX_PER_TICK = 5;

export async function runCopyRoiWorkerOnce(): Promise<void> {
  // Find clients with behavioral copies whose ROI hasn't been refreshed recently
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
       rs.last_computed_at
     FROM clients c
     -- Must have at least one behavioral copy to score
     INNER JOIN campaigns ca ON ca.client_id = c.id
     INNER JOIN campaign_behavioral_copies cbc ON cbc.campaign_id = ca.id
     LEFT JOIN LATERAL (
       SELECT MAX(computed_at) AS last_computed_at
       FROM copy_roi_scores
       WHERE tenant_id = c.tenant_id AND client_id = c.id
     ) rs ON true
     WHERE c.status = 'active'
       AND (
         rs.last_computed_at IS NULL
         OR rs.last_computed_at < now() - interval '20 hours'
       )
     ORDER BY rs.last_computed_at ASC NULLS FIRST
     LIMIT $1`,
    [MAX_PER_TICK],
  );

  if (!rows.length) return;

  for (const row of rows) {
    try {
      const results = await computeClientCopyRoi(row.tenant_id, row.client_id);
      if (results.length > 0) {
        const topScore = Math.max(...results.map((r) => r.roi_score));
        console.log(
          `[copyRoi] ${row.client_name}: ${results.length} copies scored — top ROI: ${topScore.toFixed(1)}`,
        );
      }
    } catch (err: any) {
      console.warn(`[copyRoi] ${row.client_name} failed: ${err?.message}`);
    }
  }
}
