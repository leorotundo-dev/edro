-- Evolve client_monthly_reports from PDF storage to structured document
ALTER TABLE client_monthly_reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_token TEXT DEFAULT encode(gen_random_bytes(24), 'hex'),
  ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Backfill access_token for existing rows
UPDATE client_monthly_reports SET access_token = encode(gen_random_bytes(24), 'hex') WHERE access_token IS NULL;

-- Make access_token unique after backfill
ALTER TABLE client_monthly_reports ADD CONSTRAINT cmr_access_token_unique UNIQUE (access_token);

CREATE INDEX IF NOT EXISTS idx_cmr_status ON client_monthly_reports (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cmr_access_token ON client_monthly_reports (access_token);
CREATE INDEX IF NOT EXISTS idx_cmr_client_period ON client_monthly_reports (client_id, period_month DESC);
