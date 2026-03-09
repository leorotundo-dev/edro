-- 0231_copy_roi_scores.sql
-- Persisted ROI scores per behavioral copy, computed by copyRoiService.
-- Combines: Fogg quality scores + Meta performance metrics + estimated AI cost.

CREATE TABLE IF NOT EXISTS copy_roi_scores (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT        NOT NULL,
  client_id             TEXT        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id           UUID        REFERENCES campaigns(id) ON DELETE CASCADE,
  behavioral_copy_id    UUID        REFERENCES campaign_behavioral_copies(id) ON DELETE CASCADE,
  briefing_id           UUID        REFERENCES edro_briefings(id) ON DELETE SET NULL,

  -- Fogg quality dimensions (0-10)
  fogg_motivation       NUMERIC(4,1),
  fogg_ability          NUMERIC(4,1),
  fogg_prompt           NUMERIC(4,1),
  fogg_composite        NUMERIC(5,2), -- geometric mean of the three

  -- Real Meta performance (summed across campaign formats)
  total_impressions     BIGINT      DEFAULT 0,
  total_clicks          BIGINT      DEFAULT 0,
  total_conversions     BIGINT      DEFAULT 0,
  total_spend_brl       NUMERIC(12,2) DEFAULT 0,
  total_revenue_brl     NUMERIC(12,2) DEFAULT 0,
  avg_ctr               NUMERIC(6,4),  -- clicks / impressions
  avg_cpc_brl           NUMERIC(10,2),
  avg_roas              NUMERIC(10,2),

  -- AI cost estimate for this copy
  ai_cost_usd           NUMERIC(10,6) DEFAULT 0,
  ai_cost_brl           NUMERIC(10,4) DEFAULT 0,

  -- Composite ROI score (0-100)
  roi_score             NUMERIC(5,1),
  roi_label             TEXT CHECK (roi_label IN ('excellent', 'good', 'average', 'poor', 'no_data')),
  roi_pct               NUMERIC(10,2), -- (revenue - spend - ai_cost) / (spend + ai_cost) * 100; NULL if no spend data

  -- Human-readable summary
  summary               TEXT,

  computed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (behavioral_copy_id)
);

CREATE INDEX IF NOT EXISTS idx_copy_roi_tenant_client
  ON copy_roi_scores (tenant_id, client_id, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_copy_roi_campaign
  ON copy_roi_scores (campaign_id);

COMMENT ON TABLE copy_roi_scores IS
  'Computed ROI per behavioral copy: Fogg quality + Meta performance + AI cost.
   Updated on demand via POST /clients/:id/reports/compute-copy-roi';
