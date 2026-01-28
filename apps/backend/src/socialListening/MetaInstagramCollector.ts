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
}
