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

const GENERIC_KEYWORDS = new Set([
  'feriado',
  'oficial',
  'profissao',
  'profissão',
  'historico',
  'histórico',
  'cultural',
  'cultura',
  'religiao',
  'religião',
  'catolico',
  'católico',
  'data',
  'evento',
  'comemoracao',
  'comemoração',
  'comemorativo',
  'comemorativa',
  'comemorativas',
  'datas_comemorativas',
  'celebracao',
  'celebração',
  'festa',
  'natureza',
  'fauna',
  'capital',
  'seguranca',
  'segurança',
  'industria',
  'indústria',
  'civico',
  'cívico',
  'nacional',
  'regional',
  'internacional',
  'mundial',
  'global',
  'institucional',
  'editorial',
  'pauta_livre',
  'orgulho_local',
  'orgulho local',
  'pertencimento',
  'planejamento',
  'promo',
  'promocao',
  'promoção',
  'comunicacao',
  'comunicação',
  'turismo',
  'lazer',
  'arte',
  'comportamental',
  'pauta',
  'celebrativo',
  'datas',
]);

const STOPWORDS = new Set([
  'dia',
  'dias',
  'do',
  'da',
  'dos',
  'das',
  'de',
  'del',
  'della',
  'e',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'para',
  'por',
  'com',
  'sem',
  'a',
  'o',
  'as',
  'os',
  'um',
  'uma',
  'uns',
  'umas',
  'ao',
  'aos',
  'sao',
  'são',
  'santo',
  'santa',
  'sa',
  's/a',
  'ltda',
  'me',
  'eireli',
  'holding',
  'grupo',
  'companhia',
  'empresa',
  'servico',
  'servicos',
  'serviço',
  'serviços',
]);

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

function normalizeList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return normalizeMulti(value);
  }
  return [];
}

function normalizeKeyword(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function cleanKeywordList(list: string[], max = 40) {
  const dedup = new Map<string, string>();
  list.forEach((item) => {
    const raw = String(item || '').trim();
    if (!raw) return;
    const normalized = normalizeKeyword(raw);
    if (!normalized) return;
    if (normalized.length < 3) return;
    if (/^\d+$/.test(normalized)) return;
    if (STOPWORDS.has(normalized)) return;
    if (GENERIC_KEYWORDS.has(normalized)) return;
    if (!dedup.has(normalized)) dedup.set(normalized, raw);
  });
  return Array.from(dedup.values()).slice(0, max);
}

function mergeKeywordLists(base: string[], extra: string[], max = 40) {
  const merged = [...base, ...extra];
  return cleanKeywordList(merged, max);
}

function extractUrlsFromText(text: string) {
  if (!text) return [];
  const urls = Array.from(String(text).matchAll(/https?:\/\/[^\s)]+/gi)).map((match) => match[0]);
  return urls.map((url) => url.replace(/[),.]+$/, ''));
}

function resolveSourceType(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com')) return { type: 'social', platform: 'instagram' };
  if (lower.includes('facebook.com')) return { type: 'social', platform: 'facebook' };
  if (lower.includes('linkedin.com')) return { type: 'social', platform: 'linkedin' };
  if (lower.includes('tiktok.com')) return { type: 'social', platform: 'tiktok' };
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { type: 'social', platform: 'youtube' };
  if (lower.includes('twitter.com') || lower.includes('x.com')) return { type: 'social', platform: 'twitter' };
  if (lower.includes('reddit.com')) return { type: 'social', platform: 'reddit' };
  return { type: 'website', platform: 'website' };
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

    const knowledge = client.profile?.knowledge_base || {};
    const extraFields = [
      knowledge.pages,
      knowledge.urls,
      knowledge.sources,
      knowledge.links,
      knowledge.extra_pages,
      knowledge.extra_urls,
    ];
    const extraUrls = [
      ...extraFields.flatMap((field: any) => normalizeList(field)),
      ...extractUrlsFromText(knowledge.description || ''),
      ...extractUrlsFromText(knowledge.notes || ''),
      ...extractUrlsFromText(knowledge.differentiators || ''),
    ];
    const trendSources = normalizeList(client.profile?.trend_profile?.sources || []);
    extraUrls.push(...trendSources);

    const normalizedExtras = Array.from(
      new Set(extraUrls.map((item) => normalizeUrl(item)).filter(Boolean))
    );
    for (const url of normalizedExtras) {
      const resolved = resolveSourceType(url);
      await upsertClientSource({
        tenantId: this.tenantId,
        clientId,
        source_type: resolved.type,
        platform: resolved.platform,
        url,
        handle: resolved.type === 'social' ? normalizeHandle(url) : null,
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

    const scoreDoc = (doc: any) => {
      const url = String(doc.url || '').toLowerCase();
      let score = 0;
      if (doc.source_type === 'website') score += 40;
      if (doc.source_type === 'sitemap') score += 30;
      if (doc.source_type === 'rss') score += 20;
      if (url.endsWith('/')) score += 5;
      if (url.includes('/sobre') || url.includes('quem-somos')) score += 30;
      if (url.includes('institucional') || url.includes('empresa')) score += 20;
      if (url.includes('servicos') || url.includes('serviços') || url.includes('solucoes') || url.includes('soluções')) {
        score += 18;
      }
      if (url.includes('produtos') || url.includes('portfolio')) score += 18;
      if (url.includes('concess')) score += 18;
      if (url.includes('infraestrutura')) score += 15;
      if (url.includes('sustentabilidade') || url.includes('esg')) score += 12;
      if (url.includes('investidores') || url.includes('relatorio') || url.includes('relatório')) score += 10;
      if (url.includes('contato')) score += 8;
      if (url.includes('blog') || url.includes('noticia') || url.includes('notícia') || url.includes('news')) {
        score += 6;
      }
      if (url.includes('privacidade') || url.includes('cookies') || url.includes('termos')) score -= 40;
      return score;
    };

    const prioritizedDocs = [...docs].sort((a, b) => scoreDoc(b) - scoreDoc(a));

    const content = prioritizedDocs
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
risks (array), strategic_terms (array), brand_entities (array),
hashtags (array), must_mentions (array), approved_terms (array), forbidden_claims (array),
strategic_notes (array), summary_text (string).
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

    const normalizedSummary: Record<string, any> = { ...(parsed || {}) };
    const normalizeFieldList = (value: any) => normalizeList(value);

    normalizedSummary.language = normalizeFieldList(normalizedSummary.language);
    normalizedSummary.territories = normalizeFieldList(normalizedSummary.territories);
    normalizedSummary.channels = normalizeFieldList(normalizedSummary.channels);
    normalizedSummary.products = normalizeFieldList(normalizedSummary.products);
    normalizedSummary.services = normalizeFieldList(normalizedSummary.services);
    normalizedSummary.personas = normalizeFieldList(normalizedSummary.personas);
    normalizedSummary.qualitative_insights = normalizeFieldList(normalizedSummary.qualitative_insights);
    normalizedSummary.quantitative_signals = normalizeFieldList(normalizedSummary.quantitative_signals);
    normalizedSummary.keywords = normalizeFieldList(normalizedSummary.keywords);
    normalizedSummary.pillars = normalizeFieldList(normalizedSummary.pillars);
    normalizedSummary.competitors = normalizeFieldList(normalizedSummary.competitors);
    normalizedSummary.opportunities = normalizeFieldList(normalizedSummary.opportunities);
    normalizedSummary.risks = normalizeFieldList(normalizedSummary.risks);
    normalizedSummary.strategic_terms = normalizeFieldList(normalizedSummary.strategic_terms);
    normalizedSummary.brand_entities = normalizeFieldList(normalizedSummary.brand_entities);
    normalizedSummary.hashtags = normalizeFieldList(normalizedSummary.hashtags);
    normalizedSummary.must_mentions = normalizeFieldList(normalizedSummary.must_mentions);
    normalizedSummary.approved_terms = normalizeFieldList(normalizedSummary.approved_terms);
    normalizedSummary.forbidden_claims = normalizeFieldList(normalizedSummary.forbidden_claims);
    normalizedSummary.strategic_notes = normalizeFieldList(normalizedSummary.strategic_notes);

    const summary = {
      ...normalizedSummary,
      sources: docs.length,
      updated_at: new Date().toISOString(),
    };

    await insertClientInsight({
      tenantId: this.tenantId,
      clientId,
      summary,
    });

    // Update client profile knowledge base with intelligence summary
    const { rows } = await query<any>(`SELECT name, profile FROM clients WHERE tenant_id=$1 AND id=$2`, [
      this.tenantId,
      clientId,
    ]);
    const row = rows[0];
    const clientName = row?.name ? String(row.name) : '';
    const profile = row?.profile || {};
    const knowledge = profile.knowledge_base || {};
    knowledge.intelligence = {
      summary,
      summary_text: summary.summary_text || '',
      updated_at: summary.updated_at,
    };
    knowledge.ai = {
      ...knowledge.ai,
      summary,
      updated_at: summary.updated_at,
    };

    const fillField = (key: string, value: any) => {
      if (!value) return;
      const current = knowledge[key];
      if (Array.isArray(value)) {
        if (!Array.isArray(current) || current.length === 0) knowledge[key] = value;
        return;
      }
      if (typeof value === 'string') {
        if (!current || String(current).trim() === '') knowledge[key] = value;
      }
    };

    fillField('industry', summary.industry);
    fillField('business', summary.business);
    fillField('positioning', summary.positioning);
    fillField('audience', summary.audience);
    fillField('territories', summary.territories);
    fillField('channels', summary.channels);
    fillField('products', summary.products);
    fillField('services', summary.services);
    fillField('personas', summary.personas);
    fillField('competitors', summary.competitors);
    fillField('opportunities', summary.opportunities);
    fillField('risks', summary.risks);
    fillField('keywords', summary.keywords);
    fillField('pillars', summary.pillars);
    fillField('hashtags', summary.hashtags);
    fillField('must_mentions', summary.must_mentions);
    fillField('approved_terms', summary.approved_terms);
    fillField('forbidden_claims', summary.forbidden_claims);
    fillField('notes', Array.isArray(summary.strategic_notes) ? summary.strategic_notes.join('\n') : summary.strategic_notes);

    const derivedKeywords = cleanKeywordList([
      ...normalizeList(summary.keywords),
      ...normalizeList(summary.pillars),
      ...normalizeList(summary.strategic_terms),
      ...normalizeList(summary.brand_entities),
      ...normalizeList(summary.hashtags),
      ...normalizeList(summary.must_mentions),
      ...normalizeList(summary.approved_terms),
      ...normalizeList(summary.products),
      ...normalizeList(summary.services),
      ...normalizeList(summary.channels),
      ...normalizeList(summary.territories),
      ...normalizeList(summary.competitors),
      ...(summary.industry ? [summary.industry] : []),
      ...(summary.business ? [summary.business] : []),
      ...(summary.positioning ? [summary.positioning] : []),
      ...(clientName ? [clientName] : []),
    ]);

    const derivedPillars = cleanKeywordList(
      [
        ...normalizeList(summary.pillars),
        ...normalizeList(summary.qualitative_insights),
        ...normalizeList(summary.opportunities),
      ],
      20
    );

    profile.keywords = mergeKeywordLists(normalizeList(profile.keywords), derivedKeywords, 50);
    if (normalizeList(profile.pillars).length) {
      profile.pillars = mergeKeywordLists(normalizeList(profile.pillars), derivedPillars, 25);
    } else {
      profile.pillars = derivedPillars;
    }

    profile.knowledge_base = knowledge;

    await query(`UPDATE clients SET profile=$3::jsonb, updated_at=NOW() WHERE tenant_id=$1 AND id=$2`, [
      this.tenantId,
      clientId,
      JSON.stringify(profile),
    ]);
  }
}
