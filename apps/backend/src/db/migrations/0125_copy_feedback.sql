-- Add feedback and scoring fields to copy versions
ALTER TABLE edro_copy_versions ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE edro_copy_versions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE edro_copy_versions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
-- status: draft, approved, rejected

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_copy_versions_status ON edro_copy_versions(status);
