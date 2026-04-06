import { sendEmail } from './emailService';
import { sendWhatsAppText } from './whatsappService';
import { updateNotificationStatus, createNotification } from '../repositories/edroBriefingRepository';
import { query } from '../db/db';

export type DispatchNotificationInput = {
  id: string;
  channel: string;
  recipient: string;
  tenantId?: string | null;
  payload?: Record<string, any> | null;
};

function buildEmailText(payload?: Record<string, any> | null) {
  if (!payload) {
    return 'Nova notificação do Edro.';
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
  return 'Edro: nova notificação';
}

export async function dispatchNotification(input: DispatchNotificationInput) {
  if (input.channel === 'email') {
    const prebuilt = input.payload?._email as
      | { subject: string; text: string; html?: string }
      | undefined;

    const subject = prebuilt?.subject || buildEmailSubject(input.payload ?? null);
    const text = prebuilt?.text || buildEmailText(input.payload ?? null);
    const html = prebuilt?.html || undefined;

    const result = await sendEmail({
      to: input.recipient,
      subject,
      text,
      html,
      tenantId: input.tenantId ?? undefined,
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

  if (input.channel === 'whatsapp') {
    const text = buildEmailText(input.payload ?? null);
    const result = await sendWhatsAppText(input.recipient, text, {
      tenantId: input.tenantId ?? undefined,
      event: 'notification_sent',
      meta: {
        channel: 'notification',
      },
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
        error: result.error || 'whatsapp_failed',
      });
    }

    return;
  }

  await updateNotificationStatus({
    id: input.id,
    status: 'queued',
  });
}

// ============================================================
// IN-APP NOTIFICATIONS
// ============================================================

export type CreateInAppInput = {
  tenantId: string;
  userId: string;
  eventType: string;
  title: string;
  body?: string;
  link?: string;
};

export async function createInAppNotification(input: CreateInAppInput) {
  const { rows } = await query(
    `INSERT INTO in_app_notifications (tenant_id, user_id, event_type, title, body, link)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [input.tenantId, input.userId, input.eventType, input.title, input.body || null, input.link || null]
  );
  return rows[0];
}

export async function getInAppNotifications(userId: string, limit = 20) {
  const { rows } = await query(
    `SELECT * FROM in_app_notifications
     WHERE user_id = $1
     ORDER BY read_at IS NULL DESC, created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function markNotificationRead(id: string, userId: string) {
  await query(
    `UPDATE in_app_notifications SET read_at = now() WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function markAllNotificationsRead(userId: string) {
  await query(
    `UPDATE in_app_notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
}

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

export async function getNotificationPreferences(userId: string) {
  const { rows } = await query(
    `SELECT event_type, channel, enabled FROM notification_preferences WHERE user_id = $1`,
    [userId]
  );
  return rows;
}

export async function upsertNotificationPreferences(
  userId: string,
  prefs: { event_type: string; channel: string; enabled: boolean }[]
) {
  for (const pref of prefs) {
    await query(
      `INSERT INTO notification_preferences (user_id, event_type, channel, enabled)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, event_type, channel) DO UPDATE SET enabled = $4`,
      [userId, pref.event_type, pref.channel, pref.enabled]
    );
  }
}

// ============================================================
// NOTIFY EVENT — multi-channel dispatch based on preferences
// ============================================================

export type NotifyEventInput = {
  event: string;
  tenantId: string;
  userId: string;
  title: string;
  body?: string;
  link?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  payload?: Record<string, any>;
  defaultChannels?: Array<'email' | 'in_app' | 'whatsapp'>;
};

export async function notifyEvent(input: NotifyEventInput) {
  // Get user preferences for this event
  const { rows: prefs } = await query(
    `SELECT channel, enabled FROM notification_preferences WHERE user_id = $1 AND event_type = $2`,
    [input.userId, input.event]
  );

  // Default channels if no preferences set
  const enabledChannels = prefs.length > 0
    ? prefs.filter((p: any) => p.enabled).map((p: any) => p.channel)
    : (input.defaultChannels?.length ? input.defaultChannels : ['email', 'in_app']);

  // Always create in-app notification
  if (enabledChannels.includes('in_app') || prefs.length === 0) {
    try {
      await createInAppNotification({
        tenantId: input.tenantId,
        userId: input.userId,
        eventType: input.event,
        title: input.title,
        body: input.body,
        link: input.link,
      });
    } catch (err) {
      console.error('[notifyEvent] in_app error:', err);
    }
  }

  // Send email if enabled and recipient available
  if (enabledChannels.includes('email') && input.recipientEmail) {
    try {
      const notif = await createNotification({
        channel: 'email',
        recipient: input.recipientEmail,
        payload: {
          _email: { subject: `Edro: ${input.title}`, text: input.body || input.title },
          ...input.payload,
        },
      });
      await dispatchNotification({
        id: notif.id,
        channel: 'email',
        recipient: input.recipientEmail,
        tenantId: input.tenantId,
        payload: notif.payload,
      });
    } catch (err) {
      console.error('[notifyEvent] email error:', err);
    }
  }

  // Send WhatsApp if enabled and phone available
  if (enabledChannels.includes('whatsapp') && input.recipientPhone) {
    try {
      const notif = await createNotification({
        channel: 'whatsapp',
        recipient: input.recipientPhone,
        payload: input.payload,
      });
      await dispatchNotification({
        id: notif.id,
        channel: 'whatsapp',
        recipient: input.recipientPhone,
        tenantId: input.tenantId,
        payload: notif.payload,
      });
    } catch (err) {
      console.error('[notifyEvent] whatsapp error:', err);
    }
  }
}
