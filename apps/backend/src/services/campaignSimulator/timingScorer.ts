/**
 * Timing Scorer
 *
 * Consulta posting_time_analytics para identificar os melhores horários/dias
 * de publicação por cliente × plataforma.
 *
 * Retorna:
 *  - best_slot_label: "Ter 19h" — melhor slot histórico de engajamento
 *  - peak_multiplier: quanto o melhor slot supera a média (ex: 1.23 = +23%)
 *  - scheduled_multiplier: se um horário específico for informado, calcula
 *    o fator daquele slot vs a média
 *
 * Fonte: posting_time_analytics (day_of_week 0=Sunday, hour 0-23)
 */

import { query } from '../../db';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface TimingContext {
  has_data: boolean;
  best_day: number | null;           // 0=Sunday
  best_hour: number | null;          // 0–23
  best_day_label: string | null;     // "Ter"
  best_slot_label: string | null;    // "Ter 19h"
  peak_multiplier: number;           // how much better peak is vs avg (1.0 = no data)
  scheduled_multiplier: number;      // multiplier for a specific scheduled_at (1.0 = none)
  sample_size: number;
}

export async function getTimingContext(
  clientId: string,
  tenantId: string,
  platform?: string,
  scheduledAt?: Date,
): Promise<TimingContext> {
  const empty: TimingContext = {
    has_data: false,
    best_day: null,
    best_hour: null,
    best_day_label: null,
    best_slot_label: null,
    peak_multiplier: 1.0,
    scheduled_multiplier: 1.0,
    sample_size: 0,
  };

  const res = await query<{
    day_of_week: string;
    hour: string;
    avg_engagement: string;
    sample_size: string;
  }>(
    `SELECT day_of_week, hour, avg_engagement::text, sample_size
     FROM posting_time_analytics
     WHERE tenant_id::text = $1
       AND client_id = $2
       AND ($3::text IS NULL OR platform ILIKE $3)
       AND sample_size >= 3
     ORDER BY avg_engagement DESC
     LIMIT 100`,
    [tenantId, clientId, platform ?? null],
  ).catch(() => ({ rows: [] as any[] }));

  if (!res.rows.length) return empty;

  // Weighted average engagement across all slots
  let totalWeight = 0;
  let weightedSum = 0;
  for (const r of res.rows) {
    const n = parseInt(r.sample_size, 10);
    const eng = parseFloat(r.avg_engagement);
    totalWeight += n;
    weightedSum += eng * n;
  }
  const avgEngagement = totalWeight > 0 ? weightedSum / totalWeight : 0;

  const best = res.rows[0];
  const bestDay = parseInt(best.day_of_week, 10);
  const bestHour = parseInt(best.hour, 10);
  const peakEngagement = parseFloat(best.avg_engagement);
  const peakMultiplier = avgEngagement > 0
    ? Math.min(2.5, Math.round((peakEngagement / avgEngagement) * 100) / 100)
    : 1.0;

  const dayLabel = DAY_LABELS[bestDay] ?? 'Seg';
  const slotLabel = `${dayLabel} ${bestHour}h`;

  // Multiplier for a specific scheduled slot
  let scheduledMultiplier = 1.0;
  if (scheduledAt && avgEngagement > 0) {
    const schedDay = scheduledAt.getDay();
    const schedHour = scheduledAt.getHours();
    const match = res.rows.find(
      (r) => parseInt(r.day_of_week, 10) === schedDay && parseInt(r.hour, 10) === schedHour,
    );
    if (match) {
      scheduledMultiplier = Math.min(2.5, parseFloat(match.avg_engagement) / avgEngagement);
    }
  }

  return {
    has_data: true,
    best_day: bestDay,
    best_hour: bestHour,
    best_day_label: dayLabel,
    best_slot_label: slotLabel,
    peak_multiplier: peakMultiplier,
    scheduled_multiplier: scheduledMultiplier,
    sample_size: totalWeight,
  };
}
