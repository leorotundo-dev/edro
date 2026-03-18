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

async function notify(event: string, tenantId: string | null, title: string, body: string, payload: object, clientPhone?: string | null) {
  if (!tenantId) return;
  try {
    const { notifyEvent } = await import('../services/notificationService');
    const adminWhatsApp = process.env.ADMIN_WHATSAPP;
    const admins = await pool.query(
      `SELECT eu.id, eu.email FROM edro_users eu
       JOIN tenant_users tu ON tu.user_id = eu.id
       WHERE tu.tenant_id = $1 AND tu.role IN ('admin', 'owner') LIMIT 5`,
      [tenantId],
    );
    await Promise.allSettled(admins.rows.map((a) =>
      notifyEvent({ event, tenantId, userId: a.id, title, body,
        recipientEmail: a.email,
        recipientPhone: adminWhatsApp || undefined,
        payload }),
    ));
    // Also notify client via WhatsApp if phone provided
    if (clientPhone) {
      await notifyEvent({ event, tenantId, userId: '', title, body,
        recipientPhone: clientPhone, payload }).catch(() => {});
    }
  } catch { /* notification service may not be configured */ }
}

// ── Trigger checks ─────────────────────────────────────────────────────────────

async function checkStalledJobs() {
  const res = await pool.query(`
    SELECT b.id, b.title, b.traffic_owner, b.updated_at,
           c.tenant_id
    FROM edro_briefings b
    JOIN clients c ON c.id = b.main_client_id
    WHERE b.status NOT IN ('done', 'cancelled', 'archived')
      AND b.updated_at < NOW() - INTERVAL '3 days'
      AND b.main_client_id IS NOT NULL
  `);

  for (const job of res.rows) {
    const key = `job_stalled:${job.id}`;
    const fired = await tryFire(key, job.tenant_id, { briefing_id: job.id, title: job.title });
    if (fired) {
      const staleDays = Math.floor((Date.now() - new Date(job.updated_at).getTime()) / 86400000);
      await notify('job_stalled', job.tenant_id,
        `Job parado: ${job.title}`,
        `Sem movimentação há ${staleDays} dias.`,
        { briefingId: job.id, trafficOwner: job.traffic_owner, staleDays },
      );
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
      await notify('budget_alert', b.tenant_id,
        `Budget ${b.platform}: ${pct}% consumido — ${b.client_name}`,
        `R$ ${parseFloat(b.realized_brl).toFixed(2)} de R$ ${parseFloat(b.planned_brl).toFixed(2)}`,
        { clientId: b.client_id, platform: b.platform, consumedPct: pct },
      );
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
      await notify('invoice_overdue', inv.tenant_id,
        `Fatura vencida: ${inv.client_name}`,
        `R$ ${parseFloat(inv.amount_brl).toFixed(2)} — venceu em ${inv.due_date?.toString().slice(0, 10)}`,
        { invoiceId: inv.id, clientId: inv.client_id },
      );
    }
  }
}

async function checkLongTimers() {
  const res = await pool.query(`
    SELECT at2.*, fp.display_name, fp.user_id,
           b.title AS briefing_title, cl.tenant_id
    FROM active_timers at2
    JOIN freelancer_profiles fp ON fp.id = at2.freelancer_id
    JOIN edro_briefings b ON b.id = at2.briefing_id
    LEFT JOIN clients cl ON cl.id = b.main_client_id
    WHERE at2.started_at < NOW() - INTERVAL '4 hours'
  `);

  for (const t of res.rows) {
    const hours = Math.floor((Date.now() - new Date(t.started_at).getTime()) / 3600000);
    const key = `long_timer:${t.id}`;
    const fired = await tryFire(key, t.tenant_id, { freelancer: t.display_name, hours });
    if (fired) {
      await notify('long_timer', t.tenant_id,
        `Timer longo: ${t.display_name}`,
        `${hours}h em "${t.briefing_title}"`,
        { freelancerId: t.freelancer_id, briefingId: t.briefing_id, hours },
      );
    }
  }
}

async function checkDeadlines() {
  const res = await pool.query(`
    SELECT b.id, b.title, b.due_at, b.traffic_owner,
           c.tenant_id
    FROM edro_briefings b
    JOIN clients c ON c.id = b.main_client_id
    WHERE b.status NOT IN ('done', 'cancelled', 'archived')
      AND b.due_at IS NOT NULL
      AND b.due_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      AND b.main_client_id IS NOT NULL
  `);

  for (const b of res.rows) {
    const key = `deadline_alert:${b.id}`;
    const hoursLeft = Math.floor((new Date(b.due_at).getTime() - Date.now()) / 3600000);
    const fired = await tryFire(key, b.tenant_id, { briefing_id: b.id, hours_left: hoursLeft });
    if (fired) {
      await notify('deadline_alert', b.tenant_id,
        `Prazo em ${hoursLeft}h: ${b.title}`,
        `Responsável: ${b.traffic_owner || 'não definido'}`,
        { briefingId: b.id, trafficOwner: b.traffic_owner, hoursLeft },
      );
    }
  }
}

async function checkOpsJobsOverdue() {
  const res = await pool.query(`
    SELECT j.id, j.title, j.deadline_at, j.tenant_id,
           c.name AS client_name,
           COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name
      FROM jobs j
      LEFT JOIN clients c ON c.id = j.client_id
      LEFT JOIN edro_users u ON u.id = j.owner_id
     WHERE j.status NOT IN ('published', 'done', 'archived')
       AND j.deadline_at IS NOT NULL
       AND j.deadline_at < NOW()
  `);

  for (const job of res.rows) {
    const key = `ops_job_overdue:${job.id}`;
    const fired = await tryFire(key, job.tenant_id, { job_id: job.id });
    if (fired) {
      await notify(
        'job.overdue', job.tenant_id,
        `⏰ Prazo vencido: ${job.title}`,
        [job.client_name ? `Cliente: ${job.client_name}` : null, job.owner_name ? `Responsável: ${job.owner_name}` : 'Sem responsável'].filter(Boolean).join(' · '),
        { jobId: job.id },
      );
    }
  }
}

async function checkOpsJobsUnowned() {
  const res = await pool.query(`
    SELECT j.id, j.title, j.priority_band, j.tenant_id,
           c.name AS client_name
      FROM jobs j
      LEFT JOIN clients c ON c.id = j.client_id
     WHERE j.owner_id IS NULL
       AND j.status NOT IN ('published', 'done', 'archived')
       AND j.priority_band IN ('p0', 'p1')
       AND j.created_at < NOW() - INTERVAL '2 hours'
  `);

  if (!res.rows.length) return;

  // Group by tenant
  const byTenant = new Map<string, typeof res.rows>();
  for (const job of res.rows) {
    if (!byTenant.has(job.tenant_id)) byTenant.set(job.tenant_id, []);
    byTenant.get(job.tenant_id)!.push(job);
  }

  for (const [tenantId, jobs] of byTenant) {
    const key = `ops_unowned:${tenantId}:${jobs.map((j) => j.id).sort().join(',')}`;
    const fired = await tryFire(key, tenantId, { count: jobs.length });
    if (fired) {
      const sample = jobs.slice(0, 3).map((j) => `${j.priority_band.toUpperCase()} · ${j.title}`).join(', ');
      await notify(
        'job.unowned', tenantId,
        `👤 ${jobs.length} demanda${jobs.length > 1 ? 's' : ''} sem responsável`,
        sample + (jobs.length > 3 ? ` e mais ${jobs.length - 3}...` : ''),
        { count: jobs.length },
      );
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
      checkOpsJobsOverdue(),
      checkOpsJobsUnowned(),
    ]);
  } catch (err: any) {
    console.error('[operationalAgent] error:', err?.message);
  }
}
