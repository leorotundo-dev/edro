import axios, { type AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export type ScrapedContent = {
  url: string;
  title: string;
  author?: string;
  publishedAt?: Date;
  excerpt?: string;
  contentText: string;
  contentHtml?: string;
  imageUrl?: string;
  siteName?: string;
  tags?: string[];
  metadata: {
    openGraph?: Record<string, string>;
    twitterCard?: Record<string, string>;
    jsonLd?: any[];
  };
};

export type ScraperOptions = {
  timeout?: number;
  maxRetries?: number;
  userAgent?: string;
  followRedirects?: boolean;
  extractImages?: boolean;
  useReadability?: boolean;
};

const DEFAULT_OPTIONS: ScraperOptions = {
  timeout: 30000,
  maxRetries: 3,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  followRedirects: true,
  extractImages: true,
  useReadability: true,
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
];

export class UrlScraper {
  private options: ScraperOptions;
  private lastRequest: Map<string, number> = new Map();

  constructor(options: Partial<ScraperOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async scrape(url: string): Promise<ScrapedContent> {
    await this.rateLimit(url);

    let html: string;
    let finalUrl: string;

    const response = await this.fetchWithRetry(url);
    html = response.data;
    finalUrl = response.finalUrl || url;

    const $ = cheerio.load(html);
    const metadata = this.extractMetadata($);

    let contentText = '';
    let contentHtml = '';

    if (this.options.useReadability) {
      const readabilityResult = this.extractWithReadability(html, finalUrl);
      if (readabilityResult) {
        contentText = readabilityResult.textContent;
        contentHtml = readabilityResult.content;
      }
    }

    if (!contentText) {
      contentText = this.extractMainContent($);
    }

    const title = this.extractTitle($, metadata);
    const author = this.extractAuthor($, metadata);
    const publishedAt = this.extractPublishedDate($, metadata);
    const excerpt = this.extractExcerpt($, metadata, contentText);
    const imageUrl = this.extractMainImage($, metadata);
    const siteName = this.extractSiteName($, metadata, finalUrl);
    const tags = this.extractTags($);

    return {
      url: finalUrl,
      title,
      author,
      publishedAt,
      excerpt,
      contentText,
      contentHtml,
      imageUrl,
      siteName,
      tags,
      metadata,
    };
  }

  private async fetchWithRetry(url: string, attempt = 1): Promise<{ data: string; finalUrl?: string }> {
    const config: AxiosRequestConfig = {
      timeout: this.options.timeout,
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      maxRedirects: this.options.followRedirects ? 5 : 0,
      validateStatus: (status) => status >= 200 && status < 400,
    };

    try {
      const response = await axios.get(url, config);
      return {
        data: response.data,
        finalUrl: response.request?.res?.responseUrl || url,
      };
    } catch (error: any) {
      if (attempt >= (this.options.maxRetries || 3)) {
        throw error;
      }
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await this.sleep(delay);
      return this.fetchWithRetry(url, attempt + 1);
    }
  }

  private async rateLimit(url: string): Promise<void> {
    const domain = new URL(url).hostname;
    const now = Date.now();
    const lastReq = this.lastRequest.get(domain) || 0;
    const timeSinceLastReq = now - lastReq;

    if (timeSinceLastReq < 1000) {
      await this.sleep(1000 - timeSinceLastReq);
    }

    this.lastRequest.set(domain, Date.now());
  }

  private extractMetadata($: cheerio.CheerioAPI): ScrapedContent['metadata'] {
    const metadata: ScrapedContent['metadata'] = {
      openGraph: {},
      twitterCard: {},
      jsonLd: [],
    };

    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property')?.replace('og:', '');
      const content = $(el).attr('content');
      if (property && content) {
        metadata.openGraph![property] = content;
      }
    });

    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name')?.replace('twitter:', '');
      const content = $(el).attr('content');
      if (name && content) {
        metadata.twitterCard![name] = content;
      }
    });

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        metadata.jsonLd!.push(json);
      } catch {
        // ignore invalid JSON
      }
    });

    return metadata;
  }

  private extractWithReadability(
    html: string,
    url: string
  ): { textContent: string; content: string } | null {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (article) {
        return {
          textContent: article.textContent,
          content: article.content,
        };
      }
    } catch (error) {
      console.error('Readability extraction failed:', error);
    }

    return null;
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    $('script, style, nav, header, footer, aside, .ad, .advertisement, .social-share, .comments').remove();

    const selectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      'main',
      '#content',
    ];

    for (const selector of selectors) {
      const content = $(selector).text().trim();
      if (content.length > 200) {
        return this.cleanText(content);
      }
    }

    return this.cleanText($('body').text());
  }

  private extractTitle($: cheerio.CheerioAPI, metadata: ScrapedContent['metadata']): string {
    return (
      metadata.openGraph?.title ||
      metadata.twitterCard?.title ||
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      'Sem título'
    );
  }

  private extractAuthor($: cheerio.CheerioAPI, metadata: ScrapedContent['metadata']): string | undefined {
    const author =
      metadata.openGraph?.author ||
      $('meta[name="author"]').attr('content') ||
      $('[rel="author"]').text().trim() ||
      $('.author').first().text().trim() ||
      $('[itemprop="author"]').text().trim();

    return author || undefined;
  }

  private extractPublishedDate(
    $: cheerio.CheerioAPI,
    metadata: ScrapedContent['metadata']
  ): Date | undefined {
    const dateStr =
      metadata.openGraph?.published_time ||
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="publish-date"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      $('[itemprop="datePublished"]').attr('content');

    if (dateStr) {
      const date = new Date(dateStr);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    return undefined;
  }

  private extractExcerpt(
    $: cheerio.CheerioAPI,
    metadata: ScrapedContent['metadata'],
    contentText: string
  ): string | undefined {
    const excerpt =
      metadata.openGraph?.description ||
      metadata.twitterCard?.description ||
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content');

    if (excerpt) {
      return this.cleanText(excerpt);
    }

    if (contentText.length > 200) {
      return `${contentText.substring(0, 200).trim()}...`;
    }

    return undefined;
  }

  private extractMainImage($: cheerio.CheerioAPI, metadata: ScrapedContent['metadata']): string | undefined {
    return (
      metadata.openGraph?.image ||
      metadata.twitterCard?.image ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('article img').first().attr('src') ||
      $('img').first().attr('src')
    );
  }

  private extractSiteName(
    $: cheerio.CheerioAPI,
    metadata: ScrapedContent['metadata'],
    url: string
  ): string | undefined {
    return metadata.openGraph?.site_name || $('meta[property="og:site_name"]').attr('content') || new URL(url).hostname;
  }

  private extractTags($: cheerio.CheerioAPI): string[] {
    const keywords = $('meta[name="keywords"]').attr('content');
    if (keywords) {
      return keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
    }

    const tags: string[] = [];
    $('a[rel="tag"], .tag, .tags a').each((_, el) => {
      const tag = $(el).text().trim();
      if (tag) tags.push(tag);
    });

    return [...new Set(tags)];
  }

  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
  }

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
