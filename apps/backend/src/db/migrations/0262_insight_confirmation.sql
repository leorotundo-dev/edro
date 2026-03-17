-- Human confirmation loop for WhatsApp message insights
-- Adds: confirmation_status, corrected_summary, confirmed_by, confirmed_at
-- Creates: client_directives (permanent human-validated rules per client)

ALTER TABLE whatsapp_message_insights
  ADD COLUMN IF NOT EXISTS confirmation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS corrected_summary   TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_by        TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at        TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_wmi_confirmation
  ON whatsapp_message_insights(client_id, confirmation_status, actioned);

-- Permanent client directives: human-confirmed rules that feed every AI generation
-- Never auto-expire, never overwritten by the learning loop rebuild.
CREATE TABLE IF NOT EXISTS client_directives (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  client_id      TEXT NOT NULL,
  source         TEXT NOT NULL,        -- 'whatsapp_insight' | 'meeting_action' | 'manual'
  source_id      TEXT,                 -- whatsapp_message_insights.id etc.
  directive_type TEXT NOT NULL,        -- 'boost' | 'avoid'
  directive      TEXT NOT NULL,        -- the actual rule, e.g. "Email marketing deve ter 600px"
  confirmed_by   TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, client_id, directive)
);

CREATE INDEX IF NOT EXISTS idx_client_directives_client
  ON client_directives(client_id, tenant_id);
