-- WhatsApp group conversation digests (daily / weekly AI summaries)
CREATE TABLE IF NOT EXISTS whatsapp_group_digests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  client_id      TEXT NOT NULL,
  period         TEXT NOT NULL,           -- daily | weekly
  period_start   TIMESTAMPTZ NOT NULL,
  period_end     TIMESTAMPTZ NOT NULL,
  summary        TEXT NOT NULL,           -- AI-generated digest in Portuguese
  key_decisions  JSONB,                   -- [{decision, context, date}]
  pending_actions JSONB,                  -- [{action, owner, deadline}]
  message_count  INT DEFAULT 0,
  insight_count  INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_digests_unique
  ON whatsapp_group_digests(client_id, period, period_start);
