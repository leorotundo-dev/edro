import type {
  TrendAggregator,
  TrendAggregate,
  TrendAggregateRequest,
  TrendProvider,
  TrendSignal,
} from '../contracts';

export class TrendAggregatorSimple implements TrendAggregator {
  name = 'trend_aggregator_simple';

  constructor(private providers: TrendProvider[]) {}

  async health() {
    const statuses = await Promise.all(this.providers.map((provider) => provider.health()));
    const ok = statuses.every((status) => status.ok);
    return { ok };
  }

  async aggregate(params: TrendAggregateRequest): Promise<TrendAggregate> {
    const sources = params.sources ?? [];
    const activeProviders = sources.length
      ? this.providers.filter((provider) => sources.includes(provider.source_id))
      : this.providers;

    const signals: TrendSignal[] = [];

    for (const provider of activeProviders) {
      try {
        const result = await provider.queryTrends({
          topics: params.topics,
          locality: params.locality,
          window: params.window,
        });
        signals.push(...result);
      } catch {
        continue;
      }
    }

    const normalizedTopics = normalizeSignals(signals);

    return {
      signals,
      normalized_topics: normalizedTopics,
      observed_at: new Date().toISOString(),
      sources: activeProviders.map((provider) => provider.source_id),
    };
  }
}

function normalizeSignals(signals: TrendSignal[]): TrendSignal[] {
  const grouped = new Map<string, { total: number; count: number; confidence: number }>();

  for (const signal of signals) {
    const topic = (signal.topic ?? '').toLowerCase().trim();
    if (!topic) continue;
    const score = Number(signal.score ?? 0);
    const confidence = Number(signal.confidence ?? 0);

    const current = grouped.get(topic) ?? { total: 0, count: 0, confidence: 0 };
    current.total += score;
    current.count += 1;
    current.confidence = Math.max(current.confidence, confidence);
    grouped.set(topic, current);
  }

  return Array.from(grouped.entries())
    .map(([topic, data]) => ({
      topic,
      score: Math.round(data.total / Math.max(1, data.count)),
      confidence: data.confidence || 0.5,
    }))
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
}
