/**
 * Tavily API service — web search, extract, and research for AI agents.
 * Requires TAVILY_API_KEY environment variable.
 * Free tier: 1000 calls/month. See https://tavily.com
 */

const TAVILY_BASE = 'https://api.tavily.com';

export function isTavilyConfigured(): boolean {
  return !!process.env.TAVILY_API_KEY;
}

export type TavilySearchResult = {
  answer?: string;
  results: Array<{ title: string; url: string; snippet: string }>;
};

export type TavilyExtractResult = {
  results: Array<{ url: string; content: string; title?: string }>;
  failed_results?: Array<{ url: string; error: string }>;
};

/**
 * Search the web for a query.
 */
export async function tavilySearch(
  query: string,
  options?: {
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeAnswer?: boolean;
    timeoutMs?: number;
  }
): Promise<TavilySearchResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error('TAVILY_API_KEY not configured');

  const body = {
    api_key: apiKey,
    query: query.slice(0, 400),
    search_depth: options?.searchDepth ?? 'basic',
    max_results: options?.maxResults ?? 5,
    include_answer: options?.includeAnswer ?? false,
  };

  const res = await fetch(`${TAVILY_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options?.timeoutMs ?? 9000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.status.toString());
    throw new Error(`Tavily search error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as {
    answer?: string;
    results?: Array<{ title: string; url: string; content: string; score?: number }>;
  };

  return {
    answer: data.answer || undefined,
    results: (data.results || []).map((r) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: (r.content || '').slice(0, 600),
    })),
  };
}

/**
 * Extract full content from one or more URLs.
 */
export async function tavilyExtract(
  urls: string[],
  options?: { timeoutMs?: number }
): Promise<TavilyExtractResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error('TAVILY_API_KEY not configured');

  const safeUrls = urls.slice(0, 3); // Hard cap at 3 to save credits

  const res = await fetch(`${TAVILY_BASE}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, urls: safeUrls }),
    signal: AbortSignal.timeout(options?.timeoutMs ?? 15000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.status.toString());
    throw new Error(`Tavily extract error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as {
    results?: Array<{ url: string; raw_content?: string; title?: string }>;
    failed_results?: Array<{ url: string; error: string }>;
  };

  return {
    results: (data.results || []).map((r) => ({
      url: r.url,
      content: (r.raw_content || '').slice(0, 4000),
      title: r.title || undefined,
    })),
    failed_results: data.failed_results,
  };
}
