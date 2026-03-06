-- Pre-generated monthly reports per client
CREATE TABLE IF NOT EXISTS client_monthly_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id    TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_month TEXT NOT NULL,           -- 'YYYY-MM'
  title        TEXT NOT NULL,
  pdf_key      TEXT,                    -- storage key (S3 or local)
  pdf_url      TEXT,                    -- public URL (if stored externally)
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, period_month)
);
