import { FastifyInstance } from 'fastify';
import { CacheService } from '../middleware/cache';
import { PerformanceService } from '../middleware/performance';

/**
 * Performance Routes
 * 
 * Endpoints para gerenciar performance e cache
 */
export async function performanceRoutes(app: FastifyInstance) {
  
  // ============================================
  // CACHE MANAGEMENT
  // ============================================
  
  app.get('/admin/performance/cache/stats', async (req, reply) => {
    try {
      const stats = CacheService.getCacheStats();

      return {
        success: true,
        data: stats,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get cache stats',
      });
    }
  });

  app.post('/admin/performance/cache/clear', async (req, reply) => {
    try {
      const body = req.body as { pattern?: string };

      CacheService.clearCache(body.pattern);

      return {
        success: true,
        message: body.pattern 
          ? `Cache cleared for pattern: ${body.pattern}`
          : 'All cache cleared',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to clear cache',
      });
    }
  });

  // ============================================
  // PERFORMANCE METRICS
  // ============================================
  
  app.get('/admin/performance/metrics', async (req, reply) => {
    try {
      const metrics = PerformanceService.getPerformanceMetrics();

      return {
        success: true,
        data: metrics,
        total: metrics.length,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get performance metrics',
      });
    }
  });

  app.get('/admin/performance/pool', async (req, reply) => {
    try {
      const stats = await PerformanceService.getPoolStats();

      return {
        success: true,
        data: stats,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get pool stats',
      });
    }
  });

  // ============================================
  // OPTIMIZATION SUGGESTIONS
  // ============================================
  
  app.get('/admin/performance/suggestions', async (req, reply) => {
    try {
      const metrics = PerformanceService.getPerformanceMetrics();
      const cacheStats = CacheService.getCacheStats();
      const suggestions: string[] = [];

      // Analisar métricas e gerar sugestões
      const slowEndpoints = metrics.filter(m => m.avgTime > 1000);
      if (slowEndpoints.length > 0) {
        suggestions.push(
          `${slowEndpoints.length} endpoints lentos detectados (> 1s). ` +
          `Considere adicionar índices ou otimizar queries.`
        );
      }

      if (cacheStats.size === cacheStats.maxSize) {
        suggestions.push(
          'Cache está no limite máximo. Considere aumentar MAX_CACHE_SIZE.'
        );
      }

      if (cacheStats.hitRate < 50) {
        suggestions.push(
          'Taxa de cache hit está baixa (< 50%). Considere aumentar TTL.'
        );
      }

      if (suggestions.length === 0) {
        suggestions.push('Performance está ótima! Nenhuma sugestão no momento.');
      }

      return {
        success: true,
        data: {
          suggestions,
          slow_endpoints: slowEndpoints.slice(0, 5),
          cache_stats: cacheStats,
        },
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to generate suggestions',
      });
    }
  });

  // ============================================
  // BENCHMARK
  // ============================================
  
  app.post('/admin/performance/benchmark', async (req, reply) => {
    try {
      const body = req.body as { 
        endpoint: string;
        iterations?: number;
      };

      const iterations = body.iterations || 100;
      const times: number[] = [];

      console.log(`[performance] Running benchmark for ${body.endpoint} (${iterations}x)...`);

      // TODO: Implementar benchmark real
      // Por ora, retorna dados simulados
      for (let i = 0; i < iterations; i++) {
        times.push(Math.random() * 100 + 50); // 50-150ms
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const p50 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.5)];
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
      const p99 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)];

      return {
        success: true,
        data: {
          endpoint: body.endpoint,
          iterations,
          avg: Math.round(avg),
          min: Math.round(min),
          max: Math.round(max),
          p50: Math.round(p50),
          p95: Math.round(p95),
          p99: Math.round(p99),
        },
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to run benchmark',
      });
    }
  });
}

export default performanceRoutes;
