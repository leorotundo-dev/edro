import { FastifyInstance } from 'fastify';
import { MonitoringService } from '../middleware/monitoring';
import QueueService from '../services/queueService';
import { requireRoles } from '../middleware/rbac';

/**
 * Monitoring Routes
 * 
 * Endpoints para monitoramento e métricas
 */
export async function monitoringRoutes(app: FastifyInstance) {
  const requireOps = requireRoles(['ops']);
  
  // ============================================
  // HEALTH CHECK (público)
  // ============================================
  
  app.get('/health', async (req, reply) => {
    const health = await MonitoringService.getHealthStatus();
    
    const statusCode = health.status === 'healthy' ? 200 
      : health.status === 'degraded' ? 200 
      : 503;

    return reply.code(statusCode).send({
      status: health.status,
      timestamp: health.timestamp,
      uptime: health.uptime,
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  app.get('/health/detailed', async (req, reply) => {
    const health = await MonitoringService.getHealthStatus();
    return health;
  });

  // ============================================
  // METRICS (admin only)
  // ============================================
  
  app.get('/admin/metrics', { preHandler: requireOps }, async (req, reply) => {
    const requestMetrics = MonitoringService.getRequestMetrics();
    const systemMetrics = MonitoringService.getSystemMetrics();
    const errorStats = MonitoringService.getErrorStats();
    const queues = await QueueService.getAllQueuesStats();
    const iaUsage = MonitoringService.getIaUsage();
    const reccoMetrics = MonitoringService.getReccoMetrics();
    const reccoRecent = MonitoringService.getReccoDecisionHistory(10);
    const simulados = MonitoringService.getSimuladoMetrics();
    const tutor = MonitoringService.getTutorMetrics();

    return {
      success: true,
      data: {
        requests: requestMetrics,
        system: systemMetrics,
        errors: errorStats,
        queues,
        ia_usage: iaUsage,
        recco: reccoMetrics,
        recco_recent: reccoRecent,
        simulados,
        tutor,
      },
    };
  });

  app.get('/admin/metrics/requests', { preHandler: requireOps }, async (req, reply) => {
    const metrics = MonitoringService.getRequestMetrics();
    return {
      success: true,
      data: metrics,
    };
  });

  app.get('/admin/metrics/system', { preHandler: requireOps }, async (req, reply) => {
    const metrics = MonitoringService.getSystemMetrics();
    return {
      success: true,
      data: metrics,
    };
  });

  app.get('/admin/metrics/errors', { preHandler: requireOps }, async (req, reply) => {
    const stats = MonitoringService.getErrorStats();
    const logs = MonitoringService.getErrorLogs(50);

    return {
      success: true,
      data: {
        stats,
        recent_errors: logs,
      },
    };
  });

  // ============================================
  // ALERTS
  // ============================================
  
  app.get('/admin/alerts', { preHandler: requireOps }, async (req, reply) => {
    const query = req.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit) : 100;

    const alerts = MonitoringService.getAlerts(limit);

    return {
      success: true,
      data: alerts,
      total: alerts.length,
    };
  });

  app.post('/admin/alerts/test', { preHandler: requireOps }, async (req, reply) => {
    const body = req.body as { level: 'info' | 'warning' | 'critical'; message: string };

    MonitoringService.triggerAlert(body.level, body.message, {
      test: true,
      triggered_by: 'manual',
    });

    return {
      success: true,
      message: 'Test alert triggered',
    };
  });

  // ============================================
  // LOGS
  // ============================================
  
  app.get('/admin/logs/errors', { preHandler: requireOps }, async (req, reply) => {
    const query = req.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit) : 100;

    const logs = MonitoringService.getErrorLogs(limit);

    return {
      success: true,
      data: logs,
      total: logs.length,
    };
  });

  // ============================================
  // DASHBOARD DATA
  // ============================================
  
  app.get('/admin/dashboard', { preHandler: requireOps }, async (req, reply) => {
    const health = await MonitoringService.getHealthStatus();
    const requestMetrics = MonitoringService.getRequestMetrics();
    const systemMetrics = MonitoringService.getSystemMetrics();
    const errorStats = MonitoringService.getErrorStats();
    const alerts = MonitoringService.getAlerts(10);
    const queues = await QueueService.getAllQueuesStats();
    const iaUsage = MonitoringService.getIaUsage();
    const reccoMetrics = MonitoringService.getReccoMetrics();
    const queueBacklog = queues.reduce((sum, q) => sum + (q?.waiting || 0) + (q?.delayed || 0), 0);
    const tutor = MonitoringService.getTutorMetrics();

    return {
      success: true,
      data: {
        health,
        requests: {
          total: requestMetrics.total,
          last_hour: requestMetrics.last_hour,
          avg_duration: Math.round(requestMetrics.avg_duration),
          slow_requests: requestMetrics.slow_requests,
          errors_5xx: requestMetrics.errors_5xx,
          errors_4xx: requestMetrics.errors_4xx,
        },
        system: systemMetrics,
        errors: {
          total: errorStats.total_errors,
          last_hour: errorStats.last_hour,
        },
        queues: {
          backlog: queueBacklog,
          items: queues,
        },
        recco: reccoMetrics,
        tutor: {
          calls: tutor.calls,
          avg_latency_ms: Math.round(tutor.avg_latency_ms),
          last_latency_ms: tutor.last_latency_ms,
          last_model: tutor.last_model,
          rag_rate: tutor.rag_rate,
          rag_calls: tutor.rag_calls,
        },
        ia_usage: iaUsage,
        recent_alerts: alerts,
      },
    };
  });
}

export default monitoringRoutes;
