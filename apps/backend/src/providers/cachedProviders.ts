import { cacheGetJSON, cacheSetJSON, cacheKey } from '../cache/redis';
import { CalendarEvent, ClientProfile, Platform } from '../types';
import type {
  LocalEventsProvider,
  TrendAggregator,
  PerformanceProvider,
  Locality,
  TimeWindow,
  TrendAggregate,
  PerformanceBreakdown,
} from './contracts';

export class CachedLocalEventsProvider implements LocalEventsProvider {
  name: string;

  constructor(private inner: LocalEventsProvider) {
    this.name = `cached_${inner.name}`;
  }

  async health() {
    return this.inner.health();
  }

  async getLocalEvents(params: {
    year: number;
    locality: Locality;
    include_optional_days?: boolean;
  }): Promise<CalendarEvent[]> {
    const key = `local_events:${cacheKey({
      ...params.locality,
      year: params.year,
      opt: params.include_optional_days ? 1 : 0,
    })}`;
    const cached = await cacheGetJSON<CalendarEvent[]>(key);
    if (cached) return cached;
    const data = await this.inner.getLocalEvents(params);
    await cacheSetJSON(key, data, 60 * 60 * 24 * 14);
    return data;
  }
}

export class CachedTrendAggregator implements TrendAggregator {
  name: string;

  constructor(private inner: TrendAggregator) {
    this.name = `cached_${inner.name}`;
  }

  async health() {
    return this.inner.health();
  }

  async aggregate(params: {
    topics: string[];
    locality: Locality;
    window: TimeWindow;
    sources: string[];
  }): Promise<TrendAggregate> {
    const key = `trends:${cacheKey({
      country: params.locality.country,
      uf: params.locality.uf ?? '',
      city: params.locality.city ?? '',
      window: params.window,
      sources: params.sources,
      topics: params.topics,
    })}`;

    const cached = await cacheGetJSON<TrendAggregate>(key);
    if (cached) return cached;

    const agg = await this.inner.aggregate(params);
    await cacheSetJSON(key, agg, 60 * 60 * 6);
    return agg;
  }
}

export class CachedPerformanceProvider implements PerformanceProvider {
  name: string;

  constructor(private inner: PerformanceProvider) {
    this.name = `cached_${inner.name}`;
  }

  async health() {
    return this.inner.health();
  }

  async getPerformance(params: {
    client: ClientProfile;
    platform: Platform;
    window: TimeWindow;
  }): Promise<PerformanceBreakdown> {
    const key = `perf:${cacheKey({
      client: params.client.id,
      platform: params.platform,
      window: params.window,
    })}`;

    const cached = await cacheGetJSON<PerformanceBreakdown>(key);
    if (cached) return cached;

    const perf = await this.inner.getPerformance(params);
    await cacheSetJSON(key, perf, 60 * 60 * 2);
    return perf;
  }
}
