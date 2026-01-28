CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
  ON refresh_tokens (user_id, expires_at);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NULL REFERENCES edro_users(id) ON DELETE SET NULL,
  actor_email TEXT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before JSONB NULL,
  after JSONB NULL,
  ip TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON audit_log (actor_email);

-- ============================================================
-- POST VERSIONS (COPY VERSIONING)
-- ============================================================
CREATE TABLE IF NOT EXISTS post_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_asset_id UUID NOT NULL REFERENCES post_assets(id) ON DELETE CASCADE,
  version INT NOT NULL,
  payload JSONB NOT NULL,
  diff JSONB NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_asset_id, version)
);

CREATE INDEX IF NOT EXISTS idx_post_versions_post
  ON post_versions (post_asset_id, version DESC);

-- ============================================================
-- PUBLISH QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS publish_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_asset_id UUID NOT NULL REFERENCES post_assets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_queue_status_time
  ON publish_queue (status, scheduled_for);
