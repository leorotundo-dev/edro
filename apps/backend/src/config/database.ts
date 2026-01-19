/**
 * Database Configuration
 * 
 * Configurações otimizadas para performance
 */

import { Pool, PoolConfig } from 'pg';

// ============================================
// POOL CONFIGURATION
// ============================================

export const getDatabasePoolConfig = (): PoolConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // Connection string
    connectionString: process.env.DATABASE_URL,
    
    // SSL configuration
    ssl: isProduction ? {
      rejectUnauthorized: false
    } : undefined,
    
    // Pool size configuration
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Máximo de conexões
    min: parseInt(process.env.DB_POOL_MIN || '5'),  // Mínimo de conexões
    
    // Connection timeouts
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'), // 10s
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),         // 30s
    
    // Statement timeout (previne queries travadas)
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '60000'),    // 60s
    
    // Query timeout
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),            // 30s
    
    // Application name (útil para debugging)
    application_name: 'edro-backend',
    
    // Keep alive
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
};

// ============================================
// POOL CREATION
// ============================================

let pool: Pool | null = null;

export function createDatabasePool(): Pool {
  if (pool) {
    return pool;
  }

  const config = getDatabasePoolConfig();
  pool = new Pool(config);

  // Event handlers
  pool.on('connect', (client) => {
    console.log('[db] New client connected');
  });

  pool.on('acquire', (client) => {
    // console.log('[db] Client acquired from pool');
  });

  pool.on('remove', (client) => {
    console.log('[db] Client removed from pool');
  });

  pool.on('error', (err, client) => {
    console.error('[db] Unexpected pool error:', err);
  });

  console.log('[db] ✅ Database pool created');
  console.log(`[db] Pool config: max=${config.max}, min=${config.min}`);

  return pool;
}

export function getDatabasePool(): Pool {
  if (!pool) {
    return createDatabasePool();
  }
  return pool;
}

// ============================================
// POOL STATS
// ============================================

export interface PoolStats {
  total: number;
  idle: number;
  waiting: number;
}

export function getPoolStats(): PoolStats {
  if (!pool) {
    return { total: 0, idle: 0, waiting: 0 };
  }

  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    console.log('[db] Closing database pool...');
    await pool.end();
    pool = null;
    console.log('[db] ✅ Database pool closed');
  }
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const pool = getDatabasePool();
    const result = await pool.query('SELECT 1');
    return result.rows.length > 0;
  } catch (err) {
    console.error('[db] Health check failed:', err);
    return false;
  }
}

// ============================================
// QUERY WRAPPER COM TIMEOUT
// ============================================

export async function queryWithTimeout<T = any>(
  text: string,
  params?: any[],
  timeoutMs: number = 30000
): Promise<{ rows: T[] }> {
  const pool = getDatabasePool();
  
  return Promise.race([
    pool.query<T>(text, params),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

// ============================================
// TRANSACTION HELPER
// ============================================

export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = getDatabasePool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const DatabaseConfig = {
  getDatabasePoolConfig,
  createDatabasePool,
  getDatabasePool,
  getPoolStats,
  closeDatabasePool,
  checkDatabaseConnection,
  queryWithTimeout,
  withTransaction,
};

export default DatabaseConfig;
