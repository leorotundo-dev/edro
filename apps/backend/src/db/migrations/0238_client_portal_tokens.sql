-- 0238_client_portal_tokens.sql
-- Magic-link tokens for public client portal access (no login required)

CREATE TABLE IF NOT EXISTS client_portal_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  client_id   TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  label       TEXT,                        -- e.g. "Link mensal março 2026"
  expires_at  TIMESTAMPTZ,                 -- NULL = never expires
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_portal_tokens_tenant_client_idx
  ON client_portal_tokens(tenant_id, client_id);

CREATE INDEX IF NOT EXISTS client_portal_tokens_token_idx
  ON client_portal_tokens(token);
