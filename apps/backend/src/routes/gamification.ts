import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GamificationService } from '../services/gamificationService';
import { listActiveEvents, joinEvent, getEventLeaderboard } from '../services/gamificationEventsService';
import { ClanService } from '../services/clanService';

/**
 * Rotas de gamificacao (XP, niveis, badges, streak)
 */
export default async function gamificationRoutes(app: FastifyInstance) {
  const getUserId = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Nao autorizado.' });
      return null;
    }
    const user = request.user as { sub?: string; id?: string };
    return user?.id || user?.sub || null;
  };

  app.get('/gamification/profile', async (request, reply) => {
    const userId = await getUserId(request, reply);
    if (!userId) return;

    const profile = await GamificationService.getProfileSummary(userId);
    return reply.send({ success: true, data: profile });
  });

  app.post('/gamification/xp', async (request, reply) => {
    const userId = await getUserId(request, reply);
    if (!userId) return;

    const bodySchema = z.object({
      amount: z.coerce.number().min(1).max(5000),
      reason: z.string().max(200).optional(),
    });
    const { amount, reason } = bodySchema.parse(request.body);

    const result = await GamificationService.trackActivity({
      userId,
      action: 'manual',
      metadata: { xp: amount },
      reason,
    });

    return reply.status(201).send({
      success: true,
      data: { amount, reason: reason || null, result },
    });
  });

  app.get('/gamification/missions', async (request, reply) => {
    const userId = await getUserId(request, reply);
    if (!userId) return;

    const missions = await GamificationService.listMissionsForUser(userId);
    return reply.send({ success: true, data: missions });
  });

  app.get('/gamification/events', async (request, reply) => {
    const userId = await getUserId(request, reply);
    if (!userId) return;

    const events = await listActiveEvents(userId);
    return reply.send({ success: true, data: events });
  });

  app.post('/gamification/events/:id/join', async (request, reply) => {
    const userId = await getUserId(request, reply);
    if (!userId) return;

    const { id } = request.params as { id: string };
    await joinEvent({ userId, eventId: id });
    return reply.send({ success: true });
  });

  app.get('/gamification/events/:id/leaderboard', async (request, reply) => {
    const { id } = request.params as { id: string };
    const limit = request.query && (request.query as any).limit ? Number((request.query as any).limit) : 20;
    const leaderboard = await getEventLeaderboard(id, limit);
    return reply.send({ success: true, data: leaderboard });
  });

  app.get('/gamification/clans', async (request, reply) => {
    const userId = await getUserId(request, reply);
    if (!userId) return;
    const clans = await ClanService.listClans(20);
    const userClan = await ClanService.getUserClan(userId);
    return reply.send({ success: true, data: { clans, userClan } });
  });

  app.post('/gamification/clans', async (request, reply) => {
    const userId = await getUserId(request, reply);
    if (!userId) return;

    const bodySchema = z.object({
      name: z.string().min(3).max(80),
      description: z.string().max(500).optional(),
      avatarUrl: z.string().url().optional(),
      isPublic: z.boolean().optional(),
    });
    const body = bodySchema.parse(request.body);

    const clanId = await ClanService.createClan({
      userId,
      name: body.name,
      description: body.description,
      avatarUrl: body.avatarUrl,
      isPublic: body.isPublic,
    });
    return reply.status(201).send({ success: true, data: { clanId } });
  });

  app.post('/gamification/clans/:id/join', async (request, reply) => {
    const userId = await getUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };
    const result = await ClanService.joinClan({ userId, clanId: id });
    if (!result.ok) {
      return reply.status(400).send({ success: false, error: result.reason });
    }
    return reply.send({ success: true });
  });

  app.post('/gamification/clans/:id/leave', async (request, reply) => {
    const userId = await getUserId(request, reply);
    if (!userId) return;
    const { id } = request.params as { id: string };
    await ClanService.leaveClan({ userId, clanId: id });
    return reply.send({ success: true });
  });

  app.get('/gamification/clans/leaderboard', async (request, reply) => {
    const limit = request.query && (request.query as any).limit ? Number((request.query as any).limit) : 20;
    const leaderboard = await ClanService.getClanLeaderboard(limit);
    return reply.send({ success: true, data: leaderboard });
  });

  app.get('/gamification/leaderboard', async (request, reply) => {
    const limit = request.query && (request.query as any).limit ? Number((request.query as any).limit) : 20;
    const leaderboard = await GamificationService.listGlobalLeaderboard(limit);
    return reply.send({ success: true, data: leaderboard });
  });
}
