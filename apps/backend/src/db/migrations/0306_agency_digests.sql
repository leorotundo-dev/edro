-- Agency daily/weekly digests for management
CREATE TABLE IF NOT EXISTS agency_digests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  content       JSONB NOT NULL DEFAULT '{}',
  narrative_text TEXT,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, type, period_start)
);

CREATE INDEX IF NOT EXISTS agency_digests_tenant_idx ON agency_digests (tenant_id, created_at DESC);
