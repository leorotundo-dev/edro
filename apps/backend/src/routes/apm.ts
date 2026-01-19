/**
 * APM Routes
 * Application Performance Monitoring endpoints
 */

import { FastifyInstance } from 'fastify';
import APMService from '../services/apmService';
import { requireRoles } from '../middleware/rbac';

const requireOps = requireRoles(['ops']);

export async function apmRoutes(app: FastifyInstance) {
  
  // ============================================
  // TRACES
  // ============================================
  
  app.get('/admin/apm/traces', { preHandler: requireOps }, async (req, reply) => {
    try {
      const query = req.query as { limit?: string };
      const limit = parseInt(query.limit || '100');
      
      const traces = APMService.getTraces(limit);

      return {
        success: true,
        data: traces,
        total: traces.length,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get traces',
      });
    }
  });

  app.get('/admin/apm/traces/:traceId', { preHandler: requireOps }, async (req, reply) => {
    try {
      const { traceId } = req.params as { traceId: string };
      
      const trace = APMService.getTrace(traceId);

      if (!trace) {
        return reply.status(404).send({
          success: false,
          error: 'Trace not found',
        });
      }

      return {
        success: true,
        data: trace,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get trace',
      });
    }
  });

  // ============================================
  // METRICS
  // ============================================
  
  app.get('/admin/apm/metrics', { preHandler: requireOps }, async (req, reply) => {
    try {
      const metrics = APMService.getAPMMetrics();

      return {
        success: true,
        data: metrics,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get APM metrics',
      });
    }
  });

  app.post('/admin/apm/metrics/reset', { preHandler: requireOps }, async (req, reply) => {
    try {
      APMService.resetAPMMetrics();

      return {
        success: true,
        message: 'APM metrics reset successfully',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to reset metrics',
      });
    }
  });

  // ============================================
  // HEALTH SCORE
  // ============================================
  
  app.get('/admin/apm/health-score', { preHandler: requireOps }, async (req, reply) => {
    try {
      const healthScore = APMService.calculateHealthScore();

      return {
        success: true,
        data: healthScore,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to calculate health score',
      });
    }
  });

  // ============================================
  // DASHBOARD
  // ============================================
  
  app.get('/admin/apm/dashboard', { preHandler: requireOps }, async (req, reply) => {
    try {
      const metrics = APMService.getAPMMetrics();
      const healthScore = APMService.calculateHealthScore();
      const recentTraces = APMService.getTraces(10);

      return {
        success: true,
        data: {
          metrics,
          healthScore,
          recentTraces,
          summary: {
            totalRequests: metrics.requests.total,
            successRate: metrics.requests.total > 0
              ? Math.round((metrics.requests.success / metrics.requests.total) * 100)
              : 0,
            avgResponseTime: metrics.requests.avgDuration,
            errorRate: metrics.errors.rate,
            cacheHitRate: metrics.cache.hitRate,
            grade: healthScore.grade,
          },
        },
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get dashboard',
      });
    }
  });
}

export default apmRoutes;
