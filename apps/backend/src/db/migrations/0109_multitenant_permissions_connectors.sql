CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TENANT USERS (MEMBERSHIP)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_users (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'reviewer',
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_role
  ON tenant_users (tenant_id, role);

-- ============================================================
-- CLIENTS -> TENANT + PROFILE JSON
-- ============================================================
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_clients_tenant
  ON clients (tenant_id);

-- ============================================================
-- CLIENT PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS client_permissions (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  perm TEXT NOT NULL,
  PRIMARY KEY (tenant_id, client_id, user_id, perm)
);

CREATE INDEX IF NOT EXISTS idx_client_perms_user
  ON client_permissions (tenant_id, user_id);

-- ============================================================
-- CONNECTORS
-- ============================================================
CREATE TABLE IF NOT EXISTS connectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_connectors_lookup
  ON connectors (tenant_id, client_id, provider);

-- ============================================================
-- TENANT SCOPING FOR CALENDAR PIPELINE TABLES
-- ============================================================
ALTER TABLE monthly_calendars
  ADD COLUMN IF NOT EXISTS tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE flow_runs
  ADD COLUMN IF NOT EXISTS tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE learned_insights
  ADD COLUMN IF NOT EXISTS tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE exports
  ADD COLUMN IF NOT EXISTS tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE post_assets
  ADD COLUMN IF NOT EXISTS tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE publish_queue
  ADD COLUMN IF NOT EXISTS tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_monthly_calendars_tenant
  ON monthly_calendars (tenant_id, client_id, month);

CREATE INDEX IF NOT EXISTS idx_post_assets_tenant
  ON post_assets (tenant_id, calendar_id);

CREATE INDEX IF NOT EXISTS idx_publish_queue_tenant
  ON publish_queue (tenant_id, status, scheduled_for);
