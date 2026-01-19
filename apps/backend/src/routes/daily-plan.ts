import { FastifyInstance } from 'fastify';
import { generateDailyPlanForUser } from '../services/plan/dailyPlan';
import { query } from '../db';

/**
 * Rotas públicas de Daily Plan
 */
export async function dailyPlanRoutes(app: FastifyInstance) {
  /**
   * GET /api/plan/daily
   * Gerar plano diário para o usuário autenticado
   * 
   * Query params:
   * - limit: número de drops (padrão: 30, máximo: 100)
   * 
   * Exemplo:
   * GET /api/plan/daily?limit=20
   */
  app.get('/plan/daily', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const { limit } = req.query as { limit?: string };
      let parsedLimit = limit ? parseInt(limit, 10) : 30;

      // Validar limite
      if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 30;
      if (parsedLimit > 100) parsedLimit = 100;

      console.log(`[plan] Gerando plano diário para userId=${userId}, limit=${parsedLimit}`);

      const plan = await generateDailyPlanForUser(userId, parsedLimit);

      return {
        success: true,
        data: plan
      };
    } catch (err) {
      console.error('[plan] Erro ao gerar plano:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao gerar plano'
      });
    }
  });

  /**
   * GET /api/plan/stats
   * Obter estatísticas de estudo do usuário autenticado
   * 
   * Retorna:
   * - total de tópicos estudados
   * - tópicos com revisão pendente
   * - taxa de acerto geral
   * - streak atual
   * 
   * Exemplo:
   * GET /api/plan/stats
   */
  app.get('/plan/stats', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[plan] Buscando stats para userId=${userId}`);

      // Buscar estatísticas
      const { rows: stats } = await query(
        `
        SELECT 
          topic_code,
          correct_count,
          wrong_count,
          streak,
          last_seen_at,
          next_due_at
        FROM user_stats
        WHERE user_id = $1
        ORDER BY topic_code ASC
        `,
        [userId]
      );

      // Calcular agregações
      const totalTopics = stats.length;
      const totalCorrect = stats.reduce((sum: number, s: any) => sum + (s.correct_count || 0), 0);
      const totalWrong = stats.reduce((sum: number, s: any) => sum + (s.wrong_count || 0), 0);
      const totalAttempts = totalCorrect + totalWrong;
      const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts * 100).toFixed(2) : '0.00';
      const maxStreak = Math.max(...stats.map((s: any) => s.streak || 0), 0);

      // Contar tópicos com revisão pendente
      const dueTopic = stats.filter((s: any) => s.next_due_at && new Date(s.next_due_at) <= new Date()).length;

      return {
        success: true,
        data: {
          userId,
          summary: {
            totalTopics,
            topicsWithDueReview: dueTopic,
            totalAttempts,
            totalCorrect,
            totalWrong,
            accuracy: `${accuracy}%`,
            maxStreak
          },
          topics: stats
        }
      };
    } catch (err) {
      console.error('[plan] Erro ao buscar stats:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar estatísticas'
      });
    }
  });

  /**
   * GET /api/plan/stats/:topicCode
   * Obter estatísticas de um tópico específico
   * 
   * Exemplo:
   * GET /api/plan/stats/PT-01
   */
  app.get('/plan/stats/:topicCode', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      const { topicCode } = req.params as { topicCode: string };

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[plan] Buscando stats para userId=${userId}, topicCode=${topicCode}`);

      // Buscar estatísticas do tópico
      const { rows: stats } = await query(
        `
        SELECT 
          topic_code,
          correct_count,
          wrong_count,
          streak,
          last_seen_at,
          next_due_at
        FROM user_stats
        WHERE user_id = $1 AND topic_code = $2
        `,
        [userId, topicCode]
      );

      if (stats.length === 0) {
        return {
          success: true,
          data: {
            userId,
            topicCode,
            message: 'Nenhum progresso registrado para este tópico'
          }
        };
      }

      const stat = stats[0];
      const totalAttempts = (stat.correct_count || 0) + (stat.wrong_count || 0);
      const accuracy = totalAttempts > 0 ? ((stat.correct_count || 0) / totalAttempts * 100).toFixed(2) : '0.00';

      return {
        success: true,
        data: {
          userId,
          topicCode,
          correctCount: stat.correct_count,
          wrongCount: stat.wrong_count,
          totalAttempts,
          accuracy: `${accuracy}%`,
          streak: stat.streak,
          lastSeenAt: stat.last_seen_at,
          nextDueAt: stat.next_due_at,
          isDue: stat.next_due_at && new Date(stat.next_due_at) <= new Date()
        }
      };
    } catch (err) {
      console.error('[plan] Erro ao buscar stats do tópico:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar estatísticas'
      });
    }
  });

  /**
   * POST /api/plan/reset
   * Resetar progresso do usuário (zerar app)
   * 
   * CUIDADO: Esta operação é irreversível!
   * 
   * Exemplo:
   * POST /api/plan/reset
   */
  app.post('/plan/reset', async (req, reply) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      console.log(`[plan] Resetando progresso para userId=${userId}`);

      // Deletar todas as estatísticas do usuário
      await query(
        `DELETE FROM user_stats WHERE user_id = $1`,
        [userId]
      );

      console.log(`[plan] ✅ Progresso resetado para userId=${userId}`);

      return {
        success: true,
        message: 'Progresso resetado com sucesso'
      };
    } catch (err) {
      console.error('[plan] Erro ao resetar progresso:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao resetar progresso'
      });
    }
  });
}
