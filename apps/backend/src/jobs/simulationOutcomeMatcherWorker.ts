/**
 * Simulation Outcome Matcher Worker
 *
 * Roda 1x/dia (auto-throttled às 03:00 BRT).
 * Para cada simulation_result com campaign_format_id linkado e ≥7 dias de vida:
 *   1. Busca métricas reais dos primeiros 7 dias (format_performance_metrics)
 *   2. Calcula accuracy_pct = 100 - |predicted - actual| / predicted × 100
 *   3. Persiste em simulation_outcomes
 *
 * Estes dados alimentam:
 *   - scoringCalibrator (Fase 3): ajusta pesos AMD/trigger/Fogg
 *   - UI: badge "Acurácia histórica: 78%"
 */

import { query } from '../db';
import { matchSimulationToOutcome, saveOutcome } from '../services/campaignSimulator/outcomeTracker';

let lastRunDate = '';

/** Force a run right now regardless of time-gate (for admin manual triggers). */
export async function triggerOutcomeMatcherNow(): Promise<void> {
  lastRunDate = '';
  return runSimulationOutcomeMatcherOnce();
}

/**
 * Auto-link: for each edro_briefing with payload.simulation_result_id that now
 * has a campaign_format linked, update simulation_results.campaign_format_id.
 * Called before the main outcome-matching loop so the newly linked rows get
 * picked up in the same daily run.
 */
async function autoLinkFormatsFromBriefings(): Promise<number> {
  const { rows } = await query<{ simulation_result_id: string; campaign_format_id: string }>(
    `SELECT
       (b.payload->>'simulation_result_id')::uuid AS simulation_result_id,
       cf.id AS campaign_format_id
     FROM edro_briefings b
     JOIN campaign_formats cf ON cf.briefing_id = b.id
     WHERE b.payload->>'simulation_result_id' IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM simulation_results sr
         WHERE sr.id = (b.payload->>'simulation_result_id')::uuid
           AND sr.campaign_format_id IS NULL
       )
     LIMIT 50`,
    [],
  );

  let linked = 0;
  for (const row of rows) {
    try {
      await query(
        `UPDATE simulation_results SET campaign_format_id = $1 WHERE id = $2 AND campaign_format_id IS NULL`,
        [row.campaign_format_id, row.simulation_result_id],
      );
      linked++;
    } catch { /* non-blocking */ }
  }
  if (linked > 0) {
    console.log(`[simulationOutcomeMatcher] Auto-linked ${linked} formats via briefing payload`);
  }
  return linked;
}

export async function runSimulationOutcomeMatcherOnce(): Promise<void> {
  // Self-throttle: roda 1×/dia às 03:00
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours(); // BRT = UTC-3, 03h BRT = 06h UTC
  if (hour < 6 || hour > 7) return;
  if (lastRunDate === dateKey) return;

  lastRunDate = dateKey;
  console.log('[simulationOutcomeMatcher] Starting daily run...');

  // Auto-link any campaign_formats that came from simulation briefings
  await autoLinkFormatsFromBriefings();

  // Busca simulations com campaign_format_id, ≥7 dias, sem outcome ainda
  const pending = await query<{ id: string; tenant_id: string; campaign_format_id: string }>(
    `SELECT sr.id, sr.tenant_id, sr.campaign_format_id
     FROM simulation_results sr
     WHERE sr.campaign_format_id IS NOT NULL
       AND sr.created_at <= NOW() - INTERVAL '7 days'
       AND NOT EXISTS (
         SELECT 1 FROM simulation_outcomes so
         WHERE so.simulation_result_id = sr.id
       )
     ORDER BY sr.created_at DESC
     LIMIT 50`,
    [],
  );

  if (!pending.rows.length) {
    console.log('[simulationOutcomeMatcher] Nothing to process today.');
    return;
  }

  let matched = 0;
  let skipped = 0;

  for (const row of pending.rows) {
    try {
      const outcome = await matchSimulationToOutcome(
        row.id,
        row.campaign_format_id,
        row.tenant_id,
        7,
      );
      if (outcome) {
        await saveOutcome(outcome);
        matched++;
        console.log(`[simulationOutcomeMatcher] Matched ${row.id}: accuracy=${outcome.accuracy_pct}%`);
      } else {
        skipped++;
      }
    } catch (err: any) {
      console.error(`[simulationOutcomeMatcher] Error processing ${row.id}:`, err?.message);
    }
  }

  console.log(`[simulationOutcomeMatcher] Done: ${matched} matched, ${skipped} skipped (no metrics yet).`);
}
