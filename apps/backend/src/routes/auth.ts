import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requestLoginCode, verifyLoginCode } from '../services/authService';
import { findUserByEmail } from '../repositories/edroUserRepository';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/request', async (request, reply) => {
    const bodySchema = z.object({ email: z.string().email() });
    const body = bodySchema.parse(request.body);

    try {
      const result = await requestLoginCode(body.email);
      return reply.send({ success: true, ...result });
    } catch (error: any) {
      const message = error?.message === 'domain_not_allowed'
        ? 'Dominio nao autorizado.'
        : 'Nao foi possivel enviar o codigo.';
      return reply.status(403).send({ success: false, error: message });
    }
  });

  app.post('/auth/verify', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      code: z.string().min(4),
    });

    const body = bodySchema.parse(request.body);

    try {
      const user = await verifyLoginCode(body.email, body.code);

      const token = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        { expiresIn: '12h' }
      );

      return reply.send({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: any) {
      const isDomain = error?.message === 'domain_not_allowed';
      const isInvalid = error?.message === 'invalid_code';
      return reply.status(isDomain ? 403 : 401).send({
        success: false,
        error: isInvalid ? 'Codigo invalido ou expirado.' : 'Nao autorizado.',
      });
    }
  });

  const handleMe = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      const userPayload = request.user as { email?: string };
      if (!userPayload?.email) {
        return reply.status(401).send({ error: 'Nao autorizado.' });
      }
      const user = await findUserByEmail(userPayload.email);
      if (!user) {
        return reply.status(404).send({ error: 'Usuario nao encontrado.' });
      }
      return reply.send({
        id: user.id,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      return reply.status(401).send({ error: 'Nao autorizado.' });
    }
  };

  app.get('/auth/me', handleMe);
  app.get('/me', handleMe);
}
