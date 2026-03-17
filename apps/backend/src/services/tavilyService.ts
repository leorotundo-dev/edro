/**
 * Web search and extract service.
 * Search: Serper.dev (cheap, Google results) — requires SERPER_API_KEY.
 * Extract: Jina Reader (r.jina.ai) — free, no key required.
 *
 * Drop-in replacement for Tavily. All callers unchanged.
 */

const SERPER_BASE = 'https://google.serper.dev';
const JINA_BASE = 'https://r.jina.ai';

export function isTavilyConfigured(): boolean {
  return !!process.env.SERPER_API_KEY;
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
 * Search the web via Serper.dev (Google results).
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
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error('SERPER_API_KEY not configured');

  const res = await fetch(`${SERPER_BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      q: query.slice(0, 400),
      num: options?.maxResults ?? 5,
    }),
    signal: AbortSignal.timeout(options?.timeoutMs ?? 9000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.status.toString());
    throw new Error(`Serper search error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as {
    answerBox?: { answer?: string; snippet?: string };
    organic?: Array<{ title: string; link: string; snippet?: string }>;
  };

  const answer = data.answerBox?.answer || data.answerBox?.snippet || undefined;

  return {
    answer,
    results: (data.organic || []).slice(0, options?.maxResults ?? 5).map((r) => ({
      title: r.title || '',
      url: r.link || '',
      snippet: (r.snippet || '').slice(0, 600),
    })),
  };
}

/**
 * Extract full content from URLs via Jina Reader (free, no key).
 */
export async function tavilyExtract(
  urls: string[],
  options?: { timeoutMs?: number }
): Promise<TavilyExtractResult> {
  const safeUrls = urls.slice(0, 3);
  const results: TavilyExtractResult['results'] = [];
  const failed_results: TavilyExtractResult['failed_results'] = [];

  await Promise.all(
    safeUrls.map(async (url) => {
      try {
        const res = await fetch(`${JINA_BASE}/${url}`, {
          headers: { Accept: 'text/plain' },
          signal: AbortSignal.timeout(options?.timeoutMs ?? 15000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        results.push({ url, content: text.slice(0, 4000) });
      } catch (err: any) {
        failed_results.push({ url, error: err?.message || 'extract failed' });
      }
    })
  );

  return { results, failed_results };
}
