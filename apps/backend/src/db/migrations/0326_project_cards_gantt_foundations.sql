-- Fundações para Gantt e gestão completa de jobs
-- start_date, completed_at, priority, estimated_hours, parent_card_id
-- + tabelas: project_milestones, project_card_dependencies

-- ─── Colunas novas em project_cards ────────────────────────────────────────

ALTER TABLE project_cards
  ADD COLUMN IF NOT EXISTS start_date       DATE,
  ADD COLUMN IF NOT EXISTS completed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority         TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS estimated_hours  NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS parent_card_id   UUID REFERENCES project_cards(id) ON DELETE SET NULL;

-- Backfill start_date: quando entrou no sistema
UPDATE project_cards
  SET start_date = created_at::date
  WHERE start_date IS NULL;

-- Backfill completed_at: usar updated_at como proxy para cards já concluídos
UPDATE project_cards
  SET completed_at = updated_at
  WHERE due_complete = true AND completed_at IS NULL;

-- Índices úteis para o Gantt e filtros
CREATE INDEX IF NOT EXISTS project_cards_start_idx
  ON project_cards (tenant_id, start_date);

CREATE INDEX IF NOT EXISTS project_cards_parent_idx
  ON project_cards (parent_card_id)
  WHERE parent_card_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS project_cards_priority_idx
  ON project_cards (tenant_id, priority);

-- ─── Marcos de projeto (milestones) ────────────────────────────────────────
-- Pontos no tempo sem duração — aparecem como diamante no Gantt

CREATE TABLE IF NOT EXISTS project_milestones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id    UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL,
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  color       TEXT DEFAULT '#5D87FF',
  is_done     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_milestones_board_idx
  ON project_milestones (board_id);

CREATE INDEX IF NOT EXISTS project_milestones_tenant_date_idx
  ON project_milestones (tenant_id, date);

-- ─── Dependências entre cards ───────────────────────────────────────────────
-- card_id só pode começar depois que depends_on_id estiver concluído

CREATE TABLE IF NOT EXISTS project_card_dependencies (
  card_id       UUID NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
  tenant_id     TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, depends_on_id),
  CHECK (card_id <> depends_on_id)
);

CREATE INDEX IF NOT EXISTS project_card_deps_depends_on_idx
  ON project_card_dependencies (depends_on_id);
