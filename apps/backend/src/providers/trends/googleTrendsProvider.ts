import type { TrendProvider, TrendSignal, TimeWindow, Locality } from '../contracts';

function windowToPytrends(window: TimeWindow) {
  if (window === '7d') return 'now 7-d';
  if (window === '14d') return 'today 1-m';
  if (window === '30d') return 'today 1-m';
  return 'today 3-m';
}

export class GoogleTrendsProvider implements TrendProvider {
  name = 'google_trends_provider';
  source_id = 'google_trends';

  async health() {
    return { ok: !!process.env.GOOGLE_TRENDS_SERVICE_URL };
  }

  async queryTrends(params: {
    topics: string[];
    locality: Locality;
    window: TimeWindow;
  }): Promise<TrendSignal[]> {
    const base = process.env.GOOGLE_TRENDS_SERVICE_URL;
    if (!base) return [];
    if (!params.topics?.length) return [];

    const geo = (params.locality.country || 'BR').toUpperCase();
    const response = await fetch(`${base.replace(/\/$/, '')}/google_trends/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topics: params.topics.slice(0, 5),
        geo,
        timeframe: windowToPytrends(params.window),
      }),
    });

    const data = await response.json();
    const now = data.observed_at ?? new Date().toISOString();

    return (data.signals ?? []).map((signal: any) => ({
      source: this.source_id,
      topic: String(signal.topic),
      score: Math.max(0, Math.min(100, Number(signal.score ?? 0))),
      confidence: 0.6,
      locale: params.locality,
      window: params.window,
      observed_at: now,
      raw: signal,
    })) as TrendSignal[];
  }
}
