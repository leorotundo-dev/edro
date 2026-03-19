-- Histórico de transições de lista (raw Trello actions)
-- Alimenta o analyzer para computar cycle time, revisões, gargalos
CREATE TABLE IF NOT EXISTS project_card_actions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id       UUID NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
  board_id      UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  tenant_id     TEXT NOT NULL,
  action_type   TEXT NOT NULL,          -- updateCard.listAfter | createCard | commentCard
  trello_action_id TEXT UNIQUE,
  from_list_name TEXT,
  to_list_name   TEXT,
  actor_name     TEXT,
  occurred_at    TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_card_actions_card_idx  ON project_card_actions(card_id);
CREATE INDEX IF NOT EXISTS project_card_actions_board_idx ON project_card_actions(board_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS project_card_actions_tenant_idx ON project_card_actions(tenant_id, occurred_at DESC);

-- Analytics computados por card (atualizado após sync)
CREATE TABLE IF NOT EXISTS project_card_analytics (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id                 UUID NOT NULL UNIQUE REFERENCES project_cards(id) ON DELETE CASCADE,
  board_id                UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  tenant_id               TEXT NOT NULL,
  -- Ciclo total
  cycle_time_hours        NUMERIC(10,2),   -- createCard → FINALIZADO/DONE
  -- Tempo por estágio (horas)
  hours_briefing          NUMERIC(10,2),   -- em NOVO BRIEFING / intake
  hours_in_progress       NUMERIC(10,2),   -- em ANDAMENTO / produção
  hours_revision          NUMERIC(10,2),   -- em ALTERAÇÃO / revisão
  hours_approval          NUMERIC(10,2),   -- em APROVAÇÃO / aguardando cliente
  -- Contadores
  revision_count          INT DEFAULT 0,   -- vezes que voltou para ALTERAÇÃO
  approval_cycles         INT DEFAULT 0,   -- vezes que entrou em APROVAÇÃO
  comment_count           INT DEFAULT 0,
  checklist_items_total   INT DEFAULT 0,
  checklist_items_done    INT DEFAULT 0,
  -- Prazo
  was_overdue             BOOLEAN,         -- entregue depois do due_date
  days_overdue            NUMERIC(6,2),    -- positivo = atrasado, negativo = adiantado
  -- Stage classification
  terminal_stage          TEXT,            -- FINALIZADO | CANCELADO | PARADO | (em aberto)
  -- Parsed from title (DDMMYY_Client_Job_Desc pattern)
  parsed_date             DATE,
  parsed_job_type         TEXT,            -- Job | Campanha | Briefing | etc
  parsed_description      TEXT,
  -- Timestamps
  started_at              TIMESTAMPTZ,     -- primeiro movimento para ANDAMENTO
  finished_at             TIMESTAMPTZ,     -- movimento para FINALIZADO/DONE
  analyzed_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_card_analytics_board_idx  ON project_card_analytics(board_id);
CREATE INDEX IF NOT EXISTS project_card_analytics_tenant_idx ON project_card_analytics(tenant_id);

-- Snapshot de métricas por board (atualizado após cada análise)
CREATE TABLE IF NOT EXISTS project_board_analytics (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id                    UUID NOT NULL UNIQUE REFERENCES project_boards(id) ON DELETE CASCADE,
  tenant_id                   TEXT NOT NULL,
  -- Throughput
  total_cards                 INT DEFAULT 0,
  cards_done                  INT DEFAULT 0,
  cards_cancelled             INT DEFAULT 0,
  cards_in_progress           INT DEFAULT 0,
  -- Cycle times (median, horas)
  median_cycle_time_hours     NUMERIC(10,2),
  median_hours_in_progress    NUMERIC(10,2),
  median_hours_revision       NUMERIC(10,2),
  median_hours_approval       NUMERIC(10,2),     -- tempo médio que o CLIENTE demora para aprovar
  -- Revision & approval
  avg_revision_count          NUMERIC(5,2),
  avg_approval_cycles         NUMERIC(5,2),
  pct_approved_first_try      NUMERIC(5,2),      -- % cards finalizados sem nenhuma ALTERAÇÃO
  -- SLA
  pct_on_time                 NUMERIC(5,2),      -- % cards entregues no prazo
  avg_days_overdue            NUMERIC(6,2),      -- média de atraso (apenas os atrasados)
  -- Bottleneck (lista com maior tempo médio)
  bottleneck_list             TEXT,
  bottleneck_avg_hours        NUMERIC(10,2),
  -- Throughput histórico
  cards_per_week_avg          NUMERIC(6,2),      -- média de cards concluídos/semana
  cards_per_week_last_4w      NUMERIC(6,2),      -- últimas 4 semanas
  -- Timestamps
  first_card_at               TIMESTAMPTZ,
  last_card_at                TIMESTAMPTZ,
  analyzed_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_board_analytics_tenant_idx ON project_board_analytics(tenant_id);

-- Insights de comentários minerados por Claude
CREATE TABLE IF NOT EXISTS project_comment_insights (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id         UUID NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
  board_id        UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL,
  comment_body    TEXT NOT NULL,
  insight_type    TEXT,   -- approval | revision_request | client_feedback | internal | unknown
  sentiment       TEXT,   -- positive | negative | neutral
  topics          TEXT[],
  extracted_pref  TEXT,   -- "cliente prefere tons escuros"
  analyzed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_comment_insights_board_idx ON project_comment_insights(board_id);
CREATE INDEX IF NOT EXISTS project_comment_insights_tenant_idx ON project_comment_insights(tenant_id);
