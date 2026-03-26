-- 0303_da_memory_foundation.sql
-- Fundação para memória de direção de arte.

CREATE TABLE IF NOT EXISTS da_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  definition TEXT NOT NULL,
  heuristics JSONB NOT NULL DEFAULT '[]'::jsonb,
  when_to_use JSONB NOT NULL DEFAULT '[]'::jsonb,
  when_to_avoid JSONB NOT NULL DEFAULT '[]'::jsonb,
  critique_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'manual',
  trust_score NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'draft', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_da_concepts_scope_slug
  ON da_concepts ((COALESCE(tenant_id, 'global')), slug);

CREATE INDEX IF NOT EXISTS idx_da_concepts_category
  ON da_concepts ((COALESCE(tenant_id, 'global')), category);

CREATE TABLE IF NOT EXISTS da_reference_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('search', 'manual', 'social', 'rss', 'site', 'library')),
  base_url TEXT NULL,
  domain TEXT NULL,
  trust_score NUMERIC(5,2) NOT NULL DEFAULT 0.60,
  enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_da_reference_sources_scope_name
  ON da_reference_sources ((COALESCE(tenant_id, 'global')), name);

CREATE TABLE IF NOT EXISTS da_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id UUID NULL REFERENCES clients(id) ON DELETE CASCADE,
  source_id UUID NULL REFERENCES da_reference_sources(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  canonical_url TEXT NULL,
  domain TEXT NULL,
  title TEXT NOT NULL,
  snippet TEXT NULL,
  image_url TEXT NULL,
  search_query TEXT NULL,
  source_kind TEXT NOT NULL DEFAULT 'search'
    CHECK (source_kind IN ('search', 'manual', 'social', 'library', 'crawl')),
  status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (status IN ('discovered', 'analyzed', 'rejected', 'archived')),
  platform TEXT NULL,
  format TEXT NULL,
  segment TEXT NULL,
  published_at TIMESTAMPTZ NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analyzed_at TIMESTAMPTZ NULL,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0.50,
  trend_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  visual_intent TEXT NULL,
  creative_direction TEXT NULL,
  mood_words JSONB NOT NULL DEFAULT '[]'::jsonb,
  style_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  composition_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  typography_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  color_palette JSONB NOT NULL DEFAULT '[]'::jsonb,
  trend_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  rationale TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_da_references_scope_url
  ON da_references (tenant_id, source_url);

CREATE INDEX IF NOT EXISTS idx_da_references_client_status
  ON da_references (tenant_id, client_id, status, discovered_at DESC);

CREATE INDEX IF NOT EXISTS idx_da_references_platform
  ON da_references (tenant_id, platform, discovered_at DESC);

CREATE INDEX IF NOT EXISTS idx_da_references_segment
  ON da_references (tenant_id, segment, discovered_at DESC);

CREATE INDEX IF NOT EXISTS idx_da_references_trend
  ON da_references (tenant_id, trend_score DESC, confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_da_references_style_tags
  ON da_references USING GIN (style_tags);

CREATE INDEX IF NOT EXISTS idx_da_references_mood_words
  ON da_references USING GIN (mood_words);

CREATE INDEX IF NOT EXISTS idx_da_references_trend_signals
  ON da_references USING GIN (trend_signals);

CREATE TABLE IF NOT EXISTS da_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id UUID NULL REFERENCES clients(id) ON DELETE CASCADE,
  creative_session_id UUID NULL,
  reference_id UUID NULL REFERENCES da_references(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('used', 'approved', 'rejected', 'edited', 'performed', 'saved')),
  score NUMERIC(6,2) NULL,
  notes TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_da_feedback_events_lookup
  ON da_feedback_events (tenant_id, client_id, event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS da_trend_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id UUID NULL REFERENCES clients(id) ON DELETE CASCADE,
  window_key TEXT NOT NULL,
  segment TEXT NULL,
  platform TEXT NULL,
  cluster_key TEXT NOT NULL,
  tag TEXT NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 0,
  recent_count INTEGER NOT NULL DEFAULT 0,
  previous_count INTEGER NOT NULL DEFAULT 0,
  momentum NUMERIC(8,3) NOT NULL DEFAULT 0,
  trust_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  trend_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  top_reference_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_da_trend_snapshots_lookup
  ON da_trend_snapshots (tenant_id, client_id, window_key, trend_score DESC, snapshot_at DESC);
