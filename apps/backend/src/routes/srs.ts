import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import {
  computeNextScheduling,
  listDueCards,
  listRecentReviews,
  findOrCreateCardForContent,
  saveReview,
  updateCardScheduling,
  getSrsSummary,
  listCardsByMode,
  getUserSettings,
  upsertUserSettings,
  invalidateCache,
  resolveSubtopicForCard,
  getUserInterval,
  listUserIntervals,
  upsertUserInterval
} from '../repositories/srsRepository';
import { GamificationService } from '../services/gamificationService';
import { ProgressService } from '../services/progressService';

export default async function srsRoutes(app: FastifyInstance) {
  // Enrolar um Drop no SRS (cria cartão se não existir)
  app.post('/srs/enroll', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const bodySchema = z.object({
      drop_id: z.string().uuid().optional(),
      dropId: z.string().uuid().optional()
    });

    const body = bodySchema.parse(request.body);
    const dropId = body.drop_id ?? body.dropId;

    if (!dropId) {
      return reply.status(400).send({ error: 'drop_id ou dropId obrigatorio.' });
    }

    const card = await findOrCreateCardForContent({
      userId,
      contentType: 'drop',
      contentId: dropId,
      dropId
    });
    await invalidateCache(userId);

    return reply.status(201).send({ card });
  });

  // Listar cartões de revisão de hoje
  app.get('/srs/today', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const querySchema = z.object({
      limit: z.coerce.number().min(1).max(100).optional()
    });

    const { limit } = querySchema.parse(request.query);

    const cards = await listDueCards(userId, limit ?? 20);
    const dropIds = cards.map((card) => card.drop_id).filter(Boolean);
    let dropMap = new Map<string, any>();

    if (dropIds.length > 0) {
      const { rows } = await query(
        `
          SELECT id, title, content, drop_text, drop_type, topic_code, difficulty
          FROM drops
          WHERE id = ANY($1)
        `,
        [dropIds]
      );
      dropMap = new Map(rows.map((row: any) => [row.id, row]));
    }

    const enriched = cards.map((card) => ({
      ...card,
      drop: dropMap.get(card.drop_id) || null,
    }));

    return reply.send({ cards: enriched });
  });

  // Listar filas (atrasados/hoje/próximos/todos)
  app.get('/srs/queue', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const querySchema = z.object({
      mode: z.enum(['today', 'overdue', 'upcoming', 'all']).default('today'),
      limit: z.coerce.number().min(1).max(200).optional()
    });

    const { mode, limit } = querySchema.parse(request.query);
    const cards = await listCardsByMode(userId, mode, limit ?? 50, true);
    const dropIds = cards.map((card) => card.drop_id).filter(Boolean);
    let dropMap = new Map<string, any>();

    if (dropIds.length > 0) {
      const { rows } = await query(
        `
          SELECT id, title, content, drop_text, drop_type, topic_code, difficulty
          FROM drops
          WHERE id = ANY($1)
        `,
        [dropIds]
      );
      dropMap = new Map(rows.map((row: any) => [row.id, row]));
    }

    const enriched = cards.map((card) => ({
      ...card,
      drop: dropMap.get(card.drop_id) || null,
    }));

    return reply.send({ mode, cards: enriched });
  });

  // Estado resumido do SRS do usuário
  app.get('/srs/state', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'NÆo autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const summary = await getSrsSummary(userId);
    return reply.send({ summary });
  });

  // Histórico recente de revisões
  app.get('/srs/reviews', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'NÆo autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const querySchema = z.object({
      limit: z.coerce.number().min(1).max(100).optional()
    });

    const { limit } = querySchema.parse(request.query);

    const reviews = await listRecentReviews(userId, limit ?? 20);
    return reply.send({ reviews });
  });

  // Registrar uma revisão de SRS
  app.post('/srs/review', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const bodySchema = z.object({
      card_id: z.string().uuid().optional(),
      cardId: z.string().uuid().optional(),
      grade: z.number().int().min(0).max(5)
    });

    const body = bodySchema.parse(request.body);
    const cardId = body.card_id ?? body.cardId;
    if (!cardId) {
      return reply.status(400).send({ error: 'card_id ou cardId obrigatorio.' });
    }

    // Buscar card atual
    const { rows } = await (await import('../db')).query(
      'SELECT * FROM srs_cards WHERE id = $1 AND user_id = $2 LIMIT 1',
      [cardId, userId]
    );
    const card = rows[0];
    if (!card) {
      return reply.status(404).send({ error: 'Cartão não encontrado.' });
    }

    // Salvar review
    await saveReview(userId, cardId, body.grade);

    // Buscar preferencias do usuario
    const settings = await getUserSettings(userId);
    const subtopico = await resolveSubtopicForCard(userId, card);
    const interval = subtopico ? await getUserInterval(userId, subtopico) : null;

    // Calcular proximo agendamento
    const scheduling = computeNextScheduling(
      card.interval_days,
      card.ease_factor,
      card.repetition,
      body.grade,
      {
        settings,
        intervalMultiplier: interval?.interval_multiplier ?? 1,
        easeMultiplier: interval?.ease_multiplier ?? 1,
      }
    );

    const updated = await updateCardScheduling(card.id, {
      interval_days: scheduling.nextInterval,
      ease_factor: scheduling.nextEase,
      repetition: scheduling.nextRepetition
    });

    await invalidateCache(userId);

    try {
      await ProgressService.updateProgressRealtime({
        userId,
        type: 'srs_review',
      });
    } catch (err) {
      console.warn('[srs] Falha ao atualizar progress:', (err as any)?.message);
    }

    try {
      await GamificationService.trackActivity({
        userId,
        action: 'srs_review',
        sourceId: card.id,
        metadata: { grade: body.grade },
      });
    } catch (err) {
      console.warn('[srs] Falha ao atualizar gamificacao:', (err as any)?.message);
    }

    return reply.send({ card: updated });
  });

  // Obter preferências/perfil SRS do usuário
  app.get('/srs/settings', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const settings = await getUserSettings(userId);
    return reply.send({ settings });
  });

  // Atualizar preferências/perfil SRS
  app.post('/srs/settings', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Não autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const bodySchema = z.object({
      memory_strength: z.enum(['weak', 'normal', 'strong']).optional(),
      learning_style: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']).optional(),
      max_new_cards_per_day: z.coerce.number().min(1).max(100).optional(),
      base_interval_days: z.coerce.number().min(1).max(7).optional()
    });

    const body = bodySchema.parse(request.body);
    const settings = await upsertUserSettings(userId, body);
    await invalidateCache(userId);

    return reply.send({ settings });
  });

  // Obter intervalos personalizados do usuario (por subtopico)
  app.get('/srs/intervals', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Nao autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const querySchema = z.object({
      subtopico: z.string().optional(),
      limit: z.coerce.number().min(1).max(200).optional(),
    });

    const { subtopico, limit } = querySchema.parse(request.query);

    if (subtopico) {
      const interval = await getUserInterval(userId, subtopico);
      return reply.send({ interval });
    }

    const intervals = await listUserIntervals(userId, limit ?? 100);
    return reply.send({ intervals });
  });

  // Atualizar intervalos personalizados do usuario (por subtopico)
  app.post('/srs/intervals', async (request, reply) => {
    const anyReq: any = request;
    try {
      await anyReq.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Nao autorizado.' });
    }
    const user = anyReq.user as { sub: string };
    const userId = user.sub;

    const bodySchema = z.object({
      subtopico: z.string().min(1),
      interval_multiplier: z.coerce.number().min(0.2).max(3).optional(),
      ease_multiplier: z.coerce.number().min(0.2).max(3).optional(),
      avg_retention: z.coerce.number().min(0).max(100).optional(),
      avg_time_per_review: z.coerce.number().min(0).max(3600).optional(),
    });

    const body = bodySchema.parse(request.body);
    const interval = await upsertUserInterval(userId, body.subtopico, {
      interval_multiplier: body.interval_multiplier,
      ease_multiplier: body.ease_multiplier,
      avg_retention: body.avg_retention,
      avg_time_per_review: body.avg_time_per_review,
    });

    return reply.send({ interval });
  });
}
