/**
 * Database Health Service
 * 
 * Monitoramento de saúde do banco de dados
 */

import { query } from '../db';

// ============================================
// TIPOS
// ============================================

export interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'critical';
  size_mb: number;
  tables_count: number;
  active_connections: number;
  max_connections: number;
  connection_usage_percent: number;
  cache_hit_ratio: number;
  slow_queries: number;
  locks: number;
  last_vacuum: Date | null;
  recommendations: string[];
}

export interface QueryStats {
  query: string;
  calls: number;
  total_time_ms: number;
  avg_time_ms: number;
  rows: number;
}

export interface TableStats {
  table_name: string;
  row_count: number;
  size_mb: number;
  index_size_mb: number;
  last_vacuum: Date | null;
  last_analyze: Date | null;
}

// ============================================
// HEALTH CHECK
// ============================================

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  console.log('[db-health] Checking database health...');

  try {
    // 1. Database size
    const { rows: sizeRows } = await query(`
      SELECT pg_database_size(current_database()) as size_bytes
    `);
    const sizeBytes = parseInt(sizeRows[0].size_bytes);
    const sizeMb = sizeBytes / 1024 / 1024;

    // 2. Tables count
    const { rows: tableRows } = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tablesCount = parseInt(tableRows[0].count);

    // 3. Connections
    const { rows: connRows } = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE state = 'active') as active,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_conn
      FROM pg_stat_activity
    `);
    const activeConnections = parseInt(connRows[0].active);
    const maxConnections = parseInt(connRows[0].max_conn);
    const connectionUsagePercent = (activeConnections / maxConnections) * 100;

    // 4. Cache hit ratio
    const { rows: cacheRows } = await query(`
      SELECT 
        ROUND(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2) as ratio
      FROM pg_stat_database
      WHERE datname = current_database()
    `);
    const cacheHitRatio = parseFloat(cacheRows[0].ratio || '0');

    // 5. Slow queries (queries > 1s)
    const { rows: slowRows } = await query(`
      SELECT COUNT(*) as count
      FROM pg_stat_activity
      WHERE state = 'active'
        AND query_start < NOW() - INTERVAL '1 second'
        AND query NOT LIKE '%pg_stat_activity%'
    `);
    const slowQueries = parseInt(slowRows[0].count || '0');

    // 6. Locks
    const { rows: lockRows } = await query(`
      SELECT COUNT(*) as count
      FROM pg_locks
      WHERE NOT granted
    `);
    const locks = parseInt(lockRows[0].count || '0');

    // 7. Last vacuum
    const { rows: vacuumRows } = await query(`
      SELECT MAX(last_autovacuum) as last_vacuum
      FROM pg_stat_user_tables
    `);
    const lastVacuum = vacuumRows[0].last_vacuum;

    // Determinar status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (connectionUsagePercent > 90) {
      status = 'critical';
      recommendations.push('Connection usage is very high (> 90%)');
    } else if (connectionUsagePercent > 70) {
      status = 'warning';
      recommendations.push('Connection usage is high (> 70%)');
    }

    if (cacheHitRatio < 90) {
      if (status === 'healthy') status = 'warning';
      recommendations.push('Cache hit ratio is low (< 90%). Consider increasing shared_buffers.');
    }

    if (slowQueries > 10) {
      if (status === 'healthy') status = 'warning';
      recommendations.push(`${slowQueries} slow queries detected. Review query performance.`);
    }

    if (locks > 5) {
      status = 'critical';
      recommendations.push(`${locks} blocking locks detected. Check for long-running transactions.`);
    }

    if (sizeMb > 10000) {
      // > 10GB
      if (status === 'healthy') status = 'warning';
      recommendations.push('Database size is large (> 10GB). Consider archiving old data.');
    }

    if (recommendations.length === 0) {
      recommendations.push('All metrics are healthy');
    }

    return {
      status,
      size_mb: sizeMb,
      tables_count: tablesCount,
      active_connections: activeConnections,
      max_connections: maxConnections,
      connection_usage_percent: connectionUsagePercent,
      cache_hit_ratio: cacheHitRatio,
      slow_queries: slowQueries,
      locks,
      last_vacuum: lastVacuum,
      recommendations,
    };
  } catch (err) {
    console.error('[db-health] Error checking health:', err);
    throw err;
  }
}

// ============================================
// QUERY STATS
// ============================================

export async function getTopQueries(limit: number = 10): Promise<QueryStats[]> {
  try {
    const { rows } = await query(`
      SELECT
        query,
        calls,
        ROUND(total_exec_time::numeric, 2) as total_time_ms,
        ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
        rows
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_exec_time DESC
      LIMIT $1
    `, [limit]);

    return rows.map(row => ({
      query: row.query,
      calls: parseInt(row.calls),
      total_time_ms: parseFloat(row.total_time_ms),
      avg_time_ms: parseFloat(row.avg_time_ms),
      rows: parseInt(row.rows),
    }));
  } catch (err) {
    // pg_stat_statements may not be enabled
    console.warn('[db-health] pg_stat_statements not available');
    return [];
  }
}

// ============================================
// TABLE STATS
// ============================================

export async function getTableStats(): Promise<TableStats[]> {
  try {
    const { rows } = await query(`
      SELECT
        schemaname || '.' || tablename as table_name,
        n_live_tup as row_count,
        ROUND(pg_total_relation_size(schemaname || '.' || tablename) / 1024.0 / 1024.0, 2) as size_mb,
        ROUND(pg_indexes_size(schemaname || '.' || tablename) / 1024.0 / 1024.0, 2) as index_size_mb,
        last_vacuum,
        last_analyze
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
      LIMIT 20
    `);

    return rows.map(row => ({
      table_name: row.table_name,
      row_count: parseInt(row.row_count || '0'),
      size_mb: parseFloat(row.size_mb || '0'),
      index_size_mb: parseFloat(row.index_size_mb || '0'),
      last_vacuum: row.last_vacuum,
      last_analyze: row.last_analyze,
    }));
  } catch (err) {
    console.error('[db-health] Error getting table stats:', err);
    return [];
  }
}

// ============================================
// INDEX USAGE
// ============================================

export async function getUnusedIndexes(): Promise<Array<{
  table: string;
  index: string;
  size_mb: number;
}>> {
  try {
    const { rows } = await query(`
      SELECT
        schemaname || '.' || tablename as table,
        indexrelname as index,
        ROUND(pg_relation_size(indexrelid) / 1024.0 / 1024.0, 2) as size_mb
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 10
    `);

    return rows.map(row => ({
      table: row.table,
      index: row.index,
      size_mb: parseFloat(row.size_mb),
    }));
  } catch (err) {
    console.error('[db-health] Error getting unused indexes:', err);
    return [];
  }
}

// ============================================
// MAINTENANCE
// ============================================

export async function runVacuum(tableName?: string): Promise<void> {
  console.log('[db-health] Running VACUUM...');

  try {
    if (tableName) {
      await query(`VACUUM ANALYZE ${tableName}`);
    } else {
      await query(`VACUUM ANALYZE`);
    }

    console.log('[db-health] ✅ VACUUM completed');
  } catch (err) {
    console.error('[db-health] Error running VACUUM:', err);
    throw err;
  }
}

export async function runAnalyze(tableName?: string): Promise<void> {
  console.log('[db-health] Running ANALYZE...');

  try {
    if (tableName) {
      await query(`ANALYZE ${tableName}`);
    } else {
      await query(`ANALYZE`);
    }

    console.log('[db-health] ✅ ANALYZE completed');
  } catch (err) {
    console.error('[db-health] Error running ANALYZE:', err);
    throw err;
  }
}

// ============================================
// MONITORING
// ============================================

export async function recordHealthMetrics(): Promise<void> {
  try {
    await query(`SELECT record_db_health_metrics()`);
    console.log('[db-health] Health metrics recorded');
  } catch (err) {
    console.error('[db-health] Error recording metrics:', err);
  }
}

let healthMonitorInterval: NodeJS.Timeout | null = null;

export function startHealthMonitoring(intervalMinutes: number = 15) {
  if (healthMonitorInterval) return;

  console.log(`[db-health] 📊 Starting health monitoring (every ${intervalMinutes}m)`);

  const intervalMs = intervalMinutes * 60 * 1000;

  healthMonitorInterval = setInterval(async () => {
    try {
      await recordHealthMetrics();

      const health = await getDatabaseHealth();

      if (health.status === 'critical') {
        console.error('[db-health] ⚠️  Database health is CRITICAL!');
        console.error('[db-health] Recommendations:', health.recommendations);
      } else if (health.status === 'warning') {
        console.warn('[db-health] ⚠️  Database health is WARNING');
        console.warn('[db-health] Recommendations:', health.recommendations);
      }
    } catch (err) {
      console.error('[db-health] Error in health monitoring:', err);
    }
  }, intervalMs);
}

export function stopHealthMonitoring() {
  if (healthMonitorInterval) {
    clearInterval(healthMonitorInterval);
    healthMonitorInterval = null;
    console.log('[db-health] Health monitoring stopped');
  }
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const DatabaseHealthService = {
  getDatabaseHealth,
  getTopQueries,
  getTableStats,
  getUnusedIndexes,
  runVacuum,
  runAnalyze,
  recordHealthMetrics,
  startHealthMonitoring,
  stopHealthMonitoring,
};

export default DatabaseHealthService;
