-- 0240_webhook_events.sql
-- Universal inbound webhook: one URL per client for Zapier / Make / n8n / custom

-- Add webhook_secret to clients (one per client, unique token for their webhook URL)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS webhook_secret TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Backfill existing clients that have NULL webhook_secret
UPDATE clients SET webhook_secret = gen_random_uuid()::text WHERE webhook_secret IS NULL;

CREATE TABLE IF NOT EXISTS webhook_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL,
  client_id         TEXT NOT NULL,
  source            TEXT,                        -- 'zapier' | 'make' | 'n8n' | 'custom'
  event_type        TEXT,                        -- optional event type from payload
  raw_payload       JSONB NOT NULL,
  extracted_message TEXT,                        -- best-effort message extracted from payload
  jarvis_processed  BOOLEAN NOT NULL DEFAULT false,
  briefing_id       UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_events_client_idx
  ON webhook_events(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS webhook_events_tenant_idx
  ON webhook_events(tenant_id, created_at DESC);
