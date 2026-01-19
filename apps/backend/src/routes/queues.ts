/**
 * Queues Routes
 * Queue management endpoints
 */

import { FastifyInstance } from 'fastify';
import QueueService, { queueNames, QueueName } from '../services/queueService';
import { requireRoles } from '../middleware/rbac';

export async function queuesRoutes(app: FastifyInstance) {
  const requireOps = requireRoles(['ops']);
  app.addHook('preHandler', requireOps);
  
  // ============================================
  // QUEUE STATS
  // ============================================
  
  app.get('/admin/queues/health', async (_req, reply) => {
    try {
      const health = await QueueService.getQueueHealth();

      return {
        success: true,
        data: health,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get queue health',
      });
    }
  });

  app.get('/admin/queues/stats', async (req, reply) => {
    try {
      const stats = await QueueService.getAllQueuesStats();

      return {
        success: true,
        data: stats,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get queue stats',
      });
    }
  });

  app.get('/admin/queues/:queueName/stats', async (req, reply) => {
    try {
      const { queueName } = req.params as { queueName: string };
      
      if (!queueNames.includes(queueName as any)) {
        return reply.status(404).send({
          success: false,
          error: 'Queue not found',
        });
      }

      const stats = await QueueService.getQueueStats(queueName as QueueName);

      return {
        success: true,
        data: stats,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get queue stats',
      });
    }
  });

  // ============================================
  // QUEUE CONTROL
  // ============================================

  app.post('/admin/queues/restart', async (_req, reply) => {
    try {
      await QueueService.restartWorkers('manual');
      return {
        success: true,
        message: 'Queue workers restarted',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to restart workers',
      });
    }
  });

  app.post('/admin/queues/:queueName/pause', async (req, reply) => {
    try {
      const { queueName } = req.params as { queueName: string };
      
      if (!queueNames.includes(queueName as any)) {
        return reply.status(404).send({
          success: false,
          error: 'Queue not found',
        });
      }

      await QueueService.pauseQueue(queueName as QueueName);

      return {
        success: true,
        message: `Queue ${queueName} paused`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to pause queue',
      });
    }
  });

  app.post('/admin/queues/:queueName/resume', async (req, reply) => {
    try {
      const { queueName } = req.params as { queueName: string };
      
      if (!queueNames.includes(queueName as any)) {
        return reply.status(404).send({
          success: false,
          error: 'Queue not found',
        });
      }

      await QueueService.resumeQueue(queueName as QueueName);

      return {
        success: true,
        message: `Queue ${queueName} resumed`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to resume queue',
      });
    }
  });

  app.post('/admin/queues/:queueName/clear', async (req, reply) => {
    try {
      const { queueName } = req.params as { queueName: string };
      
      if (!queueNames.includes(queueName as any)) {
        return reply.status(404).send({
          success: false,
          error: 'Queue not found',
        });
      }

      await QueueService.clearQueue(queueName as QueueName);

      return {
        success: true,
        message: `Queue ${queueName} cleared`,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to clear queue',
      });
    }
  });

  // ============================================
  // ADD JOBS
  // ============================================
  
  app.post('/admin/queues/drops/generate', async (req, reply) => {
    try {
      const body = req.body as {
        disciplineId: string;
        topicCode: string;
        count: number;
      };

      const job = await QueueService.addToQueue('generateDrops', body);
      if (!job) {
        return reply.status(503).send({
          success: false,
          error: 'Queue not available',
        });
      }

      return {
        success: true,
        data: {
          jobId: job.id,
          queue: 'generateDrops',
        },
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add job',
      });
    }
  });

  app.post('/admin/queues/questions/generate', async (req, reply) => {
    try {
      const body = req.body as {
        disciplineId: string;
        topicCode: string;
        count: number;
        difficulty: number;
      };

      const job = await QueueService.addToQueue('generateQuestions', body);
      if (!job) {
        return reply.status(503).send({
          success: false,
          error: 'Queue not available',
        });
      }

      return {
        success: true,
        data: {
          jobId: job.id,
          queue: 'generateQuestions',
        },
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add job',
      });
    }
  });

  app.post('/admin/queues/embeddings/generate', async (req, reply) => {
    try {
      const body = req.body as {
        type: 'drops' | 'questions' | 'rag';
        ids: string[];
      };

      const job = await QueueService.addToQueue('generateEmbeddings', body);
      if (!job) {
        return reply.status(503).send({
          success: false,
          error: 'Queue not available',
        });
      }

      return {
        success: true,
        data: {
          jobId: job.id,
          queue: 'generateEmbeddings',
        },
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add job',
      });
    }
  });
}

export default queuesRoutes;
