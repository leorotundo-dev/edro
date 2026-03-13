-- Operations Jarvis chat conversations (tenant-scoped, no client)
CREATE TABLE IF NOT EXISTS operations_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  user_id     TEXT,
  title       TEXT,
  messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_conv_tenant ON operations_conversations (tenant_id, updated_at DESC);
