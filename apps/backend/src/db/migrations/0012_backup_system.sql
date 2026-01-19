-- 0012_backup_system.sql
-- Sistema de Backup e Recovery

-- =====================================================
-- 1. BACKUP METADATA
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_metadata (
  id VARCHAR(100) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL,
  tables_count INTEGER NOT NULL,
  rows_count BIGINT NOT NULL,
  duration_ms INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed'
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_metadata_created ON backup_metadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_metadata_status ON backup_metadata(status);

-- =====================================================
-- 2. RESTORE HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS restore_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_id VARCHAR(100) REFERENCES backup_metadata(id),
  filename VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed'
  error TEXT,
  restored_by VARCHAR(100),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restore_history_created ON restore_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restore_history_backup ON restore_history(backup_id);

-- =====================================================
-- 3. BACKUP SCHEDULE CONFIG
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  interval_hours INTEGER NOT NULL,
  retention_days INTEGER DEFAULT 30,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir schedule padrão
INSERT INTO backup_schedule (name, enabled, interval_hours, retention_days, next_run)
VALUES ('Daily Backup', true, 24, 30, NOW() + INTERVAL '24 hours')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 4. DATABASE HEALTH METRICS
-- =====================================================
CREATE TABLE IF NOT EXISTS db_health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  database_size_mb NUMERIC(10,2),
  total_tables INTEGER,
  total_rows BIGINT,
  active_connections INTEGER,
  slow_queries INTEGER,
  cache_hit_ratio NUMERIC(5,2),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_db_health_timestamp ON db_health_metrics(timestamp DESC);

-- =====================================================
-- 5. VIEWS ÚTEIS
-- =====================================================

-- View de backups recentes
CREATE OR REPLACE VIEW recent_backups AS
SELECT 
  id,
  filename,
  ROUND(size_bytes / 1024.0 / 1024.0, 2) as size_mb,
  tables_count,
  rows_count,
  duration_ms,
  status,
  created_at,
  AGE(NOW(), created_at) as age
FROM backup_metadata
ORDER BY created_at DESC
LIMIT 50;

-- View de saúde do banco
CREATE OR REPLACE VIEW db_health_summary AS
SELECT
  database_size_mb,
  total_tables,
  total_rows,
  active_connections,
  cache_hit_ratio,
  timestamp
FROM db_health_metrics
ORDER BY timestamp DESC
LIMIT 1;

-- =====================================================
-- 6. FUNÇÃO PARA REGISTRAR MÉTRICAS
-- =====================================================
CREATE OR REPLACE FUNCTION record_db_health_metrics()
RETURNS void AS $$
BEGIN
  INSERT INTO db_health_metrics (
    database_size_mb,
    total_tables,
    total_rows,
    active_connections,
    cache_hit_ratio
  )
  SELECT
    pg_database_size(current_database()) / 1024.0 / 1024.0,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
    0, -- rows count (too expensive to calculate)
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'),
    (SELECT ROUND(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2)
     FROM pg_stat_database WHERE datname = current_database())
  ;
END;
$$ LANGUAGE plpgsql;
