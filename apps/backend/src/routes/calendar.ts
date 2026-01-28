import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  PLATFORM_PROFILES,
  RETAIL_BR_EVENTS,
  expandEventsForMonth,
  generateMonthlyCalendar,
  matchesLocality,
  scoreEventRelevance,
  type ClientProfile,
} from '../services/calendarTotal';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm } from '../auth/clientPerms';
import { listApprovedEventsForYear } from '../repos/eventsRepo';
import { listOverridesForClient, upsertOverride } from '../repos/calendarOverridesRepo';
import { upsertRelevance } from '../repos/calendarRelevanceRepo';
import { query } from '../db';

const platformSchema = z.enum([
  'Instagram',
  'TikTok',
  'LinkedIn',
  'YouTube',
  'X',
  'Pinterest',
  'MetaAds',
  'GoogleAds',
  'EmailMarketing',
]);

const objectiveSchema = z.enum(['awareness', 'engagement', 'conversion', 'leads']);

const toneSchema = z.enum(['conservative', 'balanced', 'bold']);
const riskSchema = z.enum(['low', 'medium', 'high']);

const calendarProfileSchema = z.object({
  enable_calendar_total: z.boolean().optional().default(true),
  calendar_weight: z.number().min(0).max(100).optional().default(60),
  retail_mode: z.boolean().optional().default(true),
  allow_cultural_opportunities: z.boolean().optional().default(true),
  allow_geek_pop: z.boolean().optional().default(true),
  allow_profession_days: z.boolean().optional().default(true),
  restrict_sensitive_causes: z.boolean().optional().default(false),
});

const trendProfileSchema = z.object({
  enable_trends: z.boolean().optional().default(false),
  trend_weight: z.number().min(0).max(100).optional().default(40),
  sources: z.array(z.string()).optional().default([]),
});

const clientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  country: z.string().min(2),
  uf: z.string().optional(),
  city: z.string().optional(),
  segment_primary: z.string().min(2),
  segment_secondary: z.array(z.string()).optional().default([]),
  tone_profile: toneSchema,
  risk_tolerance: riskSchema,
  calendar_profile: calendarProfileSchema,
  trend_profile: trendProfileSchema,
  platform_preferences: z
    .record(
      z.object({
        preferredFormats: z.array(z.string()).optional(),
        blockedFormats: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

const monthParamSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

const generateCalendarSchema = z.object({
  client: clientSchema,
  platform: platformSchema,
  month: z.string().regex(/^\d{4}-\d{2}$/),
  objective: objectiveSchema,
  postsPerWeek: z.number().int().min(1).max(14).optional().default(3),
});

function buildClientProfile(row: any): ClientProfile {
  const profile = row.profile || {};
  return {
    id: row.id,
    name: row.name,
    tenant_id: row.tenant_id ?? profile.tenant_id,
    country: row.country || profile.country || 'BR',
    uf: row.uf || profile.uf || undefined,
    city: row.city || profile.city || undefined,
    segment_primary: (row.segment_primary || profile.segment_primary || 'varejo_supermercado') as any,
    segment_secondary: Array.isArray(row.segment_secondary)
      ? row.segment_secondary
      : Array.isArray(profile.segment_secondary)
        ? profile.segment_secondary
        : [],
    tone_profile: (profile.tone_profile || 'balanced') as any,
    risk_tolerance: (profile.risk_tolerance || 'medium') as any,
    keywords: Array.isArray(profile.keywords) ? profile.keywords : [],
    pillars: Array.isArray(profile.pillars) ? profile.pillars : [],
    knowledge_base: profile.knowledge_base || undefined,
    calendar_profile: {
      enable_calendar_total: true,
      calendar_weight: 60,
      retail_mode: true,
      allow_cultural_opportunities: true,
      allow_geek_pop: true,
      allow_profession_days: true,
      restrict_sensitive_causes: false,
      ...(profile.calendar_profile || {}),
    },
    trend_profile: {
      enable_trends: false,
      trend_weight: 40,
      sources: [],
      ...(profile.trend_profile || {}),
    },
    platform_preferences: profile.platform_preferences || undefined,
  };
}

function toMonthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function listMonthsBetween(from: Date, to: Date) {
  const months: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    months.push(toMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function isIsoInRange(dateISO: string, fromISO: string, toISO: string) {
  return dateISO >= fromISO && dateISO <= toISO;
}

async function buildSourceEvents(params: {
  tenantId: string;
  client: ClientProfile;
  year: number;
}) {
  const approvedEvents = await listApprovedEventsForYear({
    tenantId: params.tenantId,
    year: params.year,
    country: params.client.country,
  });
  return approvedEvents.length ? approvedEvents : RETAIL_BR_EVENTS;
}

async function buildGlobalEvents(params: { tenantId: string; year: number; country: string }) {
  const approvedEvents = await listApprovedEventsForYear({
    tenantId: params.tenantId,
    year: params.year,
    country: params.country,
  });
  return approvedEvents.length ? approvedEvents : RETAIL_BR_EVENTS;
}

export default async function calendarRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get('/platforms', { preHandler: [requirePerm('calendars:read')] }, async () => PLATFORM_PROFILES);

  app.get(
    '/calendar/events/retail-br',
    { preHandler: [requirePerm('calendars:read')] },
    async () => RETAIL_BR_EVENTS
  );

  app.get('/calendar/events/:month', { preHandler: [requirePerm('calendars:read')] }, async (request, reply) => {
    const params = monthParamSchema.parse(request.params);
    const tenantId = (request.user as any).tenant_id;
    const country =
      typeof (request.query as any)?.country === 'string' ? (request.query as any).country : 'BR';
    const year = Number(params.month.split('-')[0]);
    const sourceEvents = await buildGlobalEvents({ tenantId, year, country });
    const hits = expandEventsForMonth(sourceEvents, params.month);

    const days: Record<string, any[]> = {};
    let totalEvents = 0;

    for (const hit of hits) {
      const score = Number(hit.event.base_relevance ?? 50);
      const tier = score >= 80 ? 'A' : score >= 55 ? 'B' : 'C';
      for (const date of hit.hitDates) {
        if (!days[date]) days[date] = [];
        days[date].push({
          id: hit.event.id,
          name: hit.event.name,
          slug: hit.event.slug,
          categories: hit.event.categories,
          tags: hit.event.tags,
          source: hit.event.source,
          score,
          tier,
          why: `base_relevance:${score}`,
        });
        totalEvents += 1;
      }
    }

    for (const date of Object.keys(days)) {
      days[date].sort((a, b) => b.score - a.score);
    }

    return reply.send({
      month: params.month,
      client_id: 'global',
      total_events: totalEvents,
      days,
    });
  });

  app.get(
    '/clients/:clientId/calendar/month/:month',
    { preHandler: [requirePerm('calendars:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const params = monthParamSchema.parse(request.params);
      const clientId = request.params.clientId as string;
      const tenantId = (request.user as any).tenant_id;

      const { rows: clients } = await query<any>(
        `SELECT * FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [clientId, tenantId]
      );
      if (!clients[0]) {
        return reply.status(404).send({ error: 'client_not_found' });
      }

      const client = buildClientProfile(clients[0]);
      const year = Number(params.month.split('-')[0]);
      const sourceEvents = await buildSourceEvents({ tenantId, client, year });
      const hits = expandEventsForMonth(sourceEvents, params.month);
      const overrides = await listOverridesForClient({ tenantId, clientId: client.id });
      const overrideMap = new Map(overrides.map((o) => [o.calendar_event_id, o]));

      const days: Record<string, any[]> = {};
      let totalEvents = 0;

      for (const hit of hits) {
        const override = overrideMap.get(hit.event.id);
        if (override?.force_exclude) continue;
        if (!override?.force_include && !matchesLocality(hit.event, client)) continue;

        const relevance = scoreEventRelevance(hit.event, client, override);
        for (const date of hit.hitDates) {
          if (!days[date]) days[date] = [];
          days[date].push({
            id: hit.event.id,
            name: hit.event.name,
            slug: hit.event.slug,
            categories: hit.event.categories,
            tags: hit.event.tags,
            source: hit.event.source,
            score: relevance.score,
            tier: relevance.tier,
            why: relevance.why,
          });
          totalEvents += 1;
        }
      }

      for (const date of Object.keys(days)) {
        days[date].sort((a, b) => b.score - a.score);
      }

      return reply.send({
        month: params.month,
        client_id: client.id,
        total_events: totalEvents,
        days,
      });
    }
  );

  app.get(
    '/clients/:clientId/calendar/day/:date',
    { preHandler: [requirePerm('calendars:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const clientId = request.params.clientId as string;
      const dateISO = String(request.params.date);
      const tenantId = (request.user as any).tenant_id;

      const { rows: clients } = await query<any>(
        `SELECT * FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [clientId, tenantId]
      );
      if (!clients[0]) return reply.status(404).send({ error: 'client_not_found' });

      const client = buildClientProfile(clients[0]);
      const date = new Date(dateISO);
      if (Number.isNaN(date.getTime())) {
        return reply.status(400).send({ error: 'invalid_date' });
      }

      const sourceEvents = await buildSourceEvents({ tenantId, client, year: date.getFullYear() });
      const hits = expandEventsForMonth(sourceEvents, toMonthKey(date));
      const overrides = await listOverridesForClient({ tenantId, clientId: client.id });
      const overrideMap = new Map(overrides.map((o) => [o.calendar_event_id, o]));

      const items: any[] = [];
      for (const hit of hits) {
        if (!hit.hitDates.includes(dateISO)) continue;
        const override = overrideMap.get(hit.event.id);
        if (override?.force_exclude) continue;
        if (!override?.force_include && !matchesLocality(hit.event, client)) continue;
        const relevance = scoreEventRelevance(hit.event, client, override);
        items.push({
          id: hit.event.id,
          name: hit.event.name,
          slug: hit.event.slug,
          categories: hit.event.categories,
          tags: hit.event.tags,
          source: hit.event.source,
          score: relevance.score,
          tier: relevance.tier,
          why: relevance.why,
        });
      }

      items.sort((a, b) => b.score - a.score);
      return reply.send({ date: dateISO, client_id: client.id, items });
    }
  );

  app.get(
    '/clients/:clientId/calendar/today',
    { preHandler: [requirePerm('calendars:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const today = new Date();
      const dateISO = today.toISOString().slice(0, 10);
      request.params.date = dateISO;
      return app.inject({
        method: 'GET',
        url: `/clients/${request.params.clientId}/calendar/day/${dateISO}`,
        headers: request.headers,
      }).then((res) => reply.status(res.statusCode).send(res.json()));
    }
  );

  app.get(
    '/clients/:clientId/calendar/upcoming',
    { preHandler: [requirePerm('calendars:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const clientId = request.params.clientId as string;
      const tenantId = (request.user as any).tenant_id;
      const fromISO = String(request.query.from || new Date().toISOString().slice(0, 10));
      const days = Math.max(1, Math.min(60, Number(request.query.days ?? 14)));
      const fromDate = new Date(fromISO);
      if (Number.isNaN(fromDate.getTime())) {
        return reply.status(400).send({ error: 'invalid_date' });
      }
      const toDate = new Date(fromDate);
      toDate.setDate(toDate.getDate() + days);
      const toISO = toDate.toISOString().slice(0, 10);

      const { rows: clients } = await query<any>(
        `SELECT * FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [clientId, tenantId]
      );
      if (!clients[0]) return reply.status(404).send({ error: 'client_not_found' });

      const client = buildClientProfile(clients[0]);
      const months = listMonthsBetween(fromDate, toDate);
      const overrides = await listOverridesForClient({ tenantId, clientId: client.id });
      const overrideMap = new Map(overrides.map((o) => [o.calendar_event_id, o]));

      const items: any[] = [];
      for (const month of months) {
        const year = Number(month.split('-')[0]);
        const sourceEvents = await buildSourceEvents({ tenantId, client, year });
        const hits = expandEventsForMonth(sourceEvents, month);
        for (const hit of hits) {
          for (const dateISO of hit.hitDates) {
            if (!isIsoInRange(dateISO, fromISO, toISO)) continue;
            const override = overrideMap.get(hit.event.id);
            if (override?.force_exclude) continue;
            if (!override?.force_include && !matchesLocality(hit.event, client)) continue;
            const relevance = scoreEventRelevance(hit.event, client, override);
            items.push({
              date: dateISO,
              id: hit.event.id,
              name: hit.event.name,
              slug: hit.event.slug,
              categories: hit.event.categories,
              tags: hit.event.tags,
              source: hit.event.source,
              score: relevance.score,
              tier: relevance.tier,
              why: relevance.why,
            });
          }
        }
      }

      items.sort((a, b) => (a.date === b.date ? b.score - a.score : a.date.localeCompare(b.date)));
      return reply.send({ from: fromISO, to: toISO, client_id: client.id, items });
    }
  );

  app.get(
    '/clients/:clientId/calendar/overrides',
    { preHandler: [requirePerm('calendars:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const clientId = request.params.clientId as string;
      const overrides = await listOverridesForClient({ tenantId, clientId });
      return reply.send({ client_id: clientId, overrides });
    }
  );

  app.post(
    '/clients/:clientId/calendar/overrides',
    { preHandler: [requirePerm('calendars:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const clientId = request.params.clientId as string;
      const bodySchema = z.object({
        calendar_event_id: z.string().min(1),
        force_include: z.boolean().optional(),
        force_exclude: z.boolean().optional(),
        custom_priority: z.number().min(1).max(10).optional().nullable(),
        notes: z.string().optional().nullable(),
      });
      const body = bodySchema.parse(request.body);

      const saved = await upsertOverride({
        tenantId,
        clientId,
        calendarEventId: body.calendar_event_id,
        forceInclude: body.force_include ?? false,
        forceExclude: body.force_exclude ?? false,
        customPriority: body.custom_priority ?? null,
        notes: body.notes ?? null,
      });
      return reply.send({ override: saved });
    }
  );

  app.post(
    '/clients/:clientId/calendar/relevance/recalculate',
    { preHandler: [requirePerm('calendars:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const clientId = request.params.clientId as string;
      const bodySchema = z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      });
      const body = bodySchema.parse(request.body || {});
      const fromISO = body.from ?? new Date().toISOString().slice(0, 10);
      const toISO = body.to ?? fromISO;
      const fromDate = new Date(fromISO);
      const toDate = new Date(toISO);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return reply.status(400).send({ error: 'invalid_date_range' });
      }

      const { rows: clients } = await query<any>(
        `SELECT * FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [clientId, tenantId]
      );
      if (!clients[0]) return reply.status(404).send({ error: 'client_not_found' });

      const client = buildClientProfile(clients[0]);
      const months = listMonthsBetween(fromDate, toDate);
      const overrides = await listOverridesForClient({ tenantId, clientId: client.id });
      const overrideMap = new Map(overrides.map((o) => [o.calendar_event_id, o]));

      const touched = new Set<string>();
      for (const month of months) {
        const year = Number(month.split('-')[0]);
        const sourceEvents = await buildSourceEvents({ tenantId, client, year });
        const hits = expandEventsForMonth(sourceEvents, month);
        for (const hit of hits) {
          for (const dateISO of hit.hitDates) {
            if (!isIsoInRange(dateISO, fromISO, toISO)) continue;
            if (touched.has(hit.event.id)) continue;
            const override = overrideMap.get(hit.event.id);
            if (override?.force_exclude) continue;
            if (!override?.force_include && !matchesLocality(hit.event, client)) continue;
            const relevance = scoreEventRelevance(hit.event, client, override);
            await upsertRelevance({
              tenantId,
              clientId: client.id,
              calendarEventId: hit.event.id,
              relevanceScore: relevance.score,
              isRelevant: relevance.score >= 55,
              relevanceReason: { why: relevance.why, tier: relevance.tier },
            });
            touched.add(hit.event.id);
          }
        }
      }

      return reply.send({ client_id: client.id, updated: touched.size, from: fromISO, to: toISO });
    }
  );

  app.post(
    '/calendar/generate',
    { preHandler: [requirePerm('calendars:write'), requireClientPerm('write')] },
    async (request, reply) => {
    const body = generateCalendarSchema.parse(request.body);
    const client = body.client as ClientProfile;

    const posts = await generateMonthlyCalendar({
      client,
      platform: body.platform,
      month: body.month,
      objective: body.objective,
      postsPerWeek: body.postsPerWeek,
    });

    return reply.send({
      month: body.month,
      platform: body.platform,
      count: posts.length,
      posts,
    });
  });
}
