import type { CalendarEvent, ClientProfile, Platform } from '../types';

export type Locality = {
  country: string;
  uf?: string;
  city?: string;
};

export type TimeWindow = '7d' | '14d' | '30d' | '90d' | string;

export type TrendSignal = {
  source?: string;
  topic?: string;
  score?: number;
  confidence?: number;
  locale?: Locality;
  window?: TimeWindow;
  observed_at?: string;
  raw?: any;
};

export type TrendAggregate = {
  signals: TrendSignal[];
  normalized_topics?: TrendSignal[];
  observed_at?: string;
  sources?: string[];
};

export type PerformanceBreakdownItem = {
  platform: Platform;
  format?: string;
  score?: number;
  note?: string;
};

export type KPI = {
  metric:
    | 'impressions'
    | 'reach'
    | 'engagements'
    | 'engagement_rate'
    | 'clicks'
    | 'ctr'
    | 'cpc'
    | 'cpm'
    | 'conversions'
    | 'cost';
  value: number;
};

export type PerformanceByFormat = {
  format: string;
  score: number;
  kpis?: KPI[];
  notes?: string[];
};

export type PerformanceByTag = {
  tag: string;
  score: number;
  kpis?: KPI[];
};

export type PerformanceBreakdown = {
  platform?: Platform;
  window?: TimeWindow;
  by_format?: PerformanceByFormat[];
  by_tag?: PerformanceByTag[];
  editorial_insights?: string[];
  observed_at?: string;
  raw?: any;
  items?: PerformanceBreakdownItem[];
};

export type ClientKnowledge = {
  tone?: {
    description?: string;
  };
  compliance?: {
    forbidden_claims?: string[];
  };
  notes?: string[];
  tags?: string[];
  must_mentions?: string[];
  approved_terms?: string[];
  hashtags?: string[];
  social_profiles?: Record<string, string>;
  website?: string;
  audience?: string;
  brand_promise?: string;
  differentiators?: string;
  description?: string;
};

export type LocalEventsRequest = {
  year: number;
  locality: Locality;
  include_optional_days?: boolean;
  tenant_id?: string | null;
};

export type TrendAggregateRequest = {
  topics: string[];
  locality: Locality;
  window: TimeWindow;
  sources: string[];
};

export type PerformanceRequest = {
  client: ClientProfile;
  platform: Platform;
  window: TimeWindow;
};

export type ClientKnowledgeRequest = {
  client_id: string;
  tenant_id?: string | null;
};

export type LiveBoost = {
  kind: string;
  boost: number;
  reason: string;
  tags_affected?: string[];
  formats_affected?: string[];
  confidence?: number;
};

export type LiveBoostRequest = {
  client: ClientProfile;
  platform: Platform;
  event: CalendarEvent;
  trendAggregate?: TrendAggregate | null;
  performance?: PerformanceBreakdown | null;
};

export type HealthStatus = {
  ok: boolean;
};

export interface LocalEventsProvider {
  name: string;
  health(): Promise<HealthStatus>;
  getLocalEvents(params: LocalEventsRequest): Promise<CalendarEvent[]>;
}

export interface TrendAggregator {
  name: string;
  health(): Promise<HealthStatus>;
  aggregate(params: TrendAggregateRequest): Promise<TrendAggregate>;
}

export interface TrendProvider {
  name: string;
  source_id: string;
  health(): Promise<HealthStatus>;
  queryTrends(params: { topics: string[]; locality: Locality; window: TimeWindow }): Promise<TrendSignal[]>;
}

export interface PerformanceProvider {
  name: string;
  health(): Promise<HealthStatus>;
  getPerformance(params: PerformanceRequest): Promise<PerformanceBreakdown>;
}

export interface KnowledgeBaseProvider {
  name: string;
  health(): Promise<HealthStatus>;
  getClientKnowledge(params: ClientKnowledgeRequest): Promise<ClientKnowledge>;
}

export interface LiveBoostEngine {
  name: string;
  health(): Promise<HealthStatus>;
  computeBoosts(params: LiveBoostRequest): Promise<LiveBoost[]>;
}

export type CopyCandidate = {
  format?: string;
  headline: string;
  body: string;
  cta: string;
  tags?: string[];
};

export type CopyGenerationResult = {
  candidates: CopyCandidate[];
  raw?: any;
};

export type CopyValidationIssue = {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
};

export type CopyValidationResult = {
  approved: boolean;
  score: number;
  issues: CopyValidationIssue[];
  best: CopyCandidate;
  normalized_payload?: {
    platform?: string;
    format?: string;
    best?: CopyCandidate | null;
    alternatives?: CopyCandidate[];
  };
};

export interface CopyGeneratorProvider {
  name: string;
  health(): Promise<HealthStatus>;
  generateCopies(params: any): Promise<CopyGenerationResult>;
}

export interface CopyValidatorProvider {
  name: string;
  health(): Promise<HealthStatus>;
  validate(params: any): Promise<CopyValidationResult>;
}
