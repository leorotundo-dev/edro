import { callDataApi } from './dataApi';
import { BaseCollector } from './BaseCollector';
import type { CollectorResult, RawMention } from './types';

export class TwitterCollector extends BaseCollector {
  constructor() {
    super('twitter');
  }

  async collect(keyword: string, limit: number = 20, cursor?: string): Promise<CollectorResult> {
    try {
      const userResult = await callDataApi('twitter/profile', {
        query: { username: keyword },
      });

      if (!userResult || typeof userResult !== 'object') {
        return { mentions: [], hasMore: false };
      }

      const resultData = (userResult as any).result;
      if (!resultData?.data?.user?.result) {
        return { mentions: [], hasMore: false };
      }

      const userId = resultData.data.user.result.rest_id;

      const tweetsResult = await callDataApi('twitter/tweets', {
        query: {
          user: userId,
          count: String(limit),
          ...(cursor ? { cursor } : {}),
        },
      });

      if (!tweetsResult || typeof tweetsResult !== 'object') {
        return { mentions: [], hasMore: false };
      }

      const tweetsResultData = (tweetsResult as any).result;
      if (!tweetsResultData?.timeline) {
        return { mentions: [], hasMore: false };
      }

      const mentions: RawMention[] = [];
      const timeline = tweetsResultData.timeline;
      const instructions = timeline.instructions || [];

      for (const instruction of instructions) {
        if (instruction.type !== 'TimelineAddEntries') continue;
        const entries = instruction.entries || [];
        for (const entry of entries) {
          if (!entry.entryId?.startsWith('tweet-')) continue;
          const content = entry.content || {};
          const itemContent = content.itemContent || {};
          const tweetResults = itemContent.tweet_results || {};
          const tweetResult = tweetResults.result || {};
          if (tweetResult.legacy) {
            const mention = this.normalize(tweetResult);
            mentions.push(mention);
          }
        }
      }

      const cursorEntry = instructions
        .flatMap((item: any) => item.entries || [])
        .find((entry: any) => entry.entryId?.startsWith('cursor-bottom'));
      const nextCursor = cursorEntry?.content?.value;

      return {
        mentions,
        hasMore: !!nextCursor,
        cursor: nextCursor,
      };
    } catch (error) {
      console.error('Twitter collector error:', error);
      return { mentions: [], hasMore: false };
    }
  }

  protected normalize(data: any): RawMention {
    const legacy = data.legacy || {};
    const core = data.core || {};
    const userResults = core.user_results || {};
    const userResult = userResults.result || {};
    const userLegacy = userResult.legacy || {};

    return {
      id: this.generateId(legacy.id_str || data.rest_id),
      platform: this.platform,
      content: legacy.full_text || '',
      author: userLegacy.screen_name,
      authorFollowers: userLegacy.followers_count,
      authorVerified: userLegacy.verified || false,
      engagementLikes: legacy.favorite_count || 0,
      engagementComments: legacy.reply_count || 0,
      engagementShares: legacy.retweet_count || 0,
      engagementViews: legacy.views?.count || 0,
      url: legacy.id_str ? `https://twitter.com/${userLegacy.screen_name}/status/${legacy.id_str}` : undefined,
      language: legacy.lang,
      publishedAt: legacy.created_at ? new Date(legacy.created_at) : new Date(),
    };
  }
}
