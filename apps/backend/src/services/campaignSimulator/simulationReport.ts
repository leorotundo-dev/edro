/**
 * Simulation Report
 *
 * Orquestra o simulador completo:
 *   1. Carrega clusters do cliente (real ou cold-start)
 *   2. Carrega learning rules + scoring weights calibrados
 *   3. Calibra weights com copy intelligence (Fogg scale) + carrega client rates
 *   4. Pontua variantes via resonanceScorer + aplica calibração de base rates
 *   5. Estima fadiga via fatigueEstimator
 *   6. Detecta riscos via riskDetector
 *   7. Carrega timing context (melhor horário por plataforma)
 *   8. Calcula prediction_confidence com base em dados disponíveis + acurácia histórica
 *   9. Consolida em SimulationReport e persiste em simulation_results
 */

import { query } from '../../db';
import { VariantInput, scoreVariantsAgainstClusters, loadClientClusters, loadClientRules } from './resonanceScorer';
import { estimateFatiguedays } from './fatigueEstimator';
import { detectRisks, RiskFlag } from './riskDetector';
import { getSimulationClusters, ColdStartResult } from './coldStartService';
import { loadScoringWeights } from './scoringCalibrator';
import { getClientAccuracy } from './outcomeTracker';
import { loadClientBriefingRates, blendRates } from './clientRatesService';
import { getTimingContext, TimingContext } from './timingScorer';
import { loadCopyIntelligence } from './copyIntelligenceService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SimulationInput {
  tenantId: string;
  clientId?: string;
  campaignId?: string;
  platform?: string;
  variants: VariantInput[];
}

export interface VariantResult {
  index: number;
  text_preview: string;
  aggregate_resonance: number;
  predicted_save_rate: number;
  predicted_click_rate: number;
  predicted_engagement_rate: number;
  top_cluster: string;
  scores_by_cluster: Array<{
    cluster_type: string;
    cluster_label: string;
    resonance_score: number;
    amd_match: boolean;
    trigger_matches: string[];
    risk_level: 'low' | 'medium' | 'high';
  }>;
  risk_flags: RiskFlag[];
  fatigue_days: number;
  fatigue_source: 'historical' | 'reportei' | 'benchmark';
  engagement_7d?: number | null;
  engagement_30d?: number | null;
  engagement_delta_pct?: number | null;
}

export interface SimulationReport {
  id: string;
  winner_index: number;
  winner_resonance: number;
  variants: VariantResult[];
  cluster_count: number;
  rule_count: number;
  confidence_avg: number;
  // Fase 4: prediction confidence
  prediction_confidence: number;       // 0–100%, quão confiável é esta simulação
  prediction_confidence_label: string; // "Alta (87%)", "Média (60%)", "Baixa (35%)"
  // Fase 5: cold start
  cold_start: boolean;
  cold_start_message?: string;
  // Timing intelligence
  timing_context: Pick<TimingContext, 'has_data' | 'best_slot_label' | 'peak_multiplier'> | null;
  // Data richness
  data_sources: string[];   // which real data sources contributed
  summary: string;
  created_at: string;
}

// ── Prediction confidence ─────────────────────────────────────────────────────

function computePredictionConfidence(params: {
  clusterCount: number;
  ruleCount: number;
  confidenceAvg: number;
  coldStart: boolean;
  historicalAccuracy?: number | null;  // null = no history yet
}): { score: number; label: string } {
  const { clusterCount, ruleCount, confidenceAvg, coldStart, historicalAccuracy } = params;

  let score = 40; // base: benchmark sem dados

  if (coldStart) {
    score = 25; // cold start = menos confiança
  } else {
    // Cluster factor
    if (clusterCount >= 4) score += 20;
    else if (clusterCount >= 2) score += 10;

    // Rule factor
    if (ruleCount >= 8) score += 20;
    else if (ruleCount >= 3) score += 10;

    // Confidence avg factor
    if (confidenceAvg >= 0.7) score += 10;
    else if (confidenceAvg >= 0.5) score += 5;
  }

  // Historical accuracy override (most authoritative signal)
  if (historicalAccuracy != null) {
    // Blend: 60% historical + 40% data-based
    score = Math.round(historicalAccuracy * 0.60 + score * 0.40);
  }

  score = Math.min(95, Math.max(10, score));

  const label =
    score >= 75 ? `Alta (${score}%)` :
    score >= 50 ? `Média (${score}%)` :
    `Baixa (${score}%)`;

  return { score, label };
}

// ── Summary builder ───────────────────────────────────────────────────────────

function buildSummary(variants: VariantResult[], winnerIndex: number): string {
  const winner = variants.find((v) => v.index === winnerIndex);
  if (!winner) return 'Simulação concluída.';

  const parts: string[] = [];
  parts.push(`Variante ${winnerIndex + 1} é a mais forte (ressonância ${winner.aggregate_resonance}/100).`);

  if (winner.predicted_save_rate > 0.02) {
    parts.push(`Potencial de saves: ${(winner.predicted_save_rate * 100).toFixed(1)}%.`);
  }
  if (winner.predicted_click_rate > 0.01) {
    parts.push(`CTR estimado: ${(winner.predicted_click_rate * 100).toFixed(1)}%.`);
  }
  if (winner.top_cluster) {
    parts.push(`Melhor ressonância com cluster "${winner.top_cluster}".`);
  }

  const criticalFlags = winner.risk_flags.filter((f) => f.severity === 'critical');
  if (criticalFlags.length > 0) {
    parts.push(`Atenção: ${criticalFlags.map((f) => f.description).join('; ')}.`);
  }

  parts.push(`Copy estimada para ${winner.fatigue_days} dias de vida útil.`);

  return parts.join(' ');
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function runSimulation(input: SimulationInput): Promise<SimulationReport> {
  const { tenantId, clientId, campaignId, platform, variants } = input;

  if (!variants.length) throw new Error('Nenhuma variante fornecida para simulação.');

  // 1. Load clusters (real or cold-start)
  const realClusters = clientId ? await loadClientClusters(clientId, tenantId) : [];
  let coldStartResult: ColdStartResult;

  if (clientId) {
    coldStartResult = await getSimulationClusters(clientId, tenantId, realClusters);
  } else {
    // No client_id: pure benchmark
    const { buildGlobalBenchmarkClusters } = await import('./coldStartService');
    const benchmarkClusters = buildGlobalBenchmarkClusters();
    coldStartResult = { clusters: benchmarkClusters, source: 'cold_start', peer_count: 0, message: 'Sem cliente selecionado — usando benchmarks gerais do mercado.' };
  }

  const clusters = coldStartResult.clusters;
  const isColdStart = coldStartResult.source === 'cold_start';

  // 2. Load learning rules
  const rules = clientId ? await loadClientRules(clientId, tenantId) : [];

  // 3. Load calibrated scoring weights (Fase 3) + parallel data sources
  const [weights, clientRates, copyIntel, timingCtx] = await Promise.all([
    loadScoringWeights(tenantId, clientId, platform),
    clientId ? loadClientBriefingRates(clientId, tenantId, platform) : Promise.resolve({ platform_rates: {}, overall: null, has_sufficient_data: false }),
    clientId ? loadCopyIntelligence(clientId, tenantId, platform) : Promise.resolve({ has_data: false, avg_fogg_composite: null, high_roi_avg_fogg: null, fogg_scale_factor: 1.0, avg_ctr: null, avg_roi_score: null, sample_size: 0 }),
    clientId ? getTimingContext(clientId, tenantId, platform) : Promise.resolve({ has_data: false, best_day: null, best_hour: null, best_day_label: null, best_slot_label: null, peak_multiplier: 1.0, scheduled_multiplier: 1.0, sample_size: 0 }),
  ]);

  // Apply copy intelligence: calibrate fogg_multiplier_scale based on client history
  const calibratedWeights = copyIntel.fogg_scale_factor !== 1.0
    ? { ...weights, fogg_multiplier_scale: Math.round(weights.fogg_multiplier_scale * copyIntel.fogg_scale_factor * 100) / 100 }
    : weights;

  // 4. Score variants with calibrated weights
  const resonanceResults = await scoreVariantsAgainstClusters(variants, clusters, rules, calibratedWeights);

  // Apply client briefing rates calibration to predicted rates
  // Computes correction factor: (blended_rate / cluster_avg_rate) and scales predictions
  if (clientRates.has_sufficient_data && clientRates.overall && clusters.length > 0) {
    let clusterAvgSave = 0, clusterAvgClick = 0, clusterAvgEng = 0;
    for (const c of clusters) {
      clusterAvgSave += c.avg_save_rate;
      clusterAvgClick += c.avg_click_rate;
      clusterAvgEng += c.avg_engagement_rate;
    }
    clusterAvgSave /= clusters.length;
    clusterAvgClick /= clusters.length;
    clusterAvgEng /= clusters.length;

    const blended = blendRates(clusterAvgSave, clusterAvgClick, clusterAvgEng, clientRates.overall);
    const saveFactor  = clusterAvgSave  > 0 ? blended.save       / clusterAvgSave  : 1;
    const clickFactor = clusterAvgClick > 0 ? blended.click      / clusterAvgClick : 1;
    const engFactor   = clusterAvgEng   > 0 ? blended.engagement / clusterAvgEng   : 1;

    for (const r of resonanceResults) {
      r.predicted_save_rate        = Math.round(r.predicted_save_rate        * saveFactor  * 10000) / 10000;
      r.predicted_click_rate       = Math.round(r.predicted_click_rate       * clickFactor * 10000) / 10000;
      r.predicted_engagement_rate  = Math.round(r.predicted_engagement_rate  * engFactor   * 10000) / 10000;
    }
  }

  // 5. Estimate fatigue + detect risks per variant
  const dominantAmd = variants[0]?.amd;
  const fatigueResult = await estimateFatiguedays(
    clientId ?? '',
    tenantId,
    dominantAmd,
    platform,
  );
  const { fatigue_days, source: fatigueSource } = fatigueResult;

  const allRisks = await detectRisks(variants, clusters, clientId ?? '', tenantId);

  // 6. Build variant results
  const variantResults: VariantResult[] = variants.map((v) => {
    const resonance = resonanceResults.find((r) => r.variant_index === v.index)!;
    const risks = allRisks.filter((f) => f.variant_index === v.index);

    return {
      index: v.index,
      text_preview: v.text.slice(0, 120),
      aggregate_resonance: resonance.aggregate_resonance,
      predicted_save_rate: resonance.predicted_save_rate,
      predicted_click_rate: resonance.predicted_click_rate,
      predicted_engagement_rate: resonance.predicted_engagement_rate,
      top_cluster: resonance.top_cluster,
      scores_by_cluster: resonance.scores_by_cluster.map((s) => ({
        cluster_type: s.cluster_type,
        cluster_label: s.cluster_label,
        resonance_score: s.resonance_score,
        amd_match: s.amd_match,
        trigger_matches: s.trigger_matches,
        risk_level: s.risk_level,
      })),
      risk_flags: risks,
      fatigue_days,
      fatigue_source: fatigueSource,
      engagement_7d: fatigueResult.engagement_7d,
      engagement_30d: fatigueResult.engagement_30d,
      engagement_delta_pct: fatigueResult.engagement_delta_pct,
    };
  });

  // 7. Find winner
  const winner = [...variantResults].sort(
    (a, b) =>
      b.aggregate_resonance - a.aggregate_resonance ||
      b.predicted_save_rate - a.predicted_save_rate,
  )[0];

  const confidenceAvg = clusters.length
    ? clusters.reduce((s, c) => s + c.confidence_score, 0) / clusters.length
    : 0;

  // 8. Compute prediction confidence (Fase 4)
  let historicalAccuracy: number | null = null;
  if (clientId) {
    const accuracy = await getClientAccuracy(clientId, tenantId).catch(() => null);
    if (accuracy && accuracy.outcome_count >= 3) {
      historicalAccuracy = accuracy.avg_accuracy_pct;
    }
  }

  const { score: predConfidence, label: predConfidenceLabel } = computePredictionConfidence({
    clusterCount: clusters.length,
    ruleCount: rules.length,
    confidenceAvg,
    coldStart: isColdStart,
    historicalAccuracy,
  });

  // Track which real data sources contributed to this simulation
  const dataSources: string[] = [];
  if (fatigueSource === 'historical') dataSources.push('historical_metrics');
  if (fatigueSource === 'reportei') dataSources.push('reportei');
  if (clientRates.has_sufficient_data) dataSources.push('briefing_metrics');
  if (copyIntel.has_data) dataSources.push('copy_roi');
  if (timingCtx.has_data) dataSources.push('timing_analytics');
  if (!isColdStart && clusters.length > 0) dataSources.push('behavior_clusters');
  if (rules.length > 0) dataSources.push('learning_rules');

  const summary = buildSummary(variantResults, winner.index);

  // 9. Persist
  const res = await query<{ id: string; created_at: string }>(
    `INSERT INTO simulation_results
       (tenant_id, client_id, campaign_id, platform, variants, scores,
        winner_index, winner_predicted_save_rate, winner_predicted_click_rate,
        winner_predicted_engagement, winner_fatigue_days, risk_flags,
        cluster_count, rule_count, confidence_avg)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING id, created_at`,
    [
      tenantId,
      clientId ?? null,
      campaignId ?? null,
      platform ?? null,
      JSON.stringify(variants.map((v) => ({ index: v.index, text_preview: v.text.slice(0, 120), amd: v.amd, triggers: v.triggers }))),
      JSON.stringify(variantResults.map((v) => v.scores_by_cluster)),
      winner.index,
      winner.predicted_save_rate,
      winner.predicted_click_rate,
      winner.predicted_engagement_rate,
      fatigue_days,
      JSON.stringify(allRisks),
      clusters.length,
      rules.length,
      confidenceAvg,
    ],
  );

  return {
    id: res.rows[0].id,
    winner_index: winner.index,
    winner_resonance: winner.aggregate_resonance,
    variants: variantResults,
    cluster_count: clusters.length,
    rule_count: rules.length,
    confidence_avg: Math.round(confidenceAvg * 100) / 100,
    prediction_confidence: predConfidence,
    prediction_confidence_label: predConfidenceLabel,
    cold_start: isColdStart,
    cold_start_message: coldStartResult.message,
    timing_context: timingCtx.has_data
      ? { has_data: true, best_slot_label: timingCtx.best_slot_label, peak_multiplier: timingCtx.peak_multiplier }
      : null,
    data_sources: dataSources,
    summary,
    created_at: res.rows[0].created_at,
  };
}

// ── Load saved result ─────────────────────────────────────────────────────────

export async function loadSimulationResult(id: string, tenantId: string): Promise<SimulationReport | null> {
  const res = await query<any>(
    `SELECT * FROM simulation_results WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  if (!res.rows.length) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    winner_index: row.winner_index ?? 0,
    winner_resonance: 0,
    variants: [],
    cluster_count: row.cluster_count ?? 0,
    rule_count: row.rule_count ?? 0,
    confidence_avg: parseFloat(row.confidence_avg ?? '0'),
    prediction_confidence: 0,
    prediction_confidence_label: '',
    cold_start: false,
    timing_context: null,
    data_sources: [],
    summary: '',
    created_at: row.created_at,
  };
}
