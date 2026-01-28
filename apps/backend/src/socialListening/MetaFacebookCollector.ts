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
}
