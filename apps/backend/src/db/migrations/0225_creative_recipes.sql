CREATE TABLE IF NOT EXISTS creative_recipes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  client_id     UUID,                    -- null = global recipe for tenant
  name          TEXT NOT NULL,
  objective     TEXT,                    -- awareness | conversion | engagement | etc
  platform      TEXT,
  format        TEXT,
  pipeline_type TEXT NOT NULL DEFAULT 'standard',
  trigger_id    TEXT,                    -- G01-G07 | null
  provider      TEXT,                    -- fal | gemini | leonardo
  model         TEXT,
  tone_notes    TEXT,
  use_count     INTEGER NOT NULL DEFAULT 0,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_recipes_tenant ON creative_recipes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_creative_recipes_client ON creative_recipes (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_creative_recipes_platform ON creative_recipes (tenant_id, platform, format);
