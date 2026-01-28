-- ============================================================
-- CLIPPING CORE
-- ============================================================

CREATE TABLE IF NOT EXISTS clipping_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'GLOBAL', -- GLOBAL | CLIENT
  client_id TEXT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'RSS', -- RSS | URL | YOUTUBE | OTHER
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  country TEXT NULL,
  uf TEXT NULL,
  city TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fetch_interval_minutes INT NOT NULL DEFAULT 60,
  last_fetched_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'OK', -- OK | ERROR
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clipping_sources_unique
  ON clipping_sources (tenant_id, url);

CREATE INDEX IF NOT EXISTS clipping_sources_scope
  ON clipping_sources (tenant_id, scope, client_id);

-- ============================================================
-- CLIPPING ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS clipping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES clipping_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL,
  published_at TIMESTAMPTZ NULL,
  snippet TEXT NULL,
  type TEXT NOT NULL DEFAULT 'NEWS', -- NEWS | TREND
  segments TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  country TEXT NULL,
  uf TEXT NULL,
  city TEXT NULL,
  score INT NOT NULL DEFAULT 0,
  suggested_client_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  assigned_client_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'NEW', -- NEW | TRIAGED | PINNED | ARCHIVED
  used_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clipping_items_unique
  ON clipping_items (tenant_id, url_hash);

CREATE INDEX IF NOT EXISTS clipping_items_status
  ON clipping_items (tenant_id, status);

CREATE INDEX IF NOT EXISTS clipping_items_published
  ON clipping_items (tenant_id, published_at DESC);

CREATE INDEX IF NOT EXISTS clipping_items_score
  ON clipping_items (tenant_id, score DESC);

-- ============================================================
-- CLIPPING ACTIONS (AUDIT)
-- ============================================================

CREATE TABLE IF NOT EXISTS clipping_item_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES clipping_items(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES edro_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- ASSIGN | PIN | CREATE_POST | ARCHIVE
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clipping_item_actions_item
  ON clipping_item_actions (tenant_id, item_id, created_at DESC);

-- ============================================================
-- COLLECTIONS (PINS)
-- ============================================================

CREATE TABLE IF NOT EXISTS clipping_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'GLOBAL', -- GLOBAL | CLIENT
  client_id TEXT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clipping_collections_scope
  ON clipping_collections (tenant_id, scope, client_id);

CREATE TABLE IF NOT EXISTS clipping_collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES clipping_collections(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES clipping_items(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, item_id)
);

CREATE INDEX IF NOT EXISTS clipping_collection_items_lookup
  ON clipping_collection_items (tenant_id, collection_id);
