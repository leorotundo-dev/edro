CREATE TABLE IF NOT EXISTS edro_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS edro_users_email_idx
  ON edro_users (LOWER(email));

CREATE TABLE IF NOT EXISTS edro_login_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edro_login_codes_email_idx
  ON edro_login_codes (email);
CREATE INDEX IF NOT EXISTS edro_login_codes_expires_idx
  ON edro_login_codes (expires_at);

CREATE TABLE IF NOT EXISTS edro_briefing_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  briefing_id UUID NOT NULL REFERENCES edro_briefings(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  position INTEGER NOT NULL,
  updated_by TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS edro_briefing_stages_unique
  ON edro_briefing_stages (briefing_id, stage);
CREATE INDEX IF NOT EXISTS edro_briefing_stages_briefing_idx
  ON edro_briefing_stages (briefing_id, position);
CREATE INDEX IF NOT EXISTS edro_briefing_stages_status_idx
  ON edro_briefing_stages (briefing_id, status);

ALTER TABLE edro_briefings
  ALTER COLUMN status SET DEFAULT 'briefing';

UPDATE edro_briefings
  SET status = 'briefing'
  WHERE status IS NULL OR status IN ('draft', 'new');
