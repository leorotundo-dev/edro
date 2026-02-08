import { BaseCollector } from './BaseCollector';
import { callMetaGraph } from './metaApi';
import type { CollectorResult, RawMention } from './types';

export type MetaInstagramConfig = {
  accessToken: string;
  instagramBusinessId: string;
};

export class MetaInstagramCollector extends BaseCollector {
  constructor() {
    super('instagram');
  }

  async collect(keyword: string, limit: number = 20, _cursor?: string, config?: MetaInstagramConfig): Promise<CollectorResult> {
    if (!config?.accessToken || !config.instagramBusinessId) {
      return { mentions: [], hasMore: false };
    }

    const data = await callMetaGraph<{ data?: any[]; paging?: any }>(
      `${config.instagramBusinessId}/media`,
      {
        fields: 'caption,media_url,permalink,timestamp,like_count,comments_count',
        access_token: config.accessToken,
        limit,
      }
    );

    const media = data.data || [];
    const mentions: RawMention[] = media
      .map((item: any) => this.normalize(item, keyword))
      .filter((mention: RawMention | null) => mention !== null) as RawMention[];

    return {
      mentions,
      hasMore: Boolean(data.paging?.next),
      cursor: data.paging?.cursors?.after,
    };
  }

  async collectRecentComments(
    limitMedia: number = 10,
    limitCommentsPerMedia: number = 50,
    config?: MetaInstagramConfig
  ): Promise<CollectorResult> {
    if (!config?.accessToken || !config.instagramBusinessId) {
      return { mentions: [], hasMore: false };
    }

    // Fetch recent media from the business account, then fetch top-level comments for each media.
    const media = await callMetaGraph<{ data?: any[] }>(
      `${config.instagramBusinessId}/media`,
      {
        fields: 'id,permalink,timestamp,caption',
        access_token: config.accessToken,
        limit: limitMedia,
      }
    );

    const mentions: RawMention[] = [];
    for (const item of media?.data || []) {
      if (!item?.id) continue;
      try {
        const comments = await callMetaGraph<{ data?: any[] }>(
          `${item.id}/comments`,
          {
            fields: 'id,text,username,timestamp,like_count',
            access_token: config.accessToken,
            limit: limitCommentsPerMedia,
          }
        );

        for (const comment of comments?.data || []) {
          const mention = this.normalizeComment(comment, item);
          if (mention) mentions.push(mention);
        }
      } catch (error) {
        console.error('collect_instagram_comments_error', (error as any)?.message || String(error));
      }
    }

    return { mentions, hasMore: false };
  }

  protected normalize(data: any, keyword?: string): RawMention | null {
    const content = data.caption || '';
    if (keyword && content && !content.toLowerCase().includes(keyword.toLowerCase())) {
      return null;
    }

    return {
      id: this.generateId(data.id),
      platform: this.platform,
      content,
      author: 'Instagram Business',
      engagementLikes: data.like_count || 0,
      engagementComments: data.comments_count || 0,
      url: data.permalink,
      language: 'pt',
      publishedAt: data.timestamp ? new Date(data.timestamp) : new Date(),
    };
  }

  private normalizeComment(data: any, media?: any): RawMention | null {
    const content = String(data?.text || '').trim();
    if (!content) return null;

    const author = data?.username ? String(data.username) : undefined;
    const url = media?.permalink || undefined;

    return {
      id: this.generateId(`comment_${String(data.id)}`),
      platform: this.platform,
      content,
      author,
      engagementLikes: Number(data?.like_count || 0),
      engagementComments: 0,
      url,
      language: 'pt',
      publishedAt: data?.timestamp ? new Date(data.timestamp) : new Date(),
    };
  }
}
