import { FastifyInstance } from 'fastify';
import { learnLog } from '../services/learn/log';
import { GamificationService } from '../services/gamificationService';

/**
 * Rotas públicas de Learn Log
 * Requer autenticação via JWT
 */
export async function learnRoutes(app: FastifyInstance) {
  /**
   * POST /api/learn/log
   * Registrar resposta do usuário e atualizar SRS
   * 
   * Body:
   * - dropId: number — ID do drop respondido
   * - wasCorrect: boolean — Se a resposta foi correta
   * 
   * Exemplo:
   * POST /api/learn/log
   * { "dropId": 42, "wasCorrect": true }
   */
  app.post('/learn/log', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { dropId, wasCorrect } = req.body as {
        dropId: number;
        wasCorrect: boolean;
      };

      if (!dropId || wasCorrect === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'Parâmetros obrigatórios: dropId, wasCorrect'
        });
      }

      console.log(`[learn] Registrando resposta: userId=${userId}, dropId=${dropId}, wasCorrect=${wasCorrect}`);

      const result = await learnLog({ userId, dropId, wasCorrect });

      try {
        await GamificationService.trackActivity({
          userId,
          action: 'drop_completed',
          sourceId: typeof dropId === 'string' ? dropId : null,
          metadata: { wasCorrect },
        });
      } catch (err) {
        console.warn('[learn] Falha ao atualizar gamificacao:', (err as any)?.message);
      }

      return {
        success: true,
        data: result
      };
    } catch (err) {
      console.error('[learn] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao registrar resposta'
      });
    }
  });
}
