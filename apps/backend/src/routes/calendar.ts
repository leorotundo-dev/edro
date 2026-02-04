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
import { generateEventDescription } from '../services/calendarDescriptionService';

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

const RELEVANCE_THRESHOLD = 55;

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

  app.get(
    '/calendar/events/:eventId/relevance',
    { preHandler: [requirePerm('calendars:read')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const eventId = String(request.params.eventId || '');
      if (!eventId) return reply.status(400).send({ error: 'event_id_required' });

      const { rows: events } = await query<any>(
        `SELECT payload, id, name, slug, date_type, date, rule, start_date, end_date,
                scope, country, uf, city, categories, tags, base_relevance,
                segment_boosts, platform_affinity, avoid_segments, is_trend_sensitive, source
         FROM events
         WHERE id=$1 AND (tenant_id=$2 OR tenant_id IS NULL)
         LIMIT 1`,
        [eventId, tenantId]
      );
      if (!events[0]) {
        return reply.status(404).send({ error: 'event_not_found' });
      }
      const payload =
        events[0]?.payload ||
        ({
          id: events[0].id,
          name: events[0].name,
          slug: events[0].slug,
          date_type: events[0].date_type,
          date: events[0].date,
          rule: events[0].rule,
          start_date: events[0].start_date,
          end_date: events[0].end_date,
          scope: events[0].scope,
          country: events[0].country,
          uf: events[0].uf,
          city: events[0].city,
          categories: events[0].categories ?? [],
          tags: events[0].tags ?? [],
          base_relevance: events[0].base_relevance ?? 50,
          segment_boosts: events[0].segment_boosts ?? {},
          platform_affinity: events[0].platform_affinity ?? {},
          avoid_segments: events[0].avoid_segments ?? [],
          is_trend_sensitive: events[0].is_trend_sensitive ?? true,
          source: events[0].source,
        } as any);

      const { rows: clients } = await query<any>(
        `SELECT * FROM clients WHERE tenant_id=$1 ORDER BY name ASC`,
        [tenantId]
      );

      const { rows: overrides } = await query<any>(
        `SELECT calendar_event_id, client_id, force_include, force_exclude, custom_priority, notes
         FROM calendar_event_overrides
         WHERE tenant_id=$1 AND calendar_event_id=$2`,
        [tenantId, eventId]
      );
      const overrideMap = new Map(overrides.map((o) => [o.client_id, o]));

      const items = clients.map((row) => {
        const client = buildClientProfile(row);
        const override = overrideMap.get(client.id);
        if (override?.force_exclude) {
          return {
            client_id: client.id,
            name: client.name,
            score: 0,
            tier: 'C',
            is_relevant: false,
            why: 'override:exclude',
          };
        }
        if (!override?.force_include && !matchesLocality(payload, client)) {
          return {
            client_id: client.id,
            name: client.name,
            score: 0,
            tier: 'C',
            is_relevant: false,
            why: 'locality:mismatch',
          };
        }
        const relevance = scoreEventRelevance(payload, client, override);
        return {
          client_id: client.id,
          name: client.name,
          score: relevance.score,
          tier: relevance.tier,
          is_relevant: relevance.score >= RELEVANCE_THRESHOLD,
          why: relevance.why,
        };
      });

      items.sort((a, b) => b.score - a.score);
      const relevantClientIds = items.filter((item) => item.is_relevant).map((item) => item.client_id);

      return reply.send({
        event_id: eventId,
        relevant_client_ids: relevantClientIds,
        clients: items,
      });
    }
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
      const tier = score >= 80 ? 'A' : score >= RELEVANCE_THRESHOLD ? 'B' : 'C';
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
        if (!override?.force_include && relevance.score < RELEVANCE_THRESHOLD) continue;
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
        if (!override?.force_include && relevance.score < RELEVANCE_THRESHOLD) continue;
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
            if (!override?.force_include && relevance.score < RELEVANCE_THRESHOLD) continue;
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
              isRelevant: relevance.score >= RELEVANCE_THRESHOLD,
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

  // ========================================
  // ENDPOINT: Gerar descrição de evento com IA
  // ========================================
  app.post(
    '/calendar/events/:eventId/description',
    { preHandler: [requirePerm('calendars:write')] },
    async (request: any, reply) => {
      const eventId = String(request.params.eventId || '');
      const tenantId = (request.user as any).tenant_id;

      if (!eventId) {
        return reply.status(400).send({ error: 'event_id_required' });
      }

      // Buscar evento no banco
      const { rows: events } = await query<any>(
        `SELECT id, name, slug, date, categories, tags
         FROM events
         WHERE id=$1 AND (tenant_id=$2 OR tenant_id IS NULL)
         LIMIT 1`,
        [eventId, tenantId]
      );

      if (!events[0]) {
        return reply.status(404).send({ error: 'event_not_found' });
      }

      const event = events[0];

      try {
        const result = await generateEventDescription({
          evento: event.name,
          data: event.date || '',
          tipo_evento: event.categories?.[0] || '',
          tags: event.tags?.join(', ') || '',
        });

        // Salvar descrição no banco (opcional)
        if (result.descricao) {
          await query(
            `UPDATE events SET payload = jsonb_set(
              COALESCE(payload, '{}'),
              '{ai_description}',
              $1::jsonb
            ) WHERE id=$2`,
            [JSON.stringify({
              descricao: result.descricao,
              origem: result.origem,
              curiosidade: result.curiosidade,
              generated_at: new Date().toISOString(),
            }), eventId]
          );
        }

        return reply.send({
          event_id: eventId,
          event_name: event.name,
          ...result,
        });
      } catch (error) {
        console.error('Error generating event description:', error);
        return reply.status(500).send({
          error: 'ai_generation_failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // ========================================
  // ENDPOINT: Buscar descrição de evento por nome
  // ========================================
  app.post(
    '/calendar/describe',
    { preHandler: [requirePerm('calendars:read')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        evento: z.string().min(2),
        data: z.string().optional(),
        tipo_evento: z.string().optional(),
        tags: z.string().optional(),
      });

      const body = bodySchema.parse(request.body);

      try {
        const result = await generateEventDescription({
          evento: body.evento,
          data: body.data || '',
          tipo_evento: body.tipo_evento || '',
          tags: body.tags || '',
        });

        return reply.send(result);
      } catch (error) {
        console.error('Error generating event description:', error);
        return reply.status(500).send({
          error: 'ai_generation_failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // ========================================
  // ENDPOINT: Remover eventos duplicados (Admin)
  // ========================================
  app.post(
    '/calendar/admin/remove-duplicates',
    { preHandler: [requirePerm('admin')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        dryRun: z.boolean().optional().default(true),
      });

      const body = bodySchema.parse(request.body || {});
      const dryRun = body.dryRun;

      const results = {
        dryRun,
        totalEventsBefore: 0,
        totalEventsAfter: 0,
        duplicatesByNameDate: [] as { name: string; date: string; count: number; kept: string; removed: string[] }[],
        duplicatesBySimilarName: [] as { date: string; variations: string[]; kept: string; removed: string[] }[],
        totalRemoved: 0,
      };

      // 1. Contar total de eventos antes
      const { rows: countRows } = await query<{ count: string }>('SELECT COUNT(*) as count FROM events');
      results.totalEventsBefore = parseInt(countRows[0].count, 10);

      // 2. Encontrar duplicados por nome + data exatos
      const { rows: duplicates } = await query<{ name: string; date: string; cnt: string; ids: string[] }>(`
        SELECT
          name,
          date,
          COUNT(*) as cnt,
          array_agg(id ORDER BY created_at ASC) as ids
        FROM events
        WHERE date IS NOT NULL
        GROUP BY name, date
        HAVING COUNT(*) > 1
        ORDER BY cnt DESC, name ASC
      `);

      const idsToRemove: string[] = [];

      for (const dup of duplicates) {
        const count = parseInt(dup.cnt, 10);
        const extraIds = dup.ids.slice(1); // Manter o primeiro (mais antigo)
        idsToRemove.push(...extraIds);

        results.duplicatesByNameDate.push({
          name: dup.name,
          date: dup.date,
          count,
          kept: dup.ids[0],
          removed: extraIds,
        });
      }

      // 3. Encontrar duplicados por nome normalizado + data
      const { rows: similarDups } = await query<{ date: string; normalized: string; cnt: string; ids: string[]; names: string[] }>(`
        SELECT
          date,
          LOWER(TRIM(REGEXP_REPLACE(
            REGEXP_REPLACE(name, '[áàâãä]', 'a', 'gi'),
            '[éèêë]', 'e', 'gi'
          ))) as normalized,
          COUNT(*) as cnt,
          array_agg(id ORDER BY base_relevance DESC) as ids,
          array_agg(name ORDER BY base_relevance DESC) as names
        FROM events
        WHERE date IS NOT NULL
        GROUP BY date, LOWER(TRIM(REGEXP_REPLACE(
          REGEXP_REPLACE(name, '[áàâãä]', 'a', 'gi'),
          '[éèêë]', 'e', 'gi'
        )))
        HAVING COUNT(*) > 1
        ORDER BY cnt DESC
      `);

      // Filtrar apenas os que têm nomes DIFERENTES (variações)
      const realSimilarDups = similarDups.filter(dup => {
        const uniqueNames = new Set(dup.names);
        return uniqueNames.size > 1;
      });

      const similarIdsToRemove: string[] = [];

      for (const dup of realSimilarDups) {
        const extraIds = dup.ids.slice(1);
        similarIdsToRemove.push(...extraIds);

        results.duplicatesBySimilarName.push({
          date: dup.date,
          variations: dup.names,
          kept: dup.ids[0],
          removed: extraIds,
        });
      }

      // 4. Remover duplicados se não for dry-run
      const allIdsToRemove = [...new Set([...idsToRemove, ...similarIdsToRemove])];

      if (!dryRun && allIdsToRemove.length > 0) {
        // Deletar em lotes de 100
        const batchSize = 100;
        for (let i = 0; i < allIdsToRemove.length; i += batchSize) {
          const batch = allIdsToRemove.slice(i, i + batchSize);
          const placeholders = batch.map((_, idx) => `$${idx + 1}`).join(',');
          await query(`DELETE FROM events WHERE id IN (${placeholders})`, batch);
        }
      }

      results.totalRemoved = dryRun ? 0 : allIdsToRemove.length;

      // 5. Contar total de eventos depois
      const { rows: finalCount } = await query<{ count: string }>('SELECT COUNT(*) as count FROM events');
      results.totalEventsAfter = parseInt(finalCount[0].count, 10);

      return reply.send({
        success: true,
        message: dryRun
          ? `Modo dry-run: ${allIdsToRemove.length} eventos seriam removidos`
          : `${results.totalRemoved} eventos duplicados removidos`,
        ...results,
        duplicatesFound: {
          byExactNameDate: results.duplicatesByNameDate.length,
          bySimilarName: results.duplicatesBySimilarName.length,
          totalIdsToRemove: allIdsToRemove.length,
        },
      });
    }
  );
}
