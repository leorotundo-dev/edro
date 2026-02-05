CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  feature TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  cost_brl NUMERIC(10,4) NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_tenant_created ON ai_usage_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_provider ON ai_usage_log(provider, created_at DESC);
