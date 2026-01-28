CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  uf TEXT,
  city TEXT,
  segment_primary TEXT,
  reportei_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  date_type TEXT NOT NULL,
  date TEXT,
  rule TEXT,
  start_date TEXT,
  end_date TEXT,
  scope TEXT NOT NULL,
  country TEXT,
  uf TEXT,
  city TEXT,
  categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  base_relevance INT NOT NULL DEFAULT 50,
  segment_boosts JSONB NOT NULL DEFAULT '{}'::jsonb,
  platform_affinity JSONB NOT NULL DEFAULT '{}'::jsonb,
  avoid_segments TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_trend_sensitive BOOLEAN NOT NULL DEFAULT true,
  source TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_country ON events (country);

CREATE TABLE IF NOT EXISTS monthly_calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  platform TEXT NOT NULL,
  objective TEXT NOT NULL,
  posts JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monthly_calendars_client ON monthly_calendars (client_id, month);

CREATE TABLE IF NOT EXISTS flow_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  platform TEXT NOT NULL,
  objective TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flow_runs_client ON flow_runs (client_id, month);
