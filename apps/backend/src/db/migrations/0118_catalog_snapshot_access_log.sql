CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CATALOG SNAPSHOT ACCESS LOG (PARTITIONED)
-- =====================================================
CREATE TABLE IF NOT EXISTS catalog_snapshot_access_log (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,

  log_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,

  operation_type TEXT NOT NULL,
  access_method TEXT NOT NULL,

  campaign_format_id UUID NOT NULL REFERENCES campaign_formats(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  format_catalog_id TEXT,

  snapshot_accessed JSONB,
  snapshot_size_bytes INTEGER,
  snapshot_hash TEXT,

  accessed_by UUID REFERENCES edro_users(id),
  accessed_by_username TEXT,
  accessed_by_email TEXT,

  client_ip INET,
  client_ip_country TEXT,
  client_ip_city TEXT,

  user_agent TEXT,
  session_id TEXT,
  request_id TEXT,

  query_text TEXT,
  query_hash TEXT,
  query_plan JSONB,
  query_duration_ms INTEGER,

  application_name TEXT,
  application_version TEXT,
  database_user TEXT,
  database_name TEXT,
  connection_pid INTEGER,

  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicion_score INTEGER DEFAULT 0 CHECK (suspicion_score BETWEEN 0 AND 100),
  suspicion_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  detected_patterns TEXT[] DEFAULT ARRAY[]::TEXT[],

  business_reason TEXT,
  ticket_reference TEXT,
  approval_required BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES edro_users(id),
  approved_at TIMESTAMPTZ,

  operation_status TEXT NOT NULL,
  error_message TEXT,
  error_code TEXT,

  rows_affected INTEGER DEFAULT 0,
  data_volume_bytes INTEGER DEFAULT 0,

  alert_sent BOOLEAN DEFAULT FALSE,
  alert_recipients TEXT[],
  alert_sent_at TIMESTAMPTZ,
  alert_channel TEXT,

  requires_investigation BOOLEAN DEFAULT FALSE,
  investigation_status TEXT,
  investigated_by UUID REFERENCES edro_users(id),
  investigation_notes TEXT,
  investigation_completed_at TIMESTAMPTZ,

  environment TEXT NOT NULL,
  system_version TEXT,

  is_compressed BOOLEAN DEFAULT FALSE,
  compressed_at TIMESTAMPTZ,
  retention_until DATE,

  is_immutable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (id, log_date),

  CONSTRAINT valid_suspicion_score CHECK (
    (is_suspicious = FALSE AND suspicion_score = 0) OR
    (is_suspicious = TRUE AND suspicion_score > 0)
  ),
  CONSTRAINT valid_approval CHECK (
    (approval_required = FALSE) OR
    (approval_required = TRUE AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
) PARTITION BY RANGE (log_date);

DO $$
DECLARE
  start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
  end_date DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..23 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'catalog_snapshot_access_log_' || TO_CHAR(start_date, 'YYYY_MM');

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF catalog_snapshot_access_log FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      start_date,
      end_date
    );

    start_date := end_date;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION create_next_month_partition()
RETURNS VOID AS $$
DECLARE
  next_month DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 months');
  end_month DATE := next_month + INTERVAL '1 month';
  partition_name TEXT := 'catalog_snapshot_access_log_' || TO_CHAR(next_month, 'YYYY_MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF catalog_snapshot_access_log FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    next_month,
    end_month
  );
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_access_log_timestamp
  ON catalog_snapshot_access_log (log_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_format
  ON catalog_snapshot_access_log (campaign_format_id, log_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_user
  ON catalog_snapshot_access_log (accessed_by, log_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_suspicious
  ON catalog_snapshot_access_log (is_suspicious, suspicion_score DESC) WHERE is_suspicious = TRUE;
CREATE INDEX IF NOT EXISTS idx_access_log_operation
  ON catalog_snapshot_access_log (operation_type, log_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_query_hash
  ON catalog_snapshot_access_log (query_hash) WHERE query_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_access_log_snapshot_hash
  ON catalog_snapshot_access_log (snapshot_hash) WHERE snapshot_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_access_log_patterns
  ON catalog_snapshot_access_log USING GIN (detected_patterns);
CREATE INDEX IF NOT EXISTS idx_access_log_investigation
  ON catalog_snapshot_access_log (investigation_status, log_timestamp DESC)
  WHERE requires_investigation = TRUE;
CREATE INDEX IF NOT EXISTS idx_access_log_forensic
  ON catalog_snapshot_access_log (client_ip, accessed_by, operation_type, log_timestamp DESC);

-- =====================================================
-- ACCESS LOG TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION log_catalog_snapshot_access()
RETURNS TRIGGER AS $$
DECLARE
  v_query_text TEXT;
  v_query_hash TEXT;
  v_snapshot_hash TEXT;
  v_suspicion_score INTEGER := 0;
  v_suspicion_reasons TEXT[] := ARRAY[]::TEXT[];
  v_detected_patterns TEXT[] := ARRAY[]::TEXT[];
  v_is_suspicious BOOLEAN := FALSE;
  v_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
BEGIN
  v_query_text := current_query();
  v_query_hash := MD5(v_query_text);

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_snapshot_hash := encode(digest(OLD.catalog_snapshot::text, 'sha256'), 'hex');
  ELSIF TG_OP = 'INSERT' THEN
    v_snapshot_hash := encode(digest(NEW.catalog_snapshot::text, 'sha256'), 'hex');
  END IF;

  -- simple suspicion rules
  IF EXTRACT(HOUR FROM NOW()) BETWEEN 0 AND 6 THEN
    v_suspicion_score := v_suspicion_score + 20;
    v_suspicion_reasons := array_append(v_suspicion_reasons, 'OFF_HOURS_ACCESS');
    v_detected_patterns := array_append(v_detected_patterns, 'OFF_HOURS');
  END IF;

  IF v_query_text ILIKE '%UPDATE campaign_formats%' OR v_query_text ILIKE '%DELETE FROM campaign_formats%' THEN
    v_suspicion_score := v_suspicion_score + 30;
    v_suspicion_reasons := array_append(v_suspicion_reasons, 'DIRECT_SQL_ACCESS');
    v_detected_patterns := array_append(v_detected_patterns, 'DIRECT_SQL');
  END IF;

  IF v_suspicion_score >= 40 THEN
    v_is_suspicious := TRUE;
  END IF;

  v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
  v_user_name := current_setting('app.current_username', true);
  v_user_email := current_setting('app.current_user_email', true);

  INSERT INTO catalog_snapshot_access_log (
    tenant_id,
    client_id,
    operation_type,
    access_method,
    campaign_format_id,
    campaign_id,
    format_catalog_id,
    snapshot_accessed,
    snapshot_size_bytes,
    snapshot_hash,
    accessed_by,
    accessed_by_username,
    accessed_by_email,
    client_ip,
    user_agent,
    session_id,
    request_id,
    query_text,
    query_hash,
    query_duration_ms,
    application_name,
    database_user,
    database_name,
    connection_pid,
    is_suspicious,
    suspicion_score,
    suspicion_reasons,
    detected_patterns,
    operation_status,
    environment,
    system_version
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    COALESCE(NEW.client_id, OLD.client_id),
    TG_OP,
    COALESCE(current_setting('app.access_method', true), 'DIRECT_SQL'),
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.campaign_id, OLD.campaign_id),
    COALESCE(NEW.format_name, OLD.format_name),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.catalog_snapshot ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN pg_column_size(OLD.catalog_snapshot) ELSE NULL END,
    v_snapshot_hash,
    v_user_id,
    v_user_name,
    v_user_email,
    inet_client_addr(),
    current_setting('app.user_agent', true),
    current_setting('app.session_id', true),
    current_setting('app.request_id', true),
    v_query_text,
    v_query_hash,
    NULL,
    current_setting('application_name', true),
    current_user,
    current_database(),
    pg_backend_pid(),
    v_is_suspicious,
    v_suspicion_score,
    v_suspicion_reasons,
    v_detected_patterns,
    'SUCCESS',
    COALESCE(current_setting('app.environment', true), 'production'),
    current_setting('app.system_version', true)
  );

  IF v_is_suspicious THEN
    PERFORM pg_notify(
      'catalog_snapshot_suspicious_access',
      json_build_object(
        'suspicion_score', v_suspicion_score,
        'reasons', v_suspicion_reasons,
        'patterns', v_detected_patterns,
        'user', v_user_name,
        'ip', inet_client_addr()::text,
        'operation', TG_OP,
        'timestamp', NOW()
      )::text
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_catalog_snapshot_access ON campaign_formats;
CREATE TRIGGER trigger_log_catalog_snapshot_access
  AFTER INSERT OR UPDATE OR DELETE ON campaign_formats
  FOR EACH ROW
  EXECUTE FUNCTION log_catalog_snapshot_access();

-- =====================================================
-- READ LOG FUNCTION (FOR SELECT ACCESS)
-- =====================================================
CREATE OR REPLACE FUNCTION log_catalog_snapshot_read(
  p_campaign_format_id UUID,
  p_operation_type TEXT DEFAULT 'SELECT'
)
RETURNS VOID AS $$
DECLARE
  v_row campaign_formats%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM campaign_formats WHERE id = p_campaign_format_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO catalog_snapshot_access_log (
    tenant_id,
    client_id,
    operation_type,
    access_method,
    campaign_format_id,
    campaign_id,
    format_catalog_id,
    snapshot_accessed,
    snapshot_size_bytes,
    snapshot_hash,
    accessed_by,
    accessed_by_username,
    accessed_by_email,
    client_ip,
    user_agent,
    session_id,
    request_id,
    query_text,
    query_hash,
    query_duration_ms,
    application_name,
    database_user,
    database_name,
    connection_pid,
    is_suspicious,
    suspicion_score,
    suspicion_reasons,
    detected_patterns,
    operation_status,
    environment,
    system_version
  ) VALUES (
    v_row.tenant_id,
    v_row.client_id,
    p_operation_type,
    COALESCE(current_setting('app.access_method', true), 'API_ENDPOINT'),
    v_row.id,
    v_row.campaign_id,
    v_row.format_name,
    NULL,
    NULL,
    encode(digest(v_row.catalog_snapshot::text, 'sha256'), 'hex'),
    NULLIF(current_setting('app.current_user_id', true), '')::UUID,
    current_setting('app.current_username', true),
    current_setting('app.current_user_email', true),
    inet_client_addr(),
    current_setting('app.user_agent', true),
    current_setting('app.session_id', true),
    current_setting('app.request_id', true),
    NULL,
    NULL,
    NULL,
    current_setting('application_name', true),
    current_user,
    current_database(),
    pg_backend_pid(),
    FALSE,
    0,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'SUCCESS',
    COALESCE(current_setting('app.environment', true), 'production'),
    current_setting('app.system_version', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- IMMUTABILITY PROTECTION FOR ACCESS LOG
-- =====================================================
CREATE OR REPLACE FUNCTION protect_access_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_immutable = TRUE THEN
      IF NEW.investigation_status IS DISTINCT FROM OLD.investigation_status OR
         NEW.investigated_by IS DISTINCT FROM OLD.investigated_by OR
         NEW.investigation_notes IS DISTINCT FROM OLD.investigation_notes OR
         NEW.investigation_completed_at IS DISTINCT FROM OLD.investigation_completed_at THEN
        RETURN NEW;
      ELSE
        RAISE EXCEPTION 'Access log is immutable';
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Access log cannot be deleted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_access_log ON catalog_snapshot_access_log;
CREATE TRIGGER trigger_protect_access_log
  BEFORE UPDATE OR DELETE ON catalog_snapshot_access_log
  FOR EACH ROW
  EXECUTE FUNCTION protect_access_log_immutability();

-- =====================================================
-- RETENTION / COMPRESSION / ARCHIVE
-- =====================================================
CREATE OR REPLACE FUNCTION compress_old_access_logs()
RETURNS INTEGER AS $$
DECLARE
  v_compressed_count INTEGER := 0;
BEGIN
  UPDATE catalog_snapshot_access_log
  SET
    is_compressed = TRUE,
    compressed_at = NOW(),
    query_text = NULL,
    query_plan = NULL,
    snapshot_accessed = NULL
  WHERE log_timestamp < NOW() - INTERVAL '90 days'
    AND is_compressed = FALSE
    AND is_suspicious = FALSE
    AND investigation_status IS NULL;

  GET DIAGNOSTICS v_compressed_count = ROW_COUNT;
  RETURN v_compressed_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_log_retention()
RETURNS TRIGGER AS $$
BEGIN
  NEW.retention_until := CASE
    WHEN NEW.investigation_status IN ('CONFIRMED_THREAT') THEN
      NEW.log_timestamp::date + INTERVAL '7 years'
    WHEN NEW.is_suspicious = TRUE THEN
      NEW.log_timestamp::date + INTERVAL '5 years'
    ELSE
      NEW.log_timestamp::date + INTERVAL '2 years'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_log_retention ON catalog_snapshot_access_log;
CREATE TRIGGER trigger_set_log_retention
  BEFORE INSERT ON catalog_snapshot_access_log
  FOR EACH ROW
  EXECUTE FUNCTION set_log_retention();

CREATE TABLE IF NOT EXISTS catalog_snapshot_access_log_archive (LIKE catalog_snapshot_access_log INCLUDING ALL);

CREATE OR REPLACE FUNCTION archive_expired_logs()
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER := 0;
BEGIN
  INSERT INTO catalog_snapshot_access_log_archive
  SELECT * FROM catalog_snapshot_access_log
  WHERE retention_until < CURRENT_DATE;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  DELETE FROM catalog_snapshot_access_log
  WHERE retention_until < CURRENT_DATE;

  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STATS VIEW
-- =====================================================
CREATE OR REPLACE VIEW catalog_snapshot_access_stats AS
SELECT
  DATE_TRUNC('day', log_timestamp) as day,
  COUNT(*) as total_accesses,
  COUNT(*) FILTER (WHERE operation_type = 'SELECT') as reads,
  COUNT(*) FILTER (WHERE operation_type = 'UPDATE') as updates,
  COUNT(*) FILTER (WHERE operation_type = 'DELETE') as deletes,
  COUNT(*) FILTER (WHERE is_suspicious = TRUE) as suspicious_accesses,
  AVG(query_duration_ms) as avg_query_duration_ms,
  AVG(snapshot_size_bytes) as avg_snapshot_size_bytes,
  COUNT(DISTINCT accessed_by) as unique_users,
  COUNT(DISTINCT client_ip) as unique_ips
FROM catalog_snapshot_access_log
WHERE log_timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', log_timestamp)
ORDER BY day DESC;
