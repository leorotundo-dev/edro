-- Public shareable tokens for interactive client reports
CREATE TABLE IF NOT EXISTS client_report_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  period_month TEXT NOT NULL,  -- 'YYYY-MM'
  label       TEXT,            -- optional display label
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, period_month)
);

CREATE INDEX IF NOT EXISTS client_report_tokens_token_idx ON client_report_tokens (token);
CREATE INDEX IF NOT EXISTS client_report_tokens_client_idx ON client_report_tokens (client_id, period_month DESC);
