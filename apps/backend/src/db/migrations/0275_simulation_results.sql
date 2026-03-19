-- Migration: Campaign Simulation Results
-- Stores pre-launch performance predictions for copy variants

CREATE TABLE IF NOT EXISTS simulation_results (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     TEXT        NOT NULL,
  client_id     TEXT,
  campaign_id   UUID        REFERENCES campaigns(id) ON DELETE SET NULL,
  platform      TEXT,

  -- Input variants (array of {index, text, amd?, triggers?[]})
  variants      JSONB       NOT NULL DEFAULT '[]',

  -- Per-variant × per-cluster scores
  -- [{variant_index, cluster_type, resonance_score, predicted_save_rate, predicted_click_rate, predicted_engagement_rate, risk_level}]
  scores        JSONB       NOT NULL DEFAULT '[]',

  -- Aggregate result
  winner_index          INT,
  winner_predicted_save_rate    NUMERIC(6,4),
  winner_predicted_click_rate   NUMERIC(6,4),
  winner_predicted_engagement   NUMERIC(6,4),
  winner_fatigue_days           INT,
  risk_flags    JSONB       DEFAULT '[]',

  -- Meta
  cluster_count         INT,
  rule_count            INT,
  confidence_avg        NUMERIC(4,2),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulation_results_tenant
  ON simulation_results (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_simulation_results_client
  ON simulation_results (client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_simulation_results_campaign
  ON simulation_results (campaign_id) WHERE campaign_id IS NOT NULL;
