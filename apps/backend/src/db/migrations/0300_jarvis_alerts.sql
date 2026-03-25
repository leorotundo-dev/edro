-- Migration 0300: Jarvis Alerts — cross-source intelligence alerts

CREATE TABLE IF NOT EXISTS jarvis_alerts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    TEXT NOT NULL,
  client_id    TEXT REFERENCES clients(id) ON DELETE CASCADE,

  alert_type   TEXT NOT NULL,   -- card_stalled | meeting_no_card | whatsapp_no_reply | contract_expiring | market_opportunity
  title        TEXT NOT NULL,
  body         TEXT,
  source_refs  JSONB,           -- { board_id, card_id, meeting_id, contract_id, ... }
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent','high','medium','low')),

  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','snoozed','dismissed','resolved')),
  snoozed_until TIMESTAMPTZ,
  resolved_at  TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jarvis_alerts_tenant_open_idx  ON jarvis_alerts(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS jarvis_alerts_client_idx       ON jarvis_alerts(client_id, status);
CREATE INDEX IF NOT EXISTS jarvis_alerts_type_idx         ON jarvis_alerts(alert_type, tenant_id);

-- Prevent duplicate open alerts of the same type for the same client
CREATE UNIQUE INDEX IF NOT EXISTS jarvis_alerts_dedup_idx
  ON jarvis_alerts(tenant_id, client_id, alert_type, (source_refs->>'ref_id'))
  WHERE status = 'open';
