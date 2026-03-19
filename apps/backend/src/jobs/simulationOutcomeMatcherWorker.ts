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

export async function runSimulationOutcomeMatcherOnce(): Promise<void> {
  // Self-throttle: roda 1×/dia às 03:00
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours(); // BRT = UTC-3, 03h BRT = 06h UTC
  if (hour < 6 || hour > 7) return;
  if (lastRunDate === dateKey) return;

  lastRunDate = dateKey;
  console.log('[simulationOutcomeMatcher] Starting daily run...');

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
