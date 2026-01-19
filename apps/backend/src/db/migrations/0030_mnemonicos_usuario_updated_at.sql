-- 0030_mnemonicos_usuario_updated_at.sql
-- Add updated_at to mnemonicos_usuario for conflict updates

ALTER TABLE mnemonicos_usuario
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
