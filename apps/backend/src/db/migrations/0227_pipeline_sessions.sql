-- Pipeline session state persistence
-- Saves the full creative pipeline state so users can resume after refresh

CREATE TABLE IF NOT EXISTS pipeline_sessions (
  briefing_id   UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL,
  state         JSONB NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_sessions_tenant ON pipeline_sessions (tenant_id);
