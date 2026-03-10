-- WhatsApp group message insights extracted by AI
CREATE TABLE IF NOT EXISTS whatsapp_message_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  client_id       TEXT NOT NULL,
  message_id      UUID NOT NULL REFERENCES whatsapp_group_messages(id),
  insight_type    TEXT NOT NULL,  -- feedback | approval | request | preference | deadline | complaint | praise
  summary         TEXT NOT NULL,
  sentiment       TEXT,           -- positive | negative | neutral
  urgency         TEXT DEFAULT 'normal', -- urgent | normal | low
  entities        JSONB,          -- { people, dates, topics, deliverables }
  confidence      REAL DEFAULT 0.8,
  actioned        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_insights_client
  ON whatsapp_message_insights(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_insights_type
  ON whatsapp_message_insights(insight_type, actioned);

-- Track processing state per message
ALTER TABLE whatsapp_group_messages ADD COLUMN IF NOT EXISTS insight_extracted BOOLEAN DEFAULT false;
