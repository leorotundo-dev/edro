-- 0233_pipeline_collaboration.sql
-- Collaborative pipeline: client comments + approvals + share tokens

-- Share token: generates a magic link so clients access the App Mode without login
CREATE TABLE IF NOT EXISTS pipeline_share_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id  UUID        NOT NULL,
  tenant_id    TEXT        NOT NULL,
  token        UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  client_email TEXT,
  client_name  TEXT,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pst_token ON pipeline_share_tokens (token);
CREATE INDEX IF NOT EXISTS idx_pst_briefing ON pipeline_share_tokens (briefing_id);

-- Comments: client or agency members can comment per pipeline section
CREATE TABLE IF NOT EXISTS pipeline_comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id  UUID        NOT NULL,
  tenant_id    TEXT        NOT NULL,
  section      TEXT        NOT NULL CHECK (section IN ('copy', 'arte', 'approval', 'general')),
  author_type  TEXT        NOT NULL CHECK (author_type IN ('agency', 'client')),
  author_name  TEXT        NOT NULL DEFAULT 'Agência',
  author_email TEXT,
  body         TEXT        NOT NULL,
  resolved     BOOLEAN     NOT NULL DEFAULT false,
  resolved_at  TIMESTAMPTZ,
  resolved_by  TEXT,
  share_token  UUID        REFERENCES pipeline_share_tokens(token),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pc_briefing ON pipeline_comments (briefing_id, created_at ASC);

-- Client approvals: persisted approval decision per App Mode session
CREATE TABLE IF NOT EXISTS pipeline_client_approvals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id  UUID        NOT NULL,
  tenant_id    TEXT        NOT NULL,
  share_token  UUID        REFERENCES pipeline_share_tokens(token),
  client_name  TEXT,
  client_email TEXT,
  decision     TEXT        NOT NULL CHECK (decision IN ('approved', 'rejected')),
  feedback     TEXT,
  section      TEXT        NOT NULL DEFAULT 'final' CHECK (section IN ('copy', 'arte', 'final')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (briefing_id, share_token, section)
);

CREATE INDEX IF NOT EXISTS idx_pca_briefing ON pipeline_client_approvals (briefing_id, created_at DESC);
