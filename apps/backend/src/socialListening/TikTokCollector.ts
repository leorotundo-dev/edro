import { callDataApi } from './dataApi';
import { BaseCollector } from './BaseCollector';
import type { CollectorResult, RawMention } from './types';

export class TikTokCollector extends BaseCollector {
  constructor() {
    super('tiktok');
  }

  async collect(keyword: string, limit: number = 20, cursor?: string): Promise<CollectorResult> {
    let numericCursor: number | undefined;
    let searchId: string | undefined;

    if (cursor) {
      try {
        const parsed = JSON.parse(cursor);
        numericCursor = parsed.cursor;
        searchId = parsed.searchId;
      } catch {
        numericCursor = parseInt(cursor, 10) || undefined;
      }
    }

    try {
      const searchResult = await callDataApi('tiktok/search', {
        query: {
          keyword,
          ...(numericCursor ? { cursor: numericCursor } : {}),
          ...(searchId ? { search_id: searchId } : {}),
        },
      });

      if (!searchResult || typeof searchResult !== 'object') {
        return { mentions: [], hasMore: false };
      }

      const data = (searchResult as any).data || [];
      const logPb = (searchResult as any).log_pb || {};
      const nextSearchId = logPb.impr_id;
      const nextCursor = (searchResult as any).cursor;

      const mentions: RawMention[] = data
        .slice(0, limit)
        .map((item: any) => this.normalize(item))
        .filter((mention: RawMention | null) => mention !== null) as RawMention[];

      const encodedCursor = nextCursor || nextSearchId ? JSON.stringify({ cursor: nextCursor, searchId: nextSearchId }) : undefined;

      return {
        mentions,
        hasMore: !!nextCursor || !!nextSearchId,
        cursor: encodedCursor,
      };
    } catch (error) {
      console.error('TikTok collector error:', error);
      return { mentions: [], hasMore: false };
    }
  }

  protected normalize(data: any): RawMention | null {
    if (!data.aweme_id) return null;

    const author = data.author || {};
    const stats = data.statistics || {};

    return {
      id: this.generateId(data.aweme_id),
      platform: this.platform,
      content: data.desc || '',
      author: author.unique_id || author.nickname,
      authorFollowers: author.follower_count,
      authorVerified: author.verified || false,
      engagementLikes: stats.digg_count || 0,
      engagementComments: stats.comment_count || 0,
      engagementShares: stats.share_count || 0,
      engagementViews: stats.play_count || 0,
      url: data.share_url || `https://www.tiktok.com/@${author.unique_id}/video/${data.aweme_id}`,
      publishedAt: data.create_time ? new Date(data.create_time * 1000) : new Date(),
    };
  }
}
