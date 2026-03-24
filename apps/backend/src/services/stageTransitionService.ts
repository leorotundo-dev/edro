/**
 * stageTransitionService
 * Central engine for all briefing stage transitions.
 * Validates, persists, fires Trello comment, sends email, and returns the updated briefing.
 */

import crypto from 'crypto';
import { query } from '../db';
import { getBriefingById, updateBriefingStatus } from '../repositories/edroBriefingRepository';
import { buildStageChangeEmail } from './stageNotificationTemplates';
import { sendEmail } from './emailService';
import { WorkflowStage, isWorkflowStage, normalizeLegacyStage } from '../utils/workflow';
import { env } from '../env';
import { ensureBriefingExecutionReady } from './briefingExecutionService';

export type TransitionActor = { name?: string | null; email?: string | null };

export type TransitionOpts = {
  actor?: TransitionActor;
  comment?: string | null;        // optional comment to attach to Trello card
  clientFeedback?: string | null; // client feedback text (used on aprovacao_cliente → ajustes)
  notifyEmails?: string[];        // extra emails to notify beyond defaults
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function postTrelloComment(
  tenantId: string,
  briefingId: string,
  text: string
): Promise<void> {
  try {
    const { getTrelloCredentials } = await import('./trelloSyncService');
    const creds = await getTrelloCredentials(tenantId);
    if (!creds) return;

    const { rows } = await query<{ trello_card_id: string }>(
      `SELECT (payload->>'trello_card_id') AS trello_card_id
         FROM edro_briefings
        WHERE id = $1 AND (payload->>'trello_card_id') IS NOT NULL`,
      [briefingId]
    );
    const trelloCardId = rows[0]?.trello_card_id;
    if (!trelloCardId) return;

    const params = new URLSearchParams({
      key: creds.apiKey,
      token: creds.apiToken,
      text,
    });
    await fetch(`https://api.trello.com/1/cards/${trelloCardId}/actions/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch (err) {
    console.warn('[stageTransition] Trello comment failed:', err);
  }
}

async function resolveNotifyEmails(briefing: Awaited<ReturnType<typeof getBriefingById>>): Promise<string[]> {
  if (!briefing) return [];
  const emails: string[] = [];

  // manager email stored in payload
  const managerEmail = briefing.payload?.manager_email as string | undefined;
  if (managerEmail) emails.push(managerEmail);

  // traffic owner
  if (briefing.traffic_owner && briefing.traffic_owner.includes('@')) {
    emails.push(briefing.traffic_owner);
  }

  // global notify list from env
  const globalList = env.EDRO_ICLIPS_NOTIFY_EMAIL;
  if (globalList) {
    globalList.split(',').map((e) => e.trim()).filter(Boolean).forEach((e) => emails.push(e));
  }

  return [...new Set(emails)];
}

// ── Core export ────────────────────────────────────────────────────────────

export async function transitionBriefingStage(
  briefingId: string,
  toStage: WorkflowStage,
  opts: TransitionOpts = {}
): Promise<{ ok: boolean; error?: string }> {
  const briefing = await getBriefingById(briefingId);
  if (!briefing) return { ok: false, error: 'briefing_not_found' };

  if (toStage === 'producao') {
    const readiness = await ensureBriefingExecutionReady(briefingId, {
      id: briefing.id,
      title: briefing.title,
      status: briefing.status,
      payload: briefing.payload,
      copy_approved_at: (briefing as any).copy_approved_at ?? null,
      copy_approval_comment: (briefing as any).copy_approval_comment ?? null,
    });
    if (!readiness.ok) {
      return {
        ok: false,
        error: readiness.error ?? 'briefing_not_ready_for_execution',
      };
    }
  }

  const rawStage = briefing.status ?? 'briefing';
  const fromStage: WorkflowStage = isWorkflowStage(rawStage)
    ? rawStage
    : normalizeLegacyStage(rawStage);

  // Persist new status
  await updateBriefingStatus(briefingId, toStage);

  // Also update edro_briefing_stages if exists
  await query(
    `UPDATE edro_briefing_stages
        SET status = 'done', updated_at = now(), updated_by = $3
      WHERE briefing_id = $1 AND stage = $2 AND status != 'done'`,
    [briefingId, fromStage, opts.actor?.name ?? null]
  ).catch(() => {});

  await query(
    `UPDATE edro_briefing_stages
        SET status = 'in_progress', updated_at = now(), updated_by = $3
      WHERE briefing_id = $1 AND stage = $2 AND status = 'pending'`,
    [briefingId, toStage, opts.actor?.name ?? null]
  ).catch(() => {});

  // Append client feedback to payload if provided
  if (opts.clientFeedback) {
    await query(
      `UPDATE edro_briefings
          SET payload = jsonb_set(
            COALESCE(payload, '{}'::jsonb),
            '{client_feedback}',
            to_jsonb($2::text)
          ), updated_at = now()
        WHERE id = $1`,
      [briefingId, opts.clientFeedback]
    ).catch(() => {});
  }

  const tenantId = (briefing as any).tenant_id as string | undefined;

  // Trello comment
  const actorName = opts.actor?.name ?? 'Sistema';
  const { getStageUI } = await import('../utils/workflow');
  const fromLabel = getStageUI(fromStage)?.label ?? fromStage;
  const toLabel = getStageUI(toStage)?.label ?? toStage;
  let trelloText = `[Edro] Etapa atualizada: ${fromLabel} → ${toLabel} (por ${actorName})`;
  if (opts.comment) trelloText += `\n\n${opts.comment}`;
  if (opts.clientFeedback) trelloText += `\n\nFeedback do cliente: ${opts.clientFeedback}`;

  if (tenantId) {
    setImmediate(() =>
      postTrelloComment(tenantId, briefingId, trelloText).catch(() => {})
    );
  }

  // Email notifications
  setImmediate(async () => {
    try {
      const defaultEmails = await resolveNotifyEmails(briefing);
      const allEmails = [...new Set([...defaultEmails, ...(opts.notifyEmails ?? [])])];

      if (allEmails.length === 0) return;

      const clientName =
        (briefing as any).client_name ??
        (briefing.payload?.client_name as string | undefined) ??
        null;

      const { subject, text, html } = buildStageChangeEmail({
        briefingTitle: briefing.title,
        clientName,
        fromStage,
        toStage,
        updatedBy: actorName,
        briefingId,
        baseUrl: env.WEB_URL,
      });

      for (const to of allEmails) {
        await sendEmail({ to, subject, text, html, tenantId }).catch(() => {});
      }
    } catch (err) {
      console.warn('[stageTransition] Email notification failed:', err);
    }
  });

  return { ok: true };
}

// ── Client approval token ──────────────────────────────────────────────────

export function generateClientApprovalToken(briefingId: string): string {
  const secret = env.JWT_SECRET;
  const ts = Math.floor(Date.now() / 1000);
  const payload = `${briefingId}:${ts}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyClientApprovalToken(
  token: string
): { briefingId: string; ts: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 3) return null;

    const sig = parts.pop()!;
    const ts = Number(parts.pop()!);
    const briefingId = parts.join(':');

    const expected = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(`${briefingId}:${ts}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return null;
    }

    // Token valid for 30 days
    const ageSeconds = Math.floor(Date.now() / 1000) - ts;
    if (ageSeconds > 30 * 24 * 3600) return null;

    return { briefingId, ts };
  } catch {
    return null;
  }
}

export async function sendClientApprovalEmail(
  briefingId: string,
  clientEmail: string,
  briefingTitle: string,
  clientName?: string | null,
  tenantId?: string | null,
): Promise<void> {
  const token = generateClientApprovalToken(briefingId);
  const baseUrl = env.WEB_URL ?? '';
  const approvalUrl = `${baseUrl}/aprovacao/${token}`;

  const subject = `[Edro] Aprovação solicitada — "${briefingTitle}"`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a">
  <div style="border-bottom:3px solid #6366f1;padding-bottom:16px;margin-bottom:24px">
    <h2 style="margin:0;font-size:18px;color:#6366f1">Edro — Aprovação de Conteúdo</h2>
  </div>

  <p style="font-size:15px;line-height:1.6">
    Olá${clientName ? `, ${clientName}` : ''}!<br><br>
    O conteúdo <strong>"${briefingTitle}"</strong> está pronto para sua aprovação.
    Acesse o link abaixo para visualizar e aprovar ou solicitar ajustes.
  </p>

  <a href="${approvalUrl}"
     style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;margin:16px 0">
    Revisar e Aprovar
  </a>

  <p style="font-size:13px;color:#666;margin-top:24px">
    Este link é pessoal e válido por 30 dias.<br>
    Em caso de dúvidas, responda este e-mail.
  </p>

  <p style="font-size:12px;color:#999;margin-top:32px;border-top:1px solid #eee;padding-top:12px">
    Notificação automática do Edro — Edro.Digital
  </p>
</body>
</html>`.trim();

  const text = `Olá${clientName ? `, ${clientName}` : ''}!\n\nO conteúdo "${briefingTitle}" está pronto para aprovação.\n\nAcesse: ${approvalUrl}\n\nLink válido por 30 dias.`;

  await sendEmail({ to: clientEmail, subject, text, html, tenantId: tenantId ?? undefined });
}
