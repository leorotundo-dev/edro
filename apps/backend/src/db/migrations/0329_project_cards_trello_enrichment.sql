-- Enriquecimento de dados Trello nos project_cards
-- cover_url: URL da imagem de capa do card
-- last_activity_at: timestamp da última atividade no Trello (dateLastActivity)
-- attachments: array JSON de anexos do card

ALTER TABLE project_cards
  ADD COLUMN IF NOT EXISTS cover_url        TEXT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attachments      JSONB NOT NULL DEFAULT '[]'::jsonb;
