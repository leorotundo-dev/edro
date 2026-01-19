import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';

type UpdatePayload = Record<string, any>;

function buildUpdate(payload: UpdatePayload) {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return null;
  const set = entries.map(([key], idx) => `${key} = $${idx + 2}`).join(', ');
  const values = entries.map(([, value]) => value);
  return { set, values };
}

export default async function adminGamificationRoutes(app: FastifyInstance) {
  app.get('/admin/gamification/overview', async (_req, reply) => {
    const [profiles, xpEvents, missions, events, clans] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::int as count FROM gamification_profiles'),
      query<{ count: string }>('SELECT COUNT(*)::int as count FROM xp_events WHERE created_at >= NOW() - INTERVAL \'7 days\''),
      query<{ count: string }>('SELECT COUNT(*)::int as count FROM missions WHERE is_active = true'),
      query<{ count: string }>('SELECT COUNT(*)::int as count FROM gamification_events WHERE is_active = true'),
      query<{ count: string }>('SELECT COUNT(*)::int as count FROM clans'),
    ]);

    return reply.send({
      success: true,
      data: {
        profiles: Number(profiles.rows[0]?.count ?? 0),
        xp_events_last_7d: Number(xpEvents.rows[0]?.count ?? 0),
        active_missions: Number(missions.rows[0]?.count ?? 0),
        active_events: Number(events.rows[0]?.count ?? 0),
        clans: Number(clans.rows[0]?.count ?? 0),
      },
    });
  });

  app.get('/admin/gamification/missions', async (_req, reply) => {
    const { rows } = await query('SELECT * FROM missions ORDER BY created_at DESC');
    return reply.send({ success: true, data: rows });
  });

  app.post('/admin/gamification/missions', async (req, reply) => {
    const bodySchema = z.object({
      code: z.string().min(3).max(80),
      type: z.enum(['daily', 'weekly', 'event']),
      title: z.string().min(3).max(120),
      description: z.string().max(500).optional(),
      rules: z.record(z.any()),
      rewards: z.record(z.any()).optional(),
      is_active: z.boolean().optional(),
      start_at: z.string().optional(),
      end_at: z.string().optional(),
    });
    const body = bodySchema.parse(req.body);
    const { rows } = await query<{ id: string }>(
      `
        INSERT INTO missions (code, type, title, description, rules, rewards, is_active, start_at, end_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        body.code,
        body.type,
        body.title,
        body.description ?? null,
        body.rules,
        body.rewards ?? {},
        body.is_active ?? true,
        body.start_at ? new Date(body.start_at) : null,
        body.end_at ? new Date(body.end_at) : null,
      ]
    );
    return reply.status(201).send({ success: true, data: { id: rows[0]?.id } });
  });

  app.patch('/admin/gamification/missions/:id', async (req, reply) => {
    const bodySchema = z.object({
      title: z.string().min(3).max(120).optional(),
      description: z.string().max(500).optional(),
      rules: z.record(z.any()).optional(),
      rewards: z.record(z.any()).optional(),
      is_active: z.boolean().optional(),
      start_at: z.string().optional(),
      end_at: z.string().optional(),
    });
    const body = bodySchema.parse(req.body);
    const { id } = req.params as { id: string };

    const update = buildUpdate({
      title: body.title,
      description: body.description,
      rules: body.rules,
      rewards: body.rewards,
      is_active: body.is_active,
      start_at: body.start_at ? new Date(body.start_at) : undefined,
      end_at: body.end_at ? new Date(body.end_at) : undefined,
    });
    if (!update) {
      return reply.status(400).send({ success: false, error: 'Nenhuma alteracao enviada' });
    }

    await query(
      `UPDATE missions SET ${update.set}, created_at = created_at WHERE id = $1`,
      [id, ...update.values]
    );
    return reply.send({ success: true });
  });

  app.get('/admin/gamification/events', async (_req, reply) => {
    const { rows } = await query('SELECT * FROM gamification_events ORDER BY start_at DESC');
    return reply.send({ success: true, data: rows });
  });

  app.post('/admin/gamification/events', async (req, reply) => {
    const bodySchema = z.object({
      code: z.string().min(3).max(80),
      type: z.enum(['challenge', 'event']),
      title: z.string().min(3).max(120),
      description: z.string().max(500).optional(),
      rules: z.record(z.any()),
      rewards: z.record(z.any()).optional(),
      is_active: z.boolean().optional(),
      start_at: z.string(),
      end_at: z.string(),
    });
    const body = bodySchema.parse(req.body);
    const { rows } = await query<{ id: string }>(
      `
        INSERT INTO gamification_events (code, type, title, description, rules, rewards, is_active, start_at, end_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        body.code,
        body.type,
        body.title,
        body.description ?? null,
        body.rules,
        body.rewards ?? {},
        body.is_active ?? true,
        new Date(body.start_at),
        new Date(body.end_at),
      ]
    );
    return reply.status(201).send({ success: true, data: { id: rows[0]?.id } });
  });

  app.patch('/admin/gamification/events/:id', async (req, reply) => {
    const bodySchema = z.object({
      title: z.string().min(3).max(120).optional(),
      description: z.string().max(500).optional(),
      rules: z.record(z.any()).optional(),
      rewards: z.record(z.any()).optional(),
      is_active: z.boolean().optional(),
      start_at: z.string().optional(),
      end_at: z.string().optional(),
    });
    const body = bodySchema.parse(req.body);
    const { id } = req.params as { id: string };

    const update = buildUpdate({
      title: body.title,
      description: body.description,
      rules: body.rules,
      rewards: body.rewards,
      is_active: body.is_active,
      start_at: body.start_at ? new Date(body.start_at) : undefined,
      end_at: body.end_at ? new Date(body.end_at) : undefined,
    });
    if (!update) {
      return reply.status(400).send({ success: false, error: 'Nenhuma alteracao enviada' });
    }

    await query(
      `UPDATE gamification_events SET ${update.set}, created_at = created_at WHERE id = $1`,
      [id, ...update.values]
    );
    return reply.send({ success: true });
  });

  app.get('/admin/gamification/badges', async (_req, reply) => {
    const { rows } = await query('SELECT * FROM badges ORDER BY created_at DESC');
    return reply.send({ success: true, data: rows });
  });

  app.post('/admin/gamification/badges', async (req, reply) => {
    const bodySchema = z.object({
      code: z.string().min(3).max(80),
      title: z.string().min(3).max(120),
      description: z.string().max(500).optional(),
      category: z.string().max(50).optional(),
      rule_type: z.string().min(2).max(50),
      rule_config: z.record(z.any()).optional(),
      is_active: z.boolean().optional(),
    });
    const body = bodySchema.parse(req.body);
    const { rows } = await query<{ id: string }>(
      `
        INSERT INTO badges (code, title, description, category, rule_type, rule_config, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        body.code,
        body.title,
        body.description ?? null,
        body.category ?? 'general',
        body.rule_type,
        body.rule_config ?? {},
        body.is_active ?? true,
      ]
    );
    return reply.status(201).send({ success: true, data: { id: rows[0]?.id } });
  });

  app.patch('/admin/gamification/badges/:id', async (req, reply) => {
    const bodySchema = z.object({
      title: z.string().min(3).max(120).optional(),
      description: z.string().max(500).optional(),
      category: z.string().max(50).optional(),
      rule_type: z.string().min(2).max(50).optional(),
      rule_config: z.record(z.any()).optional(),
      is_active: z.boolean().optional(),
    });
    const body = bodySchema.parse(req.body);
    const { id } = req.params as { id: string };

    const update = buildUpdate({
      title: body.title,
      description: body.description,
      category: body.category,
      rule_type: body.rule_type,
      rule_config: body.rule_config,
      is_active: body.is_active,
    });
    if (!update) {
      return reply.status(400).send({ success: false, error: 'Nenhuma alteracao enviada' });
    }

    await query(
      `UPDATE badges SET ${update.set}, created_at = created_at WHERE id = $1`,
      [id, ...update.values]
    );
    return reply.send({ success: true });
  });

  app.get('/admin/gamification/clans', async (_req, reply) => {
    const { rows } = await query(
      `
        SELECT c.*,
          COUNT(m.id) FILTER (WHERE m.left_at IS NULL) AS members_count
        FROM clans c
        LEFT JOIN clan_members m ON m.clan_id = c.id AND m.left_at IS NULL
        GROUP BY c.id
        ORDER BY members_count DESC, c.created_at DESC
      `
    );
    return reply.send({ success: true, data: rows });
  });

  app.get('/admin/gamification/xp-events', async (req, reply) => {
    const limit = req.query && (req.query as any).limit ? Number((req.query as any).limit) : 50;
    const { rows } = await query(
      `
        SELECT e.*, u.name, u.email
        FROM xp_events e
        LEFT JOIN users u ON u.id = e.user_id
        ORDER BY e.created_at DESC
        LIMIT $1
      `,
      [Math.min(limit, 200)]
    );
    return reply.send({ success: true, data: rows });
  });
}
