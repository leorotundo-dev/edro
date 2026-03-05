/**
 * Operational Agent Worker — Fase 5 do ERP
 *
 * Worker a cada 30min que monitora proativamente eventos operacionais
 * e dispara notificações para a equipe. Usa agent_action_log para deduplicar
 * alertas (1 por trigger_key por dia via UNIQUE index).
 *
 * Triggers monitorados:
 *   - job_stalled      : briefing sem movimentação > 3 dias
 *   - budget_alert     : mídia realizada > 85% do planejado
 *   - invoice_overdue  : fatura vencida há mais de 1 dia
 *   - long_timer       : timer ativo > 4 horas
 *   - client_risk      : health score < 40 (também disparado pelo clientHealthWorker)
 *   - deadline_alert   : due_at em < 24h e status != done
 */

import { pool } from '../db';

let lastRun = 0;
const RUN_INTERVAL_MS = 30 * 60 * 1000; // 30 min

// ── Dedup helper ───────────────────────────────────────────────────────────────

async function tryFire(triggerKey: string, tenantId: string | null, metadata: object): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO agent_action_log (tenant_id, trigger_key, metadata)
       VALUES ($1, $2, $3)`,
      [tenantId, triggerKey, JSON.stringify(metadata)],
    );
    return true;
  } catch {
    // UNIQUE constraint violated — already fired today
    return false;
  }
}

async function notify(event: string, data: object) {
  try {
    const { notifyEvent } = await import('../services/notificationService');
    await notifyEvent(event, data);
  } catch { /* notification service may not be configured */ }
}

// ── Trigger checks ─────────────────────────────────────────────────────────────

async function checkStalledJobs() {
  const res = await pool.query(`
    SELECT b.id, b.title, b.tenant_id, b.traffic_owner, b.updated_at,
           t.id AS tenant_id
    FROM edro_briefings b
    JOIN tenants t ON t.id = b.tenant_id
    WHERE b.status NOT IN ('done', 'cancelled', 'archived')
      AND b.updated_at < NOW() - INTERVAL '3 days'
      AND b.tenant_id IS NOT NULL
  `);

  for (const job of res.rows) {
    const key = `job_stalled:${job.id}`;
    const fired = await tryFire(key, job.tenant_id, { briefing_id: job.id, title: job.title });
    if (fired) {
      await notify('job_stalled', {
        tenantId: job.tenant_id,
        briefingId: job.id,
        title: job.title,
        trafficOwner: job.traffic_owner,
        staleDays: Math.floor((Date.now() - new Date(job.updated_at).getTime()) / 86400000),
      });
    }
  }
}

async function checkBudgetAlerts() {
  const res = await pool.query(`
    SELECT mb.*, c.name AS client_name, mb.tenant_id
    FROM media_budgets mb
    JOIN clients c ON c.id = mb.client_id
    WHERE mb.planned_brl > 0
      AND mb.realized_brl / mb.planned_brl > 0.85
      AND mb.period_month = to_char(NOW(), 'YYYY-MM')
  `);

  for (const b of res.rows) {
    const pct = Math.round((parseFloat(b.realized_brl) / parseFloat(b.planned_brl)) * 100);
    const key = `budget_alert:${b.id}`;
    const fired = await tryFire(key, b.tenant_id, { client: b.client_name, platform: b.platform, pct });
    if (fired) {
      await notify('budget_alert', {
        tenantId: b.tenant_id,
        clientId: b.client_id,
        clientName: b.client_name,
        platform: b.platform,
        consumedPct: pct,
        realizedBrl: b.realized_brl,
        plannedBrl: b.planned_brl,
      });
    }
  }
}

async function checkOverdueInvoices() {
  const res = await pool.query(`
    SELECT i.*, c.name AS client_name, c.tenant_id
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    WHERE i.status NOT IN ('paid', 'cancelled')
      AND i.due_date < CURRENT_DATE - INTERVAL '1 day'
  `);

  for (const inv of res.rows) {
    const key = `invoice_overdue:${inv.id}`;
    const fired = await tryFire(key, inv.tenant_id, { invoice_id: inv.id, client: inv.client_name });
    if (fired) {
      await notify('invoice_overdue', {
        tenantId: inv.tenant_id,
        invoiceId: inv.id,
        clientId: inv.client_id,
        clientName: inv.client_name,
        amountBrl: inv.amount_brl,
        dueDateStr: inv.due_date,
      });
    }
  }
}

async function checkLongTimers() {
  const res = await pool.query(`
    SELECT at2.*, fp.display_name, fp.user_id,
           b.title AS briefing_title, eu.tenant_id
    FROM active_timers at2
    JOIN freelancer_profiles fp ON fp.id = at2.freelancer_id
    JOIN edro_briefings b ON b.id = at2.briefing_id
    JOIN edro_users eu ON eu.id = fp.user_id
    WHERE at2.started_at < NOW() - INTERVAL '4 hours'
  `);

  for (const t of res.rows) {
    const hours = Math.floor((Date.now() - new Date(t.started_at).getTime()) / 3600000);
    const key = `long_timer:${t.id}`;
    const fired = await tryFire(key, t.tenant_id, { freelancer: t.display_name, hours });
    if (fired) {
      await notify('long_timer', {
        tenantId: t.tenant_id,
        freelancerId: t.freelancer_id,
        displayName: t.display_name,
        briefingId: t.briefing_id,
        briefingTitle: t.briefing_title,
        hours,
      });
    }
  }
}

async function checkDeadlines() {
  const res = await pool.query(`
    SELECT b.id, b.title, b.due_at, b.tenant_id, b.traffic_owner
    FROM edro_briefings b
    WHERE b.status NOT IN ('done', 'cancelled', 'archived')
      AND b.due_at IS NOT NULL
      AND b.due_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      AND b.tenant_id IS NOT NULL
  `);

  for (const b of res.rows) {
    const key = `deadline_alert:${b.id}`;
    const hoursLeft = Math.floor((new Date(b.due_at).getTime() - Date.now()) / 3600000);
    const fired = await tryFire(key, b.tenant_id, { briefing_id: b.id, hours_left: hoursLeft });
    if (fired) {
      await notify('deadline_alert', {
        tenantId: b.tenant_id,
        briefingId: b.id,
        title: b.title,
        trafficOwner: b.traffic_owner,
        hoursLeft,
        dueAt: b.due_at,
      });
    }
  }
}

// ── Entry point ────────────────────────────────────────────────────────────────

export async function runOperationalAgentOnce() {
  const now = Date.now();
  if (now - lastRun < RUN_INTERVAL_MS) return;
  lastRun = now;

  try {
    await Promise.allSettled([
      checkStalledJobs(),
      checkBudgetAlerts(),
      checkOverdueInvoices(),
      checkLongTimers(),
      checkDeadlines(),
    ]);
  } catch (err: any) {
    console.error('[operationalAgent] error:', err?.message);
  }
}
