/**
 * Client Rates Service
 *
 * Carrega taxas reais de performance de briefing_post_metrics (via Reportei).
 * Fornece base rates históricas por cliente/plataforma para o resonanceScorer,
 * substituindo benchmarks genéricos quando há dados suficientes.
 *
 * Fonte: briefing_post_metrics — posts reais publicados a partir de briefings editoriais.
 * Precisão superior ao format_performance_metrics porque são posts com intencionalidade
 * editorial (aprovados via workflow de briefing).
 */

import { query } from '../../db';

export interface ClientBriefingRates {
  avg_save_rate: number;           // saves / impressions
  avg_click_proxy_rate: number;    // (likes + comments) / impressions — proxy de click intent
  avg_engagement_rate: number;     // engagement_rate como decimal (3.5% → 0.035)
  sample_size: number;
  platform: string;
}

export interface ClientRatesResult {
  platform_rates: Record<string, ClientBriefingRates>; // keyed by platform
  overall: ClientBriefingRates | null;                 // average across all platforms
  has_sufficient_data: boolean;                        // sample_size >= 5
}

/**
 * Carrega taxas históricas reais de posts publicados via briefing (últimos 90 dias).
 * Retorna null se dados insuficientes.
 */
export async function loadClientBriefingRates(
  clientId: string,
  tenantId: string,
  platform?: string,
): Promise<ClientRatesResult> {
  const res = await query<{
    platform: string;
    avg_save_rate: string | null;
    avg_click_proxy_rate: string | null;
    avg_engagement_rate: string | null;
    sample_size: string;
  }>(
    `SELECT
       bpm.platform,
       AVG(
         CASE WHEN bpm.impressions > 0 AND bpm.saves IS NOT NULL
              THEN bpm.saves::numeric / bpm.impressions
              ELSE NULL END
       )::numeric(8,6) AS avg_save_rate,
       AVG(
         CASE WHEN bpm.impressions > 0 AND (bpm.likes IS NOT NULL OR bpm.comments IS NOT NULL)
              THEN (COALESCE(bpm.likes, 0) + COALESCE(bpm.comments, 0))::numeric / bpm.impressions
              ELSE NULL END
       )::numeric(8,6) AS avg_click_proxy_rate,
       AVG(
         CASE WHEN bpm.engagement_rate IS NOT NULL
              THEN bpm.engagement_rate / 100.0
              ELSE NULL END
       )::numeric(8,6) AS avg_engagement_rate,
       COUNT(*) AS sample_size
     FROM briefing_post_metrics bpm
     WHERE bpm.client_id = $1
       AND bpm.tenant_id::text = $2
       AND ($3::text IS NULL OR bpm.platform ILIKE $3)
       AND bpm.published_at >= NOW() - INTERVAL '90 days'
       AND bpm.impressions IS NOT NULL
       AND bpm.impressions > 0
     GROUP BY bpm.platform
     ORDER BY COUNT(*) DESC
     LIMIT 10`,
    [clientId, tenantId, platform ?? null],
  ).catch(() => ({ rows: [] as any[] }));

  if (!res.rows.length) {
    return { platform_rates: {}, overall: null, has_sufficient_data: false };
  }

  const platform_rates: Record<string, ClientBriefingRates> = {};
  let totalSampleSize = 0;
  let sumSave = 0, sumClick = 0, sumEngagement = 0, sumCount = 0;

  for (const row of res.rows) {
    const n = parseInt(row.sample_size, 10) || 0;
    const rate: ClientBriefingRates = {
      platform: row.platform,
      avg_save_rate:        parseFloat(row.avg_save_rate ?? '0') || 0,
      avg_click_proxy_rate: parseFloat(row.avg_click_proxy_rate ?? '0') || 0,
      avg_engagement_rate:  parseFloat(row.avg_engagement_rate ?? '0') || 0,
      sample_size: n,
    };
    platform_rates[row.platform.toLowerCase()] = rate;
    totalSampleSize += n;
    sumSave       += rate.avg_save_rate * n;
    sumClick      += rate.avg_click_proxy_rate * n;
    sumEngagement += rate.avg_engagement_rate * n;
    sumCount      += n;
  }

  const overall: ClientBriefingRates | null = sumCount > 0 ? {
    platform: 'all',
    avg_save_rate:        sumSave / sumCount,
    avg_click_proxy_rate: sumClick / sumCount,
    avg_engagement_rate:  sumEngagement / sumCount,
    sample_size: totalSampleSize,
  } : null;

  return {
    platform_rates,
    overall,
    has_sufficient_data: totalSampleSize >= 5,
  };
}

/**
 * Blend cluster base rates with briefing_post_metrics rates.
 * Weighted mix: if enough briefing data, weight more towards real data.
 */
export function blendRates(
  clusterSaveRate: number,
  clusterClickRate: number,
  clusterEngRate: number,
  briefingRates: ClientBriefingRates | null,
): { save: number; click: number; engagement: number; source: 'blended' | 'cluster_only' } {
  if (!briefingRates || briefingRates.sample_size < 5) {
    return { save: clusterSaveRate, click: clusterClickRate, engagement: clusterEngRate, source: 'cluster_only' };
  }

  // More briefing samples = higher weight on real data (up to 70%)
  const briefingWeight = Math.min(0.70, 0.40 + (briefingRates.sample_size - 5) * 0.015);
  const clusterWeight = 1 - briefingWeight;

  return {
    save:       clusterSaveRate * clusterWeight + briefingRates.avg_save_rate * briefingWeight,
    click:      clusterClickRate * clusterWeight + briefingRates.avg_click_proxy_rate * briefingWeight,
    engagement: clusterEngRate * clusterWeight + briefingRates.avg_engagement_rate * briefingWeight,
    source: 'blended',
  };
}
