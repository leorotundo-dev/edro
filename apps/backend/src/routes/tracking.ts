import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as trackingRepo from '../repositories/trackingRepository';

export default async function trackingRoutes(app: FastifyInstance) {
  // =====================================================
  // 1. TRACK EVENT (telemetria em tempo real)
  // =====================================================
  app.post('/tracking/event', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const bodySchema = z.object({
      event_type: z.string(),
      event_data: z.record(z.any()).optional(),
      session_id: z.string().uuid().optional(),
    });

    const body = bodySchema.parse(request.body);

    const event = await trackingRepo.trackEvent({
      user_id: userId,
      event_type: body.event_type,
      event_data: body.event_data,
      session_id: body.session_id,
    });

    // Calcular estado atual (NEC/NCA)
    const state = await trackingRepo.calculateCurrentState(userId);

    return reply.send({
      event,
      state,
    });
  });

  // =====================================================
  // 2. TRACK COGNITIVE STATE
  // =====================================================
  app.post('/tracking/cognitive', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const bodySchema = z.object({
      session_id: z.string().uuid(),
      foco: z.number().min(0).max(100).optional(),
      energia: z.number().min(0).max(100).optional(),
      velocidade: z.number().optional(), // wpm
      tempo_por_drop: z.number().optional(), // segundos
      hesitacao: z.boolean().optional(),
      abandono_drop: z.boolean().optional(),
      retorno_drop: z.boolean().optional(),
    });

    const body = bodySchema.parse(request.body);

    const cognitiveState = await trackingRepo.saveCognitiveState({
      user_id: userId,
      ...body,
    });

    return reply.send({ cognitiveState });
  });

  // =====================================================
  // 3. TRACK EMOTIONAL STATE
  // =====================================================
  app.post('/tracking/emotional', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const bodySchema = z.object({
      session_id: z.string().uuid(),
      humor_auto_reportado: z.number().min(1).max(5).optional(),
      frustracao_inferida: z.boolean().optional(),
      ansiedade_inferida: z.boolean().optional(),
      motivacao_inferida: z.boolean().optional(),
      contexto: z.string().optional(),
    });

    const body = bodySchema.parse(request.body);

    const emotionalState = await trackingRepo.saveEmotionalState({
      user_id: userId,
      ...body,
    });

    return reply.send({ emotionalState });
  });

  // =====================================================
  // 4. TRACK BEHAVIORAL STATE
  // =====================================================
  app.post('/tracking/behavioral', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const bodySchema = z.object({
      session_id: z.string().uuid(),
      hora_do_dia: z.number().min(0).max(23).optional(),
      duracao_sessao: z.number().optional(),
      pausas: z.number().optional(),
      ritmo_semanal: z.number().optional(),
    });

    const body = bodySchema.parse(request.body);

    const behavioralState = await trackingRepo.saveBehavioralState({
      user_id: userId,
      ...body,
    });

    return reply.send({ behavioralState });
  });

  // =====================================================
  // 5. START SESSION
  // =====================================================
  app.post('/tracking/session/start', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    // Verificar se já tem sessão ativa
    const activeSession = await trackingRepo.getActiveSession(userId);
    if (activeSession) {
      return reply.send({ session: activeSession, message: 'Sessão já ativa' });
    }

    const session = await trackingRepo.createSession(userId);

    return reply.status(201).send({ session });
  });

  // =====================================================
  // 6. END SESSION
  // =====================================================
  app.post('/tracking/session/end', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const bodySchema = z.object({
      session_id: z.string().uuid(),
      drops_completed: z.number().optional(),
      questions_answered: z.number().optional(),
    });

    const body = bodySchema.parse(request.body);

    const session = await trackingRepo.endSession(body.session_id, {
      drops_completed: body.drops_completed,
      questions_answered: body.questions_answered,
    });

    return reply.send({ session });
  });

  // =====================================================
  // 7. GET CURRENT STATE (dashboard)
  // =====================================================
  app.get('/tracking/state', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const state = await trackingRepo.calculateCurrentState(userId);

    return reply.send({
      state,
      timestamp: new Date(),
    });
  });

  // =====================================================
  // 8. GET RECENT EVENTS
  // =====================================================
  app.get('/tracking/events', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const querySchema = z.object({
      limit: z.coerce.number().min(1).max(100).optional(),
    });

    const { limit } = querySchema.parse(request.query);

    const events = await trackingRepo.getRecentEvents(userId, limit);

    return reply.send({ events });
  });

  // =====================================================
  // 9. GET ACTIVE SESSION
  // =====================================================
  app.get('/tracking/session/active', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const session = await trackingRepo.getActiveSession(userId);

    return reply.send({ session });
  });

  // =====================================================
  // 10. GET USER SESSIONS (histórico)
  // =====================================================
  app.get('/tracking/sessions', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const querySchema = z.object({
      limit: z.coerce.number().min(1).max(50).optional(),
    });

    const { limit } = querySchema.parse(request.query);

    const sessions = await trackingRepo.getUserSessions(userId, limit);

    return reply.send({ sessions });
  });

  // =====================================================
  // 11. GET COGNITIVE STATE BY SESSION
  // =====================================================
  app.get('/tracking/cognitive/session/:sessionId', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }

    const paramsSchema = z.object({
      sessionId: z.string().uuid(),
    });

    const { sessionId } = paramsSchema.parse(request.params);

    const states = await trackingRepo.getCognitiveStatesBySession(sessionId);

    return reply.send({ states });
  });

  // =====================================================
  // 12. DASHBOARD (agregado do dia)
  // =====================================================
  app.get('/tracking/dashboard', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const querySchema = z.object({
      date: z.string().optional(), // ISO date
    });

    const { date: dateStr } = querySchema.parse(request.query);
    const date = dateStr ? new Date(dateStr) : new Date();

    const [cognitive, emotional] = await Promise.all([
      trackingRepo.getCognitiveStateAggregated(userId, date),
      trackingRepo.getEmotionalStateAggregated(userId, date),
    ]);

    return reply.send({
      date,
      cognitive,
      emotional,
    });
  });
}
