import { FastifyInstance } from 'fastify';
import { PaywallService } from '../services/paywallService';

export default async function paywallRoutes(app: FastifyInstance) {
  app.get('/paywall/events', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Nao autorizado.' });
    }
    const user = anyReq.user as { sub?: string; id?: string };
    const userId = user?.id || user?.sub;
    if (!userId) {
      return reply.status(401).send({ error: 'Nao autorizado.' });
    }
    const limit = request.query && (request.query as any).limit ? Number((request.query as any).limit) : 50;
    const events = await PaywallService.listPaywallEvents({ userId, limit });
    return reply.send({ success: true, data: events });
  });

  app.get('/admin/paywall/events', async (request, reply) => {
    const limit = request.query && (request.query as any).limit ? Number((request.query as any).limit) : 100;
    const events = await PaywallService.listPaywallEvents({ limit });
    return reply.send({ success: true, data: events });
  });
}
