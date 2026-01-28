import { callDataApi } from './dataApi';
import { BaseCollector } from './BaseCollector';
import type { CollectorResult, RawMention } from './types';

export class YouTubeCollector extends BaseCollector {
  constructor() {
    super('youtube');
  }

  async collect(keyword: string, limit: number = 20, cursor?: string): Promise<CollectorResult> {
    try {
      const searchResult = await callDataApi('youtube/search', {
        query: {
          q: keyword,
          hl: 'pt',
          gl: 'BR',
          ...(cursor ? { cursor } : {}),
        },
      });

      if (!searchResult || typeof searchResult !== 'object') {
        return { mentions: [], hasMore: false };
      }

      const contents = (searchResult as any).contents || [];
      const cursorNext = (searchResult as any).cursorNext;

      const mentions: RawMention[] = contents
        .filter((item: any) => item.type === 'video')
        .slice(0, limit)
        .map((item: any) => this.normalize(item))
        .filter((mention: RawMention | null) => mention !== null) as RawMention[];

      return {
        mentions,
        hasMore: !!cursorNext,
        cursor: cursorNext,
      };
    } catch (error) {
      console.error('YouTube collector error:', error);
      return { mentions: [], hasMore: false };
    }
  }

  protected normalize(data: any): RawMention | null {
    const video = data.video || {};
    if (!video.videoId) return null;

    const viewCountText = video.viewCountText || '0';
    const views = this.parseViewCount(viewCountText);

    return {
      id: this.generateId(video.videoId),
      platform: this.platform,
      content: `${video.title || ''}\n\n${video.descriptionSnippet || ''}`.trim(),
      author: video.channelTitle,
      authorVerified: video.badges?.includes('Verified') || false,
      engagementViews: views,
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      language: 'pt',
      country: 'BR',
      publishedAt: this.parsePublishedDate(video.publishedTimeText),
    };
  }

  private parseViewCount(text: string): number {
    if (!text) return 0;
    const match = text.match(/([\d.,]+)\s*([KMB])?/i);
    if (!match) return 0;
    let num = parseFloat(match[1].replace(/,/g, ''));
    const multiplier = match[2];
    if (multiplier) {
      const multipliers: Record<string, number> = {
        K: 1000,
        M: 1000000,
        B: 1000000000,
      };
      num *= multipliers[multiplier.toUpperCase()] || 1;
    }
    return Math.floor(num);
  }

  private parsePublishedDate(text: string): Date {
    if (!text) return new Date();
    const now = new Date();
    const match = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
    if (!match) return now;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const date = new Date(now);

    switch (unit) {
      case 'second':
        date.setSeconds(date.getSeconds() - value);
        break;
      case 'minute':
        date.setMinutes(date.getMinutes() - value);
        break;
      case 'hour':
        date.setHours(date.getHours() - value);
        break;
      case 'day':
        date.setDate(date.getDate() - value);
        break;
      case 'week':
        date.setDate(date.getDate() - value * 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - value);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - value);
        break;
    }

    return date;
  }
}
