/**
 * Database Connection Pool
 * 
 * Pool otimizado de conexões com o banco de dados
 */

import { Pool, PoolConfig } from 'pg';

// ============================================
// CONFIGURAÇÃO
// ============================================

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  
  // Pool settings
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Máximo de conexões
  min: parseInt(process.env.DB_POOL_MIN || '5'),  // Mínimo de conexões
  
  // Timeouts
  connectionTimeoutMillis: 10000,  // 10s para obter conexão
  idleTimeoutMillis: 30000,        // 30s idle antes de fechar
  
  // Keep alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  
  // Statement timeout (prevenir queries travadas)
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'), // 30s
  
  // Query timeout
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 30s
  
  // Allow exit on idle
  allowExitOnIdle: false,
};

// ============================================
// CRIAR POOL
// ============================================

export const pool = new Pool(poolConfig);

// Event listeners
pool.on('connect', (client) => {
  console.log('[db-pool] New client connected');
});

pool.on('acquire', (client) => {
  console.log('[db-pool] Client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('[db-pool] Client removed from pool');
});

pool.on('error', (err, client) => {
  console.error('[db-pool] Unexpected error on idle client:', err);
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Executa query com métricas
 */
export async function queryWithMetrics<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number; duration: number }> {
  const start = Date.now();
  
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Log queries lentas
    if (duration > 1000) {
      console.warn(`[db-pool] ⚠️  Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      duration,
    };
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`[db-pool] Query error (${duration}ms):`, err);
    throw err;
  }
}

/**
 * Transação com retry
 */
export async function transaction<T>(
  callback: (client: any) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      
      client.release();
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      client.release();

      lastError = err as Error;

      // Retry em caso de deadlock ou serialization failure
      if (
        err instanceof Error &&
        (err.message.includes('deadlock') || 
         err.message.includes('serialization'))
      ) {
        console.warn(`[db-pool] Transaction failed (attempt ${attempt}/${maxRetries}), retrying...`);
        
        // Backoff exponencial
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
        continue;
      }

      // Outro erro, não tentar novamente
      throw err;
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}

/**
 * Batch insert otimizado
 */
export async function batchInsert(
  tableName: string,
  columns: string[],
  values: any[][],
  batchSize: number = 1000
): Promise<number> {
  let insertedCount = 0;

  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    
    // Construir query
    const placeholders: string[] = [];
    const flatValues: any[] = [];
    let paramIndex = 1;

    batch.forEach((row) => {
      const rowPlaceholders = columns.map(() => `$${paramIndex++}`);
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
      flatValues.push(...row);
    });

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
    `;

    const result = await pool.query(query, flatValues);
    insertedCount += result.rowCount || 0;
  }

  return insertedCount;
}

// ============================================
// ESTATÍSTICAS
// ============================================

export interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  maxConnections: number;
  minConnections: number;
}

export function getPoolStats(): PoolStats {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    activeConnections: pool.totalCount - pool.idleCount,
    waitingClients: pool.waitingCount,
    maxConnections: poolConfig.max || 20,
    minConnections: poolConfig.min || 5,
  };
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkPoolHealth(): Promise<{
  healthy: boolean;
  stats: PoolStats;
  testQuery: boolean;
}> {
  const stats = getPoolStats();

  // Verificar se pool não está saturado
  const utilizationPercent = (stats.activeConnections / stats.maxConnections) * 100;
  const healthy = utilizationPercent < 90 && stats.waitingClients === 0;

  // Testar conexão
  let testQuery = false;
  try {
    await pool.query('SELECT 1');
    testQuery = true;
  } catch (err) {
    console.error('[db-pool] Health check query failed:', err);
  }

  return {
    healthy: healthy && testQuery,
    stats,
    testQuery,
  };
}

// ============================================
// CLEANUP
// ============================================

export async function closePool(): Promise<void> {
  console.log('[db-pool] Closing connection pool...');
  await pool.end();
  console.log('[db-pool] ✅ Pool closed');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

// ============================================
// EXPORTAÇÃO
// ============================================

export default pool;
