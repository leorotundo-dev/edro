import { sendEmail } from './emailService';
import { updateNotificationStatus } from '../repositories/edroBriefingRepository';

export type DispatchNotificationInput = {
  id: string;
  channel: string;
  recipient: string;
  payload?: Record<string, any> | null;
};

function buildEmailText(payload?: Record<string, any> | null) {
  if (!payload) {
    return 'Nova notificacao do Edro.';
  }

  const briefing = payload.briefing || payload.briefingId || null;
  const copy = payload.copy || null;
  const lines: string[] = [];

  if (briefing) {
    lines.push(`Briefing: ${briefing.title || briefing.id || 'Sem titulo'}`);
    if (briefing.client_name) {
      lines.push(`Cliente: ${briefing.client_name}`);
    }
    if (briefing.meeting_url) {
      lines.push(`Gather: ${briefing.meeting_url}`);
    }
    if (briefing.due_at) {
      lines.push(`Prazo: ${briefing.due_at}`);
    }
  }

  if (payload.message) {
    lines.push('Mensagem:');
    lines.push(String(payload.message));
  }

  if (copy?.output) {
    lines.push('Copy sugerida:');
    lines.push(String(copy.output));
  }

  return lines.join('\n');
}

function buildEmailSubject(payload?: Record<string, any> | null) {
  const briefing = payload?.briefing || null;
  if (briefing?.title) {
    return `Edro: ${briefing.title}`;
  }
  return 'Edro: nova notificacao';
}

export async function dispatchNotification(input: DispatchNotificationInput) {
  if (input.channel === 'email') {
    const subject = buildEmailSubject(input.payload ?? null);
    const text = buildEmailText(input.payload ?? null);

    const result = await sendEmail({
      to: input.recipient,
      subject,
      text,
    });

    if (result.ok) {
      await updateNotificationStatus({
        id: input.id,
        status: 'sent',
        sentAt: new Date(),
      });
    } else {
      await updateNotificationStatus({
        id: input.id,
        status: 'failed',
        error: result.error || 'email_failed',
      });
    }

    return;
  }

  await updateNotificationStatus({
    id: input.id,
    status: 'queued',
  });
}
