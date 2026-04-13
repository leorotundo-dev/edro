/**
 * Learning Engine Service
 *
 * Fase 5 — Aprendizado
 *
 * Analisa format_performance_metrics + campaign_formats + campaigns.behavior_intents
 * para identificar padrões comportamentais que produzem uplift em métricas-chave.
 *
 * Gera LearningRule records por cliente:
 *   - Regras de AMD       → "salvar" produz +28% save_rate vs baseline
 *   - Regras de gatilho   → "curiosidade" produz +19% click_rate vs baseline
 *   - Regras de plataforma → "LinkedIn" produz +35% save_rate vs baseline
 *
 * Threshold: uplift >= 15% e sample_size >= 3.
 * Consumidas pelo AgentPlanner para enriquecer behavior_intents.
 */

import { query } from '../db';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LearningRule {
  id?: string;
  rule_name: string;
  segment_definition: Record<string, any>;
  effective_pattern: string;
  uplift_metric: string;
  uplift_value: number;
  confidence_score: number;
  sample_size: number;
  is_active: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const UPLIFT_THRESHOLD_PCT = 15; // require >= 15% uplift over baseline
const MIN_SAMPLE_SIZE = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeRate(num: number, den: number): number {
  return den > 0 ? num / den : 0;
}

/** Confidence: asymptotic toward 0.95 */
function calcConfidence(sampleSize: number): number {
  if (sampleSize <= 0) return 0;
  const raw = 1 - Math.exp(-sampleSize / 8);
  return Math.round(Math.min(raw, 0.95) * 100) / 100;
}

/** % uplift with 1 decimal place */
function upliftPct(actual: number, baseline: number): number {
  if (baseline <= 0) return 0;
  return Math.round(((actual - baseline) / baseline) * 1000) / 10;
}

function extractAmdTriggers(
  behaviorIntents: Array<{ amd?: string; triggers?: string[] }> | null
): { amd: string | null; triggers: string[] } {
  if (!behaviorIntents?.length) return { amd: null, triggers: [] };

  const amdCount: Record<string, number> = {};
  const allTriggers: string[] = [];

  for (const bi of behaviorIntents) {
    if (bi.amd) amdCount[bi.amd] = (amdCount[bi.amd] ?? 0) + 1;
    if (Array.isArray(bi.triggers)) allTriggers.push(...bi.triggers);
  }

  const amd = Object.entries(amdCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const triggerCount: Record<string, number> = {};
  for (const t of allTriggers) triggerCount[t] = (triggerCount[t] ?? 0) + 1;
  const triggers = Object.entries(triggerCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t);

  return { amd, triggers };
}

// ── Core computation ──────────────────────────────────────────────────────────

export async function computeLearningRules(
  tenantId: string,
  clientId: string
): Promise<LearningRule[]> {
  // 1. Load format stats aggregated per campaign_format_id
  //    Also pull ROAS data from format_performance_summary (one row per format).
  const { rows: rawStats } = await query(
    `SELECT
       cf.id              AS format_id,
       cf.format_name,
       cf.platform,
       cf.campaign_id::text AS campaign_id,
       COALESCE(SUM(fpm.impressions),  0) AS total_impressions,
       COALESCE(SUM(fpm.saves),        0) AS total_saves,
       COALESCE(SUM(fpm.clicks),       0) AS total_clicks,
       COALESCE(SUM(fpm.likes),        0) AS total_likes,
       COALESCE(SUM(fpm.shares),       0) AS total_shares,
       COALESCE(SUM(fpm.comments),     0) AS total_comments,
       COALESCE(SUM(fpm.conversions),  0) AS total_conversions,
       COALESCE(fps.total_revenue_brl, 0) AS total_revenue,
       COALESCE(fps.total_spend_brl,   0) AS total_spend
     FROM campaign_formats cf
     JOIN format_performance_metrics fpm ON fpm.campaign_format_id = cf.id
     LEFT JOIN format_performance_summary fps ON fps.campaign_format_id = cf.id
     WHERE cf.tenant_id=$1 AND cf.client_id=$2
     GROUP BY cf.id, cf.format_name, cf.platform, cf.campaign_id,
              fps.total_revenue_brl, fps.total_spend_brl
     HAVING SUM(fpm.impressions) > 0`,
    [tenantId, clientId]
  );

  if (rawStats.length < MIN_SAMPLE_SIZE) return [];

  // 2. Load behavior_intents for all campaigns
  const campaignIds = [...new Set(rawStats.map((r) => r.campaign_id))];
  const { rows: campaigns } = await query(
    `SELECT id::text, behavior_intents
     FROM campaigns
     WHERE id = ANY($1::uuid[]) AND tenant_id=$2`,
    [campaignIds, tenantId]
  );

  const campaignIntentsMap: Record<string, { amd: string | null; triggers: string[] }> = {};
  for (const c of campaigns) {
    const intents = Array.isArray(c.behavior_intents) ? c.behavior_intents : [];
    campaignIntentsMap[c.id] = extractAmdTriggers(intents);
  }

  // 3. Enrich stats with rates + behavioral metadata
  const stats = rawStats.map((r) => {
    const ci = campaignIntentsMap[r.campaign_id] ?? { amd: null, triggers: [] };
    const imp = Number(r.total_impressions);
    const saves    = Number(r.total_saves);
    const clicks   = Number(r.total_clicks);
    const likes    = Number(r.total_likes);
    const shares   = Number(r.total_shares);
    const comments = Number(r.total_comments);
    const conv     = Number(r.total_conversions);
    const revenue  = Number(r.total_revenue);
    const spend    = Number(r.total_spend);
    return {
      format_id:       r.format_id,
      format_name:     r.format_name,
      platform:        r.platform as string,
      campaign_id:     r.campaign_id,
      total_impressions: imp,
      save_rate:       safeRate(saves, imp),
      click_rate:      safeRate(clicks, imp),
      like_rate:       safeRate(likes, imp),
      eng_rate:        safeRate(saves + clicks + likes + shares + comments, imp),
      conversion_rate: safeRate(conv, imp),
      roas:            spend > 0 ? revenue / spend : null as number | null,
      amd:             ci.amd,
      triggers:        ci.triggers,
    };
  });

  // 4. Global baselines (unweighted mean across formats)
  const n = stats.length;
  const baseline = {
    save_rate:       stats.reduce((s, f) => s + f.save_rate, 0) / n,
    click_rate:      stats.reduce((s, f) => s + f.click_rate, 0) / n,
    like_rate:       stats.reduce((s, f) => s + f.like_rate, 0) / n,
    eng_rate:        stats.reduce((s, f) => s + f.eng_rate, 0) / n,
    conversion_rate: stats.reduce((s, f) => s + f.conversion_rate, 0) / n,
  };

  // ROAS baseline: mean of formats that actually have spend data
  const roasFormats = stats.filter((f) => f.roas !== null) as Array<typeof stats[number] & { roas: number }>;
  const baselineRoas = roasFormats.length >= MIN_SAMPLE_SIZE
    ? roasFormats.reduce((s, f) => s + f.roas, 0) / roasFormats.length
    : null;

  const rules: LearningRule[] = [];
  const seen = new Set<string>();

  function tryAddRule(
    ruleName: string,
    segDef: Record<string, any>,
    pattern: string,
    metric: keyof typeof baseline,
    actualRate: number,
    sampleSize: number
  ): void {
    if (seen.has(ruleName)) return;
    if (sampleSize < MIN_SAMPLE_SIZE) return;
    const base = baseline[metric];
    if (base <= 0) return;
    const up = upliftPct(actualRate, base);
    if (up < UPLIFT_THRESHOLD_PCT) return;
    seen.add(ruleName);
    rules.push({
      rule_name:          ruleName,
      segment_definition: segDef,
      effective_pattern:  pattern,
      uplift_metric:      metric,
      uplift_value:       up,
      confidence_score:   calcConfidence(sampleSize),
      sample_size:        sampleSize,
      is_active:          true,
    });
  }

  function tryAddRoasRule(
    ruleName: string,
    segDef: Record<string, any>,
    pattern: string,
    avgRoas: number,
    sampleSize: number,
  ): void {
    if (!baselineRoas || baselineRoas <= 0) return;
    if (seen.has(ruleName)) return;
    if (sampleSize < MIN_SAMPLE_SIZE) return;
    const up = upliftPct(avgRoas, baselineRoas);
    if (up < UPLIFT_THRESHOLD_PCT) return;
    seen.add(ruleName);
    rules.push({
      rule_name:          ruleName,
      segment_definition: segDef,
      effective_pattern:  pattern,
      uplift_metric:      'roas',
      uplift_value:       up,
      confidence_score:   calcConfidence(sampleSize),
      sample_size:        sampleSize,
      is_active:          true,
    });
  }

  // 5. AMD rules
  const amdGroups: Record<string, typeof stats> = {};
  for (const f of stats) {
    if (f.amd) {
      if (!amdGroups[f.amd]) amdGroups[f.amd] = [];
      amdGroups[f.amd].push(f);
    }
  }
  for (const [amd, group] of Object.entries(amdGroups)) {
    const sz = group.length;
    for (const metric of ['save_rate', 'click_rate', 'conversion_rate'] as const) {
      const avgRate = group.reduce((s, f) => s + f[metric], 0) / sz;
      const metricLabel = metric.replace('_', ' ');
      tryAddRule(
        `amd_${amd}_${metric}`,
        { type: 'amd', value: amd },
        `AMD "${amd}" produz ${(avgRate * 100).toFixed(2)}% de ${metricLabel} (baseline ${(baseline[metric] * 100).toFixed(2)}%)`,
        metric,
        avgRate,
        sz
      );
    }
    // ROAS rule for this AMD
    const amdRoas = group.filter((f) => f.roas !== null) as Array<typeof group[number] & { roas: number }>;
    if (amdRoas.length >= MIN_SAMPLE_SIZE) {
      const avgRoas = amdRoas.reduce((s, f) => s + f.roas, 0) / amdRoas.length;
      tryAddRoasRule(
        `amd_${amd}_roas`,
        { type: 'amd', value: amd },
        `AMD "${amd}" produz ROAS ${avgRoas.toFixed(2)}x (baseline ${(baselineRoas ?? 0).toFixed(2)}x)`,
        avgRoas,
        amdRoas.length,
      );
    }
  }

  // 6. Trigger rules
  const triggerGroups: Record<string, typeof stats> = {};
  for (const f of stats) {
    for (const t of f.triggers) {
      if (!triggerGroups[t]) triggerGroups[t] = [];
      triggerGroups[t].push(f);
    }
  }
  for (const [trigger, group] of Object.entries(triggerGroups)) {
    const sz = group.length;
    for (const metric of ['save_rate', 'click_rate', 'eng_rate'] as const) {
      const avgRate = group.reduce((s, f) => s + f[metric], 0) / sz;
      const metricLabel = metric.replace('_', ' ');
      tryAddRule(
        `trigger_${trigger}_${metric}`,
        { type: 'trigger', value: trigger },
        `Gatilho "${trigger}" produz ${(avgRate * 100).toFixed(2)}% de ${metricLabel} (baseline ${(baseline[metric] * 100).toFixed(2)}%)`,
        metric,
        avgRate,
        sz
      );
    }
    // ROAS rule for this trigger
    const trigRoas = group.filter((f) => f.roas !== null) as Array<typeof group[number] & { roas: number }>;
    if (trigRoas.length >= MIN_SAMPLE_SIZE) {
      const avgRoas = trigRoas.reduce((s, f) => s + f.roas, 0) / trigRoas.length;
      tryAddRoasRule(
        `trigger_${trigger}_roas`,
        { type: 'trigger', value: trigger },
        `Gatilho "${trigger}" produz ROAS ${avgRoas.toFixed(2)}x (baseline ${(baselineRoas ?? 0).toFixed(2)}x)`,
        avgRoas,
        trigRoas.length,
      );
    }
  }

  // 7. Platform rules
  const platformGroups: Record<string, typeof stats> = {};
  for (const f of stats) {
    if (f.platform) {
      if (!platformGroups[f.platform]) platformGroups[f.platform] = [];
      platformGroups[f.platform].push(f);
    }
  }
  for (const [platform, group] of Object.entries(platformGroups)) {
    const sz = group.length;
    const platformKey = platform.toLowerCase().replace(/[^a-z0-9]/g, '_');
    for (const metric of ['save_rate', 'click_rate', 'eng_rate'] as const) {
      const avgRate = group.reduce((s, f) => s + f[metric], 0) / sz;
      const metricLabel = metric.replace('_', ' ');
      tryAddRule(
        `platform_${platformKey}_${metric}`,
        { type: 'platform', value: platform },
        `Plataforma "${platform}" produz ${(avgRate * 100).toFixed(2)}% de ${metricLabel} (baseline ${(baseline[metric] * 100).toFixed(2)}%)`,
        metric,
        avgRate,
        sz
      );
    }
    // ROAS rule for this platform
    const platRoas = group.filter((f) => f.roas !== null) as Array<typeof group[number] & { roas: number }>;
    if (platRoas.length >= MIN_SAMPLE_SIZE) {
      const avgRoas = platRoas.reduce((s, f) => s + f.roas, 0) / platRoas.length;
      tryAddRoasRule(
        `platform_${platformKey}_roas`,
        { type: 'platform', value: platform },
        `Plataforma "${platform}" produz ROAS ${avgRoas.toFixed(2)}x (baseline ${(baselineRoas ?? 0).toFixed(2)}x)`,
        avgRoas,
        platRoas.length,
      );
    }
  }

  // Sort by uplift_value descending — most impactful rules first
  rules.sort((a, b) => b.uplift_value - a.uplift_value);

  return rules;
}

// ── Persist ───────────────────────────────────────────────────────────────────

export async function upsertLearningRules(
  tenantId: string,
  clientId: string,
  rules: LearningRule[]
): Promise<void> {
  for (const r of rules) {
    await query(
      `INSERT INTO learning_rules
         (tenant_id, client_id, rule_name, segment_definition, effective_pattern,
          uplift_metric, uplift_value, confidence_score, sample_size, is_active, last_validated_at)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,now())
       ON CONFLICT (tenant_id, client_id, rule_name)
       DO UPDATE SET
         segment_definition  = $4::jsonb,
         effective_pattern   = $5,
         uplift_metric       = $6,
         uplift_value        = $7,
         confidence_score    = $8,
         sample_size         = $9,
         is_active           = $10,
         last_validated_at   = now(),
         updated_at          = now()`,
      [
        tenantId, clientId,
        r.rule_name, JSON.stringify(r.segment_definition), r.effective_pattern,
        r.uplift_metric, r.uplift_value, r.confidence_score, r.sample_size, r.is_active,
      ]
    );
  }
}

// ── Main export (compute + persist) ──────────────────────────────────────────

export async function recomputeClientLearningRules(
  tenantId: string,
  clientId: string
): Promise<LearningRule[]> {
  const rules = await computeLearningRules(tenantId, clientId);
  if (rules.length > 0) {
    await upsertLearningRules(tenantId, clientId, rules);
  }
  return rules;
}

// ── Read stored rules ─────────────────────────────────────────────────────────

export async function loadLearningRules(
  tenantId: string,
  clientId: string
): Promise<LearningRule[]> {
  const { rows } = await query(
    `SELECT rule_name, segment_definition, effective_pattern,
            uplift_metric, uplift_value, confidence_score, sample_size, is_active
     FROM learning_rules
     WHERE tenant_id=$1 AND client_id=$2 AND is_active=true
     ORDER BY uplift_value DESC NULLS LAST`,
    [tenantId, clientId]
  );

  return rows.map((r) => ({
    rule_name:          r.rule_name,
    segment_definition: r.segment_definition ?? {},
    effective_pattern:  r.effective_pattern,
    uplift_metric:      r.uplift_metric,
    uplift_value:       Number(r.uplift_value),
    confidence_score:   Number(r.confidence_score),
    sample_size:        Number(r.sample_size),
    is_active:          r.is_active,
  }));
}
