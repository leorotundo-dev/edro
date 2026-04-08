-- Centralizar pipeline de avatar em freelancer_profiles.
-- freelancer_profiles passa a ser a fonte única de verdade para colaboradores.
-- A tabela people continua existindo para contatos externos (clientes, participantes de reunião),
-- mas deixa de ser consultada para dados de colaboradores internos.

ALTER TABLE freelancer_profiles
  ADD COLUMN IF NOT EXISTS avatar_source_key       TEXT,
  ADD COLUMN IF NOT EXISTS avatar_generated_key    TEXT,
  ADD COLUMN IF NOT EXISTS avatar_generation_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS avatar_generated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avatar_provider         TEXT,
  ADD COLUMN IF NOT EXISTS avatar_prompt_version   TEXT,
  ADD COLUMN IF NOT EXISTS avatar_error            TEXT;

-- Backfill a partir de people via person_id
UPDATE freelancer_profiles fp
SET
  avatar_source_key         = p.avatar_source_key,
  avatar_generated_key      = p.avatar_generated_key,
  avatar_generation_status  = COALESCE(p.avatar_generation_status, 'none'),
  avatar_generated_at       = p.avatar_generated_at,
  avatar_provider           = p.avatar_provider,
  avatar_prompt_version     = p.avatar_prompt_version,
  avatar_error              = p.avatar_error
FROM people p
WHERE p.id = fp.person_id
  AND p.avatar_generated_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fp_avatar_generation_status
  ON freelancer_profiles (avatar_generation_status);
