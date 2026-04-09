-- Trello real-time inbound: webhook registry + raw event log

-- Registry: one row per tenant×board, tracks the Trello-side webhook
CREATE TABLE IF NOT EXISTS trello_webhooks (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           TEXT NOT NULL,
  board_id            UUID NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  trello_board_id     TEXT NOT NULL,
  trello_webhook_id   TEXT,            -- returned by Trello API on creation
  callback_url        TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  last_seen_at        TIMESTAMPTZ,     -- last successful inbound event
  last_error          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, trello_board_id)
);

CREATE INDEX IF NOT EXISTS trello_webhooks_tenant_idx ON trello_webhooks(tenant_id);

-- Raw inbound log: one row per Trello action received
CREATE TABLE IF NOT EXISTS trello_webhook_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        TEXT NOT NULL,
  trello_board_id  TEXT,
  trello_action_id TEXT,              -- Trello action.id — dedupe key
  action_type      TEXT,
  payload          JSONB NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'pending', -- pending | processed | error | skipped
  processed_at     TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, trello_action_id)
);

CREATE INDEX IF NOT EXISTS trello_webhook_events_tenant_idx  ON trello_webhook_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trello_webhook_events_status_idx  ON trello_webhook_events(status) WHERE status = 'pending';
