import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createUser, findUserByEmail, findUserById } from '../repositories/userRepository';
import { AuthService } from '../services/authService';

export default async function authRoutes(app: FastifyInstance) {
  // Register
  app.post('/auth/register', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      plan: z.string().optional()
    });

    const body = bodySchema.parse(request.body);

    const existing = await findUserByEmail(body.email);
    if (existing) {
      return reply.status(400).send({ error: 'Email j  cadastrado.' });
    }

    const user = await createUser({
      name: body.name,
      email: body.email,
      password: body.password,
      plan: body.plan ?? null
    });

    const token = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        plan: user.plan
      },
      {
        expiresIn: '7d'
      }
    );

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan
      }
    });
  });

  // Login
  app.post('/auth/login', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(6)
    });

    const body = bodySchema.parse(request.body);

    const user = await findUserByEmail(body.email);
    if (!user) {
      return reply.status(400).send({ error: 'Credenciais inv lidas.' });
    }

    const isValid = await import('bcryptjs').then(m => m.compare(body.password, user.password_hash));
    if (!isValid) {
      return reply.status(400).send({ error: 'Credenciais inv lidas.' });
    }

    const token = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        plan: user.plan
      },
      {
        expiresIn: '7d'
      }
    );

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan
      }
    });
  });

  const handleMe = async (request: any, reply: any) => {
    try {
      const anyReq: any = request;
      await anyReq.jwtVerify();
      const payload = anyReq.user as { sub: string };

      const user = await findUserById(payload.sub);
      if (!user) {
        return reply.status(404).send({ error: 'Usu rio nÆo encontrado.' });
      }

      return reply.send({
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan
      });
    } catch (err) {
      return reply.status(401).send({ error: 'NÆo autorizado.' });
    }
  };

  // Me
  app.get('/me', handleMe);

  // Alias para compatibilidade
  app.get('/auth/me', handleMe);

  // ============================================
  // PASSWORD RESET
  // ============================================

  // Forgot Password (solicita reset)
  app.post('/auth/forgot-password', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
    });

    const body = bodySchema.parse(request.body);

    // Rate limiting
    const rateLimit = await AuthService.checkRateLimit(body.email, 'passwordReset');
    if (!rateLimit.allowed) {
      return reply.status(429).send({
        error: 'Muitas tentativas. Tente novamente mais tarde.',
        resetAt: rateLimit.resetAt,
      });
    }

    const result = await AuthService.createPasswordResetToken(body.email);

    if (!result) {
      // Por seguran‡a, nÆo informar se email existe ou nÆo
      return reply.send({
        message: 'Se o email existir, vocˆ receber  instru‡äes para redefinir sua senha.',
      });
    }

    // TODO: Enviar email com o token
    console.log(`[auth] Token de reset: ${result.token}`);

    return reply.send({
      message: 'Se o email existir, vocˆ receber  instru‡äes para redefinir sua senha.',
      // DEV ONLY: remover em produ‡Æo
      token: result.token,
    });
  });

  // Reset Password (redefine senha)
  app.post('/auth/reset-password', async (request, reply) => {
    const bodySchema = z.object({
      token: z.string(),
      newPassword: z.string().min(6),
    });

    const body = bodySchema.parse(request.body);

    const result = await AuthService.resetPassword(body.token, body.newPassword);

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({
      message: 'Senha redefinida com sucesso!',
    });
  });

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  // Resend Verification Email
  app.post('/auth/resend-verification', async (request, reply) => {
    try {
      const anyReq: any = request;
      await anyReq.jwtVerify();
      const payload = anyReq.user as { sub: string };

      const token = await AuthService.createEmailVerificationToken(payload.sub);

      // TODO: Enviar email com o token
      console.log(`[auth] Token de verifica‡Æo: ${token}`);

      return reply.send({
        message: 'Email de verifica‡Æo enviado!',
        // DEV ONLY: remover em produ‡Æo
        token,
      });
    } catch (err) {
      return reply.status(401).send({ error: 'NÆo autorizado.' });
    }
  });

  // Verify Email
  app.get('/auth/verify-email/:token', async (request, reply) => {
    const paramsSchema = z.object({
      token: z.string(),
    });

    const params = paramsSchema.parse(request.params);

    const result = await AuthService.verifyEmail(params.token);

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({
      message: 'Email verificado com sucesso!',
    });
  });

  // ============================================
  // REFRESH TOKEN
  // ============================================

  // Refresh Token (gera novo access token)
  app.post('/auth/refresh', async (request, reply) => {
    const bodySchema = z.object({
      refreshToken: z.string(),
    });

    const body = bodySchema.parse(request.body);

    const validation = await AuthService.validateRefreshToken(body.refreshToken);

    if (!validation.valid) {
      return reply.status(401).send({ error: validation.error });
    }

    const user = await findUserById(validation.userId!);
    if (!user) {
      return reply.status(404).send({ error: 'Usu rio nÆo encontrado.' });
    }

    // Gerar novo access token
    const token = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        plan: user.plan,
      },
      {
        expiresIn: '7d',
      }
    );

    return reply.send({
      token,
    });
  });

  // Logout (revoga refresh token)
  app.post('/auth/logout', async (request, reply) => {
    const bodySchema = z.object({
      refreshToken: z.string(),
    });

    const body = bodySchema.parse(request.body);

    await AuthService.revokeRefreshToken(body.refreshToken);

    return reply.send({
      message: 'Logout realizado com sucesso!',
    });
  });

  // Logout All (revoga todos os refresh tokens do usu rio)
  app.post('/auth/logout-all', async (request, reply) => {
    try {
      const anyReq: any = request;
      await anyReq.jwtVerify();
      const payload = anyReq.user as { sub: string };

      await AuthService.revokeAllUserTokens(payload.sub);

      return reply.send({
        message: 'Todas as sessäes foram encerradas!',
      });
    } catch (err) {
      return reply.status(401).send({ error: 'NÆo autorizado.' });
    }
  });
}
