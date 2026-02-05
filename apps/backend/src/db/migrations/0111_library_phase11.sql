CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Try to enable vector extension (non-fatal if unavailable)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector extension not available, embedding features disabled';
END $$;

-- Core library tables (no vector dependency)
CREATE TABLE IF NOT EXISTS library_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  client_id TEXT NOT NULL,
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
  tenant_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  lang TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_library_docs_item
  ON library_docs(library_item_id);

-- library_chunks: try with vector column, fallback to TEXT
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS library_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    client_id TEXT NOT NULL,
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
EXCEPTION WHEN OTHERS THEN
  CREATE TABLE IF NOT EXISTS library_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    client_id TEXT NOT NULL,
    library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'geral',
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    weight TEXT NOT NULL DEFAULT 'medium',
    use_in_ai BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(library_item_id, chunk_index)
  );
  RAISE NOTICE 'Created library_chunks without embedding column (vector not available)';
END $$;

CREATE INDEX IF NOT EXISTS idx_library_chunks_tenant_client
  ON library_chunks(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_library_chunks_item
  ON library_chunks(library_item_id);

-- Vector index (non-fatal if vector not available)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_library_chunks_embedding
    ON library_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Vector index not created (vector extension not available)';
END $$;

-- post_sources table (non-fatal if post_assets doesn't exist yet)
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS post_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    post_asset_id UUID NOT NULL,
    library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
    chunk_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    score NUMERIC NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_post_sources_post
    ON post_sources(post_asset_id);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'post_sources table creation deferred';
END $$;

CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
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
