/**
 * Resonance Scorer
 *
 * Pontua cada variante de copy contra cada cluster comportamental do cliente.
 * Combina:
 *   1. AMD match: AMD da copy vs AMD preferido do cluster
 *   2. Trigger overlap: gatilhos da copy vs gatilhos preferidos do cluster
 *   3. Learning rules: uplift patterns validados (≥15% uplift, n≥3)
 *   4. Fogg multiplier: qualidade técnica da copy (motivation × ability × prompt)
 *
 * Output: predicted_save_rate, predicted_click_rate, predicted_engagement_rate
 * por variante por cluster.
 */

import { query } from '../../db';
import { BehaviorCluster } from '../behaviorClusteringService';
import { LearningRule } from '../learningEngine';
import { ScoringWeights, DEFAULT_WEIGHTS } from './scoringCalibrator';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VariantInput {
  index: number;
  text: string;
  amd?: string;
  triggers?: string[];
  fogg_motivation?: number; // 1–10
  fogg_ability?: number;    // 1–10
  fogg_prompt?: number;     // 1–10
}

export interface ClusterScore {
  variant_index: number;
  cluster_type: string;
  cluster_label: string;
  resonance_score: number;         // 0–100
  predicted_save_rate: number;
  predicted_click_rate: number;
  predicted_engagement_rate: number;
  amd_match: boolean;
  trigger_matches: string[];
  applied_rules: string[];
  risk_level: 'low' | 'medium' | 'high';
}

export interface ResonanceResult {
  variant_index: number;
  scores_by_cluster: ClusterScore[];
  aggregate_resonance: number;       // 0–100, weighted avg across clusters
  predicted_save_rate: number;       // weighted avg
  predicted_click_rate: number;
  predicted_engagement_rate: number;
  top_cluster: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function triggerOverlap(variantTriggers: string[], clusterTriggers: string[]): string[] {
  if (!variantTriggers?.length || !clusterTriggers?.length) return [];
  const ct = new Set(clusterTriggers.map((t) => t.toLowerCase()));
  return variantTriggers.filter((t) => ct.has(t.toLowerCase()));
}

// ── Main scorer ───────────────────────────────────────────────────────────────

export async function scoreVariantsAgainstClusters(
  variants: VariantInput[],
  clusters: BehaviorCluster[],
  rules: LearningRule[],
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): Promise<ResonanceResult[]> {
  return variants.map((variant) => {
    const clusterScores: ClusterScore[] = clusters.map((cluster) => {
      // 1. AMD match
      const amdMatch = !!(variant.amd && cluster.preferred_amd &&
        variant.amd.toLowerCase() === cluster.preferred_amd.toLowerCase());

      // 2. Trigger overlap
      const triggerMatches = triggerOverlap(variant.triggers ?? [], cluster.preferred_triggers ?? []);

      // 3. Applicable learning rules
      const appliedRules: string[] = [];
      let ruleUpliftSave = 0;
      let ruleUpliftClick = 0;
      let ruleUpliftEngagement = 0;

      for (const rule of rules) {
        if (!rule.is_active) continue;
        const seg = rule.segment_definition;

        let ruleApplies = false;
        if (seg.type === 'amd' && variant.amd && seg.value === variant.amd) ruleApplies = true;
        if (seg.type === 'trigger' && variant.triggers?.includes(seg.value)) ruleApplies = true;
        if (seg.type === 'platform') ruleApplies = true; // platform-level rules always apply

        if (ruleApplies) {
          const uplift = (rule.uplift_value / 100) * rule.confidence_score;
          if (rule.uplift_metric === 'save_rate') ruleUpliftSave += uplift;
          else if (rule.uplift_metric === 'click_rate') ruleUpliftClick += uplift;
          else if (rule.uplift_metric === 'eng_rate') ruleUpliftEngagement += uplift;
          appliedRules.push(rule.rule_name);
        }
      }

      // 4. Fogg quality multiplier (uses dynamic weights)
      const { fogg_multiplier_base: fBase, fogg_multiplier_scale: fScale } = weights;
      const m = (variant.fogg_motivation ?? 5) / 10;
      const a = (variant.fogg_ability ?? 5) / 10;
      const p = (variant.fogg_prompt ?? 5) / 10;
      const geo = Math.cbrt(m * a * p);
      const fogg = fBase + geo * fScale;

      // 5. Base rates from cluster
      const baseSave = cluster.avg_save_rate;
      const baseClick = cluster.avg_click_rate;
      const baseEngagement = cluster.avg_engagement_rate;

      // 6. AMD boost: dynamic weight if match, -10% if mismatch and cluster has preference
      const amdBoost = amdMatch
        ? weights.amd_match_boost
        : (cluster.preferred_amd && variant.amd ? -0.10 : 0);

      // 7. Trigger boost: dynamic weight per match, dynamic cap
      const triggerBoost = Math.min(
        triggerMatches.length * weights.trigger_boost_per_match,
        weights.trigger_boost_cap,
      );

      // 8. Predicted rates
      const saveMultiplier = (1 + amdBoost + triggerBoost + ruleUpliftSave) * fogg;
      const clickMultiplier = (1 + amdBoost + triggerBoost + ruleUpliftClick) * fogg;
      const engagementMultiplier = (1 + amdBoost + triggerBoost + ruleUpliftEngagement) * fogg;

      const predictedSave = Math.max(0, baseSave * saveMultiplier);
      const predictedClick = Math.max(0, baseClick * clickMultiplier);
      const predictedEngagement = Math.max(0, baseEngagement * engagementMultiplier);

      // 9. Resonance score 0–100 (scaled proportionally to dynamic weights)
      const amdPoints = amdMatch ? Math.round(weights.amd_match_boost * 100) : 0; // ~30pts at default
      const triggerPoints = Math.min(triggerMatches.length * 12, 36);
      const rulePoints = Math.min(appliedRules.length * 8, 24);
      const foggPoints = Math.round((fogg - fBase) / fScale * 10); // 0-10
      const resonance = Math.min(100, amdPoints + triggerPoints + rulePoints + foggPoints);

      // 10. Risk level
      const riskLevel: 'low' | 'medium' | 'high' =
        resonance >= 60 ? 'low' : resonance >= 35 ? 'medium' : 'high';

      return {
        variant_index: variant.index,
        cluster_type: cluster.cluster_type,
        cluster_label: cluster.cluster_label,
        resonance_score: resonance,
        predicted_save_rate: Math.round(predictedSave * 10000) / 10000,
        predicted_click_rate: Math.round(predictedClick * 10000) / 10000,
        predicted_engagement_rate: Math.round(predictedEngagement * 10000) / 10000,
        amd_match: amdMatch,
        trigger_matches: triggerMatches,
        applied_rules: appliedRules,
        risk_level: riskLevel,
      };
    });

    // Weighted aggregate (by cluster confidence × sample_size)
    const totalWeight = clusters.reduce((s, c) => s + c.confidence_score * c.sample_size, 0) || 1;
    const weightedResonance = clusters.reduce((s, c, i) => {
      const w = (c.confidence_score * c.sample_size) / totalWeight;
      return s + (clusterScores[i]?.resonance_score ?? 0) * w;
    }, 0);
    const weightedSave = clusters.reduce((s, c, i) => {
      const w = (c.confidence_score * c.sample_size) / totalWeight;
      return s + (clusterScores[i]?.predicted_save_rate ?? 0) * w;
    }, 0);
    const weightedClick = clusters.reduce((s, c, i) => {
      const w = (c.confidence_score * c.sample_size) / totalWeight;
      return s + (clusterScores[i]?.predicted_click_rate ?? 0) * w;
    }, 0);
    const weightedEngagement = clusters.reduce((s, c, i) => {
      const w = (c.confidence_score * c.sample_size) / totalWeight;
      return s + (clusterScores[i]?.predicted_engagement_rate ?? 0) * w;
    }, 0);

    const topClusterScore = [...clusterScores].sort((a, b) => b.resonance_score - a.resonance_score)[0];

    return {
      variant_index: variant.index,
      scores_by_cluster: clusterScores,
      aggregate_resonance: Math.round(weightedResonance),
      predicted_save_rate: Math.round(weightedSave * 10000) / 10000,
      predicted_click_rate: Math.round(weightedClick * 10000) / 10000,
      predicted_engagement_rate: Math.round(weightedEngagement * 10000) / 10000,
      top_cluster: topClusterScore?.cluster_type ?? 'desconhecido',
    };
  });
}

// ── Data loaders ──────────────────────────────────────────────────────────────

export async function loadClientClusters(clientId: string, tenantId: string): Promise<BehaviorCluster[]> {
  const res = await query<any>(
    `SELECT cluster_type, cluster_label, avg_save_rate, avg_click_rate,
            avg_like_rate, avg_engagement_rate, preferred_format, preferred_amd,
            preferred_triggers, sample_size, confidence_score, top_formats
     FROM client_behavior_profiles
     WHERE client_id = $1 AND tenant_id = $2
     ORDER BY confidence_score DESC`,
    [clientId, tenantId],
  );
  return res.rows.map((r) => ({
    ...r,
    preferred_triggers: r.preferred_triggers ?? [],
    top_formats: r.top_formats ?? [],
  }));
}

export async function loadClientRules(clientId: string, tenantId: string): Promise<LearningRule[]> {
  const res = await query<any>(
    `SELECT rule_name, segment_definition, effective_pattern, uplift_metric,
            uplift_value, confidence_score, sample_size, is_active
     FROM learning_rules
     WHERE client_id = $1 AND tenant_id = $2 AND is_active = true
     ORDER BY uplift_value DESC`,
    [clientId, tenantId],
  );
  return res.rows;
}
