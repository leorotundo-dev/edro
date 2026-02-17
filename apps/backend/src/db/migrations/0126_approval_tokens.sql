-- Public approval tokens for client review without login
CREATE TABLE IF NOT EXISTS edro_approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  client_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_tokens_token ON edro_approval_tokens(token);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_briefing ON edro_approval_tokens(briefing_id);
