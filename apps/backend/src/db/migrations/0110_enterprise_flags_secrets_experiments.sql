CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- FEATURE FLAGS (PER TENANT)
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant
  ON feature_flags (tenant_id);

-- ============================================================
-- CONNECTORS: ENCRYPTED SECRETS
-- ============================================================
ALTER TABLE connectors
  ADD COLUMN IF NOT EXISTS secrets_enc TEXT NULL;

ALTER TABLE connectors
  ADD COLUMN IF NOT EXISTS secrets_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- A/B TEST EXPERIMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  hypothesis TEXT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS experiment_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  weight INT NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS experiment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  time_window TEXT NOT NULL,
  metrics JSONB NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiments_tenant_client
  ON experiments (tenant_id, client_id, platform);
