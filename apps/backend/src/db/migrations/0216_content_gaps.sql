-- Content gaps detected by AI for each client
CREATE TABLE IF NOT EXISTS client_content_gaps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gaps        JSONB NOT NULL DEFAULT '[]'::jsonb,
  market_context TEXT NULL,
  citations   JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_content_gaps_lookup
  ON client_content_gaps (tenant_id, client_id, detected_at DESC);
