/**
 * Bedel Worker — automatic DA allocation + delivery monitoring
 *
 * Phase 1 — Allocation proposals (every tick):
 *   - Finds ready jobs without an owner
 *   - Scores all active freelancers via allocationService.proposeAllocations()
 *   - Score >= 85: auto-allocates + notifies the freelancer
 *   - Score >= 50: sends ranked suggestion to admins (in-app notification → job link)
 *   - Cooldown: re-proposes the same job at most every 2h
 *
 * Phase 2 — Delivery monitor (every tick, level-gated):
 *   - Finds allocated/in_progress jobs and checks movement + deadline
 *   - Sends tiered alerts (⚠️ ambient / 🔴 critical) to admins
 *   - Cooldown: ⚠️ 4h, 🔴 2h per job
 *
 * Phase 3 — Closure (not here):
 *   - updateFreelancerScores() and createBillingEntryForJob() already wired in
 *     apps/backend/src/routes/jobs.ts when status transitions to 'done'/'published'
 */

import { query } from '../db';
import { proposeAllocations } from '../services/allocationService';
import { notifyEvent } from '../services/notificationService';

// ── Config ────────────────────────────────────────────────────────────────────

/** Score threshold above which Bedel auto-allocates without human approval */
const AUTO_ALLOCATE_SCORE = 85;
/** Minimum score to generate a suggestion notification */
const SUGGEST_SCORE = 50;
/** How long to wait before re-proposing the same unallocated job (ms) */
const PROPOSAL_COOLDOWN_H = 2;
/** Cooldown for non-critical delivery alerts (⚠️) per job */
const MONITOR_AMBIENT_COOLDOWN_H = 4;
/** Cooldown for critical delivery alerts (🔴) per job */
const MONITOR_CRITICAL_COOLDOWN_H = 2;
/** Max jobs processed per phase per tick (safety cap) */
const JOBS_PER_TICK = 15;

// ── Types ─────────────────────────────────────────────────────────────────────

type PendingJob = {
  id: string;
  tenant_id: string;
  title: string;
  deadline_at: string | null;
  updated_at: string | null;
  allocated_at: string | null;
  status: string;
  owner_id: string | null;
  client_name: string | null;
};

type AdminRecipient = {
  user_id: string;
  email: string | null;
  whatsapp_jid: string | null;
};

type RecipientChannel = {
  userId: string;
  email?: string | null;
  phone?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns admin/manager recipients for a tenant with their contact channels */
async function getAdminRecipients(tenantId: string): Promise<AdminRecipient[]> {
  const { rows } = await query<AdminRecipient>(
    `SELECT tu.user_id,
            u.email,
            fp.whatsapp_jid
       FROM tenant_users tu
       LEFT JOIN edro_users u ON u.id = tu.user_id
       LEFT JOIN freelancer_profiles fp ON fp.user_id = tu.user_id
      WHERE tu.tenant_id::text = $1::text
        AND tu.role IN ('admin', 'manager', 'gestor')
      LIMIT 10`,
    [tenantId],
  );
  return rows;
}

/** Check if a bedel notification was already sent for this job within the cooldown window */
async function isOnCooldown(
  tenantId: string,
  jobId: string,
  eventType: string,
  cooldownHours: number,
): Promise<boolean> {
  const { rows } = await query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt
       FROM in_app_notifications
      WHERE tenant_id = $1
        AND event_type = $2
        AND link LIKE $3
        AND created_at > now() - ($4 || ' hours')::interval`,
    [tenantId, eventType, `%${jobId}%`, String(cooldownHours)],
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

async function notifyRecipients(
  tenantId: string,
  recipients: RecipientChannel[],
  eventType: string,
  title: string,
  body: string,
  link: string,
): Promise<void> {
  for (const recipient of recipients) {
    await notifyEvent({
      event: eventType,
      tenantId,
      userId: recipient.userId,
      title,
      body,
      link,
      recipientEmail: recipient.email ?? undefined,
      recipientPhone: recipient.phone ?? undefined,
      defaultChannels: ['in_app', 'email', 'whatsapp'],
      payload: {
        source: 'bedel',
        event_type: eventType,
        link,
      },
    }).catch(() => {});
  }
}

// ── Phase 1: Allocation proposals ────────────────────────────────────────────

async function runAllocationPhase(): Promise<void> {
  const { rows: jobs } = await query<PendingJob>(
    `SELECT j.id, j.tenant_id, j.title, j.deadline_at, j.updated_at, j.allocated_at,
            j.status, j.owner_id,
            c.display_name AS client_name
       FROM jobs j
       LEFT JOIN edro_clients c ON c.id::text = j.client_id::text
      WHERE j.status = 'ready'
        AND j.owner_id IS NULL
        AND j.tenant_id IS NOT NULL
        AND (j.archived_at IS NULL OR j.archived_at > now())
      ORDER BY j.deadline_at ASC NULLS LAST
      LIMIT $1`,
    [JOBS_PER_TICK],
  );

  for (const job of jobs) {
    try {
      if (await isOnCooldown(job.tenant_id, job.id, 'bedel_allocation', PROPOSAL_COOLDOWN_H)) continue;

      const proposals = await proposeAllocations(job.tenant_id, job.id);
      if (!proposals.length || proposals[0].score < SUGGEST_SCORE) continue;

      const top3 = proposals.slice(0, 3);
      const deadline = job.deadline_at
        ? new Date(job.deadline_at).toLocaleDateString('pt-BR')
        : 'sem prazo';

      const bodyLines = top3.map((p, i) => {
        const rank = i === 0 ? '★' : `${i + 1}.`;
        const pct = p.punctualityScore != null ? ` · ${Math.round(p.punctualityScore)}% pontual` : '';
        return `${rank} ${p.name} [${p.score}pts]${pct} — ${p.rationale}`;
      });

      const body = `${job.client_name ?? 'Sem cliente'} · Prazo: ${deadline}\n\n${bodyLines.join('\n')}`;
      const link = `/admin/operacoes/jobs?highlight=${job.id}`;
      const admins = await getAdminRecipients(job.tenant_id);

      await notifyRecipients(
        job.tenant_id,
        admins.map((admin) => ({
          userId: admin.user_id,
          email: admin.email,
          phone: admin.whatsapp_jid,
        })),
        'bedel_allocation',
        `Sugestão de alocação: ${job.title}`,
        body,
        link,
      );

      // Auto-allocate when top score is very high — no human needed
      if (proposals[0].score >= AUTO_ALLOCATE_SCORE) {
        const best = proposals[0];
        const { rowCount } = await query(
          `UPDATE jobs
              SET owner_id     = $1,
                  status       = CASE WHEN status = 'ready' THEN 'allocated' ELSE status END,
                  allocated_at = now()
            WHERE id = $2 AND tenant_id = $3 AND owner_id IS NULL`,
          [best.freelancerId, job.id, job.tenant_id],
        );

        if ((rowCount ?? 0) > 0) {
          // Notify the freelancer
          const deadline2 = job.deadline_at ? new Date(job.deadline_at).toLocaleDateString('pt-BR') : null;
          const frelaBody = [
            job.client_name ? `Cliente: ${job.client_name}` : null,
            deadline2 ? `Prazo: ${deadline2}` : 'Sem prazo definido',
          ].filter(Boolean).join('\n');

          const { rows: freelancerRows } = await query<{ email: string | null; whatsapp_jid: string | null }>(
            `SELECT u.email, fp.whatsapp_jid
               FROM edro_users u
               LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
              WHERE u.id::text = $1::text
              LIMIT 1`,
            [best.freelancerId],
          );
          const freelancer = freelancerRows[0];

          await notifyEvent({
            event: 'job_assigned',
            tenantId: job.tenant_id,
            userId: best.freelancerId,
            title: `Novo escopo: ${job.title}`,
            body: frelaBody,
            link: '/jobs',
            recipientEmail: freelancer?.email ?? undefined,
            recipientPhone: freelancer?.whatsapp_jid ?? undefined,
            defaultChannels: ['in_app', 'whatsapp', 'email'],
            payload: {
              source: 'bedel',
              job_id: job.id,
              client_name: job.client_name,
            },
          }).catch(() => {});

          // Let admins know it was auto-allocated
          await notifyRecipients(
            job.tenant_id,
            admins.map((admin) => ({
              userId: admin.user_id,
              email: admin.email,
              phone: admin.whatsapp_jid,
            })),
            'bedel_auto_allocated',
            `🤖 Alocação automática: ${job.title}`,
            `Bedel alocou automaticamente para ${best.name} (score ${best.score}pts).\n${job.client_name ?? ''} · Prazo: ${deadline}`,
            link,
          );
        }
      }
    } catch (err: any) {
      console.warn(`[bedel/allocation] job ${job.id}: ${err?.message}`);
    }
  }
}

// ── Phase 2: Delivery monitor ─────────────────────────────────────────────────

async function runMonitorPhase(): Promise<void> {
  const { rows: jobs } = await query<PendingJob>(
    `SELECT j.id, j.tenant_id, j.title, j.status, j.deadline_at,
            j.updated_at, j.allocated_at, j.owner_id,
            c.display_name AS client_name
       FROM jobs j
       LEFT JOIN edro_clients c ON c.id::text = j.client_id::text
      WHERE j.status IN ('allocated', 'in_progress')
        AND j.owner_id IS NOT NULL
        AND j.tenant_id IS NOT NULL
        AND (j.archived_at IS NULL OR j.archived_at > now())
      LIMIT $1`,
    [JOBS_PER_TICK],
  );

  const now = Date.now();

  for (const job of jobs) {
    try {
      const deadlineAt = job.deadline_at ? new Date(job.deadline_at).getTime() : null;
      const updatedAt = job.updated_at ? new Date(job.updated_at).getTime() : null;

      const hoursSinceUpdate = updatedAt ? (now - updatedAt) / 3_600_000 : 9999;
      const daysUntilDeadline = deadlineAt != null ? (deadlineAt - now) / 86_400_000 : 9999;

      // Determine alert level
      let level: 1 | 2 | null = null;
      let alertMsg = '';

      if (deadlineAt != null && daysUntilDeadline < 0) {
        // Past deadline
        level = 2;
        const daysLate = Math.abs(Math.floor(daysUntilDeadline));
        alertMsg = `ATRASADO há ${daysLate}d sem entrega`;
      } else if (deadlineAt != null && daysUntilDeadline < 1 && hoursSinceUpdate > 4) {
        // Due today, no recent movement
        level = 2;
        alertMsg = `Prazo HOJE · sem update há ${Math.floor(hoursSinceUpdate)}h`;
      } else if (deadlineAt != null && daysUntilDeadline <= 3 && hoursSinceUpdate > 48) {
        // 3 days to go, stalled for 48h
        level = 2;
        alertMsg = `Risco de atraso: ${Math.ceil(daysUntilDeadline)}d p/ prazo · sem update há ${Math.floor(hoursSinceUpdate)}h`;
      } else if (hoursSinceUpdate > 48 && daysUntilDeadline > 3) {
        // No urgency but stalled
        level = 1;
        alertMsg = `Sem atualização há ${Math.floor(hoursSinceUpdate)}h`;
      }

      if (!level) continue;

      const cooldown = level === 2 ? MONITOR_CRITICAL_COOLDOWN_H : MONITOR_AMBIENT_COOLDOWN_H;
      if (await isOnCooldown(job.tenant_id, job.id, 'bedel_monitor', cooldown)) continue;

      const icon = level === 2 ? '🔴' : '⚠️';
      const admins = await getAdminRecipients(job.tenant_id);

      await notifyRecipients(
        job.tenant_id,
        admins.map((admin) => ({
          userId: admin.user_id,
          email: admin.email,
          phone: admin.whatsapp_jid,
        })),
        'bedel_monitor',
        `${icon} ${job.title}`,
        `${alertMsg}\nCliente: ${job.client_name ?? 'N/A'} · Status: ${job.status}`,
        `/admin/operacoes/jobs?highlight=${job.id}`,
      );
    } catch (err: any) {
      console.warn(`[bedel/monitor] job ${job.id}: ${err?.message}`);
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function runBedelWorkerOnce(): Promise<void> {
  await runAllocationPhase();
  await runMonitorPhase();
}
