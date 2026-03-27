import { query } from '../db/db';
import { sendEmail } from './emailService';

export type DigestType = 'daily' | 'weekly';

export type DailyDigestContent = {
  jobs_due_today: Array<{ id: string; title: string; client_name: string; status: string; due_at: string | null }>;
  jobs_blocked: Array<{ id: string; title: string; client_name: string; blocked_since: string | null }>;
  jobs_delivered_yesterday: Array<{ id: string; title: string; client_name: string }>;
  clients_at_risk: Array<{ id: string; name: string; health_score: number | null; risk_reason: string }>;
  signals_critical: Array<{ title: string; summary: string | null; client_name: string | null }>;
  active_jobs_total: number;
  top_action: string | null;
};

export type WeeklyDigestContent = {
  jobs_delivered: number;
  jobs_opened: number;
  jobs_blocked_eow: number;
  sla_hit_rate: string;
  avg_health_score: number | null;
  top_clients: Array<{ name: string; jobs_delivered: number; health_score: number | null }>;
  top_blockers: Array<{ title: string; client_name: string; days_blocked: number }>;
  highlight: string | null;
};

function getDefaultTenantId(): string {
  return process.env.DEFAULT_TENANT_ID || 'edro';
}

export async function buildDailyDigest(tenantId: string): Promise<DailyDigestContent> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const [dueRes, blockedRes, deliveredRes, riskyRes, signalsRes, activeCountRes] = await Promise.all([
    // Jobs due today (not closed)
    query(`
      SELECT pc.id, pc.title, c.name AS client_name, pc.status,
             pc.due_at::text AS due_at
      FROM project_cards pc
      LEFT JOIN clients c ON c.id::text = pc.client_id
      WHERE pc.due_at::date = $1
        AND pc.status NOT IN ('done', 'published', 'approved')
      ORDER BY pc.due_at ASC
      LIMIT 20
    `, [todayStr]),

    // Jobs currently blocked
    query(`
      SELECT pc.id, pc.title, c.name AS client_name,
             pc.updated_at::text AS blocked_since
      FROM project_cards pc
      LEFT JOIN clients c ON c.id::text = pc.client_id
      WHERE pc.status = 'blocked'
      ORDER BY pc.updated_at ASC
      LIMIT 20
    `, []),

    // Jobs delivered/done yesterday
    query(`
      SELECT pc.id, pc.title, c.name AS client_name
      FROM project_cards pc
      LEFT JOIN clients c ON c.id::text = pc.client_id
      WHERE pc.status IN ('done', 'published')
        AND pc.updated_at::date = $1
      ORDER BY pc.updated_at DESC
      LIMIT 20
    `, [yesterdayStr]),

    // Clients with low health score
    query(`
      SELECT c.id, c.name,
             hs.score AS health_score,
             hs.trend
      FROM clients c
      LEFT JOIN LATERAL (
        SELECT score, trend FROM client_health_scores
        WHERE client_id = c.id
        ORDER BY period_date DESC LIMIT 1
      ) hs ON true
      WHERE c.tenant_id = $1
        AND hs.score < 50
      ORDER BY hs.score ASC
      LIMIT 5
    `, [tenantId]),

    // Critical signals
    query(`
      SELECT title, summary, client_name
      FROM operational_signals
      WHERE tenant_id = $1
        AND severity >= 80
        AND resolved_at IS NULL
        AND (snoozed_until IS NULL OR snoozed_until < now())
      ORDER BY severity DESC
      LIMIT 5
    `, [tenantId]),

    // Total active jobs
    query(`
      SELECT COUNT(*) AS total
      FROM project_cards
      WHERE status NOT IN ('done', 'published', 'approved')
    `, []),
  ]);

  const dueToday = dueRes.rows;
  const blocked = blockedRes.rows;
  const delivered = deliveredRes.rows;
  const risky = riskyRes.rows;
  const signals = signalsRes.rows;
  const activeTotal = parseInt(activeCountRes.rows[0]?.total ?? '0', 10);

  // Compute top action
  let topAction: string | null = null;
  if (signals.length > 0) {
    topAction = signals[0].title;
  } else if (blocked.length > 0) {
    topAction = `Desbloquear: ${blocked[0].title} (${blocked[0].client_name ?? '—'})`;
  } else if (dueToday.length > 0) {
    topAction = `Entregar hoje: ${dueToday[0].title} (${dueToday[0].client_name ?? '—'})`;
  }

  return {
    jobs_due_today: dueToday,
    jobs_blocked: blocked,
    jobs_delivered_yesterday: delivered,
    clients_at_risk: risky.map((r: any) => ({
      id: r.id,
      name: r.name,
      health_score: r.health_score !== null ? parseInt(r.health_score, 10) : null,
      risk_reason: r.trend === 'down' ? 'Saúde em queda' : 'Score baixo',
    })),
    signals_critical: signals,
    active_jobs_total: activeTotal,
    top_action: topAction,
  };
}

export async function buildWeeklyDigest(tenantId: string): Promise<WeeklyDigestContent> {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 6 = Saturday
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [deliveredRes, openedRes, blockedEowRes, slaRes, topClientsRes, topBlockersRes, healthRes] = await Promise.all([
    query(`
      SELECT COUNT(*) AS total
      FROM project_cards
      WHERE status IN ('done', 'published', 'approved')
        AND updated_at::date BETWEEN $1 AND $2
    `, [weekStartStr, todayStr]),

    query(`
      SELECT COUNT(*) AS total
      FROM project_cards
      WHERE created_at::date BETWEEN $1 AND $2
    `, [weekStartStr, todayStr]),

    query(`
      SELECT COUNT(*) AS total
      FROM project_cards
      WHERE status = 'blocked'
    `, []),

    // SLA: jobs delivered on time (due_at not null, delivered before or on due_at)
    query(`
      SELECT
        COUNT(*) FILTER (WHERE updated_at <= due_at OR due_at IS NULL) AS on_time,
        COUNT(*) AS total
      FROM project_cards
      WHERE status IN ('done', 'published', 'approved')
        AND updated_at::date BETWEEN $1 AND $2
    `, [weekStartStr, todayStr]),

    // Top clients by jobs delivered this week
    query(`
      SELECT c.name, COUNT(pc.id) AS jobs_delivered,
             hs.score AS health_score
      FROM project_cards pc
      LEFT JOIN clients c ON c.id::text = pc.client_id
      LEFT JOIN LATERAL (
        SELECT score FROM client_health_scores
        WHERE client_id = c.id
        ORDER BY period_date DESC LIMIT 1
      ) hs ON true
      WHERE pc.status IN ('done', 'published', 'approved')
        AND pc.updated_at::date BETWEEN $1 AND $2
      GROUP BY c.name, hs.score
      ORDER BY jobs_delivered DESC
      LIMIT 5
    `, [weekStartStr, todayStr]),

    // Top blockers (blocked jobs sorted by age)
    query(`
      SELECT pc.title, c.name AS client_name,
             EXTRACT(DAY FROM now() - pc.updated_at)::int AS days_blocked
      FROM project_cards pc
      LEFT JOIN clients c ON c.id::text = pc.client_id
      WHERE pc.status = 'blocked'
      ORDER BY pc.updated_at ASC
      LIMIT 5
    `, []),

    // Avg health score
    query(`
      SELECT ROUND(AVG(hs.score)) AS avg_score
      FROM clients c
      CROSS JOIN LATERAL (
        SELECT score FROM client_health_scores
        WHERE client_id = c.id
        ORDER BY period_date DESC LIMIT 1
      ) hs
      WHERE c.tenant_id = $1
    `, [tenantId]),
  ]);

  const delivered = parseInt(deliveredRes.rows[0]?.total ?? '0', 10);
  const opened = parseInt(openedRes.rows[0]?.total ?? '0', 10);
  const blockedEow = parseInt(blockedEowRes.rows[0]?.total ?? '0', 10);
  const slaOnTime = parseInt(slaRes.rows[0]?.on_time ?? '0', 10);
  const slaTotal = parseInt(slaRes.rows[0]?.total ?? '0', 10);
  const slaRate = slaTotal > 0 ? `${Math.round((slaOnTime / slaTotal) * 100)}%` : '—';
  const avgHealth = healthRes.rows[0]?.avg_score ? parseInt(healthRes.rows[0].avg_score, 10) : null;

  let highlight: string | null = null;
  if (delivered > 0) {
    highlight = `${delivered} job${delivered > 1 ? 's' : ''} entregue${delivered > 1 ? 's' : ''} na semana com SLA de ${slaRate}.`;
  }

  return {
    jobs_delivered: delivered,
    jobs_opened: opened,
    jobs_blocked_eow: blockedEow,
    sla_hit_rate: slaRate,
    avg_health_score: avgHealth,
    top_clients: topClientsRes.rows.map((r: any) => ({
      name: r.name ?? '—',
      jobs_delivered: parseInt(r.jobs_delivered, 10),
      health_score: r.health_score !== null ? parseInt(r.health_score, 10) : null,
    })),
    top_blockers: topBlockersRes.rows.map((r: any) => ({
      title: r.title,
      client_name: r.client_name ?? '—',
      days_blocked: r.days_blocked ?? 0,
    })),
    highlight,
  };
}

export async function generateAndSaveDigest(tenantId: string, type: DigestType): Promise<void> {
  const today = new Date();
  const periodStart = new Date(today);
  let periodEnd = new Date(today);

  if (type === 'weekly') {
    const dayOfWeek = today.getDay();
    periodStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    periodEnd = new Date(today);
  }

  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];

  const content = type === 'daily'
    ? await buildDailyDigest(tenantId)
    : await buildWeeklyDigest(tenantId);

  const narrativeText = type === 'daily'
    ? buildDailyNarrative(content as DailyDigestContent)
    : buildWeeklyNarrative(content as WeeklyDigestContent);

  await query(`
    INSERT INTO agency_digests (tenant_id, type, period_start, period_end, content, narrative_text)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (tenant_id, type, period_start) DO UPDATE
      SET content = EXCLUDED.content,
          narrative_text = EXCLUDED.narrative_text
  `, [tenantId, type, periodStartStr, periodEndStr, JSON.stringify(content), narrativeText]);

  // Send email to configured recipients
  const recipients = (process.env.DIGEST_EMAIL_RECIPIENTS || '').split(',').map((e) => e.trim()).filter(Boolean);
  if (recipients.length === 0) return;

  const subject = type === 'daily'
    ? `📋 Resumo do dia — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`
    : `📊 Retrospectiva semanal — Edro.Digital`;

  const html = buildDigestEmailHtml(type, content, narrativeText);

  for (const to of recipients) {
    await sendEmail({ to, subject, html }).catch((e) =>
      console.error('[agencyDigest] email error:', e?.message)
    );
  }
}

function buildDailyNarrative(c: DailyDigestContent): string {
  const lines: string[] = [];
  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  lines.push(`Bom dia! Hoje é ${dateStr}.`);
  lines.push(`Há ${c.active_jobs_total} jobs ativos na operação.`);

  if (c.jobs_due_today.length > 0) {
    lines.push(`${c.jobs_due_today.length} job${c.jobs_due_today.length > 1 ? 's vencem' : ' vence'} hoje.`);
  }
  if (c.jobs_blocked.length > 0) {
    lines.push(`${c.jobs_blocked.length} job${c.jobs_blocked.length > 1 ? 's estão bloqueados' : ' está bloqueado'}.`);
  }
  if (c.jobs_delivered_yesterday.length > 0) {
    lines.push(`Ontem foram entregues ${c.jobs_delivered_yesterday.length} job${c.jobs_delivered_yesterday.length > 1 ? 's' : ''}.`);
  }
  if (c.clients_at_risk.length > 0) {
    lines.push(`${c.clients_at_risk.length} cliente${c.clients_at_risk.length > 1 ? 's precisam' : ' precisa'} de atenção.`);
  }
  if (c.top_action) {
    lines.push(`Prioridade do dia: ${c.top_action}`);
  }
  return lines.join(' ');
}

function buildWeeklyNarrative(c: WeeklyDigestContent): string {
  const lines: string[] = [];
  lines.push(`Retrospectiva da semana:`);
  lines.push(`${c.jobs_delivered} job${c.jobs_delivered !== 1 ? 's' : ''} entregue${c.jobs_delivered !== 1 ? 's' : ''}, ${c.jobs_opened} aberto${c.jobs_opened !== 1 ? 's' : ''}.`);
  lines.push(`SLA: ${c.sla_hit_rate}.`);
  if (c.avg_health_score !== null) {
    lines.push(`Saúde média dos clientes: ${c.avg_health_score}/100.`);
  }
  if (c.jobs_blocked_eow > 0) {
    lines.push(`${c.jobs_blocked_eow} job${c.jobs_blocked_eow !== 1 ? 's bloqueados' : ' bloqueado'} no final de semana.`);
  }
  if (c.highlight) lines.push(c.highlight);
  return lines.join(' ');
}

function buildDigestEmailHtml(type: DigestType, content: DailyDigestContent | WeeklyDigestContent, narrative: string): string {
  const title = type === 'daily' ? 'Resumo do Dia' : 'Retrospectiva Semanal';

  if (type === 'daily') {
    const c = content as DailyDigestContent;
    const jobsDueHtml = c.jobs_due_today.length > 0
      ? c.jobs_due_today.map((j) => `<li><strong>${j.title}</strong> — ${j.client_name ?? '—'}</li>`).join('')
      : '<li style="color:#aaa">Nenhum job vence hoje</li>';
    const blockedHtml = c.jobs_blocked.length > 0
      ? c.jobs_blocked.map((j) => `<li><strong>${j.title}</strong> — ${j.client_name ?? '—'}</li>`).join('')
      : '<li style="color:#aaa">Nenhum job bloqueado</li>';

    return `
<!DOCTYPE html><html><body style="font-family:sans-serif;color:#222;max-width:600px;margin:auto;padding:24px">
<h2 style="color:#ff6600">${title}</h2>
<p style="font-size:16px;line-height:1.6">${narrative}</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0">
<h3>Vencem hoje (${c.jobs_due_today.length})</h3><ul>${jobsDueHtml}</ul>
<h3>Bloqueados (${c.jobs_blocked.length})</h3><ul>${blockedHtml}</ul>
${c.clients_at_risk.length > 0 ? `<h3>Clientes em risco</h3><ul>${c.clients_at_risk.map((cl) => `<li>${cl.name} — score ${cl.health_score ?? '—'}</li>`).join('')}</ul>` : ''}
<hr style="border:none;border-top:1px solid #eee;margin:20px 0">
<p style="font-size:12px;color:#aaa">Edro.Digital — Resumo automático diário</p>
</body></html>`;
  } else {
    const c = content as WeeklyDigestContent;
    return `
<!DOCTYPE html><html><body style="font-family:sans-serif;color:#222;max-width:600px;margin:auto;padding:24px">
<h2 style="color:#ff6600">${title}</h2>
<p style="font-size:16px;line-height:1.6">${narrative}</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0">
<table style="width:100%;border-collapse:collapse">
  <tr><td style="padding:8px;border:1px solid #eee">Jobs entregues</td><td style="padding:8px;border:1px solid #eee;font-weight:bold">${c.jobs_delivered}</td></tr>
  <tr><td style="padding:8px;border:1px solid #eee">Jobs abertos</td><td style="padding:8px;border:1px solid #eee;font-weight:bold">${c.jobs_opened}</td></tr>
  <tr><td style="padding:8px;border:1px solid #eee">SLA</td><td style="padding:8px;border:1px solid #eee;font-weight:bold">${c.sla_hit_rate}</td></tr>
  <tr><td style="padding:8px;border:1px solid #eee">Saúde média</td><td style="padding:8px;border:1px solid #eee;font-weight:bold">${c.avg_health_score ?? '—'}/100</td></tr>
</table>
${c.top_clients.length > 0 ? `<h3>Top clientes</h3><ul>${c.top_clients.map((cl) => `<li>${cl.name} — ${cl.jobs_delivered} job${cl.jobs_delivered !== 1 ? 's' : ''}</li>`).join('')}</ul>` : ''}
${c.top_blockers.length > 0 ? `<h3>Maiores gargalos</h3><ul>${c.top_blockers.map((b) => `<li>${b.title} (${b.client_name}) — ${b.days_blocked}d bloqueado</li>`).join('')}</ul>` : ''}
<hr style="border:none;border-top:1px solid #eee;margin:20px 0">
<p style="font-size:12px;color:#aaa">Edro.Digital — Retrospectiva automática semanal</p>
</body></html>`;
  }
}
