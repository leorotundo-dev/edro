-- 0237_instagram_dms.sql
-- Stores Instagram Direct Messages received via Meta webhook

CREATE TABLE IF NOT EXISTS instagram_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  client_id         TEXT,                          -- linked client (nullable until resolved)
  instagram_thread_id TEXT,
  sender_id         TEXT NOT NULL,                 -- Instagram user/page PSID
  sender_name       TEXT,
  type              TEXT NOT NULL DEFAULT 'text',  -- text | image | audio | video | story_reply | reaction
  content           TEXT,
  media_url         TEXT,
  raw_payload       JSONB,
  jarvis_processed  BOOLEAN NOT NULL DEFAULT false,
  briefing_id       UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS instagram_messages_tenant_client_idx
  ON instagram_messages(tenant_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS instagram_messages_sender_idx
  ON instagram_messages(tenant_id, sender_id, created_at DESC);
