import { FastifyInstance } from 'fastify';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/', async () => ({ status: 'ok' }));
  app.get('/health', async () => ({ status: 'ok' }));
}
