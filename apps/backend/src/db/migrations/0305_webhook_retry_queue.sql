-- 0305_webhook_retry_queue.sql
-- Retry queue for critical inbound webhooks (WhatsApp, Instagram, Recall)
-- Events that fail processing are stored here and retried with exponential backoff.

CREATE TABLE IF NOT EXISTS webhook_retry_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL,           -- 'whatsapp' | 'instagram' | 'recall'
  tenant_id     TEXT,
  payload       JSONB NOT NULL,          -- source-specific payload needed for reprocessing
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts  INT NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 minute',
  last_error    TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_retry_queue_due_idx
  ON webhook_retry_queue (status, next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS webhook_retry_queue_tenant_idx
  ON webhook_retry_queue (tenant_id, created_at DESC);
