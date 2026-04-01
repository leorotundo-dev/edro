/**
 * Feedback Processor Worker
 *
 * Closes the learning loop: rebuilds copy_performance_preferences for clients
 * that have received new scored copies since the last rebuild.
 * Runs every 60s via jobsRunner (self-throttled to max 5 clients/tick).
 */

import { query } from '../db';
import { rebuildClientPreferences } from '../services/learningLoopService';

const MAX_PER_TICK = 5;

export async function runFeedbackProcessorWorkerOnce(): Promise<void> {
  // Find clients whose copy feedback is newer than their last preferences rebuild
  const { rows } = await query<{ tenant_id: string; client_id: string }>(
    `SELECT DISTINCT eb.main_client_id AS client_id,
            c.tenant_id
       FROM edro_copy_versions ecv
       JOIN edro_briefings eb ON eb.id = ecv.briefing_id
       JOIN clients c ON c.id = eb.main_client_id
      WHERE ecv.score IS NOT NULL
        AND eb.main_client_id IS NOT NULL
        AND (
          NOT EXISTS (
            SELECT 1 FROM copy_performance_preferences p
            WHERE p.tenant_id = c.tenant_id
              AND p.client_id = eb.main_client_id
          )
          OR ecv.updated_at > (
            SELECT p.rebuilt_at FROM copy_performance_preferences p
            WHERE p.tenant_id = c.tenant_id
              AND p.client_id = eb.main_client_id
            LIMIT 1
          )
        )
      LIMIT $1`,
    [MAX_PER_TICK],
  );

  for (const row of rows) {
    try {
      await rebuildClientPreferences({ tenant_id: row.tenant_id, client_id: row.client_id });
    } catch (err: any) {
      console.error('[feedbackProcessor] rebuild failed for client', row.client_id, err?.message);
    }
  }
}
