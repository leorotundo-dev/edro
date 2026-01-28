CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT NOT NULL, -- 'performance', 'branding', 'balanced'
  budget_brl DECIMAL(10,2),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES edro_users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES edro_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant
  ON campaigns (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status
  ON campaigns (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates
  ON campaigns (tenant_id, start_date, end_date);

-- ============================================================
-- CAMPAIGN FORMATS (IMUTÁVEL)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_formats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  format_name VARCHAR(255) NOT NULL,
  platform VARCHAR(100) NOT NULL,
  production_type VARCHAR(50) NOT NULL,

  -- Snapshot imutável (no momento da criação)
  predicted_ml_score DECIMAL(5,2) NOT NULL,
  predicted_ml_score_weights JSONB NOT NULL,
  predicted_measurability_score DECIMAL(5,2) NOT NULL,
  predicted_roi_potential VARCHAR(20) NOT NULL,
  predicted_roi_multiplier DECIMAL(5,2) NOT NULL,
  predicted_engagement_benchmark VARCHAR(20) NOT NULL,
  predicted_reach_organic VARCHAR(20) NOT NULL,
  predicted_reach_paid VARCHAR(20) NOT NULL,
  predicted_market_trend VARCHAR(20) NOT NULL,
  predicted_reusability_score INT NOT NULL CHECK (predicted_reusability_score BETWEEN 1 AND 5),
  predicted_synergy_score INT NOT NULL CHECK (predicted_synergy_score BETWEEN 1 AND 5),
  predicted_evergreen_potential VARCHAR(20) NOT NULL,
  predicted_cost_efficiency_score DECIMAL(5,2) NOT NULL,
  predicted_success_probability DECIMAL(5,2) NOT NULL,
  predicted_confidence_level VARCHAR(20) NOT NULL,
  predicted_time_to_results VARCHAR(50) NOT NULL,

  estimated_production_cost_min_brl DECIMAL(10,2) NOT NULL,
  estimated_production_cost_max_brl DECIMAL(10,2) NOT NULL,
  estimated_media_cost_brl DECIMAL(10,2),
  estimated_hours DECIMAL(5,1) NOT NULL,
  estimated_skill_level VARCHAR(20) NOT NULL,

  catalog_snapshot JSONB NOT NULL,
  catalog_version VARCHAR(20) NOT NULL,

  -- Campos mutáveis
  actual_production_cost_brl DECIMAL(10,2),
  actual_media_cost_brl DECIMAL(10,2),
  actual_hours_spent DECIMAL(5,1),
  produced_at TIMESTAMPTZ,
  launched_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES edro_users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES edro_users(id) ON DELETE SET NULL,

  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID NULL REFERENCES edro_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_formats_campaign
  ON campaign_formats (tenant_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_formats_format
  ON campaign_formats (tenant_id, format_name);
CREATE INDEX IF NOT EXISTS idx_campaign_formats_platform
  ON campaign_formats (tenant_id, platform);
CREATE INDEX IF NOT EXISTS idx_campaign_formats_locked
  ON campaign_formats (tenant_id, is_locked);
CREATE INDEX IF NOT EXISTS idx_campaign_formats_catalog_version
  ON campaign_formats (tenant_id, catalog_version);
CREATE INDEX IF NOT EXISTS idx_campaign_formats_snapshot
  ON campaign_formats USING GIN (catalog_snapshot);

DO $$
BEGIN
  ALTER TABLE campaign_formats
    ADD CONSTRAINT chk_ml_score_range
    CHECK (predicted_ml_score BETWEEN 0 AND 100);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE campaign_formats
    ADD CONSTRAINT chk_measurability_range
    CHECK (predicted_measurability_score BETWEEN 0 AND 100);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE campaign_formats
    ADD CONSTRAINT chk_roi_multiplier_positive
    CHECK (predicted_roi_multiplier > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE campaign_formats
    ADD CONSTRAINT chk_success_probability_range
    CHECK (predicted_success_probability BETWEEN 0 AND 100);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE campaign_formats
    ADD CONSTRAINT chk_actual_costs_positive
    CHECK (
      (actual_production_cost_brl IS NULL OR actual_production_cost_brl >= 0) AND
      (actual_media_cost_brl IS NULL OR actual_media_cost_brl >= 0) AND
      (actual_hours_spent IS NULL OR actual_hours_spent >= 0)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TRIGGER: prevenir updates em campos imutáveis
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_campaign_format_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_locked = true THEN
    RAISE EXCEPTION 'Cannot update locked campaign format (id: %)', OLD.id;
  END IF;

  IF NEW.predicted_ml_score IS DISTINCT FROM OLD.predicted_ml_score THEN
    RAISE EXCEPTION 'Cannot update predicted_ml_score after creation';
  END IF;
  IF NEW.predicted_ml_score_weights IS DISTINCT FROM OLD.predicted_ml_score_weights THEN
    RAISE EXCEPTION 'Cannot update predicted_ml_score_weights after creation';
  END IF;
  IF NEW.predicted_measurability_score IS DISTINCT FROM OLD.predicted_measurability_score THEN
    RAISE EXCEPTION 'Cannot update predicted_measurability_score after creation';
  END IF;
  IF NEW.predicted_roi_potential IS DISTINCT FROM OLD.predicted_roi_potential THEN
    RAISE EXCEPTION 'Cannot update predicted_roi_potential after creation';
  END IF;
  IF NEW.predicted_roi_multiplier IS DISTINCT FROM OLD.predicted_roi_multiplier THEN
    RAISE EXCEPTION 'Cannot update predicted_roi_multiplier after creation';
  END IF;
  IF NEW.catalog_snapshot IS DISTINCT FROM OLD.catalog_snapshot THEN
    RAISE EXCEPTION 'Cannot update catalog_snapshot after creation';
  END IF;
  IF NEW.catalog_version IS DISTINCT FROM OLD.catalog_version THEN
    RAISE EXCEPTION 'Cannot update catalog_version after creation';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot update created_at after creation';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Cannot update created_by after creation';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_campaign_format_updates ON campaign_formats;
CREATE TRIGGER trigger_prevent_campaign_format_updates
  BEFORE UPDATE ON campaign_formats
  FOR EACH ROW
  EXECUTE FUNCTION prevent_campaign_format_updates();

-- ============================================================
-- AUDITORIA
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_formats_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_format_id UUID NOT NULL,
  operation VARCHAR(10) NOT NULL,
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES edro_users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_format_audit_format
  ON campaign_formats_audit (tenant_id, campaign_format_id);
CREATE INDEX IF NOT EXISTS idx_campaign_format_audit_changed
  ON campaign_formats_audit (tenant_id, changed_at DESC);

CREATE OR REPLACE FUNCTION audit_campaign_format_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_json JSONB := '{}'::JSONB;
  old_values_json JSONB := '{}'::JSONB;
  new_values_json JSONB := '{}'::JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO campaign_formats_audit (
      tenant_id,
      campaign_format_id,
      operation,
      new_values,
      changed_by
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      NEW.created_by
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.actual_production_cost_brl IS DISTINCT FROM OLD.actual_production_cost_brl THEN
      changed_fields_json := changed_fields_json || '{"actual_production_cost_brl": true}';
      old_values_json := old_values_json || jsonb_build_object('actual_production_cost_brl', OLD.actual_production_cost_brl);
      new_values_json := new_values_json || jsonb_build_object('actual_production_cost_brl', NEW.actual_production_cost_brl);
    END IF;
    IF NEW.actual_media_cost_brl IS DISTINCT FROM OLD.actual_media_cost_brl THEN
      changed_fields_json := changed_fields_json || '{"actual_media_cost_brl": true}';
      old_values_json := old_values_json || jsonb_build_object('actual_media_cost_brl', OLD.actual_media_cost_brl);
      new_values_json := new_values_json || jsonb_build_object('actual_media_cost_brl', NEW.actual_media_cost_brl);
    END IF;
    IF NEW.actual_hours_spent IS DISTINCT FROM OLD.actual_hours_spent THEN
      changed_fields_json := changed_fields_json || '{"actual_hours_spent": true}';
      old_values_json := old_values_json || jsonb_build_object('actual_hours_spent', OLD.actual_hours_spent);
      new_values_json := new_values_json || jsonb_build_object('actual_hours_spent', NEW.actual_hours_spent);
    END IF;

    IF changed_fields_json != '{}'::JSONB THEN
      INSERT INTO campaign_formats_audit (
        tenant_id,
        campaign_format_id,
        operation,
        changed_fields,
        old_values,
        new_values,
        changed_by
      ) VALUES (
        NEW.tenant_id,
        NEW.id,
        'UPDATE',
        changed_fields_json,
        old_values_json,
        new_values_json,
        NEW.updated_by
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO campaign_formats_audit (
      tenant_id,
      campaign_format_id,
      operation,
      old_values
    ) VALUES (
      OLD.tenant_id,
      OLD.id,
      'DELETE',
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_campaign_format_changes ON campaign_formats;
CREATE TRIGGER trigger_audit_campaign_format_changes
  AFTER INSERT OR UPDATE OR DELETE ON campaign_formats
  FOR EACH ROW
  EXECUTE FUNCTION audit_campaign_format_changes();

CREATE OR REPLACE FUNCTION lock_campaign_format(
  p_campaign_format_id UUID,
  p_locked_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE campaign_formats
  SET
    is_locked = true,
    locked_at = NOW(),
    locked_by = p_locked_by
  WHERE id = p_campaign_format_id
    AND is_locked = false;

  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PERFORMANCE METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS format_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_format_id UUID NOT NULL REFERENCES campaign_formats(id) ON DELETE CASCADE,

  measurement_date DATE NOT NULL,
  measurement_period VARCHAR(20) DEFAULT 'daily',

  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  frequency DECIMAL(5,2),

  clicks BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  saves BIGINT DEFAULT 0,
  engagement_rate DECIMAL(5,2),

  video_views BIGINT DEFAULT 0,
  video_completion_rate DECIMAL(5,2),
  avg_watch_time_seconds INT,

  conversions BIGINT DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  revenue_brl DECIMAL(10,2),

  spend_brl DECIMAL(10,2),
  cpm DECIMAL(10,2),
  cpc DECIMAL(10,2),
  cpa DECIMAL(10,2),
  roas DECIMAL(10,2),

  data_source VARCHAR(50),
  is_verified BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_format
  ON format_performance_metrics (tenant_id, campaign_format_id);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_date
  ON format_performance_metrics (tenant_id, measurement_date);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_period
  ON format_performance_metrics (tenant_id, measurement_period);

-- ============================================================
-- PERFORMANCE SUMMARY
-- ============================================================
CREATE TABLE IF NOT EXISTS format_performance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_format_id UUID NOT NULL REFERENCES campaign_formats(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_active INT,

  total_impressions BIGINT DEFAULT 0,
  total_reach BIGINT DEFAULT 0,
  total_clicks BIGINT DEFAULT 0,
  total_engagements BIGINT DEFAULT 0,
  total_conversions BIGINT DEFAULT 0,
  total_revenue_brl DECIMAL(10,2) DEFAULT 0,
  total_spend_brl DECIMAL(10,2) DEFAULT 0,

  avg_engagement_rate DECIMAL(5,2),
  avg_ctr DECIMAL(5,2),
  actual_roi_multiplier DECIMAL(5,2),
  actual_roas DECIMAL(5,2),

  predicted_ml_score DECIMAL(5,2),
  predicted_roi_multiplier DECIMAL(5,2),
  score_accuracy DECIMAL(5,2),

  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(campaign_format_id)
);

CREATE INDEX IF NOT EXISTS idx_perf_summary_format
  ON format_performance_summary (tenant_id, campaign_format_id);
CREATE INDEX IF NOT EXISTS idx_perf_summary_dates
  ON format_performance_summary (tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_perf_summary_finalized
  ON format_performance_summary (tenant_id, is_finalized);

-- ============================================================
-- VIEW CONSOLIDADA
-- ============================================================
CREATE OR REPLACE VIEW campaign_format_performance_view AS
SELECT
  cf.id as campaign_format_id,
  cf.tenant_id,
  cf.client_id,
  cf.format_name,
  cf.platform,
  cf.production_type,
  c.name as campaign_name,
  c.objective as campaign_objective,

  cf.predicted_ml_score,
  cf.predicted_measurability_score,
  cf.predicted_roi_multiplier,
  cf.predicted_engagement_benchmark,

  fps.total_impressions,
  fps.total_reach,
  fps.total_clicks,
  fps.total_engagements,
  fps.total_conversions,
  fps.total_revenue_brl,
  fps.total_spend_brl,
  fps.avg_engagement_rate as actual_engagement_rate,
  fps.avg_ctr as actual_ctr,
  fps.actual_roi_multiplier,
  fps.actual_roas,

  fps.score_accuracy,
  (fps.actual_roi_multiplier - cf.predicted_roi_multiplier) as roi_prediction_error,

  cf.launched_at,
  fps.start_date,
  fps.end_date,
  fps.days_active,
  fps.is_finalized
FROM campaign_formats cf
JOIN campaigns c ON cf.campaign_id = c.id
LEFT JOIN format_performance_summary fps ON cf.id = fps.campaign_format_id;
