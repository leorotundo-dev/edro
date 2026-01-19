import { FastifyInstance } from 'fastify';
import healthRoutes from './health';
import authRoutes from './auth';
import edroRoutes from './edro';

export async function registerRoutes(app: FastifyInstance) {
  app.register(healthRoutes);
  app.register(authRoutes, { prefix: '/api' });
  app.register(edroRoutes, { prefix: '/api' });
}
