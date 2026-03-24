/**
 * opsDigestWorker.ts
 *
 * Digest diário de operações — roda todo dia às 09:00 (± 4 min).
 * Envia email para admins/managers com:
 *   - Jobs críticos (blocked, P0 sem dono, overdue)
 *   - Equipe sobrecarregada
 *   - Resumo por bucket
 *   - Link direto para Central de Operações
 */

import { query } from '../db';
import { sendEmail } from '../services/emailService';

let lastRunDate = '';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowHour() {
  return new Date().getHours();
}

async function buildOpsDigest(tenantId: string): Promise<{
  critical: any[];
  overdue: any[];
  unowned: any[];
  buckets: Record<string, number>;
} | null> {
  const CLOSED = `('published','done','archived')`;

  const [criticalRes, overdueRes, unownedRes, bucketsRes] = await Promise.all([
    query(
      `SELECT j.id, j.title, j.status, j.priority_band, j.deadline_at,
              c.name AS client_name,
              COALESCE(NULLIF(u.name,''), split_part(u.email,'@',1)) AS owner_name
         FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
         LEFT JOIN edro_users u ON u.id = j.owner_id
        WHERE j.tenant_id = $1
          AND j.status NOT IN ${CLOSED}
          AND (j.status = 'blocked' OR (j.priority_band = 'p0' AND j.owner_id IS NULL))
        ORDER BY j.priority_band, j.deadline_at ASC NULLS LAST
        LIMIT 10`,
      [tenantId]
    ),
    query(
      `SELECT j.id, j.title, j.deadline_at,
              c.name AS client_name,
              COALESCE(NULLIF(u.name,''), split_part(u.email,'@',1)) AS owner_name
         FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
         LEFT JOIN edro_users u ON u.id = j.owner_id
        WHERE j.tenant_id = $1
          AND j.status NOT IN ${CLOSED}
          AND j.deadline_at < NOW()
        ORDER BY j.deadline_at ASC
        LIMIT 10`,
      [tenantId]
    ),
    query(
      `SELECT j.id, j.title, j.priority_band, c.name AS client_name
         FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
        WHERE j.tenant_id = $1
          AND j.owner_id IS NULL
          AND j.status NOT IN ${CLOSED}
          AND j.priority_band IN ('p0','p1')
        ORDER BY j.priority_band, j.created_at ASC
        LIMIT 10`,
      [tenantId]
    ),
    query(
      `SELECT
         SUM(CASE WHEN status IN ('intake','planned','ready') THEN 1 ELSE 0 END) AS entrou,
         SUM(CASE WHEN status IN ('allocated','in_progress','in_review') THEN 1 ELSE 0 END) AS producao,
         SUM(CASE WHEN status IN ('awaiting_approval','approved','scheduled','blocked') THEN 1 ELSE 0 END) AS esperando,
         SUM(CASE WHEN status IN ('published','done') THEN 1 ELSE 0 END) AS entregue,
         COUNT(*) AS total
       FROM jobs
      WHERE tenant_id = $1 AND status <> 'archived'`,
      [tenantId]
    ),
  ]);

  const b = bucketsRes.rows[0] || {};
  return {
    critical: criticalRes.rows,
    overdue: overdueRes.rows,
    unowned: unownedRes.rows,
    buckets: {
      entrou: Number(b.entrou || 0),
      producao: Number(b.producao || 0),
      esperando: Number(b.esperando || 0),
      entregue: Number(b.entregue || 0),
      total: Number(b.total || 0),
    },
  };
}

function buildDigestHtml(digest: NonNullable<Awaited<ReturnType<typeof buildOpsDigest>>>, baseUrl: string) {
  const rows = (items: any[], cols: (x: any) => string[]) =>
    items.map((i) => `<tr>${cols(i).map((c) => `<td style="padding:4px 8px;border-bottom:1px solid #eee">${c}</td>`).join('')}</tr>`).join('');

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return `
<!DOCTYPE html><html><body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#E85219">☀️ Digest Operacional — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h2>

<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
<tr>
  <td style="padding:8px 12px;background:#f59e0b22;border-radius:6px;text-align:center"><strong>${digest.buckets.entrou}</strong><br><small>Entrada</small></td>
  <td style="padding:8px 12px;background:#13DEB922;border-radius:6px;text-align:center"><strong>${digest.buckets.producao}</strong><br><small>Produção</small></td>
  <td style="padding:8px 12px;background:#FFAE1F22;border-radius:6px;text-align:center"><strong>${digest.buckets.esperando}</strong><br><small>Esperando</small></td>
  <td style="padding:8px 12px;background:#6366f122;border-radius:6px;text-align:center"><strong>${digest.buckets.entregue}</strong><br><small>Entregues</small></td>
  <td style="padding:8px 12px;background:#f1f5f9;border-radius:6px;text-align:center"><strong>${digest.buckets.total}</strong><br><small>Total</small></td>
</tr></table>

${digest.critical.length ? `
<h3 style="color:#dc2626">🚨 Críticos (${digest.critical.length})</h3>
<table style="width:100%;border-collapse:collapse">
<tr style="background:#f1f5f9"><th style="padding:4px 8px;text-align:left">Demanda</th><th>Cliente</th><th>Status</th><th>Prazo</th></tr>
${rows(digest.critical, (j) => [j.title, j.client_name || '—', j.status, fmt(j.deadline_at)])}
</table>` : '<p style="color:#16a34a">✅ Nenhum crítico no momento.</p>'}

${digest.overdue.length ? `
<h3 style="color:#9a3412">⏰ Prazo vencido (${digest.overdue.length})</h3>
<table style="width:100%;border-collapse:collapse">
<tr style="background:#f1f5f9"><th style="padding:4px 8px;text-align:left">Demanda</th><th>Cliente</th><th>Responsável</th><th>Prazo</th></tr>
${rows(digest.overdue, (j) => [j.title, j.client_name || '—', j.owner_name || 'Sem dono', fmt(j.deadline_at)])}
</table>` : ''}

${digest.unowned.length ? `
<h3 style="color:#b45309">👤 P0/P1 sem responsável (${digest.unowned.length})</h3>
<table style="width:100%;border-collapse:collapse">
<tr style="background:#f1f5f9"><th style="padding:4px 8px;text-align:left">Demanda</th><th>Cliente</th><th>Prioridade</th></tr>
${rows(digest.unowned, (j) => [j.title, j.client_name || '—', j.priority_band.toUpperCase()])}
</table>` : ''}

<p style="margin-top:24px">
  <a href="${baseUrl}/admin/operacoes/jobs" style="background:#E85219;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700">
    Abrir Central de Operações →
  </a>
</p>
<p style="color:#94a3b8;font-size:11px">Edro.Digital · digest gerado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
</body></html>`;
}

async function runOpsDigest() {
  if (nowHour() !== 9) return; // only at 09h
  if (lastRunDate === todayStr()) return; // run once per day
  lastRunDate = todayStr();

  const { rows: tenants } = await query(
    `SELECT DISTINCT tu.tenant_id, u.email, COALESCE(NULLIF(u.name,''), split_part(u.email,'@',1)) AS name
       FROM tenant_users tu
       JOIN edro_users u ON u.id = tu.user_id
      WHERE tu.role IN ('admin','manager','gestor')
        AND u.email IS NOT NULL
      ORDER BY tu.tenant_id, u.email`,
    []
  );

  const byTenant = new Map<string, { email: string; name: string }[]>();
  for (const row of tenants) {
    if (!byTenant.has(row.tenant_id)) byTenant.set(row.tenant_id, []);
    byTenant.get(row.tenant_id)!.push({ email: row.email, name: row.name });
  }

  const baseUrl = process.env.APP_URL || 'https://app.edro.digital';

  for (const [tenantId, recipients] of byTenant) {
    try {
      const digest = await buildOpsDigest(tenantId);
      if (!digest) continue;
      if (digest.buckets.total === 0) continue; // skip tenants with no jobs

      const html = buildDigestHtml(digest, baseUrl);
      const critCount = digest.critical.length + digest.overdue.length;
      const subject = critCount > 0
        ? `☀️ Digest Ops — ${critCount} iten${critCount > 1 ? 's' : ''} precisam de atenção`
        : `☀️ Digest Ops — ${digest.buckets.total} demandas ativas, sem críticos`;

      for (const r of recipients) {
        await sendEmail({ to: r.email, subject, html, text: subject, tenantId }).catch(() => {});
      }
    } catch (e: any) {
      console.error('[opsDigest] tenant failed:', tenantId, e?.message);
    }
  }
}

export async function runOpsDigestWorkerOnce() {
  try {
    await runOpsDigest();
  } catch (e: any) {
    console.error('[opsDigest] error:', e?.message);
  }
}
