import { FastifyInstance } from 'fastify';
import { MonitoringService } from '../middleware/monitoring';

export default async function healthRoutes(app: FastifyInstance) {
  const basePayload = () => ({
    status: 'ok',
    service: 'edro-backend',
    version: '0.1.0'
  });

  app.get('/', async () => {
    return basePayload();
  });

  app.get('/health', async () => {
    return basePayload();
  });

  app.get('/health/ready', async (_request, reply) => {
    const health = await MonitoringService.getHealthStatus();
    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    return reply.status(statusCode).send(health);
  });
}
