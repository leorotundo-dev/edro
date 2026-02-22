/**
 * calendarInspirationWorker.ts
 *
 * Daily worker that scrapes creative campaign inspiration for high-relevance
 * calendar events (base_relevance >= 80) in the next 7–42 days.
 *
 * Uses Tavily to search PT + EN across the web, storing results in the
 * `event_inspirations` table (global, tenant-agnostic).
 *
 * Rate: MAX_EVENTS_PER_RUN events/day × 4 Tavily calls each.
 */

import { query } from '../db';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { logTavilyUsage } from '../services/ai/aiUsageLogger';

const MIN_RELEVANCE = Number(process.env.CALENDAR_INSPIRATION_MIN_RELEVANCE || 80);
const MAX_EVENTS_PER_RUN = Number(process.env.CALENDAR_INSPIRATION_MAX_EVENTS || 5);
const MIN_INSPIRATIONS = Number(process.env.CALENDAR_INSPIRATION_MIN_ITEMS || 8);
const WINDOW_DAYS_MIN = 7;
const WINDOW_DAYS_MAX = 42;

let lastRunDate = '';
let running = false;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── English name mapping for common PT dates ─────────────────────────────────

const PT_TO_EN: Record<string, string> = {
  'dia das mulheres': "Women's Day",
  'dia internacional da mulher': "International Women's Day",
  'dia das mães': "Mother's Day",
  'dia dos pais': "Father's Day",
  'dia dos namorados': "Valentine's Day",
  'natal': 'Christmas',
  'ano novo': 'New Year',
  'páscoa': 'Easter',
  'carnaval': 'Carnival',
  'dia das crianças': "Children's Day",
  'dia do trabalho': 'Labour Day',
  'halloween': 'Halloween',
  'black friday': 'Black Friday',
  'cyber monday': 'Cyber Monday',
  'dia dos professores': "Teacher's Day",
  'dia da independência': 'Independence Day',
};

function getEnglishName(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [pt, en] of Object.entries(PT_TO_EN)) {
    if (lower.includes(pt)) return en;
  }
  return name; // fallback: use original name, Tavily handles PT searches fine
}

// ── Core: scrape inspirations for a single event ─────────────────────────────

type EventRow = {
  id: string;
  name: string;
  date: string;
};

export type InspirationResult = {
  event_id: string;
  event_name: string;
  ok: boolean;
  inspirations_added: number;
  error?: string;
};

export async function scrapeInspirations(event: EventRow): Promise<InspirationResult> {
  const englishName = getEnglishName(event.name);
  const year = new Date().getFullYear();

  const queries: Array<{ q: string; lang: 'pt' | 'en' }> = [
    {
      q: `"${event.name}" campanhas criativas marketing exemplos melhores marcas`,
      lang: 'pt',
    },
    {
      q: `"${event.name}" campanha inspiração ideias marcas ${year}`,
      lang: 'pt',
    },
    {
      q: `"${englishName}" best creative campaigns marketing examples brands worldwide`,
      lang: 'en',
    },
    {
      q: `"${englishName}" ${year} campaign ideas creative marketing international`,
      lang: 'en',
    },
  ];

  let added = 0;

  for (const { q, lang } of queries) {
    try {
      const t0 = Date.now();
      const res = await tavilySearch(q, { maxResults: 4, searchDepth: 'basic' });
      logTavilyUsage({
        tenant_id: 'system',
        operation: 'search-basic',
        unit_count: 1,
        feature: 'calendar_inspiration',
        duration_ms: Date.now() - t0,
        metadata: { event_id: event.id, lang },
      });

      for (const r of res.results.slice(0, 3)) {
        if (!r.url || !r.title || r.title.length < 5) continue;
        const snippet = (r.snippet || '').slice(0, 600);

        const { rowCount } = await query(
          `INSERT INTO event_inspirations (event_id, title, snippet, url, source_lang)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (event_id, url) DO NOTHING`,
          [event.id, r.title.slice(0, 300), snippet, r.url, lang]
        );
        if ((rowCount ?? 0) > 0) added++;
      }
    } catch (err: any) {
      console.warn(`[calendarInspiration] search failed for "${event.name}" (${lang}): ${err?.message}`);
    }

    // Respect Tavily rate limits
    await sleep(2000);
  }

  return { event_id: event.id, event_name: event.name, ok: true, inspirations_added: added };
}

// ── Main worker (called by jobsRunner) ───────────────────────────────────────

export async function runCalendarInspirationWorkerOnce(): Promise<void> {
  const today = todayStr();
  if (lastRunDate === today) return;
  if (running) return;
  if (!isTavilyConfigured()) return;

  running = true;
  lastRunDate = today;

  try {
    const dateMin = new Date();
    dateMin.setDate(dateMin.getDate() + WINDOW_DAYS_MIN);
    const dateMax = new Date();
    dateMax.setDate(dateMax.getDate() + WINDOW_DAYS_MAX);

    // Events with high relevance in the window that need more inspirations
    const { rows: events } = await query<EventRow>(
      `SELECT e.id, e.name, e.date
       FROM events e
       LEFT JOIN (
         SELECT event_id, COUNT(*) AS cnt
         FROM event_inspirations
         GROUP BY event_id
       ) i ON i.event_id = e.id
       WHERE e.base_relevance >= $1
         AND e.date IS NOT NULL
         AND e.date >= $2
         AND e.date <= $3
         AND COALESCE(i.cnt, 0) < $4
       ORDER BY e.base_relevance DESC, e.date ASC
       LIMIT $5`,
      [
        MIN_RELEVANCE,
        dateMin.toISOString().slice(0, 10),
        dateMax.toISOString().slice(0, 10),
        MIN_INSPIRATIONS,
        MAX_EVENTS_PER_RUN,
      ]
    );

    if (events.length === 0) {
      console.log('[calendarInspiration] no events need scraping today');
      return;
    }

    console.log(`[calendarInspiration] scraping ${events.length} events`);

    let totalAdded = 0;
    for (const event of events) {
      const result = await scrapeInspirations(event);
      totalAdded += result.inspirations_added;
      console.log(
        `[calendarInspiration] event="${event.name}" date=${event.date} added=${result.inspirations_added}`
      );
    }

    console.log(`[calendarInspiration] done. total inspirations added=${totalAdded}`);
  } catch (err: any) {
    console.error('[calendarInspiration] worker error:', err?.message);
  } finally {
    running = false;
  }
}
