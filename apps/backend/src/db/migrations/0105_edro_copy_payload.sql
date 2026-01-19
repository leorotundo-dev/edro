ALTER TABLE edro_copy_versions
  ADD COLUMN IF NOT EXISTS payload JSONB;
