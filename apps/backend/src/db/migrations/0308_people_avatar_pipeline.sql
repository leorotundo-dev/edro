ALTER TABLE people
  ADD COLUMN IF NOT EXISTS avatar_source_key TEXT,
  ADD COLUMN IF NOT EXISTS avatar_generated_key TEXT,
  ADD COLUMN IF NOT EXISTS avatar_generation_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS avatar_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avatar_provider TEXT,
  ADD COLUMN IF NOT EXISTS avatar_prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS avatar_error TEXT;

CREATE INDEX IF NOT EXISTS idx_people_avatar_generation_status
  ON people (tenant_id, avatar_generation_status);
