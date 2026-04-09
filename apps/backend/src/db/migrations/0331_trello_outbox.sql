-- Trello outbound outbox: fila confiável Edro → Trello com retry

CREATE TABLE IF NOT EXISTS trello_outbox (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     TEXT NOT NULL,
  operation     TEXT NOT NULL,  -- card.update | member.sync | comment.add | checklist.toggle
  payload       JSONB NOT NULL DEFAULT '{}',
  dedupe_key    TEXT,           -- quando definido, upsert em vez de insert
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | processing | done | error | dead
  attempts      INT  NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS trello_outbox_pending_idx
  ON trello_outbox (next_retry_at)
  WHERE status IN ('pending', 'error');
