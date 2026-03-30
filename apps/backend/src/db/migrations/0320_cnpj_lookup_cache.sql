CREATE TABLE IF NOT EXISTS cnpj_lookup_cache (
  cnpj        TEXT PRIMARY KEY,
  provider    TEXT NOT NULL DEFAULT 'brasilapi',
  status      TEXT NOT NULL CHECK (status IN ('found_active', 'found_inactive', 'not_found')),
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cnpj_lookup_cache_expires_at
  ON cnpj_lookup_cache (expires_at);
