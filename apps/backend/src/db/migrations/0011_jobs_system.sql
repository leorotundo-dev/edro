-- 0011_jobs_system.sql
-- Sistema de Jobs e Automação

-- =====================================================
-- 1. JOBS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'harvest', 'generate_embeddings', 'generate_drops', etc
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  data JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_queue ON jobs(status, priority DESC, created_at ASC) 
  WHERE status = 'pending';

-- =====================================================
-- 2. JOB SCHEDULES (Cron-like)
-- =====================================================
CREATE TABLE IF NOT EXISTS job_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(100) NOT NULL,
  schedule VARCHAR(100) NOT NULL, -- cron expression
  data JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_schedules_enabled ON job_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_job_schedules_next_run ON job_schedules(next_run);

-- =====================================================
-- 3. JOB LOGS
-- =====================================================
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID, -- FK will be added later if needed
    level VARCHAR(20) NOT NULL, -- 'info', 'warn', 'error'
    message TEXT NOT NULL,
    data JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Garantir coluna job_id mesmo em tabelas pré-existentes
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS job_id UUID;
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS level VARCHAR(20) NOT NULL DEFAULT 'info';
ALTER TABLE job_logs ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_job_logs_job ON job_logs(job_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_level ON job_logs(level);
CREATE INDEX IF NOT EXISTS idx_job_logs_timestamp ON job_logs(timestamp DESC);

-- =====================================================
-- 4. HARVEST SOURCES (se não existe)
-- =====================================================
CREATE TABLE IF NOT EXISTS harvest_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  base_url TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'questoes', 'teoria', 'video', 'pdf'
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harvest_sources_enabled ON harvest_sources(enabled);
CREATE INDEX IF NOT EXISTS idx_harvest_sources_type ON harvest_sources(type);
CREATE INDEX IF NOT EXISTS idx_harvest_sources_priority ON harvest_sources(priority DESC);

-- =====================================================
-- 5. HARVESTED CONTENT (se não existe)
-- =====================================================
CREATE TABLE IF NOT EXISTS harvested_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES harvest_sources(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title VARCHAR(500),
  content_type VARCHAR(50),
  raw_html TEXT,
  parsed_content JSONB,
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harvested_content_source ON harvested_content(source_id);
CREATE INDEX IF NOT EXISTS idx_harvested_content_status ON harvested_content(status);
CREATE INDEX IF NOT EXISTS idx_harvested_content_type ON harvested_content(content_type);
CREATE INDEX IF NOT EXISTS idx_harvested_content_created ON harvested_content(created_at DESC);

-- =====================================================
-- 6. SCHEDULED JOBS PREDEFINIDOS
-- =====================================================

-- Cleanup diário (03:00 AM)
INSERT INTO job_schedules (name, type, schedule, data, enabled)
VALUES (
  'Daily Cleanup',
  'cleanup',
  '0 3 * * *',
  '{}',
  true
)
ON CONFLICT (name) DO NOTHING;

-- Harvest diário (02:00 AM)
INSERT INTO job_schedules (name, type, schedule, data, enabled)
VALUES (
  'Daily Harvest',
  'harvest',
  '0 2 * * *',
  '{"limit": 20}',
  true
)
ON CONFLICT (name) DO NOTHING;

-- Update stats semanal (domingo 04:00 AM)
INSERT INTO job_schedules (name, type, schedule, data, enabled)
VALUES (
  'Weekly Stats Update',
  'update_stats',
  '0 4 * * 0',
  '{}',
  true
)
ON CONFLICT (name) DO NOTHING;

-- Generate embeddings semanal (sábado 01:00 AM)
INSERT INTO job_schedules (name, type, schedule, data, enabled)
VALUES (
  'Weekly Embedding Generation',
  'generate_embeddings',
  '0 1 * * 6',
  '{}',
  false
)
ON CONFLICT (name) DO NOTHING;
