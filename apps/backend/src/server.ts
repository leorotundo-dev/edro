import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './env';
import { registerRoutes } from './routes';
import { runMonthlyFlow } from './flow/monthlyFlow';
import { RETAIL_BR_EVENTS } from './services/calendarTotal';
import { initRedis } from './cache/redis';
import { listClients, listCalendars, listFlowRuns } from './repos/readRepo';
import { createMonthlyCalendar, createFlowRun } from './repos/calendarRepo';
import { createPostAssetsFromCalendar, setPostStatus, listPostAssets } from './repos/governanceRepo';
import { calendarToCSV, calendarToIclipsPayload } from './exports/exporters';
import { runDailyInsightsJob } from './jobs/cron';
import { runPublishWorkerOnce } from './jobs/publishWorker';
import { runAutopilotJob } from './jobs/autopilot';
import { runExperimentResultsJob } from './jobs/experiments';
import { query } from './db';
import { enqueuePublish } from './repos/publishRepo';
import { authGuard, requirePerm } from './auth/rbac';
import { tenantGuard } from './auth/tenantGuard';
import { requireClientPerm, hasClientPerm } from './auth/clientPerms';
import { audit } from './audit/audit';
import { httpRequests, register as metricsRegistry } from './obs/metrics';

async function requireCalendarClientPerm(params: {
  request: any;
  reply: any;
  calendarId: string;
  perm: 'read' | 'write' | 'review' | 'publish';
}) {
  const { request, reply, calendarId, perm } = params;
  const tenantId = (request.user as any).tenant_id;

  const { rows } = await query<any>(
    `SELECT client_id FROM monthly_calendars WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [calendarId, tenantId]
  );

  const clientId = rows[0]?.client_id;
  if (!clientId) {
    reply.code(404).send({ error: 'client_not_found' });
    return null;
  }

  const allowed = await hasClientPerm({
    tenantId,
    userId: (request.user as any).sub,
    role: (request.user as any).role,
    clientId,
    perm,
  });
  if (!allowed) {
    reply.code(403).send({ error: 'client_forbidden' });
    return null;
  }

  return clientId;
}

export async function buildServer() {
  const app = fastify({
    logger: true,
  });

  if (process.env.REDIS_URL) {
    await initRedis();
  }

  const allowedOriginsList = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [
        'http://localhost:3000',
        'http://localhost:3001',
      ];

  const allowAll = allowedOriginsList.includes('*');

  await app.register(cors, {
    origin: (origin, cb) => {
      if (allowAll || !origin) return cb(null, true);
      const isAllowed = allowedOriginsList.includes(origin);
      cb(null, isAllowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  app.addHook('preHandler', async (request) => {
    const user = request.user as { tenant_id?: string; email?: string } | undefined;
    if (user?.tenant_id || user?.email) {
      request.log = request.log.child({
        tenant_id: user?.tenant_id ?? null,
        user: user?.email ?? null,
      });
    }
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    const contentType = reply.getHeader('content-type');
    if (typeof contentType === 'string' && contentType.startsWith('application/json')) {
      if (!/charset=/i.test(contentType)) {
        reply.header('Content-Type', `${contentType}; charset=utf-8`);
      }
    }
    return payload;
  });

  if (env.ENABLE_METRICS) {
    app.addHook('onResponse', async (request, reply) => {
      const route = (request as any).routerPath || 'unknown';
      httpRequests.inc({
        route,
        method: request.method,
        status: String(reply.statusCode),
      });
    });

    app.get('/metrics', async (_request, reply) => {
      reply.header('Content-Type', metricsRegistry.contentType);
      return metricsRegistry.metrics();
    });
  }

  await registerRoutes(app);

  app.post(
    '/api/flow/monthly-calendar',
    { preHandler: [authGuard, tenantGuard(), requirePerm('calendars:write'), requireClientPerm('write')] },
    async (request: any) => {
      const payload = request.body;
      const tenantId = (request.user as any).tenant_id;
      if (payload?.client) {
        payload.client.tenant_id = tenantId;
      }

      const result = await runMonthlyFlow(RETAIL_BR_EVENTS, payload);
      const calendarId = await createMonthlyCalendar({
        tenantId,
        client: payload.client,
        month: result.month,
        platform: result.platform,
        objective: result.objective,
        posts: result.posts,
        payload: result,
      });

      await createFlowRun({
        tenantId,
        client: payload.client,
        month: result.month,
        platform: result.platform,
        objective: result.objective,
        payload: result,
      });

      await createPostAssetsFromCalendar(calendarId, result.posts, { tenantId });

      return { ...result, calendar_id: calendarId };
    }
  );

  app.get(
    '/api/clients/:id/calendars',
    { preHandler: [authGuard, tenantGuard(), requirePerm('calendars:read'), requireClientPerm('read')] },
    async (request: any) => {
      const { id } = request.params;
      const month = request.query?.month as string | undefined;
      return listCalendars((request.user as any).tenant_id, id, month);
    }
  );

  app.get(
    '/api/clients/:id/runs',
    { preHandler: [authGuard, tenantGuard(), requirePerm('calendars:read'), requireClientPerm('read')] },
    async (request: any) => {
      const { id } = request.params;
      const month = request.query?.month as string | undefined;
      return listFlowRuns((request.user as any).tenant_id, id, month);
    }
  );

  app.get(
    '/api/calendars/:id/posts',
    { preHandler: [authGuard, tenantGuard(), requirePerm('calendars:read')] },
    async (request: any) => {
      const calendarId = request.params.id;
      const { rows: calendars } = await query<any>(
        `SELECT client_id FROM monthly_calendars WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [calendarId, (request.user as any).tenant_id]
      );
      const clientId = calendars[0]?.client_id;
      if (!clientId) return [];

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId,
        perm: 'read',
      });
      if (!allowed) return [];

      return listPostAssets(calendarId, (request.user as any).tenant_id);
    }
  );

  app.post(
    '/api/calendars/:id/posts/bootstrap',
    { preHandler: [authGuard, tenantGuard(), requirePerm('posts:review')] },
    async (request: any, reply: any) => {
      const calendarId = request.params.id;
      const allowed = await requireCalendarClientPerm({
        request,
        reply,
        calendarId,
        perm: 'review',
      });
      if (!allowed) return;

      const posts = request.body?.posts ?? [];
      await createPostAssetsFromCalendar(calendarId, posts, { tenantId: (request.user as any).tenant_id });
      return { ok: true };
    }
  );

  app.post(
    '/api/calendars/:id/posts/:idx/status',
    { preHandler: [authGuard, tenantGuard(), requirePerm('posts:review')] },
    async (request: any) => {
      const calendar_id = request.params.id;
      const post_index = Number(request.params.idx);
      const { status, reviewer, notes } = request.body ?? {};
      const { rows: calendars } = await query<any>(
        `SELECT client_id FROM monthly_calendars WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [calendar_id, (request.user as any).tenant_id]
      );
      const clientId = calendars[0]?.client_id;
      if (!clientId) return { ok: false, error: 'client_not_found' };

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId,
        perm: 'review',
      });
      if (!allowed) return { ok: false, error: 'client_forbidden' };

      const { rows } = await query<any>(
        `SELECT id, status FROM post_assets WHERE calendar_id=$1 AND post_index=$2 AND tenant_id=$3`,
        [calendar_id, post_index, (request.user as any).tenant_id]
      );
      if (!rows[0]) return { ok: false, error: 'not_found' };

      const before = { status: rows[0].status };
      try {
        await setPostStatus({ calendar_id, post_index, status, reviewer, notes });
      } catch (error: any) {
        if (error?.message === 'locked_published_post') {
          return { ok: false, error: 'locked_published_post' };
        }
        throw error;
      }
      await audit({
        actor_user_id: (request.user as any).sub,
        actor_email: (request.user as any).email,
        action: 'POST_STATUS_CHANGED',
        entity_type: 'post_asset',
        entity_id: rows[0].id,
        before,
        after: { status },
        ip: request.ip,
        user_agent: request.headers['user-agent'],
      });
      return { ok: true };
    }
  );

  app.post(
    '/api/calendars/:id/posts/bulk',
    { preHandler: [authGuard, tenantGuard(), requirePerm('posts:review')] },
    async (request: any) => {
      const calendar_id = request.params.id;
      const { action, indices, notes } = request.body ?? {};

      const { rows: calendars } = await query<any>(
        `SELECT client_id FROM monthly_calendars WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [calendar_id, (request.user as any).tenant_id]
      );
      const clientId = calendars[0]?.client_id;
      if (!clientId) return { ok: false, error: 'client_not_found' };

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId,
        perm: 'review',
      });
      if (!allowed) return { ok: false, error: 'client_forbidden' };

      const status =
        action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'review';

      const reviewer = (request.user as { email?: string } | undefined)?.email;
      const unique = Array.isArray(indices) ? Array.from(new Set(indices)) : [];
      for (const idx of unique) {
        const { rows } = await query<any>(
          `SELECT id, status FROM post_assets WHERE calendar_id=$1 AND post_index=$2 AND tenant_id=$3`,
          [calendar_id, Number(idx), (request.user as any).tenant_id]
        );
        if (!rows[0]) continue;
        try {
          await setPostStatus({
            calendar_id,
            post_index: Number(idx),
            status,
            reviewer,
            notes,
          });
        } catch (error: any) {
          if (error?.message === 'locked_published_post') {
            continue;
          }
          throw error;
        }
        await audit({
          actor_user_id: (request.user as any).sub,
          actor_email: (request.user as any).email,
          action: 'POST_STATUS_CHANGED_BULK',
          entity_type: 'post_asset',
          entity_id: rows[0].id,
          before: { status: rows[0].status },
          after: { status },
          ip: request.ip,
          user_agent: request.headers['user-agent'],
        });
      }

      return { ok: true, updated: unique.length };
    }
  );

  app.get(
    '/api/calendars/:id/export.csv',
    { preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')] },
    async (request: any, reply: any) => {
      const calendarId = request.params.id;
      const allowed = await requireCalendarClientPerm({
        request,
        reply,
        calendarId,
        perm: 'read',
      });
      if (!allowed) return;

      const { rows } = await query<any>(
        `SELECT posts, client_id FROM monthly_calendars WHERE id=$1 AND tenant_id=$2`,
        [calendarId, (request.user as any).tenant_id]
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });

      const csv = calendarToCSV(rows[0].posts);
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="calendar-${request.params.id}.csv"`);
      return reply.send(csv);
    }
  );

  app.get(
    '/api/calendars/:id/export.iclips.json',
    { preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')] },
    async (request: any, reply: any) => {
      const calendarId = request.params.id;
      const allowed = await requireCalendarClientPerm({
        request,
        reply,
        calendarId,
        perm: 'read',
      });
      if (!allowed) return;

      const { rows } = await query<any>(
        `SELECT mc.posts, c.id as client_id, c.name as client_name
         FROM monthly_calendars mc JOIN clients c ON c.id=mc.client_id
         WHERE mc.id=$1 AND mc.tenant_id=$2`,
        [calendarId, (request.user as any).tenant_id]
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });

      const payload = calendarToIclipsPayload(rows[0].posts, {
        id: rows[0].client_id,
        name: rows[0].client_name,
      });
      reply.header('Content-Type', 'application/json');
      return reply.send(payload);
    }
  );

  app.get(
    '/api/calendars/:id/briefs',
    { preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')] },
    async (request: any, reply: any) => {
      const calendarId = request.params.id;
      const allowed = await requireCalendarClientPerm({
        request,
        reply,
        calendarId,
        perm: 'read',
      });
      if (!allowed) return;

      const { rows } = await query<any>(
        `SELECT posts FROM monthly_calendars WHERE id=$1 AND tenant_id=$2`,
        [calendarId, (request.user as any).tenant_id]
      );
      if (!rows[0]) return { error: 'not_found' };

      const posts = rows[0].posts ?? [];
      return posts.map((post: any) => ({
        post_id: post.id,
        date: post.date,
        platform: post.platform,
        format: post.format,
        brief: visualBriefFromPost(post),
      }));
    }
  );

  app.post(
    '/api/integrations/iclips/push/:calendarId',
    { preHandler: [authGuard, tenantGuard(), requirePerm('integrations:write')] },
    async (request: any, reply: any) => {
      const calendarId = request.params.calendarId;
      const { url, apiKey } = request.body ?? {};
      if (!url) return reply.code(400).send({ error: 'url_required' });

      const allowed = await requireCalendarClientPerm({
        request,
        reply,
        calendarId,
        perm: 'publish',
      });
      if (!allowed) return;

      const { rows } = await query<any>(
        `SELECT mc.posts, c.id as client_id, c.name as client_name
         FROM monthly_calendars mc JOIN clients c ON c.id=mc.client_id
         WHERE mc.id=$1 AND mc.tenant_id=$2`,
        [calendarId, (request.user as any).tenant_id]
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });

      const payload = calendarToIclipsPayload(rows[0].posts, {
        id: rows[0].client_id,
        name: rows[0].client_name,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      if (!response.ok) {
        return reply.code(502).send({ error: 'iclips_push_failed', status: response.status, body: text });
      }

      return { ok: true, response: text };
    }
  );

  app.post(
    '/api/admin/jobs/insights',
    { preHandler: [authGuard, tenantGuard(), requirePerm('admin:jobs')] },
    async (request: any) => {
      await runDailyInsightsJob((request.user as any).tenant_id);
      return { ok: true };
    }
  );

  app.post(
    '/api/admin/jobs/publish',
    { preHandler: [authGuard, tenantGuard(), requirePerm('admin:jobs')] },
    async () => {
      await runPublishWorkerOnce();
      return { ok: true };
    }
  );

  app.post(
    '/api/admin/jobs/autopilot',
    { preHandler: [authGuard, tenantGuard(), requirePerm('admin:jobs')] },
    async (request: any) => {
      const month = request.body?.month as string | undefined;
      await runAutopilotJob({ tenantId: (request.user as any).tenant_id, month });
      return { ok: true };
    }
  );

  app.post(
    '/api/admin/jobs/experiments',
    { preHandler: [authGuard, tenantGuard(), requirePerm('admin:jobs')] },
    async (request: any) => {
      await runExperimentResultsJob((request.user as any).tenant_id);
      return { ok: true };
    }
  );

  app.post(
    '/api/posts/:postAssetId/schedule',
    { preHandler: [authGuard, tenantGuard(), requirePerm('posts:review')] },
    async (request: any, reply: any) => {
      const { postAssetId } = request.params;
      const { scheduled_for, channel, payload } = request.body ?? {};
      if (!scheduled_for || !channel) {
        return reply.status(400).send({ error: 'scheduled_for_and_channel_required' });
      }

      const { rows } = await query<any>(
        `SELECT pa.id, pa.status, mc.client_id
         FROM post_assets pa
         JOIN monthly_calendars mc ON mc.id = pa.calendar_id
         WHERE pa.id=$1 AND pa.tenant_id=$2
         LIMIT 1`,
        [postAssetId, (request.user as any).tenant_id]
      );
      if (!rows[0]) return reply.status(404).send({ error: 'not_found' });
      if (rows[0].status === 'published') {
        return reply.status(409).send({ error: 'locked_published_post' });
      }

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId: rows[0].client_id,
        perm: 'publish',
      });
      if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });

      await enqueuePublish({
        tenant_id: (request.user as any).tenant_id,
        post_asset_id: postAssetId,
        scheduled_for,
        channel,
        payload,
      });

      await audit({
        actor_user_id: (request.user as any).sub,
        actor_email: (request.user as any).email,
        action: 'POST_SCHEDULED',
        entity_type: 'post_asset',
        entity_id: postAssetId,
        before: { status: rows[0].status },
        after: { status: rows[0].status, scheduled_for, channel },
        ip: request.ip,
        user_agent: request.headers['user-agent'],
      });

      return { ok: true };
    }
  );

  return app;
}

function visualBriefFromPost(post: any) {
  return {
    tom: post.platform === 'LinkedIn' ? 'profissional' : 'popular/dinamico',
    emocao: post.objective === 'conversion' ? 'urgencia' : 'curiosidade',
    estilo_foto:
      String(post.format ?? '').toLowerCase().includes('reels') ||
      String(post.format ?? '').toLowerCase().includes('video')
        ? 'video vertical com acao'
        : 'foto produto + preco claro',
    overlay: {
      headline: post.copy?.headline?.slice(0, 32) ?? '',
      sub: post.copy?.cta?.slice(0, 18) ?? '',
    },
    composicao: 'headline grande + produto + CTA + selo de beneficio',
    elementos_obrigatorios: ['logo', 'preco/beneficio', 'CTA'],
    notas: [`Tema: ${post.theme}`, `Tier: ${post.tier} | Score: ${post.score}`],
  };
}
