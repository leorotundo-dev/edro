CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS library_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  weight TEXT NOT NULL DEFAULT 'medium',
  use_in_ai BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from DATE NULL,
  valid_to DATE NULL,
  notes TEXT NULL,
  source_url TEXT NULL,
  file_key TEXT NULL,
  file_mime TEXT NULL,
  file_size_bytes BIGINT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_library_items_tenant_client
  ON library_items(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_library_items_status
  ON library_items(tenant_id, status);

CREATE TABLE IF NOT EXISTS library_item_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  diff JSONB NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(library_item_id, version)
);

CREATE INDEX IF NOT EXISTS idx_library_versions_item
  ON library_item_versions(library_item_id, version DESC);

CREATE TABLE IF NOT EXISTS library_docs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  lang TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_library_docs_item
  ON library_docs(library_item_id);

CREATE TABLE IF NOT EXISTS library_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  weight TEXT NOT NULL DEFAULT 'medium',
  use_in_ai BOOLEAN NOT NULL DEFAULT TRUE,
  embedding vector(1536) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(library_item_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_library_chunks_tenant_client
  ON library_chunks(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_library_chunks_item
  ON library_chunks(library_item_id);

CREATE INDEX IF NOT EXISTS idx_library_chunks_embedding
  ON library_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS post_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  post_asset_id UUID NOT NULL REFERENCES post_assets(id) ON DELETE CASCADE,
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  chunk_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  score NUMERIC NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_sources_post
  ON post_sources(post_asset_id);

CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_status_time
  ON job_queue(status, scheduled_for);
