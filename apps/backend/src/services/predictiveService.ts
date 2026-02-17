import { query } from '../db';

// ── Types ──────────────────────────────────────────────────────────

export type PostingTimeSlot = {
  platform: string;
  day_of_week: number;
  hour: number;
  avg_engagement: number;
  avg_reach: number;
  sample_size: number;
};

export type ContentMixRecommendation = {
  format: string;
  platform: string;
  recommended_pct: number;
  current_pct: number;
  avg_score: number;
};

export type PredictiveInsights = {
  best_posting_times: PostingTimeSlot[];
  content_mix: ContentMixRecommendation[];
  engagement_prediction: number | null;
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

// ── Best Posting Times ─────────────────────────────────────────────

export async function analyzeBestPostingTimes(params: {
  tenant_id: string;
  client_id: string;
}): Promise<PostingTimeSlot[]> {
  // Aggregate from learned_insights performance data by time patterns
  const { rows: insights } = await query<any>(
    `SELECT platform, payload, created_at
     FROM learned_insights
     WHERE tenant_id = $1
       AND created_at > NOW() - INTERVAL '90 days'
     ORDER BY created_at DESC
     LIMIT 30`,
    [params.tenant_id],
  );

  // Aggregate from copy version creation patterns + scores
  const { rows: copyPatterns } = await query<any>(
    `SELECT
       EXTRACT(DOW FROM ecv.created_at) AS day_of_week,
       EXTRACT(HOUR FROM ecv.created_at) AS hour,
       eb.payload->>'platform' AS platform,
       AVG(ecv.score) AS avg_score,
       COUNT(*) AS sample_size
     FROM edro_copy_versions ecv
     JOIN edro_briefings eb ON eb.id = ecv.briefing_id
     WHERE ecv.score IS NOT NULL
       AND ecv.created_at > NOW() - INTERVAL '180 days'
     GROUP BY day_of_week, hour, platform
     HAVING COUNT(*) >= 2
     ORDER BY avg_score DESC`,
    [],
  );

  // Build time slot map from both sources
  const slotMap = new Map<string, PostingTimeSlot>();

  // From Reportei insights: extract any time-based data
  for (const row of insights) {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    const byFormat = Array.isArray(payload?.by_format) ? payload.by_format : [];
    for (const fmt of byFormat) {
      if (fmt.score && fmt.score > 50) {
        // Use insight creation time as a proxy for best time
        const d = new Date(row.created_at);
        const key = `${row.platform}:${d.getDay()}:${d.getHours()}`;
        const existing = slotMap.get(key);
        slotMap.set(key, {
          platform: row.platform,
          day_of_week: d.getDay(),
          hour: d.getHours(),
          avg_engagement: existing ? (existing.avg_engagement + fmt.score) / 2 : fmt.score,
          avg_reach: existing?.avg_reach || 0,
          sample_size: (existing?.sample_size || 0) + 1,
        });
      }
    }
  }

  // From copy patterns: use score as engagement proxy
  for (const row of copyPatterns) {
    const platform = row.platform || 'unknown';
    const key = `${platform}:${row.day_of_week}:${row.hour}`;
    const existing = slotMap.get(key);
    const engScore = Number(row.avg_score) * 20; // scale 1-5 → 20-100
    slotMap.set(key, {
      platform,
      day_of_week: Number(row.day_of_week),
      hour: Number(row.hour),
      avg_engagement: existing ? (existing.avg_engagement + engScore) / 2 : engScore,
      avg_reach: existing?.avg_reach || 0,
      sample_size: (existing?.sample_size || 0) + Number(row.sample_size),
    });
  }

  const slots = Array.from(slotMap.values())
    .sort((a, b) => b.avg_engagement - a.avg_engagement)
    .slice(0, 20);

  // Upsert to posting_time_analytics
  for (const slot of slots) {
    await query(
      `INSERT INTO posting_time_analytics (tenant_id, client_id, platform, day_of_week, hour, avg_engagement, avg_reach, sample_size, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (tenant_id, client_id, platform, day_of_week, hour)
       DO UPDATE SET avg_engagement = $6, avg_reach = $7, sample_size = $8, updated_at = NOW()`,
      [params.tenant_id, params.client_id, slot.platform, slot.day_of_week, slot.hour, slot.avg_engagement, slot.avg_reach, slot.sample_size],
    );
  }

  return slots;
}

// ── Content Mix Recommendations ────────────────────────────────────

export async function recommendContentMix(params: {
  tenant_id: string;
  client_id: string;
}): Promise<ContentMixRecommendation[]> {
  // Analyze current format distribution vs performance
  const { rows: formatStats } = await query<any>(
    `SELECT
       eb.payload->>'format' AS format,
       eb.payload->>'platform' AS platform,
       COUNT(*) AS total,
       AVG(ecv.score) AS avg_score,
       COUNT(CASE WHEN ecv.status = 'approved' THEN 1 END) AS approved_count
     FROM edro_copy_versions ecv
     JOIN edro_briefings eb ON eb.id = ecv.briefing_id
     WHERE eb.client_id = $1
       AND ecv.created_at > NOW() - INTERVAL '180 days'
     GROUP BY format, platform
     ORDER BY avg_score DESC NULLS LAST`,
    [params.client_id],
  );

  if (!formatStats.length) return [];

  const totalCopies = formatStats.reduce((s: number, r: any) => s + Number(r.total), 0);

  const recommendations: ContentMixRecommendation[] = formatStats
    .filter((r: any) => r.format)
    .map((r: any) => {
      const currentPct = (Number(r.total) / totalCopies) * 100;
      const avgScore = Number(r.avg_score) || 0;
      // High score formats should get more allocation
      const idealPct = avgScore >= 4 ? Math.min(currentPct * 1.5, 40) :
                       avgScore >= 3 ? currentPct :
                       Math.max(currentPct * 0.6, 5);
      return {
        format: r.format,
        platform: r.platform || 'multi',
        recommended_pct: Math.round(idealPct * 10) / 10,
        current_pct: Math.round(currentPct * 10) / 10,
        avg_score: Math.round(avgScore * 100) / 100,
      };
    });

  // Normalize recommended percentages to sum to 100
  const totalRec = recommendations.reduce((s, r) => s + r.recommended_pct, 0);
  if (totalRec > 0) {
    for (const r of recommendations) {
      r.recommended_pct = Math.round((r.recommended_pct / totalRec) * 1000) / 10;
    }
  }

  // Store recommendation
  const mix = {
    recommendations,
    generated_at: new Date().toISOString(),
    total_copies_analyzed: totalCopies,
  };
  const perfScore = recommendations.length > 0
    ? recommendations.reduce((s, r) => s + r.avg_score, 0) / recommendations.length
    : 0;

  await query(
    `INSERT INTO content_mix_recommendations (tenant_id, client_id, period, recommended_mix, performance_score)
     VALUES ($1, $2, 'monthly', $3, $4)
     ON CONFLICT (tenant_id, client_id, period)
     DO UPDATE SET recommended_mix = $3, performance_score = $4, created_at = NOW()`,
    [params.tenant_id, params.client_id, JSON.stringify(mix), perfScore],
  );

  return recommendations;
}

// ── Engagement Prediction ──────────────────────────────────────────

export async function predictEngagement(params: {
  client_id: string;
  platform: string;
  format: string;
  day_of_week?: number;
  hour?: number;
}): Promise<number | null> {
  // Simple prediction based on historical averages
  const { rows } = await query<any>(
    `SELECT AVG(ecv.score) AS avg_score, COUNT(*) AS samples
     FROM edro_copy_versions ecv
     JOIN edro_briefings eb ON eb.id = ecv.briefing_id
     WHERE eb.client_id = $1
       AND eb.payload->>'platform' = $2
       AND eb.payload->>'format' = $3
       AND ecv.score IS NOT NULL
       AND ecv.created_at > NOW() - INTERVAL '180 days'`,
    [params.client_id, params.platform, params.format],
  );

  if (!rows[0] || Number(rows[0].samples) < 3) return null;
  return Math.round(Number(rows[0].avg_score) * 20); // Scale 1-5 → 20-100
}

// ── Full Predictive Insights ───────────────────────────────────────

export async function buildPredictiveInsights(params: {
  tenant_id: string;
  client_id: string;
}): Promise<PredictiveInsights> {
  const [bestTimes, contentMix] = await Promise.all([
    analyzeBestPostingTimes(params),
    recommendContentMix(params),
  ]);

  return {
    best_posting_times: bestTimes,
    content_mix: contentMix,
    engagement_prediction: null,
  };
}

// ── Format helpers for dashboard ───────────────────────────────────

export function formatTimeSlot(slot: PostingTimeSlot): string {
  return `${DAY_NAMES[slot.day_of_week]} ${String(slot.hour).padStart(2, '0')}:00`;
}
