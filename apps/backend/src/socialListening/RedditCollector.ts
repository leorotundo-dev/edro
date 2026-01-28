import { callDataApi } from './dataApi';
import { BaseCollector } from './BaseCollector';
import type { CollectorResult, RawMention } from './types';

export class RedditCollector extends BaseCollector {
  constructor() {
    super('reddit');
  }

  async collect(keyword: string, limit: number = 100, cursor?: string): Promise<CollectorResult> {
    try {
      const searchResult = await callDataApi('reddit/search', {
        query: {
          subreddit: keyword,
          limit,
          ...(cursor ? { cursor } : {}),
        },
      });

      if (!searchResult || typeof searchResult !== 'object') {
        return { mentions: [], hasMore: false };
      }

      const posts = (searchResult as any).posts || [];
      const nextCursor = (searchResult as any).cursor;

      const mentions: RawMention[] = posts
        .map((item: any) => this.normalize(item))
        .filter((mention: RawMention | null) => mention !== null) as RawMention[];

      return {
        mentions,
        hasMore: !!nextCursor,
        cursor: nextCursor,
      };
    } catch (error) {
      console.error('Reddit collector error:', error);
      return { mentions: [], hasMore: false };
    }
  }

  protected normalize(data: any): RawMention | null {
    const post = data.data || data;
    if (!post.id) return null;

    return {
      id: this.generateId(post.id),
      platform: this.platform,
      content: `${post.title || ''}\n\n${post.selftext || ''}`.trim(),
      author: post.author,
      authorVerified: post.author_premium || false,
      engagementLikes: post.ups || 0,
      engagementComments: post.num_comments || 0,
      url: post.url || (post.permalink ? `https://reddit.com${post.permalink}` : undefined),
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000) : new Date(),
    };
  }
}
