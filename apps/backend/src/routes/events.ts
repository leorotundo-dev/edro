import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { upsertEvents, listEvents, reviewEvent } from '../repos/eventsRepo';
import type { CalendarEvent } from '../types';
import { parseCalendarCsv } from '../services/calendarCsv';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

export default async function eventsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get('/events', { preHandler: [requirePerm('events:read')] }, async (request: any) => {
    const querySchema = z.object({
      status: z.string().optional(),
      source: z.string().optional(),
      year: z.string().optional(),
      limit: z.string().optional(),
    });

    const query = querySchema.parse(request.query);
    const year = query.year ? Number(query.year) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;

    return listEvents({
      tenantId: (request.user as any).tenant_id,
      status: query.status as any,
      source: query.source ?? null,
      year: Number.isNaN(year) ? undefined : year,
      limit,
    });
  });

  app.post('/events/:id/review', { preHandler: [requirePerm('events:review')] }, async (request: any, reply) => {
    const paramsSchema = z.object({ id: z.string().min(1) });
    const bodySchema = z.object({
      status: z.enum(['approved', 'rejected']),
    });

    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    const updated = await reviewEvent({
      id: params.id,
      status: body.status,
      reviewer: (request.user as any).email ?? null,
      tenantId: (request.user as any).tenant_id,
    });

    if (!updated) return reply.code(404).send({ error: 'event_not_found' });
    return updated;
  });

  app.post('/events/import/holidays', { preHandler: [requirePerm('events:review')] }, async (request: any) => {
    const bodySchema = z.object({
      year: z.number().int().min(2000).max(2100).optional(),
    });
    const body = bodySchema.parse(request.body || {});
    const year = body.year ?? new Date().getFullYear();
    const url = `https://brasilapi.com.br/api/feriados/v1/${year}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`holiday_api_failed_${response.status}`);
    }

    const payload = (await response.json()) as Array<{ date: string; name: string; type?: string }>;

    const events: CalendarEvent[] = payload.map((holiday) => {
      const slug = slugify(holiday.name);
      return {
        id: `holiday_br_${year}_${slug}`,
        name: holiday.name,
        slug,
        date_type: 'fixed',
        date: holiday.date as any,
        scope: 'BR',
        country: 'BR',
        categories: ['oficial'],
        tags: [slug],
        base_relevance: 75,
        segment_boosts: {},
        platform_affinity: {},
        avoid_segments: [],
        is_trend_sensitive: false,
        source: 'holiday_api:brasilapi',
      };
    });

    await upsertEvents(events, `holidays_${year}`, {
      tenantId: (request.user as any).tenant_id,
      status: 'approved',
      reviewedBy: (request.user as any).email ?? 'system',
      sourceUrl: url,
    });

    return { ok: true, count: events.length, source: url };
  });

  app.post('/events/import/csv', { preHandler: [requirePerm('events:review')] }, async (request: any) => {
    const bodySchema = z.object({
      url: z.string().url(),
      sourceLabel: z.string().optional(),
      defaults: z
        .object({
          country: z.string().optional(),
          scope: z.enum(['global', 'BR', 'UF', 'CITY']).optional(),
          category: z.string().optional(),
        })
        .optional(),
    });

    const body = bodySchema.parse(request.body || {});
    const response = await fetch(body.url);
    if (!response.ok) {
      throw new Error(`csv_fetch_failed_${response.status}`);
    }

    const csvText = await response.text();
    const defaults = {
      country: body.defaults?.country ?? 'BR',
      scope: body.defaults?.scope ?? 'BR',
      category: body.defaults?.category ?? null,
    };

    const { events, errors } = parseCalendarCsv(csvText, {
      sourceLabel: body.sourceLabel || 'calendar_csv',
      sourceUrl: body.url,
      defaults,
    });

    await upsertEvents(events as CalendarEvent[], `csv_${Date.now()}`, {
      tenantId: (request.user as any).tenant_id,
      status: 'approved',
      reviewedBy: (request.user as any).email ?? 'system',
      sourceUrl: body.url,
    });

    return { ok: true, count: events.length, approved: events.length, errors };
  });
}
