import { FastifyInstance } from 'fastify';
import { ProgressService } from '../services/progressService';

/**
 * Progress & Mastery Routes
 * 
 * Endpoints:
 * - GET /api/progress/daily              - Progresso do dia
 * - GET /api/progress/weekly             - Progresso da semana
 * - GET /api/progress/monthly            - Progresso do mês
 * - GET /api/progress/history            - Histórico
 * - GET /api/progress/summary            - Resumo geral
 * - GET /api/mastery                     - Todos os subtópicos
 * - GET /api/mastery/:subtopico          - Mastery específico
 * - GET /api/mastery/top                 - Top 10 melhores
 * - GET /api/mastery/weak                - Top 10 fracos
 */
export async function progressRoutes(app: FastifyInstance) {
  
  // ============================================
  // GET /api/progress/daily
  // Progresso do dia
  // ============================================
  app.get('/progress/daily', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { date } = req.query as { date?: string };
      const targetDate = date ? new Date(date) : undefined;

      console.log(`[progress] Buscando progresso diário para ${userId}`);

      let progress = await ProgressService.getDailyProgress(userId, targetDate);

      // Se não existe, calcular
      if (!progress) {
        progress = await ProgressService.calculateDailyProgress(userId, targetDate);
      }

      return {
        success: true,
        data: progress
      };
    } catch (err) {
      console.error('[progress] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar progresso'
      });
    }
  });

  // ============================================
  // GET /api/progress/weekly
  // Progresso da semana
  // ============================================
  app.get('/progress/weekly', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { weekStart } = req.query as { weekStart?: string };
      const targetWeek = weekStart ? new Date(weekStart) : undefined;

      console.log(`[progress] Buscando progresso semanal para ${userId}`);

      let progress = await ProgressService.getWeeklyProgress(userId, targetWeek);

      // Se não existe, calcular
      if (!progress) {
        progress = await ProgressService.calculateWeeklyProgress(userId, targetWeek);
      }

      return {
        success: true,
        data: progress
      };
    } catch (err) {
      console.error('[progress] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar progresso'
      });
    }
  });

  // ============================================
  // GET /api/progress/monthly
  // Progresso do mês
  // ============================================
  app.get('/progress/monthly', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { month } = req.query as { month?: string };
      const targetMonth = month ? new Date(month) : undefined;

      console.log(`[progress] Buscando progresso mensal para ${userId}`);

      let progress = await ProgressService.getMonthlyProgress(userId, targetMonth);

      // Se não existe, calcular
      if (!progress) {
        progress = await ProgressService.calculateMonthlyProgress(userId, targetMonth);
      }

      return {
        success: true,
        data: progress
      };
    } catch (err) {
      console.error('[progress] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar progresso'
      });
    }
  });

  // ============================================
  // GET /api/progress/history
  // Histórico de progresso
  // ============================================
  app.get('/progress/history', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { days } = req.query as { days?: string };
      const parsedDays = days ? parseInt(days) : 30;

      console.log(`[progress] Buscando histórico para ${userId}, ${parsedDays} dias`);

      const history = await ProgressService.getProgressHistory(userId, parsedDays);

      return {
        success: true,
        data: history
      };
    } catch (err) {
      console.error('[progress] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar histórico'
      });
    }
  });

  // ============================================
  // GET /api/progress/summary
  // Resumo geral de progresso
  // ============================================
  app.get('/progress/summary', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[progress] Buscando resumo para ${userId}`);

      const summary = await ProgressService.getProgressSummary(userId);

      return {
        success: true,
        data: summary
      };
    } catch (err) {
      console.error('[progress] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar resumo'
      });
    }
  });

  // ============================================
  // GET /api/mastery
  // Todos os subtópicos
  // ============================================
  app.get('/mastery', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[progress] Buscando mastery para ${userId}`);

      const mastery = await ProgressService.getMastery(userId);

      return {
        success: true,
        data: mastery
      };
    } catch (err) {
      console.error('[progress] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar mastery'
      });
    }
  });

  // ============================================
  // GET /api/mastery/:subtopico
  // Mastery de um subtópico específico
  // ============================================
  app.get('/mastery/:subtopico', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      const { subtopico } = req.params as { subtopico: string };

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[progress] Buscando mastery de ${subtopico} para ${userId}`);

      const mastery = await ProgressService.getMastery(userId, subtopico);

      return {
        success: true,
        data: mastery
      };
    } catch (err) {
      console.error('[progress] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar mastery'
      });
    }
  });

  // ============================================
  // GET /api/mastery/top
  // Top 10 subtópicos com melhor mastery
  // ============================================
  app.get('/mastery/top', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { limit } = req.query as { limit?: string };
      const parsedLimit = limit ? parseInt(limit) : 10;

      console.log(`[progress] Buscando top mastery para ${userId}`);

      const top = await ProgressService.getTopMastery(userId, parsedLimit);

      return {
        success: true,
        data: top
      };
    } catch (err) {
      console.error('[progress] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar top mastery'
      });
    }
  });

  // ============================================
  // GET /api/mastery/weak
  // Top 10 subtópicos com menor mastery
  // ============================================
  app.get('/mastery/weak', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { limit } = req.query as { limit?: string };
      const parsedLimit = limit ? parseInt(limit) : 10;

      console.log(`[progress] Buscando weak mastery para ${userId}`);

      const weak = await ProgressService.getWeakMastery(userId, parsedLimit);

      return {
        success: true,
        data: weak
      };
    } catch (err) {
      console.error('[progress] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar weak mastery'
      });
    }
  });

  // ============================================
  // POST /api/progress/update
  // Atualizar progresso em tempo real
  // ============================================
  app.post('/progress/update', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const body = req.body as any;

      console.log(`[progress] Atualizando progresso para ${userId}`);

      await ProgressService.updateProgressRealtime({
        userId,
        type: body.type,
        correct: body.correct,
        timeSpent: body.timeSpent,
        subtopico: body.subtopico,
      });

      return {
        success: true,
        message: 'Progresso atualizado com sucesso'
      };
    } catch (err) {
      console.error('[progress] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao atualizar progresso'
      });
    }
  });
}

export default progressRoutes;
