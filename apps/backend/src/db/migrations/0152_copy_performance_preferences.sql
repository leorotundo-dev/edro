-- Migration: Copy Performance Preferences (Learning Loop)
-- Stores aggregated learned preferences per client for AI copy generation

CREATE TABLE IF NOT EXISTS copy_performance_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  rebuilt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_cpp_tenant_client
  ON copy_performance_preferences (tenant_id, client_id);

-- Index for score-based lookups on copy versions
CREATE INDEX IF NOT EXISTS idx_copy_versions_score
  ON edro_copy_versions (score) WHERE score IS NOT NULL;
