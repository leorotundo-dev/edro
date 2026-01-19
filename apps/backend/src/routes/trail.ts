import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { markDropCompleted } from '../repositories/userDropRepository';
import { listDrops } from '../repositories/dropRepository';

export default async function trailRoutes(app: FastifyInstance) {
  app.get('/trail/today', async (request) => {
    // @ts-ignore - user será adicionado pelo middleware de autenticação
    const userId = request.user?.id || 'anonymous';
    
    // Por enquanto, retorna todos os drops como trilha do dia
    const drops = await listDrops();
    return { trail: drops.slice(0, 5) }; // Primeiros 5 drops
  });

  app.post('/trail/complete', async (request, reply) => {
    const bodySchema = z.object({
      drop_id: z.string().uuid()
    });
    const body = bodySchema.parse(request.body);
    // @ts-ignore
    const userId = request.user?.id || 'anonymous';
    const result = await markDropCompleted(userId, body.drop_id);
    return reply.status(200).send(result);
  });
}
