ALTER TABLE people ADD COLUMN IF NOT EXISTS google_resource_name TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS google_contacts_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_people_google_resource
  ON people (tenant_id, google_resource_name)
  WHERE google_resource_name IS NOT NULL;
