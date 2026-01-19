import { FastifyInstance } from 'fastify';

export async function registerPlugins(app: FastifyInstance) {
  // Aqui entram plugins de DB, Redis, métricas etc.
  // JWT já está registrado no server.ts
}
