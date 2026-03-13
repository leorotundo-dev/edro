CREATE TABLE IF NOT EXISTS job_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  allocation_kind TEXT NOT NULL DEFAULT 'primary',
  status TEXT NOT NULL DEFAULT 'committed',
  week_start DATE NOT NULL,
  planned_minutes INT NOT NULL DEFAULT 0,
  actual_minutes INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_allocations_status_check CHECK (status IN ('tentative', 'committed', 'blocked', 'done', 'dropped')),
  CONSTRAINT job_allocations_kind_unique UNIQUE (tenant_id, job_id, allocation_kind)
);

CREATE INDEX IF NOT EXISTS idx_job_allocations_tenant_week
  ON job_allocations(tenant_id, week_start, status);

CREATE INDEX IF NOT EXISTS idx_job_allocations_owner
  ON job_allocations(owner_id, week_start);

CREATE TABLE IF NOT EXISTS calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  priority_band TEXT,
  risk_level TEXT,
  capacity_minutes INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT calendar_items_unique_source UNIQUE (tenant_id, source_type, source_id, item_type)
);

CREATE INDEX IF NOT EXISTS idx_calendar_items_tenant_starts
  ON calendar_items(tenant_id, starts_at, item_type);

CREATE INDEX IF NOT EXISTS idx_calendar_items_job
  ON calendar_items(job_id);

CREATE TABLE IF NOT EXISTS risk_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  risk_type TEXT NOT NULL,
  risk_score INT NOT NULL DEFAULT 0,
  risk_band TEXT NOT NULL,
  summary TEXT NOT NULL,
  suggested_action TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT risk_signals_unique_entity UNIQUE (tenant_id, entity_type, entity_id, risk_type)
);

CREATE INDEX IF NOT EXISTS idx_risk_signals_tenant_band
  ON risk_signals(tenant_id, risk_band, resolved_at);

CREATE INDEX IF NOT EXISTS idx_risk_signals_client
  ON risk_signals(client_id, risk_band, resolved_at);
