import { query } from '../db';
import { knowledgeBaseProvider } from '../providers/base';
import type { ClientKnowledge } from '../providers/contracts';

export interface BriefingInput {
  objetivo: string;
  publico?: string;
  plataformas?: string[];
  budget?: number;
  keywords?: string[];
}

export interface TrendingTopic {
  topic: string;
  growth: string;
  sentiment: number;
  mentions: number;
  platforms: string[];
}

export interface EnrichedBriefing {
  originalBriefing: BriefingInput;
  enrichedData: {
    trendingTopics: TrendingTopic[];
    emergingKeywords: string[];
    marketSentiment: {
      positive: number;
      negative: number;
      neutral: number;
    };
    opportunities: string[];
    risks: string[];
  };
}

const STOPWORDS = new Set([
  'o', 'a', 'de', 'da', 'do', 'em', 'para', 'com', 'por', 'uma', 'um',
  'os', 'as', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'ao', 'a',
  'e', 'eh', 'que', 'se', 'ou', 'mas', 'como', 'mais', 'muito',
]);

function normalizeKeywords(input?: string[]) {
  if (!input) return [];
  return Array.from(new Set(input.map((k) => k.trim()).filter(Boolean)));
}

function mergeClientKeywords(base: string[], knowledge?: ClientKnowledge | null) {
  const merged = new Set<string>(normalizeKeywords(base));
  normalizeKeywords(knowledge?.tags).forEach((tag) => merged.add(tag));
  normalizeKeywords(knowledge?.must_mentions).forEach((tag) => merged.add(tag));
  normalizeKeywords(knowledge?.approved_terms).forEach((tag) => merged.add(tag));
  normalizeKeywords(knowledge?.hashtags?.map((tag) => tag.replace(/^#/, ''))).forEach((tag) => merged.add(tag));
  return Array.from(merged).slice(0, 40);
}

function buildKeywordFilter(keywords: string[], startIndex: number) {
  if (!keywords.length) return { clause: '', params: [], nextIndex: startIndex };
  const clause = `(keyword = ANY($${startIndex}) OR keywords ?| $${startIndex}::text[])`;
  return { clause, params: [keywords], nextIndex: startIndex + 1 };
}

export class TrendEnricher {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async enrichBriefing(briefing: BriefingInput, options?: { clientId?: string }):
    Promise<EnrichedBriefing> {
    const baseKeywords = normalizeKeywords(
      briefing.keywords?.length ? briefing.keywords : this.extractKeywords(briefing.objetivo || '')
    );

    const clientKnowledge = options?.clientId
      ? await knowledgeBaseProvider.getClientKnowledge({
          client_id: options.clientId,
          tenant_id: this.tenantId,
        })
      : null;

    const keywords = mergeClientKeywords(baseKeywords, clientKnowledge);

    const trendingTopics = await this.getTrendingTopics(keywords, options?.clientId);
    const emergingKeywords = await this.getEmergingKeywords(keywords, options?.clientId);
    const marketSentiment = await this.getMarketSentiment(keywords, options?.clientId);
    const opportunities = this.identifyOpportunities(trendingTopics, marketSentiment);
    const risks = this.identifyRisks(trendingTopics, marketSentiment);

    return {
      originalBriefing: briefing,
      enrichedData: {
        trendingTopics,
        emergingKeywords,
        marketSentiment,
        opportunities,
        risks,
      },
    };
  }

  private extractKeywords(objetivo: string): string[] {
    const words = objetivo
      .toLowerCase()
      .replace(/[^\w\s\u00c0-\u017f]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOPWORDS.has(word));
    return Array.from(new Set(words));
  }

  private async getTrendingTopics(keywords: string[], clientId?: string): Promise<TrendingTopic[]> {
    const now = new Date();
    const startCurrent = new Date(now);
    startCurrent.setDate(startCurrent.getDate() - 7);
    const startPrev = new Date(now);
    startPrev.setDate(startPrev.getDate() - 14);

    const where: string[] = ['tenant_id=$1', 'published_at >= $2'];
    const params: any[] = [this.tenantId, startPrev];
    let idx = 3;

    if (clientId) {
      where.push(`(client_id IS NULL OR client_id=$${idx++})`);
      params.push(clientId);
    }

    const keywordFilter = buildKeywordFilter(keywords, idx);
    if (keywordFilter.clause) {
      where.push(keywordFilter.clause);
      params.push(...keywordFilter.params);
      idx = keywordFilter.nextIndex;
    }

    const { rows } = await query<any>(
      `
      SELECT keyword,
             platform,
             COUNT(*) FILTER (WHERE published_at >= $2)::int AS current_count,
             COUNT(*) FILTER (WHERE published_at < $2)::int AS prev_count,
             AVG(sentiment_score) FILTER (WHERE published_at >= $2) AS avg_sentiment
      FROM social_listening_mentions
      WHERE ${where.join(' AND ')}
      GROUP BY keyword, platform
      ORDER BY current_count DESC
      LIMIT 30
      `,
      params
    );

    const aggregated: Record<string, { current: number; prev: number; sentiment: number; platforms: Set<string> }> = {};

    for (const row of rows) {
      const key = String(row.keyword || '').trim();
      if (!key) continue;
      if (!aggregated[key]) {
        aggregated[key] = { current: 0, prev: 0, sentiment: 0, platforms: new Set() };
      }
      const current = Number(row.current_count || 0);
      const prev = Number(row.prev_count || 0);
      const sentiment = Number(row.avg_sentiment || 50) / 100;
      aggregated[key].current += current;
      aggregated[key].prev += prev;
      aggregated[key].sentiment = Math.max(aggregated[key].sentiment, sentiment);
      aggregated[key].platforms.add(String(row.platform || ''));
    }

    const topics: TrendingTopic[] = rows.map((row) => {
      const current = Number(row.current_count || 0);
      const prev = Number(row.prev_count || 0);
      const growth = this.calculateGrowth(current, prev);
      return {
        topic: String(row.keyword || ''),
        growth,
        sentiment: Number(row.avg_sentiment || 50) / 100,
        mentions: current,
        platforms: [String(row.platform || '')],
      };
    });

    const merged = Object.entries(aggregated).map(([topic, data]) => ({
      topic,
      growth: this.calculateGrowth(data.current, data.prev),
      sentiment: data.sentiment,
      mentions: data.current,
      platforms: Array.from(data.platforms).filter(Boolean),
    }));

    merged.sort((a, b) => b.mentions - a.mentions);
    return merged.slice(0, 10).length ? merged.slice(0, 10) : topics.slice(0, 10);
  }

  private calculateGrowth(current: number, prev: number): string {
    if (prev <= 0) {
      if (current <= 0) return '+0%';
      return '+100%';
    }
    const delta = ((current - prev) / prev) * 100;
    const rounded = Math.round(delta);
    return `${rounded >= 0 ? '+' : ''}${rounded}%`;
  }

  private async getEmergingKeywords(keywords: string[], clientId?: string): Promise<string[]> {
    const since = new Date();
    since.setDate(since.getDate() - 2);

    const where: string[] = ['tenant_id=$1', 'published_at >= $2'];
    const params: any[] = [this.tenantId, since];
    let idx = 3;

    if (clientId) {
      where.push(`(client_id IS NULL OR client_id=$${idx++})`);
      params.push(clientId);
    }

    const { rows } = await query<any>(
      `
      SELECT keyword, COUNT(*)::int AS total
      FROM (
        SELECT jsonb_array_elements_text(keywords) AS keyword
        FROM social_listening_mentions
        WHERE ${where.join(' AND ')}
      ) sub
      GROUP BY keyword
      ORDER BY total DESC
      LIMIT 10
      `,
      params
    );

    const normalized = normalizeKeywords(keywords).map((k) => k.toLowerCase());
    return rows
      .map((row) => String(row.keyword || '').trim())
      .filter((key) => key && !normalized.includes(key.toLowerCase()))
      .slice(0, 5);
  }

  private async getMarketSentiment(keywords: string[], clientId?: string) {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const where: string[] = ['tenant_id=$1', 'published_at >= $2'];
    const params: any[] = [this.tenantId, since];
    let idx = 3;

    if (clientId) {
      where.push(`(client_id IS NULL OR client_id=$${idx++})`);
      params.push(clientId);
    }

    const keywordFilter = buildKeywordFilter(keywords, idx);
    if (keywordFilter.clause) {
      where.push(keywordFilter.clause);
      params.push(...keywordFilter.params);
      idx = keywordFilter.nextIndex;
    }

    const { rows } = await query<any>(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE sentiment='positive')::int AS positive,
        COUNT(*) FILTER (WHERE sentiment='negative')::int AS negative,
        COUNT(*) FILTER (WHERE sentiment='neutral')::int AS neutral
      FROM social_listening_mentions
      WHERE ${where.join(' AND ')}
      `,
      params
    );

    const total = Math.max(1, Number(rows[0]?.total || 0));
    return {
      positive: Number(rows[0]?.positive || 0) / total,
      negative: Number(rows[0]?.negative || 0) / total,
      neutral: Number(rows[0]?.neutral || 0) / total,
    };
  }

  private identifyOpportunities(
    trendingTopics: TrendingTopic[],
    marketSentiment: { positive: number; negative: number; neutral: number }
  ) {
    const opportunities: string[] = [];

    if (marketSentiment.positive > 0.7) {
      opportunities.push('Alto sentimento positivo no mercado - momento ideal para campanha');
    }

    trendingTopics.forEach((topic) => {
      if (topic.sentiment > 0.75 && topic.mentions > 100) {
        opportunities.push(
          `Foco em "${topic.topic}" (alta demanda, ${topic.growth} crescimento, ${Math.round(topic.sentiment * 100)}% positivo)`
        );
      }
    });

    const platformCounts: Record<string, number> = {};
    trendingTopics.forEach((topic) => {
      topic.platforms.forEach((platform) => {
        if (!platform) return;
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });
    });

    const dominant = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];
    if (dominant) {
      opportunities.push(`Plataforma dominante: ${dominant[0]} (${dominant[1]} mencoes)`);
    }

    return opportunities;
  }

  private identifyRisks(
    trendingTopics: TrendingTopic[],
    marketSentiment: { positive: number; negative: number; neutral: number }
  ) {
    const risks: string[] = [];

    if (marketSentiment.negative > 0.3) {
      risks.push(
        `Alto sentimento negativo no mercado (${Math.round(marketSentiment.negative * 100)}%) - revisar abordagem`
      );
    }

    trendingTopics.forEach((topic) => {
      if (topic.sentiment < 0.4) {
        risks.push(
          `Evitar foco em "${topic.topic}" (sentimento negativo: ${Math.round(topic.sentiment * 100)}%)`
        );
      }
    });

    return risks;
  }
}
