import { BaseCollector } from './BaseCollector';
import type { RawMention, CollectorResult } from './types';
import { callDataApi } from './dataApi';

export class LinkedInCollector extends BaseCollector {
  constructor() {
    super('linkedin');
  }

  async collect(keyword: string, limit: number = 20): Promise<CollectorResult> {
    try {
      const response = (await callDataApi('linkedin/search', {
        query: {
          keywords: keyword,
          start: '0',
        },
      })) as any;

      if (!response || !response.success || !response.data) {
        return { mentions: [], hasMore: false };
      }

      const people = response.data.items || [];
      const mentions: RawMention[] = [];

      for (const person of people.slice(0, limit)) {
        const mention = this.normalize(person);
        if (mention) mentions.push(mention);
      }

      const hasMore = response.data.total > people.length;

      return {
        mentions,
        hasMore,
        cursor: hasMore ? String(people.length) : undefined,
      };
    } catch (error) {
      console.error('Error collecting from LinkedIn:', error);
      return { mentions: [], hasMore: false };
    }
  }

  protected normalize(data: any): RawMention | null {
    try {
      const fullName = data.fullName || 'Unknown';
      const headline = data.headline || '';
      const location = data.location || '';
      const username = data.username || '';

      const content = `${fullName}\n${headline}\n${location}`.trim();

      return {
        id: this.generateId(username || fullName),
        platform: this.platform,
        content,
        author: fullName,
        authorVerified: false,
        url: data.profileURL || (username ? `https://www.linkedin.com/in/${username}` : undefined),
        language: 'en',
        publishedAt: new Date(),
      };
    } catch (error) {
      console.error('Error normalizing LinkedIn data:', error);
      return null;
    }
  }
}
