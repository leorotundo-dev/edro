CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- IMMUTABLE FIELDS AUDIT (ADVANCED)
-- ============================================================
CREATE TABLE IF NOT EXISTS immutable_fields_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_format_id UUID NOT NULL REFERENCES campaign_formats(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  operation_type VARCHAR(20) NOT NULL,
  attempt_status VARCHAR(20) NOT NULL,
  severity_level VARCHAR(20) NOT NULL,
  is_suspicious BOOLEAN DEFAULT false,
  suspicion_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],

  attempted_fields TEXT[] NOT NULL,
  immutable_fields_affected TEXT[] NOT NULL,
  immutable_fields_count INT GENERATED ALWAYS AS (array_length(immutable_fields_affected, 1)) STORED,

  old_values JSONB NOT NULL,
  new_values JSONB NOT NULL,
  value_deltas JSONB,

  attempted_by UUID REFERENCES edro_users(id),
  attempted_by_email TEXT,
  attempted_by_role TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  client_ip INET,
  user_agent TEXT,
  request_id TEXT,
  access_method TEXT,
  origin_endpoint TEXT,
  origin_query TEXT,

  risk_score INT CHECK (risk_score BETWEEN 0 AND 100),
  risk_factors JSONB,
  detected_pattern TEXT,

  error_message TEXT,
  error_code TEXT,
  automated_action TEXT,

  investigation_status TEXT DEFAULT 'PENDING',
  investigation_notes TEXT,
  investigated_by UUID REFERENCES edro_users(id),
  investigated_at TIMESTAMPTZ,

  resolution TEXT,
  resolved_at TIMESTAMPTZ,

  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,
  alert_recipients TEXT[],

  system_version TEXT,
  environment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_immutable_audit_campaign_format
  ON immutable_fields_audit (tenant_id, campaign_format_id);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_campaign
  ON immutable_fields_audit (tenant_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_user
  ON immutable_fields_audit (tenant_id, attempted_by);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_attempted_at
  ON immutable_fields_audit (tenant_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_status
  ON immutable_fields_audit (tenant_id, attempt_status);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_severity
  ON immutable_fields_audit (tenant_id, severity_level);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_suspicious
  ON immutable_fields_audit (tenant_id, is_suspicious) WHERE is_suspicious = true;
CREATE INDEX IF NOT EXISTS idx_immutable_audit_investigation
  ON immutable_fields_audit (tenant_id, investigation_status) WHERE investigation_status != 'RESOLVED';
CREATE INDEX IF NOT EXISTS idx_immutable_audit_immutable_fields
  ON immutable_fields_audit USING GIN (immutable_fields_affected);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_suspicion_reasons
  ON immutable_fields_audit USING GIN (suspicion_reasons);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_old_values
  ON immutable_fields_audit USING GIN (old_values);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_new_values
  ON immutable_fields_audit USING GIN (new_values);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_risk_factors
  ON immutable_fields_audit USING GIN (risk_factors);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_pattern_analysis
  ON immutable_fields_audit (attempted_by, detected_pattern, attempted_at DESC) WHERE is_suspicious = true;

DO $$
BEGIN
  ALTER TABLE immutable_fields_audit
    ADD CONSTRAINT chk_immutable_subset_of_attempted
    CHECK (immutable_fields_affected <@ attempted_fields);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE immutable_fields_audit
    ADD CONSTRAINT chk_at_least_one_field
    CHECK (array_length(attempted_fields, 1) > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE immutable_fields_audit
    ADD CONSTRAINT chk_valid_severity
    CHECK (severity_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE immutable_fields_audit
    ADD CONSTRAINT chk_valid_attempt_status
    CHECK (attempt_status IN ('BLOCKED', 'ALLOWED', 'FAILED'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE immutable_fields_audit
    ADD CONSTRAINT chk_valid_investigation_status
    CHECK (investigation_status IN ('PENDING', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE immutable_fields_audit
    ADD CONSTRAINT chk_investigation_requires_investigator
    CHECK (
      (investigation_status IN ('INVESTIGATING', 'RESOLVED') AND investigated_by IS NOT NULL)
      OR investigation_status IN ('PENDING', 'FALSE_POSITIVE')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- JSONB DIFF HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION analyze_jsonb_diff(
  p_old JSONB,
  p_new JSONB,
  p_path TEXT DEFAULT ''
)
RETURNS TABLE (
  json_path TEXT,
  old_value TEXT,
  new_value TEXT,
  change_type VARCHAR(20),
  is_critical BOOLEAN,
  risk_points INT
) AS $$
DECLARE
  v_key TEXT;
  v_old_val JSONB;
  v_new_val JSONB;
BEGIN
  FOR v_key IN SELECT jsonb_object_keys(p_old) LOOP
    v_old_val := p_old -> v_key;
    v_new_val := p_new -> v_key;

    IF v_new_val IS NULL THEN
      RETURN QUERY SELECT
        p_path || '.' || v_key,
        v_old_val::TEXT,
        NULL::TEXT,
        'REMOVED'::VARCHAR,
        is_critical_field(v_key),
        calculate_risk_points(v_key, 'REMOVED');
      CONTINUE;
    END IF;

    IF v_old_val IS DISTINCT FROM v_new_val THEN
      IF jsonb_typeof(v_old_val) = 'object' AND jsonb_typeof(v_new_val) = 'object' THEN
        RETURN QUERY SELECT * FROM analyze_jsonb_diff(
          v_old_val,
          v_new_val,
          p_path || '.' || v_key
        );
      ELSE
        RETURN QUERY SELECT
          p_path || '.' || v_key,
          v_old_val::TEXT,
          v_new_val::TEXT,
          'MODIFIED'::VARCHAR,
          is_critical_field(v_key),
          calculate_risk_points(v_key, 'MODIFIED', v_old_val, v_new_val);
      END IF;
    END IF;
  END LOOP;

  FOR v_key IN SELECT jsonb_object_keys(p_new) LOOP
    IF NOT (p_old ? v_key) THEN
      RETURN QUERY SELECT
        p_path || '.' || v_key,
        NULL::TEXT,
        (p_new -> v_key)::TEXT,
        'ADDED'::VARCHAR,
        is_critical_field(v_key),
        calculate_risk_points(v_key, 'ADDED');
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_critical_field(p_field_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_field_name IN (
    'ml_performance_score',
    'overall_score',
    'score_weights',
    'measurability_score',
    'predicted_roi_multiplier',
    'predicted_success_probability',
    'production_cost',
    'predictive_metrics',
    'catalog_snapshot',
    'catalog_version'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_risk_points(
  p_field_name TEXT,
  p_change_type VARCHAR(20),
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  v_risk_points INT := 0;
  v_old_num NUMERIC;
  v_new_num NUMERIC;
  v_delta NUMERIC;
BEGIN
  CASE p_change_type
    WHEN 'REMOVED' THEN v_risk_points := 30;
    WHEN 'ADDED' THEN v_risk_points := 20;
    WHEN 'MODIFIED' THEN v_risk_points := 10;
  END CASE;

  CASE p_field_name
    WHEN 'ml_performance_score', 'overall_score' THEN
      v_risk_points := v_risk_points + 40;
      IF p_change_type = 'MODIFIED' AND p_old_value IS NOT NULL AND p_new_value IS NOT NULL THEN
        BEGIN
          v_old_num := (p_old_value#>>'{}')::NUMERIC;
          v_new_num := (p_new_value#>>'{}')::NUMERIC;
          v_delta := ABS(v_new_num - v_old_num);
          IF v_delta > 20 THEN
            v_risk_points := v_risk_points + 30;
          ELSIF v_delta > 10 THEN
            v_risk_points := v_risk_points + 20;
          ELSIF v_delta > 5 THEN
            v_risk_points := v_risk_points + 10;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- ignore
        END;
      END IF;
    WHEN 'score_weights' THEN
      v_risk_points := v_risk_points + 35;
    WHEN 'measurability_score' THEN
      v_risk_points := v_risk_points + 25;
    WHEN 'predicted_roi_multiplier' THEN
      v_risk_points := v_risk_points + 30;
    WHEN 'predicted_success_probability' THEN
      v_risk_points := v_risk_points + 25;
    WHEN 'production_cost' THEN
      v_risk_points := v_risk_points + 20;
    WHEN 'predictive_metrics' THEN
      v_risk_points := v_risk_points + 25;
    ELSE
      v_risk_points := v_risk_points + 5;
  END CASE;

  RETURN v_risk_points;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CHECKSUM FOR SNAPSHOT
-- ============================================================
ALTER TABLE campaign_formats
  ADD COLUMN IF NOT EXISTS catalog_snapshot_checksum VARCHAR(64);

CREATE OR REPLACE FUNCTION calculate_snapshot_checksum()
RETURNS TRIGGER AS $$
BEGIN
  NEW.catalog_snapshot_checksum := encode(
    digest(NEW.catalog_snapshot::TEXT, 'sha256'),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_snapshot_checksum ON campaign_formats;
CREATE TRIGGER trigger_calculate_snapshot_checksum
  BEFORE INSERT ON campaign_formats
  FOR EACH ROW
  EXECUTE FUNCTION calculate_snapshot_checksum();

CREATE OR REPLACE FUNCTION validate_snapshot_checksum()
RETURNS TRIGGER AS $$
DECLARE
  v_expected_checksum VARCHAR(64);
BEGIN
  v_expected_checksum := encode(
    digest(OLD.catalog_snapshot::TEXT, 'sha256'),
    'hex'
  );

  IF OLD.catalog_snapshot_checksum IS NOT NULL AND OLD.catalog_snapshot_checksum <> v_expected_checksum THEN
    RAISE EXCEPTION 'Snapshot checksum mismatch';
  END IF;

  IF NEW.catalog_snapshot IS DISTINCT FROM OLD.catalog_snapshot THEN
    RAISE EXCEPTION 'Snapshot tampering detected: catalog_snapshot is immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_snapshot_checksum ON campaign_formats;
CREATE TRIGGER trigger_validate_snapshot_checksum
  BEFORE UPDATE ON campaign_formats
  FOR EACH ROW
  EXECUTE FUNCTION validate_snapshot_checksum();

-- ============================================================
-- ADVANCED AUDIT TRIGGER (IMMUTABLE FIELDS)
-- ============================================================
CREATE OR REPLACE FUNCTION audit_immutable_field_attempts_advanced()
RETURNS TRIGGER AS $$
DECLARE
  v_attempted_fields TEXT[] := ARRAY[]::TEXT[];
  v_immutable_fields TEXT[] := ARRAY[]::TEXT[];
  v_old_values JSONB := '{}'::JSONB;
  v_new_values JSONB := '{}'::JSONB;
  v_value_deltas JSONB := '{}'::JSONB;
  v_severity VARCHAR(20);
  v_is_suspicious BOOLEAN := false;
  v_suspicion_reasons TEXT[] := ARRAY[]::TEXT[];
  v_risk_score INT := 0;
  v_risk_factors JSONB := '{}'::JSONB;
  v_detected_pattern VARCHAR(100) := 'UNKNOWN';
  v_user_email TEXT;
  v_user_role TEXT;
  v_delta NUMERIC;
  v_snapshot_diff RECORD;
  v_snapshot_changes JSONB := '[]'::JSONB;
  v_critical_fields_changed INT := 0;
  v_total_risk_points INT := 0;
BEGIN
  IF OLD.is_locked = true THEN
    v_severity := 'CRITICAL';
    v_is_suspicious := true;
    v_suspicion_reasons := array_append(v_suspicion_reasons, 'ATTEMPT_TO_MODIFY_LOCKED_RECORD');
    v_risk_score := v_risk_score + 50;
  ELSE
    v_severity := 'HIGH';
  END IF;

  SELECT email, role INTO v_user_email, v_user_role
  FROM edro_users WHERE id = NEW.updated_by;

  IF NEW.predicted_ml_score IS DISTINCT FROM OLD.predicted_ml_score THEN
    v_attempted_fields := array_append(v_attempted_fields, 'predicted_ml_score');
    v_immutable_fields := array_append(v_immutable_fields, 'predicted_ml_score');
    v_old_values := v_old_values || jsonb_build_object('predicted_ml_score', OLD.predicted_ml_score);
    v_new_values := v_new_values || jsonb_build_object('predicted_ml_score', NEW.predicted_ml_score);
    v_delta := NEW.predicted_ml_score::NUMERIC - OLD.predicted_ml_score::NUMERIC;
    v_value_deltas := v_value_deltas || jsonb_build_object(
      'predicted_ml_score',
      jsonb_build_object('old', OLD.predicted_ml_score, 'new', NEW.predicted_ml_score, 'delta', v_delta)
    );
    IF v_delta > 10 THEN
      v_is_suspicious := true;
      v_suspicion_reasons := array_append(v_suspicion_reasons, 'SCORE_INFLATION_DETECTED');
      v_detected_pattern := 'SCORE_INFLATION';
      v_risk_score := v_risk_score + 30;
      v_risk_factors := v_risk_factors || '{"score_inflation": true}'::JSONB;
    END IF;
  END IF;

  IF NEW.predicted_ml_score_weights IS DISTINCT FROM OLD.predicted_ml_score_weights THEN
    v_attempted_fields := array_append(v_attempted_fields, 'predicted_ml_score_weights');
    v_immutable_fields := array_append(v_immutable_fields, 'predicted_ml_score_weights');
    v_old_values := v_old_values || jsonb_build_object('predicted_ml_score_weights', OLD.predicted_ml_score_weights);
    v_new_values := v_new_values || jsonb_build_object('predicted_ml_score_weights', NEW.predicted_ml_score_weights);
    v_is_suspicious := true;
    v_suspicion_reasons := array_append(v_suspicion_reasons, 'WEIGHTS_MODIFICATION_ATTEMPT');
    v_risk_score := v_risk_score + 40;
  END IF;

  IF NEW.predicted_measurability_score IS DISTINCT FROM OLD.predicted_measurability_score THEN
    v_attempted_fields := array_append(v_attempted_fields, 'predicted_measurability_score');
    v_immutable_fields := array_append(v_immutable_fields, 'predicted_measurability_score');
    v_old_values := v_old_values || jsonb_build_object('predicted_measurability_score', OLD.predicted_measurability_score);
    v_new_values := v_new_values || jsonb_build_object('predicted_measurability_score', NEW.predicted_measurability_score);
    v_risk_score := v_risk_score + 20;
  END IF;

  IF NEW.predicted_roi_potential IS DISTINCT FROM OLD.predicted_roi_potential THEN
    v_attempted_fields := array_append(v_attempted_fields, 'predicted_roi_potential');
    v_immutable_fields := array_append(v_immutable_fields, 'predicted_roi_potential');
    v_old_values := v_old_values || jsonb_build_object('predicted_roi_potential', OLD.predicted_roi_potential);
    v_new_values := v_new_values || jsonb_build_object('predicted_roi_potential', NEW.predicted_roi_potential);
    IF (OLD.predicted_roi_potential IN ('baixo', 'muito_baixo') AND NEW.predicted_roi_potential IN ('alto', 'muito_alto')) THEN
      v_is_suspicious := true;
      v_suspicion_reasons := array_append(v_suspicion_reasons, 'ROI_INFLATION_DETECTED');
      v_detected_pattern := 'ROI_INFLATION';
      v_risk_score := v_risk_score + 35;
    END IF;
  END IF;

  IF NEW.predicted_roi_multiplier IS DISTINCT FROM OLD.predicted_roi_multiplier THEN
    v_attempted_fields := array_append(v_attempted_fields, 'predicted_roi_multiplier');
    v_immutable_fields := array_append(v_immutable_fields, 'predicted_roi_multiplier');
    v_old_values := v_old_values || jsonb_build_object('predicted_roi_multiplier', OLD.predicted_roi_multiplier);
    v_new_values := v_new_values || jsonb_build_object('predicted_roi_multiplier', NEW.predicted_roi_multiplier);
    v_risk_score := v_risk_score + 25;
  END IF;

  IF NEW.catalog_snapshot IS DISTINCT FROM OLD.catalog_snapshot THEN
    v_attempted_fields := array_append(v_attempted_fields, 'catalog_snapshot');
    v_immutable_fields := array_append(v_immutable_fields, 'catalog_snapshot');
    v_is_suspicious := true;
    v_suspicion_reasons := array_append(v_suspicion_reasons, 'CATALOG_SNAPSHOT_TAMPERING');
    v_severity := 'CRITICAL';
    v_detected_pattern := 'CATALOG_TAMPERING';
    v_risk_score := v_risk_score + 50;

    FOR v_snapshot_diff IN
      SELECT * FROM analyze_jsonb_diff(OLD.catalog_snapshot, NEW.catalog_snapshot, 'catalog_snapshot')
    LOOP
      v_snapshot_changes := v_snapshot_changes || jsonb_build_object(
        'path', v_snapshot_diff.json_path,
        'old', v_snapshot_diff.old_value,
        'new', v_snapshot_diff.new_value,
        'type', v_snapshot_diff.change_type,
        'critical', v_snapshot_diff.is_critical,
        'risk_points', v_snapshot_diff.risk_points
      );

      IF v_snapshot_diff.is_critical THEN
        v_critical_fields_changed := v_critical_fields_changed + 1;
      END IF;
      v_total_risk_points := v_total_risk_points + v_snapshot_diff.risk_points;
    END LOOP;

    v_old_values := v_old_values || jsonb_build_object(
      'catalog_snapshot',
      jsonb_build_object(
        'status', 'TAMPERED',
        'changes_count', jsonb_array_length(v_snapshot_changes),
        'critical_fields_changed', v_critical_fields_changed,
        'total_risk_points', v_total_risk_points,
        'changes', v_snapshot_changes
      )
    );
    v_new_values := v_new_values || jsonb_build_object('catalog_snapshot', 'MODIFIED_SEE_DETAILS');

    v_risk_score := v_risk_score + LEAST(v_total_risk_points, 50);
    v_risk_factors := v_risk_factors || jsonb_build_object(
      'snapshot_tampering', true,
      'fields_changed', jsonb_array_length(v_snapshot_changes),
      'critical_fields_changed', v_critical_fields_changed,
      'total_risk_points', v_total_risk_points
    );

    IF v_critical_fields_changed >= 3 THEN
      v_risk_score := v_risk_score + 30;
      v_suspicion_reasons := array_append(v_suspicion_reasons, 'BULK_CRITICAL_FIELD_TAMPERING');
    END IF;
  END IF;

  IF NEW.catalog_version IS DISTINCT FROM OLD.catalog_version THEN
    v_attempted_fields := array_append(v_attempted_fields, 'catalog_version');
    v_immutable_fields := array_append(v_immutable_fields, 'catalog_version');
    v_old_values := v_old_values || jsonb_build_object('catalog_version', OLD.catalog_version);
    v_new_values := v_new_values || jsonb_build_object('catalog_version', NEW.catalog_version);
    v_is_suspicious := true;
    v_suspicion_reasons := array_append(v_suspicion_reasons, 'VERSION_TAMPERING');
    v_risk_score := v_risk_score + 40;
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    v_attempted_fields := array_append(v_attempted_fields, 'created_at');
    v_immutable_fields := array_append(v_immutable_fields, 'created_at');
    v_old_values := v_old_values || jsonb_build_object('created_at', OLD.created_at);
    v_new_values := v_new_values || jsonb_build_object('created_at', NEW.created_at);
    v_is_suspicious := true;
    v_suspicion_reasons := array_append(v_suspicion_reasons, 'TIMESTAMP_TAMPERING');
    v_severity := 'CRITICAL';
    v_risk_score := v_risk_score + 50;
  END IF;

  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    v_attempted_fields := array_append(v_attempted_fields, 'created_by');
    v_immutable_fields := array_append(v_immutable_fields, 'created_by');
    v_old_values := v_old_values || jsonb_build_object('created_by', OLD.created_by);
    v_new_values := v_new_values || jsonb_build_object('created_by', NEW.created_by);
    v_is_suspicious := true;
    v_suspicion_reasons := array_append(v_suspicion_reasons, 'CREATOR_TAMPERING');
    v_severity := 'CRITICAL';
    v_risk_score := v_risk_score + 50;
  END IF;

  IF array_length(v_immutable_fields, 1) > 3 THEN
    v_is_suspicious := true;
    v_suspicion_reasons := array_append(v_suspicion_reasons, 'BULK_IMMUTABLE_UPDATE_ATTEMPT');
    v_detected_pattern := 'BULK_UPDATE';
    v_risk_score := v_risk_score + 20;
    v_risk_factors := v_risk_factors || '{"multiple_immutable_fields": true}'::JSONB;
  END IF;

  IF v_risk_score > 100 THEN
    v_risk_score := 100;
  END IF;

  IF array_length(v_immutable_fields, 1) > 0 THEN
    INSERT INTO immutable_fields_audit (
      tenant_id,
      campaign_format_id,
      campaign_id,
      operation_type,
      attempt_status,
      severity_level,
      is_suspicious,
      suspicion_reasons,
      attempted_fields,
      immutable_fields_affected,
      old_values,
      new_values,
      value_deltas,
      attempted_by,
      attempted_by_email,
      attempted_by_role,
      client_ip,
      user_agent,
      request_id,
      access_method,
      origin_endpoint,
      origin_query,
      risk_score,
      risk_factors,
      detected_pattern,
      error_message,
      error_code,
      automated_action,
      system_version,
      environment
    ) VALUES (
      OLD.tenant_id,
      OLD.id,
      OLD.campaign_id,
      'UPDATE_BLOCKED',
      'BLOCKED',
      v_severity,
      v_is_suspicious,
      v_suspicion_reasons,
      v_attempted_fields,
      v_immutable_fields,
      v_old_values,
      v_new_values,
      v_value_deltas,
      NEW.updated_by,
      v_user_email,
      v_user_role,
      inet_client_addr(),
      current_setting('app.user_agent', true),
      current_setting('app.request_id', true),
      current_setting('app.access_method', true),
      current_setting('app.origin_endpoint', true),
      current_query(),
      v_risk_score,
      v_risk_factors,
      v_detected_pattern,
      'Immutable field update attempt blocked',
      'IMMUTABLE_UPDATE',
      'BLOCKED',
      current_setting('app.system_version', true),
      current_setting('app.environment', true)
    );

    RAISE EXCEPTION 'Cannot update immutable fields: %', array_to_string(v_immutable_fields, ', ')
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_campaign_format_updates ON campaign_formats;
DROP FUNCTION IF EXISTS prevent_campaign_format_updates();

DROP TRIGGER IF EXISTS trigger_audit_immutable_attempts ON campaign_formats;
CREATE TRIGGER trigger_audit_immutable_attempts
  BEFORE UPDATE ON campaign_formats
  FOR EACH ROW
  EXECUTE FUNCTION audit_immutable_field_attempts_advanced();
