-- Studio creatives library — stores generated pipeline creatives for gallery/history

CREATE TABLE IF NOT EXISTS studio_creatives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  client_id     UUID,
  briefing_id   UUID,
  platform      TEXT,
  format        TEXT,
  trigger_id    TEXT,
  copy_title    TEXT,
  copy_body     TEXT,
  copy_cta      TEXT,
  copy_legenda  TEXT,
  image_url     TEXT,
  recipe_name   TEXT,
  pipeline_type TEXT DEFAULT 'standard',
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | approved | published
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studio_creatives_tenant ON studio_creatives (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_creatives_client ON studio_creatives (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_creatives_status ON studio_creatives (tenant_id, status);
