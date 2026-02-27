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
import { enrichCalendarEvent } from '../jobs/calendarEnrichmentWorker';
import { scrapeInspirations } from '../jobs/calendarInspirationWorker';
import { generateCompletion } from '../services/ai/openaiService';
import { computeGeoFactorWithMode, normalizeGeoMode, type GeoMode } from '../clipping/geo';
import { matchesWordBoundary } from '../clipping/scoring';

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
const TIER_A_THRESHOLD = 80;

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

type CalendarClientProfile = ClientProfile & {
  negative_keywords?: string[];
  clipping?: {
    geo_mode?: GeoMode | null;
    required_keywords?: string[];
  };
};

type CalendarRelevanceResult = {
  score: number;
  tier: 'A' | 'B' | 'C';
  why: string;
};

function normalizeSearchText(value: unknown): string {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function slugify(value: string): string {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

function normalizeStringList(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n;|]/g)
      : [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const entry of source) {
    const text = String(entry || '').trim();
    if (!text) continue;
    const key = normalizeSearchText(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }
  return output;
}

function normalizeKeywords(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const list: string[] = [];
  for (const value of values) {
    const normalized = normalizeSearchText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    list.push(normalized);
  }
  return list;
}

function buildEventSearchText(event: any): string {
  const tags = Array.isArray(event?.tags) ? event.tags : [];
  const categories = Array.isArray(event?.categories) ? event.categories : [];
  const fields = [
    event?.name,
    event?.slug,
    event?.source,
    event?.city,
    event?.uf,
    event?.country,
    ...tags,
    ...categories,
  ];
  return fields
    .map((item) => normalizeSearchText(item))
    .filter(Boolean)
    .join(' ')
    .trim();
}

function collectMatchedTerms(text: string, terms: string[]): string[] {
  if (!terms.length || !text) return [];
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const term of terms) {
    if (!term || seen.has(term)) continue;
    if (!matchesWordBoundary(text, term)) continue;
    seen.add(term);
    hits.push(term);
  }
  return hits;
}

function computeTierFromScore(score: number): 'A' | 'B' | 'C' {
  if (score >= TIER_A_THRESHOLD) return 'A';
  if (score >= RELEVANCE_THRESHOLD) return 'B';
  return 'C';
}

function computeClientNameTerms(name: string): string[] {
  const normalizedName = normalizeSearchText(name);
  if (!normalizedName) return [];
  return normalizeKeywords(
    normalizedName
      .split(/[^a-z0-9]+/g)
      .filter((token) => token.length >= 3)
  );
}

function scoreCalendarBusinessPriority(event: any, client: CalendarClientProfile) {
  const text = buildEventSearchText(event);
  const requiredKeywords = normalizeKeywords(client.clipping?.required_keywords);
  const strategicKeywords = normalizeKeywords([...(client.keywords || []), ...(client.pillars || [])]);
  const clientNameTerms = computeClientNameTerms(client.name);

  const requiredHits = collectMatchedTerms(text, requiredKeywords);
  const requiredSet = new Set(requiredHits);
  const strategicHits = collectMatchedTerms(
    text,
    strategicKeywords.filter((term) => !requiredSet.has(term))
  );
  const strategicSet = new Set([...requiredSet, ...strategicHits]);
  const nameHits = collectMatchedTerms(
    text,
    clientNameTerms.filter((term) => !strategicSet.has(term))
  );

  const requiredBoost = Math.min(24, requiredHits.length * 6);
  const strategicBoost = Math.min(15, strategicHits.length * 3);
  const nameBoost = Math.min(8, nameHits.length * 4);
  const boost = requiredBoost + strategicBoost + nameBoost;

  return {
    boost,
    requiredHits,
    strategicHits,
    nameHits,
    requiredBoost,
    strategicBoost,
    nameBoost,
  };
}

function scoreCalendarEventForClient(
  event: any,
  client: CalendarClientProfile,
  override?: { force_exclude?: boolean | null; force_include?: boolean | null; custom_priority?: number | null } | null
): CalendarRelevanceResult {
  const baseRaw = scoreEventRelevance(event, client, override as any);
  const base: CalendarRelevanceResult = {
    score: Number(baseRaw.score || 0),
    tier:
      baseRaw.tier === 'A' || baseRaw.tier === 'B' || baseRaw.tier === 'C'
        ? baseRaw.tier
        : computeTierFromScore(Number(baseRaw.score || 0)),
    why: String(baseRaw.why || ''),
  };
  if (override?.force_exclude) return base;

  const business = scoreCalendarBusinessPriority(event, client);
  if (business.boost <= 0) return base;

  const score = Math.max(0, Math.min(100, Math.round(base.score + business.boost)));
  const tier = computeTierFromScore(score);
  const businessWhy = [
    business.requiredBoost ? `business:req:+${business.requiredBoost}` : '',
    business.strategicBoost ? `business:strategic:+${business.strategicBoost}` : '',
    business.nameBoost ? `business:name:+${business.nameBoost}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
  const why = [base.why, businessWhy].filter(Boolean).join(' | ');

  return { score, tier, why };
}

function passesCalendarBusinessFilters(
  event: any,
  client: CalendarClientProfile
): { ok: true } | { ok: false; reason: string } {
  const requiredKeywords = normalizeKeywords(client.clipping?.required_keywords);
  const negativeKeywords = normalizeKeywords(client.negative_keywords);
  const text = buildEventSearchText(event);

  if (
    requiredKeywords.length &&
    !requiredKeywords.some((keyword) => matchesWordBoundary(text, keyword))
  ) {
    return { ok: false, reason: 'business:required_keywords_missing' };
  }

  if (negativeKeywords.some((keyword) => matchesWordBoundary(text, keyword))) {
    return { ok: false, reason: 'business:negative_keyword_match' };
  }

  const geoMode = normalizeGeoMode(client.clipping?.geo_mode);
  const geo = computeGeoFactorWithMode({
    mode: geoMode,
    client: {
      country: client.country,
      uf: client.uf,
      city: client.city,
    },
    item: {
      country: event?.country,
      uf: event?.uf,
      city: event?.city,
    },
  });

  if (geo.factor <= 0) {
    return { ok: false, reason: `business:geo:${geo.reason}` };
  }

  return { ok: true };
}

function checkCalendarEventEligibility(
  event: any,
  client: CalendarClientProfile,
  override?: { force_exclude?: boolean | null; force_include?: boolean | null } | null
): { ok: true } | { ok: false; reason: string } {
  if (override?.force_exclude) return { ok: false, reason: 'override:exclude' };
  if (override?.force_include) return { ok: true };
  const targetClientIds = normalizeStringList(
    Array.isArray(event?.target_client_ids)
      ? event.target_client_ids
      : Array.isArray(event?.payload?.target_client_ids)
        ? event.payload.target_client_ids
        : []
  );
  if (targetClientIds.length && !targetClientIds.includes(client.id)) {
    return { ok: false, reason: 'target_client:mismatch' };
  }
  if (!matchesLocality(event, client)) return { ok: false, reason: 'locality:mismatch' };
  return passesCalendarBusinessFilters(event, client);
}

function buildClientProfile(row: any): CalendarClientProfile {
  const profile = row.profile || {};
  const clipping = profile.clipping || {};
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
    negative_keywords: normalizeKeywords(profile.negative_keywords),
    clipping: {
      geo_mode: normalizeGeoMode(clipping.geo_mode),
      required_keywords: normalizeKeywords(clipping.required_keywords),
    },
  };
}

const CALENDAR_NAME_STOPWORDS = new Set([
  'dia',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'a',
  'o',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'internacional',
  'nacional',
  'mundial',
]);

function tokenizeCalendarName(name: unknown) {
  return normalizeSearchText(name)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !CALENDAR_NAME_STOPWORDS.has(token));
}

function buildCalendarTokenSet(name: unknown) {
  return new Set(tokenizeCalendarName(name));
}

function countIntersection(a: Set<string>, b: Set<string>) {
  let count = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const token of small) {
    if (large.has(token)) count += 1;
  }
  return count;
}

function areEquivalentCalendarNames(aName: unknown, bName: unknown) {
  const aNorm = normalizeSearchText(aName);
  const bNorm = normalizeSearchText(bName);
  if (!aNorm || !bNorm) return false;
  if (aNorm === bNorm) return true;

  const aSet = buildCalendarTokenSet(aName);
  const bSet = buildCalendarTokenSet(bName);
  if (!aSet.size || !bSet.size) return false;

  const intersection = countIntersection(aSet, bSet);
  const minSize = Math.min(aSet.size, bSet.size);
  const maxSize = Math.max(aSet.size, bSet.size);
  const subset = intersection === minSize;
  if (subset) {
    if (minSize >= 2) return true;
    const only = Array.from(aSet.size <= bSet.size ? aSet : bSet)[0] || '';
    if (only.length >= 6) return true;
  }

  const overlap = intersection / maxSize;
  return overlap >= 0.8;
}

function calendarNameSpecificity(name: unknown) {
  const tokens = tokenizeCalendarName(name);
  const tokenScore = tokens.length * 10;
  const textScore = normalizeSearchText(name).length;
  return tokenScore + textScore / 100;
}

function pickPreferredCalendarItem<T extends { name?: string; score?: number }>(a: T, b: T) {
  const aSpecificity = calendarNameSpecificity(a.name);
  const bSpecificity = calendarNameSpecificity(b.name);
  if (aSpecificity !== bSpecificity) return aSpecificity > bSpecificity ? a : b;

  const aScore = Number(a.score || 0);
  const bScore = Number(b.score || 0);
  if (aScore !== bScore) return aScore > bScore ? a : b;

  const aLen = normalizeSearchText(a.name).length;
  const bLen = normalizeSearchText(b.name).length;
  return aLen >= bLen ? a : b;
}

function dedupeCalendarItems<T extends { name?: string; score?: number; date?: string }>(
  items: T[],
  options?: { byDate?: boolean }
) {
  const byDate = Boolean(options?.byDate);
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const groupKey = byDate ? String(item.date || '') : '__single__';
    const bucket = groups.get(groupKey) || [];
    let merged = false;

    for (let i = 0; i < bucket.length; i += 1) {
      if (!areEquivalentCalendarNames(bucket[i]?.name, item?.name)) continue;
      bucket[i] = pickPreferredCalendarItem(bucket[i], item);
      merged = true;
      break;
    }

    if (!merged) bucket.push(item);
    groups.set(groupKey, bucket);
  }

  return Array.from(groups.values()).flat();
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

  app.post(
    '/calendar/events/manual',
    { preHandler: [requirePerm('calendars:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const bodySchema = z.object({
        name: z.string().min(2).max(180),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        relevance_score: z.number().min(0).max(100).optional(),
        client_id: z.string().optional().nullable(),
      });
      const body = bodySchema.parse(request.body || {});

      let clientRow: any | null = null;
      if (body.client_id) {
        const { rows } = await query<any>(
          `SELECT * FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
          [body.client_id, tenantId]
        );
        if (!rows[0]) return reply.status(404).send({ error: 'client_not_found' });
        clientRow = rows[0];
      }

      const eventName = body.name.trim();
      const eventSlug = slugify(eventName) || 'evento-manual';
      const baseRelevance = Math.max(0, Math.min(100, Math.round(Number(body.relevance_score ?? 70))));
      const dateISO = body.date;
      const country = String(clientRow?.country || 'BR').toUpperCase();
      const uf = clientRow?.uf ? String(clientRow.uf).toUpperCase() : null;
      const city = clientRow?.city ? String(clientRow.city).trim() : null;
      const scope = city ? 'CITY' : uf ? 'UF' : country === 'BR' ? 'BR' : 'global';
      const categories = ['manual'];
      const tags = ['manual', eventSlug];

      const suffix = Math.random().toString(36).slice(2, 8);
      const eventId = `manual_${String(tenantId).slice(0, 8)}_${dateISO.replace(/-/g, '')}_${eventSlug}_${suffix}`;
      const payload: any = {
        id: eventId,
        name: eventName,
        slug: eventSlug,
        date_type: 'fixed',
        date: dateISO,
        rule: null,
        start_date: null,
        end_date: null,
        scope,
        country,
        uf,
        city,
        categories,
        tags,
        base_relevance: baseRelevance,
        segment_boosts: {},
        platform_affinity: {},
        avoid_segments: [],
        is_trend_sensitive: true,
        source: 'manual:calendar-ui',
      };
      if (clientRow?.id) payload.target_client_ids = [clientRow.id];

      const eventYear = Number(dateISO.slice(0, 4));
      await query(
        `INSERT INTO events (
           id, name, slug, date_type, date, rule, start_date, end_date,
           scope, country, uf, city, categories, tags, base_relevance,
           segment_boosts, platform_affinity, avoid_segments, is_trend_sensitive,
           source, payload, status, reviewed_by, reviewed_at, source_url, year, tenant_id
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,
           $9,$10,$11,$12,$13,$14,$15,
           $16::jsonb,$17::jsonb,$18,$19,
           $20,$21::jsonb,$22,$23,$24,$25,$26,$27
         )`,
        [
          eventId,
          eventName,
          eventSlug,
          'fixed',
          dateISO,
          null,
          null,
          null,
          scope,
          country,
          uf,
          city,
          categories,
          tags,
          baseRelevance,
          JSON.stringify({}),
          JSON.stringify({}),
          [],
          true,
          'manual:calendar-ui',
          JSON.stringify(payload),
          'approved',
          (request.user as any)?.email ?? null,
          new Date().toISOString(),
          null,
          Number.isNaN(eventYear) ? null : eventYear,
          tenantId,
        ]
      );

      let override: any = null;
      let score = baseRelevance;
      let tier: 'A' | 'B' | 'C' = computeTierFromScore(score);
      let why = `base_relevance:${score}`;

      if (clientRow?.id) {
        override = await upsertOverride({
          tenantId,
          clientId: clientRow.id,
          calendarEventId: eventId,
          forceInclude: true,
          forceExclude: false,
          customPriority: Math.max(1, Math.min(10, Math.round(baseRelevance / 10) || 1)),
          notes: 'manual:calendar-ui',
        });
        const relevance = scoreCalendarEventForClient(payload, buildClientProfile(clientRow), override);
        score = relevance.score;
        tier = relevance.tier;
        why = relevance.why;
        await upsertRelevance({
          tenantId,
          clientId: clientRow.id,
          calendarEventId: eventId,
          relevanceScore: relevance.score,
          isRelevant: relevance.score >= RELEVANCE_THRESHOLD,
          relevanceReason: { why: relevance.why, tier: relevance.tier, manual: true },
        });
      }

      return reply.send({
        event: {
          id: eventId,
          date: dateISO,
          name: eventName,
          slug: eventSlug,
          source: 'manual:calendar-ui',
          score,
          tier,
          why,
          client_id: clientRow?.id ?? null,
        },
        override,
      });
    }
  );

  // PATCH /calendar/events/:eventId/manual — edita nome e/ou relevância (somente eventos manuais do tenant)
  app.patch(
    '/calendar/events/:eventId/manual',
    { preHandler: [requirePerm('calendars:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const eventId = String(request.params.eventId || '');
      const bodySchema = z.object({
        name: z.string().min(2).max(180).optional(),
        relevance_score: z.number().min(0).max(100).optional(),
      });
      const body = bodySchema.parse(request.body || {});

      const { rows } = await query<any>(
        `SELECT id, name, base_relevance, source FROM events WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [eventId, tenantId]
      );
      const ev = rows[0];
      if (!ev) return reply.status(404).send({ error: 'event_not_found' });
      if (!String(ev.source || '').startsWith('manual:')) {
        return reply.status(403).send({ error: 'only_manual_events_can_be_edited' });
      }

      const newName = body.name?.trim() ?? ev.name;
      const newRelevance = body.relevance_score !== undefined
        ? Math.max(0, Math.min(100, Math.round(body.relevance_score)))
        : ev.base_relevance;

      await query(
        `UPDATE events SET name=$1, base_relevance=$2, updated_at=NOW()
         WHERE id=$3 AND tenant_id=$4`,
        [newName, newRelevance, eventId, tenantId]
      );

      return reply.send({ success: true, id: eventId, name: newName, relevance_score: newRelevance });
    }
  );

  // DELETE /calendar/events/:eventId/manual — exclui evento manual do tenant
  app.delete(
    '/calendar/events/:eventId/manual',
    { preHandler: [requirePerm('calendars:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const eventId = String(request.params.eventId || '');

      const { rows } = await query<any>(
        `SELECT id, source FROM events WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [eventId, tenantId]
      );
      const ev = rows[0];
      if (!ev) return reply.status(404).send({ error: 'event_not_found' });
      if (!String(ev.source || '').startsWith('manual:')) {
        return reply.status(403).send({ error: 'only_manual_events_can_be_deleted' });
      }

      // Remove overrides e relevâncias associadas, depois o evento
      await query(`DELETE FROM calendar_event_overrides WHERE calendar_event_id=$1`, [eventId]);
      await query(`DELETE FROM calendar_event_relevance WHERE calendar_event_id=$1`, [eventId]);
      await query(`DELETE FROM events WHERE id=$1 AND tenant_id=$2`, [eventId, tenantId]);

      return reply.send({ success: true });
    }
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
        const eligibility = checkCalendarEventEligibility(payload, client, override);
        if (!eligibility.ok) {
          return {
            client_id: client.id,
            name: client.name,
            score: 0,
            tier: 'C',
            is_relevant: false,
            why: 'reason' in eligibility ? eligibility.reason : 'eligibility:blocked',
          };
        }
        const relevance = scoreCalendarEventForClient(payload, client, override);
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
    const includeNonRelevant = ['1', 'true', 'yes', 'sim'].includes(
      String((request.query as any)?.include_non_relevant || '')
        .trim()
        .toLowerCase()
    );
    const country =
      typeof (request.query as any)?.country === 'string' ? (request.query as any).country : 'BR';
    const year = Number(params.month.split('-')[0]);
    const sourceEvents = await buildGlobalEvents({ tenantId, year, country });
    const hits = expandEventsForMonth(sourceEvents, params.month as any);
    const { rows: clientRows } = await query<any>(
      `SELECT * FROM clients WHERE tenant_id=$1 ORDER BY name ASC`,
      [tenantId]
    );
    const clients = clientRows.map((row) => buildClientProfile(row));
    const eventIds = Array.from(new Set(hits.map((hit) => hit.event.id)));
    const overrideByEventClient = new Map<string, any>();

    if (clients.length && eventIds.length) {
      const { rows: overrideRows } = await query<any>(
        `SELECT calendar_event_id, client_id, force_include, force_exclude, custom_priority, notes
         FROM calendar_event_overrides
         WHERE tenant_id=$1 AND calendar_event_id = ANY($2)`,
        [tenantId, eventIds]
      );
      for (const row of overrideRows) {
        overrideByEventClient.set(`${row.calendar_event_id}:${row.client_id}`, row);
      }
    }

    const days: Record<string, any[]> = {};
    let totalEvents = 0;

    for (const hit of hits) {
      const eventAny = hit.event as any;
      let score = Number(hit.event.base_relevance ?? 50);
      let tier: 'A' | 'B' | 'C' = score >= 80 ? 'A' : score >= RELEVANCE_THRESHOLD ? 'B' : 'C';
      let why = `base_relevance:${score}`;
      let isRelevant = true;
      let possibleClients: Array<{
        client_id: string;
        name: string;
        score: number;
        tier: 'A' | 'B' | 'C';
        why: string;
      }> = [];

      if (clients.length) {
        possibleClients = clients
          .map((client) => {
            const override = overrideByEventClient.get(`${hit.event.id}:${client.id}`);
            const eligibility = checkCalendarEventEligibility(hit.event, client, override);
            if (!eligibility.ok) return null;
            const relevance = scoreCalendarEventForClient(hit.event, client, override);
            if (!override?.force_include && relevance.score < RELEVANCE_THRESHOLD) return null;
            return {
              client_id: client.id,
              name: client.name,
              score: relevance.score,
              tier: relevance.tier,
              why: relevance.why,
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .sort((a, b) => b.score - a.score);

        if (!possibleClients.length) {
          if (!includeNonRelevant) {
            continue;
          }
          isRelevant = false;
          tier = 'C';
          why = ['business:no_client_match', `base_relevance:${score}`].join(' | ');
        } else {
          const bestMatch = possibleClients[0];
          score = Number(bestMatch.score || 0);
          tier = bestMatch.tier;
          why = [
            `best_client:${bestMatch.name}:${score}`,
            `possible_clients:${possibleClients.length}`,
            bestMatch.why,
          ]
            .filter(Boolean)
            .join(' | ');
        }
      }

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
          why,
          is_relevant: isRelevant,
          possible_clients: possibleClients.map(({ client_id, name, score: clientScore, tier: clientTier }) => ({
            client_id,
            name,
            score: clientScore,
            tier: clientTier,
          })),
          descricao_ai: eventAny.descricao_ai || eventAny.payload?.descricao_ai || null,
          origem_ai: eventAny.origem_ai || eventAny.payload?.origem_ai || null,
          curiosidade_ai: eventAny.curiosidade_ai || eventAny.payload?.curiosidade_ai || null,
        });
        totalEvents += 1;
      }
    }

    totalEvents = 0;
    for (const date of Object.keys(days)) {
      days[date] = dedupeCalendarItems(days[date]);
      days[date].sort((a, b) => b.score - a.score);
      totalEvents += days[date].length;
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
      const hits = expandEventsForMonth(sourceEvents, params.month as any);
      const overrides = await listOverridesForClient({ tenantId, clientId: client.id });
      const overrideMap = new Map(overrides.map((o) => [o.calendar_event_id, o]));

      const showAll = ['1', 'true', 'yes'].includes(
        String((request.query as any)?.all || '')
      );

      const days: Record<string, any[]> = {};
      let totalEvents = 0;

      for (const hit of hits) {
        const override = overrideMap.get(hit.event.id);

        if (showAll) {
          // In browse mode: only skip events explicitly force-excluded
          if ((override as any)?.force_exclude) continue;
        } else {
          const eligibility = checkCalendarEventEligibility(hit.event, client, override);
          if (!eligibility.ok) continue;
        }

        const relevance = scoreCalendarEventForClient(hit.event, client, override);
        if (!showAll && !override?.force_include && relevance.score < RELEVANCE_THRESHOLD) continue;
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
            is_relevant: relevance.score >= RELEVANCE_THRESHOLD,
          });
          totalEvents += 1;
        }
      }

      totalEvents = 0;
      for (const date of Object.keys(days)) {
        days[date] = dedupeCalendarItems(days[date]);
        days[date].sort((a, b) => b.score - a.score);
        totalEvents += days[date].length;
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
      const hits = expandEventsForMonth(sourceEvents, toMonthKey(date) as any);
      const overrides = await listOverridesForClient({ tenantId, clientId: client.id });
      const overrideMap = new Map(overrides.map((o) => [o.calendar_event_id, o]));

      const items: any[] = [];
      for (const hit of hits) {
        if (!hit.hitDates.includes(dateISO as any)) continue;
        const override = overrideMap.get(hit.event.id);
        const eligibility = checkCalendarEventEligibility(hit.event, client, override);
        if (!eligibility.ok) continue;
        const relevance = scoreCalendarEventForClient(hit.event, client, override);
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

      const dedupedItems = dedupeCalendarItems(items);
      dedupedItems.sort((a, b) => b.score - a.score);
      return reply.send({ date: dateISO, client_id: client.id, items: dedupedItems });
    }
  );

  app.get(
    '/clients/:clientId/calendar/today',
    { preHandler: [requirePerm('calendars:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const clientId = request.params.clientId as string;
      const tenantId = (request.user as any).tenant_id;
      const today = new Date();
      const dateISO = today.toISOString().slice(0, 10);

      const { rows: clients } = await query<any>(
        `SELECT * FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [clientId, tenantId]
      );
      if (!clients[0]) return reply.status(404).send({ error: 'client_not_found' });

      const client = buildClientProfile(clients[0]);
      const sourceEvents = await buildSourceEvents({ tenantId, client, year: today.getFullYear() });
      const hits = expandEventsForMonth(sourceEvents, toMonthKey(today) as any);
      const overrides = await listOverridesForClient({ tenantId, clientId: client.id });
      const overrideMap = new Map(overrides.map((o) => [o.calendar_event_id, o]));

      const items: any[] = [];
      for (const hit of hits) {
        if (!hit.hitDates.includes(dateISO as any)) continue;
        const override = overrideMap.get(hit.event.id);
        const eligibility = checkCalendarEventEligibility(hit.event, client, override);
        if (!eligibility.ok) continue;
        const relevance = scoreCalendarEventForClient(hit.event, client, override);
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

      const dedupedItems = dedupeCalendarItems(items);
      dedupedItems.sort((a, b) => b.score - a.score);
      return reply.send({ date: dateISO, client_id: client.id, items: dedupedItems });
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
        const hits = expandEventsForMonth(sourceEvents, month as any);
        for (const hit of hits) {
          for (const dateISO of hit.hitDates) {
            if (!isIsoInRange(dateISO, fromISO, toISO)) continue;
            const override = overrideMap.get(hit.event.id);
            const eligibility = checkCalendarEventEligibility(hit.event, client, override);
            if (!eligibility.ok) continue;
            const relevance = scoreCalendarEventForClient(hit.event, client, override);
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

      const dedupedItems = dedupeCalendarItems(items, { byDate: true });
      dedupedItems.sort((a, b) =>
        a.date === b.date ? b.score - a.score : a.date.localeCompare(b.date)
      );
      return reply.send({ from: fromISO, to: toISO, client_id: client.id, items: dedupedItems });
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
        const hits = expandEventsForMonth(sourceEvents, month as any);
        for (const hit of hits) {
          for (const dateISO of hit.hitDates) {
            if (!isIsoInRange(dateISO, fromISO, toISO)) continue;
            if (touched.has(hit.event.id)) continue;
            const override = overrideMap.get(hit.event.id);
            const eligibility = checkCalendarEventEligibility(hit.event, client, override);
            if (!eligibility.ok) continue;
            const relevance = scoreCalendarEventForClient(hit.event, client, override);
            if (!override?.force_include && relevance.score < RELEVANCE_THRESHOLD) continue;
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
      month: body.month as any,
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
  // ENDPOINT: Importar descrições de IA em lote (Admin)
  // ========================================
  app.post(
    '/calendar/admin/import-descriptions',
    { preHandler: [requirePerm('admin')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        descriptions: z.array(z.object({
          name: z.string(),
          date: z.string(), // YYYY-MM-DD format
          descricao_ai: z.string(),
          origem_ai: z.string().optional(),
          curiosidade_ai: z.string().optional(),
        })),
      });

      const body = bodySchema.parse(request.body);
      const { descriptions } = body;

      let updated = 0;
      let notFound = 0;

      for (const desc of descriptions) {
        const result = await query(
          `UPDATE events
           SET payload = jsonb_set(
             jsonb_set(
               jsonb_set(
                 COALESCE(payload, '{}'),
                 '{descricao_ai}',
                 $1::jsonb
               ),
               '{origem_ai}',
               $2::jsonb
             ),
             '{curiosidade_ai}',
             $3::jsonb
           )
           WHERE name = $4 AND date = $5
           RETURNING id`,
          [
            JSON.stringify(desc.descricao_ai),
            JSON.stringify(desc.origem_ai || ''),
            JSON.stringify(desc.curiosidade_ai || ''),
            desc.name,
            desc.date
          ]
        );

        if (result.rows.length > 0) {
          updated++;
        } else {
          notFound++;
        }
      }

      return reply.send({
        success: true,
        message: `${updated} eventos atualizados, ${notFound} não encontrados`,
        updated,
        notFound,
        total: descriptions.length,
      });
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

  // ── Enrichment status ──────────────────────────────────────────────────────

  app.get(
    '/calendar/admin/enrichment-status',
    { preHandler: [requirePerm('admin')] },
    async (_request, reply) => {
      const { rows } = await query<{
        total: string;
        enriched: string;
        date_validated: string;
        last_enriched_at: string | null;
      }>(`
        SELECT
          COUNT(*) FILTER (WHERE date IS NOT NULL) AS total,
          COUNT(*) FILTER (WHERE date IS NOT NULL AND payload->>'descricao_ai' IS NOT NULL AND payload->>'descricao_ai' != '') AS enriched,
          COUNT(*) FILTER (WHERE date IS NOT NULL AND payload->>'date_confirmed' IS NOT NULL) AS date_validated,
          MAX((payload->>'enriched_at')) AS last_enriched_at
        FROM events
      `);

      const row = rows[0];
      const total = parseInt(row.total, 10);
      const enriched = parseInt(row.enriched, 10);
      const dateValidated = parseInt(row.date_validated, 10);

      return reply.send({
        total,
        enriched,
        pending: total - enriched,
        date_validated: dateValidated,
        last_batch_at: row.last_enriched_at ?? null,
        progress_pct: total > 0 ? Math.round((enriched / total) * 100) : 0,
      });
    }
  );

  // ── Inspiration status ────────────────────────────────────────────────────

  app.get(
    '/calendar/admin/inspiration-status',
    { preHandler: [requirePerm('admin')] },
    async (_request, reply) => {
      const { rows } = await query<{
        total: string;
        high_relevance: string;
        scraped: string;
        total_inspirations: string;
        max_relevance: string;
        min_relevance: string;
        avg_relevance: string;
      }>(`
        SELECT
          COUNT(*)                                                       AS total,
          COUNT(*) FILTER (WHERE base_relevance >= 50)                  AS high_relevance,
          COUNT(DISTINCT i.event_id)                                     AS scraped,
          COUNT(i.id)                                                    AS total_inspirations,
          MAX(base_relevance)                                            AS max_relevance,
          MIN(base_relevance)                                            AS min_relevance,
          ROUND(AVG(base_relevance))                                     AS avg_relevance
        FROM events e
        LEFT JOIN event_inspirations i ON i.event_id = e.id
        WHERE e.date IS NOT NULL
      `);
      const r = rows[0];
      return reply.send({
        total_events: parseInt(r.total, 10),
        eligible_events: parseInt(r.high_relevance, 10),
        scraped_events: parseInt(r.scraped, 10),
        total_inspirations: parseInt(r.total_inspirations, 10),
        relevance_stats: {
          max: parseInt(r.max_relevance || '0', 10),
          min: parseInt(r.min_relevance || '0', 10),
          avg: parseInt(r.avg_relevance || '0', 10),
        },
      });
    }
  );

  // ── Manual enrich batch ────────────────────────────────────────────────────

  app.post(
    '/calendar/admin/enrich-batch',
    { preHandler: [requirePerm('admin')] },
    async (request: any, reply) => {
      const body = z
        .object({ limit: z.number().int().min(1).max(50).optional().default(20) })
        .parse(request.body || {});

      const { rows: events } = await query<{
        id: string;
        name: string;
        date: string;
        date_type: string | null;
      }>(
        `SELECT id, name, date, date_type FROM events
         WHERE date IS NOT NULL
           AND (
             payload IS NULL
             OR payload->>'descricao_ai' IS NULL
             OR payload->>'descricao_ai' = ''
           )
         ORDER BY base_relevance DESC NULLS LAST
         LIMIT $1`,
        [body.limit]
      );

      if (events.length === 0) {
        return reply.send({ processed: 0, errors: 0, items: [], message: 'Todos os eventos já estão enriquecidos' });
      }

      const items = [];
      let processed = 0;
      let errors = 0;

      for (const event of events) {
        const result = await enrichCalendarEvent(event);
        items.push(result);
        if (result.ok) processed++;
        else errors++;

        // Pequena pausa entre eventos (respeitar rate limits)
        if (events.indexOf(event) < events.length - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      return reply.send({
        processed,
        errors,
        items,
        message: `${processed} eventos enriquecidos, ${errors} erros`,
      });
    }
  );

  // ── Calendar Inspiration endpoints ─────────────────────────────────────────

  // GET /calendar/events/:eventId/inspirations
  app.get(
    '/calendar/events/:eventId/inspirations',
    { preHandler: [authGuard, tenantGuard] },
    async (request: any, reply) => {
      const { eventId } = z.object({ eventId: z.string().min(1) }).parse(request.params);

      const { rows } = await query<{
        id: string;
        title: string;
        snippet: string | null;
        url: string;
        source_lang: string;
        scraped_at: string;
      }>(
        `SELECT id, title, snippet, url, source_lang, scraped_at
         FROM event_inspirations
         WHERE event_id = $1
         ORDER BY scraped_at DESC
         LIMIT 20`,
        [eventId]
      );

      return reply.send({ inspirations: rows, total: rows.length });
    }
  );

  // (inspiration-status defined earlier at line ~1633)

  // POST /calendar/admin/inspiration-batch
  app.post(
    '/calendar/admin/inspiration-batch',
    { preHandler: [authGuard, tenantGuard, requirePerm('admin')] },
    async (request: any, reply) => {
      const body = z.object({ limit: z.number().int().min(1).max(10).optional().default(5) }).parse(
        request.body || {}
      );

      const dateMin = new Date();
      dateMin.setDate(dateMin.getDate() + 7);
      const dateMax = new Date();
      dateMax.setDate(dateMax.getDate() + 42);

      const { rows: events } = await query<{ id: string; name: string; date: string }>(
        `SELECT e.id, e.name, e.date
         FROM events e
         LEFT JOIN (
           SELECT event_id, COUNT(*) AS cnt FROM event_inspirations GROUP BY event_id
         ) i ON i.event_id = e.id
         WHERE e.base_relevance >= 80
           AND e.date IS NOT NULL
           AND e.date >= $1
           AND e.date <= $2
           AND COALESCE(i.cnt, 0) < 8
         ORDER BY e.base_relevance DESC, e.date ASC
         LIMIT $3`,
        [dateMin.toISOString().slice(0, 10), dateMax.toISOString().slice(0, 10), body.limit]
      );

      if (events.length === 0) {
        return reply.send({ processed: 0, events: [], message: 'Nenhum evento pendente na janela de 7–42 dias' });
      }

      const results = [];
      for (const event of events) {
        const r = await scrapeInspirations(event);
        results.push({ name: event.name, date: event.date, inspirations_added: r.inspirations_added, ok: r.ok });
      }

      return reply.send({
        processed: results.length,
        events: results,
        message: `${results.length} eventos processados`,
      });
    }
  );

  // POST /calendar/events/:eventId/inspirations/:inspirationId/adapt
  // Adapts a collected inspiration to a specific client's voice, segment and strategy.
  app.post(
    '/calendar/events/:eventId/inspirations/:inspirationId/adapt',
    { preHandler: [authGuard, tenantGuard] },
    async (request: any, reply) => {
      const { eventId, inspirationId } = z
        .object({ eventId: z.string().min(1), inspirationId: z.string().uuid() })
        .parse(request.params);

      const body = z
        .object({
          clientId: z.string().min(1),
          extra_context: z.string().max(500).optional(),
        })
        .parse(request.body || {});

      const tenantId = request.user.tenant_id;

      // Fetch the inspiration
      const { rows: insRows } = await query<{
        title: string;
        snippet: string | null;
        url: string;
      }>(
        `SELECT title, snippet, url FROM event_inspirations WHERE id = $1 AND event_id = $2`,
        [inspirationId, eventId]
      );
      if (insRows.length === 0) {
        return reply.status(404).send({ error: 'inspiration_not_found' });
      }
      const inspiration = insRows[0];

      // Fetch event name
      const { rows: evRows } = await query<{ name: string; date: string }>(
        `SELECT name, date FROM events WHERE id = $1`,
        [eventId]
      );
      const eventName = evRows[0]?.name ?? eventId;
      const eventDate = evRows[0]?.date ?? '';

      // Fetch client profile
      const { rows: clientRows } = await query<{
        name: string;
        segment_primary: string | null;
        profile: any;
      }>(
        `SELECT name, segment_primary, profile FROM clients WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [body.clientId, tenantId]
      );
      if (clientRows.length === 0) {
        return reply.status(404).send({ error: 'client_not_found' });
      }
      const client = clientRows[0];
      const segment = client.segment_primary || '';
      const voice = client.profile?.voz_marca || client.profile?.voice || '';
      const audience = client.profile?.publico_alvo || client.profile?.audience || '';

      const prompt = `Você é um especialista em marketing de conteúdo.

DATA COMEMORATIVA: ${eventName}${eventDate ? ` (${eventDate})` : ''}
CLIENTE: ${client.name}${segment ? ` | Segmento: ${segment}` : ''}${voice ? ` | Voz da marca: ${voice}` : ''}${audience ? ` | Público: ${audience}` : ''}
${body.extra_context ? `CONTEXTO ADICIONAL: ${body.extra_context}` : ''}

INSPIRAÇÃO ORIGINAL (de referência global):
Título: ${inspiration.title}
${inspiration.snippet ? `Descrição: ${inspiration.snippet}` : ''}
Fonte: ${inspiration.url}

TAREFA: Adapte o conceito criativo desta inspiração para o contexto específico do cliente acima.
Gere 3 ideias de conteúdo adaptadas — cada uma com:
- Formato (post, stories, reel, carrossel, etc.)
- Conceito central em 1 frase
- Copy de exemplo (2-3 linhas)
- CTA sugerido

Responda em português. Seja específico, concreto e adequado ao segmento do cliente.`;

      const adapted = await generateCompletion({
        prompt,
        maxTokens: 700,
        temperature: 0.7,
      });

      return reply.send({
        ok: true,
        client_name: client.name,
        event_name: eventName,
        inspiration: { title: inspiration.title, url: inspiration.url },
        adapted_ideas: adapted?.text?.trim() ?? '',
        generated_at: new Date().toISOString(),
      });
    }
  );
}
