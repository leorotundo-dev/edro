/**
 * Scoring Calibrator
 *
 * Ajusta os pesos de pontuação do simulador com base em erros de previsão.
 * Quando o simulador consistentemente superestima ou subestima, os pesos
 * são ajustados gradualmente (gradient descent simples).
 *
 * Regras:
 *   - Só calibra quando calibration_sample_size >= MIN_SAMPLES
 *   - Cada iteração ajusta no máximo STEP (5% do valor corrente)
 *   - Pesos não desviam mais que MAX_DEVIATION (50%) dos defaults
 *   - Persiste em simulation_scoring_weights para ser lido por resonanceScorer
 */

import { query } from '../../db';

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_SAMPLES = 10;
const STEP = 0.05;          // 5% por iteração
const MAX_DEVIATION = 0.50; // máximo ±50% do default

// Defaults originais (hardcoded em resonanceScorer)
export const DEFAULT_WEIGHTS = {
  amd_match_boost: 0.300,
  trigger_boost_per_match: 0.080,
  trigger_boost_cap: 0.400,
  fogg_multiplier_base: 0.600,
  fogg_multiplier_scale: 0.600,
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoringWeights {
  amd_match_boost: number;
  trigger_boost_per_match: number;
  trigger_boost_cap: number;
  fogg_multiplier_base: number;
  fogg_multiplier_scale: number;
}

// ── Load weights (with fallback to defaults) ──────────────────────────────────

export async function loadScoringWeights(
  tenantId: string,
  clientId?: string,
  platform?: string,
): Promise<ScoringWeights> {
  // Try client+platform specific, then client-only, then global
  const res = await query<any>(
    `SELECT amd_match_boost, trigger_boost_per_match, trigger_boost_cap,
            fogg_multiplier_base, fogg_multiplier_scale, calibration_sample_size
     FROM simulation_scoring_weights
     WHERE tenant_id = $1
       AND (client_id = $2 OR client_id IS NULL)
       AND (platform = $3 OR platform IS NULL)
     ORDER BY
       (client_id IS NOT NULL)::int DESC,
       (platform IS NOT NULL)::int DESC
     LIMIT 1`,
    [tenantId, clientId ?? null, platform ?? null],
  );

  if (!res.rows.length || res.rows[0].calibration_sample_size < MIN_SAMPLES) {
    return { ...DEFAULT_WEIGHTS };
  }

  const r = res.rows[0];
  return {
    amd_match_boost: parseFloat(r.amd_match_boost),
    trigger_boost_per_match: parseFloat(r.trigger_boost_per_match),
    trigger_boost_cap: parseFloat(r.trigger_boost_cap),
    fogg_multiplier_base: parseFloat(r.fogg_multiplier_base),
    fogg_multiplier_scale: parseFloat(r.fogg_multiplier_scale),
  };
}

// ── Calibration logic ─────────────────────────────────────────────────────────

/**
 * Calcula pesos otimizados a partir dos erros de previsão acumulados.
 *
 * Lógica de ajuste:
 *   Se save_rate_error médio > +30% (simulador subestimou): aumentar AMD boost
 *   Se save_rate_error médio < -30% (simulador superestimou): reduzir AMD boost
 *   Se click_rate_error médio grande: ajustar trigger boost
 *   Se engagement_error grande: ajustar Fogg multiplier scale
 */
function computeAdjustedWeights(
  current: ScoringWeights,
  avgSaveError: number,
  avgClickError: number,
  avgEngError: number,
): ScoringWeights {
  const clamp = (value: number, key: keyof ScoringWeights) => {
    const def = DEFAULT_WEIGHTS[key];
    const min = def * (1 - MAX_DEVIATION);
    const max = def * (1 + MAX_DEVIATION);
    return Math.max(min, Math.min(max, value));
  };

  // Adjust AMD boost based on save_rate error
  // If simulator underestimated saves (positive error), AMD is probably too weak
  let amdBoost = current.amd_match_boost;
  if (avgSaveError > 0.3) amdBoost = current.amd_match_boost * (1 + STEP);
  else if (avgSaveError < -0.3) amdBoost = current.amd_match_boost * (1 - STEP);

  // Adjust trigger boost based on click_rate error
  let triggerBoost = current.trigger_boost_per_match;
  if (avgClickError > 0.3) triggerBoost = current.trigger_boost_per_match * (1 + STEP);
  else if (avgClickError < -0.3) triggerBoost = current.trigger_boost_per_match * (1 - STEP);

  // Adjust Fogg scale based on overall engagement error
  let foggScale = current.fogg_multiplier_scale;
  if (avgEngError > 0.4) foggScale = current.fogg_multiplier_scale * (1 + STEP);
  else if (avgEngError < -0.4) foggScale = current.fogg_multiplier_scale * (1 - STEP);

  return {
    amd_match_boost: clamp(amdBoost, 'amd_match_boost'),
    trigger_boost_per_match: clamp(triggerBoost, 'trigger_boost_per_match'),
    trigger_boost_cap: current.trigger_boost_cap, // don't adjust cap
    fogg_multiplier_base: current.fogg_multiplier_base, // don't adjust base
    fogg_multiplier_scale: clamp(foggScale, 'fogg_multiplier_scale'),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Recalcula e persiste os pesos para um cliente a partir dos outcomes acumulados.
 * Chamado manualmente ou pelo outcomeMatcherWorker após acumular ≥ MIN_SAMPLES.
 */
export async function calibrateClientWeights(
  tenantId: string,
  clientId?: string,
): Promise<{ calibrated: boolean; sample_size: number; weights: ScoringWeights }> {
  // Load recent outcomes for this client
  const outcomesRes = await query<any>(
    `SELECT AVG(save_rate_error) as avg_save_error,
            AVG(click_rate_error) as avg_click_error,
            AVG(engagement_error) as avg_eng_error,
            COUNT(*) as sample_size
     FROM simulation_outcomes so
     JOIN simulation_results sr ON sr.id = so.simulation_result_id
     WHERE sr.tenant_id = $1
       AND ($2::text IS NULL OR sr.client_id = $2)
       AND so.created_at >= NOW() - INTERVAL '90 days'`,
    [tenantId, clientId ?? null],
  );

  const row = outcomesRes.rows[0];
  const sampleSize = parseInt(row?.sample_size ?? '0');

  if (sampleSize < MIN_SAMPLES) {
    return { calibrated: false, sample_size: sampleSize, weights: { ...DEFAULT_WEIGHTS } };
  }

  const avgSaveError = parseFloat(row.avg_save_error ?? '0');
  const avgClickError = parseFloat(row.avg_click_error ?? '0');
  const avgEngError = parseFloat(row.avg_eng_error ?? '0');

  // Load current weights (or defaults)
  const current = await loadScoringWeights(tenantId, clientId);
  const adjusted = computeAdjustedWeights(current, avgSaveError, avgClickError, avgEngError);

  // Upsert weights
  await query(
    `INSERT INTO simulation_scoring_weights
       (tenant_id, client_id, platform,
        amd_match_boost, trigger_boost_per_match, trigger_boost_cap,
        fogg_multiplier_base, fogg_multiplier_scale,
        calibration_sample_size, last_calibrated_at, updated_at)
     VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (tenant_id, COALESCE(client_id, ''), COALESCE(platform, ''))
     DO UPDATE SET
       amd_match_boost = EXCLUDED.amd_match_boost,
       trigger_boost_per_match = EXCLUDED.trigger_boost_per_match,
       fogg_multiplier_scale = EXCLUDED.fogg_multiplier_scale,
       calibration_sample_size = EXCLUDED.calibration_sample_size,
       last_calibrated_at = NOW(),
       updated_at = NOW()`,
    [
      tenantId,
      clientId ?? null,
      adjusted.amd_match_boost,
      adjusted.trigger_boost_per_match,
      adjusted.trigger_boost_cap,
      adjusted.fogg_multiplier_base,
      adjusted.fogg_multiplier_scale,
      sampleSize,
    ],
  );

  console.log(`[scoringCalibrator] Calibrated for client=${clientId ?? 'global'}: AMD=${adjusted.amd_match_boost.toFixed(3)}, trigger=${adjusted.trigger_boost_per_match.toFixed(3)}, fogg_scale=${adjusted.fogg_multiplier_scale.toFixed(3)} (n=${sampleSize})`);

  return { calibrated: true, sample_size: sampleSize, weights: adjusted };
}
