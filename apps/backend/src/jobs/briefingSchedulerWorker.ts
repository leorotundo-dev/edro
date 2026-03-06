/**
 * Briefing Scheduler Worker
 *
 * Verifica a cada minuto briefings com recorrência configurada cujo
 * next_run_at já passou, cria um novo briefing idêntico e avança next_run_at.
 *
 * recurrence JSONB: {
 *   freq: 'monthly' | 'weekly' | 'biweekly',
 *   day_of_month?: number,   -- 1-28, para freq=monthly
 *   day_of_week?: number,    -- 0=dom ... 6=sab, para freq=weekly/biweekly
 *   enabled: boolean,
 *   next_run_at: string      -- ISO timestamp
 * }
 */

import { query } from '../db';
import { createBriefing } from '../repositories/edroBriefingRepository';

function computeNextRun(rec: {
  freq: string;
  day_of_month?: number | null;
  day_of_week?: number | null;
  next_run_at: string;
}): Date {
  const base = new Date(rec.next_run_at);

  if (rec.freq === 'monthly') {
    const next = new Date(base);
    next.setMonth(next.getMonth() + 1);
    if (rec.day_of_month) next.setDate(Math.min(rec.day_of_month, 28));
    return next;
  }

  if (rec.freq === 'biweekly') {
    const next = new Date(base);
    next.setDate(next.getDate() + 14);
    return next;
  }

  // weekly (default)
  const next = new Date(base);
  next.setDate(next.getDate() + 7);
  return next;
}

let lastRun = 0;
const RUN_INTERVAL_MS = 60_000; // 1 min

export async function runBriefingSchedulerOnce() {
  const now = Date.now();
  if (now - lastRun < RUN_INTERVAL_MS) return;
  lastRun = now;

  const due = await query<{
    id: string;
    title: string;
    main_client_id: string | null;
    tenant_id: string | null;
    recurrence: any;
    labels: any;
    assignees: any;
    traffic_owner: string | null;
  }>(`
    SELECT b.id, b.title, b.main_client_id, c.tenant_id,
           b.recurrence, b.labels, b.assignees, b.traffic_owner
    FROM edro_briefings b
    LEFT JOIN clients c ON c.id = b.main_client_id
    WHERE (b.recurrence->>'enabled')::boolean = true
      AND (b.recurrence->>'next_run_at')::timestamptz <= NOW()
    LIMIT 10
  `);

  for (const b of due.rows) {
    try {
      const rec = typeof b.recurrence === 'string' ? JSON.parse(b.recurrence) : b.recurrence;
      const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const monthCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

      await createBriefing({
        mainClientId: b.main_client_id,
        title: `${b.title} — ${monthCap}`,
        status: 'todo',
        payload: {
          labels:    b.labels    ?? [],
          assignees: b.assignees ?? [],
        },
        trafficOwner: b.traffic_owner,
        source: 'recurrence',
      });

      const next = computeNextRun({ ...rec, next_run_at: rec.next_run_at ?? new Date().toISOString() });

      await query(
        `UPDATE edro_briefings
         SET recurrence = recurrence || $1::jsonb
         WHERE id = $2`,
        [JSON.stringify({ next_run_at: next.toISOString() }), b.id],
      );

      console.log(`[briefingScheduler] Created recurrence for "${b.title}" → next: ${next.toISOString()}`);
    } catch (err: any) {
      console.error(`[briefingScheduler] Failed for briefing ${b.id}:`, err?.message);
    }
  }
}
