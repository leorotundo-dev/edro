/**
 * opsNotificationService.ts
 *
 * Triggers de notificação para eventos operacionais:
 *  1. notifyJobBlocked     — chamado ao mudar status para 'blocked'
 *  2. notifyJobAssigned    — chamado ao atribuir owner a um job
 *  3. scanOverdueJobs      — cron: jobs que ultrapassaram o deadline sem entrega
 *  4. scanUnownedJobs      — cron: P0/P1 sem dono há > 2h
 */

import { query } from '../../db';
import { notifyEvent } from '../notificationService';

const CLOSED = new Set(['published', 'done', 'archived']);

/* ── helpers ─────────────────────────────────────────────── */

async function getAdminsAndManagers(tenantId: string) {
  const { rows } = await query(
    `SELECT u.id, u.email, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name
       FROM tenant_users tu
       JOIN edro_users u ON u.id = tu.user_id
      WHERE tu.tenant_id = $1 AND tu.role IN ('admin', 'manager', 'gestor')`,
    [tenantId]
  );
  return rows as { id: string; email: string; name: string }[];
}

async function getUserById(userId: string) {
  const { rows } = await query(
    `SELECT id, email, COALESCE(NULLIF(name, ''), split_part(email, '@', 1)) AS name FROM edro_users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] as { id: string; email: string; name: string } | undefined;
}

/* ── 1. Job bloqueado ─────────────────────────────────────── */

export async function notifyJobBlocked(
  tenantId: string,
  job: { id: string; title: string; client_name?: string | null; owner_id?: string | null },
  reason?: string | null
) {
  const managers = await getAdminsAndManagers(tenantId);
  const link = `/admin/operacoes/jobs?group=risk`;
  const title = `🚨 Demanda bloqueada: ${job.title}`;
  const body = [
    job.client_name ? `Cliente: ${job.client_name}` : null,
    reason ? `Motivo: ${reason}` : null,
    'Acesse a Central de Operações para resolver.',
  ].filter(Boolean).join(' · ');

  // Notify managers
  for (const m of managers) {
    await notifyEvent({ event: 'job.blocked', tenantId, userId: m.id, title, body, link, recipientEmail: m.email }).catch(() => {});
  }

  // Notify owner if different from managers
  if (job.owner_id) {
    const owner = await getUserById(job.owner_id);
    if (owner && !managers.find((m) => m.id === owner.id)) {
      await notifyEvent({ event: 'job.blocked', tenantId, userId: owner.id, title, body, link, recipientEmail: owner.email }).catch(() => {});
    }
  }
}

/* ── 2. Job atribuído ─────────────────────────────────────── */

export async function notifyJobAssigned(
  tenantId: string,
  job: { id: string; title: string; client_name?: string | null; deadline_at?: string | null },
  newOwnerId: string
) {
  const owner = await getUserById(newOwnerId);
  if (!owner) return;

  const link = `/meu-trabalho`;
  const title = `📋 Nova demanda atribuída: ${job.title}`;
  const body = [
    job.client_name ? `Cliente: ${job.client_name}` : null,
    job.deadline_at ? `Prazo: ${new Date(job.deadline_at).toLocaleDateString('pt-BR')}` : null,
  ].filter(Boolean).join(' · ') || 'Acesse a Central de Operações para ver detalhes.';

  await notifyEvent({ event: 'job.assigned', tenantId, userId: owner.id, title, body, link, recipientEmail: owner.email }).catch(() => {});
}

/* ── 3. Job pronto para revisão (awaiting_approval) ──────────── */

export async function notifyJobReadyForReview(
  tenantId: string,
  job: { id: string; title: string; client_name?: string | null; owner_id?: string | null }
) {
  const managers = await getAdminsAndManagers(tenantId);
  const link = `/admin/operacoes/jobs?highlight=${job.id}`;
  const title = `✅ Pronto para revisão: ${job.title}`;
  const body = [
    job.client_name ? `Cliente: ${job.client_name}` : null,
    'Acesse a Central para aprovar ou solicitar ajuste.',
  ].filter(Boolean).join(' · ');

  for (const m of managers) {
    await notifyEvent({
      event: 'job.ready_for_review',
      tenantId,
      userId: m.id,
      title,
      body,
      link,
      recipientEmail: m.email,
      defaultChannels: ['in_app', 'whatsapp'],
    }).catch(() => {});
  }
}

/* ── 4. Scanner de overdue ────────────────────────────────── */

export async function scanOverdueJobs(tenantId: string) {
  // Find jobs that passed their deadline in the last 2h (to avoid re-notifying every run)
  const { rows } = await query(
    `SELECT j.id, j.title, j.deadline_at, j.owner_id,
            c.name AS client_name,
            COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
            u.email AS owner_email
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN edro_users u ON u.id = j.owner_id
      WHERE j.tenant_id = $1
        AND j.status NOT IN ('published', 'done', 'archived')
        AND j.deadline_at < NOW()
        AND j.deadline_at > NOW() - INTERVAL '2 hours'`,
    [tenantId]
  );

  const managers = await getAdminsAndManagers(tenantId);

  for (const job of rows) {
    const title = `⏰ Prazo vencido: ${job.title}`;
    const body = [
      job.client_name ? `Cliente: ${job.client_name}` : null,
      job.owner_name ? `Responsável: ${job.owner_name}` : 'Sem responsável',
    ].filter(Boolean).join(' · ');
    const link = `/admin/operacoes/jobs?group=risk`;

    for (const m of managers) {
      await notifyEvent({ event: 'job.overdue', tenantId, userId: m.id, title, body, link, recipientEmail: m.email }).catch(() => {});
    }
    if (job.owner_id && job.owner_email && !managers.find((m) => m.id === job.owner_id)) {
      await notifyEvent({ event: 'job.overdue', tenantId, userId: job.owner_id, title, body, link, recipientEmail: job.owner_email }).catch(() => {});
    }
  }

  return rows.length;
}

/* ── 4. Scanner de sem dono ───────────────────────────────── */

export async function scanUnownedJobs(tenantId: string) {
  // P0 or P1 jobs without owner for > 2h
  const { rows } = await query(
    `SELECT j.id, j.title, j.priority_band, j.created_at,
            c.name AS client_name
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
      WHERE j.tenant_id = $1
        AND j.owner_id IS NULL
        AND j.status NOT IN ('published', 'done', 'archived')
        AND j.priority_band IN ('p0', 'p1')
        AND j.created_at < NOW() - INTERVAL '2 hours'`,
    [tenantId]
  );

  if (!rows.length) return 0;

  const managers = await getAdminsAndManagers(tenantId);
  const title = `👤 ${rows.length} demanda${rows.length > 1 ? 's' : ''} sem responsável`;
  const body = rows
    .slice(0, 3)
    .map((j: any) => `${j.priority_band.toUpperCase()} · ${j.title}`)
    .join(', ') + (rows.length > 3 ? ` e mais ${rows.length - 3}...` : '');
  const link = `/admin/operacoes/jobs?unassigned=true`;

  for (const m of managers) {
    await notifyEvent({ event: 'job.unowned', tenantId, userId: m.id, title, body, link, recipientEmail: m.email }).catch(() => {});
  }

  return rows.length;
}
