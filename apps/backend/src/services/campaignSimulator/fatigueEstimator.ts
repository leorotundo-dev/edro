/**
 * Fatigue Estimator
 *
 * Estima quantos dias até o engajamento cair para um dado formato/AMD/plataforma.
 * Usa três fontes de dados em ordem de precisão:
 *
 *  1. format_performance_metrics (Meta Ads API) — série temporal por post
 *  2. reportei_metric_snapshots 7d/30d — tendência real de engajamento do cliente
 *  3. Benchmarks do setor por AMD × plataforma (último recurso)
 *
 * Lógica Reportei:
 *   - Compara taxa de engajamento (7d vs 30d) para detectar se o conteúdo já está
 *     fadingando ou crescendo no perfil do cliente.
 *   - Se delta_pct disponível: dias = 25 / (|delta_pct| / janela_dias)
 *   - Se apenas valores sem delta: ratio 7d/30d → fator multiplicador no benchmark
 */

import { query } from '../../db';

// ── Benchmarks de fadiga por AMD × plataforma (dias) ─────────────────────────

const FATIGUE_BENCHMARKS: Record<string, Record<string, number>> = {
  salvar: {
    instagram: 21, linkedin: 18, tiktok: 14, twitter: 10, facebook: 16, default: 18,
  },
  compartilhar: {
    instagram: 14, linkedin: 21, tiktok: 10, twitter: 12, facebook: 14, default: 14,
  },
  clicar: {
    instagram: 10, linkedin: 14, tiktok: 8, twitter: 8, facebook: 10, default: 10,
  },
  responder: {
    instagram: 7, linkedin: 10, tiktok: 7, twitter: 6, facebook: 8, default: 8,
  },
  pedir_proposta: {
    instagram: 14, linkedin: 21, tiktok: 10, twitter: 10, facebook: 14, default: 14,
  },
  default: {
    instagram: 14, linkedin: 18, tiktok: 10, twitter: 10, facebook: 14, default: 14,
  },
};

function getBenchmark(amd: string | undefined, platform: string | undefined): number {
  const amdKey = amd?.toLowerCase() ?? 'default';
  const platKey = platform?.toLowerCase() ?? 'default';
  const amdMap = FATIGUE_BENCHMARKS[amdKey] ?? FATIGUE_BENCHMARKS['default'];
  return amdMap[platKey] ?? amdMap['default'] ?? 14;
}

// ── Fonte 1: format_performance_metrics (Meta Ads) ───────────────────────────

interface HistoricalFatigue {
  days_until_25pct_drop: number | null;
  sample_size: number;
}

async function loadHistoricalFatigue(
  clientId: string,
  tenantId: string,
  amd: string | undefined,
  platform: string | undefined,
): Promise<HistoricalFatigue> {
  const res = await query<any>(
    `SELECT
       cf.id as format_id,
       cf.platform,
       bi_amd.amd,
       fpm.recorded_at,
       fpm.total_saves + fpm.total_clicks + fpm.total_likes + fpm.total_comments as total_eng,
       fpm.total_impressions as imp
     FROM campaign_formats cf
     JOIN campaigns c ON c.id = cf.campaign_id
     JOIN format_performance_metrics fpm ON fpm.campaign_format_id = cf.id
     LEFT JOIN LATERAL (
       SELECT bi->>'amd' as amd
       FROM jsonb_array_elements(COALESCE(c.behavior_intents, '[]'::jsonb)) bi
       LIMIT 1
     ) bi_amd ON true
     WHERE c.tenant_id = $1
       AND ($2::text IS NULL OR c.client_id::text = $2)
       AND ($3::text IS NULL OR cf.platform ILIKE $3)
       AND ($4::text IS NULL OR bi_amd.amd = $4)
     ORDER BY cf.id, fpm.recorded_at ASC
     LIMIT 200`,
    [tenantId, clientId || null, platform || null, amd || null],
  );

  if (res.rows.length < 6) return { days_until_25pct_drop: null, sample_size: 0 };

  const byFormat: Record<string, { eng_rate: number }[]> = {};
  for (const row of res.rows) {
    const rate = row.imp > 0 ? row.total_eng / row.imp : 0;
    if (!byFormat[row.format_id]) byFormat[row.format_id] = [];
    byFormat[row.format_id].push({ eng_rate: rate });
  }

  const fatiguePerFormat: number[] = [];
  for (const rows of Object.values(byFormat)) {
    if (rows.length < 3) continue;
    const peak = Math.max(...rows.map((r) => r.eng_rate));
    if (peak <= 0) continue;
    const threshold = peak * 0.75;
    const dropIdx = rows.findIndex((r) => r.eng_rate < threshold);
    if (dropIdx > 0) {
      fatiguePerFormat.push(dropIdx * 3); // ~3 dias por data-point
    }
  }

  if (!fatiguePerFormat.length) return { days_until_25pct_drop: null, sample_size: res.rows.length };

  const avg = fatiguePerFormat.reduce((s, v) => s + v, 0) / fatiguePerFormat.length;
  return { days_until_25pct_drop: Math.round(avg), sample_size: fatiguePerFormat.length };
}

// ── Fonte 2: reportei_metric_snapshots ───────────────────────────────────────

// Mapeia plataforma do simulador → nome da plataforma no reportei_metric_snapshots
const PLATFORM_TO_REPORTEI: Record<string, string> = {
  instagram:       'Instagram',
  instagram_feed:  'Instagram',
  instagram_reels: 'Instagram',
  instagram_stories: 'Instagram',
  linkedin:        'LinkedIn',
  facebook:        'MetaAds',
};

// Métrica de engagement_rate preferida por plataforma Reportei
const REPORTEI_ENGAGEMENT_KEY: Record<string, string> = {
  Instagram: 'ig:feed_engagement_rate',
  LinkedIn:  'li:engagement_rate',
};

interface ReporteiTrend {
  fatigue_days: number | null;
  engagement_7d: number | null;
  engagement_30d: number | null;
  delta_pct_30d: number | null; // % vs período anterior de 30d
}

async function loadReporteiTrend(
  clientId: string,
  tenantId: string,
  platform: string | undefined,
): Promise<ReporteiTrend> {
  const reporteiPlatform = PLATFORM_TO_REPORTEI[platform?.toLowerCase() ?? ''];
  if (!reporteiPlatform) return { fatigue_days: null, engagement_7d: null, engagement_30d: null, delta_pct_30d: null };

  const metricKey = REPORTEI_ENGAGEMENT_KEY[reporteiPlatform];
  if (!metricKey) return { fatigue_days: null, engagement_7d: null, engagement_30d: null, delta_pct_30d: null };

  const res = await query<{
    time_window: string;
    metrics: Record<string, { value: number | null; delta_pct?: number | null }>;
  }>(
    `SELECT DISTINCT ON (time_window)
       time_window,
       metrics
     FROM reportei_metric_snapshots
     WHERE client_id = $1
       AND tenant_id = $2
       AND platform = $3
       AND time_window IN ('7d', '30d')
     ORDER BY time_window, synced_at DESC`,
    [clientId, tenantId, reporteiPlatform],
  );

  if (!res.rows.length) return { fatigue_days: null, engagement_7d: null, engagement_30d: null, delta_pct_30d: null };

  const snap7d  = res.rows.find(r => r.time_window === '7d');
  const snap30d = res.rows.find(r => r.time_window === '30d');

  const eng7d  = snap7d?.metrics?.[metricKey]?.value ?? null;
  const eng30d = snap30d?.metrics?.[metricKey]?.value ?? null;
  const delta30d = snap30d?.metrics?.[metricKey]?.delta_pct ?? null;

  // ── Derivar dias de fadiga ────────────────────────────────────────────────
  // Estratégia A: usar delta_pct do snapshot 30d
  // delta_pct = queda percentual vs período anterior de 30d
  // Se delta_pct = -20%: engajamento caiu 20% em 30 dias
  // Projeção: dias até queda de 25% = 25 / (20/30) = 37.5 dias
  if (delta30d !== null && delta30d < -1) {
    const ratePerDay = Math.abs(delta30d) / 30;
    if (ratePerDay > 0) {
      const projected = Math.round(25 / ratePerDay);
      return { fatigue_days: projected, engagement_7d: eng7d, engagement_30d: eng30d, delta_pct_30d: delta30d };
    }
  }

  // Estratégia B: comparar 7d vs 30d para extrair velocidade de queda
  if (eng7d !== null && eng30d !== null && eng30d > 0) {
    const ratio = eng7d / eng30d; // < 1 = fadiga, > 1 = crescimento
    // Estima velocidade de queda: se ratio = 0.85 (15% queda em ~23d), projetar para 25%
    if (ratio < 0.99) {
      const dropPct = (1 - ratio) * 100;
      const daysBetween = 23; // aprox metade entre 7d e 30d
      const ratePerDay = dropPct / daysBetween;
      if (ratePerDay > 0) {
        const projected = Math.round(25 / ratePerDay);
        return { fatigue_days: projected, engagement_7d: eng7d, engagement_30d: eng30d, delta_pct_30d: null };
      }
    }
    // Estratégia C: ratio como fator multiplicador no benchmark (sem dias projetados, retorna null)
    return { fatigue_days: null, engagement_7d: eng7d, engagement_30d: eng30d, delta_pct_30d: null };
  }

  return { fatigue_days: null, engagement_7d: eng7d, engagement_30d: eng30d, delta_pct_30d: null };
}

// ── Ratio Reportei → multiplicador de benchmark ───────────────────────────────

function ratioToMultiplier(eng7d: number | null, eng30d: number | null): number {
  if (eng7d === null || eng30d === null || eng30d <= 0) return 1.0;
  const ratio = eng7d / eng30d;
  if (ratio < 0.5) return 0.50; // engajamento caindo muito → fatiga rápida
  if (ratio < 0.70) return 0.65;
  if (ratio < 0.85) return 0.80;
  if (ratio < 0.95) return 0.90;
  if (ratio < 1.10) return 1.00;
  if (ratio < 1.25) return 1.15;
  return 1.25; // engajamento crescendo → fadiga mais lenta
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface FatigueResult {
  fatigue_days: number;
  source: 'historical' | 'reportei' | 'benchmark';
  sample_size: number;
  // Reportei context
  engagement_7d?: number | null;
  engagement_30d?: number | null;
  engagement_delta_pct?: number | null;
}

export async function estimateFatiguedays(
  clientId: string,
  tenantId: string,
  amd: string | undefined,
  platform: string | undefined,
): Promise<FatigueResult> {
  // Fonte 1: format_performance_metrics (Meta Ads API)
  const historical = await loadHistoricalFatigue(clientId, tenantId, amd, platform);
  if (historical.days_until_25pct_drop !== null && historical.sample_size >= 3) {
    return {
      fatigue_days: historical.days_until_25pct_drop,
      source: 'historical',
      sample_size: historical.sample_size,
    };
  }

  // Fonte 2: Reportei engagement trend
  const reportei = await loadReporteiTrend(clientId, tenantId, platform).catch(() => ({
    fatigue_days: null, engagement_7d: null, engagement_30d: null, delta_pct_30d: null,
  }));

  const benchmark = getBenchmark(amd, platform);

  if (reportei.fatigue_days !== null) {
    // Projeção baseada em dados reais do Reportei — clampar entre 30% e 250% do benchmark
    const clamped = Math.round(
      Math.max(benchmark * 0.30, Math.min(benchmark * 2.5, reportei.fatigue_days)),
    );
    return {
      fatigue_days: clamped,
      source: 'reportei',
      sample_size: 0,
      engagement_7d: reportei.engagement_7d,
      engagement_30d: reportei.engagement_30d,
      engagement_delta_pct: reportei.delta_pct_30d,
    };
  }

  // Reportei tem valores mas sem delta suficiente → aplica multiplicador ao benchmark
  if (reportei.engagement_7d !== null || reportei.engagement_30d !== null) {
    const multiplier = ratioToMultiplier(reportei.engagement_7d, reportei.engagement_30d);
    if (multiplier !== 1.0) {
      return {
        fatigue_days: Math.round(benchmark * multiplier),
        source: 'reportei',
        sample_size: 0,
        engagement_7d: reportei.engagement_7d,
        engagement_30d: reportei.engagement_30d,
        engagement_delta_pct: null,
      };
    }
  }

  // Fonte 3: benchmark puro
  return {
    fatigue_days: benchmark,
    source: 'benchmark',
    sample_size: 0,
  };
}
