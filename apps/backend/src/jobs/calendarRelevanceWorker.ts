import { query } from '../db';
import { listOverridesForClient } from '../repos/calendarOverridesRepo';
import { upsertRelevance } from '../repos/calendarRelevanceRepo';
import { listApprovedEventsForYear } from '../repos/eventsRepo';
import {
  RETAIL_BR_EVENTS,
  expandEventsForMonth,
  matchesLocality,
  scoreEventRelevance,
  type ClientProfile,
} from '../services/calendarTotal';

const RELEVANCE_THRESHOLD = 55;
const ADVISORY_LOCK_ID = 921337;

let lastRunAt = 0;
let running = false;

function isEnabled() {
  const flag = process.env.CALENDAR_RECALC_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
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

async function tryAcquireLock() {
  const { rows } = await query<{ locked: boolean }>(
    `SELECT pg_try_advisory_lock($1) AS locked`,
    [ADVISORY_LOCK_ID]
  );
  return rows[0]?.locked === true;
}

async function releaseLock() {
  await query(`SELECT pg_advisory_unlock($1)`, [ADVISORY_LOCK_ID]);
}

export async function runCalendarRelevanceWorkerOnce() {
  if (!isEnabled()) return;
  if (running) return;

  const intervalMs = Number(process.env.CALENDAR_RECALC_INTERVAL_MS || 24 * 60 * 60 * 1000);
  const now = Date.now();
  if (now - lastRunAt < intervalMs) return;

  running = true;
  const gotLock = await tryAcquireLock();
  if (!gotLock) {
    running = false;
    return;
  }

  lastRunAt = now;

  try {
    const year = Number(process.env.CALENDAR_YEAR || new Date().getFullYear());
    const fromISO = process.env.CALENDAR_RECALC_FROM || `${year}-01-01`;
    const toISO = process.env.CALENDAR_RECALC_TO || `${year}-12-31`;

    const fromDate = new Date(fromISO);
    const toDate = new Date(toISO);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new Error('Invalid CALENDAR_RECALC_FROM/CALENDAR_RECALC_TO date range.');
    }

    const months = listMonthsBetween(fromDate, toDate);
    const years = Array.from(new Set(months.map((m) => Number(m.split('-')[0]))));

    const { rows: tenants } = await query<{ id: string }>('SELECT id FROM tenants');
    let totalUpdated = 0;

    for (const tenant of tenants) {
      const { rows: clients } = await query<any>(
        `SELECT * FROM clients WHERE tenant_id=$1 ORDER BY name ASC`,
        [tenant.id]
      );
      if (!clients.length) continue;

      for (const row of clients) {
        const client = buildClientProfile(row);
        const overrides = await listOverridesForClient({
          tenantId: tenant.id,
          clientId: client.id,
        });
        const overrideMap = new Map(overrides.map((o) => [o.calendar_event_id, o]));

        const eventsByYear = new Map<number, any[]>();
        for (const y of years) {
          const approved = await listApprovedEventsForYear({
            tenantId: tenant.id,
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
                tenantId: tenant.id,
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
        console.log(
          `[calendar_recalc] Tenant ${tenant.id} | Client ${client.name} (${client.id}): ${touched.size}`
        );
      }
    }

    console.log(`[calendar_recalc] Done. Total eventos atualizados: ${totalUpdated}`);
  } catch (error) {
    console.error('[calendar_recalc] error', error);
  } finally {
    await releaseLock();
    running = false;
  }
}
