/**
 * Content Intelligence Service — FASE 7
 *
 * Correlaciona tópicos de briefings com métricas reais de performance.
 *
 * Responde perguntas como:
 *   - "Quais temas geram mais engajamento neste cliente?"
 *   - "Posts sobre lançamento de produto têm ROAS maior?"
 *   - "Qual o score médio de conteúdo educativo vs comercial?"
 *
 * Dados: edro_briefings + briefing_post_metrics + reportei_metric_snapshots
 */

import { query } from '../db';

/* ─── Types ──────────────────────────────────────────────────── */

export interface TopicPerformance {
  topic: string;
  avg_impressions: number | null;
  avg_engagement_rate: number | null;
  avg_reach: number | null;
  sample_size: number;
  score: number; // 0–100 composite score
}

export interface ContentIntelligenceReport {
  client_id: string;
  platform: string;
  top_topics: TopicPerformance[];
  worst_topics: TopicPerformance[];
  best_format: string | null;
  insight_summary: string;
  generated_at: string;
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function extractTopics(title: string, tags: string[], payload: any): string[] {
  const topics = new Set<string>();

  // Extract from tags
  if (Array.isArray(tags)) tags.forEach((t) => topics.add(t.toLowerCase().trim()));

  // Extract from title keywords
  const titleWords = title.toLowerCase()
    .replace(/[^a-záàãâéèêíîóôõúûç\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4);
  titleWords.slice(0, 3).forEach((w) => topics.add(w));

  // Extract format from payload
  const format = payload?.format || payload?.channel || payload?.tipo;
  if (format) topics.add(String(format).toLowerCase());

  // Extract theme if available
  const theme = payload?.tema || payload?.theme || payload?.categoria;
  if (theme) topics.add(String(theme).toLowerCase());

  return Array.from(topics).filter(Boolean);
}

function compositeScore(
  impressions: number | null,
  engagementRate: number | null,
  reach: number | null,
  sampleSize: number
): number {
  if (sampleSize === 0) return 0;
  let score = 50;

  // Engagement rate is the most important signal (0–10% scale)
  if (engagementRate != null) {
    const engScore = Math.min(engagementRate / 0.05, 1) * 40; // 5% = full 40 pts
    score = engScore + 10;
  }

  // Reach/impressions as secondary (normalized to 100K)
  if (impressions != null) {
    const impScore = Math.min(impressions / 100_000, 1) * 30;
    score += impScore;
  } else if (reach != null) {
    const reachScore = Math.min(reach / 50_000, 1) * 20;
    score += reachScore;
  }

  // Sample size confidence modifier (max +10 for sample >= 10)
  const confMod = Math.min(sampleSize / 10, 1) * 10;
  score += confMod;

  return Math.round(Math.min(score, 100));
}

/* ─── Main ──────────────────────────────────────────────────── */

export async function buildContentIntelligenceReport(
  clientId: string,
  tenantId: string,
  platform = 'Instagram'
): Promise<ContentIntelligenceReport> {
  // 1. Fetch briefings with their post metrics
  const { rows: briefings } = await query<any>(
    `SELECT b.id, b.title, b.tags, b.payload,
            m.impressions, m.reach, m.engagement, m.engagement_rate,
            m.platform AS metric_platform, m.collected_at
     FROM edro_briefings b
     LEFT JOIN briefing_post_metrics m ON m.briefing_id = b.id
     WHERE b.client_id = $1
       AND b.status IN ('delivered', 'published', 'archived')
       AND (m.platform = $2 OR m.platform IS NULL)
     ORDER BY b.created_at DESC
     LIMIT 200`,
    [clientId, platform]
  ).catch(() => ({ rows: [] }));

  if (!briefings.length) {
    return {
      client_id: clientId,
      platform,
      top_topics: [],
      worst_topics: [],
      best_format: null,
      insight_summary: 'Sem briefings entregues com métricas disponíveis.',
      generated_at: new Date().toISOString(),
    };
  }

  // 2. Aggregate metrics by topic
  const topicData: Record<string, {
    impressions: number[];
    engagement_rate: number[];
    reach: number[];
    formats: string[];
  }> = {};

  for (const b of briefings) {
    const topics = extractTopics(b.title ?? '', b.tags ?? [], b.payload ?? {});
    for (const topic of topics) {
      if (!topicData[topic]) topicData[topic] = { impressions: [], engagement_rate: [], reach: [], formats: [] };
      if (b.impressions != null) topicData[topic].impressions.push(Number(b.impressions));
      if (b.engagement_rate != null) topicData[topic].engagement_rate.push(Number(b.engagement_rate));
      if (b.reach != null) topicData[topic].reach.push(Number(b.reach));
      const fmt = b.payload?.format || b.payload?.channel;
      if (fmt) topicData[topic].formats.push(String(fmt));
    }
  }

  // 3. Compute per-topic stats (only topics with >= 2 data points)
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const topicPerformance: TopicPerformance[] = Object.entries(topicData)
    .filter(([, d]) => d.impressions.length + d.engagement_rate.length >= 2)
    .map(([topic, d]) => {
      const avgImp = avg(d.impressions);
      const avgEng = avg(d.engagement_rate);
      const avgRch = avg(d.reach);
      const sampleSize = Math.max(d.impressions.length, d.engagement_rate.length, 1);
      return {
        topic,
        avg_impressions: avgImp != null ? Math.round(avgImp) : null,
        avg_engagement_rate: avgEng != null ? Math.round(avgEng * 10000) / 10000 : null,
        avg_reach: avgRch != null ? Math.round(avgRch) : null,
        sample_size: sampleSize,
        score: compositeScore(avgImp, avgEng, avgRch, sampleSize),
      };
    })
    .sort((a, b) => b.score - a.score);

  // 4. Best format from top briefings
  const formatCount: Record<string, number> = {};
  for (const b of briefings.slice(0, 20)) {
    const fmt = b.payload?.format || b.payload?.channel;
    if (fmt) formatCount[fmt] = (formatCount[fmt] ?? 0) + 1;
  }
  const bestFormat = Object.entries(formatCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // 5. Generate summary
  const top3 = topicPerformance.slice(0, 3);
  const worst3 = topicPerformance.slice(-3).reverse();

  let summary = '';
  if (top3.length) {
    const topLabels = top3.map((t) => `"${t.topic}" (score ${t.score})`).join(', ');
    summary += `Temas com melhor performance: ${topLabels}. `;
  }
  if (worst3.length && worst3[0].score < 40) {
    const worstLabels = worst3.map((t) => `"${t.topic}"`).join(', ');
    summary += `Temas com baixa performance: ${worstLabels}. `;
  }
  if (bestFormat) {
    summary += `Formato com maior frequência nos top conteúdos: ${bestFormat}.`;
  }
  if (!summary) summary = 'Dados insuficientes para análise de tópicos.';

  // 6. Persist insights to learned_insights (non-blocking)
  if (top3.length) {
    const payload = {
      platform,
      window: 'all_time',
      trend: 'stable',
      summary,
      content_intelligence: { top_topics: top3, best_format: bestFormat },
      by_format: top3.map((t) => ({
        format: t.topic,
        score: t.score,
        kpis: [
          { metric: 'impressions', value: t.avg_impressions },
          { metric: 'engagement_rate', value: t.avg_engagement_rate },
        ],
        notes: [],
      })),
      by_tag: [],
      observed_at: new Date().toISOString(),
      source: 'content_intelligence',
    };
    query(
      `INSERT INTO learned_insights (tenant_id, client_id, platform, time_window, payload)
       VALUES ($1,$2,$3,'all_time',$4::jsonb)`,
      [tenantId, clientId, platform, JSON.stringify(payload)]
    ).catch(() => {});
  }

  return {
    client_id: clientId,
    platform,
    top_topics: topicPerformance.slice(0, 10),
    worst_topics: topicPerformance.slice(-5).reverse(),
    best_format: bestFormat,
    insight_summary: summary,
    generated_at: new Date().toISOString(),
  };
}
