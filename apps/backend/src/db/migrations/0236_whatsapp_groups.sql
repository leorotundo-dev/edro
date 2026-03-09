-- Evolution API instances and WhatsApp group associations
CREATE TABLE IF NOT EXISTS evolution_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL UNIQUE,
  instance_name   TEXT NOT NULL UNIQUE,    -- used as identifier in Evolution API
  status          TEXT NOT NULL DEFAULT 'disconnected', -- disconnected | connecting | connected
  phone_number    TEXT,                    -- populated after connection
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  connected_at    TIMESTAMPTZ,
  last_seen_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  instance_id     UUID NOT NULL REFERENCES evolution_instances(id) ON DELETE CASCADE,
  group_jid       TEXT NOT NULL,           -- Evolution group JID (e.g. 5511999@g.us)
  group_name      TEXT NOT NULL,
  client_id       TEXT REFERENCES clients(id) ON DELETE SET NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  auto_briefing   BOOLEAN NOT NULL DEFAULT false,  -- auto-create briefing from messages
  notify_jarvis   BOOLEAN NOT NULL DEFAULT true,   -- feed messages to Jarvis intelligence
  participant_count INT,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, group_jid)
);

CREATE TABLE IF NOT EXISTS whatsapp_group_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  group_id        UUID NOT NULL REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
  client_id       TEXT,
  wa_message_id   TEXT NOT NULL UNIQUE,
  sender_jid      TEXT NOT NULL,
  sender_name     TEXT,
  type            TEXT NOT NULL DEFAULT 'text',   -- text | audio | image | document
  content         TEXT,                           -- text content or transcription
  media_url       TEXT,
  briefing_id     UUID,
  processed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_tenant ON whatsapp_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_messages_group ON whatsapp_group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_messages_client ON whatsapp_group_messages(client_id, created_at DESC);
