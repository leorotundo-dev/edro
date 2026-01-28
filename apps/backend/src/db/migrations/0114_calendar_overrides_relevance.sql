CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS segment_secondary TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS calendar_event_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  force_include BOOLEAN NOT NULL DEFAULT false,
  force_exclude BOOLEAN NOT NULL DEFAULT false,
  custom_priority INT NULL CHECK (custom_priority BETWEEN 1 AND 10),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, calendar_event_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_overrides_client
  ON calendar_event_overrides (tenant_id, client_id);

CREATE INDEX IF NOT EXISTS idx_calendar_overrides_event
  ON calendar_event_overrides (tenant_id, calendar_event_id);

CREATE TABLE IF NOT EXISTS calendar_event_relevance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  relevance_score INT NOT NULL DEFAULT 0 CHECK (relevance_score BETWEEN 0 AND 100),
  is_relevant BOOLEAN NOT NULL DEFAULT false,
  relevance_reason JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, calendar_event_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_relevance_client
  ON calendar_event_relevance (tenant_id, client_id);

CREATE INDEX IF NOT EXISTS idx_calendar_relevance_event
  ON calendar_event_relevance (tenant_id, calendar_event_id);
