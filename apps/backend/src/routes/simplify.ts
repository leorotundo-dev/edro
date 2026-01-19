import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { enforceIaCallLimit } from '../middleware/planLimits';
import { generateSimplification } from '../services/ai/openaiService';

/**
 * Rotas de simplificação de conteúdo
 * - POST /simplify
 */
export default async function simplifyRoutes(app: FastifyInstance) {
  app.post('/simplify', { preHandler: enforceIaCallLimit }, async (req, reply) => {
    const bodySchema = z.object({
      texto: z.string().min(10),
      metodo: z.enum(['1-3-1', 'contraste', 'analogia', 'historia', 'mapa_mental']),
      banca: z.string().optional(),
      nivel: z.enum(['N1', 'N2', 'N3', 'N4', 'N5']).optional(),
      estilo: z.string().optional(),
    });

    try {
      const body = bodySchema.parse(req.body);
      const output = await generateSimplification(body);

      return reply.code(200).send({
        success: true,
        data: {
          metodo: body.metodo,
          texto: output,
        }
      });
    } catch (err: any) {
      console.error('[simplify] Erro:', err);
      return reply.code(500).send({
        success: false,
        error: err?.message || 'Erro ao simplificar conteúdo'
      });
    }
  });
}
