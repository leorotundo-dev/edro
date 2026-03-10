-- Outbound message log: every message the bot sends to a WhatsApp group
CREATE TABLE IF NOT EXISTS whatsapp_outbound_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  group_id      UUID NOT NULL REFERENCES whatsapp_groups(id),
  client_id     TEXT,
  scenario      TEXT NOT NULL,  -- briefing_confirm | digest_daily | digest_weekly | deadline_alert | jarvis_reply
  trigger_key   TEXT NOT NULL,
  message_text  TEXT NOT NULL,
  ai_tokens_in  INT DEFAULT 0,
  ai_tokens_out INT DEFAULT 0,
  sent_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trigger_key)
);

CREATE INDEX IF NOT EXISTS idx_wa_outbound_tenant ON whatsapp_outbound_messages(tenant_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_outbound_group  ON whatsapp_outbound_messages(group_id, sent_at DESC);

-- Per-group notification opt-in flags
ALTER TABLE whatsapp_groups ADD COLUMN IF NOT EXISTS notify_briefing_confirm BOOLEAN DEFAULT true;
ALTER TABLE whatsapp_groups ADD COLUMN IF NOT EXISTS notify_digest           BOOLEAN DEFAULT true;
ALTER TABLE whatsapp_groups ADD COLUMN IF NOT EXISTS notify_deadlines        BOOLEAN DEFAULT true;
ALTER TABLE whatsapp_groups ADD COLUMN IF NOT EXISTS notify_jarvis_reply     BOOLEAN DEFAULT true;
ALTER TABLE whatsapp_groups ADD COLUMN IF NOT EXISTS quiet_hours_start       INT;  -- e.g. 21 (21:00 BRT)
ALTER TABLE whatsapp_groups ADD COLUMN IF NOT EXISTS quiet_hours_end         INT;  -- e.g. 8  (08:00 BRT)

-- Rate limit tracking per group (rolling window)
ALTER TABLE whatsapp_groups ADD COLUMN IF NOT EXISTS outbound_count_today INT DEFAULT 0;
ALTER TABLE whatsapp_groups ADD COLUMN IF NOT EXISTS outbound_count_date  DATE;
