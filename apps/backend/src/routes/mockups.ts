import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { saveFile, readFile, deleteFile } from '../library/storage';
import {
  createMockup,
  listMockups,
  getMockupById,
  updateMockup,
  deleteMockup,
} from '../repositories/edroMockupRepository';

const createSchema = z.object({
  briefing_id: z.string().uuid().optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  platform: z.string().optional().nullable(),
  format: z.string().optional().nullable(),
  production_type: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  html: z.string().optional().nullable(),
  json: z.any().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateSchema = z.object({
  status: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  html: z.string().optional().nullable(),
  json: z.any().optional(),
});

function buildMockupKey(params: {
  tenantId: string;
  briefingId?: string | null;
  kind: 'html' | 'json';
  platform?: string | null;
  format?: string | null;
}) {
  const safePlatform = (params.platform || 'plataforma').replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeFormat = (params.format || 'formato').replace(/[^a-zA-Z0-9._-]/g, '_');
  const folder = params.briefingId ? `mockups/${params.briefingId}` : 'mockups/sem-briefing';
  const ext = params.kind === 'html' ? 'html' : 'json';
  return `${params.tenantId}/${folder}/${Date.now()}_${safePlatform}_${safeFormat}.${ext}`;
}

export default async function mockupsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get(
    '/mockups',
    { preHandler: [requirePerm('library:read')] },
    async (request: any) => {
      const query = request.query || {};
      const data = listMockups({
        tenantId: (request.user as any).tenant_id,
        briefingId: query.briefing_id || query.briefingId || undefined,
        clientId: query.client_id || query.clientId || undefined,
        platform: query.platform || undefined,
        format: query.format || undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      });
      return data;
    }
  );

  app.post(
    '/mockups',
    { preHandler: [requirePerm('library:write')] },
    async (request: any) => {
      const body = createSchema.parse(request.body || {});
      const tenantId = (request.user as any).tenant_id as string;

      let htmlKey: string | null = null;
      let jsonKey: string | null = null;

      if (body.html) {
        htmlKey = buildMockupKey({
          tenantId,
          briefingId: body.briefing_id ?? undefined,
          kind: 'html',
          platform: body.platform ?? undefined,
          format: body.format ?? undefined,
        });
        await saveFile(Buffer.from(body.html, 'utf8'), htmlKey);
      }

      if (body.json !== undefined) {
        jsonKey = buildMockupKey({
          tenantId,
          briefingId: body.briefing_id ?? undefined,
          kind: 'json',
          platform: body.platform ?? undefined,
          format: body.format ?? undefined,
        });
        const jsonText = typeof body.json === 'string' ? body.json : JSON.stringify(body.json);
        await saveFile(Buffer.from(jsonText, 'utf8'), jsonKey);
      }

      return createMockup({
        tenantId,
        briefingId: body.briefing_id ?? null,
        clientId: body.client_id ?? null,
        platform: body.platform ?? null,
        format: body.format ?? null,
        productionType: body.production_type ?? null,
        status: body.status ?? 'draft',
        title: body.title ?? null,
        htmlKey,
        jsonKey,
        metadata: body.metadata ?? null,
        createdBy: (request.user as any).email ?? null,
      });
    }
  );

  app.get(
    '/mockups/:id',
    { preHandler: [requirePerm('library:read')] },
    async (request: any, reply: any) => {
      const item = await getMockupById({
        tenantId: (request.user as any).tenant_id,
        id: request.params.id,
      });
      if (!item) return reply.code(404).send({ error: 'not_found' });
      return item;
    }
  );

  app.patch(
    '/mockups/:id',
    { preHandler: [requirePerm('library:write')] },
    async (request: any, reply: any) => {
      const body = updateSchema.parse(request.body || {});
      const tenantId = (request.user as any).tenant_id as string;
      const current = await getMockupById({ tenantId, id: request.params.id });
      if (!current) return reply.code(404).send({ error: 'not_found' });

      let htmlKey = current.html_key ?? null;
      let jsonKey = current.json_key ?? null;

      if (body.html !== undefined) {
        if (htmlKey) {
          await deleteFile(htmlKey);
        }
        if (body.html) {
          htmlKey = buildMockupKey({
            tenantId,
            briefingId: current.briefing_id ?? undefined,
            kind: 'html',
            platform: current.platform ?? undefined,
            format: current.format ?? undefined,
          });
          await saveFile(Buffer.from(body.html, 'utf8'), htmlKey);
        } else {
          htmlKey = null;
        }
      }

      if (body.json !== undefined) {
        if (jsonKey) {
          await deleteFile(jsonKey);
        }
        if (body.json !== null) {
          jsonKey = buildMockupKey({
            tenantId,
            briefingId: current.briefing_id ?? undefined,
            kind: 'json',
            platform: current.platform ?? undefined,
            format: current.format ?? undefined,
          });
          const jsonText = typeof body.json === 'string' ? body.json : JSON.stringify(body.json);
          await saveFile(Buffer.from(jsonText, 'utf8'), jsonKey);
        } else {
          jsonKey = null;
        }
      }

      const updated = await updateMockup(
        { tenantId, id: request.params.id },
        {
          status: body.status ?? undefined,
          title: body.title ?? undefined,
          metadata: body.metadata ?? undefined,
          htmlKey,
          jsonKey,
        }
      );
      if (!updated) return reply.code(404).send({ error: 'not_found' });
      return updated;
    }
  );

  app.get(
    '/mockups/:id/html',
    { preHandler: [requirePerm('library:read')] },
    async (request: any, reply: any) => {
      const item = await getMockupById({
        tenantId: (request.user as any).tenant_id,
        id: request.params.id,
      });
      if (!item || !item.html_key) return reply.code(404).send({ error: 'not_found' });
      const buffer = await readFile(item.html_key);
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return reply.send(buffer);
    }
  );

  app.get(
    '/mockups/:id/json',
    { preHandler: [requirePerm('library:read')] },
    async (request: any, reply: any) => {
      const item = await getMockupById({
        tenantId: (request.user as any).tenant_id,
        id: request.params.id,
      });
      if (!item || !item.json_key) return reply.code(404).send({ error: 'not_found' });
      const buffer = await readFile(item.json_key);
      reply.header('Content-Type', 'application/json; charset=utf-8');
      return reply.send(buffer);
    }
  );

  app.delete(
    '/mockups/:id',
    { preHandler: [requirePerm('library:write')] },
    async (request: any, reply: any) => {
      const tenantId = (request.user as any).tenant_id as string;
      const item = await deleteMockup({ tenantId, id: request.params.id });
      if (!item) return reply.code(404).send({ error: 'not_found' });
      if (item.html_key) await deleteFile(item.html_key);
      if (item.json_key) await deleteFile(item.json_key);
      return { ok: true };
    }
  );
}
