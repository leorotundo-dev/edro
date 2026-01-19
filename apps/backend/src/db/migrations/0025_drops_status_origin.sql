-- 0025_drops_status_origin.sql
-- Adds review status + origin tracking for drops

ALTER TABLE drops
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS origin VARCHAR(50) NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS origin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_drops_status ON drops(status);
CREATE INDEX IF NOT EXISTS idx_drops_origin ON drops(origin);
