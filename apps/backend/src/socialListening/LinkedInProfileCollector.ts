import { env } from '../env';
import type { RawMention, CollectorResult } from './types';

const PROXYCURL_BASE = 'https://nubela.co/proxycurl/api/v2';
const TIMEOUT_MS = 25000;

type ProxycurlPost = {
  urn?: string;
  text?: string;
  author?: string;
  url?: string;
  num_likes?: number;
  num_comments?: number;
  num_reposts?: number;
  num_impressions?: number;
  time_posted?: string;
};

/**
 * Fetches recent posts from a specific LinkedIn profile using Proxycurl API.
 * Unlike the keyword-based LinkedInCollector, this collector targets a single
 * profile URL and returns actual post content.
 */
export class LinkedInProfileCollector {
  private apiKey: string;

  constructor() {
    this.apiKey = env.PROXYCURL_API_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async collectProfilePosts(profileUrl: string, limit: number = 20): Promise<CollectorResult> {
    if (!this.apiKey) {
      return { mentions: [], hasMore: false };
    }

    const cleanUrl = profileUrl.trim().replace(/\/+$/, '');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = new URL(`${PROXYCURL_BASE}/linkedin/profile/posts`);
      url.searchParams.set('linkedin_profile_url', cleanUrl);
      url.searchParams.set('category', 'posts');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Proxycurl error (${response.status}):`, text.slice(0, 200));
        return { mentions: [], hasMore: false };
      }

      const data = await response.json();
      const posts: ProxycurlPost[] = Array.isArray(data) ? data : data?.posts ?? data?.data ?? [];

      const mentions: RawMention[] = [];
      for (const post of posts.slice(0, limit)) {
        const mention = this.normalize(post, cleanUrl);
        if (mention) mentions.push(mention);
      }

      return {
        mentions,
        hasMore: posts.length > limit,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error('Proxycurl request timed out');
      } else {
        console.error('Error collecting LinkedIn profile posts:', err?.message || err);
      }
      return { mentions: [], hasMore: false };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch basic profile info (name, headline) to enrich mentions.
   */
  async getProfileInfo(profileUrl: string): Promise<{ name: string; headline: string } | null> {
    if (!this.apiKey) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = new URL(`${PROXYCURL_BASE.replace('/v2', '')}/v2/linkedin`);
      url.searchParams.set('linkedin_profile_url', profileUrl.trim().replace(/\/+$/, ''));
      url.searchParams.set('use_cache', 'if-present');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = await response.json();
      return {
        name: [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Unknown',
        headline: data.headline || '',
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private normalize(post: ProxycurlPost, profileUrl: string): RawMention | null {
    const text = post.text?.trim();
    if (!text) return null;

    const urn = post.urn || '';
    const id = urn || `lnkd-${this.hashCode(text)}`;

    let publishedAt: Date | undefined;
    if (post.time_posted) {
      const parsed = new Date(post.time_posted);
      if (!isNaN(parsed.getTime())) publishedAt = parsed;
    }

    return {
      id: `linkedin-profile-${id}`,
      platform: 'linkedin',
      content: text,
      author: post.author || profileUrl,
      authorVerified: false,
      url: post.url || profileUrl,
      engagementLikes: post.num_likes ?? 0,
      engagementComments: post.num_comments ?? 0,
      engagementShares: post.num_reposts ?? 0,
      engagementViews: post.num_impressions ?? 0,
      language: 'pt',
      publishedAt,
    };
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
}
