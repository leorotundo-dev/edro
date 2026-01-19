/**
 * Query Optimizer Service
 * 
 * Otimização e análise de queries do banco de dados
 */

import { query } from '../db';

// ============================================
// QUERY ANALYSIS
// ============================================

export interface QueryPlan {
  query: string;
  planText: string;
  estimatedCost: number;
  actualCost?: number;
  recommendations: string[];
}

/**
 * Analisa plano de execução de uma query
 */
export async function analyzeQueryPlan(sql: string, params?: any[]): Promise<QueryPlan> {
  console.log('[query-optimizer] Analyzing query plan...');

  try {
    // EXPLAIN
    const explainQuery = `EXPLAIN ${sql}`;
    const { rows: explainRows } = await query(explainQuery, params);
    const planText = explainRows.map(r => r['QUERY PLAN']).join('\n');

    // EXPLAIN ANALYZE (executa a query)
    const analyzeQuery = `EXPLAIN ANALYZE ${sql}`;
    const { rows: analyzeRows } = await query(analyzeQuery, params);
    const analyzePlan = analyzeRows.map(r => r['QUERY PLAN']).join('\n');

    // Extrair custos
    const costMatch = planText.match(/cost=(\d+\.\d+)\.\.(\d+\.\d+)/);
    const estimatedCost = costMatch ? parseFloat(costMatch[2]) : 0;

    const actualCostMatch = analyzePlan.match(/actual time=(\d+\.\d+)\.\.(\d+\.\d+)/);
    const actualCost = actualCostMatch ? parseFloat(actualCostMatch[2]) : undefined;

    // Gerar recomendações
    const recommendations = generateRecommendations(planText);

    return {
      query: sql,
      planText,
      estimatedCost,
      actualCost,
      recommendations,
    };
  } catch (err) {
    console.error('[query-optimizer] Error analyzing query:', err);
    throw err;
  }
}

/**
 * Gera recomendações baseado no plano
 */
function generateRecommendations(plan: string): string[] {
  const recommendations: string[] = [];

  if (plan.includes('Seq Scan')) {
    recommendations.push('Sequential scan detected. Consider adding an index.');
  }

  if (plan.includes('rows=')) {
    const rowsMatch = plan.match(/rows=(\d+)/);
    if (rowsMatch && parseInt(rowsMatch[1]) > 10000) {
      recommendations.push('Large row count. Consider adding WHERE clause or LIMIT.');
    }
  }

  if (plan.includes('Sort')) {
    recommendations.push('Sort operation detected. Consider adding index on sort columns.');
  }

  if (plan.includes('Nested Loop')) {
    recommendations.push('Nested loop join detected. May be slow for large datasets.');
  }

  if (plan.includes('Hash Join') && plan.includes('rows=')) {
    recommendations.push('Hash join detected. Ensure sufficient work_mem is configured.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Query plan looks optimal.');
  }

  return recommendations;
}

// ============================================
// INDEX SUGGESTIONS
// ============================================

export interface IndexSuggestion {
  table: string;
  columns: string[];
  reason: string;
  estimatedBenefit: 'high' | 'medium' | 'low';
  createStatement: string;
}

/**
 * Sugere índices baseado em queries lentas
 */
export async function suggestIndexes(): Promise<IndexSuggestion[]> {
  console.log('[query-optimizer] Analyzing slow queries for index suggestions...');

  const suggestions: IndexSuggestion[] = [];

  try {
    // Buscar queries lentas (requer pg_stat_statements)
    const { rows } = await query(`
      SELECT
        query,
        calls,
        mean_exec_time
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
        AND query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `);

    for (const row of rows) {
      const sql = row.query;

      // Detectar WHERE clauses sem índice
      const whereMatch = sql.match(/WHERE\s+(\w+)\s*=/i);
      if (whereMatch) {
        const column = whereMatch[1];
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        
        if (tableMatch) {
          const table = tableMatch[1];

          suggestions.push({
            table,
            columns: [column],
            reason: `Frequently used in WHERE clause (avg: ${row.mean_exec_time.toFixed(2)}ms)`,
            estimatedBenefit: row.mean_exec_time > 500 ? 'high' : 'medium',
            createStatement: `CREATE INDEX idx_${table}_${column} ON ${table}(${column});`,
          });
        }
      }

      // Detectar ORDER BY sem índice
      const orderMatch = sql.match(/ORDER BY\s+(\w+)/i);
      if (orderMatch) {
        const column = orderMatch[1];
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        
        if (tableMatch) {
          const table = tableMatch[1];

          suggestions.push({
            table,
            columns: [column],
            reason: `Used in ORDER BY (avg: ${row.mean_exec_time.toFixed(2)}ms)`,
            estimatedBenefit: 'medium',
            createStatement: `CREATE INDEX idx_${table}_${column} ON ${table}(${column});`,
          });
        }
      }
    }

    // Remover duplicatas
    const unique = suggestions.filter((s, i, arr) => 
      arr.findIndex(t => t.createStatement === s.createStatement) === i
    );

    return unique;
  } catch (err) {
    console.warn('[query-optimizer] Could not generate index suggestions:', err);
    return [];
  }
}

// ============================================
// QUERY REWRITE
// ============================================

/**
 * Reescreve query para melhor performance
 */
export function rewriteQuery(sql: string): {
  original: string;
  rewritten: string;
  changes: string[];
} {
  let rewritten = sql;
  const changes: string[] = [];

  // 1. Substituir SELECT * por campos específicos
  if (rewritten.includes('SELECT *')) {
    changes.push('Replace SELECT * with specific columns');
    // Note: Não podemos fazer isso automaticamente sem conhecer a estrutura
  }

  // 2. Adicionar LIMIT se não existe
  if (!rewritten.toUpperCase().includes('LIMIT') && 
      rewritten.toUpperCase().includes('SELECT')) {
    rewritten += ' LIMIT 1000';
    changes.push('Added LIMIT 1000 to prevent full table scan');
  }

  // 3. Usar EXISTS ao invés de IN com subquery
  const inPattern = /WHERE\s+(\w+)\s+IN\s+\(SELECT/gi;
  if (inPattern.test(rewritten)) {
    changes.push('Consider using EXISTS instead of IN with subquery');
  }

  // 4. Evitar funções em WHERE
  if (/WHERE\s+\w+\(/i.test(rewritten)) {
    changes.push('Avoid using functions in WHERE clause (prevents index usage)');
  }

  // 5. Usar JOIN ao invés de subquery em FROM
  if (/FROM\s+\(SELECT/i.test(rewritten)) {
    changes.push('Consider using JOIN instead of subquery in FROM clause');
  }

  return {
    original: sql,
    rewritten,
    changes,
  };
}

// ============================================
// BATCH OPTIMIZATION
// ============================================

/**
 * Otimiza múltiplos INSERTs em batch
 */
export function optimizeBatchInsert(
  table: string,
  columns: string[],
  rows: any[][]
): string {
  if (rows.length === 0) return '';

  // Gerar INSERT em lote
  const columnsStr = columns.join(', ');
  const valuesStr = rows
    .map((row, i) => {
      const placeholders = row.map((_, j) => `$${i * row.length + j + 1}`).join(', ');
      return `(${placeholders})`;
    })
    .join(', ');

  return `INSERT INTO ${table} (${columnsStr}) VALUES ${valuesStr}`;
}

// ============================================
// QUERY CACHE
// ============================================

interface CachedQuery {
  plan: QueryPlan;
  timestamp: number;
}

const queryCache = new Map<string, CachedQuery>();

/**
 * Cache de planos de query
 */
export function getCachedQueryPlan(sql: string): QueryPlan | null {
  const cached = queryCache.get(sql);
  
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hora
    return cached.plan;
  }

  return null;
}

export function cacheQueryPlan(sql: string, plan: QueryPlan) {
  queryCache.set(sql, {
    plan,
    timestamp: Date.now(),
  });
}

// ============================================
// OPTIMIZATION REPORT
// ============================================

export async function generateOptimizationReport(): Promise<{
  slowQueries: number;
  indexSuggestions: IndexSuggestion[];
  unusedIndexes: Array<{ table: string; index: string; size_mb: number }>;
  recommendations: string[];
}> {
  console.log('[query-optimizer] Generating optimization report...');

  try {
    // 1. Queries lentas
    const { rows: slowQueries } = await query(`
      SELECT COUNT(*) as count
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
    `).catch(() => ({ rows: [{ count: 0 }] }));

    // 2. Sugestões de índices
    const indexSuggestions = await suggestIndexes();

    // 3. Índices não usados
    const { rows: unusedIndexes } = await query(`
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

    // 4. Recomendações gerais
    const recommendations: string[] = [];

    if (parseInt(slowQueries[0].count) > 10) {
      recommendations.push(`${slowQueries[0].count} slow queries detected. Review query performance.`);
    }

    if (indexSuggestions.length > 0) {
      recommendations.push(`${indexSuggestions.length} index suggestions available.`);
    }

    if (unusedIndexes.length > 0) {
      const totalSize = unusedIndexes.reduce((sum, idx) => sum + parseFloat(idx.size_mb), 0);
      recommendations.push(`${unusedIndexes.length} unused indexes (${totalSize.toFixed(2)} MB). Consider removing.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Database performance looks good!');
    }

    return {
      slowQueries: parseInt(slowQueries[0].count),
      indexSuggestions,
      unusedIndexes,
      recommendations,
    };
  } catch (err) {
    console.error('[query-optimizer] Error generating report:', err);
    throw err;
  }
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const QueryOptimizer = {
  analyzeQueryPlan,
  suggestIndexes,
  rewriteQuery,
  optimizeBatchInsert,
  getCachedQueryPlan,
  cacheQueryPlan,
  generateOptimizationReport,
};

export default QueryOptimizer;
