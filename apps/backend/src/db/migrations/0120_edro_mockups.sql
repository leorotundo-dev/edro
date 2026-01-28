CREATE TABLE IF NOT EXISTS edro_mockups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  briefing_id UUID REFERENCES edro_briefings(id) ON DELETE SET NULL,
  client_id UUID,
  platform TEXT,
  format TEXT,
  production_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT,
  html_key TEXT,
  json_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edro_mockups_tenant_idx
  ON edro_mockups (tenant_id);

CREATE INDEX IF NOT EXISTS edro_mockups_briefing_idx
  ON edro_mockups (briefing_id);

CREATE INDEX IF NOT EXISTS edro_mockups_client_idx
  ON edro_mockups (client_id);

CREATE INDEX IF NOT EXISTS edro_mockups_created_idx
  ON edro_mockups (created_at DESC);

CREATE INDEX IF NOT EXISTS edro_mockups_platform_idx
  ON edro_mockups (platform);

CREATE INDEX IF NOT EXISTS edro_mockups_format_idx
  ON edro_mockups (format);
