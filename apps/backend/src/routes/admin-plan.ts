import { FastifyInstance } from 'fastify';
import { generateDailyPlanForUser } from '../services/plan/dailyPlan';

export async function adminPlanRoutes(app: FastifyInstance) {
  app.get('/admin/plan/daily/:userId', async (req, reply) => {
    try {
      const { userId } = req.params as { userId: string };
      const { limit } = req.query as { limit?: string };
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const plan = await generateDailyPlanForUser(userId, parsedLimit);
      return { success: true, data: plan };
    } catch (err) {
      console.error('[admin-plan] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao gerar plano'
      });
    }
  });
}
