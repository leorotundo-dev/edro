-- Phase 2: Source filters, title dedup, enrichment improvements

-- Add source-level filtering columns
ALTER TABLE clipping_sources
  ADD COLUMN IF NOT EXISTS include_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exclude_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_content_length INT DEFAULT 0;

-- Add title_hash for deduplication
ALTER TABLE clipping_items
  ADD COLUMN IF NOT EXISTS title_hash TEXT;

-- Index for title dedup lookups
CREATE INDEX IF NOT EXISTS idx_clipping_items_title_hash
  ON clipping_items(tenant_id, title_hash) WHERE title_hash IS NOT NULL;
