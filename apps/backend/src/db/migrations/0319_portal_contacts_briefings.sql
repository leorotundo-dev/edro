-- Migration 0319: portal_contacts + portal_briefing_requests
-- Supports multi-user per client (up to 5 contacts) and AI-guided briefing submissions

CREATE TABLE IF NOT EXISTS portal_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES edro_clients(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL,
  email         TEXT NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('viewer', 'requester', 'approver', 'admin')),
  invite_token  TEXT UNIQUE,
  invited_at    TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, email)
);

CREATE INDEX IF NOT EXISTS portal_contacts_client_idx ON portal_contacts(client_id);
CREATE INDEX IF NOT EXISTS portal_contacts_tenant_idx ON portal_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS portal_contacts_invite_token_idx ON portal_contacts(invite_token) WHERE invite_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS portal_briefing_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES edro_clients(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL,
  contact_id     UUID REFERENCES portal_contacts(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'enriching', 'submitted', 'accepted', 'declined', 'converted')),
  form_data      JSONB NOT NULL DEFAULT '{}',
  ai_enriched    JSONB,
  agency_notes   TEXT,
  converted_to   UUID,  -- briefing/job id when accepted
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_briefing_requests_client_idx ON portal_briefing_requests(client_id);
CREATE INDEX IF NOT EXISTS portal_briefing_requests_tenant_idx ON portal_briefing_requests(tenant_id);
CREATE INDEX IF NOT EXISTS portal_briefing_requests_status_idx ON portal_briefing_requests(status);
CREATE INDEX IF NOT EXISTS portal_briefing_requests_contact_idx ON portal_briefing_requests(contact_id);
