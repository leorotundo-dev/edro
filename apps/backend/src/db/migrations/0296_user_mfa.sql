CREATE TABLE IF NOT EXISTS edro_user_mfa (
  user_id UUID PRIMARY KEY REFERENCES edro_users(id) ON DELETE CASCADE,
  secret_enc TEXT,
  pending_secret_enc TEXT,
  recovery_codes_hash JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edro_user_mfa_enabled
  ON edro_user_mfa (enabled_at);

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN NOT NULL DEFAULT false;
