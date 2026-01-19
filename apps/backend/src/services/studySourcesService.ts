import { load } from 'cheerio';
import { fetchHtml } from '../adapters/harvest/fetchHtml';
import { generateJSON } from './ai/openaiService';

type SourceCandidate = {
  url: string;
  title?: string;
  snippet?: string;
};

export type StudySource = {
  url: string;
  title: string;
  excerpt: string;
  image_url?: string;
};

type StudySourceOptions = {
  expandQueries?: boolean;
  provider?: string;
  limit?: number;
  fetchTimeoutMs?: number;
  textLimit?: number;
};

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SOURCE_LIMIT = toPositiveInt(process.env.STUDY_SOURCES_MAX, 5);
const SOURCE_TEXT_LIMIT = toPositiveInt(process.env.STUDY_SOURCE_TEXT_LIMIT, 6000);
const SOURCE_FETCH_TIMEOUT_MS = toPositiveInt(process.env.STUDY_SOURCE_FETCH_TIMEOUT_MS, 12000);
const QUERY_AI_ENABLED = process.env.STUDY_QUERY_AI !== 'false';
const SOURCE_PROVIDER = process.env.STUDY_SOURCE_PROVIDER || 'duckduckgo';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

const BLOCKED_HOSTS = new Set([
  'amazon.com',
  'amazon.com.br',
  'mercadolivre.com.br',
  'shopee.com.br',
  'shopee.com',
  'pinterest.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'm.youtube.com',
]);

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'igshid',
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function limitText(value: string, limit: number) {
  if (value.length <= limit) return value;
  return value.slice(0, limit).trim();
}

function normalizeSearchUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl, 'https://duckduckgo.com');
    if (url.hostname === 'duckduckgo.com' && url.pathname === '/l/') {
      const target = url.searchParams.get('uddg');
      if (target) return decodeURIComponent(target);
    }
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function isBlockedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return BLOCKED_HOSTS.has(host);
  } catch {
    return true;
  }
}

function sanitizeUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    TRACKING_PARAMS.forEach((param) => url.searchParams.delete(param));
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchHtmlWithTimeout(url: string, timeoutMs: number) {
  const timer = new Promise<string>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error('fetch_timeout'));
    }, timeoutMs);
  });

  return Promise.race([fetchHtml(url), timer]);
}

function extractTextFromHtml(html: string, baseUrl: string) {
  const $ = load(html);
  $('script,style,noscript,svg,canvas').remove();
  const title = normalizeWhitespace($('title').first().text() || '');
  const rawImage =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('link[rel="image_src"]').attr('href') ||
    null;
  let imageUrl: string | null = null;
  if (rawImage) {
    try {
      imageUrl = new URL(rawImage, baseUrl).toString();
    } catch {
      imageUrl = null;
    }
  }
  const bodyText = normalizeWhitespace($('body').text() || '');
  return {
    title: title || 'Fonte',
    text: bodyText,
    imageUrl,
  };
}

async function searchGoogle(query: string, limit: number): Promise<SourceCandidate[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    return [];
  }
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', GOOGLE_API_KEY);
  url.searchParams.set('cx', GOOGLE_CSE_ID);
  url.searchParams.set('q', query);
  url.searchParams.set('hl', 'pt');
  url.searchParams.set('gl', 'br');
  url.searchParams.set('num', String(Math.min(limit, 10)));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`google_search_error_${response.status}`);
  }
  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .map((item: any) => ({
      url: String(item?.link || ''),
      title: item?.title ? String(item.title) : undefined,
      snippet: item?.snippet ? String(item.snippet) : undefined,
    }))
    .filter((item) => item.url);
}

async function searchDuckDuckGo(query: string, limit: number, timeoutMs: number): Promise<SourceCandidate[]> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=br-pt`;
  const html = await fetchHtmlWithTimeout(url, timeoutMs);
  const $ = load(html);
  const results: SourceCandidate[] = [];

  $('a.result-link').each((_idx, el) => {
    if (results.length >= limit) return;
    const href = $(el).attr('href');
    const normalized = normalizeSearchUrl(href);
    if (!normalized) return;
    const title = normalizeWhitespace($(el).text() || '');
    if (!title || title.length < 4) return;
    const snippet = normalizeWhitespace(
      $(el).closest('tr').nextAll('tr').find('td.result-snippet').first().text() || ''
    );
    results.push({ url: normalized, title, snippet });
  });

  return results;
}

async function expandQueries(topic: string, enableAi: boolean): Promise<string[]> {
  if (!enableAi) return [topic];
  try {
    const prompt = `Crie ate 3 consultas de busca curtas para encontrar fontes sobre:\n"${topic}".\nRetorne JSON com { "queries": ["..."] }.`;
    const result = await generateJSON({ prompt, temperature: 0.2 });
    const queries = Array.isArray(result?.queries)
      ? result.queries.map((q: any) => String(q).trim()).filter(Boolean)
      : [];
    if (queries.length >= 2) return queries;
    return Array.from(new Set([topic, ...queries, `${topic} pdf`, `${topic} site:gov.br`]));
  } catch {
    return [topic, `${topic} pdf`, `${topic} site:gov.br`];
  }
}

export async function collectStudySources(
  topic: string,
  options: StudySourceOptions = {}
): Promise<StudySource[]> {
  const provider = options.provider ?? SOURCE_PROVIDER;
  if (provider === 'off') return [];

  const limit = options.limit ?? SOURCE_LIMIT;
  const textLimit = options.textLimit ?? SOURCE_TEXT_LIMIT;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? SOURCE_FETCH_TIMEOUT_MS;
  const expand = options.expandQueries ?? QUERY_AI_ENABLED;

  const queries = await expandQueries(topic, expand);
  const candidates: SourceCandidate[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    let results: SourceCandidate[] = [];
    if (provider === 'google') {
      results = await searchGoogle(query, Math.min(limit * 2, 10));
    } else if (provider === 'duckduckgo') {
      results = await searchDuckDuckGo(query, limit * 2, fetchTimeoutMs);
    }
    for (const result of results) {
      const sanitized = sanitizeUrl(result.url);
      if (!sanitized || isBlockedUrl(sanitized)) continue;
      if (seen.has(sanitized)) continue;
      seen.add(sanitized);
      candidates.push({ ...result, url: sanitized });
      if (candidates.length >= limit * 2) break;
    }
    if (candidates.length >= limit * 2) break;
  }

  const sources: StudySource[] = [];
  for (const candidate of candidates) {
    if (sources.length >= limit) break;
    try {
      const html = await fetchHtmlWithTimeout(candidate.url, fetchTimeoutMs);
      const parsed = extractTextFromHtml(html, candidate.url);
      let text = limitText(parsed.text, textLimit);
      if ((!text || text.length < 120) && candidate.snippet) {
        text = limitText(candidate.snippet, textLimit);
      }
      if (!text) continue;
      sources.push({
        url: candidate.url,
        title: candidate.title || parsed.title || new URL(candidate.url).hostname,
        excerpt: text,
        image_url: parsed.imageUrl || undefined,
      });
    } catch {
      if (!candidate.snippet) continue;
      sources.push({
        url: candidate.url,
        title: candidate.title || new URL(candidate.url).hostname,
        excerpt: limitText(candidate.snippet, textLimit),
      });
    }
  }

  return sources;
}
