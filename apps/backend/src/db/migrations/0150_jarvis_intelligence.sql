-- Migration: Jarvis Intelligence System
-- Adds support for anti-repetition engine and opportunity tracking

-- Add columns to edro_copy_versions for anti-repetition
ALTER TABLE edro_copy_versions
  ADD COLUMN IF NOT EXISTS output_hash TEXT,
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Index for copy deduplication via hash
CREATE INDEX IF NOT EXISTS idx_copy_versions_hash
  ON edro_copy_versions(output_hash) WHERE output_hash IS NOT NULL;

-- Vector index for semantic similarity search (pgvector)
CREATE INDEX IF NOT EXISTS idx_copy_versions_embedding
  ON edro_copy_versions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add columns to ai_opportunities for better tracking
ALTER TABLE ai_opportunities
  ADD COLUMN IF NOT EXISTS opportunity_hash TEXT,
  ADD COLUMN IF NOT EXISTS score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS trending_up BOOLEAN DEFAULT FALSE;

-- Index for opportunity deduplication
CREATE INDEX IF NOT EXISTS idx_ai_opportunities_hash
  ON ai_opportunities(opportunity_hash) WHERE opportunity_hash IS NOT NULL;

-- Link opportunities to briefings (track which briefings came from opportunities)
ALTER TABLE edro_briefings
  ADD COLUMN IF NOT EXISTS source_opportunity_id UUID REFERENCES ai_opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_briefings_opportunity
  ON edro_briefings(source_opportunity_id) WHERE source_opportunity_id IS NOT NULL;

-- Add payload column to edro_copy_versions if missing (for storing validation metadata)
ALTER TABLE edro_copy_versions
  ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN edro_copy_versions.output_hash IS 'SHA256 hash of output for fast deduplication';
COMMENT ON COLUMN edro_copy_versions.embedding IS 'OpenAI text-embedding-3-small (1536 dims) for semantic similarity';
COMMENT ON COLUMN ai_opportunities.opportunity_hash IS 'MD5 hash of title+description for deduplication';
COMMENT ON COLUMN ai_opportunities.score IS 'Temporal score (0-100) with momentum boost';
COMMENT ON COLUMN ai_opportunities.trending_up IS 'True if from social listening with positive momentum';
COMMENT ON COLUMN edro_briefings.source_opportunity_id IS 'Link to opportunity that generated this briefing';
