-- 0103_edro_scheduler_bootstrap.sql
-- Bootstrap scheduler tables for Edro.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS job_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(100) NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_schedules_enabled ON job_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_job_schedules_next_run ON job_schedules(next_run);

CREATE TABLE IF NOT EXISTS job_logs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS job_name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS items_processed INTEGER DEFAULT 0;
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS items_failed INTEGER DEFAULT 0;
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_job_logs_job_name ON job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_job_logs_started_at ON job_logs(started_at DESC);

INSERT INTO job_schedules (name, type, schedule, data, enabled)
VALUES ('Edro Scheduler Placeholder', 'edro-noop', '0 3 * * *', '{}'::jsonb, true)
ON CONFLICT (name) DO NOTHING;
