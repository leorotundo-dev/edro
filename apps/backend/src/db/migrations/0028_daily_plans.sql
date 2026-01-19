-- 0028_daily_plans.sql
-- Plano diario gerado pelo ReccoEngine (cache e historico)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  trail_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_plans_user_date_idx
  ON daily_plans(user_id, plan_date);

CREATE INDEX IF NOT EXISTS daily_plans_user_idx
  ON daily_plans(user_id);
