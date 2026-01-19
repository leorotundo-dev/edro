import { FastifyReply, FastifyRequest } from 'fastify';

export async function enforceIaCallLimit(_req: FastifyRequest, _reply: FastifyReply) {
  return;
}

export async function enforcePdfLimit(_req: FastifyRequest, _reply: FastifyReply) {
  return;
}

export async function enforcePdfLimitIfAuthenticated(_req: FastifyRequest, _reply: FastifyReply) {
  return;
}
