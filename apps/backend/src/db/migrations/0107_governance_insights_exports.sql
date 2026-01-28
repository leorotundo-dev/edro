CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS post_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id UUID NOT NULL REFERENCES monthly_calendars(id) ON DELETE CASCADE,
  post_index INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  reviewer TEXT NULL,
  notes TEXT NULL,
  approved_at TIMESTAMPTZ NULL,
  published_at TIMESTAMPTZ NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (calendar_id, post_index)
);

CREATE INDEX IF NOT EXISTS idx_post_assets_calendar ON post_assets (calendar_id, status);

CREATE TABLE IF NOT EXISTS learned_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  time_window TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learned_insights_client_platform ON learned_insights (client_id, platform);

CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  calendar_id UUID NOT NULL REFERENCES monthly_calendars(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  file_path TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
