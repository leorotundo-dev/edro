import { env } from '../env';
import type { RawMention, CollectorResult } from './types';

const API_BASE = 'https://fresh-linkedin-scraper-api.p.rapidapi.com/api/v1';
const API_HOST = 'fresh-linkedin-scraper-api.p.rapidapi.com';
const TIMEOUT_MS = 25000;

type LinkedInPost = {
  urn?: string;
  text?: string;
  author?: string;
  url?: string;
  totalReactionCount?: number;
  commentsCount?: number;
  repostsCount?: number;
  impressionCount?: number;
  postedDate?: string;
  postedDateTimestamp?: number;
};

/**
 * Fetches recent posts from a specific LinkedIn profile using
 * Fresh LinkedIn Scraper API (RapidAPI).
 *
 * Flow: extract username from URL → fetch profile for URN → fetch posts.
 */
export class LinkedInProfileCollector {
  private apiKey: string;

  constructor() {
    this.apiKey = env.RAPIDAPI_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private headers() {
    return {
      'x-rapidapi-key': this.apiKey,
      'x-rapidapi-host': API_HOST,
    };
  }

  /**
   * Extract LinkedIn username from a profile URL.
   * e.g. "https://linkedin.com/in/john-doe" → "john-doe"
   */
  private extractUsername(profileUrl: string): string | null {
    const clean = profileUrl.trim().replace(/\/+$/, '');
    const match = clean.match(/linkedin\.com\/in\/([^/?#]+)/i);
    return match?.[1] ?? null;
  }

  /**
   * Fetch the profile URN needed for the posts endpoint.
   */
  private async fetchProfileUrn(username: string): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = `${API_BASE}/user/profile?username=${encodeURIComponent(username)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers(),
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = await response.json();
      // The API returns the URN in different possible fields
      return data?.urn || data?.profileUrn || data?.entityUrn || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async collectProfilePosts(profileUrl: string, limit: number = 20): Promise<CollectorResult> {
    if (!this.apiKey) {
      return { mentions: [], hasMore: false };
    }

    const username = this.extractUsername(profileUrl);
    if (!username) {
      console.error('LinkedInProfileCollector: invalid URL, cannot extract username:', profileUrl);
      return { mentions: [], hasMore: false };
    }

    // Step 1: get URN from profile
    const urn = await this.fetchProfileUrn(username);
    if (!urn) {
      console.error('LinkedInProfileCollector: could not fetch URN for', username);
      return { mentions: [], hasMore: false };
    }

    // Step 2: fetch posts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = `${API_BASE}/user/posts?urn=${encodeURIComponent(urn)}&page=1`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`LinkedIn posts API error (${response.status}):`, text.slice(0, 200));
        return { mentions: [], hasMore: false };
      }

      const data = await response.json();
      const posts: LinkedInPost[] = Array.isArray(data) ? data : data?.posts ?? data?.data ?? [];

      const mentions: RawMention[] = [];
      for (const post of posts.slice(0, limit)) {
        const mention = this.normalize(post, profileUrl, username);
        if (mention) mentions.push(mention);
      }

      return {
        mentions,
        hasMore: posts.length > limit,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error('LinkedIn posts API request timed out');
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

    const username = this.extractUsername(profileUrl);
    if (!username) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = `${API_BASE}/user/profile?username=${encodeURIComponent(username)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers(),
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = await response.json();
      return {
        name: data?.fullName || data?.firstName || 'Unknown',
        headline: data?.headline || '',
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private normalize(post: LinkedInPost, profileUrl: string, username: string): RawMention | null {
    const text = post.text?.trim();
    if (!text) return null;

    const urn = post.urn || '';
    const id = urn || `lnkd-${this.hashCode(text)}`;

    let publishedAt: Date | undefined;
    if (post.postedDateTimestamp) {
      publishedAt = new Date(post.postedDateTimestamp);
    } else if (post.postedDate) {
      const parsed = new Date(post.postedDate);
      if (!isNaN(parsed.getTime())) publishedAt = parsed;
    }

    return {
      id: `linkedin-profile-${id}`,
      platform: 'linkedin',
      content: text,
      author: post.author || username,
      authorVerified: false,
      url: post.url || profileUrl,
      engagementLikes: post.totalReactionCount ?? 0,
      engagementComments: post.commentsCount ?? 0,
      engagementShares: post.repostsCount ?? 0,
      engagementViews: post.impressionCount ?? 0,
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
