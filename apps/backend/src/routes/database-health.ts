import { FastifyInstance } from 'fastify';
import { DatabaseHealthService } from '../services/databaseHealthService';

/**
 * Database Health Routes
 * 
 * Endpoints para monitorar saúde do banco de dados
 */
export async function databaseHealthRoutes(app: FastifyInstance) {
  
  // ============================================
  // HEALTH CHECK
  // ============================================
  
  app.get('/admin/database/health', async (req, reply) => {
    try {
      const health = await DatabaseHealthService.getDatabaseHealth();

      return {
        success: true,
        data: health,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to check database health',
      });
    }
  });

  // ============================================
  // QUERY STATS
  // ============================================
  
  app.get('/admin/database/queries/top', async (req, reply) => {
    try {
      const query = req.query as { limit?: string };
      const limit = query.limit ? parseInt(query.limit) : 10;

      const queries = await DatabaseHealthService.getTopQueries(limit);

      return {
        success: true,
        data: queries,
        total: queries.length,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get query stats',
      });
    }
  });

  // ============================================
  // TABLE STATS
  // ============================================
  
  app.get('/admin/database/tables/stats', async (req, reply) => {
    try {
      const tables = await DatabaseHealthService.getTableStats();

      return {
        success: true,
        data: tables,
        total: tables.length,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get table stats',
      });
    }
  });

  // ============================================
  // UNUSED INDEXES
  // ============================================
  
  app.get('/admin/database/indexes/unused', async (req, reply) => {
    try {
      const indexes = await DatabaseHealthService.getUnusedIndexes();

      return {
        success: true,
        data: indexes,
        total: indexes.length,
        message: indexes.length > 0 
          ? `Found ${indexes.length} unused indexes. Consider removing them to save space.`
          : 'No unused indexes found',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get unused indexes',
      });
    }
  });

  // ============================================
  // MAINTENANCE
  // ============================================
  
  app.post('/admin/database/vacuum', async (req, reply) => {
    try {
      const body = req.body as { table?: string };

      await DatabaseHealthService.runVacuum(body.table);

      return {
        success: true,
        message: body.table 
          ? `VACUUM completed for table: ${body.table}`
          : 'VACUUM completed for all tables',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to run VACUUM',
      });
    }
  });

  app.post('/admin/database/analyze', async (req, reply) => {
    try {
      const body = req.body as { table?: string };

      await DatabaseHealthService.runAnalyze(body.table);

      return {
        success: true,
        message: body.table 
          ? `ANALYZE completed for table: ${body.table}`
          : 'ANALYZE completed for all tables',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to run ANALYZE',
      });
    }
  });

  // ============================================
  // MONITORING CONTROL
  // ============================================
  
  app.post('/admin/database/monitoring/start', async (req, reply) => {
    try {
      const body = req.body as { interval_minutes?: number };
      const intervalMinutes = body.interval_minutes || 15;

      DatabaseHealthService.startHealthMonitoring(intervalMinutes);

      return {
        success: true,
        message: `Database health monitoring started (every ${intervalMinutes}m)`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to start monitoring',
      });
    }
  });

  app.post('/admin/database/monitoring/stop', async (req, reply) => {
    try {
      DatabaseHealthService.stopHealthMonitoring();

      return {
        success: true,
        message: 'Database health monitoring stopped',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to stop monitoring',
      });
    }
  });
}

export default databaseHealthRoutes;
