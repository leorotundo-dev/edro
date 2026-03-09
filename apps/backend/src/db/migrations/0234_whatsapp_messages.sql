-- 0234_whatsapp_messages.sql
-- Conversation history for WhatsApp inbound briefings.
-- Each row is one WhatsApp message (audio or text) from a client.

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT        NOT NULL,
  client_id         TEXT        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone_number_id   TEXT        NOT NULL, -- WhatsApp Business phone number ID
  wa_message_id     TEXT        NOT NULL UNIQUE, -- Meta message ID
  sender_phone      TEXT        NOT NULL, -- E.164 sender phone
  direction         TEXT        NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  type              TEXT        NOT NULL CHECK (type IN ('text', 'audio', 'document', 'system')),
  raw_text          TEXT,               -- original or transcribed text
  briefing_id       UUID        REFERENCES edro_briefings(id) ON DELETE SET NULL, -- briefing generated from this message
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wam_tenant_client
  ON whatsapp_messages (tenant_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wam_sender
  ON whatsapp_messages (sender_phone, created_at DESC);

COMMENT ON TABLE whatsapp_messages IS
  'WhatsApp Cloud API inbound messages. Each row represents one message from a client.
   Audio messages include the Whisper transcription in raw_text.
   briefing_id links to the auto-generated briefing (if extraction succeeded).';
