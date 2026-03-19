/**
 * Simulation Report
 *
 * Orquestra o simulador completo:
 *   1. Carrega clusters + learning rules do cliente
 *   2. Pontua variantes via resonanceScorer
 *   3. Estima fadiga via fatigueEstimator
 *   4. Detecta riscos via riskDetector
 *   5. Consolida em SimulationReport e persiste em simulation_results
 */

import { query } from '../../db';
import { VariantInput, scoreVariantsAgainstClusters, loadClientClusters, loadClientRules } from './resonanceScorer';
import { estimateFatiguedays } from './fatigueEstimator';
import { detectRisks, RiskFlag } from './riskDetector';

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
  text_preview: string;           // primeiros 120 chars
  aggregate_resonance: number;    // 0–100
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
  fatigue_source: 'historical' | 'benchmark';
}

export interface SimulationReport {
  id: string;
  winner_index: number;
  winner_resonance: number;
  variants: VariantResult[];
  cluster_count: number;
  rule_count: number;
  confidence_avg: number;
  summary: string;               // texto legível para o usuário
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  // 1. Load clusters
  const clusters = clientId ? await loadClientClusters(clientId, tenantId) : [];

  // 2. Load learning rules
  const rules = clientId ? await loadClientRules(clientId, tenantId) : [];

  // 3. Score variants
  const resonanceResults = await scoreVariantsAgainstClusters(variants, clusters, rules);

  // 4. Estimate fatigue + detect risks per variant
  const dominantAmd = variants[0]?.amd;
  const { fatigue_days, source: fatigueSource } = await estimateFatiguedays(
    clientId ?? '',
    tenantId,
    dominantAmd,
    platform,
  );

  const allRisks = await detectRisks(variants, clusters, clientId ?? '', tenantId);

  // 5. Build variant results
  const variantResults: VariantResult[] = variants.map((v, i) => {
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
    };
  });

  // 6. Find winner (highest aggregate_resonance, tie-break by predicted_save_rate)
  const winner = [...variantResults].sort(
    (a, b) =>
      b.aggregate_resonance - a.aggregate_resonance ||
      b.predicted_save_rate - a.predicted_save_rate,
  )[0];

  const confidenceAvg = clusters.length
    ? clusters.reduce((s, c) => s + c.confidence_score, 0) / clusters.length
    : 0;

  const summary = buildSummary(variantResults, winner.index);

  // 7. Persist
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
  // Reconstruct minimal report for display
  return {
    id: row.id,
    winner_index: row.winner_index ?? 0,
    winner_resonance: 0,
    variants: [],
    cluster_count: row.cluster_count ?? 0,
    rule_count: row.rule_count ?? 0,
    confidence_avg: parseFloat(row.confidence_avg ?? '0'),
    summary: '',
    created_at: row.created_at,
  };
}
