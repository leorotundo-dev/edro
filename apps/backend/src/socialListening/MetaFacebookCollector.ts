import { BaseCollector } from './BaseCollector';
import { callMetaGraph } from './metaApi';
import type { CollectorResult, RawMention } from './types';

export type MetaCollectorConfig = {
  accessToken: string;
  pageId: string;
};

export class MetaFacebookCollector extends BaseCollector {
  constructor() {
    super('facebook');
  }

  async collect(keyword: string, limit: number = 20, _cursor?: string, config?: MetaCollectorConfig): Promise<CollectorResult> {
    if (!config?.accessToken || !config.pageId) {
      return { mentions: [], hasMore: false };
    }

    const data = await callMetaGraph<{ data?: any[]; paging?: any }>(
      `${config.pageId}/posts`,
      {
        fields: 'message,created_time,permalink_url,shares,reactions.summary(true),comments.summary(true)',
        access_token: config.accessToken,
        limit,
      }
    );

    const posts = data.data || [];
    const mentions: RawMention[] = posts
      .map((post: any) => this.normalize(post, keyword))
      .filter((mention: RawMention | null) => mention !== null) as RawMention[];

    return {
      mentions,
      hasMore: Boolean(data.paging?.next),
      cursor: data.paging?.cursors?.after,
    };
  }

  async collectRecentComments(
    limitPosts: number = 10,
    limitCommentsPerPost: number = 50,
    config?: MetaCollectorConfig
  ): Promise<CollectorResult> {
    if (!config?.accessToken || !config.pageId) {
      return { mentions: [], hasMore: false };
    }

    // Fetch recent posts from the page, then fetch top-level comments for each post.
    const posts = await callMetaGraph<{ data?: any[] }>(
      `${config.pageId}/posts`,
      {
        fields: 'id,permalink_url,created_time,message',
        access_token: config.accessToken,
        limit: limitPosts,
      }
    );

    const mentions: RawMention[] = [];
    for (const post of posts?.data || []) {
      if (!post?.id) continue;
      try {
        const comments = await callMetaGraph<{ data?: any[] }>(
          `${post.id}/comments`,
          {
            fields: 'id,message,created_time,from,like_count,comment_count,permalink_url',
            access_token: config.accessToken,
            limit: limitCommentsPerPost,
          }
        );

        for (const comment of comments?.data || []) {
          const mention = this.normalizeComment(comment, post);
          if (mention) mentions.push(mention);
        }
      } catch (error) {
        console.error('collect_facebook_comments_error', (error as any)?.message || String(error));
      }
    }

    return { mentions, hasMore: false };
  }

  protected normalize(data: any, keyword?: string): RawMention | null {
    const content = data.message || '';
    if (keyword && content && !content.toLowerCase().includes(keyword.toLowerCase())) {
      return null;
    }

    return {
      id: this.generateId(data.id),
      platform: this.platform,
      content,
      author: 'Facebook Page',
      engagementLikes: data.reactions?.summary?.total_count || 0,
      engagementComments: data.comments?.summary?.total_count || 0,
      engagementShares: data.shares?.count || 0,
      url: data.permalink_url,
      language: 'pt',
      publishedAt: data.created_time ? new Date(data.created_time) : new Date(),
    };
  }

  private normalizeComment(data: any, post?: any): RawMention | null {
    const content = String(data?.message || '').trim();
    if (!content) return null;

    const fromName = data?.from?.name ? String(data.from.name) : undefined;
    const url = data?.permalink_url || post?.permalink_url || undefined;

    return {
      id: this.generateId(`comment_${String(data.id)}`),
      platform: this.platform,
      content,
      author: fromName,
      engagementLikes: Number(data?.like_count || 0),
      engagementComments: Number(data?.comment_count || 0),
      url,
      language: 'pt',
      publishedAt: data?.created_time ? new Date(data.created_time) : new Date(),
    };
  }
}
