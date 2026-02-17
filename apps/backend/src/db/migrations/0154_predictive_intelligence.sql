-- Migration: Predictive Intelligence
-- Stores posting time analytics and content mix recommendations

CREATE TABLE IF NOT EXISTS posting_time_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  hour INTEGER NOT NULL, -- 0-23
  avg_engagement NUMERIC(12,2) DEFAULT 0,
  avg_reach NUMERIC(12,2) DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, platform, day_of_week, hour)
);

CREATE INDEX IF NOT EXISTS idx_posting_time_tenant_client
  ON posting_time_analytics (tenant_id, client_id);

CREATE TABLE IF NOT EXISTS content_mix_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly', -- weekly, monthly
  recommended_mix JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, period)
);

CREATE INDEX IF NOT EXISTS idx_content_mix_tenant_client
  ON content_mix_recommendations (tenant_id, client_id);
