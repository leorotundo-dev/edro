import { query } from '../db';
import type { Platform } from '../socialListening/types';

export interface FormatCandidate {
  id: string;
  name: string;
  platform: string;
  originalScore: number;
  category?: string;
}

export interface PerformanceData {
  sentiment: number;
  engagementRate: number;
  virality: number;
  sampleSize: number;
}

export interface ScoredFormat extends FormatCandidate {
  performanceScore: number;
  finalScore: number;
  performanceData: PerformanceData;
  boost: number;
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

export class PerformanceScorer {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async scoreFormats(candidates: FormatCandidate[], keywords: string[], options?: { clientId?: string }) {
    const scored: ScoredFormat[] = [];

    for (const candidate of candidates) {
      const performanceData = await this.getPerformanceData(
        candidate.platform,
        candidate.category || '',
        keywords,
        options?.clientId
      );

      const performanceScore = this.calculatePerformanceScore(performanceData);
      const boost = this.calculateBoost(performanceScore);
      const finalScore = this.applyBoost(candidate.originalScore, boost);

      scored.push({
        ...candidate,
        performanceScore,
        finalScore,
        performanceData,
        boost,
      });
    }

    return scored.sort((a, b) => b.finalScore - a.finalScore);
  }

  private async getPerformanceData(platform: string, _category: string, keywords: string[], clientId?: string):
    Promise<PerformanceData> {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const dbPlatform = normalizePlatform(platform);

    const where: string[] = ['tenant_id=$1', 'platform=$2', 'published_at >= $3'];
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

    params.push(500);

    const { rows } = await query<any>(
      `
      SELECT sentiment_score, engagement_likes, engagement_comments, engagement_shares,
             engagement_views, author_followers
      FROM social_listening_mentions
      WHERE ${where.join(' AND ')}
      ORDER BY published_at DESC NULLS LAST
      LIMIT $${idx}
      `,
      params
    );

    if (!rows.length) {
      return { sentiment: 0.5, engagementRate: 0.5, virality: 0.5, sampleSize: 0 };
    }

    let totalSentiment = 0;
    let sentimentCount = 0;
    let totalEngagement = 0;
    let totalReach = 0;
    let totalShares = 0;

    rows.forEach((row) => {
      if (row.sentiment_score !== null && row.sentiment_score !== undefined) {
        totalSentiment += Number(row.sentiment_score || 0);
        sentimentCount += 1;
      }
      const engagement =
        Number(row.engagement_likes || 0) +
        Number(row.engagement_comments || 0) +
        Number(row.engagement_shares || 0);
      const reach = Number(row.engagement_views || 0) || Number(row.author_followers || 0) || 1000;
      totalEngagement += engagement;
      totalReach += reach;
      totalShares += Number(row.engagement_shares || 0);
    });

    const avgSentiment = sentimentCount ? totalSentiment / sentimentCount / 100 : 0.5;
    const engagementRate = totalReach ? Math.min(totalEngagement / totalReach, 1) : 0.5;
    const avgShares = totalShares / rows.length;
    const virality = Math.min(avgShares / 50, 1);

    return {
      sentiment: avgSentiment,
      engagementRate,
      virality,
      sampleSize: rows.length,
    };
  }

  private calculatePerformanceScore(data: PerformanceData) {
    const score = data.sentiment * 0.4 + data.engagementRate * 0.4 + data.virality * 0.2;
    const confidence = Math.min(data.sampleSize / 50, 1);
    const adjusted = score * confidence + 0.5 * (1 - confidence);
    return Math.round(adjusted * 100);
  }

  private calculateBoost(performanceScore: number) {
    if (performanceScore >= 70) {
      const boostFactor = (performanceScore - 70) / 30;
      return boostFactor * 20;
    }
    if (performanceScore < 50) {
      const penaltyFactor = (50 - performanceScore) / 50;
      return -penaltyFactor * 20;
    }
    return 0;
  }

  private applyBoost(originalScore: number, boost: number) {
    const adjustment = originalScore * (boost / 100);
    const finalScore = originalScore + adjustment;
    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  async getPerformanceInsights(platform: string, category: string, keywords: string[], options?: { clientId?: string }) {
    const performanceData = await this.getPerformanceData(platform, category, keywords, options?.clientId);

    return {
      summary: this.generateSummary(performanceData),
      strengths: this.identifyStrengths(performanceData),
      weaknesses: this.identifyWeaknesses(performanceData),
      recommendations: this.generateRecommendations(performanceData),
    };
  }

  private generateSummary(data: PerformanceData) {
    const sentimentText = data.sentiment > 0.7
      ? 'alto sentimento positivo'
      : data.sentiment < 0.4
      ? 'sentimento negativo'
      : 'sentimento neutro';

    const engagementText = data.engagementRate > 0.05
      ? 'alto engajamento'
      : data.engagementRate < 0.02
      ? 'baixo engajamento'
      : 'engajamento moderado';

    return `Formato com ${sentimentText} e ${engagementText} baseado em ${data.sampleSize} mencoes analisadas.`;
  }

  private identifyStrengths(data: PerformanceData) {
    const strengths: string[] = [];

    if (data.sentiment > 0.7) {
      strengths.push(`${Math.round(data.sentiment * 100)}% de sentimento positivo`);
    }

    if (data.engagementRate > 0.05) {
      strengths.push(`Taxa de engajamento ${Math.round((data.engagementRate / 0.05) * 100)}% acima da media`);
    }

    if (data.virality > 0.6) {
      strengths.push('Alto potencial de viralizacao');
    }

    if (data.sampleSize > 100) {
      strengths.push(`Dados confiaveis (${data.sampleSize} amostras)`);
    }

    return strengths;
  }

  private identifyWeaknesses(data: PerformanceData) {
    const weaknesses: string[] = [];

    if (data.sentiment < 0.4) {
      weaknesses.push(`Sentimento negativo (${Math.round(data.sentiment * 100)}%)`);
    }

    if (data.engagementRate < 0.02) {
      weaknesses.push('Baixa taxa de engajamento');
    }

    if (data.virality < 0.3) {
      weaknesses.push('Baixo potencial de viralizacao');
    }

    if (data.sampleSize < 20) {
      weaknesses.push('Poucos dados disponiveis (baixa confianca)');
    }

    return weaknesses;
  }

  private generateRecommendations(data: PerformanceData) {
    const recommendations: string[] = [];

    if (data.sentiment < 0.5) {
      recommendations.push('Revisar abordagem para melhorar sentimento');
    }

    if (data.engagementRate < 0.03) {
      recommendations.push('Adicionar call-to-action mais forte para aumentar engajamento');
    }

    if (data.virality < 0.4) {
      recommendations.push('Incluir elementos virais (humor, surpresa, emocao)');
    }

    if (data.sampleSize < 30) {
      recommendations.push('Coletar mais dados antes de decisao final');
    }

    if (data.sentiment > 0.7 && data.engagementRate > 0.05) {
      recommendations.push('Formato com alta performance - priorizar na campanha');
    }

    return recommendations;
  }
}
