import { FastifyInstance } from 'fastify';
import { learnLog } from '../services/learn/log';

export async function adminLearnRoutes(app: FastifyInstance) {
  app.post('/admin/learn/log', async (req, reply) => {
    try {
      const { userId, dropId, wasCorrect } = req.body as {
        userId: string;
        dropId: number;
        wasCorrect: boolean;
      };

      if (!userId || !dropId || wasCorrect === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'Parâmetros obrigatórios: userId, dropId, wasCorrect'
        });
      }

      const result = await learnLog({ userId, dropId, wasCorrect });

      return { success: true, data: result };
    } catch (err) {
      console.error('[admin-learn] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao registrar resposta'
      });
    }
  });
}
