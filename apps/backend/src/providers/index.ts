import {
  CachedLocalEventsProvider,
  CachedTrendAggregator,
  CachedPerformanceProvider,
} from './cachedProviders';
import {
  localEventsProvider as baseLocal,
  trendAggregator as baseTrend,
  performanceProvider as basePerf,
  knowledgeBaseProvider,
  liveBoostEngine,
} from './base';

export const localEventsProvider = new CachedLocalEventsProvider(baseLocal);
export const trendAggregator = new CachedTrendAggregator(baseTrend);
export const performanceProvider = new CachedPerformanceProvider(basePerf);

export { knowledgeBaseProvider, liveBoostEngine };
