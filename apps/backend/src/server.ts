import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './env';
import { registerRoutes } from './routes';

export async function buildServer() {
  const app = fastify({
    logger: true,
  });

  const allowedOriginsList = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [
        'http://localhost:3000',
        'http://localhost:3001',
      ];

  const allowAll = allowedOriginsList.includes('*');

  await app.register(cors, {
    origin: (origin, cb) => {
      if (allowAll || !origin) return cb(null, true);
      const isAllowed = allowedOriginsList.includes(origin);
      cb(null, isAllowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await registerRoutes(app);

  return app;
}
