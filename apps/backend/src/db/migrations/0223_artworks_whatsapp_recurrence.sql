-- Aprovação de Arte: criativos vinculados a briefings
CREATE TABLE IF NOT EXISTS briefing_artworks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id  UUID NOT NULL REFERENCES edro_briefings(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL,
  uploader_id  UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  file_key     TEXT NOT NULL,
  file_url     TEXT,
  mime_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
  version      INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'pending',   -- 'pending'|'approved'|'revision'
  revision_comment TEXT,
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS briefing_artworks_briefing_id_idx ON briefing_artworks (briefing_id);

-- WhatsApp: número do cliente para notificações
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

-- Jobs recorrentes: config JSONB na própria edro_briefings
ALTER TABLE edro_briefings
  ADD COLUMN IF NOT EXISTS recurrence JSONB;
-- Formato: { freq: 'monthly'|'weekly'|'biweekly', day_of_month: number|null, day_of_week: number|null, enabled: boolean, next_run_at: string }
