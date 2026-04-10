-- 0333: Campaign Performance Floor
--
-- 1. Links dark_funnel_events → campaigns (direct attribution instead of
--    inferring from related_content_ids array)
-- 2. Adds a campaign_performance_cache table so the API can serve
--    aggregate KPIs (impressions, reach, revenue) without a full JOIN scan
--    every request. Refreshed by the same worker that calls recomputeClientLearningRules.

-- ── 1. dark_funnel_events.campaign_id ─────────────────────────────────────────

ALTER TABLE dark_funnel_events
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dark_funnel_campaign
  ON dark_funnel_events (tenant_id, campaign_id)
  WHERE campaign_id IS NOT NULL;

-- ── 2. campaign_performance_cache ─────────────────────────────────────────────
-- One row per campaign. Refreshed by calling refresh_campaign_performance_cache(campaign_id).

CREATE TABLE IF NOT EXISTS campaign_performance_cache (
  campaign_id           UUID        PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Rolled up from format_performance_summary via campaign_formats
  total_impressions     BIGINT      NOT NULL DEFAULT 0,
  total_reach           BIGINT      NOT NULL DEFAULT 0,
  total_clicks          BIGINT      NOT NULL DEFAULT 0,
  total_engagements     BIGINT      NOT NULL DEFAULT 0,
  total_conversions     BIGINT      NOT NULL DEFAULT 0,
  total_spend_brl       DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_revenue_brl     DECIMAL(12,2) NOT NULL DEFAULT 0,
  avg_roas              DECIMAL(8,4),

  -- Rolled up from format_performance_metrics (last 30 days)
  impressions_30d       BIGINT      NOT NULL DEFAULT 0,
  reach_30d             BIGINT      NOT NULL DEFAULT 0,
  conversions_30d       BIGINT      NOT NULL DEFAULT 0,
  spend_30d             DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Dark funnel signal count linked to this campaign
  dark_funnel_count     INT         NOT NULL DEFAULT 0,

  refreshed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_perf_cache_tenant
  ON campaign_performance_cache (tenant_id);
