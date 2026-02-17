-- Migration: A/B Testing for Copy Versions
-- Allows testing two copy variants and tracking which performs better

CREATE TABLE IF NOT EXISTS copy_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID NOT NULL REFERENCES edro_briefings(id) ON DELETE CASCADE,
  variant_a_id UUID NOT NULL REFERENCES edro_copy_versions(id) ON DELETE CASCADE,
  variant_b_id UUID NOT NULL REFERENCES edro_copy_versions(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES edro_copy_versions(id) ON DELETE SET NULL,
  metric TEXT NOT NULL DEFAULT 'engagement', -- engagement, clicks, conversions, score
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, cancelled
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_briefing
  ON copy_ab_tests (briefing_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status
  ON copy_ab_tests (status);

CREATE TABLE IF NOT EXISTS copy_ab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES copy_ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES edro_copy_versions(id) ON DELETE CASCADE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement NUMERIC(10,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  score NUMERIC(5,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_results_test
  ON copy_ab_results (test_id);
