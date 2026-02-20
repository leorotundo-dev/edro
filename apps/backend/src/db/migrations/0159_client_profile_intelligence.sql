-- Profile intelligence foundation (separate from confirmed profile data)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS profile_suggestions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending'
    CHECK (enrichment_status IN ('pending', 'running', 'done', 'failed'));

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS sections_refreshed_at JSONB DEFAULT '{}'::jsonb;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS intelligence_score INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clients_enrichment_status_tenant
  ON clients (tenant_id, enrichment_status);

CREATE INDEX IF NOT EXISTS idx_clients_intelligence_refreshed_tenant
  ON clients (tenant_id, intelligence_refreshed_at);
