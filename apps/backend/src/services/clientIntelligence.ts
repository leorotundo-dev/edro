import crypto from 'crypto';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { query } from '../db';
import { UrlScraper } from '../clipping/urlScraper';
import { generateCopy } from './ai/copyService';
import { getClientById } from '../repos/clientsRepo';
import {
  insertClientDocument,
  insertClientInsight,
  hasClientDocumentHash,
  listClientDocuments,
  listClientSources,
  updateClientSource,
  upsertClientSource,
} from '../repos/clientIntelligenceRepo';
import { MetaFacebookCollector } from '../socialListening/MetaFacebookCollector';
import { MetaInstagramCollector } from '../socialListening/MetaInstagramCollector';
import { RedditCollector } from '../socialListening/RedditCollector';
import { LinkedInCollector } from '../socialListening/LinkedInCollector';
import { TikTokCollector } from '../socialListening/TikTokCollector';
import { YouTubeCollector } from '../socialListening/YouTubeCollector';
import { TwitterCollector } from '../socialListening/TwitterCollector';
import { getMetaConnector } from '../socialListening/metaConnector';

type ClientRow = {
  id: string;
  name: string;
  tenant_id: string;
  profile?: Record<string, any> | null;
};

const DEFAULT_MAX_URLS = Number(process.env.CLIENT_INTEL_MAX_URLS || 60);
const DEFAULT_MAX_DOCS = Number(process.env.CLIENT_INTEL_MAX_DOCS || 80);
const DEFAULT_MAX_CHARS = Number(process.env.CLIENT_INTEL_MAX_CHARS || 20000);

type SocialProfile = Record<string, string[]>;

const SOCIAL_PLATFORM_MAP: Record<string, string> = {
  instagram: 'instagram',
  facebook: 'facebook',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
  youtube: 'youtube',
  x: 'twitter',
  twitter: 'twitter',
  reddit: 'reddit',
};

const SOCIAL_COLLECTORS = {
  twitter: new TwitterCollector(),
  youtube: new YouTubeCollector(),
  tiktok: new TikTokCollector(),
  reddit: new RedditCollector(),
  linkedin: new LinkedInCollector(),
};

const rssParser = new Parser();

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeHandle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@')) return trimmed.slice(1);
  return trimmed.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function normalizeMulti(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeJsonParse(text: string): Record<string, any> | null {
  const trimmed = String(text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function hashText(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function extractSocials(profile?: Record<string, any> | null): SocialProfile {
  const knowledge = profile?.knowledge_base || {};
  const socials = knowledge.social_profiles || knowledge.socials || {};
  const result: SocialProfile = {};
  Object.entries(socials || {}).forEach(([key, value]) => {
    const text = String(value || '').trim();
    if (text) result[key] = normalizeMulti(text);
  });
  return result;
}

async function discoverRssLinks(url: string) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const $ = cheerio.load(response.data);
    const links: string[] = [];
    $('link[rel="alternate"][type*="rss"], link[rel="alternate"][type*="atom"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const resolved = new URL(href, url).toString();
      links.push(resolved);
    });
    return [...new Set(links)];
  } catch {
    return [];
  }
}

async function fetchSitemapUrls(baseUrl: string, limit: number) {
  const urls: string[] = [];
  const candidates = ['sitemap.xml', 'sitemap_index.xml'].map((path) =>
    new URL(path, baseUrl).toString()
  );

  for (const sitemapUrl of candidates) {
    try {
      const response = await axios.get(sitemapUrl, { timeout: 15000 });
      const content = String(response.data || '');
      const locs = Array.from(content.matchAll(/<loc>([^<]+)<\/loc>/gi)).map((match) =>
        match[1].trim()
      );
      if (!locs.length) continue;
      if (locs.some((loc) => loc.endsWith('.xml'))) {
        for (const nested of locs.slice(0, 5)) {
          try {
            const nestedResponse = await axios.get(nested, { timeout: 15000 });
            const nestedContent = String(nestedResponse.data || '');
            const nestedLocs = Array.from(nestedContent.matchAll(/<loc>([^<]+)<\/loc>/gi)).map(
              (match) => match[1].trim()
            );
            urls.push(...nestedLocs);
          } catch {
            continue;
          }
        }
      } else {
        urls.push(...locs);
      }
    } catch {
      continue;
    }
  }

  return urls.filter(Boolean).slice(0, limit);
}

async function fetchRssItems(rssUrl: string, limit: number) {
  try {
    const feed = await rssParser.parseURL(rssUrl);
    return (feed.items || []).slice(0, limit);
  } catch {
    return [];
  }
}

export class ClientIntelligenceService {
  private tenantId: string;
  private scraper: UrlScraper;
  private metaFacebook: MetaFacebookCollector;
  private metaInstagram: MetaInstagramCollector;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.scraper = new UrlScraper({ useReadability: true });
    this.metaFacebook = new MetaFacebookCollector();
    this.metaInstagram = new MetaInstagramCollector();
  }

  async syncSourcesFromProfile(clientId: string) {
    const client = (await getClientById(this.tenantId, clientId)) as ClientRow | null;
    if (!client) throw new Error('client_not_found');

    const website = normalizeUrl(client.profile?.knowledge_base?.website || '');
    if (website) {
      await upsertClientSource({
        tenantId: this.tenantId,
        clientId,
        source_type: 'website',
        platform: 'website',
        url: website,
        status: 'active',
      });
    }

    const socials = extractSocials(client.profile);
    for (const [key, rawList] of Object.entries(socials)) {
      const platform = SOCIAL_PLATFORM_MAP[key];
      if (!platform) continue;
      for (const raw of rawList) {
        const url = normalizeUrl(raw);
        const handle = normalizeHandle(raw);
        await upsertClientSource({
          tenantId: this.tenantId,
          clientId,
          source_type: 'social',
          platform,
          url: url || raw,
          handle,
          status: 'active',
        });
      }
    }
  }

  async refreshClient(clientId: string) {
    await this.syncSourcesFromProfile(clientId);
    const sources = await listClientSources({ tenantId: this.tenantId, clientId });
    for (const source of sources) {
      try {
        if (source.source_type === 'website') {
          await this.ingestWebsiteSource(source, clientId);
        } else if (source.source_type === 'social') {
          await this.ingestSocialSource(source, clientId);
        }
      } catch (error: any) {
        const message = error?.message || 'Falha ao coletar fonte.';
        await updateClientSource({
          tenantId: this.tenantId,
          id: source.id,
          status: message.includes('AUTH') || message.includes('auth') ? 'auth_required' : 'error',
          lastFetchedAt: new Date(),
          metadata: {
            ...(source.metadata || {}),
            last_error: message,
            last_error_at: new Date().toISOString(),
          },
        });
      }
    }
    try {
      await this.updateInsights(clientId);
    } catch (error) {
      // log and continue; insights will retry on next run
      console.error('client_intelligence_update_failed', error);
    }
  }

  private async ingestWebsiteSource(source: any, clientId: string) {
    const baseUrl = normalizeUrl(source.url);
    if (!baseUrl) return;
    let main: any;
    try {
      main = await this.scraper.scrape(baseUrl);
    } catch (error: any) {
      const message = error?.message || 'Falha ao coletar site.';
      await updateClientSource({
        tenantId: this.tenantId,
        id: source.id,
        status: 'error',
        lastFetchedAt: new Date(),
        metadata: {
          ...(source.metadata || {}),
          last_error: message,
          last_error_at: new Date().toISOString(),
        },
      });
      return;
    }

    const mainHash = hashText(`${main.title}\n${main.contentText}`);
    if (mainHash !== source.last_hash) {
      const exists = await hasClientDocumentHash({
        tenantId: this.tenantId,
        clientId,
        contentHash: mainHash,
      });
      if (!exists) {
        await insertClientDocument({
        tenantId: this.tenantId,
        clientId,
        sourceId: source.id,
        sourceType: 'website',
        platform: 'website',
        url: main.url,
        title: main.title,
        contentText: main.contentText,
        contentExcerpt: main.excerpt,
        language: main.metadata?.openGraph?.locale || null,
        publishedAt: main.publishedAt || null,
        contentHash: mainHash,
        metadata: {
          siteName: main.siteName,
          tags: main.tags || [],
        },
      });
      }
    }

    const rssLinks = await discoverRssLinks(baseUrl);
    for (const rssUrl of rssLinks.slice(0, 3)) {
      const items = await fetchRssItems(rssUrl, 10);
      for (const item of items) {
        const content = String(item.contentSnippet || item.content || '').trim();
        if (!content) continue;
        const hash = hashText(`${item.title || ''}\n${content}`);
        const exists = await hasClientDocumentHash({
          tenantId: this.tenantId,
          clientId,
          contentHash: hash,
        });
        if (exists) continue;
        await insertClientDocument({
          tenantId: this.tenantId,
          clientId,
          sourceId: source.id,
          sourceType: 'rss',
          platform: 'website',
          url: item.link,
          title: item.title || null,
          contentText: content,
          contentExcerpt: content.slice(0, 200),
          language: (item as any).language || null,
          publishedAt: item.pubDate ? new Date(item.pubDate) : null,
          contentHash: hash,
          metadata: { feed: rssUrl },
        });
      }
    }

    const sitemapUrls = await fetchSitemapUrls(baseUrl, DEFAULT_MAX_URLS);
    for (const url of sitemapUrls) {
      try {
        const scraped = await this.scraper.scrape(url);
        const hash = hashText(`${scraped.title}\n${scraped.contentText}`);
        const exists = await hasClientDocumentHash({
          tenantId: this.tenantId,
          clientId,
          contentHash: hash,
        });
        if (exists) continue;
        await insertClientDocument({
          tenantId: this.tenantId,
          clientId,
          sourceId: source.id,
          sourceType: 'sitemap',
          platform: 'website',
          url: scraped.url,
          title: scraped.title,
          contentText: scraped.contentText,
          contentExcerpt: scraped.excerpt,
          language: scraped.metadata?.openGraph?.locale || null,
          publishedAt: scraped.publishedAt || null,
          contentHash: hash,
          metadata: { siteName: scraped.siteName },
        });
      } catch {
        continue;
      }
    }

    await updateClientSource({
      tenantId: this.tenantId,
      id: source.id,
      status: 'active',
      lastHash: mainHash,
      lastFetchedAt: new Date(),
      lastContentAt: main.publishedAt || new Date(),
    });
  }

  private async ingestSocialSource(source: any, clientId: string) {
    const platform = source.platform || '';
    const handle = source.handle || source.url || '';
    const limit = 15;

    if (platform === 'instagram' || platform === 'facebook') {
      const metaConfig = await getMetaConnector(this.tenantId, clientId);
      if (!metaConfig?.accessToken) {
        await updateClientSource({
          tenantId: this.tenantId,
          id: source.id,
          status: 'auth_required',
          lastFetchedAt: new Date(),
        });
        return;
      }
      try {
        if (platform === 'instagram') {
          if (!metaConfig.instagramBusinessId) return;
          const result = await this.metaInstagram.collect('', limit, undefined, {
            accessToken: metaConfig.accessToken,
            instagramBusinessId: metaConfig.instagramBusinessId,
          });
          for (const mention of result.mentions || []) {
            const hash = hashText(`${mention.id}\n${mention.content}`);
            const exists = await hasClientDocumentHash({
              tenantId: this.tenantId,
              clientId,
              contentHash: hash,
            });
            if (exists) continue;
            await insertClientDocument({
              tenantId: this.tenantId,
              clientId,
              sourceId: source.id,
              sourceType: 'social',
              platform: 'instagram',
              url: mention.url,
              title: mention.author || null,
              contentText: mention.content,
              contentExcerpt: mention.content?.slice(0, 200),
              language: mention.language || null,
              publishedAt: mention.publishedAt || null,
              contentHash: hash,
              metadata: {
                likes: mention.engagementLikes,
                comments: mention.engagementComments,
              },
            });
          }
        } else if (platform === 'facebook') {
          if (!metaConfig.pageId) return;
          const result = await this.metaFacebook.collect('', limit, undefined, {
            accessToken: metaConfig.accessToken,
            pageId: metaConfig.pageId,
          });
          for (const mention of result.mentions || []) {
            const hash = hashText(`${mention.id}\n${mention.content}`);
            const exists = await hasClientDocumentHash({
              tenantId: this.tenantId,
              clientId,
              contentHash: hash,
            });
            if (exists) continue;
            await insertClientDocument({
              tenantId: this.tenantId,
              clientId,
              sourceId: source.id,
              sourceType: 'social',
              platform: 'facebook',
              url: mention.url,
              title: mention.author || null,
              contentText: mention.content,
              contentExcerpt: mention.content?.slice(0, 200),
              language: mention.language || null,
              publishedAt: mention.publishedAt || null,
              contentHash: hash,
              metadata: {
                likes: mention.engagementLikes,
                comments: mention.engagementComments,
                shares: mention.engagementShares,
              },
            });
          }
        }
      } catch (error: any) {
        const message = error?.message || 'Falha ao coletar rede social.';
        await updateClientSource({
          tenantId: this.tenantId,
          id: source.id,
          status: message.includes('SOCIAL_DATA_API_NOT_CONFIGURED') ? 'auth_required' : 'error',
          lastFetchedAt: new Date(),
          metadata: {
            ...(source.metadata || {}),
            last_error: message,
            last_error_at: new Date().toISOString(),
          },
        });
        return;
      }
    } else {
      const collector = (SOCIAL_COLLECTORS as any)[platform];
      if (!collector) return;
      const keyword = handle || source.url || '';
      try {
        const result = await collector.collect(keyword, limit);
        for (const mention of result.mentions || []) {
          const hash = hashText(`${mention.id}\n${mention.content}`);
          const exists = await hasClientDocumentHash({
            tenantId: this.tenantId,
            clientId,
            contentHash: hash,
          });
          if (exists) continue;
          await insertClientDocument({
            tenantId: this.tenantId,
            clientId,
            sourceId: source.id,
            sourceType: 'social',
            platform,
            url: mention.url,
            title: mention.author || null,
            contentText: mention.content,
            contentExcerpt: mention.content?.slice(0, 200),
            language: mention.language || null,
            publishedAt: mention.publishedAt || null,
            contentHash: hash,
            metadata: {
              likes: mention.engagementLikes,
              comments: mention.engagementComments,
              shares: mention.engagementShares,
              views: mention.engagementViews,
            },
          });
        }
      } catch (error: any) {
        const message = error?.message || 'Falha ao coletar rede social.';
        await updateClientSource({
          tenantId: this.tenantId,
          id: source.id,
          status: message.includes('SOCIAL_DATA_API_NOT_CONFIGURED') ? 'auth_required' : 'error',
          lastFetchedAt: new Date(),
          metadata: {
            ...(source.metadata || {}),
            last_error: message,
            last_error_at: new Date().toISOString(),
          },
        });
        return;
      }
    }

    await updateClientSource({
      tenantId: this.tenantId,
      id: source.id,
      status: 'active',
      lastFetchedAt: new Date(),
    });
  }

  private async updateInsights(clientId: string) {
    const docs = await listClientDocuments({
      tenantId: this.tenantId,
      clientId,
      limit: DEFAULT_MAX_DOCS,
    });
    if (!docs.length) return;

    const content = docs
      .map((doc) => `URL: ${doc.url || 'n/a'}\nTITULO: ${doc.title || ''}\nTEXTO: ${doc.content_text || ''}`)
      .join('\n\n---\n\n')
      .slice(0, DEFAULT_MAX_CHARS);

    const systemPrompt = `
Você é um analista de inteligência de marca. Leia os conteúdos e produza um resumo estruturado.
Responda SOMENTE em JSON válido (sem markdown) com as chaves:
language (array), territories (array), industry (string), business (string), channels (array),
products (array), services (array), audience (string), personas (array), positioning (string),
tone (string), qualitative_insights (array), quantitative_signals (array),
keywords (array), pillars (array), competitors (array), opportunities (array),
risks (array), summary_text (string).
`;

    const prompt = `Conteúdos:\n${content}\n\nRetorne apenas JSON.`;
    let rawText = '';
    let parsed: Record<string, any> | null = null;

    const attemptGenerate = async (params: {
      forceProvider?: 'openai' | 'gemini' | 'claude';
    }) => {
      const raw = await generateCopy({
        prompt,
        systemPrompt,
        taskType: 'briefing_analysis',
        temperature: 0.2,
        maxTokens: 900,
        ...(params.forceProvider ? { forceProvider: params.forceProvider } : {}),
      });
      rawText = raw?.output || '';
      parsed = safeJsonParse(rawText);
      return { raw, parsed };
    };

    try {
      await attemptGenerate({});
    } catch (error: any) {
      rawText = '';
      parsed = null;
    }

    if (!parsed || Object.keys(parsed).length === 0) {
      const fallbackProviders: Array<'openai' | 'claude'> = ['openai', 'claude'];
      for (const provider of fallbackProviders) {
        try {
          const attempt = await attemptGenerate({ forceProvider: provider });
          if (attempt.parsed && Object.keys(attempt.parsed).length) break;
        } catch (error) {
          continue;
        }
      }
    }

    if (!parsed || Object.keys(parsed).length === 0) {
      parsed = {
        summary_text: rawText || 'Resumo indisponível no momento.',
      };
    }

    const summary = {
      ...parsed,
      sources: docs.length,
      updated_at: new Date().toISOString(),
    };

    await insertClientInsight({
      tenantId: this.tenantId,
      clientId,
      summary,
    });

    // Update client profile knowledge base with intelligence summary
    const { rows } = await query<any>(`SELECT profile FROM clients WHERE tenant_id=$1 AND id=$2`, [
      this.tenantId,
      clientId,
    ]);
    const row = rows[0];
    const profile = row?.profile || {};
    const knowledge = profile.knowledge_base || {};
    knowledge.intelligence = {
      summary,
      summary_text: summary.summary_text || '',
      updated_at: summary.updated_at,
    };
    profile.knowledge_base = knowledge;

    await query(`UPDATE clients SET profile=$3::jsonb, updated_at=NOW() WHERE tenant_id=$1 AND id=$2`, [
      this.tenantId,
      clientId,
      JSON.stringify(profile),
    ]);
  }
}
