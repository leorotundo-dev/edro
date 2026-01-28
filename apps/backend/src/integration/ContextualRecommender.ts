import { query } from '../db';
import type { Platform } from '../socialListening/types';
import type { ScoredFormat, PerformanceData } from './PerformanceScorer';
import type { EnrichedBriefing } from './TrendEnricher';

export interface SuccessExample {
  url: string;
  platform: string;
  engagement: number;
  sentiment: number;
  whyWorked: string;
  author?: string;
}

export interface ContextualRecommendation {
  formato: string;
  platform: string;
  score: number;
  originalScore: number;
  boost: number;
  justificativa: string;
  insights: {
    trendingAngles: string[];
    successfulExamples: SuccessExample[];
  };
  risks: string[];
  alternatives: Array<{ formato: string; reason: string }>;
  performanceData: PerformanceData;
}

function normalizePlatform(platform: string): Platform {
  const key = platform.toLowerCase();
  if (key.includes('instagram')) return 'instagram';
  if (key.includes('facebook') || key.includes('meta')) return 'facebook';
  if (key.includes('youtube')) return 'youtube';
  if (key.includes('tiktok')) return 'tiktok';
  if (key.includes('reddit')) return 'reddit';
  if (key.includes('linkedin')) return 'linkedin';
  if (key.includes('twitter') || key.includes('x')) return 'twitter';
  return 'twitter';
}

function buildKeywordFilter(keywords: string[], startIndex: number) {
  if (!keywords.length) return { clause: '', params: [], nextIndex: startIndex };
  const clause = `(keyword = ANY($${startIndex}) OR keywords ?| $${startIndex}::text[])`;
  return { clause, params: [keywords], nextIndex: startIndex + 1 };
}

export class ContextualRecommender {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async generateRecommendations(
    scoredFormats: ScoredFormat[],
    enrichedBriefing: EnrichedBriefing,
    options?: { clientId?: string }
  ): Promise<ContextualRecommendation[]> {
    const recommendations: ContextualRecommendation[] = [];

    for (const format of scoredFormats.slice(0, 10)) {
      const recommendation = await this.buildRecommendation(format, enrichedBriefing, options?.clientId);
      recommendations.push(recommendation);
    }

    return recommendations;
  }

  private async buildRecommendation(
    format: ScoredFormat,
    enrichedBriefing: EnrichedBriefing,
    clientId?: string
  ): Promise<ContextualRecommendation> {
    const justificativa = this.generateJustification(format, enrichedBriefing);
    const trendingAngles = this.generateTrendingAngles(enrichedBriefing);
    const successfulExamples = await this.getSuccessfulExamples(
      format.platform,
      enrichedBriefing.originalBriefing.keywords || [],
      clientId
    );
    const risks = this.identifyRisks(format, enrichedBriefing);
    const alternatives = this.suggestAlternatives(format, enrichedBriefing);

    return {
      formato: format.name,
      platform: format.platform,
      score: format.finalScore,
      originalScore: format.originalScore,
      boost: format.boost,
      justificativa,
      insights: {
        trendingAngles,
        successfulExamples,
      },
      risks,
      alternatives,
      performanceData: format.performanceData,
    };
  }

  private generateJustification(format: ScoredFormat, enrichedBriefing: EnrichedBriefing): string {
    const parts: string[] = [];

    const sentiment = format.performanceData.sentiment;
    if (sentiment > 0.7) {
      parts.push(`Formato com ${Math.round(sentiment * 100)}% de sentimento positivo em campanhas similares`);
    } else if (sentiment < 0.4) {
      parts.push(`Atencao: sentimento abaixo da media (${Math.round(sentiment * 100)}%) em campanhas similares`);
    }

    const engagement = format.performanceData.engagementRate;
    if (engagement > 0.05) {
      const percentAboveAvg = Math.round(((engagement - 0.03) / 0.03) * 100);
      parts.push(`Engajamento ${percentAboveAvg}% acima da media do segmento`);
    }

    const virality = format.performanceData.virality;
    if (virality > 0.6) {
      parts.push('Alto potencial de viralizacao');
    }

    const alignedTopics = enrichedBriefing.enrichedData.trendingTopics.filter((topic) => topic.sentiment > 0.7);
    if (alignedTopics.length) {
      parts.push(`Alinhado com tendencias em alta: ${alignedTopics.map((t) => t.topic).join(', ')}`);
    }

    if (format.performanceData.sampleSize < 20) {
      parts.push(`Nota: Baseado em ${format.performanceData.sampleSize} amostras (confianca moderada)`);
    }

    return parts.length ? `${parts.join('. ')}.` : 'Recomendacao baseada em dados recentes de performance.';
  }

  private generateTrendingAngles(enrichedBriefing: EnrichedBriefing): string[] {
    const angles: string[] = [];

    enrichedBriefing.enrichedData.trendingTopics.forEach((topic) => {
      if (topic.sentiment > 0.7) {
        angles.push(`Foco em "${topic.topic}" (${topic.growth} crescimento, alta aceitacao)`);
      }
    });

    const keywords = enrichedBriefing.enrichedData.emergingKeywords;
    if (keywords.length > 0) {
      angles.push(`Incorporar keywords em alta: ${keywords.slice(0, 3).join(', ')}`);
    }

    enrichedBriefing.enrichedData.opportunities.forEach((opp) => angles.push(opp));

    if (!angles.length) {
      angles.push('Mostrar resultados reais com dados concretos');
      angles.push('Usar depoimentos e casos de sucesso');
      angles.push('Destacar diferenciais competitivos');
    }

    return angles.slice(0, 5);
  }

  private async getSuccessfulExamples(platform: string, keywords: string[], clientId?: string): Promise<SuccessExample[]> {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const dbPlatform = normalizePlatform(platform);

    const where: string[] = ['tenant_id=$1', 'platform=$2', "sentiment='positive'", 'published_at >= $3'];
    const params: any[] = [this.tenantId, dbPlatform, since];
    let idx = 4;

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

    params.push(5);

    const { rows } = await query<any>(
      `
      SELECT *,
             (engagement_likes + engagement_comments + engagement_shares) AS engagement_total
      FROM social_listening_mentions
      WHERE ${where.join(' AND ')}
      ORDER BY engagement_total DESC
      LIMIT $${idx}
      `,
      params
    );

    return rows.map((mention) => {
      const totalEngagement =
        Number(mention.engagement_likes || 0) +
        Number(mention.engagement_comments || 0) +
        Number(mention.engagement_shares || 0);
      const reach = Number(mention.engagement_views || 0) || Number(mention.author_followers || 0) || 1000;
      const engagementRate = totalEngagement / reach;

      return {
        url: mention.url || '',
        platform: mention.platform,
        engagement: Math.round(engagementRate * 1000) / 10,
        sentiment: Number(mention.sentiment_score || 50) / 100,
        whyWorked: this.analyzeWhyWorked(String(mention.content || ''), totalEngagement),
        author: mention.author || undefined,
      };
    });
  }

  private analyzeWhyWorked(content: string, engagement: number) {
    const text = content.toLowerCase();

    if (engagement > 1000) {
      return 'Alto engajamento com grande alcance';
    }

    if (text.includes('resultado')) {
      return 'Mostrou resultados reais com dados concretos';
    }

    if (text.includes('antes') && text.includes('depois')) {
      return 'Usou comparacao antes/depois efetiva';
    }

    if (text.includes('gratis') || text.includes('desconto')) {
      return 'Oferta atrativa gerou conversoes';
    }

    if (text.length < 100) {
      return 'Mensagem curta e direta';
    }

    return 'Conteudo relevante e bem executado';
  }

  private identifyRisks(format: ScoredFormat, enrichedBriefing: EnrichedBriefing) {
    const risks: string[] = [];

    if (format.performanceData.sentiment < 0.4) {
      risks.push(`Sentimento negativo recente (${Math.round(format.performanceData.sentiment * 100)}%)`);
    }

    if (format.performanceData.engagementRate < 0.02) {
      risks.push('Baixa taxa de engajamento historica');
    }

    if (format.performanceData.sampleSize < 10) {
      risks.push('Poucos dados disponiveis - recomendacao com baixa confianca');
    }

    enrichedBriefing.enrichedData.risks.forEach((risk) => risks.push(risk));

    return risks;
  }

  private suggestAlternatives(format: ScoredFormat, enrichedBriefing: EnrichedBriefing) {
    const alternatives: Array<{ formato: string; reason: string }> = [];

    enrichedBriefing.enrichedData.opportunities.forEach((opp) => {
      const lower = opp.toLowerCase();
      if (lower.includes('reels') && !format.name.toLowerCase().includes('reel')) {
        alternatives.push({
          formato: 'Reels Instagram - 30s',
          reason: `Oportunidade: ${opp}`,
        });
      }

      if (lower.includes('tiktok') && !format.platform.toLowerCase().includes('tiktok')) {
        alternatives.push({
          formato: 'TikTok Video - 15s',
          reason: `Oportunidade: ${opp}`,
        });
      }

      if (lower.includes('linkedin') && !format.platform.toLowerCase().includes('linkedin')) {
        alternatives.push({
          formato: 'LinkedIn Post - Carrossel',
          reason: `Oportunidade: ${opp}`,
        });
      }
    });

    if (format.performanceData.engagementRate < 0.03) {
      alternatives.push({
        formato: 'Formato com maior engajamento na mesma plataforma',
        reason: 'Considerar formato com historico de melhor performance',
      });
    }

    return alternatives.slice(0, 3);
  }
}
