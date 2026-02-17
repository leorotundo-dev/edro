-- Migration: Cross-Client Industry Benchmarks
-- Aggregates anonymized metrics across clients for industry comparison

CREATE TABLE IF NOT EXISTS industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  industry TEXT NOT NULL,
  platform TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'all',
  avg_engagement NUMERIC(12,2) DEFAULT 0,
  avg_score NUMERIC(5,2) DEFAULT 0,
  avg_approval_rate NUMERIC(5,2) DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, industry, platform, format, period)
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_industry
  ON industry_benchmarks (industry, platform);

-- Add industry field to clients if not exists
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry TEXT;
