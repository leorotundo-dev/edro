-- 0239_gmail_threads.sql
-- Gmail inbox monitoring: stores emails received from clients

CREATE TABLE IF NOT EXISTS gmail_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL UNIQUE,
  email_address   TEXT NOT NULL,
  access_token    TEXT,                    -- encrypted in practice, stored here for simplicity
  refresh_token   TEXT,
  token_expiry    TIMESTAMPTZ,
  watch_expiry    TIMESTAMPTZ,             -- Gmail watch() expiry (max 7 days, must renew)
  history_id      TEXT,                   -- last processed historyId for incremental sync
  connected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at    TIMESTAMPTZ,
  last_error      TEXT
);

CREATE TABLE IF NOT EXISTS gmail_threads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  client_id         TEXT,                          -- resolved from from_email → clients table
  gmail_thread_id   TEXT NOT NULL,
  gmail_message_id  TEXT NOT NULL UNIQUE,
  from_email        TEXT,
  from_name         TEXT,
  subject           TEXT,
  snippet           TEXT,
  body_text         TEXT,
  jarvis_processed  BOOLEAN NOT NULL DEFAULT false,
  briefing_id       UUID,
  received_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gmail_threads_tenant_client_idx
  ON gmail_threads(tenant_id, client_id, received_at DESC);

CREATE INDEX IF NOT EXISTS gmail_threads_from_email_idx
  ON gmail_threads(from_email);
