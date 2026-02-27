/**
 * Behavior Clustering Service
 *
 * Fase 3 — Personalização
 *
 * Deriva perfis comportamentais reais da audiência de um cliente a partir de:
 *   - format_performance_metrics  (saves, clicks, likes, impressions)
 *   - campaign_formats            (platform, format_name, campaign_id)
 *   - campaigns.behavior_intents  (AMD, triggers por fase/audience)
 *
 * Gera 2–4 clusters por cliente:
 *   salvadores      → save_rate dominante (dark social, conteúdo de referência)
 *   clicadores      → click_rate dominante (tráfego, CTR)
 *   leitores_silenciosos → impressions altos, engagement baixo (informados, não agem)
 *   convertidos     → conversions > 0 (fundo de funil)
 *
 * Upserta em client_behavior_profiles — consumido pelo AgentPlanner.
 */

import { query } from '../db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BehaviorCluster {
  cluster_type: 'salvadores' | 'clicadores' | 'leitores_silenciosos' | 'convertidos';
  cluster_label: string;
  avg_save_rate: number;
  avg_click_rate: number;
  avg_like_rate: number;
  avg_engagement_rate: number;
  preferred_format: string | null;
  preferred_amd: string | null;
  preferred_triggers: string[];
  sample_size: number;
  confidence_score: number;
  top_formats: Array<{
    format_id: string;
    format_name: string;
    platform: string;
    rate: number;
    metric: string;
  }>;
}

interface FormatStats {
  format_id: string;
  format_name: string;
  platform: string;
  campaign_id: string;
  total_impressions: number;
  total_saves: number;
  total_clicks: number;
  total_likes: number;
  total_shares: number;
  total_comments: number;
  total_conversions: number;
  // Enriched after join
  amd: string | null;
  triggers: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeRate(num: number, den: number): number {
  return den > 0 ? num / den : 0;
}

/** Round to 5 decimal places */
function r5(n: number): number {
  return Math.round(n * 100000) / 100000;
}

/** Confidence based on sample size: asymptotic toward 0.95 */
function calcConfidence(sampleSize: number): number {
  if (sampleSize <= 0) return 0;
  const raw = 1 - Math.exp(-sampleSize / 10);
  return Math.round(Math.min(raw, 0.95) * 100) / 100;
}

/** Extract dominant AMD + triggers from campaign behavior_intents JSONB */
function extractAmdAndTriggers(
  behaviorIntents: Array<{ amd?: string; triggers?: string[] }> | null
): { amd: string | null; triggers: string[] } {
  if (!behaviorIntents?.length) return { amd: null, triggers: [] };

  // Count AMD occurrences
  const amdCount: Record<string, number> = {};
  const allTriggers: string[] = [];

  for (const bi of behaviorIntents) {
    if (bi.amd) amdCount[bi.amd] = (amdCount[bi.amd] ?? 0) + 1;
    if (Array.isArray(bi.triggers)) allTriggers.push(...bi.triggers);
  }

  const amd = Object.entries(amdCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Unique triggers, sorted by frequency
  const triggerCount: Record<string, number> = {};
  for (const t of allTriggers) triggerCount[t] = (triggerCount[t] ?? 0) + 1;
  const triggers = Object.entries(triggerCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => t);

  return { amd, triggers };
}

// ── Core computation ──────────────────────────────────────────────────────────

export async function computeBehaviorClusters(
  tenantId: string,
  clientId: string
): Promise<BehaviorCluster[]> {
  // 1. Load format performance aggregated by campaign_format_id
  const { rows: rawStats } = await query(
    `SELECT
       cf.id              AS format_id,
       cf.format_name,
       cf.platform,
       cf.campaign_id::text AS campaign_id,
       COALESCE(SUM(fpm.impressions),  0)   AS total_impressions,
       COALESCE(SUM(fpm.saves),        0)   AS total_saves,
       COALESCE(SUM(fpm.clicks),       0)   AS total_clicks,
       COALESCE(SUM(fpm.likes),        0)   AS total_likes,
       COALESCE(SUM(fpm.shares),       0)   AS total_shares,
       COALESCE(SUM(fpm.comments),     0)   AS total_comments,
       COALESCE(SUM(fpm.conversions),  0)   AS total_conversions
     FROM campaign_formats cf
     JOIN format_performance_metrics fpm ON fpm.campaign_format_id = cf.id
     WHERE cf.tenant_id=$1 AND cf.client_id=$2
     GROUP BY cf.id, cf.format_name, cf.platform, cf.campaign_id
     HAVING SUM(fpm.impressions) > 0`,
    [tenantId, clientId]
  );

  if (!rawStats.length) return [];

  // 2. Load behavior_intents for all campaigns touched by these formats
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
    campaignIntentsMap[c.id] = extractAmdAndTriggers(intents);
  }

  // 3. Enrich stats with AMD / triggers
  const stats: FormatStats[] = rawStats.map((r) => {
    const ci = campaignIntentsMap[r.campaign_id] ?? { amd: null, triggers: [] };
    return {
      format_id: r.format_id,
      format_name: r.format_name,
      platform: r.platform,
      campaign_id: r.campaign_id,
      total_impressions: Number(r.total_impressions),
      total_saves: Number(r.total_saves),
      total_clicks: Number(r.total_clicks),
      total_likes: Number(r.total_likes),
      total_shares: Number(r.total_shares),
      total_comments: Number(r.total_comments),
      total_conversions: Number(r.total_conversions),
      amd: ci.amd,
      triggers: ci.triggers,
    };
  });

  // 4. Compute global averages
  const totalImpressions = stats.reduce((s, f) => s + f.total_impressions, 0);
  const globalSaveRate    = r5(safeRate(stats.reduce((s, f) => s + f.total_saves,  0), totalImpressions));
  const globalClickRate   = r5(safeRate(stats.reduce((s, f) => s + f.total_clicks, 0), totalImpressions));
  const globalLikeRate    = r5(safeRate(stats.reduce((s, f) => s + f.total_likes,  0), totalImpressions));
  const globalEngRate     = r5(safeRate(
    stats.reduce((s, f) => s + f.total_saves + f.total_clicks + f.total_likes + f.total_shares + f.total_comments, 0),
    totalImpressions
  ));

  const confidence = calcConfidence(stats.length);

  // 5. Rank formats by metric
  const withRates = stats.map((f) => ({
    ...f,
    save_rate:    safeRate(f.total_saves,   f.total_impressions),
    click_rate:   safeRate(f.total_clicks,  f.total_impressions),
    like_rate:    safeRate(f.total_likes,   f.total_impressions),
    eng_rate:     safeRate(f.total_saves + f.total_clicks + f.total_likes + f.total_shares + f.total_comments, f.total_impressions),
    conversion_rate: safeRate(f.total_conversions, f.total_impressions),
  }));

  const bySaveRate  = [...withRates].sort((a, b) => b.save_rate  - a.save_rate);
  const byClickRate = [...withRates].sort((a, b) => b.click_rate - a.click_rate);
  // Leitores: high impressions but lowest engagement
  const leitores    = [...withRates]
    .filter((f) => f.total_impressions >= 500)
    .sort((a, b) => a.eng_rate - b.eng_rate);
  const byConversion = [...withRates].filter((f) => f.total_conversions > 0)
    .sort((a, b) => b.conversion_rate - a.conversion_rate);

  const clusters: BehaviorCluster[] = [];

  // ── Salvadores ──────────────────────────────────────────────────────────
  const topSave = bySaveRate.slice(0, 3);
  if (topSave.length > 0 && topSave[0].save_rate > 0) {
    const best = topSave[0];
    clusters.push({
      cluster_type: 'salvadores',
      cluster_label: 'Salvadores',
      avg_save_rate:    globalSaveRate,
      avg_click_rate:   globalClickRate,
      avg_like_rate:    globalLikeRate,
      avg_engagement_rate: globalEngRate,
      preferred_format:  `${best.platform} · ${best.format_name}`,
      preferred_amd:     best.amd ?? 'salvar',
      preferred_triggers: best.triggers.length ? best.triggers : ['especificidade', 'prova_social'],
      sample_size:       stats.length,
      confidence_score:  confidence,
      top_formats: topSave.map((f) => ({
        format_id:   f.format_id,
        format_name: f.format_name,
        platform:    f.platform,
        rate:        r5(f.save_rate),
        metric:      'save_rate',
      })),
    });
  }

  // ── Clicadores ──────────────────────────────────────────────────────────
  const topClick = byClickRate.slice(0, 3);
  if (topClick.length > 0 && topClick[0].click_rate > 0) {
    const best = topClick[0];
    clusters.push({
      cluster_type: 'clicadores',
      cluster_label: 'Clicadores',
      avg_save_rate:    globalSaveRate,
      avg_click_rate:   globalClickRate,
      avg_like_rate:    globalLikeRate,
      avg_engagement_rate: globalEngRate,
      preferred_format:  `${best.platform} · ${best.format_name}`,
      preferred_amd:     best.amd ?? 'clicar',
      preferred_triggers: best.triggers.length ? best.triggers : ['curiosidade', 'perda'],
      sample_size:       stats.length,
      confidence_score:  confidence,
      top_formats: topClick.map((f) => ({
        format_id:   f.format_id,
        format_name: f.format_name,
        platform:    f.platform,
        rate:        r5(f.click_rate),
        metric:      'click_rate',
      })),
    });
  }

  // ── Leitores Silenciosos ─────────────────────────────────────────────────
  if (leitores.length > 0) {
    const best = leitores[0];
    clusters.push({
      cluster_type: 'leitores_silenciosos',
      cluster_label: 'Leitores Silenciosos',
      avg_save_rate:    globalSaveRate,
      avg_click_rate:   globalClickRate,
      avg_like_rate:    globalLikeRate,
      avg_engagement_rate: globalEngRate,
      preferred_format:  `${best.platform} · ${best.format_name}`,
      preferred_amd:     best.amd ?? 'compartilhar',
      preferred_triggers: best.triggers.length ? best.triggers : ['identidade', 'autoridade'],
      sample_size:       stats.length,
      confidence_score:  Math.min(confidence, 0.7), // lower confidence — inferred
      top_formats: leitores.slice(0, 3).map((f) => ({
        format_id:   f.format_id,
        format_name: f.format_name,
        platform:    f.platform,
        rate:        r5(f.eng_rate),
        metric:      'engagement_rate',
      })),
    });
  }

  // ── Convertidos ─────────────────────────────────────────────────────────
  if (byConversion.length > 0) {
    const best = byConversion[0];
    clusters.push({
      cluster_type: 'convertidos',
      cluster_label: 'Convertidos',
      avg_save_rate:    globalSaveRate,
      avg_click_rate:   globalClickRate,
      avg_like_rate:    globalLikeRate,
      avg_engagement_rate: globalEngRate,
      preferred_format:  `${best.platform} · ${best.format_name}`,
      preferred_amd:     best.amd ?? 'pedir_proposta',
      preferred_triggers: best.triggers.length ? best.triggers : ['perda', 'urgencia'],
      sample_size:       byConversion.length,
      confidence_score:  calcConfidence(byConversion.length),
      top_formats: byConversion.slice(0, 3).map((f) => ({
        format_id:   f.format_id,
        format_name: f.format_name,
        platform:    f.platform,
        rate:        r5(f.conversion_rate),
        metric:      'conversion_rate',
      })),
    });
  }

  return clusters;
}

// ── Persist ───────────────────────────────────────────────────────────────────

export async function upsertBehaviorClusters(
  tenantId: string,
  clientId: string,
  clusters: BehaviorCluster[]
): Promise<void> {
  for (const c of clusters) {
    await query(
      `INSERT INTO client_behavior_profiles
         (tenant_id, client_id, cluster_type, cluster_label,
          avg_save_rate, avg_click_rate, avg_like_rate, avg_engagement_rate,
          preferred_format, preferred_amd, preferred_triggers,
          sample_size, confidence_score, top_formats, last_computed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::text[],$12,$13,$14::jsonb,now())
       ON CONFLICT (tenant_id, client_id, cluster_type)
       DO UPDATE SET
         cluster_label        = $4,
         avg_save_rate        = $5,
         avg_click_rate       = $6,
         avg_like_rate        = $7,
         avg_engagement_rate  = $8,
         preferred_format     = $9,
         preferred_amd        = $10,
         preferred_triggers   = $11::text[],
         sample_size          = $12,
         confidence_score     = $13,
         top_formats          = $14::jsonb,
         last_computed_at     = now()`,
      [
        tenantId, clientId,
        c.cluster_type, c.cluster_label,
        c.avg_save_rate, c.avg_click_rate, c.avg_like_rate, c.avg_engagement_rate,
        c.preferred_format, c.preferred_amd, c.preferred_triggers,
        c.sample_size, c.confidence_score,
        JSON.stringify(c.top_formats),
      ]
    );
  }
}

// ── Main export (compute + persist atomically) ────────────────────────────────

export async function recomputeClientBehaviorProfiles(
  tenantId: string,
  clientId: string
): Promise<BehaviorCluster[]> {
  const clusters = await computeBehaviorClusters(tenantId, clientId);
  if (clusters.length > 0) {
    await upsertBehaviorClusters(tenantId, clientId, clusters);
  }
  return clusters;
}

// ── Read stored profiles ──────────────────────────────────────────────────────

export async function loadBehaviorProfiles(
  tenantId: string,
  clientId: string
): Promise<BehaviorCluster[]> {
  const { rows } = await query(
    `SELECT cluster_type, cluster_label,
            avg_save_rate, avg_click_rate, avg_like_rate, avg_engagement_rate,
            preferred_format, preferred_amd, preferred_triggers,
            sample_size, confidence_score, top_formats, last_computed_at
     FROM client_behavior_profiles
     WHERE tenant_id=$1 AND client_id=$2
     ORDER BY confidence_score DESC NULLS LAST`,
    [tenantId, clientId]
  );

  return rows.map((r) => ({
    cluster_type:        r.cluster_type,
    cluster_label:       r.cluster_label,
    avg_save_rate:       Number(r.avg_save_rate),
    avg_click_rate:      Number(r.avg_click_rate),
    avg_like_rate:       Number(r.avg_like_rate),
    avg_engagement_rate: Number(r.avg_engagement_rate),
    preferred_format:    r.preferred_format,
    preferred_amd:       r.preferred_amd,
    preferred_triggers:  r.preferred_triggers ?? [],
    sample_size:         Number(r.sample_size),
    confidence_score:    Number(r.confidence_score),
    top_formats:         Array.isArray(r.top_formats) ? r.top_formats : [],
  }));
}
