import type { TrendProvider, TrendSignal, TimeWindow, Locality } from '../contracts';

export class YouTubeTrendingProvider implements TrendProvider {
  name = 'youtube_trending_provider';
  source_id = 'youtube_trending';

  async health() {
    return { ok: !!process.env.YOUTUBE_API_KEY };
  }

  async queryTrends(params: {
    topics: string[];
    locality: Locality;
    window: TimeWindow;
  }): Promise<TrendSignal[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];
    if (!params.topics?.length) return [];

    const regionCode = (params.locality.country || 'BR').toUpperCase();
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=snippet,statistics&chart=mostPopular&maxResults=50&regionCode=${regionCode}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();
    const items = data.items ?? [];
    const now = new Date().toISOString();

    const signals: TrendSignal[] = [];

    for (const item of items) {
      const title = String(item?.snippet?.title ?? '').toLowerCase();
      const tags: string[] = (item?.snippet?.tags ?? []).map((tag: any) => String(tag).toLowerCase());
      const views = Number(item?.statistics?.viewCount ?? 0);
      const candidates = [title, ...tags].join(' ').split(/\s+/).slice(0, 40);

      for (const topic of params.topics) {
        const t = topic.toLowerCase();
        if (!t || t.length < 3) continue;
        if (candidates.includes(t) || title.includes(t)) {
          const score = Math.min(100, Math.round(Math.log10(Math.max(1, views)) * 18));
          signals.push({
            source: this.source_id,
            topic: t,
            score,
            confidence: 0.55,
            locale: params.locality,
            window: params.window,
            observed_at: now,
            raw: { title, views },
          });
        }
      }
    }

    return signals;
  }
}
