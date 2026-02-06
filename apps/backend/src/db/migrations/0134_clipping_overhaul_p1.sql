-- Phase 1: Clipping overhaul - negative keywords, relevance factors, auto-score support

-- Add negative_hits and relevance_factors to clipping_matches
ALTER TABLE clipping_matches
  ADD COLUMN IF NOT EXISTS negative_hits TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS relevance_factors JSONB DEFAULT '{}';

-- Index for unscored items (used by auto-score backfill)
CREATE INDEX IF NOT EXISTS idx_clipping_items_unscored
  ON clipping_items(tenant_id, id) WHERE relevance_score IS NULL AND status='NEW';
