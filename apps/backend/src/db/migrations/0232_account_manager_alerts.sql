-- 0232_account_manager_alerts.sql
-- AI Account Manager proactive alerts and recommended actions per client.

CREATE TABLE IF NOT EXISTS account_manager_alerts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT        NOT NULL,
  client_id     TEXT        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Alert classification
  alert_type    TEXT        NOT NULL CHECK (alert_type IN (
                  'churn_risk', 'upsell', 'expand_services',
                  'positive_momentum', 'payment_risk', 'engagement_drop', 'opportunity'
                )),
  priority      TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),

  -- Content
  title         TEXT        NOT NULL,
  body          TEXT        NOT NULL,
  recommended_action TEXT   NOT NULL,

  -- Context signals used
  health_score  INTEGER,
  health_trend  TEXT,
  roi_score     NUMERIC(5,1),
  signals       JSONB       NOT NULL DEFAULT '{}',

  -- Lifecycle
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'actioned')),
  actioned_by   TEXT,
  actioned_at   TIMESTAMPTZ,
  dismissed_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,

  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ama_tenant_client
  ON account_manager_alerts (tenant_id, client_id, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ama_active
  ON account_manager_alerts (tenant_id, status, priority, computed_at DESC)
  WHERE status = 'active';

COMMENT ON TABLE account_manager_alerts IS
  'AI-generated proactive account manager alerts: churn risk, upsell, expand services, etc.
   Refreshed daily by accountManagerService.computeClientAlerts().';
