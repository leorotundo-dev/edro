CREATE TABLE IF NOT EXISTS web_push_config (
  config_key TEXT PRIMARY KEY,
  vapid_public_key TEXT NOT NULL,
  vapid_private_key TEXT NOT NULL,
  vapid_subject TEXT NOT NULL DEFAULT 'mailto:noreply@edro.digital',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  expiration_time BIGINT,
  user_agent TEXT,
  last_sent_at TIMESTAMPTZ,
  last_error TEXT,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_active
  ON web_push_subscriptions (user_id, deactivated_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_tenant_active
  ON web_push_subscriptions (tenant_id, deactivated_at, updated_at DESC);
