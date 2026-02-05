import { query } from '../db';
import { listApprovedEventsForYear } from '../repos/eventsRepo';
import { listOverridesForClient } from '../repos/calendarOverridesRepo';
import { upsertRelevance } from '../repos/calendarRelevanceRepo';
import {
  RETAIL_BR_EVENTS,
  expandEventsForMonth,
  matchesLocality,
  scoreEventRelevance,
  type ClientProfile,
} from '../services/calendarTotal';

const RELEVANCE_THRESHOLD = 55;

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

async function resolveTenantId() {
  if (process.env.TENANT_ID) return process.env.TENANT_ID;
  const { rows: tenants } = await query<any>(
    `SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1`
  );
  if (!tenants[0]) throw new Error('No tenant found. Set TENANT_ID env.');
  return tenants[0].id as string;
}

async function main() {
  const tenantId = await resolveTenantId();
  const year = Number(process.env.CALENDAR_YEAR || '2026');
  const fromISO = process.env.FROM || `${year}-01-01`;
  const toISO = process.env.TO || `${year}-12-31`;
  const clientFilter = process.env.CLIENT_ID || null;

  const fromDate = new Date(fromISO);
  const toDate = new Date(toISO);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error('Invalid FROM/TO date range. Use YYYY-MM-DD.');
  }

  const months = listMonthsBetween(fromDate, toDate);
  const years = Array.from(new Set(months.map((m) => Number(m.split('-')[0]))));

  const clientQuery = clientFilter
    ? { text: `SELECT * FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`, values: [clientFilter, tenantId] }
    : { text: `SELECT * FROM clients WHERE tenant_id=$1 ORDER BY name ASC`, values: [tenantId] };

  const { rows: clients } = await query<any>(clientQuery.text, clientQuery.values);
  if (!clients.length) {
    console.log('No clients found for relevance recalculation.');
    return;
  }

  let totalUpdated = 0;

  for (const row of clients) {
    const client = buildClientProfile(row);
    const overrides = await listOverridesForClient({ tenantId, clientId: client.id });
    const overrideMap = new Map(overrides.map((o) => [o.calendar_event_id, o]));

    const eventsByYear = new Map<number, any[]>();
    for (const y of years) {
      const approved = await listApprovedEventsForYear({
        tenantId,
        year: y,
        country: client.country,
      });
      eventsByYear.set(y, approved.length ? approved : RETAIL_BR_EVENTS);
    }

    const touched = new Set<string>();
    for (const month of months) {
      const y = Number(month.split('-')[0]);
      const sourceEvents = eventsByYear.get(y) || [];
      const hits = expandEventsForMonth(sourceEvents as any, month as any);
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

    totalUpdated += touched.size;
    console.log(`Client ${client.name} (${client.id}): ${touched.size} eventos recalculados`);
  }

  console.log(`Recalculo completo. Total eventos atualizados: ${totalUpdated}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
