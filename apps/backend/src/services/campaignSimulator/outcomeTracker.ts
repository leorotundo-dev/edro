/**
 * Outcome Tracker
 *
 * Fecha o loop entre o que o simulador previu e o que realmente aconteceu.
 *
 * matchSimulationToOutcome — compara predicted vs actual após 7d de métricas reais
 * getClientAccuracy        — acurácia histórica média por cliente (0–100)
 *
 * Fontes de dados reais: format_performance_metrics (metaSync worker)
 */

import { query } from '../../db';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SimulationOutcome {
  simulationResultId: string;
  variantIndex: number;
  campaignFormatId: string;
  platform?: string;
  predicted: {
    save_rate: number;
    click_rate: number;
    engagement_rate: number;
    fatigue_days?: number;
  };
  actual: {
    save_rate: number;
    click_rate: number;
    engagement_rate: number;
  };
  save_rate_error: number;
  click_rate_error: number;
  engagement_error: number;
  accuracy_pct: number;
  measurement_window_days: number;
}

export interface ClientAccuracy {
  client_id: string;
  outcome_count: number;
  avg_accuracy_pct: number;
  avg_save_error: number;
  avg_click_error: number;
  by_platform: Array<{ platform: string; accuracy_pct: number; count: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeError(predicted: number, actual: number): number {
  if (predicted <= 0) return actual > 0 ? -1 : 0;
  return (actual - predicted) / predicted;
}

function accuracyFromError(error: number): number {
  // error = (actual - predicted) / predicted
  // accuracy = 100 - |error| * 100, min 0
  return Math.max(0, 100 - Math.abs(error) * 100);
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Busca métricas reais de um campaign_format após measureWindowDays dias
 * e calcula a acurácia do simulador para aquela simulação.
 */
export async function matchSimulationToOutcome(
  simulationResultId: string,
  campaignFormatId: string,
  tenantId: string,
  measureWindowDays = 7,
): Promise<SimulationOutcome | null> {
  // 1. Load simulation prediction
  const simRes = await query<any>(
    `SELECT winner_index, winner_predicted_save_rate, winner_predicted_click_rate,
            winner_predicted_engagement, winner_fatigue_days, platform, variants, scores
     FROM simulation_results
     WHERE id = $1 AND tenant_id = $2`,
    [simulationResultId, tenantId],
  );
  if (!simRes.rows.length) return null;

  const sim = simRes.rows[0];

  // 2. Load real metrics (avg over measureWindowDays after format launched)
  const metricsRes = await query<any>(
    `SELECT
       AVG(CASE WHEN total_impressions > 0 THEN total_saves::numeric / total_impressions ELSE 0 END) as avg_save_rate,
       AVG(CASE WHEN total_impressions > 0 THEN total_clicks::numeric / total_impressions ELSE 0 END) as avg_click_rate,
       AVG(engagement_rate) as avg_engagement_rate,
       COUNT(*) as measurement_count
     FROM format_performance_metrics
     WHERE format_id = $1
       AND recorded_at >= (SELECT launched_at FROM campaign_formats WHERE id = $1)
       AND recorded_at <= (SELECT launched_at + INTERVAL '1 day' * $2 FROM campaign_formats WHERE id = $1)`,
    [campaignFormatId, measureWindowDays],
  );

  if (!metricsRes.rows.length || !metricsRes.rows[0].measurement_count) return null;

  const actual = metricsRes.rows[0];
  const actualSave = parseFloat(actual.avg_save_rate ?? '0');
  const actualClick = parseFloat(actual.avg_click_rate ?? '0');
  const actualEngagement = parseFloat(actual.avg_engagement_rate ?? '0');

  const predictedSave = parseFloat(sim.winner_predicted_save_rate ?? '0');
  const predictedClick = parseFloat(sim.winner_predicted_click_rate ?? '0');
  const predictedEngagement = parseFloat(sim.winner_predicted_engagement ?? '0');

  const saveError = relativeError(predictedSave, actualSave);
  const clickError = relativeError(predictedClick, actualClick);
  const engError = relativeError(predictedEngagement, actualEngagement);

  // Overall accuracy: average of the three accuracy components
  const accuracy = (accuracyFromError(saveError) + accuracyFromError(clickError) + accuracyFromError(engError)) / 3;

  return {
    simulationResultId,
    variantIndex: sim.winner_index ?? 0,
    campaignFormatId,
    platform: sim.platform,
    predicted: {
      save_rate: predictedSave,
      click_rate: predictedClick,
      engagement_rate: predictedEngagement,
      fatigue_days: sim.winner_fatigue_days,
    },
    actual: {
      save_rate: actualSave,
      click_rate: actualClick,
      engagement_rate: actualEngagement,
    },
    save_rate_error: Math.round(saveError * 10000) / 10000,
    click_rate_error: Math.round(clickError * 10000) / 10000,
    engagement_error: Math.round(engError * 10000) / 10000,
    accuracy_pct: Math.round(accuracy * 100) / 100,
    measurement_window_days: measureWindowDays,
  };
}

/**
 * Persiste um outcome no banco.
 */
export async function saveOutcome(outcome: SimulationOutcome): Promise<void> {
  await query(
    `INSERT INTO simulation_outcomes
       (simulation_result_id, variant_index, campaign_format_id, platform,
        predicted_save_rate, actual_save_rate,
        predicted_click_rate, actual_click_rate,
        predicted_engagement_rate, actual_engagement_rate,
        save_rate_error, click_rate_error, engagement_error,
        accuracy_pct, measurement_window_days, measured_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
     ON CONFLICT DO NOTHING`,
    [
      outcome.simulationResultId,
      outcome.variantIndex,
      outcome.campaignFormatId,
      outcome.platform ?? null,
      outcome.predicted.save_rate,
      outcome.actual.save_rate,
      outcome.predicted.click_rate,
      outcome.actual.click_rate,
      outcome.predicted.engagement_rate,
      outcome.actual.engagement_rate,
      outcome.save_rate_error,
      outcome.click_rate_error,
      outcome.engagement_error,
      outcome.accuracy_pct,
      outcome.measurement_window_days,
    ],
  );
}

/**
 * Retorna a acurácia histórica média de um cliente.
 * Usado pelo simulador para mostrar "Alta confiança (78%)" no UI.
 */
export async function getClientAccuracy(
  clientId: string,
  tenantId: string,
  windowDays = 30,
): Promise<ClientAccuracy | null> {
  const res = await query<any>(
    `SELECT
       COUNT(*) as outcome_count,
       AVG(so.accuracy_pct) as avg_accuracy_pct,
       AVG(so.save_rate_error) as avg_save_error,
       AVG(so.click_rate_error) as avg_click_error
     FROM simulation_outcomes so
     JOIN simulation_results sr ON sr.id = so.simulation_result_id
     WHERE sr.tenant_id = $1
       AND ($2::text IS NULL OR sr.client_id = $2)
       AND so.created_at >= NOW() - INTERVAL '1 day' * $3`,
    [tenantId, clientId || null, windowDays * 4], // look back 4× the window
  );

  if (!res.rows.length || !parseInt(res.rows[0].outcome_count)) return null;

  const byPlatformRes = await query<any>(
    `SELECT so.platform, AVG(so.accuracy_pct) as accuracy_pct, COUNT(*) as count
     FROM simulation_outcomes so
     JOIN simulation_results sr ON sr.id = so.simulation_result_id
     WHERE sr.tenant_id = $1
       AND ($2::text IS NULL OR sr.client_id = $2)
     GROUP BY so.platform`,
    [tenantId, clientId || null],
  );

  const row = res.rows[0];
  return {
    client_id: clientId,
    outcome_count: parseInt(row.outcome_count),
    avg_accuracy_pct: Math.round(parseFloat(row.avg_accuracy_pct ?? '0') * 100) / 100,
    avg_save_error: Math.round(parseFloat(row.avg_save_error ?? '0') * 10000) / 10000,
    avg_click_error: Math.round(parseFloat(row.avg_click_error ?? '0') * 10000) / 10000,
    by_platform: byPlatformRes.rows.map((r) => ({
      platform: r.platform,
      accuracy_pct: Math.round(parseFloat(r.accuracy_pct) * 100) / 100,
      count: parseInt(r.count),
    })),
  };
}
