import { query } from '../../db';
import { generateCompletion, generateCompletionWithVision } from './claudeService';
import { estimateTokens, logAiUsage } from './aiUsageLogger';
import { isTavilyConfigured, tavilySearch } from '../tavilyService';

type JsonArray = string[];

export type ArtDirectionConceptRow = {
  id: string;
  tenant_id: string | null;
  slug: string;
  title: string;
  category: string;
  definition: string;
  heuristics: string[];
  when_to_use: string[];
  when_to_avoid: string[];
  critique_checks: string[];
  examples: string[];
  trust_score: number;
  source: string | null;
};

export type ArtDirectionReferenceSummary = {
  id: string;
  title: string;
  source_url: string;
  platform: string | null;
  format: string | null;
  segment: string | null;
  visual_intent: string | null;
  creative_direction: string | null;
  mood_words: string[];
  style_tags: string[];
  composition_tags: string[];
  typography_tags: string[];
  trend_score: number | null;
  confidence_score: number | null;
  rationale: string | null;
  discovered_at: string;
};

export type ArtDirectionReferenceRecord = ArtDirectionReferenceSummary & {
  status: 'discovered' | 'analyzed' | 'rejected' | 'archived';
  domain: string | null;
  search_query: string | null;
  source_kind: string;
  source_id: string | null;
  source_name: string | null;
  source_type: string | null;
  snippet: string | null;
  analyzed_at: string | null;
};

export type ArtDirectionTrendSignal = {
  id: string;
  cluster_key: string;
  tag: string;
  sample_size: number;
  recent_count: number;
  previous_count: number;
  momentum: number;
  trust_score: number;
  trend_score: number;
  platform: string | null;
  segment: string | null;
};

export type ArtDirectionFeedbackEventType =
  | 'used'
  | 'approved'
  | 'rejected'
  | 'edited'
  | 'performed'
  | 'saved';

export type ArtDirectionFeedbackMetadata = {
  source?: string;
  briefing_id?: string | null;
  job_id?: string | null;
  draft_id?: string | null;
  creative_version_id?: string | null;
  copy_version_id?: string | null;
  platform?: string | null;
  format?: string | null;
  visual_intent?: string | null;
  strategy_summary?: string | null;
  reference_ids?: string[];
  reference_urls?: string[];
  reference_titles?: string[];
  concept_slugs?: string[];
  trend_tags?: string[];
  review_actor?: 'internal' | 'client' | 'system' | null;
  review_stage?: string | null;
  rejection_tags?: string[];
  rejection_reason?: string | null;
  changed_layers?: string[];
  change_types?: string[];
  edit_severity?: 'low' | 'medium' | 'high';
  metric_type?: string | null;
  metric_value?: number | null;
  benchmark_delta?: number | null;
  [key: string]: any;
};

export type ArtDirectionMemoryContext = {
  concepts: ArtDirectionConceptRow[];
  references: ArtDirectionReferenceSummary[];
  trends: ArtDirectionTrendSignal[];
  promptBlock: string;
  critiqueBlock: string;
};

export type ArtDirectionCanonEntrySummary = {
  id: string;
  canon_id: string;
  canon_slug: string;
  canon_title: string;
  slug: string;
  title: string;
  summary_short: string | null;
  definition: string;
  heuristics: string[];
  critique_checks: string[];
  examples: string[];
  status: 'active' | 'draft' | 'archived';
  source_confidence: number;
};

export type ArtDirectionCanonSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: 'active' | 'draft' | 'archived';
  sort_order: number;
  total_entries: number;
  active_entries: number;
  draft_entries: number;
  archived_entries: number;
  entries: ArtDirectionCanonEntrySummary[];
};

export type ArtDirectionMemoryStats = {
  concepts: {
    active: number;
  };
  references: {
    discovered: number;
    analyzed: number;
    rejected: number;
    archived: number;
    lastDiscoveredAt: string | null;
    lastAnalyzedAt: string | null;
  };
  trends: {
    snapshots: number;
    lastSnapshotAt: string | null;
  };
  feedback: {
    used: number;
    approved: number;
    rejected: number;
    saved: number;
  };
};

export type ResolvedArtDirectionCreativeContext = {
  creativeSessionId: string | null;
  jobId: string | null;
  briefingId: string | null;
  clientId: string | null;
  sessionMetadata: Record<string, any>;
  lastCanvasSnapshot: Record<string, any>;
};

export type ArtDirectionConceptInput = {
  tenantId?: string | null;
  slug: string;
  title: string;
  category: string;
  definition: string;
  heuristics?: string[];
  whenToUse?: string[];
  whenToAvoid?: string[];
  critiqueChecks?: string[];
  examples?: string[];
  source?: string;
  trustScore?: number;
  status?: 'active' | 'draft' | 'archived';
  metadata?: Record<string, any>;
};

export type DiscoverArtDirectionReferencesInput = {
  tenantId: string;
  clientId?: string | null;
  clientName?: string | null;
  segment?: string | null;
  platform?: string | null;
  queries: string[];
  maxResultsPerQuery?: number;
};

export type ArtDirectionReferenceSourceRow = {
  id: string;
  tenant_id: string | null;
  name: string;
  source_type: 'search' | 'manual' | 'social' | 'rss' | 'site' | 'library';
  base_url: string | null;
  domain: string | null;
  trust_score: number;
  enabled: boolean;
  metadata: Record<string, any>;
  updated_at: string;
};

export type UpsertArtDirectionReferenceSourceInput = {
  id?: string | null;
  tenantId?: string | null;
  name: string;
  sourceType: 'search' | 'manual' | 'social' | 'rss' | 'site' | 'library';
  baseUrl?: string | null;
  domain?: string | null;
  trustScore?: number;
  enabled?: boolean;
  metadata?: Record<string, any>;
};

export type CreateManualArtDirectionReferenceInput = {
  tenantId: string;
  clientId?: string | null;
  title?: string | null;
  sourceUrl: string;
  platform?: string | null;
  format?: string | null;
  segment?: string | null;
  visualIntent?: string | null;
  creativeDirection?: string | null;
  rationale?: string | null;
  moodWords?: string[];
  styleTags?: string[];
  compositionTags?: string[];
  typographyTags?: string[];
  confidenceScore?: number | null;
  trendScore?: number | null;
  status?: 'discovered' | 'analyzed' | 'rejected' | 'archived';
  metadata?: Record<string, any>;
};

export type UpdateArtDirectionReferenceInput = {
  tenantId: string;
  id: string;
  title?: string | null;
  sourceUrl?: string | null;
  platform?: string | null;
  format?: string | null;
  segment?: string | null;
  visualIntent?: string | null;
  creativeDirection?: string | null;
  rationale?: string | null;
  moodWords?: string[] | null;
  styleTags?: string[] | null;
  compositionTags?: string[] | null;
  typographyTags?: string[] | null;
  confidenceScore?: number | null;
  trendScore?: number | null;
  status?: 'discovered' | 'analyzed' | 'rejected' | 'archived' | null;
  metadata?: Record<string, any>;
};

type ReferenceRow = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  source_url: string;
  title: string;
  snippet: string | null;
  image_url: string | null;
  search_query: string | null;
  platform: string | null;
  format: string | null;
  segment: string | null;
  metadata: any;
};

type AnalyzedReference = {
  platform?: string;
  format?: string;
  visualIntent?: string;
  creativeDirection?: string;
  moodWords?: JsonArray;
  styleTags?: JsonArray;
  compositionTags?: JsonArray;
  typographyTags?: JsonArray;
  ctaTags?: JsonArray;
  colorPalette?: JsonArray;
  trendSignals?: JsonArray;
  confidenceScore?: number;
  trendScore?: number;
  rationale?: string;
};

type TrendAggregate = {
  tenantId: string;
  clientId: string | null;
  platform: string | null;
  segment: string | null;
  clusterKey: string;
  tag: string;
  sampleSize: number;
  recentCount: number;
  previousCount: number;
  momentum: number;
  trustScore: number;
  trendScore: number;
  topReferenceIds: string[];
};

function toJson(value?: string[]): string {
  return JSON.stringify(value ?? []);
}

function normalizeUrlDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function uniq(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (!normalized) continue;
    if (!out.some((current) => current.toLowerCase() === normalized.toLowerCase())) {
      out.push(normalized);
    }
  }
  return out;
}

function asRecord(value: any): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function extractDaContext(value: any): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  const record = asRecord(value);
  return asRecord(record.da_context || record.daContext || record.visual_strategy_context || record.visualStrategyContext);
}

function pickFirstRecord(...sources: any[]): Record<string, any> {
  for (const source of sources) {
    const record = asRecord(source);
    if (Object.keys(record).length) return record;
  }
  return {};
}

export function getPrimaryArtDirectionReferenceId(metadata?: Record<string, any> | null): string | null {
  const values = Array.isArray(metadata?.reference_ids) ? metadata?.reference_ids : [];
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  const single = String(metadata?.reference_id || '').trim();
  return single || null;
}

export function buildArtDirectionFeedbackMetadata(params: {
  context?: Partial<ResolvedArtDirectionCreativeContext> | null;
  metadata?: Record<string, any> | null;
  source: string;
  eventType?: ArtDirectionFeedbackEventType;
  reviewActor?: 'internal' | 'client' | 'system';
  reviewStage?: string | null;
  rejectionTags?: string[];
  rejectionReason?: string | null;
  changedLayers?: string[];
  changeTypes?: string[];
  editSeverity?: 'low' | 'medium' | 'high';
  metricType?: string | null;
  metricValue?: number | null;
  benchmarkDelta?: number | null;
  draftId?: string | null;
  creativeVersionId?: string | null;
  copyVersionId?: string | null;
  platform?: string | null;
  format?: string | null;
  briefingId?: string | null;
  jobId?: string | null;
  clientId?: string | null;
}): ArtDirectionFeedbackMetadata {
  const context = params.context || null;
  const sessionMetadata = asRecord(context?.sessionMetadata);
  const lastCanvasSnapshot = asRecord(context?.lastCanvasSnapshot);
  const explicit = asRecord(params.metadata);
  const daContext = {
    ...extractDaContext(sessionMetadata),
    ...extractDaContext(lastCanvasSnapshot),
    ...extractDaContext(explicit),
  };
  const visualStrategy = pickFirstRecord(
    explicit.visual_strategy,
    explicit.visualStrategy,
    daContext.visual_strategy,
    daContext.visualStrategy,
  );
  const referenceExamples = Array.isArray(explicit.reference_examples)
    ? explicit.reference_examples
    : Array.isArray(explicit.referenceExamples)
    ? explicit.referenceExamples
    : Array.isArray(daContext.reference_examples)
    ? daContext.reference_examples
    : Array.isArray(daContext.referenceExamples)
    ? daContext.referenceExamples
    : Array.isArray(visualStrategy.referenceExamples)
    ? visualStrategy.referenceExamples
    : [];
  const referenceIds = uniq([
    ...(Array.isArray(explicit.reference_ids) ? explicit.reference_ids : []),
    ...(Array.isArray(daContext.reference_ids) ? daContext.reference_ids : []),
    ...(Array.isArray(visualStrategy.referenceIds) ? visualStrategy.referenceIds : []),
  ].map((item) => String(item || '').trim()).filter(Boolean));
  const referenceUrls = uniq(
    referenceExamples
      .map((item: any) => String(item?.sourceUrl || item?.source_url || '').trim())
      .filter(Boolean),
  );
  const referenceTitles = uniq(
    referenceExamples
      .map((item: any) => String(item?.title || '').trim())
      .filter(Boolean),
  );
  const conceptSlugs = uniq([
    ...(Array.isArray(explicit.concept_slugs) ? explicit.concept_slugs : []),
    ...(Array.isArray(daContext.concept_slugs) ? daContext.concept_slugs : []),
    ...(Array.isArray(visualStrategy.referenceMovements) ? visualStrategy.referenceMovements : []),
  ].map((item) => String(item || '').trim()).filter(Boolean));
  const trendTags = uniq([
    ...(Array.isArray(explicit.trend_tags) ? explicit.trend_tags : []),
    ...(Array.isArray(daContext.trend_tags) ? daContext.trend_tags : []),
    ...(Array.isArray(daContext.trend_signals) ? daContext.trend_signals : []),
    ...(Array.isArray(visualStrategy.trendSignals) ? visualStrategy.trendSignals : []),
  ].map((item) => String(item || '').trim()).filter(Boolean));

  return {
    source: params.source,
    briefing_id:
      params.briefingId ??
      explicit.briefing_id ??
      daContext.briefing_id ??
      context?.briefingId ??
      null,
    job_id:
      params.jobId ??
      explicit.job_id ??
      daContext.job_id ??
      context?.jobId ??
      null,
    draft_id: params.draftId ?? explicit.draft_id ?? null,
    creative_version_id: params.creativeVersionId ?? explicit.creative_version_id ?? null,
    copy_version_id: params.copyVersionId ?? explicit.copy_version_id ?? null,
    platform:
      params.platform ??
      explicit.platform ??
      daContext.platform ??
      visualStrategy.platform ??
      lastCanvasSnapshot.platform ??
      null,
    format:
      params.format ??
      explicit.format ??
      daContext.format ??
      visualStrategy.format ??
      lastCanvasSnapshot.format ??
      null,
    visual_intent:
      explicit.visual_intent ??
      daContext.visual_intent ??
      visualStrategy.intent ??
      null,
    strategy_summary:
      explicit.strategy_summary ??
      daContext.strategy_summary ??
      visualStrategy.strategySummary ??
      null,
    reference_ids: referenceIds,
    reference_urls: referenceUrls,
    reference_titles: referenceTitles,
    concept_slugs: conceptSlugs,
    trend_tags: trendTags,
    review_actor: params.reviewActor ?? explicit.review_actor ?? null,
    review_stage: params.reviewStage ?? explicit.review_stage ?? null,
    rejection_tags: uniq([
      ...(params.rejectionTags ?? []),
      ...(Array.isArray(explicit.rejection_tags) ? explicit.rejection_tags : []),
    ].map((item) => String(item || '').trim()).filter(Boolean)),
    rejection_reason: params.rejectionReason ?? explicit.rejection_reason ?? null,
    changed_layers: uniq([
      ...(params.changedLayers ?? []),
      ...(Array.isArray(explicit.changed_layers) ? explicit.changed_layers : []),
    ].map((item) => String(item || '').trim()).filter(Boolean)),
    change_types: uniq([
      ...(params.changeTypes ?? []),
      ...(Array.isArray(explicit.change_types) ? explicit.change_types : []),
    ].map((item) => String(item || '').trim()).filter(Boolean)),
    edit_severity: params.editSeverity ?? explicit.edit_severity ?? null,
    metric_type: params.metricType ?? explicit.metric_type ?? null,
    metric_value: params.metricValue ?? explicit.metric_value ?? null,
    benchmark_delta: params.benchmarkDelta ?? explicit.benchmark_delta ?? null,
  };
}

export async function resolveArtDirectionCreativeContext(params: {
  tenantId: string;
  creativeSessionId?: string | null;
  jobId?: string | null;
  briefingId?: string | null;
  clientId?: string | null;
}): Promise<ResolvedArtDirectionCreativeContext | null> {
  const values: any[] = [params.tenantId];
  const where: string[] = [`cs.tenant_id = $1`];

  if (params.creativeSessionId) {
    values.push(params.creativeSessionId);
    where.push(`cs.id = $${values.length}`);
  } else if (params.jobId) {
    values.push(params.jobId);
    where.push(`cs.job_id = $${values.length}`);
  } else if (params.briefingId) {
    values.push(params.briefingId);
    where.push(`cs.briefing_id = $${values.length}`);
  } else {
    return null;
  }

  if (params.clientId) {
    values.push(params.clientId);
    where.push(`COALESCE(j.client_id::text, cs.metadata->'da_context'->>'client_id') = $${values.length}`);
  }

  const { rows } = await query<{
    creative_session_id: string;
    job_id: string | null;
    briefing_id: string | null;
    client_id: string | null;
    metadata: any;
    last_canvas_snapshot: any;
  }>(
    `SELECT
       cs.id AS creative_session_id,
       cs.job_id,
       cs.briefing_id,
       j.client_id,
       COALESCE(cs.metadata, '{}'::jsonb) AS metadata,
       COALESCE(cs.last_canvas_snapshot, '{}'::jsonb) AS last_canvas_snapshot
     FROM creative_sessions cs
     LEFT JOIN jobs j ON j.id = cs.job_id
    WHERE ${where.join(' AND ')}
    ORDER BY cs.updated_at DESC
    LIMIT 1`,
    values,
  );

  if (!rows[0]) return null;
  return {
    creativeSessionId: rows[0].creative_session_id,
    jobId: rows[0].job_id || null,
    briefingId: rows[0].briefing_id || null,
    clientId: rows[0].client_id || null,
    sessionMetadata: asRecord(rows[0].metadata),
    lastCanvasSnapshot: asRecord(rows[0].last_canvas_snapshot),
  };
}

export async function upsertArtDirectionConcept(input: ArtDirectionConceptInput): Promise<void> {
  await query(
    `INSERT INTO da_concepts
       (tenant_id, slug, title, category, definition, heuristics, when_to_use, when_to_avoid,
        critique_checks, examples, source, trust_score, status, metadata)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14::jsonb)
     ON CONFLICT ((COALESCE(tenant_id, 'global')), slug)
     DO UPDATE SET
       title = EXCLUDED.title,
       category = EXCLUDED.category,
       definition = EXCLUDED.definition,
       heuristics = EXCLUDED.heuristics,
       when_to_use = EXCLUDED.when_to_use,
       when_to_avoid = EXCLUDED.when_to_avoid,
       critique_checks = EXCLUDED.critique_checks,
       examples = EXCLUDED.examples,
       source = EXCLUDED.source,
       trust_score = EXCLUDED.trust_score,
       status = EXCLUDED.status,
       metadata = EXCLUDED.metadata,
       updated_at = now()`,
    [
      input.tenantId ?? null,
      input.slug,
      input.title,
      input.category,
      input.definition,
      toJson(input.heuristics),
      toJson(input.whenToUse),
      toJson(input.whenToAvoid),
      toJson(input.critiqueChecks),
      toJson(input.examples),
      input.source ?? 'manual',
      input.trustScore ?? 1,
      input.status ?? 'active',
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

export async function ensureDefaultArtDirectionSources(tenantId: string): Promise<void> {
  const defaults = [
    { name: 'Behance', sourceType: 'site', baseUrl: 'https://www.behance.net', domain: 'behance.net', trust: 0.95 },
    { name: 'Dribbble', sourceType: 'site', baseUrl: 'https://dribbble.com', domain: 'dribbble.com', trust: 0.85 },
    { name: 'Ads of the World', sourceType: 'site', baseUrl: 'https://www.adsoftheworld.com', domain: 'adsoftheworld.com', trust: 0.95 },
    { name: 'Pinterest', sourceType: 'site', baseUrl: 'https://www.pinterest.com', domain: 'pinterest.com', trust: 0.60 },
    { name: 'Serper Search', sourceType: 'search', baseUrl: 'https://google.serper.dev', domain: 'google.serper.dev', trust: 0.70 },
  ];

  for (const source of defaults) {
    await query(
      `INSERT INTO da_reference_sources
         (tenant_id, name, source_type, base_url, domain, trust_score, enabled, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,true,'{}'::jsonb)
       ON CONFLICT ((COALESCE(tenant_id, 'global')), name)
       DO UPDATE SET
         source_type = EXCLUDED.source_type,
         base_url = EXCLUDED.base_url,
         domain = EXCLUDED.domain,
         trust_score = EXCLUDED.trust_score,
         enabled = true,
         updated_at = now()`,
      [tenantId, source.name, source.sourceType, source.baseUrl, source.domain, source.trust],
    );
  }
}

export async function listArtDirectionReferenceSources(params: {
  tenantId?: string | null;
  enabledOnly?: boolean;
}): Promise<ArtDirectionReferenceSourceRow[]> {
  const values: any[] = [];
  const where: string[] = [];

  if (params.tenantId) {
    values.push(params.tenantId);
    where.push(`(tenant_id = $${values.length} OR tenant_id IS NULL)`);
  }
  if (params.enabledOnly) {
    where.push(`enabled = true`);
  }

  const { rows } = await query<ArtDirectionReferenceSourceRow>(
    `SELECT
       id,
       tenant_id,
       name,
       source_type,
       base_url,
       domain,
       trust_score,
       enabled,
       COALESCE(metadata, '{}'::jsonb) AS metadata,
       updated_at::text AS updated_at
     FROM da_reference_sources
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY enabled DESC, trust_score DESC, updated_at DESC, name ASC`,
    values,
  );

  return rows.map((row) => ({
    ...row,
    metadata: asRecord(row.metadata),
  }));
}

export async function upsertArtDirectionReferenceSource(
  input: UpsertArtDirectionReferenceSourceInput,
): Promise<ArtDirectionReferenceSourceRow> {
  const normalizedBaseUrl = String(input.baseUrl || '').trim() || null;
  const normalizedDomain = String(input.domain || '').trim() || normalizeUrlDomain(normalizedBaseUrl || '') || null;

  const { rows } = await query<ArtDirectionReferenceSourceRow>(
    `INSERT INTO da_reference_sources
       (id, tenant_id, name, source_type, base_url, domain, trust_score, enabled, metadata)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     ON CONFLICT (id)
     DO UPDATE SET
       name = EXCLUDED.name,
       source_type = EXCLUDED.source_type,
       base_url = EXCLUDED.base_url,
       domain = EXCLUDED.domain,
       trust_score = EXCLUDED.trust_score,
       enabled = EXCLUDED.enabled,
       metadata = EXCLUDED.metadata,
       updated_at = now()
     RETURNING
       id,
       tenant_id,
       name,
       source_type,
       base_url,
       domain,
       trust_score,
       enabled,
       COALESCE(metadata, '{}'::jsonb) AS metadata,
       updated_at::text AS updated_at`,
    [
      input.id ?? null,
      input.tenantId ?? null,
      input.name.trim(),
      input.sourceType,
      normalizedBaseUrl,
      normalizedDomain,
      input.trustScore ?? 0.7,
      input.enabled ?? true,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return {
    ...rows[0],
    metadata: asRecord(rows[0]?.metadata),
  };
}

export async function discoverArtDirectionReferences(input: DiscoverArtDirectionReferencesInput): Promise<number> {
  if (!isTavilyConfigured()) return 0;

  await ensureDefaultArtDirectionSources(input.tenantId);

  const sources = await listArtDirectionReferenceSources({ tenantId: input.tenantId, enabledOnly: true });
  const searchSource = sources.find((source) => source.name === 'Serper Search');
  const siteSources = sources.filter((source) => source.source_type === 'site' && source.domain).slice(0, 4);
  const queries = uniq([
    ...input.queries.slice(0, 4),
    ...input.queries.slice(0, 2).flatMap((searchQuery) =>
      siteSources.map((source) => `${searchQuery} site:${source.domain}`),
    ),
  ]);
  const sourceId = searchSource?.id ?? null;

  let inserted = 0;
  for (const searchQuery of queries) {
    const startedAt = Date.now();
    const search = await tavilySearch(searchQuery, {
      maxResults: input.maxResultsPerQuery ?? 4,
      searchDepth: 'basic',
      timeoutMs: 12000,
    });

    await logAiUsage({
      tenant_id: input.tenantId,
      provider: 'tavily',
      model: 'search-basic',
      feature: 'da_reference_discovery',
      input_tokens: 0,
      output_tokens: 0,
      duration_ms: Date.now() - startedAt,
      metadata: { query: searchQuery, result_count: search.results.length },
    }).catch(() => {});

    for (const result of search.results) {
      const domain = normalizeUrlDomain(result.url);
      const matchedSource = siteSources.find((source) => source.domain === domain) ?? null;
      const metadata = {
        source: 'search',
        query: searchQuery,
        client_name: input.clientName ?? null,
        discovered_via: 'serper',
      };

      const res = await query<{ id: string }>(
        `INSERT INTO da_references
           (tenant_id, client_id, source_id, source_url, canonical_url, domain, title, snippet,
            search_query, source_kind, status, platform, segment, metadata)
         VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,'search','discovered',$9,$10,$11::jsonb)
         ON CONFLICT (tenant_id, source_url)
         DO UPDATE SET
           title = EXCLUDED.title,
           snippet = COALESCE(EXCLUDED.snippet, da_references.snippet),
           search_query = EXCLUDED.search_query,
           platform = COALESCE(da_references.platform, EXCLUDED.platform),
           segment = COALESCE(da_references.segment, EXCLUDED.segment),
           updated_at = now()
         RETURNING id`,
        [
          input.tenantId,
          input.clientId ?? null,
          matchedSource?.id ?? sourceId,
          result.url,
          domain,
          result.title || result.url,
          result.snippet || null,
          searchQuery,
          input.platform ?? null,
          input.segment ?? null,
          JSON.stringify(metadata),
        ],
      );
      if (res.rows[0]?.id) inserted += 1;
    }
  }

  return inserted;
}

async function analyzeReferenceRow(row: ReferenceRow): Promise<AnalyzedReference> {
  const prompt = `Você é um pesquisador de direção de arte para uma plataforma criativa.
Analise esta referência e extraia sinais úteis para um sistema que aprende repertório visual e tendências.

REFERÊNCIA:
- Título: ${row.title}
- URL: ${row.source_url}
- Resumo: ${row.snippet ?? 'não informado'}
- Plataforma conhecida: ${row.platform ?? 'não informada'}
- Formato conhecido: ${row.format ?? 'não informado'}
- Segmento do cliente: ${row.segment ?? 'não informado'}

Retorne SOMENTE JSON:
{
  "platform": "<Instagram|LinkedIn|Website|OOH|General>",
  "format": "<Feed 1:1|Feed 4:5|Story 9:16|Carousel|Banner|Website|General>",
  "visualIntent": "<performance_conversion|authority_structured|editorial_premium|social_proof_human|culture_driven_expressive>",
  "creativeDirection": "<1 frase curta descrevendo a linguagem visual>",
  "moodWords": ["<até 5>"],
  "styleTags": ["<até 8>"],
  "compositionTags": ["<até 6>"],
  "typographyTags": ["<até 6>"],
  "ctaTags": ["<até 5>"],
  "colorPalette": ["<#hex opcional>", "<#hex opcional>"],
  "trendSignals": ["<até 5 sinais emergentes ou consolidados>"],
  "confidenceScore": <0.0 a 1.0>,
  "trendScore": <0 a 100>,
  "rationale": "<explique em 1 frase por que isso é relevante>"
}`;

  const startedAt = Date.now();
  const response = row.image_url
    ? await generateCompletionWithVision({ prompt, imageUrl: row.image_url, temperature: 0.2, maxTokens: 700 })
    : await generateCompletion({ prompt, temperature: 0.2, maxTokens: 700 });

  await logAiUsage({
    tenant_id: row.tenant_id,
    provider: 'claude',
    model: response.model,
    feature: 'da_reference_analysis',
    input_tokens: response.usage.input_tokens || estimateTokens(prompt),
    output_tokens: response.usage.output_tokens || estimateTokens(response.text),
    duration_ms: Date.now() - startedAt,
    metadata: { reference_id: row.id },
  }).catch(() => {});

  const raw = response.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(raw) as AnalyzedReference;

  return {
    platform: parsed.platform,
    format: parsed.format,
    visualIntent: parsed.visualIntent,
    creativeDirection: parsed.creativeDirection,
    moodWords: uniq(Array.isArray(parsed.moodWords) ? parsed.moodWords : []),
    styleTags: uniq(Array.isArray(parsed.styleTags) ? parsed.styleTags : []),
    compositionTags: uniq(Array.isArray(parsed.compositionTags) ? parsed.compositionTags : []),
    typographyTags: uniq(Array.isArray(parsed.typographyTags) ? parsed.typographyTags : []),
    ctaTags: uniq(Array.isArray(parsed.ctaTags) ? parsed.ctaTags : []),
    colorPalette: uniq(Array.isArray(parsed.colorPalette) ? parsed.colorPalette : []),
    trendSignals: uniq(Array.isArray(parsed.trendSignals) ? parsed.trendSignals : []),
    confidenceScore: typeof parsed.confidenceScore === 'number' ? Math.max(0, Math.min(1, parsed.confidenceScore)) : 0.55,
    trendScore: typeof parsed.trendScore === 'number' ? Math.max(0, Math.min(100, parsed.trendScore)) : 50,
    rationale: parsed.rationale,
  };
}

export async function analyzePendingArtDirectionReferences(limit = 6): Promise<number> {
  const { rows } = await query<ReferenceRow>(
    `SELECT id, tenant_id, client_id, source_url, title, snippet, image_url, search_query,
            platform, format, segment, metadata
       FROM da_references
      WHERE status = 'discovered'
      ORDER BY discovered_at DESC
      LIMIT $1`,
    [limit],
  );

  let processed = 0;
  for (const row of rows) {
    try {
      const analyzed = await analyzeReferenceRow(row);
      await query(
        `UPDATE da_references
            SET status = 'analyzed',
                platform = COALESCE($2, platform),
                format = COALESCE($3, format),
                visual_intent = $4,
                creative_direction = $5,
                mood_words = $6::jsonb,
                style_tags = $7::jsonb,
                composition_tags = $8::jsonb,
                typography_tags = $9::jsonb,
                cta_tags = $10::jsonb,
                color_palette = $11::jsonb,
                trend_signals = $12::jsonb,
                confidence_score = $13,
                trend_score = $14,
                rationale = $15,
                analyzed_at = now(),
                updated_at = now()
          WHERE id = $1`,
        [
          row.id,
          analyzed.platform ?? null,
          analyzed.format ?? null,
          analyzed.visualIntent ?? null,
          analyzed.creativeDirection ?? null,
          toJson(analyzed.moodWords),
          toJson(analyzed.styleTags),
          toJson(analyzed.compositionTags),
          toJson(analyzed.typographyTags),
          toJson(analyzed.ctaTags),
          toJson(analyzed.colorPalette),
          toJson(analyzed.trendSignals),
          analyzed.confidenceScore ?? 0.55,
          analyzed.trendScore ?? 50,
          analyzed.rationale ?? null,
        ],
      );
      processed += 1;
    } catch (error: any) {
      await query(
        `UPDATE da_references
            SET status = 'rejected',
                metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('analysis_error', $2),
                updated_at = now()
          WHERE id = $1`,
        [row.id, error?.message || 'analysis_failed'],
      ).catch(() => {});
    }
  }

  return processed;
}

export async function recordArtDirectionFeedbackEvent(params: {
  tenantId: string;
  clientId?: string | null;
  creativeSessionId?: string | null;
  referenceId?: string | null;
  eventType: 'used' | 'approved' | 'rejected' | 'edited' | 'performed' | 'saved';
  score?: number | null;
  notes?: string | null;
  metadata?: Record<string, any>;
  createdBy?: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO da_feedback_events
       (tenant_id, client_id, creative_session_id, reference_id, event_type, score, notes, metadata, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
    [
      params.tenantId,
      params.clientId ?? null,
      params.creativeSessionId ?? null,
      params.referenceId ?? null,
      params.eventType,
      params.score ?? null,
      params.notes ?? null,
      JSON.stringify(params.metadata ?? {}),
      params.createdBy ?? null,
    ],
  );
}

async function fetchArtDirectionReferenceRecord(
  tenantId: string,
  id: string,
): Promise<ArtDirectionReferenceRecord | null> {
  const { rows } = await query<ArtDirectionReferenceRecord>(
    `SELECT
       r.id,
       r.title,
       r.source_url,
       r.platform,
       r.format,
       r.segment,
       r.visual_intent,
       r.creative_direction,
       COALESCE(r.mood_words, '[]'::jsonb) AS mood_words,
       COALESCE(r.style_tags, '[]'::jsonb) AS style_tags,
       COALESCE(r.composition_tags, '[]'::jsonb) AS composition_tags,
       COALESCE(r.typography_tags, '[]'::jsonb) AS typography_tags,
       r.trend_score,
       r.confidence_score,
       r.rationale,
       r.discovered_at::text AS discovered_at,
       r.status,
       r.domain,
       r.search_query,
       r.source_kind,
       r.source_id,
       r.snippet,
       r.analyzed_at::text AS analyzed_at,
       src.name AS source_name,
       src.source_type
     FROM da_references r
     LEFT JOIN da_reference_sources src ON src.id = r.source_id
    WHERE r.tenant_id = $1
      AND r.id = $2
    LIMIT 1`,
    [tenantId, id],
  );

  if (!rows[0]) return null;

  return {
    ...rows[0],
    mood_words: Array.isArray(rows[0].mood_words) ? rows[0].mood_words : [],
    style_tags: Array.isArray(rows[0].style_tags) ? rows[0].style_tags : [],
    composition_tags: Array.isArray(rows[0].composition_tags) ? rows[0].composition_tags : [],
    typography_tags: Array.isArray(rows[0].typography_tags) ? rows[0].typography_tags : [],
  };
}

export async function createManualArtDirectionReference(
  input: CreateManualArtDirectionReferenceInput,
): Promise<ArtDirectionReferenceRecord> {
  const normalizedUrl = input.sourceUrl.trim();
  const domain = normalizeUrlDomain(normalizedUrl);

  let sourceId: string | null = null;
  if (domain) {
    const sourceRows = await query<{ id: string }>(
      `SELECT id
         FROM da_reference_sources
        WHERE (tenant_id = $1 OR tenant_id IS NULL)
          AND domain = $2
        ORDER BY CASE WHEN tenant_id = $1 THEN 0 ELSE 1 END
        LIMIT 1`,
      [input.tenantId, domain],
    );
    sourceId = sourceRows.rows[0]?.id ?? null;
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO da_references
       (
         tenant_id, client_id, source_id, source_url, canonical_url, domain, title, snippet,
         source_kind, status, platform, format, segment, visual_intent, creative_direction,
         mood_words, style_tags, composition_tags, typography_tags,
         confidence_score, trend_score, rationale, metadata, analyzed_at
       )
     VALUES (
       $1,$2,$3,$4,$4,$5,$6,$7,
       'manual',$8,$9,$10,$11,$12,$13,
       $14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,
       $18,$19,$20,$21::jsonb,
       CASE WHEN $8 = 'analyzed' THEN now() ELSE NULL END
     )
     ON CONFLICT (tenant_id, source_url)
     DO UPDATE SET
       client_id = COALESCE(EXCLUDED.client_id, da_references.client_id),
       source_id = COALESCE(EXCLUDED.source_id, da_references.source_id),
       title = EXCLUDED.title,
       platform = COALESCE(EXCLUDED.platform, da_references.platform),
       format = COALESCE(EXCLUDED.format, da_references.format),
       segment = COALESCE(EXCLUDED.segment, da_references.segment),
       visual_intent = COALESCE(EXCLUDED.visual_intent, da_references.visual_intent),
       creative_direction = COALESCE(EXCLUDED.creative_direction, da_references.creative_direction),
       mood_words = EXCLUDED.mood_words,
       style_tags = EXCLUDED.style_tags,
       composition_tags = EXCLUDED.composition_tags,
       typography_tags = EXCLUDED.typography_tags,
       confidence_score = COALESCE(EXCLUDED.confidence_score, da_references.confidence_score),
       trend_score = COALESCE(EXCLUDED.trend_score, da_references.trend_score),
       rationale = COALESCE(EXCLUDED.rationale, da_references.rationale),
       metadata = COALESCE(da_references.metadata, '{}'::jsonb) || EXCLUDED.metadata,
       status = EXCLUDED.status,
       analyzed_at = CASE WHEN EXCLUDED.status = 'analyzed' THEN now() ELSE da_references.analyzed_at END,
       updated_at = now()
     RETURNING id`,
    [
      input.tenantId,
      input.clientId ?? null,
      sourceId,
      normalizedUrl,
      domain,
      (input.title || normalizedUrl).trim(),
      null,
      input.status ?? 'discovered',
      input.platform ?? null,
      input.format ?? null,
      input.segment ?? null,
      input.visualIntent ?? null,
      input.creativeDirection ?? null,
      toJson(input.moodWords),
      toJson(input.styleTags),
      toJson(input.compositionTags),
      toJson(input.typographyTags),
      input.confidenceScore ?? null,
      input.trendScore ?? null,
      input.rationale ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  const stored = await fetchArtDirectionReferenceRecord(input.tenantId, rows[0].id);
  if (!stored) throw new Error('Falha ao carregar referência manual após salvar');
  return stored;
}

export async function updateArtDirectionReference(
  input: UpdateArtDirectionReferenceInput,
): Promise<ArtDirectionReferenceRecord | null> {
  const currentRows = await query<{ source_url: string; status: string }>(
    `SELECT source_url, status
       FROM da_references
      WHERE tenant_id = $1
        AND id = $2
      LIMIT 1`,
    [input.tenantId, input.id],
  );
  if (!currentRows.rows[0]) return null;

  const normalizedUrl = String(input.sourceUrl || '').trim() || currentRows.rows[0].source_url;
  const domain = normalizeUrlDomain(normalizedUrl);

  let sourceId: string | null = null;
  if (domain) {
    const sourceRows = await query<{ id: string }>(
      `SELECT id
         FROM da_reference_sources
        WHERE (tenant_id = $1 OR tenant_id IS NULL)
          AND domain = $2
        ORDER BY CASE WHEN tenant_id = $1 THEN 0 ELSE 1 END
        LIMIT 1`,
      [input.tenantId, domain],
    );
    sourceId = sourceRows.rows[0]?.id ?? null;
  }

  const status = input.status ?? (currentRows.rows[0].status as UpdateArtDirectionReferenceInput['status']);

  const { rows } = await query<{ id: string }>(
    `UPDATE da_references
        SET source_id = COALESCE($3, source_id),
            source_url = $4,
            canonical_url = $4,
            domain = $5,
            title = COALESCE($6, title),
            platform = COALESCE($7, platform),
            format = COALESCE($8, format),
            segment = COALESCE($9, segment),
            visual_intent = COALESCE($10, visual_intent),
            creative_direction = COALESCE($11, creative_direction),
            mood_words = COALESCE($12::jsonb, mood_words),
            style_tags = COALESCE($13::jsonb, style_tags),
            composition_tags = COALESCE($14::jsonb, composition_tags),
            typography_tags = COALESCE($15::jsonb, typography_tags),
            confidence_score = COALESCE($16, confidence_score),
            trend_score = COALESCE($17, trend_score),
            rationale = COALESCE($18, rationale),
            status = COALESCE($19, status),
            analyzed_at = CASE
              WHEN COALESCE($19, status) = 'analyzed' AND analyzed_at IS NULL THEN now()
              WHEN COALESCE($19, status) <> 'analyzed' THEN NULL
              ELSE analyzed_at
            END,
            metadata = COALESCE(metadata, '{}'::jsonb) || $20::jsonb,
            updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
      RETURNING id`,
    [
      input.tenantId,
      input.id,
      sourceId,
      normalizedUrl,
      domain,
      input.title ?? null,
      input.platform ?? null,
      input.format ?? null,
      input.segment ?? null,
      input.visualIntent ?? null,
      input.creativeDirection ?? null,
      input.moodWords ? toJson(input.moodWords) : null,
      input.styleTags ? toJson(input.styleTags) : null,
      input.compositionTags ? toJson(input.compositionTags) : null,
      input.typographyTags ? toJson(input.typographyTags) : null,
      input.confidenceScore ?? null,
      input.trendScore ?? null,
      input.rationale ?? null,
      status ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  if (!rows[0]) return null;
  return fetchArtDirectionReferenceRecord(input.tenantId, rows[0].id);
}

export async function recomputeArtDirectionTrendSnapshots(params?: {
  tenantId?: string;
  clientId?: string;
  windowDays?: number;
  recentDays?: number;
}): Promise<number> {
  const windowDays = Math.max(14, params?.windowDays ?? 30);
  const recentDays = Math.min(windowDays - 1, params?.recentDays ?? 7);
  const where: string[] = [`status = 'analyzed'`, `discovered_at >= now() - ($1 || ' days')::interval`];
  const values: any[] = [`${windowDays} days`];

  if (params?.tenantId) {
    values.push(params.tenantId);
    where.push(`tenant_id = $${values.length}`);
  }
  if (params?.clientId) {
    values.push(params.clientId);
    where.push(`client_id = $${values.length}`);
  }

  const { rows } = await query<any>(
    `SELECT id, tenant_id, client_id, platform, segment, discovered_at, confidence_score,
            visual_intent, style_tags, mood_words, composition_tags, typography_tags, cta_tags
       FROM da_references
      WHERE ${where.join(' AND ')}`,
    values,
  );

  const groups = new Map<string, TrendAggregate>();
  const previousWindowFactor = Math.max((windowDays - recentDays) / recentDays, 1);
  const recentThreshold = Date.now() - recentDays * 24 * 60 * 60 * 1000;

  for (const row of rows) {
    const tags: Array<{ clusterKey: string; tag: string }> = [];
    const addTags = (prefix: string, valuesToAdd: any) => {
      for (const value of Array.isArray(valuesToAdd) ? valuesToAdd : []) {
        const tag = String(value || '').trim();
        if (!tag) continue;
        tags.push({ clusterKey: `${prefix}:${tag.toLowerCase()}`, tag });
      }
    };

    if (row.visual_intent) tags.push({ clusterKey: `intent:${String(row.visual_intent).toLowerCase()}`, tag: String(row.visual_intent) });
    addTags('style', row.style_tags);
    addTags('mood', row.mood_words);
    addTags('composition', row.composition_tags);
    addTags('type', row.typography_tags);
    addTags('cta', row.cta_tags);

    for (const tagInfo of tags) {
      const key = [row.tenant_id, row.client_id ?? 'global', row.platform ?? 'all', row.segment ?? 'all', tagInfo.clusterKey].join('|');
      const current = groups.get(key) ?? {
        tenantId: row.tenant_id,
        clientId: row.client_id ?? null,
        platform: row.platform ?? null,
        segment: row.segment ?? null,
        clusterKey: tagInfo.clusterKey,
        tag: tagInfo.tag,
        sampleSize: 0,
        recentCount: 0,
        previousCount: 0,
        momentum: 0,
        trustScore: 0,
        trendScore: 0,
        topReferenceIds: [],
      };

      current.sampleSize += 1;
      current.trustScore += Number(row.confidence_score || 0);
      if (new Date(row.discovered_at).getTime() >= recentThreshold) current.recentCount += 1;
      else current.previousCount += 1;
      current.topReferenceIds.push(row.id);
      groups.set(key, current);
    }
  }

  const aggregates = Array.from(groups.values())
    .map((group) => {
      const previousWeeklyEquivalent = group.previousCount / previousWindowFactor;
      const momentum = previousWeeklyEquivalent > 0
        ? (group.recentCount - previousWeeklyEquivalent) / previousWeeklyEquivalent
        : group.recentCount > 0 ? 1 : 0;
      const trustScore = group.sampleSize > 0 ? Number((group.trustScore / group.sampleSize).toFixed(2)) : 0;
      const trendScore = Math.max(
        0,
        Math.min(
          100,
          Number((trustScore * 35 + group.recentCount * 10 + Math.max(momentum, 0) * 25 + Math.min(group.sampleSize, 8) * 3).toFixed(2)),
        ),
      );
      return {
        ...group,
        momentum: Number(momentum.toFixed(3)),
        trustScore,
        trendScore,
        topReferenceIds: group.topReferenceIds.slice(0, 5),
      };
    })
    .filter((group) => group.sampleSize > 0);

  const scopes = new Map<string, { tenantId: string; clientId: string | null }>();
  for (const item of aggregates) scopes.set(`${item.tenantId}|${item.clientId ?? 'global'}`, { tenantId: item.tenantId, clientId: item.clientId });

  for (const scope of scopes.values()) {
    await query(
      `DELETE FROM da_trend_snapshots
        WHERE tenant_id = $1
          AND (($2::text IS NULL AND client_id IS NULL) OR client_id = $2::text)
          AND window_key = $3`,
      [scope.tenantId, scope.clientId, `rolling_${windowDays}d`],
    );
  }

  for (const item of aggregates) {
    await query(
      `INSERT INTO da_trend_snapshots
         (tenant_id, client_id, window_key, segment, platform, cluster_key, tag, sample_size,
          recent_count, previous_count, momentum, trust_score, trend_score, top_reference_ids, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb)`,
      [
        item.tenantId,
        item.clientId,
        `rolling_${windowDays}d`,
        item.segment,
        item.platform,
        item.clusterKey,
        item.tag,
        item.sampleSize,
        item.recentCount,
        item.previousCount,
        item.momentum,
        item.trustScore,
        item.trendScore,
        JSON.stringify(item.topReferenceIds),
        JSON.stringify({ recent_days: recentDays, window_days: windowDays }),
      ],
    );
  }

  return aggregates.length;
}

export async function listRelevantArtDirectionReferences(params: {
  tenantId: string;
  clientId?: string | null;
  platform?: string | null;
  segment?: string | null;
  limit?: number;
}) {
  const values: any[] = [params.tenantId];
  const where = [`tenant_id = $1`, `status = 'analyzed'`];
  if (params.clientId) {
    values.push(params.clientId);
    where.push(`(client_id = $${values.length} OR client_id IS NULL)`);
  }
  if (params.platform) {
    values.push(params.platform);
    where.push(`(platform = $${values.length} OR platform IS NULL)`);
  }
  if (params.segment) {
    values.push(params.segment);
    where.push(`(segment = $${values.length} OR segment IS NULL)`);
  }
  values.push(Math.min(params.limit ?? 8, 20));

  const { rows } = await query(
    `SELECT id, title, source_url, platform, format, segment, visual_intent, creative_direction,
            mood_words, style_tags, composition_tags, typography_tags, trend_score, confidence_score,
            rationale, discovered_at
       FROM da_references
      WHERE ${where.join(' AND ')}
      ORDER BY
        CASE WHEN client_id IS NOT NULL THEN 0 ELSE 1 END,
        trend_score DESC,
        confidence_score DESC,
        discovered_at DESC
      LIMIT $${values.length}`,
    values,
  );
  return rows;
}

export async function listArtDirectionReferences(params: {
  tenantId: string;
  clientId?: string | null;
  platform?: string | null;
  segment?: string | null;
  statuses?: Array<'discovered' | 'analyzed' | 'rejected' | 'archived'>;
  limit?: number;
}): Promise<ArtDirectionReferenceRecord[]> {
  const values: any[] = [params.tenantId];
  const where = [`r.tenant_id = $1`];

  if (params.clientId) {
    values.push(params.clientId);
    where.push(`(r.client_id = $${values.length} OR r.client_id IS NULL)`);
  }
  if (params.platform) {
    values.push(params.platform);
    where.push(`(r.platform = $${values.length} OR r.platform IS NULL)`);
  }
  if (params.segment) {
    values.push(params.segment);
    where.push(`(r.segment = $${values.length} OR r.segment IS NULL)`);
  }
  if (params.statuses?.length) {
    values.push(params.statuses);
    where.push(`r.status = ANY($${values.length}::text[])`);
  }

  values.push(Math.min(params.limit ?? 24, 100));

  const { rows } = await query<ArtDirectionReferenceRecord>(
    `SELECT
       r.id,
       r.title,
       r.source_url,
       r.platform,
       r.format,
       r.segment,
       r.visual_intent,
       r.creative_direction,
       COALESCE(r.mood_words, '[]'::jsonb) AS mood_words,
       COALESCE(r.style_tags, '[]'::jsonb) AS style_tags,
       COALESCE(r.composition_tags, '[]'::jsonb) AS composition_tags,
       COALESCE(r.typography_tags, '[]'::jsonb) AS typography_tags,
       r.trend_score,
       r.confidence_score,
       r.rationale,
       r.discovered_at::text AS discovered_at,
       r.status,
       r.domain,
       r.search_query,
       r.source_kind,
       r.source_id,
       r.snippet,
       r.analyzed_at::text AS analyzed_at,
       src.name AS source_name,
       src.source_type
     FROM da_references r
     LEFT JOIN da_reference_sources src ON src.id = r.source_id
     WHERE ${where.join(' AND ')}
     ORDER BY
       CASE r.status
         WHEN 'discovered' THEN 0
         WHEN 'analyzed' THEN 1
         WHEN 'rejected' THEN 2
         ELSE 3
       END,
       r.updated_at DESC,
       r.discovered_at DESC
     LIMIT $${values.length}`,
    values,
  );

  return rows.map((row) => ({
    ...row,
    mood_words: Array.isArray(row.mood_words) ? row.mood_words : [],
    style_tags: Array.isArray(row.style_tags) ? row.style_tags : [],
    composition_tags: Array.isArray(row.composition_tags) ? row.composition_tags : [],
    typography_tags: Array.isArray(row.typography_tags) ? row.typography_tags : [],
  }));
}

export async function listRelevantArtDirectionConcepts(params: {
  tenantId?: string | null;
  categories?: string[] | null;
  limit?: number;
}): Promise<ArtDirectionConceptRow[]> {
  const where = [`status = 'active'`];
  const values: any[] = [];

  if (params.tenantId) {
    values.push(params.tenantId);
    where.push(`(tenant_id = $${values.length} OR tenant_id IS NULL)`);
  } else {
    where.push(`tenant_id IS NULL`);
  }

  if (params.categories?.length) {
    values.push(params.categories);
    where.push(`category = ANY($${values.length}::text[])`);
  }

  values.push(Math.min(params.limit ?? 6, 12));

  const { rows } = await query<ArtDirectionConceptRow>(
    `SELECT id, tenant_id, slug, title, category, definition,
            COALESCE(heuristics, '[]'::jsonb) AS heuristics,
            COALESCE(when_to_use, '[]'::jsonb) AS when_to_use,
            COALESCE(when_to_avoid, '[]'::jsonb) AS when_to_avoid,
            COALESCE(critique_checks, '[]'::jsonb) AS critique_checks,
            COALESCE(examples, '[]'::jsonb) AS examples,
            trust_score, source
       FROM da_concepts
      WHERE ${where.join(' AND ')}
      ORDER BY
        CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END,
        trust_score DESC,
        updated_at DESC
      LIMIT $${values.length}`,
    values,
  );

  return rows.map((row) => ({
    ...row,
    heuristics: Array.isArray(row.heuristics) ? row.heuristics : [],
    when_to_use: Array.isArray(row.when_to_use) ? row.when_to_use : [],
    when_to_avoid: Array.isArray(row.when_to_avoid) ? row.when_to_avoid : [],
    critique_checks: Array.isArray(row.critique_checks) ? row.critique_checks : [],
    examples: Array.isArray(row.examples) ? row.examples : [],
  }));
}

export async function listArtDirectionCanons(params: {
  tenantId?: string | null;
  includeEntries?: boolean;
  limitEntriesPerCanon?: number;
}): Promise<ArtDirectionCanonSummary[]> {
  const values: any[] = [];
  const where: string[] = [];

  if (params.tenantId) {
    values.push(params.tenantId);
    where.push(`(c.tenant_id = $${values.length} OR c.tenant_id IS NULL)`);
  } else {
    where.push(`c.tenant_id IS NULL`);
  }

  const { rows } = await query<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    status: 'active' | 'draft' | 'archived';
    sort_order: number;
    total_entries: number;
    active_entries: number;
    draft_entries: number;
    archived_entries: number;
  }>(
    `SELECT
       c.id,
       c.slug,
       c.title,
       c.description,
       c.status,
       c.sort_order,
       COUNT(e.id)::int AS total_entries,
       COUNT(e.id) FILTER (WHERE e.status = 'active')::int AS active_entries,
       COUNT(e.id) FILTER (WHERE e.status = 'draft')::int AS draft_entries,
       COUNT(e.id) FILTER (WHERE e.status = 'archived')::int AS archived_entries
     FROM da_canons c
     LEFT JOIN da_canon_entries e ON e.canon_id = c.id
     WHERE ${where.join(' AND ')}
     GROUP BY c.id, c.slug, c.title, c.description, c.status, c.sort_order
     ORDER BY c.sort_order ASC, c.title ASC`,
    values,
  );

  const canons: ArtDirectionCanonSummary[] = rows.map((row) => ({
    ...row,
    entries: [],
  }));

  if (!params.includeEntries || !canons.length) {
    return canons;
  }

  const canonIds = canons.map((canon) => canon.id);
  const entryValues: any[] = [canonIds];
  const entryWhere = [`e.canon_id = ANY($1::uuid[])`];

  if (params.tenantId) {
    entryValues.push(params.tenantId);
    entryWhere.push(`(e.tenant_id = $${entryValues.length} OR e.tenant_id IS NULL)`);
  } else {
    entryWhere.push(`e.tenant_id IS NULL`);
  }

  const { rows: entryRows } = await query<ArtDirectionCanonEntrySummary>(
    `SELECT
       e.id,
       e.canon_id,
       c.slug AS canon_slug,
       c.title AS canon_title,
       e.slug,
       e.title,
       e.summary_short,
       e.definition,
       COALESCE(e.heuristics, '[]'::jsonb) AS heuristics,
       COALESCE(e.critique_checks, '[]'::jsonb) AS critique_checks,
       COALESCE(e.examples, '[]'::jsonb) AS examples,
       e.status,
       e.source_confidence
     FROM da_canon_entries e
     JOIN da_canons c ON c.id = e.canon_id
     WHERE ${entryWhere.join(' AND ')}
     ORDER BY
       c.sort_order ASC,
       CASE e.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
       e.title ASC`,
    entryValues,
  );

  const grouped = new Map<string, ArtDirectionCanonEntrySummary[]>();
  for (const row of entryRows) {
    const current = grouped.get(row.canon_id) ?? [];
    if (current.length < Math.max(1, Math.min(params.limitEntriesPerCanon ?? 12, 50))) {
      current.push({
        ...row,
        heuristics: Array.isArray(row.heuristics) ? row.heuristics : [],
        critique_checks: Array.isArray(row.critique_checks) ? row.critique_checks : [],
        examples: Array.isArray(row.examples) ? row.examples : [],
      });
    }
    grouped.set(row.canon_id, current);
  }

  return canons.map((canon) => ({
    ...canon,
    entries: grouped.get(canon.id) ?? [],
  }));
}

export async function listRelevantArtDirectionCanonEntries(params: {
  tenantId?: string | null;
  canonSlugs?: string[] | null;
  limit?: number;
}): Promise<ArtDirectionCanonEntrySummary[]> {
  const values: any[] = [];
  const where: string[] = [`e.status = 'active'`];

  if (params.tenantId) {
    values.push(params.tenantId);
    where.push(`(e.tenant_id = $${values.length} OR e.tenant_id IS NULL)`);
  } else {
    where.push(`e.tenant_id IS NULL`);
  }

  if (params.canonSlugs?.length) {
    values.push(params.canonSlugs);
    where.push(`c.slug = ANY($${values.length}::text[])`);
  }

  values.push(Math.min(params.limit ?? 8, 20));

  const { rows } = await query<ArtDirectionCanonEntrySummary>(
    `SELECT
       e.id,
       e.canon_id,
       c.slug AS canon_slug,
       c.title AS canon_title,
       e.slug,
       e.title,
       e.summary_short,
       e.definition,
       COALESCE(e.heuristics, '[]'::jsonb) AS heuristics,
       COALESCE(e.critique_checks, '[]'::jsonb) AS critique_checks,
       COALESCE(e.examples, '[]'::jsonb) AS examples,
       e.status,
       e.source_confidence
     FROM da_canon_entries e
     JOIN da_canons c ON c.id = e.canon_id
     WHERE ${where.join(' AND ')}
     ORDER BY
       c.sort_order ASC,
       e.source_confidence DESC,
       e.updated_at DESC,
       e.title ASC
     LIMIT $${values.length}`,
    values,
  );

  return rows.map((row) => ({
    ...row,
    heuristics: Array.isArray(row.heuristics) ? row.heuristics : [],
    critique_checks: Array.isArray(row.critique_checks) ? row.critique_checks : [],
    examples: Array.isArray(row.examples) ? row.examples : [],
  }));
}

export async function listArtDirectionTrendSignals(params: {
  tenantId: string;
  clientId?: string | null;
  platform?: string | null;
  segment?: string | null;
  windowKey?: string;
  limit?: number;
}): Promise<ArtDirectionTrendSignal[]> {
  const values: any[] = [params.tenantId];
  const where = [`tenant_id = $1`, `window_key = $2`];
  values.push(params.windowKey ?? 'rolling_30d');

  if (params.clientId) {
    values.push(params.clientId);
    where.push(`(client_id = $${values.length} OR client_id IS NULL)`);
  }
  if (params.platform) {
    values.push(params.platform);
    where.push(`(platform = $${values.length} OR platform IS NULL)`);
  }
  if (params.segment) {
    values.push(params.segment);
    where.push(`(segment = $${values.length} OR segment IS NULL)`);
  }

  values.push(Math.min(params.limit ?? 5, 10));

  const { rows } = await query<ArtDirectionTrendSignal>(
    `SELECT id, cluster_key, tag, sample_size, recent_count, previous_count,
            momentum, trust_score, trend_score, platform, segment
       FROM da_trend_snapshots
      WHERE ${where.join(' AND ')}
      ORDER BY
        CASE WHEN client_id IS NOT NULL THEN 0 ELSE 1 END,
        trend_score DESC,
        momentum DESC,
        sample_size DESC
      LIMIT $${values.length}`,
    values,
  );

  return rows;
}

export async function getArtDirectionMemoryStats(params: {
  tenantId: string;
  clientId?: string | null;
  platform?: string | null;
  segment?: string | null;
  windowKey?: string;
}): Promise<ArtDirectionMemoryStats> {
  const referenceValues: any[] = [params.tenantId];
  const referenceWhere = [`tenant_id = $1`];

  if (params.clientId) {
    referenceValues.push(params.clientId);
    referenceWhere.push(`(client_id = $${referenceValues.length} OR client_id IS NULL)`);
  }
  if (params.platform) {
    referenceValues.push(params.platform);
    referenceWhere.push(`(platform = $${referenceValues.length} OR platform IS NULL)`);
  }
  if (params.segment) {
    referenceValues.push(params.segment);
    referenceWhere.push(`(segment = $${referenceValues.length} OR segment IS NULL)`);
  }

  const trendValues: any[] = [params.tenantId, params.windowKey ?? 'rolling_30d'];
  const trendWhere = [`tenant_id = $1`, `window_key = $2`];
  if (params.clientId) {
    trendValues.push(params.clientId);
    trendWhere.push(`(client_id = $${trendValues.length} OR client_id IS NULL)`);
  }
  if (params.platform) {
    trendValues.push(params.platform);
    trendWhere.push(`(platform = $${trendValues.length} OR platform IS NULL)`);
  }
  if (params.segment) {
    trendValues.push(params.segment);
    trendWhere.push(`(segment = $${trendValues.length} OR segment IS NULL)`);
  }

  const feedbackValues: any[] = [params.tenantId];
  const feedbackWhere = [`tenant_id = $1`];
  if (params.clientId) {
    feedbackValues.push(params.clientId);
    feedbackWhere.push(`(client_id = $${feedbackValues.length} OR client_id IS NULL)`);
  }
  if (params.platform) {
    feedbackValues.push(params.platform);
    feedbackWhere.push(`(metadata->>'platform' = $${feedbackValues.length} OR metadata->>'platform' IS NULL)`);
  }
  if (params.segment) {
    feedbackValues.push(params.segment);
    feedbackWhere.push(`(metadata->>'segment' = $${feedbackValues.length} OR metadata->>'segment' IS NULL)`);
  }

  const [conceptRows, referenceRows, trendRows, feedbackRows] = await Promise.all([
    query<{ active: number }>(
      `SELECT COUNT(*)::int AS active
         FROM da_concepts
        WHERE status = 'active'
          AND (tenant_id = $1 OR tenant_id IS NULL)`,
      [params.tenantId],
    ),
    query<{
      discovered: number;
      analyzed: number;
      rejected: number;
      archived: number;
      last_discovered_at: string | null;
      last_analyzed_at: string | null;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'discovered')::int AS discovered,
         COUNT(*) FILTER (WHERE status = 'analyzed')::int AS analyzed,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
         COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
         MAX(discovered_at)::text AS last_discovered_at,
         MAX(analyzed_at)::text AS last_analyzed_at
       FROM da_references
      WHERE ${referenceWhere.join(' AND ')}`,
      referenceValues,
    ),
    query<{ snapshots: number; last_snapshot_at: string | null }>(
      `SELECT
         COUNT(*)::int AS snapshots,
         MAX(snapshot_at)::text AS last_snapshot_at
       FROM da_trend_snapshots
      WHERE ${trendWhere.join(' AND ')}`,
      trendValues,
    ),
    query<{ used: number; approved: number; rejected: number; saved: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'used')::int AS used,
         COUNT(*) FILTER (WHERE event_type = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE event_type = 'rejected')::int AS rejected,
         COUNT(*) FILTER (WHERE event_type = 'saved')::int AS saved
       FROM da_feedback_events
      WHERE ${feedbackWhere.join(' AND ')}`,
      feedbackValues,
    ),
  ]);

  const reference = referenceRows.rows[0];
  const trend = trendRows.rows[0];
  const feedback = feedbackRows.rows[0];

  return {
    concepts: {
      active: conceptRows.rows[0]?.active ?? 0,
    },
    references: {
      discovered: reference?.discovered ?? 0,
      analyzed: reference?.analyzed ?? 0,
      rejected: reference?.rejected ?? 0,
      archived: reference?.archived ?? 0,
      lastDiscoveredAt: reference?.last_discovered_at ?? null,
      lastAnalyzedAt: reference?.last_analyzed_at ?? null,
    },
    trends: {
      snapshots: trend?.snapshots ?? 0,
      lastSnapshotAt: trend?.last_snapshot_at ?? null,
    },
    feedback: {
      used: feedback?.used ?? 0,
      approved: feedback?.approved ?? 0,
      rejected: feedback?.rejected ?? 0,
      saved: feedback?.saved ?? 0,
    },
  };
}

function formatList(values: string[], limit = 3): string {
  return uniq(values).slice(0, limit).join(', ');
}

export async function buildArtDirectionMemoryContext(params: {
  tenantId?: string | null;
  clientId?: string | null;
  platform?: string | null;
  segment?: string | null;
  conceptCategories?: string[] | null;
  conceptLimit?: number;
  referenceLimit?: number;
  trendLimit?: number;
}): Promise<ArtDirectionMemoryContext> {
  if (!params.tenantId) {
    return { concepts: [], references: [], trends: [], promptBlock: '', critiqueBlock: '' };
  }

  const [concepts, canonEntries, references, trends] = await Promise.all([
    listRelevantArtDirectionConcepts({
      tenantId: params.tenantId,
      categories: params.conceptCategories,
      limit: params.conceptLimit ?? 5,
    }).catch(() => []),
    listRelevantArtDirectionCanonEntries({
      tenantId: params.tenantId,
      canonSlugs: params.conceptCategories ?? undefined,
      limit: params.conceptLimit ?? 5,
    }).catch(() => []),
    listRelevantArtDirectionReferences({
      tenantId: params.tenantId,
      clientId: params.clientId,
      platform: params.platform,
      segment: params.segment,
      limit: params.referenceLimit ?? 5,
    }).catch(() => []),
    listArtDirectionTrendSignals({
      tenantId: params.tenantId,
      clientId: params.clientId,
      platform: params.platform,
      segment: params.segment,
      limit: params.trendLimit ?? 4,
    }).catch(() => []),
  ]);

  const canonLines = canonEntries.map((entry) => {
    const heuristics = entry.heuristics.length ? `heurísticas: ${formatList(entry.heuristics, 2)}` : '';
    const checks = entry.critique_checks.length ? `checks: ${formatList(entry.critique_checks, 2)}` : '';
    return `- ${entry.title} [${entry.canon_title}]: ${entry.definition}${heuristics || checks ? ` | ${[heuristics, checks].filter(Boolean).join(' | ')}` : ''}`;
  });

  const conceptLines = concepts.map((concept) => {
    const heuristics = concept.heuristics.length ? `heurísticas: ${formatList(concept.heuristics, 2)}` : '';
    const checks = concept.critique_checks.length ? `checks: ${formatList(concept.critique_checks, 2)}` : '';
    return `- ${concept.title}: ${concept.definition}${heuristics || checks ? ` | ${[heuristics, checks].filter(Boolean).join(' | ')}` : ''}`;
  });

  const referenceLines = references.map((reference) => {
    const tags = formatList([
      ...(reference.style_tags ?? []),
      ...(reference.composition_tags ?? []),
      ...(reference.typography_tags ?? []),
    ], 3);
    return `- ${reference.title} (${reference.platform ?? 'geral'}${reference.format ? ` / ${reference.format}` : ''}) | direção: ${reference.creative_direction ?? reference.visual_intent ?? 'não classificada'}${tags ? ` | tags: ${tags}` : ''}`;
  });

  const trendLines = trends.map((trend) =>
    `- ${trend.tag} [${trend.cluster_key}] | score ${Number(trend.trend_score || 0).toFixed(1)} | momentum ${Number(trend.momentum || 0).toFixed(2)}`
  );

  const promptSections = [
    canonLines.length
      ? `BIBLIOTECA DE CONHECIMENTO DA EDRO:\n${canonLines.join('\n')}`
      : conceptLines.length
      ? `DESIGN CANON RELEVANTE:\n${conceptLines.join('\n')}`
      : '',
    trendLines.length ? `TENDÊNCIAS DETECTADAS:\n${trendLines.join('\n')}` : '',
    referenceLines.length ? `REFERÊNCIAS RECENTES DA MEMÓRIA:\n${referenceLines.join('\n')}` : '',
  ].filter(Boolean);

  const critiqueSections = [
    canonEntries.length
      ? `REGRAS EXTRAS DE CRÍTICA DA BIBLIOTECA:\n${canonEntries.map((entry) => `- ${entry.title}: ${formatList(entry.critique_checks, 3) || formatList(entry.heuristics, 2)}`).join('\n')}`
      : concepts.length
      ? `REGRAS EXTRAS DE CRÍTICA:\n${concepts.map((concept) => `- ${concept.title}: ${formatList(concept.critique_checks, 3) || formatList(concept.heuristics, 2)}`).join('\n')}`
      : '',
    trends.length
      ? `SINAIS DE TENDÊNCIA A OBSERVAR:\n${trends.map((trend) => `- ${trend.tag}: use apenas se reforçar clareza, marca e canal`).join('\n')}`
      : '',
  ].filter(Boolean);

  return {
    concepts,
    references,
    trends,
    promptBlock: promptSections.join('\n\n'),
    critiqueBlock: critiqueSections.join('\n\n'),
  };
}
