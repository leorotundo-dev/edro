/**
 * Rate Limiting Middleware
 * 
 * Middleware para aplicar rate limiting em rotas específicas
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/authService';

export interface RateLimitOptions {
  action: 'login' | 'register' | 'passwordReset';
  identifierFn?: (request: FastifyRequest) => string;
}

/**
 * Cria middleware de rate limiting
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Determinar identificador (email, IP, etc)
    let identifier: string;
    
    if (options.identifierFn) {
      identifier = options.identifierFn(request);
    } else {
      // Padrão: usar email do body ou IP
      const body = request.body as any;
      identifier = body?.email || request.ip;
    }

    // Verificar rate limit
    const rateLimit = await AuthService.checkRateLimit(identifier, options.action);

    if (!rateLimit.allowed) {
      const minutesUntilReset = Math.ceil(
        ((rateLimit.resetAt?.getTime() || 0) - Date.now()) / 60000
      );

      return reply.status(429).send({
        error: `Muitas tentativas. Tente novamente em ${minutesUntilReset} minutos.`,
        resetAt: rateLimit.resetAt,
        remaining: 0,
      });
    }

    // Adicionar headers de rate limit
    reply.header('X-RateLimit-Limit', String(rateLimit.remaining! + 1));
    reply.header('X-RateLimit-Remaining', String(rateLimit.remaining));
    reply.header('X-RateLimit-Reset', rateLimit.resetAt?.toISOString() || '');
  };
}

/**
 * Helpers pré-configurados
 */
export const rateLimitLogin = createRateLimitMiddleware({ action: 'login' });
export const rateLimitRegister = createRateLimitMiddleware({ action: 'register' });
export const rateLimitPasswordReset = createRateLimitMiddleware({ action: 'passwordReset' });

/**
 * Rate limit por IP
 */
export function createIpRateLimit(maxRequests: number, windowMinutes: number) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip;
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || now > record.resetAt) {
      // Nova janela
      requests.set(ip, {
        count: 1,
        resetAt: now + windowMinutes * 60000,
      });
      reply.header('X-RateLimit-Remaining', String(maxRequests - 1));
      return;
    }

    if (record.count >= maxRequests) {
      // Limite excedido
      const minutesUntilReset = Math.ceil((record.resetAt - now) / 60000);
      return reply.status(429).send({
        error: `Muitas requisições. Tente novamente em ${minutesUntilReset} minutos.`,
      });
    }

    // Incrementar contador
    record.count++;
    requests.set(ip, record);
    reply.header('X-RateLimit-Remaining', String(maxRequests - record.count));
  };
}

/**
 * Rate limit global (todas as rotas)
 */
export const globalRateLimit = createIpRateLimit(100, 15); // 100 req/15min por IP
