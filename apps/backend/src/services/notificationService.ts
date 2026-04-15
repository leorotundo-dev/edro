import { sendEmail } from './emailService';
import { sendWhatsAppText } from './whatsappService';
import { sendDirectMessage as sendEvolutionDirectMessage, isConfigured as isEvolutionConfigured } from './integrations/evolutionApiService';
import { updateNotificationStatus, createNotification } from '../repositories/edroBriefingRepository';
import { query } from '../db/db';
import { publishInAppNotification } from './inAppRealtimeService';
import { sendWebPushNotification } from './webPushService';

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

function shouldFallbackToEvolution(error?: string | null) {
  const message = String(error || '').toLowerCase();
  return message.includes('131030') || message.includes('allowed list');
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
      const canFallback =
        Boolean(input.tenantId)
        && isEvolutionConfigured()
        && shouldFallbackToEvolution(result.error);

      if (canFallback && input.tenantId) {
        try {
          await sendEvolutionDirectMessage(input.tenantId, input.recipient, text);
          await updateNotificationStatus({
            id: input.id,
            status: 'sent',
            sentAt: new Date(),
            error: `meta_fallback:${result.error || 'allowed_list'} -> evolution_ok`,
          });
          return;
        } catch (fallbackErr: any) {
          await updateNotificationStatus({
            id: input.id,
            status: 'failed',
            error: `meta:${result.error || 'whatsapp_failed'} | evolution:${fallbackErr?.message || 'failed'}`,
          });
          return;
        }
      }

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
     RETURNING id, tenant_id, user_id, event_type, title, body, link, read_at, created_at`,
    [input.tenantId, input.userId, input.eventType, input.title, input.body || null, input.link || null]
  );
  if (rows[0]) {
    publishInAppNotification(input.userId, rows[0]);
  }
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

type ResolvedUserChannels = {
  email: string | null;
  phone: string | null;
};

async function resolveUserNotificationChannels(
  tenantId: string,
  userId: string,
): Promise<ResolvedUserChannels> {
  const { rows } = await query<ResolvedUserChannels>(
    `WITH base AS (
       SELECT eu.id,
              eu.email,
              fp.whatsapp_jid   AS profile_whatsapp,
              fp.person_id      AS freelancer_person_id,
              tu.whatsapp_jid   AS tenant_user_whatsapp
         FROM edro_users eu
         LEFT JOIN freelancer_profiles fp ON fp.user_id = eu.id
         LEFT JOIN tenant_users tu
           ON tu.user_id::text = eu.id::text
          AND tu.tenant_id::text = $2::text
        WHERE eu.id = $1
        LIMIT 1
     ),
     candidate_people AS (
       SELECT freelancer_person_id AS person_id
         FROM base
        WHERE freelancer_person_id IS NOT NULL
       UNION
       SELECT pi.person_id
         FROM base b
         JOIN person_identities pi
           ON pi.tenant_id = $2
          AND pi.identity_type = 'edro_user_id'
          AND pi.normalized_value = LOWER(b.id::text)
       UNION
       SELECT pi.person_id
         FROM base b
         JOIN person_identities pi
           ON pi.tenant_id = $2
          AND pi.identity_type = 'email'
          AND pi.normalized_value = LOWER(b.email)
     )
     SELECT (SELECT email FROM base) AS email,
            COALESCE(
              -- 1. tenant_users.whatsapp_jid: set via profile settings (any internal user)
              NULLIF((SELECT tenant_user_whatsapp FROM base), ''),
              -- 2. freelancer_profiles.whatsapp_jid: freelancer-specific field
              NULLIF((SELECT profile_whatsapp FROM base), ''),
              -- 3. person_identities whatsapp_jid: unified people directory
              (
                SELECT pi.identity_value
                  FROM person_identities pi
                 WHERE pi.tenant_id = $2
                   AND pi.person_id IN (SELECT person_id FROM candidate_people)
                   AND pi.identity_type = 'whatsapp_jid'
                 ORDER BY pi.is_primary DESC, pi.updated_at DESC
                 LIMIT 1
              ),
              -- 4. person_identities phone_e164: last resort
              (
                SELECT pi.identity_value
                  FROM person_identities pi
                 WHERE pi.tenant_id = $2
                   AND pi.person_id IN (SELECT person_id FROM candidate_people)
                   AND pi.identity_type = 'phone_e164'
                 ORDER BY pi.is_primary DESC, pi.updated_at DESC
                 LIMIT 1
              )
            ) AS phone`,
    [userId, tenantId],
  );

  return rows[0] ?? { email: null, phone: null };
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
  defaultChannels?: Array<'email' | 'in_app' | 'whatsapp' | 'push'>;
};

export async function notifyEvent(input: NotifyEventInput) {
  const eventCandidates = input.event.startsWith('jarvis_')
    ? [input.event, 'jarvis_ops']
    : [input.event];

  // Get user preferences for this event
  const { rows: prefs } = await query(
    `SELECT event_type, channel, enabled
       FROM notification_preferences
      WHERE user_id = $1
        AND event_type = ANY($2::text[])`,
    [input.userId, eventCandidates]
  );
  const exactPrefs = prefs.filter((p: any) => p.event_type === input.event);
  const fallbackPrefs = exactPrefs.length === 0 && input.event.startsWith('jarvis_')
    ? prefs.filter((p: any) => p.event_type === 'jarvis_ops')
    : [];
  const effectivePrefs = exactPrefs.length ? exactPrefs : fallbackPrefs;

  // Default channels if no preferences set
  const enabledChannels = effectivePrefs.length > 0
    ? effectivePrefs.filter((p: any) => p.enabled).map((p: any) => p.channel)
    : (input.defaultChannels?.length ? input.defaultChannels : ['email', 'in_app']);

  let resolvedEmail = input.recipientEmail ?? null;
  let resolvedPhone = input.recipientPhone ?? null;

  if ((!resolvedEmail || !resolvedPhone) && input.userId && input.tenantId) {
    try {
      const resolved = await resolveUserNotificationChannels(input.tenantId, input.userId);
      resolvedEmail = resolvedEmail || resolved.email;
      resolvedPhone = resolvedPhone || resolved.phone;
    } catch (err) {
      console.error('[notifyEvent] resolveUserNotificationChannels error:', err);
    }
  }

  // Always create in-app notification
  if (enabledChannels.includes('in_app') || effectivePrefs.length === 0) {
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
  if (enabledChannels.includes('email') && resolvedEmail) {
    try {
      const notif = await createNotification({
        channel: 'email',
        recipient: resolvedEmail,
        payload: {
          _email: { subject: `Edro: ${input.title}`, text: input.body || input.title },
          ...input.payload,
        },
      });
      await dispatchNotification({
        id: notif.id,
        channel: 'email',
        recipient: resolvedEmail,
        tenantId: input.tenantId,
        payload: notif.payload,
      });
    } catch (err) {
      console.error('[notifyEvent] email error:', err);
    }
  }

  // Send WhatsApp if enabled and phone available
  if (enabledChannels.includes('whatsapp') && resolvedPhone) {
    try {
      const notif = await createNotification({
        channel: 'whatsapp',
        recipient: resolvedPhone,
        payload: {
          message: input.body || input.title,
          title: input.title,
          body: input.body || null,
          ...input.payload,
        },
      });
      await dispatchNotification({
        id: notif.id,
        channel: 'whatsapp',
        recipient: resolvedPhone,
        tenantId: input.tenantId,
        payload: notif.payload,
      });
    } catch (err) {
      console.error('[notifyEvent] whatsapp error:', err);
    }
  }

  if (enabledChannels.includes('push')) {
    try {
      await sendWebPushNotification({
        userId: input.userId,
        title: input.title,
        body: input.body,
        link: input.link,
        eventType: input.event,
        payload: input.payload || null,
      });
    } catch (err) {
      console.error('[notifyEvent] push error:', err);
    }
  }
}
