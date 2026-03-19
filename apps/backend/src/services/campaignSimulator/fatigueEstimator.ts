/**
 * Fatigue Estimator
 *
 * Estima quantos dias até o engajamento cair para um dado formato/AMD/plataforma.
 * Baseado em dados históricos de format_performance_metrics.
 *
 * Lógica:
 *   - Busca posts do mesmo AMD + plataforma para o cliente
 *   - Calcula a taxa de queda de engajamento ao longo dos dias de publicação
 *   - Retorna estimativa de dias até queda >25% (fadiga detectável)
 *
 * Fallback: estimativas baseadas em benchmarks do setor por AMD/plataforma.
 */

import { query } from '../../db';

// ── Benchmarks de fadiga por AMD × plataforma (dias) ─────────────────────────

const FATIGUE_BENCHMARKS: Record<string, Record<string, number>> = {
  salvar: {
    instagram: 21,
    linkedin: 18,
    tiktok: 14,
    twitter: 10,
    facebook: 16,
    default: 18,
  },
  compartilhar: {
    instagram: 14,
    linkedin: 21,
    tiktok: 10,
    twitter: 12,
    facebook: 14,
    default: 14,
  },
  clicar: {
    instagram: 10,
    linkedin: 14,
    tiktok: 8,
    twitter: 8,
    facebook: 10,
    default: 10,
  },
  responder: {
    instagram: 7,
    linkedin: 10,
    tiktok: 7,
    twitter: 6,
    facebook: 8,
    default: 8,
  },
  pedir_proposta: {
    instagram: 14,
    linkedin: 21,
    tiktok: 10,
    twitter: 10,
    facebook: 14,
    default: 14,
  },
  default: {
    instagram: 14,
    linkedin: 18,
    tiktok: 10,
    twitter: 10,
    facebook: 14,
    default: 14,
  },
};

function getBenchmark(amd: string | undefined, platform: string | undefined): number {
  const amdKey = amd?.toLowerCase() ?? 'default';
  const platKey = platform?.toLowerCase() ?? 'default';
  const amdMap = FATIGUE_BENCHMARKS[amdKey] ?? FATIGUE_BENCHMARKS['default'];
  return amdMap[platKey] ?? amdMap['default'] ?? 14;
}

// ── Histórico de fadiga do cliente ────────────────────────────────────────────

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
  // Calcula decaimento de engajamento para posts similares
  // Usa format_performance_metrics agrupados por semana após publicação
  const res = await query<any>(
    `SELECT
       cf.id as format_id,
       cf.platform,
       bi_amd.amd,
       fpm.recorded_at,
       fpm.total_impressions,
       fpm.total_saves + fpm.total_clicks + fpm.total_likes + fpm.total_comments as total_eng,
       fpm.total_impressions as imp
     FROM campaign_formats cf
     JOIN campaigns c ON c.id = cf.campaign_id
     JOIN format_performance_metrics fpm ON fpm.format_id = cf.id
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

  // Group by format and compute engagement rate over time
  const byFormat: Record<string, { eng_rate: number; day_offset: number }[]> = {};
  for (const row of res.rows) {
    const rate = row.imp > 0 ? row.total_eng / row.imp : 0;
    if (!byFormat[row.format_id]) byFormat[row.format_id] = [];
    byFormat[row.format_id].push({ eng_rate: rate, day_offset: 0 });
  }

  // Estimate days until 25% drop from peak
  const fatiguePerFormat: number[] = [];
  for (const rows of Object.values(byFormat)) {
    if (rows.length < 3) continue;
    const peak = Math.max(...rows.map((r) => r.eng_rate));
    if (peak <= 0) continue;
    const threshold = peak * 0.75;
    const dropIdx = rows.findIndex((r) => r.eng_rate < threshold);
    if (dropIdx > 0) {
      // Estimate days: assume one data point per ~3 days on average
      fatiguePerFormat.push(dropIdx * 3);
    }
  }

  if (!fatiguePerFormat.length) return { days_until_25pct_drop: null, sample_size: res.rows.length };

  const avg = fatiguePerFormat.reduce((s, v) => s + v, 0) / fatiguePerFormat.length;
  return {
    days_until_25pct_drop: Math.round(avg),
    sample_size: fatiguePerFormat.length,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function estimateFatiguedays(
  clientId: string,
  tenantId: string,
  amd: string | undefined,
  platform: string | undefined,
): Promise<{ fatigue_days: number; source: 'historical' | 'benchmark'; sample_size: number }> {
  const historical = await loadHistoricalFatigue(clientId, tenantId, amd, platform);

  if (historical.days_until_25pct_drop !== null && historical.sample_size >= 3) {
    return {
      fatigue_days: historical.days_until_25pct_drop,
      source: 'historical',
      sample_size: historical.sample_size,
    };
  }

  return {
    fatigue_days: getBenchmark(amd, platform),
    source: 'benchmark',
    sample_size: 0,
  };
}
