CREATE TABLE IF NOT EXISTS social_listening_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  client_id   TEXT,
  platform    TEXT NOT NULL DEFAULT 'linkedin',
  profile_url TEXT NOT NULL,
  display_name TEXT,
  headline    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  last_collected_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, platform, profile_url)
);

CREATE INDEX IF NOT EXISTS idx_slp_tenant_client ON social_listening_profiles(tenant_id, client_id);
