CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CLIENT SOURCES (WEB + SOCIAL)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  platform TEXT NULL,
  url TEXT NOT NULL,
  handle TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_fetched_at TIMESTAMPTZ NULL,
  last_hash TEXT NULL,
  last_content_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, source_type, platform, url)
);

CREATE INDEX IF NOT EXISTS idx_client_sources_lookup
  ON client_sources (tenant_id, client_id, source_type, platform);

-- ============================================================
-- CLIENT DOCUMENTS (SCRAPED + SOCIAL POSTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source_id UUID NULL REFERENCES client_sources(id) ON DELETE SET NULL,
  source_type TEXT NULL,
  platform TEXT NULL,
  url TEXT NULL,
  title TEXT NULL,
  content_text TEXT NULL,
  content_excerpt TEXT NULL,
  language TEXT NULL,
  published_at TIMESTAMPTZ NULL,
  content_hash TEXT NULL,
  raw_url TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client
  ON client_documents (tenant_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_documents_hash
  ON client_documents (tenant_id, client_id, content_hash);

-- ============================================================
-- CLIENT INSIGHTS (AI SUMMARY)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period TEXT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_insights_client
  ON client_insights (tenant_id, client_id, created_at DESC);
