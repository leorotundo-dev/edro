import { FastifyInstance } from 'fastify';
import { JobService } from '../services/jobService';
import { CronService } from '../services/cronService';

/**
 * Admin Jobs Routes
 * 
 * Endpoints para gerenciar jobs e schedules
 */
export async function jobsAdminRoutes(app: FastifyInstance) {
  
  // ============================================
  // JOBS
  // ============================================

  // Create job
  app.post('/admin/jobs', async (req, reply) => {
    try {
      const body = req.body as any;

      const jobId = await JobService.createJob({
        name: body.name,
        type: body.type,
        data: body.data,
        priority: body.priority,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        maxAttempts: body.maxAttempts,
      });

      return {
        success: true,
        data: { id: jobId },
        message: 'Job criado com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao criar job',
      });
    }
  });

  // Get job status
  app.get('/admin/jobs/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const job = await JobService.getJobStatus(id);

      if (!job) {
        return reply.status(404).send({
          success: false,
          error: 'Job não encontrado',
        });
      }

      return {
        success: true,
        data: job,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar job',
      });
    }
  });

  // Get job stats
  app.get('/admin/jobs/stats', async (req, reply) => {
    try {
      const stats = await JobService.getJobStats();

      return {
        success: true,
        data: stats,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar estatísticas',
      });
    }
  });

  // ============================================
  // SCHEDULES
  // ============================================

  // List schedules
  app.get('/admin/schedules', async (req, reply) => {
    try {
      const query = req.query as any;

      const schedules = await CronService.getSchedules(
        query.enabled === 'true' ? true : query.enabled === 'false' ? false : undefined
      );

      return {
        success: true,
        data: schedules,
        total: schedules.length,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao listar schedules',
      });
    }
  });

  // Get schedule by ID
  app.get('/admin/schedules/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const schedule = await CronService.getScheduleById(id);

      if (!schedule) {
        return reply.status(404).send({
          success: false,
          error: 'Schedule não encontrado',
        });
      }

      // Adicionar descrição legível
      const description = CronService.describeCronExpression(schedule.schedule);

      return {
        success: true,
        data: {
          ...schedule,
          description,
        },
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar schedule',
      });
    }
  });

  // Create schedule
  app.post('/admin/schedules', async (req, reply) => {
    try {
      const body = req.body as any;

      const scheduleId = await CronService.createSchedule({
        name: body.name,
        type: body.type,
        schedule: body.schedule,
        data: body.data,
        enabled: body.enabled,
      });

      return {
        success: true,
        data: { id: scheduleId },
        message: 'Schedule criado com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao criar schedule',
      });
    }
  });

  // Update schedule
  app.put('/admin/schedules/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as any;

      await CronService.updateSchedule(id, body);

      return {
        success: true,
        message: 'Schedule atualizado com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao atualizar schedule',
      });
    }
  });

  // Delete schedule
  app.delete('/admin/schedules/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      await CronService.deleteSchedule(id);

      return {
        success: true,
        message: 'Schedule deletado com sucesso',
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao deletar schedule',
      });
    }
  });

  // Get cron stats
  app.get('/admin/schedules/stats', async (req, reply) => {
    try {
      const stats = await CronService.getCronStats();

      return {
        success: true,
        data: stats,
      };
    } catch (err) {
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar estatísticas',
      });
    }
  });

  // Describe cron expression
  app.post('/admin/schedules/describe', async (req, reply) => {
    try {
      const body = req.body as { expression: string };

      if (!body.expression) {
        return reply.status(400).send({
          success: false,
          error: 'expression é obrigatória',
        });
      }

      const description = CronService.describeCronExpression(body.expression);

      return {
        success: true,
        data: { description },
      };
    } catch (err) {
      return reply.status(400).send({
        success: false,
        error: err instanceof Error ? err.message : 'Expressão cron inválida',
      });
    }
  });
}

export default jobsAdminRoutes;
