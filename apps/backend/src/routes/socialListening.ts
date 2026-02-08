import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { hasClientPerm } from '../auth/clientPerms';
import { getClientById } from '../repos/clientsRepo';
import { query } from '../db';
import { SocialListeningService } from '../socialListening/SocialListeningService';

const platformEnum = z.enum(['twitter', 'youtube', 'tiktok', 'reddit', 'linkedin', 'instagram', 'facebook']);
const sentimentEnum = z.enum(['positive', 'negative', 'neutral']);

async function assertClientAccess(request: any, clientId: string, perm: 'read' | 'write') {
  const tenantId = request.user?.tenant_id;
  const userId = request.user?.sub;
  const role = request.user?.role;
  if (!tenantId || !userId) return false;

  return hasClientPerm({
    tenantId,
    userId,
    role,
    clientId,
    perm,
  });
}

export default async function socialListeningRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get(
    '/social-listening/keywords',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any, reply) => {
      const querySchema = z.object({
        clientId: z.string().optional(),
      });
      const query = querySchema.parse(request.query);

      if (query.clientId) {
        const allowed = await assertClientAccess(request, query.clientId, 'read');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const service = new SocialListeningService(request.user.tenant_id);
      return service.getKeywords({ clientId: query.clientId });
    }
  );

  app.post(
    '/social-listening/keywords',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        keyword: z.string().min(2),
        category: z.string().nullable().optional(),
        // Accept both legacy snake_case and frontend camelCase.
        clientId: z.string().optional(),
        client_id: z.string().optional(),
      });
      const body = bodySchema.parse(request.body);

      const resolvedClientId = body.clientId ?? body.client_id;

      if (resolvedClientId) {
        const allowed = await assertClientAccess(request, resolvedClientId, 'write');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const service = new SocialListeningService(request.user.tenant_id);
      const keyword = await service.addKeyword({
        keyword: body.keyword,
        category: body.category,
        clientId: resolvedClientId ?? null,
      });

      return reply.send(keyword);
    }
  );

  app.patch(
    '/social-listening/keywords/:id',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        is_active: z.boolean().optional(),
        category: z.string().nullable().optional(),
      });
      const body = bodySchema.parse(request.body);

      const service = new SocialListeningService(request.user.tenant_id);
      const id = String(request.params.id);
      const existing = await service.getKeywordById(id);
      if (!existing) return reply.status(404).send({ error: 'not_found' });

      if (existing.client_id) {
        const allowed = await assertClientAccess(request, existing.client_id, 'write');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const updated = await service.updateKeyword({
        id,
        isActive: body.is_active,
        category: body.category ?? undefined,
      });

      return reply.send(updated);
    }
  );

  app.delete(
    '/social-listening/keywords/:id',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const service = new SocialListeningService(request.user.tenant_id);
      const id = String(request.params.id);
      const existing = await service.getKeywordById(id);
      if (!existing) return reply.status(404).send({ error: 'not_found' });
      if (existing.client_id) {
        const allowed = await assertClientAccess(request, existing.client_id, 'write');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }
      await service.deleteKeyword(id);
      return reply.send({ ok: true });
    }
  );

  app.post(
    '/social-listening/collect',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        keyword: z.string().optional(),
        platform: platformEnum.optional(),
        platforms: z.array(platformEnum).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        clientId: z.string().optional(),
      });
      const body = bodySchema.parse(request.body || {});

      if (body.clientId) {
        const allowed = await assertClientAccess(request, body.clientId, 'write');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const service = new SocialListeningService(request.user.tenant_id);

      if (body.keyword && body.platform) {
        const mentions = await service.collectKeyword({
          keyword: body.keyword,
          platform: body.platform,
          limit: body.limit,
          clientId: body.clientId,
        });
        return reply.send({ mentions });
      }

      const result = await service.collectAll({
        limit: body.limit,
        clientId: body.clientId,
        platforms: body.platforms,
      });

      return reply.send(result);
    }
  );

  app.get(
    '/social-listening/mentions',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any, reply) => {
      const querySchema = z.object({
        platform: platformEnum.optional(),
        sentiment: sentimentEnum.optional(),
        keyword: z.string().optional(),
        clientId: z.string().optional(),
        limit: z.string().optional(),
        offset: z.string().optional(),
        q: z.string().optional(),
      });
      const query = querySchema.parse(request.query);

      if (query.clientId) {
        const allowed = await assertClientAccess(request, query.clientId, 'read');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const service = new SocialListeningService(request.user.tenant_id);
      const mentions = await service.getMentions({
        platform: query.platform,
        sentiment: query.sentiment,
        keyword: query.keyword,
        clientId: query.clientId,
        limit: query.limit ? Number(query.limit) : undefined,
        offset: query.offset ? Number(query.offset) : undefined,
        q: query.q,
      });

      return reply.send({ mentions });
    }
  );

  app.get(
    '/social-listening/trends',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any, reply) => {
      const querySchema = z.object({
        platform: z.union([platformEnum, z.literal('all')]).optional(),
        keyword: z.string().optional(),
        clientId: z.string().optional(),
        limit: z.string().optional(),
      });
      const query = querySchema.parse(request.query);

      if (query.clientId) {
        const allowed = await assertClientAccess(request, query.clientId, 'read');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const service = new SocialListeningService(request.user.tenant_id);
      const trends = await service.getTrends({
        platform: query.platform,
        keyword: query.keyword,
        clientId: query.clientId,
        limit: query.limit ? Number(query.limit) : undefined,
      });

      return reply.send({ trends });
    }
  );

  app.post(
    '/social-listening/trends/generate',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        periodHours: z.number().int().min(1).max(168).optional(),
        clientId: z.string().optional(),
      });
      const body = bodySchema.parse(request.body || {});

      if (body.clientId) {
        const allowed = await assertClientAccess(request, body.clientId, 'write');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const service = new SocialListeningService(request.user.tenant_id);
      const trends = await service.generateTrends({
        periodHours: body.periodHours,
        clientId: body.clientId,
      });

      return reply.send({ trends });
    }
  );

  app.get(
    '/social-listening/stats',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any, reply) => {
      const querySchema = z.object({
        clientId: z.string().optional(),
      });
      const query = querySchema.parse(request.query);

      if (query.clientId) {
        const allowed = await assertClientAccess(request, query.clientId, 'read');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const service = new SocialListeningService(request.user.tenant_id);
      const stats = await service.getStats({ clientId: query.clientId });
      return reply.send(stats);
    }
  );

  app.get(
    '/social-listening/reportei',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any, reply) => {
      const querySchema = z.object({
        clientId: z.string().min(1),
      });
      const queryParams = querySchema.parse(request.query);

      const allowed = await assertClientAccess(request, queryParams.clientId, 'read');
      if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });

      const tenantId = request.user?.tenant_id;
      const client = await getClientById(tenantId, queryParams.clientId);
      if (!client) return reply.status(404).send({ error: 'client_not_found' });

      const { rows } = await query<any>(
        `
        SELECT DISTINCT ON (platform)
          platform,
          time_window,
          payload,
          created_at
        FROM learned_insights
        WHERE tenant_id=$1
          AND client_id=$2
        ORDER BY platform, created_at DESC
        `,
        [tenantId, queryParams.clientId]
      );

      const items = (rows || []).map((row: any) => {
        const payload = row?.payload;
        if (payload && typeof payload === 'object') {
          const { raw, ...rest } = payload;
          return {
            platform: row.platform,
            time_window: row.time_window,
            created_at: row.created_at,
            payload: rest,
          };
        }
        return {
          platform: row.platform,
          time_window: row.time_window,
          created_at: row.created_at,
          payload,
        };
      });

      const updatedAt =
        items.reduce((latest: string | null, item: any) => {
          if (!item?.created_at) return latest;
          if (!latest) return item.created_at;
          return new Date(item.created_at).getTime() > new Date(latest).getTime()
            ? item.created_at
            : latest;
        }, null) || null;

      return reply.send({ items, updated_at: updatedAt });
    }
  );
}
