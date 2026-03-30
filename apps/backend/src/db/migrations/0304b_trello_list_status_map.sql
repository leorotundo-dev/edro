-- Mapeamento explícito de lista Trello → status operacional
-- Quando presente, sobrepõe o regex de listNameToOpsStatus no ops-feed

CREATE TABLE IF NOT EXISTS trello_list_status_map (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  board_id    UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  list_id     UUID NOT NULL REFERENCES project_lists(id) ON DELETE CASCADE,
  ops_status  TEXT NOT NULL CHECK (ops_status IN (
    'intake', 'planned', 'allocated', 'in_progress', 'in_review',
    'awaiting_approval', 'approved', 'ready', 'done', 'published', 'blocked'
  )),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, list_id)
);

CREATE INDEX IF NOT EXISTS idx_trello_list_status_map_tenant_board
  ON trello_list_status_map(tenant_id, board_id);
