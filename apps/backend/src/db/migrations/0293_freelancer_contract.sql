-- Migration 0293: D4Sign contract fields on freelancer_profiles

ALTER TABLE freelancer_profiles
  ADD COLUMN IF NOT EXISTS contract_d4sign_uuid    TEXT,
  ADD COLUMN IF NOT EXISTS contract_status         TEXT DEFAULT 'none'
    CHECK (contract_status IN ('none','pending_signature','signed','cancelled')),
  ADD COLUMN IF NOT EXISTS contract_signed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_pdf_url        TEXT,
  ADD COLUMN IF NOT EXISTS contract_sent_at        TIMESTAMPTZ;

-- Audit log for contract events
CREATE TABLE IF NOT EXISTS freelancer_contract_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  tenant_id    TEXT NOT NULL,
  event_type   TEXT NOT NULL,  -- sent | signed | cancelled | resent
  d4sign_uuid  TEXT,
  payload      JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_events_user ON freelancer_contract_events(user_id);
