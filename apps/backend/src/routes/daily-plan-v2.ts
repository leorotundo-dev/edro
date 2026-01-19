import { FastifyInstance } from 'fastify';
import { DailyPlanService } from '../services/plan/dailyPlanService';
import { GamificationService } from '../services/gamificationService';

/**
 * Rotas de Daily Plan - V2 Completo
 * 
 * Endpoints:
 * - POST /api/plan/generate     - Gerar plano do dia
 * - GET  /api/plan/today        - Buscar plano de hoje
 * - POST /api/plan/item/start   - Iniciar item
 * - POST /api/plan/item/complete - Completar item
 * - POST /api/plan/item/skip    - Pular item
 * - POST /api/plan/adjust       - Ajustar plano
 * - GET  /api/plan/stats        - Estatísticas
 * - GET  /api/plan/history      - Histórico
 */
export async function dailyPlanRoutesV2(app: FastifyInstance) {
  
  // ============================================
  // POST /api/plan/generate
  // Gerar plano do dia
  // ============================================
  app.post('/plan/generate', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const body = req.body as any;

      console.log(`[daily-plan] Gerando plano para userId=${userId}`);

      const plan = await DailyPlanService.generateDailyPlan({
        userId,
        date: body.date ? new Date(body.date) : undefined,
        tempoDisponivel: body.tempoDisponivel || 60,
        blueprintId: body.blueprintId,
        diasAteProva: body.diasAteProva,
        bancaPreferencial: body.bancaPreferencial,
        forceTopics: body.forceTopics,
      });

      return {
        success: true,
        data: plan,
        message: `Plano gerado com ${plan.total_items} itens e ${plan.total_duration_minutes} minutos`
      };
    } catch (err) {
      console.error('[daily-plan] Erro ao gerar plano:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao gerar plano'
      });
    }
  });

  // ============================================
  // GET /api/plan/today
  // Buscar plano de hoje
  // ============================================
  app.get('/plan/today', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[daily-plan] Buscando plano de hoje para userId=${userId}`);

      const plan = await DailyPlanService.getTodayPlan(userId);

      if (!plan) {
        return {
          success: true,
          data: null,
          message: 'Nenhum plano gerado para hoje. Use POST /api/plan/generate para criar um.'
        };
      }

      return {
        success: true,
        data: plan
      };
    } catch (err) {
      console.error('[daily-plan] Erro ao buscar plano:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar plano'
      });
    }
  });

  // ============================================
  // GET /api/plan/:planId
  // Buscar plano por ID
  // ============================================
  app.get('/plan/:planId', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      const { planId } = req.params as { planId: string };

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      // TODO: Buscar plano específico por ID
      // const plan = await DailyPlanService.getPlanById(planId);

      return {
        success: true,
        data: null,
        message: 'Endpoint em desenvolvimento'
      };
    } catch (err) {
      console.error('[daily-plan] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro'
      });
    }
  });

  // ============================================
  // POST /api/plan/item/start
  // Iniciar um item do plano
  // ============================================
  app.post('/plan/item/start', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { planId, itemId } = req.body as { planId: string; itemId: string };

      if (!planId || !itemId) {
        return reply.status(400).send({
          success: false,
          error: 'planId e itemId são obrigatórios'
        });
      }

      console.log(`[daily-plan] Iniciando item ${itemId} do plano ${planId}`);

      await DailyPlanService.startPlanItem(planId, itemId);

      return {
        success: true,
        message: 'Item iniciado com sucesso'
      };
    } catch (err) {
      console.error('[daily-plan] Erro ao iniciar item:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao iniciar item'
      });
    }
  });

  // ============================================
  // POST /api/plan/item/complete
  // Completar um item do plano
  // ============================================
  app.post('/plan/item/complete', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { planId, itemId, timeSpent, wasCorrect } = req.body as { 
        planId: string; 
        itemId: string;
        timeSpent?: number;
        wasCorrect?: boolean;
      };

      if (!planId || !itemId) {
        return reply.status(400).send({
          success: false,
          error: 'planId e itemId são obrigatórios'
        });
      }

      console.log(`[daily-plan] Completando item ${itemId} do plano ${planId}`);

      const completedItem = await DailyPlanService.completePlanItem(planId, itemId, timeSpent, wasCorrect);

      if (completedItem) {
        try {
          await GamificationService.trackActivity({
            userId,
            action: 'plan_item_completed',
            metadata: {
              itemType: completedItem.type,
              timeSpent,
              wasCorrect,
            },
          });
        } catch (err) {
          console.warn('[daily-plan] Falha ao atualizar gamificacao:', (err as any)?.message);
        }
      }

      return {
        success: true,
        message: 'Item completado com sucesso'
      };
    } catch (err) {
      console.error('[daily-plan] Erro ao completar item:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao completar item'
      });
    }
  });

  // ============================================
  // POST /api/plan/item/skip
  // Pular um item do plano
  // ============================================
  app.post('/plan/item/skip', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { planId, itemId, reason } = req.body as { 
        planId: string; 
        itemId: string;
        reason?: string;
      };

      if (!planId || !itemId) {
        return reply.status(400).send({
          success: false,
          error: 'planId e itemId são obrigatórios'
        });
      }

      console.log(`[daily-plan] Pulando item ${itemId} do plano ${planId}`);

      await DailyPlanService.skipPlanItem(planId, itemId, reason);

      return {
        success: true,
        message: 'Item pulado com sucesso'
      };
    } catch (err) {
      console.error('[daily-plan] Erro ao pular item:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao pular item'
      });
    }
  });

  // ============================================
  // POST /api/plan/adjust
  // Ajustar plano em tempo real
  // ============================================
  app.post('/plan/adjust', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { planId, adjustments } = req.body as { 
        planId: string; 
        adjustments: any;
      };

      if (!planId || !adjustments) {
        return reply.status(400).send({
          success: false,
          error: 'planId e adjustments são obrigatórios'
        });
      }

      console.log(`[daily-plan] Ajustando plano ${planId}`);

      const updatedPlan = await DailyPlanService.adjustPlan(planId, adjustments);

      return {
        success: true,
        data: updatedPlan,
        message: 'Plano ajustado com sucesso'
      };
    } catch (err) {
      console.error('[daily-plan] Erro ao ajustar plano:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao ajustar plano'
      });
    }
  });

  // ============================================
  // GET /api/plan/stats
  // Estatísticas de planos
  // NOTA: Rota já existe em daily-plan.ts - comentado para evitar duplicação
  // ============================================
  // app.get('/plan/stats', async (req, reply) => {
  //   try {
  //     const userId = (req.user as any)?.id;
  //     if (!userId) {
  //       return reply.status(401).send({
  //         success: false,
  //         error: 'Usuário não autenticado'
  //       });
  //     }

  //     console.log(`[daily-plan] Buscando stats para userId=${userId}`);

  //     const stats = await DailyPlanService.getPlanStats(userId);

  //     return {
  //       success: true,
  //       data: stats
  //     };
  //   } catch (err) {
  //     console.error('[daily-plan] Erro ao buscar stats:', err);
  //     return reply.status(500).send({
  //       success: false,
  //       error: err instanceof Error ? err.message : 'Erro ao buscar estatísticas'
  //     });
  //   }
  // });

  // ============================================
  // GET /api/plan/history
  // Histórico de planos
  // ============================================
  app.get('/plan/history', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { limit } = req.query as { limit?: string };
      const parsedLimit = limit ? parseInt(limit) : 30;

      console.log(`[daily-plan] Buscando histórico para userId=${userId}, limit=${parsedLimit}`);

      const history = await DailyPlanService.getPlanHistory(userId, parsedLimit);

      return {
        success: true,
        data: {
          plans: history,
          total: history.length
        }
      };
    } catch (err) {
      console.error('[daily-plan] Erro ao buscar histórico:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar histórico'
      });
    }
  });
}
