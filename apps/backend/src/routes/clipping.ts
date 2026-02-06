import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Parser from 'rss-parser';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { hasClientPerm, requireClientPerm } from '../auth/clientPerms';
import { query } from '../db';
import { enqueueJob } from '../jobs/jobQueue';
import { ingestUrl, refreshItem } from '../clipping/ingest';
import { scoreClippingItem } from '../clipping/scoring';

const parser = new Parser();

const SOURCE_TYPES = ['RSS', 'URL', 'YOUTUBE', 'OTHER'] as const;
const SOURCE_SCOPES = ['GLOBAL', 'CLIENT'] as const;
const ITEM_STATUS = ['NEW', 'TRIAGED', 'PINNED', 'ARCHIVED'] as const;
const ITEM_TYPES = ['NEWS', 'TREND'] as const;

function normalizeArray(value?: string | string[] | null) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean);
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

function parseRecency(value?: string) {
  if (!value) return null;
  if (value === '24h') return '24 hours';
  if (value === '7d') return '7 days';
  if (value === '30d') return '30 days';
  return null;
}

function toMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function buildPostPayload(params: {
  id: string;
  date: string;
  platform: string;
  format: string;
  objective: string;
  title: string;
  snippet?: string | null;
  score?: number | null;
}) {
  const score = Math.max(0, Math.min(100, params.score ?? 60));
  const tier = score >= 80 ? 'A' : score >= 55 ? 'B' : 'C';
  return {
    id: params.id,
    date: params.date,
    platform: params.platform,
    format: params.format,
    objective: params.objective,
    theme: params.title,
    event_ids: [],
    score,
    tier,
    why_this_exists: 'clipping_item',
    copy: {
      headline: params.title,
      body: params.snippet || '',
      cta: 'Saiba mais',
    },
    alternatives: [],
  };
}

export default async function clippingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get(
    '/clipping/sources',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any) => {
      const querySchema = z.object({
        scope: z.enum(SOURCE_SCOPES).optional(),
        clientId: z.string().optional(),
      });
      const queryParams = querySchema.parse(request.query);
      const tenantId = (request.user as any).tenant_id;

      if (queryParams.clientId) {
        const allowed = await hasClientPerm({
          tenantId,
          userId: (request.user as any).sub,
          role: (request.user as any).role,
          clientId: queryParams.clientId,
          perm: 'read',
        });
        if (!allowed) {
          return { error: 'client_forbidden' };
        }
      }

      const where: string[] = ['tenant_id=$1'];
      const params: any[] = [tenantId];
      let idx = 2;

      if (queryParams.scope) {
        where.push(`scope=$${idx++}`);
        params.push(queryParams.scope);
      }
      if (queryParams.clientId) {
        where.push(`client_id=$${idx++}`);
        params.push(queryParams.clientId);
      }

      const { rows } = await query<unknown>(
        `SELECT * FROM clipping_sources WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`,
        params
      );
      return rows;
    }
  );

  app.post(
    '/clipping/sources',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        scope: z.enum(SOURCE_SCOPES).optional().default('GLOBAL'),
        client_id: z.string().optional(),
        name: z.string().min(2),
        url: z.string().url(),
        type: z.enum(SOURCE_TYPES).optional().default('RSS'),
        tags: z.array(z.string()).optional(),
        country: z.string().optional(),
        uf: z.string().optional(),
        city: z.string().optional(),
        fetch_interval_minutes: z.number().int().min(5).max(1440).optional(),
        include_keywords: z.array(z.string()).optional(),
        exclude_keywords: z.array(z.string()).optional(),
        min_content_length: z.number().int().min(0).optional(),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;

      if (body.scope === 'CLIENT') {
        if (!body.client_id) {
          return reply.status(400).send({ error: 'client_id_required' });
        }
        const allowed = await hasClientPerm({
          tenantId,
          userId: (request.user as any).sub,
          role: (request.user as any).role,
          clientId: body.client_id,
          perm: 'write',
        });
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      try {
        const { rows } = await query(
          `
          INSERT INTO clipping_sources
            (tenant_id, scope, client_id, name, url, type, tags, country, uf, city, fetch_interval_minutes, include_keywords, exclude_keywords, min_content_length)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          RETURNING *
          `,
          [
            tenantId,
            body.scope,
            body.client_id ?? null,
            body.name,
            body.url,
            body.type,
            body.tags ?? [],
            body.country ?? null,
            body.uf ?? null,
            body.city ?? null,
            body.fetch_interval_minutes ?? 60,
            body.include_keywords ?? [],
            body.exclude_keywords ?? [],
            body.min_content_length ?? 0,
          ]
        );
        return rows[0];
      } catch (error: any) {
        return reply.status(409).send({ error: error?.message || 'duplicate_source' });
      }
    }
  );

  app.patch(
    '/clipping/sources/:id',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        name: z.string().optional(),
        url: z.string().url().optional(),
        type: z.enum(SOURCE_TYPES).optional(),
        tags: z.array(z.string()).optional(),
        country: z.string().optional(),
        uf: z.string().optional(),
        city: z.string().optional(),
        is_active: z.boolean().optional(),
        fetch_interval_minutes: z.number().int().min(5).max(1440).optional(),
        include_keywords: z.array(z.string()).optional(),
        exclude_keywords: z.array(z.string()).optional(),
        min_content_length: z.number().int().min(0).optional(),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;

      const { rows } = await query<any>(
        `SELECT * FROM clipping_sources WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [request.params.id, tenantId]
      );
      const source = rows[0];
      if (!source) return reply.status(404).send({ error: 'not_found' });

      if (source.scope === 'CLIENT' && source.client_id) {
        const allowed = await hasClientPerm({
          tenantId,
          userId: (request.user as any).sub,
          role: (request.user as any).role,
          clientId: source.client_id,
          perm: 'write',
        });
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const next = {
        name: body.name ?? source.name,
        url: body.url ?? source.url,
        type: body.type ?? source.type,
        tags: body.tags ?? source.tags ?? [],
        country: body.country ?? source.country,
        uf: body.uf ?? source.uf,
        city: body.city ?? source.city,
        is_active: body.is_active ?? source.is_active,
        fetch_interval_minutes: body.fetch_interval_minutes ?? source.fetch_interval_minutes ?? 60,
        include_keywords: body.include_keywords ?? source.include_keywords ?? [],
        exclude_keywords: body.exclude_keywords ?? source.exclude_keywords ?? [],
        min_content_length: body.min_content_length ?? source.min_content_length ?? 0,
      };

      const { rows: updatedRows } = await query(
        `
        UPDATE clipping_sources
        SET name=$3, url=$4, type=$5, tags=$6, country=$7, uf=$8, city=$9,
            is_active=$10, fetch_interval_minutes=$11,
            include_keywords=$12, exclude_keywords=$13, min_content_length=$14,
            updated_at=NOW()
        WHERE id=$1 AND tenant_id=$2
        RETURNING *
        `,
        [
          source.id,
          tenantId,
          next.name,
          next.url,
          next.type,
          next.tags,
          next.country ?? null,
          next.uf ?? null,
          next.city ?? null,
          next.is_active,
          next.fetch_interval_minutes,
          next.include_keywords,
          next.exclude_keywords,
          next.min_content_length,
        ]
      );
      return updatedRows[0];
    }
  );

  app.post(
    '/clipping/sources/:id/test',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const { rows } = await query<any>(
        `SELECT * FROM clipping_sources WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [request.params.id, tenantId]
      );
      const source = rows[0];
      if (!source) return reply.status(404).send({ error: 'not_found' });

      if (source.type !== 'RSS') {
        return reply.send({ ok: true, message: 'Fonte nao RSS. Teste manual.' });
      }

      try {
        const feed = await parser.parseURL(source.url);
        return reply.send({
          ok: true,
          title: feed.title,
          items: (feed.items || []).slice(0, 5).map((item) => ({
            title: item.title,
            link: item.link,
          })),
        });
      } catch (error: any) {
        return reply.status(502).send({ ok: false, error: error?.message || 'fetch_failed' });
      }
    }
  );

  app.post(
    '/clipping/sources/:id/pause',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      await query(
        `UPDATE clipping_sources SET is_active=false, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
        [request.params.id, tenantId]
      );
      return reply.send({ ok: true });
    }
  );

  app.post(
    '/clipping/sources/:id/resume',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      await query(
        `UPDATE clipping_sources SET is_active=true, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
        [request.params.id, tenantId]
      );
      return reply.send({ ok: true });
    }
  );

  app.get(
    '/clipping/items',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const paramsSchema = z.object({
        status: z.string().optional(),
        segment: z.string().optional(),
        clientId: z.string().optional(),
        minScore: z.string().optional(),
        sourceId: z.string().optional(),
        type: z.string().optional(),
        recency: z.string().optional(),
        q: z.string().optional(),
        limit: z.string().optional(),
        offset: z.string().optional(),
      });
      const queryParams = paramsSchema.parse(request.query);

      if (queryParams.clientId) {
        const allowed = await hasClientPerm({
          tenantId,
          userId: (request.user as any).sub,
          role: (request.user as any).role,
          clientId: queryParams.clientId,
          perm: 'read',
        });
        if (!allowed) {
          return { error: 'client_forbidden' };
        }
      }

      const where: string[] = ['ci.tenant_id=$1'];
      const values: any[] = [tenantId];
      let idx = 2;

      const statuses = normalizeArray(queryParams.status);
      if (statuses.length) {
        where.push(`ci.status = ANY($${idx++})`);
        values.push(statuses);
      }

      if (queryParams.type && ITEM_TYPES.includes(queryParams.type as any)) {
        where.push(`ci.type=$${idx++}`);
        values.push(queryParams.type);
      }

      if (queryParams.segment) {
        where.push(`ci.segments @> $${idx++}::text[]`);
        values.push([queryParams.segment]);
      }

      if (queryParams.minScore) {
        const minScore = Number(queryParams.minScore);
        if (!Number.isNaN(minScore)) {
          where.push(`ci.score >= $${idx++}`);
          values.push(minScore);
        }
      }

      if (queryParams.sourceId) {
        where.push(`ci.source_id = $${idx++}`);
        values.push(queryParams.sourceId);
      }

      if (queryParams.clientId) {
        where.push(
          `(ci.assigned_client_ids @> $${idx}::text[] OR ci.suggested_client_ids @> $${idx}::text[] OR cs.client_id = $${idx + 1})`
        );
        values.push([queryParams.clientId], queryParams.clientId);
        idx += 2;
      }

      if (queryParams.q) {
        where.push(`(LOWER(ci.title) LIKE $${idx} OR LOWER(ci.snippet) LIKE $${idx})`);
        values.push(`%${queryParams.q.toLowerCase()}%`);
        idx += 1;
      }

      const recency = parseRecency(queryParams.recency);
      if (recency) {
        where.push(`ci.published_at >= NOW() - INTERVAL '${recency}'`);
      }

      const limit = Math.min(Number(queryParams.limit) || 200, 500);
      const offset = Math.max(Number(queryParams.offset) || 0, 0);
      values.push(limit, offset);

      const { rows } = await query<any>(
        `
        SELECT ci.*, cs.name as source_name, cs.url as source_url, cs.type as source_type
        FROM clipping_items ci
        JOIN clipping_sources cs ON cs.id = ci.source_id
        WHERE ${where.join(' AND ')}
        ORDER BY ci.score DESC, ci.published_at DESC NULLS LAST, ci.created_at DESC
        LIMIT $${idx++} OFFSET $${idx}
        `,
        values
      );

      return rows;
    }
  );

  app.get(
    '/clipping/items/:id',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const { rows } = await query<any>(
        `
        SELECT ci.*, cs.name as source_name, cs.url as source_url, cs.type as source_type
        FROM clipping_items ci
        JOIN clipping_sources cs ON cs.id = ci.source_id
        WHERE ci.id=$1 AND ci.tenant_id=$2
        `,
        [request.params.id, tenantId]
      );
      const item = rows[0];
      if (!item) return reply.status(404).send({ error: 'not_found' });

      const { rows: actions } = await query<any>(
        `SELECT * FROM clipping_item_actions WHERE item_id=$1 AND tenant_id=$2 ORDER BY created_at DESC`,
        [item.id, tenantId]
      );

      return reply.send({ ...item, actions });
    }
  );

  app.post(
    '/clipping/items/ingest-url',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        url: z.string().url(),
        sourceId: z.string().optional(),
        tags: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;

      const result = await ingestUrl(tenantId, {
        url: body.url,
        sourceId: body.sourceId,
        tags: body.tags,
        categories: body.categories,
      });

      if (!result.success) {
        return reply.status(400).send({ error: result.error, itemId: result.itemId });
      }

      return reply.status(201).send(result);
    }
  );

  app.post(
    '/clipping/items/ingest-urls',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        urls: z.array(z.string().url()),
        sourceId: z.string().optional(),
        tags: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;

      const results = [];
      for (const url of body.urls) {
        const result = await ingestUrl(tenantId, {
          url,
          sourceId: body.sourceId,
          tags: body.tags,
          categories: body.categories,
        });
        results.push({ url, ...result });
      }

      return reply.send({ results });
    }
  );

  app.post(
    '/clipping/items/:id/refresh',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const itemId = String(request.params.id);

      try {
        await refreshItem(tenantId, itemId);
        return reply.send({ ok: true });
      } catch (error: any) {
        return reply.status(400).send({ error: error?.message || 'refresh_failed' });
      }
    }
  );

  app.post(
    '/clipping/score',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        clientId: z.string().min(1),
        clientKeywords: z.array(z.string()).optional(),
        clientPillars: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(200).optional().default(50),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;
      const userId = (request.user as any).sub ?? null;

      const allowed = await hasClientPerm({
        tenantId,
        userId,
        role: (request.user as any).role,
        clientId: body.clientId,
        perm: 'write',
      });
      if (!allowed) {
        return reply.status(403).send({ error: 'client_forbidden' });
      }

      let keywords = body.clientKeywords || [];
      let pillars = body.clientPillars || [];
      let negativeKeywords: string[] = [];

      if (!keywords.length && !pillars.length) {
        const { rows } = await query<any>(
          `SELECT profile FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
          [body.clientId, tenantId]
        );
        const profile = rows[0]?.profile || {};
        keywords = Array.isArray(profile.keywords) ? profile.keywords : [];
        pillars = Array.isArray(profile.pillars) ? profile.pillars : [];
        negativeKeywords = Array.isArray(profile.negative_keywords) ? profile.negative_keywords : [];
      }

      const { rows: items } = await query<any>(
        `
        SELECT id, title, summary, content, published_at, tags, suggested_client_ids
        FROM clipping_items
        WHERE tenant_id=$1
          AND status IN ('NEW','TRIAGED')
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [tenantId, body.limit]
      );

      const results = [];

      for (const item of items) {
        const scoreResult = scoreClippingItem(
          {
            title: item.title,
            summary: item.summary,
            content: item.content,
            publishedAt: item.published_at,
            tags: item.tags,
          },
          { keywords, pillars, negativeKeywords }
        );

        const scorePercent = Math.max(0, Math.min(100, Math.round(scoreResult.score * 100)));
        const suggested = Array.from(
          new Set([
            ...(item.suggested_client_ids || []),
            scoreResult.score >= 0.45 ? body.clientId : null,
          ].filter(Boolean))
        );

        await query(
          `
          UPDATE clipping_items
          SET score=$3,
              relevance_score=$4,
              suggested_client_ids=$5,
              updated_at=NOW()
          WHERE id=$1 AND tenant_id=$2
          `,
          [item.id, tenantId, scorePercent, scoreResult.score, suggested]
        );

        await query(
          `
          INSERT INTO clipping_matches
            (tenant_id, clipping_item_id, client_id, score, matched_keywords, suggested_actions, negative_hits, relevance_factors)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (tenant_id, clipping_item_id, client_id)
          DO UPDATE SET score=$4, matched_keywords=$5, suggested_actions=$6, negative_hits=$7, relevance_factors=$8, updated_at=NOW()
          `,
          [
            tenantId,
            item.id,
            body.clientId,
            scoreResult.score,
            scoreResult.matchedKeywords,
            scoreResult.suggestedActions,
            scoreResult.negativeHits,
            JSON.stringify(scoreResult.relevanceFactors),
          ]
        );

        results.push({
          itemId: item.id,
          clientId: body.clientId,
          score: scoreResult.score,
          matchedKeywords: scoreResult.matchedKeywords,
          negativeHits: scoreResult.negativeHits,
          suggestedActions: scoreResult.suggestedActions,
        });
      }

      return reply.send({ results });
    }
  );

  app.get(
    '/clipping/matches/:clientId',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const clientId = String(request.params.clientId);
      const querySchema = z.object({
        limit: z.string().optional(),
      });
      const queryParams = querySchema.parse(request.query);
      const limit = Math.min(Number(queryParams.limit) || 20, 100);

      const allowed = await hasClientPerm({
        tenantId,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId,
        perm: 'read',
      });
      if (!allowed) {
        return reply.status(403).send({ error: 'client_forbidden' });
      }

      const { rows } = await query<any>(
        `
        SELECT cm.*, ci.title, ci.url, ci.snippet, ci.image_url, ci.score, ci.published_at
        FROM clipping_matches cm
        JOIN clipping_items ci ON ci.id = cm.clipping_item_id
        WHERE cm.tenant_id=$1 AND cm.client_id=$2
        ORDER BY cm.score DESC, cm.created_at DESC
        LIMIT $3
        `,
        [tenantId, clientId, limit]
      );

      return reply.send({ matches: rows });
    }
  );

  app.post(
    '/clipping/items/:id/assign',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        clientIds: z.array(z.string()).min(1),
        tags: z.array(z.string()).optional(),
        type: z.enum(ITEM_TYPES).optional(),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;
      const userId = (request.user as any).sub ?? null;

      for (const clientId of body.clientIds) {
        const allowed = await hasClientPerm({
          tenantId,
          userId: (request.user as any).sub,
          role: (request.user as any).role,
          clientId,
          perm: 'write',
        });
        if (!allowed) {
          return reply.status(403).send({ error: 'client_forbidden', client_id: clientId });
        }
      }

      const { rows } = await query<any>(
        `SELECT assigned_client_ids, segments FROM clipping_items WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [request.params.id, tenantId]
      );
      const current = rows[0];
      if (!current) return reply.status(404).send({ error: 'not_found' });

      const assigned = Array.from(new Set([...(current.assigned_client_ids || []), ...body.clientIds]));
      const segments = body.tags?.length
        ? Array.from(new Set([...(current.segments || []), ...body.tags]))
        : current.segments || [];

      await query(
        `
        UPDATE clipping_items
        SET assigned_client_ids=$3,
            segments=$4,
            type=$5,
            status='TRIAGED',
            updated_at=NOW()
        WHERE id=$1 AND tenant_id=$2
        `,
        [request.params.id, tenantId, assigned, segments, body.type ?? current.type ?? 'NEWS']
      );

      await query(
        `INSERT INTO clipping_item_actions (tenant_id, item_id, user_id, action, payload)
         VALUES ($1,$2,$3,$4,$5::jsonb)`,
        [
          tenantId,
          request.params.id,
          userId,
          'ASSIGN',
          JSON.stringify({ clientIds: body.clientIds, tags: body.tags ?? [] }),
        ]
      );

      return reply.send({ ok: true });
    }
  );

  app.post(
    '/clipping/items/:id/pin',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        scope: z.enum(SOURCE_SCOPES).optional().default('GLOBAL'),
        client_id: z.string().optional(),
        collection_id: z.string().optional(),
        collection_name: z.string().optional(),
        expires_at: z.string().optional(),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;
      const userId = (request.user as any).sub ?? null;

      if (body.scope === 'CLIENT') {
        if (!body.client_id) return reply.status(400).send({ error: 'client_id_required' });
        const allowed = await hasClientPerm({
          tenantId,
          userId: (request.user as any).sub,
          role: (request.user as any).role,
          clientId: body.client_id,
          perm: 'write',
        });
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      let collectionId = body.collection_id;

      if (!collectionId) {
        const name = body.collection_name || (body.scope === 'CLIENT' ? 'Pins do Cliente' : 'Pins');
        const { rows } = await query<{ id: string }>(
          `
          INSERT INTO clipping_collections (tenant_id, scope, client_id, name, created_by)
          VALUES ($1,$2,$3,$4,$5)
          RETURNING id
          `,
          [tenantId, body.scope, body.client_id ?? null, name, (request.user as any).email ?? null]
        );
        collectionId = rows[0]?.id;
      }

      if (!collectionId) return reply.status(500).send({ error: 'collection_failed' });

      await query(
        `
        INSERT INTO clipping_collection_items (tenant_id, collection_id, item_id, expires_at)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (collection_id, item_id) DO NOTHING
        `,
        [
          tenantId,
          collectionId,
          request.params.id,
          body.expires_at ? new Date(body.expires_at) : null,
        ]
      );

      await query(
        `UPDATE clipping_items SET status='PINNED', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
        [request.params.id, tenantId]
      );

      await query(
        `INSERT INTO clipping_item_actions (tenant_id, item_id, user_id, action, payload)
         VALUES ($1,$2,$3,$4,$5::jsonb)`,
        [
          tenantId,
          request.params.id,
          userId,
          'PIN',
          JSON.stringify({ scope: body.scope, client_id: body.client_id, collection_id: collectionId }),
        ]
      );

      return reply.send({ ok: true, collection_id: collectionId });
    }
  );

  app.post(
    '/clipping/items/:id/archive',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const userId = (request.user as any).sub ?? null;

      await query(
        `UPDATE clipping_items SET status='ARCHIVED', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
        [request.params.id, tenantId]
      );

      await query(
        `INSERT INTO clipping_item_actions (tenant_id, item_id, user_id, action, payload)
         VALUES ($1,$2,$3,$4,$5::jsonb)`,
        [tenantId, request.params.id, userId, 'ARCHIVE', JSON.stringify({})]
      );

      return reply.send({ ok: true });
    }
  );

  app.post(
    '/clipping/items/:id/create-post',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        platform: z.string().min(2).optional().default('Instagram'),
        format: z.string().min(2).optional().default('Feed'),
        scheduledDate: z.string().optional(),
        clientIds: z.array(z.string()).optional(),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;
      const userId = (request.user as any).sub ?? null;

      const { rows } = await query<any>(
        `SELECT * FROM clipping_items WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [request.params.id, tenantId]
      );
      const item = rows[0];
      if (!item) return reply.status(404).send({ error: 'not_found' });

      const targetClients = (body.clientIds && body.clientIds.length
        ? body.clientIds
        : item.assigned_client_ids?.length
          ? item.assigned_client_ids
          : item.suggested_client_ids) || [];

      if (!targetClients.length) {
        return reply.status(400).send({ error: 'client_required' });
      }

      for (const clientId of targetClients) {
        const allowed = await hasClientPerm({
          tenantId,
          userId: (request.user as any).sub,
          role: (request.user as any).role,
          clientId,
          perm: 'write',
        });
        if (!allowed) {
          return reply.status(403).send({ error: 'client_forbidden', client_id: clientId });
        }
      }

      const scheduled = body.scheduledDate
        ? new Date(body.scheduledDate)
        : item.published_at
          ? new Date(item.published_at)
          : new Date();
      const dateIso = scheduled.toISOString().slice(0, 10);
      const month = toMonthKey(scheduled);

      const created: any[] = [];

      for (const clientId of targetClients) {
        const { rows: calendarRows } = await query<any>(
          `
          SELECT id, COALESCE(jsonb_array_length(posts),0) AS count
          FROM monthly_calendars
          WHERE tenant_id=$1 AND client_id=$2 AND month=$3 AND platform=$4
          LIMIT 1
          `,
          [tenantId, clientId, month, body.platform]
        );

        const postPayload = buildPostPayload({
          id: `post_${month}_${Date.now()}`,
          date: dateIso,
          platform: body.platform,
          format: body.format,
          objective: 'engagement',
          title: item.title,
          snippet: item.snippet,
          score: item.score,
        });

        let calendarId = calendarRows[0]?.id;
        let postIndex = Number(calendarRows[0]?.count ?? 0);

        if (!calendarId) {
          const { rows: inserted } = await query<{ id: string }>(
            `
            INSERT INTO monthly_calendars (tenant_id, client_id, month, platform, objective, posts, payload)
            VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
            RETURNING id
            `,
            [
              tenantId,
              clientId,
              month,
              body.platform,
              'engagement',
              JSON.stringify([postPayload]),
              JSON.stringify({ source: 'clipping', item_id: item.id }),
            ]
          );
          calendarId = inserted[0]?.id;
          postIndex = 0;
        } else {
          await query(
            `
            UPDATE monthly_calendars
            SET posts = COALESCE(posts,'[]'::jsonb) || $1::jsonb,
                updated_at=NOW()
            WHERE id=$2 AND tenant_id=$3
            `,
            [JSON.stringify([postPayload]), calendarId, tenantId]
          );
        }

        await query(
          `
          INSERT INTO post_assets (tenant_id, calendar_id, post_index, status, payload)
          VALUES ($1,$2,$3,$4,$5::jsonb)
          `,
          [tenantId, calendarId, postIndex, 'draft', JSON.stringify(postPayload)]
        );

        created.push({ client_id: clientId, calendar_id: calendarId, post_index: postIndex });
      }

      const assigned = Array.from(
        new Set([...(item.assigned_client_ids || []), ...targetClients])
      );
      await query(
        `
        UPDATE clipping_items
        SET used_count = used_count + $3,
            assigned_client_ids = $4,
            status = CASE WHEN status='NEW' THEN 'TRIAGED' ELSE status END,
            updated_at=NOW()
        WHERE id=$1 AND tenant_id=$2
        `,
        [item.id, tenantId, targetClients.length, assigned]
      );

      await query(
        `INSERT INTO clipping_item_actions (tenant_id, item_id, user_id, action, payload)
         VALUES ($1,$2,$3,$4,$5::jsonb)`,
        [
          tenantId,
          item.id,
          userId,
          'CREATE_POST',
          JSON.stringify({ clients: targetClients, platform: body.platform, format: body.format, date: dateIso }),
        ]
      );

      return reply.send({ ok: true, created });
    }
  );

  app.get(
    '/clipping/collections',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const querySchema = z.object({
        scope: z.enum(SOURCE_SCOPES).optional(),
        clientId: z.string().optional(),
      });
      const queryParams = querySchema.parse(request.query);

      if (queryParams.clientId) {
        const allowed = await hasClientPerm({
          tenantId,
          userId: (request.user as any).sub,
          role: (request.user as any).role,
          clientId: queryParams.clientId,
          perm: 'read',
        });
        if (!allowed) return { error: 'client_forbidden' };
      }

      const where: string[] = ['tenant_id=$1'];
      const values: any[] = [tenantId];
      let idx = 2;

      if (queryParams.scope) {
        where.push(`scope=$${idx++}`);
        values.push(queryParams.scope);
      }
      if (queryParams.clientId) {
        where.push(`client_id=$${idx++}`);
        values.push(queryParams.clientId);
      }

      const { rows } = await query<any>(
        `SELECT * FROM clipping_collections WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`,
        values
      );
      return rows;
    }
  );

  app.post(
    '/clipping/collections',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        scope: z.enum(SOURCE_SCOPES).optional().default('GLOBAL'),
        client_id: z.string().optional(),
        name: z.string().min(2),
        description: z.string().optional(),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;

      if (body.scope === 'CLIENT') {
        if (!body.client_id) return reply.status(400).send({ error: 'client_id_required' });
        const allowed = await hasClientPerm({
          tenantId,
          userId: (request.user as any).sub,
          role: (request.user as any).role,
          clientId: body.client_id,
          perm: 'write',
        });
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const { rows } = await query<any>(
        `
        INSERT INTO clipping_collections (tenant_id, scope, client_id, name, description, created_by)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
        `,
        [
          tenantId,
          body.scope,
          body.client_id ?? null,
          body.name,
          body.description ?? null,
          (request.user as any).email ?? null,
        ]
      );
      return rows[0];
    }
  );

  app.post(
    '/clipping/collections/:id/add-item',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        item_id: z.string().min(1),
        expires_at: z.string().optional(),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;

      const { rows } = await query<any>(
        `SELECT * FROM clipping_collections WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [request.params.id, tenantId]
      );
      const collection = rows[0];
      if (!collection) return reply.status(404).send({ error: 'collection_not_found' });

      if (collection.scope === 'CLIENT' && collection.client_id) {
        const allowed = await hasClientPerm({
          tenantId,
          userId: (request.user as any).sub,
          role: (request.user as any).role,
          clientId: collection.client_id,
          perm: 'write',
        });
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      await query(
        `
        INSERT INTO clipping_collection_items (tenant_id, collection_id, item_id, expires_at)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (collection_id, item_id) DO NOTHING
        `,
        [tenantId, collection.id, body.item_id, body.expires_at ? new Date(body.expires_at) : null]
      );

      return reply.send({ ok: true });
    }
  );

  app.get(
    '/trends/relevant',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const { rows } = await query<any>(
        `
        SELECT ci.*, cs.name as source_name
        FROM clipping_items ci
        JOIN clipping_sources cs ON cs.id = ci.source_id
        WHERE ci.tenant_id=$1
          AND ci.status IN ('NEW','TRIAGED')
        ORDER BY ci.score DESC, ci.published_at DESC NULLS LAST
        LIMIT 30
        `,
        [tenantId]
      );
      return rows;
    }
  );

  app.get(
    '/clipping/dashboard',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const range = String(request.query?.range || 'week');
      const windowDays = range === 'today' ? 1 : range === 'month' ? 30 : 7;
      const windowInterval = `${windowDays} days`;

      const [{ rows: sourceRows }, { rows: itemRows }] = await Promise.all([
        query<any>(
          `
          SELECT
            COUNT(*) AS total_sources,
            COUNT(*) FILTER (WHERE is_active) AS active_sources
          FROM clipping_sources
          WHERE tenant_id=$1
          `,
          [tenantId]
        ),
        query<any>(
          `
          SELECT
            COUNT(*) AS total_items,
            COUNT(*) FILTER (WHERE status='NEW') AS new_items,
            COUNT(*) FILTER (WHERE status='TRIAGED') AS triaged_items,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') AS items_today,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS items_this_week,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS items_this_month,
            AVG(score)::numeric(10,2) AS avg_score,
            COUNT(*) FILTER (WHERE score >= 70) AS high,
            COUNT(*) FILTER (WHERE score >= 40 AND score < 70) AS medium,
            COUNT(*) FILTER (WHERE score < 40) AS low
          FROM clipping_items
          WHERE tenant_id=$1
          `,
          [tenantId]
        ),
      ]);

      const { rows: bySourceRows } = await query<any>(
        `
        SELECT
          cs.id AS source_id,
          cs.name AS source_name,
          cs.url AS source_url,
          COUNT(ci.id) AS item_count,
          MAX(COALESCE(ci.published_at, ci.created_at)) AS last_item_date
        FROM clipping_sources cs
        LEFT JOIN clipping_items ci
          ON ci.source_id = cs.id
         AND ci.tenant_id = cs.tenant_id
         AND ci.created_at >= NOW() - INTERVAL '${windowInterval}'
        WHERE cs.tenant_id=$1
        GROUP BY cs.id
        HAVING COUNT(ci.id) > 0
        ORDER BY item_count DESC, cs.name ASC
        LIMIT 10
        `,
        [tenantId]
      );

      const { rows: topItemsRows } = await query<any>(
        `
        SELECT
          ci.id,
          ci.title,
          cs.name AS source_name,
          ci.score,
          COALESCE(ci.published_at, ci.created_at) AS published_at,
          ci.url
        FROM clipping_items ci
        JOIN clipping_sources cs ON cs.id = ci.source_id
        WHERE ci.tenant_id=$1
          AND ci.created_at >= NOW() - INTERVAL '${windowInterval}'
        ORDER BY ci.score DESC, ci.published_at DESC NULLS LAST, ci.created_at DESC
        LIMIT 10
        `,
        [tenantId]
      );

      const { rows: recentItemsRows } = await query<any>(
        `
        SELECT
          ci.id,
          ci.title,
          cs.name AS source_name,
          ci.score,
          COALESCE(ci.published_at, ci.created_at) AS published_at,
          ci.url
        FROM clipping_items ci
        JOIN clipping_sources cs ON cs.id = ci.source_id
        WHERE ci.tenant_id=$1
          AND ci.created_at >= NOW() - INTERVAL '${windowInterval}'
        ORDER BY ci.published_at DESC NULLS LAST, ci.created_at DESC
        LIMIT 10
        `,
        [tenantId]
      );

      const { rows: trendRows } = await query<any>(
        `
        SELECT LOWER(unnest(segments)) AS keyword, COUNT(*)::int AS count
        FROM clipping_items
        WHERE tenant_id=$1
          AND created_at >= NOW() - INTERVAL '${windowInterval}'
        GROUP BY keyword
        ORDER BY count DESC
        LIMIT 15
        `,
        [tenantId]
      );

      const { rows: prevTrendRows } = await query<any>(
        `
        SELECT LOWER(unnest(segments)) AS keyword, COUNT(*)::int AS count
        FROM clipping_items
        WHERE tenant_id=$1
          AND created_at < NOW() - INTERVAL '${windowInterval}'
          AND created_at >= NOW() - INTERVAL '${windowInterval}' * 2
        GROUP BY keyword
        `,
        [tenantId]
      );

      const prevMap = new Map<string, number>();
      for (const row of prevTrendRows) {
        if (row?.keyword) prevMap.set(String(row.keyword), Number(row.count || 0));
      }

      const trends = trendRows.map((row: any) => {
        const keyword = String(row.keyword || '').trim();
        const count = Number(row.count || 0);
        const prev = prevMap.get(keyword) ?? 0;
        const trend = count > prev ? 'up' : count < prev ? 'down' : 'stable';
        return { keyword, count, trend };
      });

      return {
        total_sources: Number(sourceRows?.[0]?.total_sources ?? 0),
        active_sources: Number(sourceRows?.[0]?.active_sources ?? 0),
        total_items: Number(itemRows?.[0]?.total_items ?? 0),
        new_items: Number(itemRows?.[0]?.new_items ?? 0),
        triaged_items: Number(itemRows?.[0]?.triaged_items ?? 0),
        items_today: Number(itemRows?.[0]?.items_today ?? 0),
        items_this_week: Number(itemRows?.[0]?.items_this_week ?? 0),
        items_this_month: Number(itemRows?.[0]?.items_this_month ?? 0),
        items_last_7_days: Number(itemRows?.[0]?.items_this_week ?? 0),
        avg_score: Number(itemRows?.[0]?.avg_score ?? 0),
        by_source: bySourceRows || [],
        by_score: {
          high: Number(itemRows?.[0]?.high ?? 0),
          medium: Number(itemRows?.[0]?.medium ?? 0),
          low: Number(itemRows?.[0]?.low ?? 0),
        },
        top_items: topItemsRows || [],
        trends,
        recent_items: recentItemsRows || [],
      };
    }
  );

  app.post(
    '/clipping/jobs/fetch',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      await enqueueJob(tenantId, 'clipping_fetch_source', { source_id: request.body?.source_id });
      return { ok: true };
    }
  );

  // ── Feedback ────────────────────────────────────────────────────

  app.post(
    '/clipping/items/:id/feedback',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        feedback: z.enum(['relevant', 'irrelevant', 'wrong_client']),
        clientId: z.string().optional(),
        reason: z.string().optional(),
      });
      const body = bodySchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;
      const userId = (request.user as any).sub ?? null;
      const itemId = String(request.params.id);

      // Verify item exists
      const { rows: itemRows } = await query<any>(
        `SELECT id FROM clipping_items WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [itemId, tenantId]
      );
      if (!itemRows[0]) return reply.status(404).send({ error: 'not_found' });

      await query(
        `INSERT INTO clipping_feedback
           (tenant_id, clipping_item_id, client_id, user_id, feedback, reason)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id, clipping_item_id, client_id, user_id)
         DO UPDATE SET feedback=$5, reason=$6, created_at=NOW()`,
        [tenantId, itemId, body.clientId ?? null, userId, body.feedback, body.reason ?? null]
      );

      // Auto-archive if marked irrelevant globally (no client)
      if (body.feedback === 'irrelevant' && !body.clientId) {
        await query(
          `UPDATE clipping_items SET status='ARCHIVED', updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND status='NEW'`,
          [itemId, tenantId]
        );
      }

      return reply.send({ ok: true });
    }
  );

  // ── Quality Dashboard ───────────────────────────────────────────

  app.get(
    '/clipping/quality',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const range = String(request.query?.range || 'week');
      const windowDays = range === 'today' ? 1 : range === 'month' ? 30 : 7;
      const windowInterval = `${windowDays} days`;

      // Feedback summary
      const { rows: feedbackRows } = await query<any>(
        `SELECT
           feedback,
           COUNT(*)::int AS count
         FROM clipping_feedback
         WHERE tenant_id=$1 AND created_at >= NOW() - INTERVAL '${windowInterval}'
         GROUP BY feedback`,
        [tenantId]
      );

      const feedbackSummary: Record<string, number> = {};
      for (const row of feedbackRows) {
        feedbackSummary[row.feedback] = row.count;
      }

      const relevant = feedbackSummary['relevant'] || 0;
      const irrelevant = feedbackSummary['irrelevant'] || 0;
      const wrongClient = feedbackSummary['wrong_client'] || 0;
      const totalFeedback = relevant + irrelevant + wrongClient;
      const precisionPercent = totalFeedback > 0 ? Math.round((relevant / (relevant + irrelevant)) * 100) : null;

      // Match quality by client
      const { rows: clientQuality } = await query<any>(
        `SELECT
           cm.client_id,
           c.name AS client_name,
           COUNT(cm.id)::int AS total_matches,
           AVG(cm.score)::numeric(10,3) AS avg_score,
           COUNT(cf.id) FILTER (WHERE cf.feedback='relevant')::int AS relevant,
           COUNT(cf.id) FILTER (WHERE cf.feedback='irrelevant')::int AS irrelevant
         FROM clipping_matches cm
         JOIN clients c ON c.id = cm.client_id
         LEFT JOIN clipping_feedback cf
           ON cf.clipping_item_id = cm.clipping_item_id AND cf.client_id = cm.client_id AND cf.tenant_id = cm.tenant_id
         WHERE cm.tenant_id=$1 AND cm.created_at >= NOW() - INTERVAL '${windowInterval}'
         GROUP BY cm.client_id, c.name
         ORDER BY total_matches DESC`,
        [tenantId]
      );

      // Source quality
      const { rows: sourceQuality } = await query<any>(
        `SELECT
           cs.id AS source_id,
           cs.name AS source_name,
           COUNT(ci.id)::int AS total_items,
           COUNT(ci.id) FILTER (WHERE ci.status='ARCHIVED')::int AS archived,
           COUNT(ci.id) FILTER (WHERE ci.used_count > 0)::int AS used,
           AVG(ci.score)::numeric(10,1) AS avg_score,
           CASE WHEN COUNT(ci.id) > 0
             THEN ROUND(COUNT(ci.id) FILTER (WHERE ci.status='ARCHIVED' AND ci.used_count=0)::numeric / COUNT(ci.id) * 100)
             ELSE 0
           END AS garbage_pct
         FROM clipping_sources cs
         LEFT JOIN clipping_items ci ON ci.source_id = cs.id AND ci.tenant_id = cs.tenant_id
           AND ci.created_at >= NOW() - INTERVAL '${windowInterval}'
         WHERE cs.tenant_id=$1
         GROUP BY cs.id, cs.name
         ORDER BY total_items DESC`,
        [tenantId]
      );

      // Suggested negative keywords: tags from items marked irrelevant
      const { rows: suggestedNegKw } = await query<any>(
        `SELECT LOWER(unnest(ci.segments)) AS keyword, COUNT(*)::int AS count
         FROM clipping_feedback cf
         JOIN clipping_items ci ON ci.id = cf.clipping_item_id AND ci.tenant_id = cf.tenant_id
         WHERE cf.tenant_id=$1 AND cf.feedback='irrelevant'
           AND cf.created_at >= NOW() - INTERVAL '${windowInterval}'
         GROUP BY keyword
         ORDER BY count DESC
         LIMIT 20`,
        [tenantId]
      );

      return {
        feedback_summary: feedbackSummary,
        precision_percent: precisionPercent,
        total_feedback: totalFeedback,
        match_quality_by_client: clientQuality,
        source_quality: sourceQuality,
        suggested_negative_keywords: suggestedNegKw,
      };
    }
  );

  // ── Admin Backfill ────────────────────────────────────────────────
  // Re-enqueue recent items for enrichment + auto-score through the new pipeline

  app.post(
    '/clipping/admin/backfill',
    { preHandler: [requirePerm('clipping:write')] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const daysBack = Number(request.body?.days ?? 7);
      const cap = Math.min(Math.max(daysBack, 1), 30); // 1–30 days

      const { rows } = await query<any>(
        `INSERT INTO job_queue (tenant_id, type, payload)
         SELECT tenant_id, 'clipping_enrich_item', jsonb_build_object('item_id', id)
         FROM clipping_items
         WHERE tenant_id=$1
           AND created_at > NOW() - INTERVAL '${cap} days'
           AND status = 'NEW'
         RETURNING id`,
        [tenantId]
      );

      return { ok: true, enqueued: rows.length };
    }
  );

  // ── Diagnostics ───────────────────────────────────────────────────
  // Quick health check for the clipping pipeline

  app.get(
    '/clipping/admin/diagnostics',
    { preHandler: [requirePerm('clipping:read')] },
    async (request: any) => {
      const tenantId = (request.user as any).tenant_id;
      const errors: string[] = [];

      // 1. Check if new columns exist (migrations ran?)
      const columnChecks: Record<string, boolean> = {};
      for (const [table, col] of [
        ['clipping_items', 'title_hash'],
        ['clipping_sources', 'include_keywords'],
        ['clipping_matches', 'negative_hits'],
        ['clipping_matches', 'relevance_factors'],
      ]) {
        try {
          await query(`SELECT ${col} FROM ${table} LIMIT 0`);
          columnChecks[`${table}.${col}`] = true;
        } catch {
          columnChecks[`${table}.${col}`] = false;
        }
      }

      // 2. Check if clipping_feedback table exists
      let feedbackTableExists = false;
      try {
        await query(`SELECT id FROM clipping_feedback LIMIT 0`);
        feedbackTableExists = true;
      } catch {
        feedbackTableExists = false;
      }

      // 3. Job queue stats
      let jobStats: any[] = [];
      try {
        const res = await query<any>(
          `SELECT type, status, COUNT(*)::int AS count
           FROM job_queue
           WHERE tenant_id=$1 AND type LIKE 'clipping_%'
           GROUP BY type, status
           ORDER BY type, status`,
          [tenantId]
        );
        jobStats = res.rows;
      } catch (e: any) {
        errors.push(`job_queue_stats: ${e?.message}`);
      }

      // 4. Recent failed jobs
      let failedJobs: any[] = [];
      try {
        const res = await query<any>(
          `SELECT id, type, error_message AS error, updated_at
           FROM job_queue
           WHERE tenant_id=$1 AND type LIKE 'clipping_%' AND status='failed'
           ORDER BY updated_at DESC
           LIMIT 10`,
          [tenantId]
        );
        failedJobs = res.rows;
      } catch (e: any) {
        errors.push(`failed_jobs: ${e?.message}`);
      }

      // 5. Source status
      let sourceStatus: any[] = [];
      try {
        const res = await query<any>(
          `SELECT id, name, is_active, last_fetched_at, fetch_interval_minutes
           FROM clipping_sources
           WHERE tenant_id=$1
           ORDER BY last_fetched_at DESC NULLS LAST`,
          [tenantId]
        );
        sourceStatus = res.rows;
      } catch (e: any) {
        errors.push(`sources: ${e?.message}`);
      }

      // 6. Applied migrations
      let migrations: any[] = [];
      try {
        const res = await query<any>(
          `SELECT name, run_at FROM schema_migrations
           WHERE name LIKE '%clipping_overhaul%'
           ORDER BY name`
        );
        migrations = res.rows;
      } catch (e: any) {
        errors.push(`migrations: ${e?.message}`);
      }

      // 7. Recent items count + last item date
      let items: any = { total: 0, last_24h: 0, last_7d: 0, last_item_at: null };
      try {
        const res = await query<any>(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS last_24h,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last_7d,
             MAX(created_at)::text AS last_item_at
           FROM clipping_items WHERE tenant_id=$1`,
          [tenantId]
        );
        items = res.rows[0] || items;
      } catch (e: any) {
        errors.push(`items: ${e?.message}`);
      }

      // 8. Queued/processing jobs (to see if pipeline is stuck)
      let pendingJobs: any[] = [];
      try {
        const res = await query<any>(
          `SELECT type, status, COUNT(*)::int AS count
           FROM job_queue
           WHERE tenant_id=$1 AND type LIKE 'clipping_%' AND status IN ('queued','processing')
           GROUP BY type, status
           ORDER BY type`,
          [tenantId]
        );
        pendingJobs = res.rows;
      } catch (e: any) {
        errors.push(`pending_jobs: ${e?.message}`);
      }

      return {
        migrations_applied: migrations,
        column_checks: columnChecks,
        feedback_table_exists: feedbackTableExists,
        job_queue_stats: jobStats,
        pending_jobs: pendingJobs,
        recent_failed_jobs: failedJobs,
        sources: sourceStatus,
        items,
        errors,
      };
    }
  );
}
