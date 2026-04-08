CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS reportei_projects (
  tenant_id TEXT NOT NULL,
  reportei_project_id BIGINT NOT NULL,
  company_id BIGINT,
  name TEXT,
  status TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, reportei_project_id)
);

CREATE INDEX IF NOT EXISTS idx_reportei_projects_tenant_name
  ON reportei_projects (tenant_id, name);

CREATE TABLE IF NOT EXISTS reportei_integrations (
  tenant_id TEXT NOT NULL,
  reportei_integration_id BIGINT NOT NULL,
  reportei_project_id BIGINT,
  company_id BIGINT,
  slug TEXT,
  name TEXT,
  status TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, reportei_integration_id)
);

CREATE INDEX IF NOT EXISTS idx_reportei_integrations_tenant_project
  ON reportei_integrations (tenant_id, reportei_project_id);

CREATE INDEX IF NOT EXISTS idx_reportei_integrations_tenant_slug
  ON reportei_integrations (tenant_id, slug);

CREATE TABLE IF NOT EXISTS reportei_metric_catalog (
  tenant_id TEXT NOT NULL,
  integration_slug TEXT NOT NULL,
  metric_id TEXT NOT NULL,
  reference_key TEXT,
  component TEXT,
  metric_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, integration_slug, metric_id)
);

CREATE INDEX IF NOT EXISTS idx_reportei_metric_catalog_tenant_ref
  ON reportei_metric_catalog (tenant_id, reference_key);

CREATE TABLE IF NOT EXISTS reportei_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  run_type TEXT NOT NULL,
  scope TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  reportei_project_id BIGINT,
  reportei_integration_id BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reportei_sync_runs_tenant_started
  ON reportei_sync_runs (tenant_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_reportei_sync_runs_tenant_type
  ON reportei_sync_runs (tenant_id, run_type, status);

CREATE TABLE IF NOT EXISTS reportei_metric_raw_payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT,
  reportei_project_id BIGINT,
  reportei_integration_id BIGINT NOT NULL,
  integration_slug TEXT NOT NULL,
  time_window TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  comparison_start DATE,
  comparison_end DATE,
  request_key TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, reportei_integration_id, request_key)
);

CREATE INDEX IF NOT EXISTS idx_reportei_metric_raw_payloads_tenant_project
  ON reportei_metric_raw_payloads (tenant_id, reportei_project_id, synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_reportei_metric_raw_payloads_tenant_client
  ON reportei_metric_raw_payloads (tenant_id, client_id, synced_at DESC);

CREATE TABLE IF NOT EXISTS reportei_resource_raw (
  tenant_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  reportei_project_id BIGINT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_reportei_resource_raw_tenant_type
  ON reportei_resource_raw (tenant_id, resource_type, synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_reportei_resource_raw_tenant_project
  ON reportei_resource_raw (tenant_id, reportei_project_id, resource_type);

CREATE TABLE IF NOT EXISTS reportei_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  integration_id BIGINT NOT NULL,
  platform TEXT NOT NULL,
  time_window TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, integration_id, platform, time_window, period_start)
);
