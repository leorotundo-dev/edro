-- 0032_auto_formacoes.sql
-- Auto-formacoes versionadas por edital e usuario

CREATE TABLE IF NOT EXISTS edital_auto_formacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edital_id UUID NOT NULL REFERENCES editais(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  source_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (edital_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_auto_formacoes_edital_id ON edital_auto_formacoes(edital_id);
CREATE INDEX IF NOT EXISTS idx_auto_formacoes_user_id ON edital_auto_formacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_formacoes_updated_at ON edital_auto_formacoes(updated_at DESC);

CREATE TABLE IF NOT EXISTS edital_auto_formacoes_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auto_formacao_id UUID NOT NULL REFERENCES edital_auto_formacoes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  source_hash TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (auto_formacao_id, version)
);

CREATE INDEX IF NOT EXISTS idx_auto_formacoes_versions_auto_id ON edital_auto_formacoes_versions(auto_formacao_id);

CREATE OR REPLACE FUNCTION update_edital_auto_formacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_edital_auto_formacoes ON edital_auto_formacoes;
CREATE TRIGGER trigger_update_edital_auto_formacoes
  BEFORE UPDATE ON edital_auto_formacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_edital_auto_formacoes_updated_at();
