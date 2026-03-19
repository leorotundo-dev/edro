-- Kanban nativo do Edro — substitui o Trello gradualmente
-- Schema Edro-native: desconectar o Trello não quebra nada

-- Connector: um por tenant, guarda credenciais Trello
CREATE TABLE IF NOT EXISTS trello_connectors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   TEXT NOT NULL UNIQUE,
  api_key     TEXT NOT NULL,
  api_token   TEXT NOT NULL,
  member_id   TEXT,           -- Trello member ID do token owner
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Boards mapeados (Trello board → projeto Edro)
CREATE TABLE IF NOT EXISTS project_boards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     TEXT NOT NULL,
  client_id     TEXT,                     -- NULL = board interno (sem cliente)
  name          TEXT NOT NULL,
  description   TEXT,
  color         TEXT DEFAULT 'blue',
  is_archived   BOOLEAN NOT NULL DEFAULT false,
  -- Trello origin (NULL para boards criados nativamente no Edro)
  trello_board_id TEXT,
  trello_url      TEXT,
  last_synced_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, trello_board_id)
);

CREATE INDEX IF NOT EXISTS project_boards_tenant_idx ON project_boards(tenant_id);
CREATE INDEX IF NOT EXISTS project_boards_client_idx ON project_boards(tenant_id, client_id);

-- Listas (colunas do kanban)
CREATE TABLE IF NOT EXISTS project_lists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id      UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  tenant_id     TEXT NOT NULL,
  name          TEXT NOT NULL,
  position      FLOAT8 NOT NULL DEFAULT 0,
  is_archived   BOOLEAN NOT NULL DEFAULT false,
  trello_list_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (board_id, trello_list_id)
);

CREATE INDEX IF NOT EXISTS project_lists_board_idx ON project_lists(board_id);

-- Cards
CREATE TABLE IF NOT EXISTS project_cards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id         UUID NOT NULL REFERENCES project_lists(id) ON DELETE CASCADE,
  board_id        UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  position        FLOAT8 NOT NULL DEFAULT 0,
  due_date        DATE,
  due_complete    BOOLEAN DEFAULT false,
  labels          JSONB DEFAULT '[]',     -- [{color, name}]
  cover_color     TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  -- Trello origin
  trello_card_id  TEXT,
  trello_url      TEXT,
  trello_short_id TEXT,
  -- Metadados extras
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (board_id, trello_card_id)
);

CREATE INDEX IF NOT EXISTS project_cards_list_idx    ON project_cards(list_id);
CREATE INDEX IF NOT EXISTS project_cards_board_idx   ON project_cards(board_id);
CREATE INDEX IF NOT EXISTS project_cards_tenant_idx  ON project_cards(tenant_id);
CREATE INDEX IF NOT EXISTS project_cards_due_idx     ON project_cards(tenant_id, due_date) WHERE due_date IS NOT NULL;

-- Membros atribuídos ao card
CREATE TABLE IF NOT EXISTS project_card_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id         UUID NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL,
  -- Pode ser um freela do Edro ou um membro externo (Trello)
  freelancer_id   UUID,               -- FK para freelancers.id (quando matched)
  trello_member_id TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  email           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_id, trello_member_id)
);

CREATE INDEX IF NOT EXISTS project_card_members_card_idx ON project_card_members(card_id);

-- Comentários do card
CREATE TABLE IF NOT EXISTS project_card_comments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id         UUID NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL,
  body            TEXT NOT NULL,
  author_name     TEXT,
  author_avatar   TEXT,
  trello_action_id TEXT UNIQUE,
  commented_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_card_comments_card_idx ON project_card_comments(card_id);

-- Checklists dos cards
CREATE TABLE IF NOT EXISTS project_card_checklists (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id         UUID NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL,
  name            TEXT NOT NULL DEFAULT 'Checklist',
  items           JSONB NOT NULL DEFAULT '[]',  -- [{text, checked}]
  trello_checklist_id TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_card_checklists_card_idx ON project_card_checklists(card_id);

-- Log de sincronização Trello → Edro
CREATE TABLE IF NOT EXISTS trello_sync_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       TEXT NOT NULL,
  board_id        UUID REFERENCES project_boards(id) ON DELETE SET NULL,
  trello_board_id TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | running | done | error
  cards_synced    INT DEFAULT 0,
  actions_synced  INT DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trello_sync_log_tenant_idx ON trello_sync_log(tenant_id, created_at DESC);
