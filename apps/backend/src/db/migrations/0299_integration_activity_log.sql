-- Migration 0299: Integration Activity Log
--
-- Tracks last activity per integration service so the monitoring dashboard
-- can show live status (last sync, last error, record counts) without
-- polling external APIs.

CREATE TABLE IF NOT EXISTS integration_activity_log (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    TEXT NOT NULL,
  service      TEXT NOT NULL,  -- 'trello' | 'whatsapp' | 'recall' | 'resend' | 'd4sign' | 'openai' | 'gmail' | 'google_calendar' | 'instagram' | 'trello_webhook'
  event        TEXT NOT NULL,  -- 'sync' | 'message_sent' | 'message_received' | 'email_sent' | 'bot_deployed' | 'webhook' | 'error' | ...
  status       TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error', 'degraded')),
  records      INTEGER,        -- how many records processed (cards synced, emails sent, etc.)
  error_msg    TEXT,           -- error message if status = 'error'
  meta         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ial_tenant_service
  ON integration_activity_log(tenant_id, service, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ial_tenant_created
  ON integration_activity_log(tenant_id, created_at DESC);

-- View: latest event per service per tenant (used by monitor endpoint)
CREATE OR REPLACE VIEW integration_latest_activity AS
  SELECT DISTINCT ON (tenant_id, service)
    tenant_id, service, event, status, records, error_msg, meta, created_at
  FROM integration_activity_log
  ORDER BY tenant_id, service, created_at DESC;
