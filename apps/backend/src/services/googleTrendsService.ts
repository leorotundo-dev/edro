/**
 * Google Trends Service
 *
 * Thin HTTP client for the Python trends-service deployed on Railway.
 * URL configured via GOOGLE_TRENDS_SERVICE_URL env var.
 */

const TRENDS_URL = process.env.GOOGLE_TRENDS_SERVICE_URL?.replace(/\/$/, '');

export interface TrendSignal {
  topic: string;
  score: number; // 0–100, average search interest last 7 days
}

/**
 * Query search interest for up to 5 topics in a given geo/timeframe.
 * Returns [] silently on any error (non-blocking caller pattern).
 */
export async function queryGoogleTrends(
  topics: string[],
  geo = 'BR',
  timeframe = 'today 1-m',
): Promise<TrendSignal[]> {
  if (!TRENDS_URL || topics.length === 0) return [];
  try {
    const res = await fetch(`${TRENDS_URL}/google_trends/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics: topics.slice(0, 5), geo, timeframe }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { signals?: TrendSignal[] };
    return (data.signals ?? []) as TrendSignal[];
  } catch {
    return [];
  }
}

export function isTrendsConfigured(): boolean {
  return !!TRENDS_URL;
}
