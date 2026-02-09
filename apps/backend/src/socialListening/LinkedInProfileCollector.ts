import { env } from '../env';
import type { RawMention, CollectorResult } from './types';

const API_BASE = 'https://fresh-linkedin-profile-data.p.rapidapi.com';
const API_HOST = 'fresh-linkedin-profile-data.p.rapidapi.com';
const TIMEOUT_MS = 25000;

type LinkedInPost = {
  text?: string;
  author_name?: string;
  author_url?: string;
  post_url?: string;
  num_likes?: number;
  num_comments?: number;
  num_reposts?: number;
  num_impressions?: number;
  time?: string;
  posted_timestamp?: number;
  urn?: string;
  // company posts may use different field names
  totalReactionCount?: number;
  commentsCount?: number;
  repostsCount?: number;
};

/**
 * Fetches recent posts from a specific LinkedIn profile or company page
 * using Fresh LinkedIn Profile Data API (RapidAPI).
 *
 * Supports both:
 *  - Person profiles: linkedin.com/in/username
 *  - Company pages:   linkedin.com/company/slug
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
   * Detect whether a LinkedIn URL is a person profile or a company page.
   */
  private detectType(profileUrl: string): 'person' | 'company' | null {
    const clean = profileUrl.trim().replace(/\/+$/, '');
    if (/linkedin\.com\/in\//i.test(clean)) return 'person';
    if (/linkedin\.com\/company\//i.test(clean)) return 'company';
    return null;
  }

  async collectProfilePosts(profileUrl: string, limit: number = 20): Promise<CollectorResult> {
    if (!this.apiKey) {
      return { mentions: [], hasMore: false };
    }

    const type = this.detectType(profileUrl);
    if (!type) {
      console.error('LinkedInProfileCollector: unrecognized URL format:', profileUrl);
      return { mentions: [], hasMore: false };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const endpoint = type === 'company' ? '/get-company-posts' : '/get-profile-posts';
      const url = `${API_BASE}${endpoint}?linkedin_url=${encodeURIComponent(profileUrl)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`LinkedIn ${type} posts API error (${response.status}):`, text.slice(0, 300));
        return { mentions: [], hasMore: false };
      }

      const data = await response.json();
      const posts: LinkedInPost[] = Array.isArray(data)
        ? data
        : data?.data ?? data?.posts ?? [];

      const mentions: RawMention[] = [];
      for (const post of posts.slice(0, limit)) {
        const mention = this.normalize(post, profileUrl, type);
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
        console.error('Error collecting LinkedIn posts:', err?.message || err);
      }
      return { mentions: [], hasMore: false };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch basic profile/company info to enrich mentions.
   */
  async getProfileInfo(profileUrl: string): Promise<{ name: string; headline: string } | null> {
    if (!this.apiKey) return null;

    const type = this.detectType(profileUrl);
    if (!type) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const endpoint = type === 'company' ? '/get-company-by-linkedinurl' : '/get-linkedin-profile';
      const url = `${API_BASE}${endpoint}?linkedin_url=${encodeURIComponent(profileUrl)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers(),
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = await response.json();

      if (type === 'company') {
        return {
          name: data?.name || data?.company_name || 'Unknown',
          headline: data?.tagline || data?.description || '',
        };
      }

      return {
        name: data?.full_name || data?.first_name || 'Unknown',
        headline: data?.headline || '',
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private normalize(post: LinkedInPost, profileUrl: string, type: 'person' | 'company'): RawMention | null {
    const text = post.text?.trim();
    if (!text) return null;

    const urn = post.urn || '';
    const id = urn || `lnkd-${this.hashCode(text)}`;

    let publishedAt: Date | undefined;
    if (post.posted_timestamp) {
      publishedAt = new Date(post.posted_timestamp);
    } else if (post.time) {
      const parsed = new Date(post.time);
      if (!isNaN(parsed.getTime())) publishedAt = parsed;
    }

    return {
      id: `linkedin-${type}-${id}`,
      platform: 'linkedin',
      content: text,
      author: post.author_name || (type === 'company' ? 'Company' : 'Unknown'),
      authorVerified: false,
      url: post.post_url || post.author_url || profileUrl,
      engagementLikes: post.num_likes ?? post.totalReactionCount ?? 0,
      engagementComments: post.num_comments ?? post.commentsCount ?? 0,
      engagementShares: post.num_reposts ?? post.repostsCount ?? 0,
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
