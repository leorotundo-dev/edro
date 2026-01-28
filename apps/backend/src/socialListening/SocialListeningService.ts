import { query } from '../db';
import { TwitterCollector } from './TwitterCollector';
import { YouTubeCollector } from './YouTubeCollector';
import { TikTokCollector } from './TikTokCollector';
import { RedditCollector } from './RedditCollector';
import { LinkedInCollector } from './LinkedInCollector';
import { MetaFacebookCollector } from './MetaFacebookCollector';
import { MetaInstagramCollector } from './MetaInstagramCollector';
import { SentimentAnalyzer } from './SentimentAnalyzer';
import type { AnalyzedMention, Platform } from './types';
import { getMetaConnector, type MetaConnectorConfig } from './metaConnector';
import type { ClientKnowledge } from '../providers/contracts';
import { knowledgeBaseProvider } from '../providers/base';

const PLATFORMS: Platform[] = ['twitter', 'youtube', 'tiktok', 'reddit', 'linkedin', 'instagram', 'facebook'];

type KeywordRow = {
  id: string;
  keyword: string;
  category: string | null;
  client_id: string | null;
  is_active: boolean;
};

export class SocialListeningService {
  private tenantId: string;
  private collectors: Map<Platform, { collect: Function }>;
  private metaFacebook: MetaFacebookCollector;
  private metaInstagram: MetaInstagramCollector;
  private analyzer: SentimentAnalyzer;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.collectors = new Map<Platform, { collect: Function }>();
    this.collectors.set('twitter', new TwitterCollector());
    this.collectors.set('youtube', new YouTubeCollector());
    this.collectors.set('tiktok', new TikTokCollector());
    this.collectors.set('reddit', new RedditCollector());
    this.collectors.set('linkedin', new LinkedInCollector());
    this.metaFacebook = new MetaFacebookCollector();
    this.metaInstagram = new MetaInstagramCollector();
    this.analyzer = new SentimentAnalyzer();
  }

  private resolvePlatforms(input?: Platform[]) {
    if (!input || !input.length) return PLATFORMS;
    return input.filter((platform) => PLATFORMS.includes(platform));
  }

  private async resolveMetaConfig(clientId?: string | null): Promise<MetaConnectorConfig | null> {
    if (!clientId) return null;
    const config = await getMetaConnector(this.tenantId, clientId);
    if (!config?.accessToken) return null;
    return config;
  }

  private async getActiveKeywords(clientId?: string | null): Promise<KeywordRow[]> {
    const where: string[] = ['tenant_id=$1', 'is_active=true'];
    const params: any[] = [this.tenantId];
    let idx = 2;

    if (clientId) {
      where.push(`(client_id IS NULL OR client_id=$${idx++})`);
      params.push(clientId);
    }

    const { rows } = await query<KeywordRow>(
      `SELECT id, keyword, category, client_id, is_active
       FROM social_listening_keywords
       WHERE ${where.join(' AND ')}
       ORDER BY updated_at DESC`,
      params
    );

    return rows;
  }

  async collectAll(options: { limit?: number; clientId?: string; platforms?: Platform[] } = {}) {
    const errors: string[] = [];
    let collected = 0;
    let analyzed = 0;
    const knowledgeCache = new Map<string, ClientKnowledge | null>();

    const keywords = await this.getActiveKeywords(options.clientId);
    if (!keywords.length) {
      return { collected, analyzed, errors: ['no_active_keywords'] };
    }

    const metaConfig = await this.resolveMetaConfig(options.clientId ?? null);
    let platforms = this.resolvePlatforms(options.platforms);
    if (!options.clientId) {
      platforms = platforms.filter((platform) => platform !== 'facebook' && platform !== 'instagram');
    } else if (!metaConfig) {
      platforms = platforms.filter((platform) => platform !== 'facebook' && platform !== 'instagram');
      if (options.platforms?.includes('facebook') || options.platforms?.includes('instagram')) {
        errors.push('meta_not_configured');
      }
    }

    for (const keyword of keywords) {
      const keywordClientId = keyword.client_id ?? options.clientId ?? null;
      const keywordKnowledge = await this.resolveClientKnowledge(keywordClientId, knowledgeCache);
      for (const platform of platforms) {
        if (platform === 'facebook') {
          if (!metaConfig?.pageId || !metaConfig.accessToken) continue;
          try {
            const result = await this.metaFacebook.collect(keyword.keyword, options.limit ?? 20, undefined, {
              accessToken: metaConfig.accessToken,
              pageId: metaConfig.pageId,
            });
            if (!result?.mentions?.length) continue;
            const analyzedMentions = await this.analyzer.analyzeBatch(result.mentions, {
              knowledge: keywordKnowledge,
            });
            await this.storeMentions(analyzedMentions, keyword.keyword, keyword.client_id ?? options.clientId ?? null);
            collected += result.mentions.length;
            analyzed += analyzedMentions.length;
          } catch (error: any) {
            const message = `collect_facebook_${keyword.keyword}`;
            errors.push(message);
            console.error(message, error);
          }
          continue;
        }

        if (platform === 'instagram') {
          if (!metaConfig?.instagramBusinessId || !metaConfig.accessToken) continue;
          try {
            const result = await this.metaInstagram.collect(keyword.keyword, options.limit ?? 20, undefined, {
              accessToken: metaConfig.accessToken,
              instagramBusinessId: metaConfig.instagramBusinessId,
            });
            if (!result?.mentions?.length) continue;
            const analyzedMentions = await this.analyzer.analyzeBatch(result.mentions, {
              knowledge: keywordKnowledge,
            });
            await this.storeMentions(analyzedMentions, keyword.keyword, keyword.client_id ?? options.clientId ?? null);
            collected += result.mentions.length;
            analyzed += analyzedMentions.length;
          } catch (error: any) {
            const message = `collect_instagram_${keyword.keyword}`;
            errors.push(message);
            console.error(message, error);
          }
          continue;
        }

        const collector = this.collectors.get(platform);
        if (!collector) continue;

        try {
          const result = await collector.collect(keyword.keyword, options.limit ?? 20);
          if (!result?.mentions?.length) continue;

          const analyzedMentions = await this.analyzer.analyzeBatch(result.mentions, {
            knowledge: keywordKnowledge,
          });
          await this.storeMentions(analyzedMentions, keyword.keyword, keyword.client_id ?? options.clientId ?? null);

          collected += result.mentions.length;
          analyzed += analyzedMentions.length;
        } catch (error: any) {
          const message = `collect_${platform}_${keyword.keyword}`;
          errors.push(message);
          console.error(message, error);
        }
      }
    }

    if (collected > 0) {
      await this.generateTrends({ clientId: options.clientId });
    }

    return { collected, analyzed, errors };
  }

  async collectKeyword(options: { keyword: string; platform: Platform; limit?: number; clientId?: string }) {
    const knowledge = await this.resolveClientKnowledge(options.clientId ?? null);
    if (options.platform === 'facebook' || options.platform === 'instagram') {
      const metaConfig = await this.resolveMetaConfig(options.clientId ?? null);
      if (!metaConfig?.accessToken) throw new Error('meta_not_configured');
      if (options.platform === 'facebook') {
        if (!metaConfig.pageId) throw new Error('meta_page_missing');
        const result = await this.metaFacebook.collect(options.keyword, options.limit ?? 20, undefined, {
          accessToken: metaConfig.accessToken,
          pageId: metaConfig.pageId,
        });
        if (!result?.mentions?.length) return [];
        const analyzedMentions = await this.analyzer.analyzeBatch(result.mentions, { knowledge });
        await this.storeMentions(analyzedMentions, options.keyword, options.clientId ?? null);
        return analyzedMentions;
      }

      if (!metaConfig.instagramBusinessId) throw new Error('meta_ig_missing');
      const result = await this.metaInstagram.collect(options.keyword, options.limit ?? 20, undefined, {
        accessToken: metaConfig.accessToken,
        instagramBusinessId: metaConfig.instagramBusinessId,
      });
      if (!result?.mentions?.length) return [];
      const analyzedMentions = await this.analyzer.analyzeBatch(result.mentions, { knowledge });
      await this.storeMentions(analyzedMentions, options.keyword, options.clientId ?? null);
      return analyzedMentions;
    }

    const collector = this.collectors.get(options.platform);
    if (!collector) throw new Error('invalid_platform');

    const result = await collector.collect(options.keyword, options.limit ?? 20);
    if (!result?.mentions?.length) return [];

    const analyzedMentions = await this.analyzer.analyzeBatch(result.mentions, { knowledge });
    await this.storeMentions(analyzedMentions, options.keyword, options.clientId ?? null);
    return analyzedMentions;
  }

  private async resolveClientKnowledge(
    clientId?: string | null,
    cache?: Map<string, ClientKnowledge | null>
  ): Promise<ClientKnowledge | null> {
    if (!clientId) return null;
    if (cache && cache.has(clientId)) return cache.get(clientId) ?? null;
    try {
      const knowledge = await knowledgeBaseProvider.getClientKnowledge({
        client_id: clientId,
        tenant_id: this.tenantId,
      });
      if (cache) cache.set(clientId, knowledge);
      return knowledge;
    } catch (error) {
      console.warn('⚠️ Falha ao carregar base do cliente para social listening:', error);
      if (cache) cache.set(clientId, null);
      return null;
    }
  }

  private async storeMentions(mentions: AnalyzedMention[], keyword: string, clientId: string | null) {
    for (const mention of mentions) {
      const keywordList = Array.from(
        new Set([keyword, ...(mention.keywords || [])].filter(Boolean))
      );

      await query(
        `
        INSERT INTO social_listening_mentions
          (tenant_id, client_id, keyword, platform, external_id, content, author, author_followers,
           author_verified, engagement_likes, engagement_comments, engagement_shares, engagement_views,
           sentiment, sentiment_score, keywords, url, language, country, published_at)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19,$20)
        ON CONFLICT (tenant_id, platform, external_id)
        DO UPDATE SET
          content=EXCLUDED.content,
          author=EXCLUDED.author,
          author_followers=EXCLUDED.author_followers,
          author_verified=EXCLUDED.author_verified,
          engagement_likes=EXCLUDED.engagement_likes,
          engagement_comments=EXCLUDED.engagement_comments,
          engagement_shares=EXCLUDED.engagement_shares,
          engagement_views=EXCLUDED.engagement_views,
          sentiment=EXCLUDED.sentiment,
          sentiment_score=EXCLUDED.sentiment_score,
          keywords=EXCLUDED.keywords,
          url=EXCLUDED.url,
          language=EXCLUDED.language,
          country=EXCLUDED.country,
          published_at=EXCLUDED.published_at,
          collected_at=NOW()
        `,
        [
          this.tenantId,
          clientId,
          keyword,
          mention.platform,
          mention.id,
          mention.content,
          mention.author ?? null,
          mention.authorFollowers ?? null,
          mention.authorVerified ?? false,
          mention.engagementLikes ?? 0,
          mention.engagementComments ?? 0,
          mention.engagementShares ?? 0,
          mention.engagementViews ?? 0,
          mention.sentiment,
          mention.sentimentScore,
          JSON.stringify(keywordList),
          mention.url ?? null,
          mention.language ?? null,
          mention.country ?? null,
          mention.publishedAt ?? new Date(),
        ]
      );
    }
  }

  async generateTrends(options: { periodHours?: number; clientId?: string } = {}) {
    const periodHours = options.periodHours ?? 24;
    const periodStart = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const periodEnd = new Date();

    const where: string[] = ['tenant_id=$1', 'published_at >= $2'];
    const params: any[] = [this.tenantId, periodStart];
    let idx = 3;

    if (options.clientId) {
      where.push(`(client_id IS NULL OR client_id=$${idx++})`);
      params.push(options.clientId);
    }

    const { rows } = await query<any>(
      `
      SELECT keyword,
             platform,
             COUNT(*)::int AS mention_count,
             SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END)::int AS positive_count,
             SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END)::int AS negative_count,
             SUM(CASE WHEN sentiment='neutral' THEN 1 ELSE 0 END)::int AS neutral_count,
             SUM(engagement_likes + engagement_comments + engagement_shares + engagement_views)::int AS total_engagement
      FROM social_listening_mentions
      WHERE ${where.join(' AND ')}
      GROUP BY keyword, platform
      `,
      params
    );

    const trends = [];

    for (const row of rows) {
      const total = Math.max(1, Number(row.mention_count || 0));
      const averageSentiment = Math.round(
        ((Number(row.positive_count || 0) * 100) + (Number(row.neutral_count || 0) * 50)) / total
      );

      await query(
        `
        INSERT INTO social_listening_trends
          (tenant_id, client_id, keyword, platform, mention_count, positive_count, negative_count, neutral_count,
           total_engagement, average_sentiment, related_keywords, top_authors, period_start, period_end)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14)
        `,
        [
          this.tenantId,
          options.clientId ?? null,
          row.keyword,
          row.platform,
          row.mention_count,
          row.positive_count,
          row.negative_count,
          row.neutral_count,
          row.total_engagement ?? 0,
          averageSentiment,
          JSON.stringify([]),
          JSON.stringify([]),
          periodStart,
          periodEnd,
        ]
      );

      trends.push({
        keyword: row.keyword,
        platform: row.platform,
        mention_count: row.mention_count,
        positive_count: row.positive_count,
        negative_count: row.negative_count,
        neutral_count: row.neutral_count,
        total_engagement: row.total_engagement ?? 0,
        average_sentiment: averageSentiment,
        period_start: periodStart,
        period_end: periodEnd,
      });
    }

    return trends;
  }

  async getMentions(filters: {
    platform?: Platform;
    sentiment?: string;
    keyword?: string;
    clientId?: string;
    limit?: number;
    offset?: number;
    q?: string;
  }) {
    const where: string[] = ['tenant_id=$1'];
    const params: any[] = [this.tenantId];
    let idx = 2;

    if (filters.clientId) {
      where.push(`(client_id IS NULL OR client_id=$${idx++})`);
      params.push(filters.clientId);
    }

    if (filters.platform) {
      where.push(`platform=$${idx++}`);
      params.push(filters.platform);
    }

    if (filters.sentiment) {
      where.push(`sentiment=$${idx++}`);
      params.push(filters.sentiment);
    }

    if (filters.keyword) {
      where.push(`keyword=$${idx++}`);
      params.push(filters.keyword);
    }

    if (filters.q) {
      where.push(`(LOWER(content) LIKE $${idx} OR LOWER(author) LIKE $${idx})`);
      params.push(`%${filters.q.toLowerCase()}%`);
      idx += 1;
    }

    const limit = Math.min(Number(filters.limit) || 50, 200);
    const offset = Math.max(Number(filters.offset) || 0, 0);

    params.push(limit, offset);

    const { rows } = await query<any>(
      `
      SELECT *
      FROM social_listening_mentions
      WHERE ${where.join(' AND ')}
      ORDER BY published_at DESC NULLS LAST, collected_at DESC
      LIMIT $${idx++} OFFSET $${idx}
      `,
      params
    );

    return rows;
  }

  async getTrends(filters: {
    platform?: Platform | 'all';
    keyword?: string;
    clientId?: string;
    limit?: number;
  }) {
    const where: string[] = ['tenant_id=$1'];
    const params: any[] = [this.tenantId];
    let idx = 2;

    if (filters.clientId) {
      where.push(`(client_id IS NULL OR client_id=$${idx++})`);
      params.push(filters.clientId);
    }

    if (filters.platform && filters.platform !== 'all') {
      where.push(`platform=$${idx++}`);
      params.push(filters.platform);
    }

    if (filters.keyword) {
      where.push(`keyword=$${idx++}`);
      params.push(filters.keyword);
    }

    const limit = Math.min(Number(filters.limit) || 20, 100);
    params.push(limit);

    const { rows } = await query<any>(
      `
      SELECT *
      FROM social_listening_trends
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${idx}
      `,
      params
    );

    return rows;
  }

  async getKeywords(filters: { clientId?: string }) {
    const where: string[] = ['tenant_id=$1'];
    const params: any[] = [this.tenantId];
    let idx = 2;

    if (filters.clientId) {
      where.push(`(client_id IS NULL OR client_id=$${idx++})`);
      params.push(filters.clientId);
    }

    const { rows } = await query<any>(
      `
      SELECT *
      FROM social_listening_keywords
      WHERE ${where.join(' AND ')}
      ORDER BY updated_at DESC
      `,
      params
    );

    return rows;
  }

  async getKeywordById(id: string) {
    const { rows } = await query<any>(
      `SELECT * FROM social_listening_keywords WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [id, this.tenantId]
    );
    return rows[0] || null;
  }

  async addKeyword(params: { keyword: string; category?: string; clientId?: string | null }) {
    const { rows } = await query<any>(
      `
      INSERT INTO social_listening_keywords
        (tenant_id, client_id, keyword, category, is_active)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (tenant_id, client_id, keyword)
      DO UPDATE SET category=EXCLUDED.category, is_active=EXCLUDED.is_active, updated_at=NOW()
      RETURNING *
      `,
      [this.tenantId, params.clientId ?? null, params.keyword, params.category ?? null, true]
    );

    return rows[0];
  }

  async updateKeyword(params: { id: string; isActive?: boolean; category?: string | null }) {
    const { rows } = await query<any>(
      `SELECT * FROM social_listening_keywords WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [params.id, this.tenantId]
    );
    const current = rows[0];
    if (!current) return null;

    const nextActive = params.isActive ?? current.is_active;
    const nextCategory = params.category ?? current.category;

    const { rows: updated } = await query<any>(
      `
      UPDATE social_listening_keywords
      SET is_active=$3, category=$4, updated_at=NOW()
      WHERE id=$1 AND tenant_id=$2
      RETURNING *
      `,
      [params.id, this.tenantId, nextActive, nextCategory]
    );

    return updated[0];
  }

  async deleteKeyword(id: string) {
    await query(`DELETE FROM social_listening_keywords WHERE id=$1 AND tenant_id=$2`, [id, this.tenantId]);
  }

  async getStats(filters: { clientId?: string }) {
    const where: string[] = ['tenant_id=$1', "published_at >= NOW() - INTERVAL '7 days'"];
    const params: any[] = [this.tenantId];
    let idx = 2;

    if (filters.clientId) {
      where.push(`(client_id IS NULL OR client_id=$${idx++})`);
      params.push(filters.clientId);
    }

    const { rows } = await query<any>(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE sentiment='positive')::int AS positive,
        COUNT(*) FILTER (WHERE sentiment='negative')::int AS negative,
        COUNT(*) FILTER (WHERE sentiment='neutral')::int AS neutral,
        AVG(sentiment_score)::int AS avg_score
      FROM social_listening_mentions
      WHERE ${where.join(' AND ')}
      `,
      params
    );

    const { rows: platforms } = await query<any>(
      `
      SELECT platform, COUNT(*)::int AS total
      FROM social_listening_mentions
      WHERE ${where.join(' AND ')}
      GROUP BY platform
      ORDER BY total DESC
      `,
      params
    );

    const { rows: keywords } = await query<any>(
      `
      SELECT keyword, COUNT(*)::int AS total
      FROM social_listening_mentions
      WHERE ${where.join(' AND ')}
      GROUP BY keyword
      ORDER BY total DESC
      LIMIT 10
      `,
      params
    );

    return {
      summary: rows[0] || { total: 0, positive: 0, negative: 0, neutral: 0, avg_score: 0 },
      platforms,
      top_keywords: keywords,
    };
  }
}
