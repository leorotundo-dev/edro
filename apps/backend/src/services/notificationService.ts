import { query } from '../db';
import { encryptField, hashField } from './fieldEncryption';

export type NotificationChannel = 'push' | 'email' | 'inapp';
export type NotificationStatus = 'queued' | 'sent' | 'skipped' | 'failed';
export type NotificationEvent =
  | 'manual'
  | 'srs'
  | 'abandon'
  | 'exam'
  | 'billing'
  | 'mission'
  | 'event'
  | 'study';

export type NotificationPreference = {
  user_id: string;
  channel: NotificationChannel;
  enabled: boolean;
  quiet_hours?: { start?: string; end?: string } | null;
  max_per_day?: number | null;
  min_interval_minutes?: number | null;
  topics?: string[];
};

type RuleResult = {
  allowed: boolean;
  reason?: string;
  title?: string;
  body?: string;
};

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
};

const toList = (value: string | undefined, fallback: string[]) => {
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const rulesEnabled = toBool(process.env.NOTIFY_RULES_ENABLED, true);

const ruleConfig = {
  srs: {
    enabled: toBool(process.env.NOTIFY_RULE_SRS_ENABLED, true),
    overdueMin: toNumber(process.env.NOTIFY_SRS_OVERDUE_MIN, 5),
  },
  abandon: {
    enabled: toBool(process.env.NOTIFY_RULE_ABANDON_ENABLED, true),
    inactiveDays: toNumber(process.env.NOTIFY_ABANDON_DAYS, 3),
  },
  exam: {
    enabled: toBool(process.env.NOTIFY_RULE_EXAM_ENABLED, true),
    daysToExam: toNumber(process.env.NOTIFY_EXAM_DAYS, 10),
  },
  billing: {
    enabled: toBool(process.env.NOTIFY_RULE_BILLING_ENABLED, true),
    allowedStatuses: toList(process.env.NOTIFY_BILLING_STATUSES, ['late', 'failed']),
  },
  study: {
    enabled: toBool(process.env.NOTIFY_RULE_STUDY_ENABLED, true),
  },
};

const defaultPreference: Omit<NotificationPreference, 'user_id' | 'channel'> = {
  enabled: true,
  quiet_hours: null,
  max_per_day: null,
  min_interval_minutes: null,
  topics: [],
};

function resolveStyleHint(style?: string | null) {
  const normalized = String(style || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'visual') return 'Dica visual: use um mapa mental rapido.';
  if (normalized === 'auditory') return 'Dica auditiva: leia o resumo em voz alta.';
  if (normalized === 'kinesthetic') return 'Dica pratica: escreva um resumo curto.';
  return null;
}

function resolveMoodHint(humor?: number | null) {
  if (typeof humor !== 'number' || Number.isNaN(humor)) return null;
  if (humor <= 2) return 'Sem pressa: 10 minutos ja ajudam.';
  if (humor >= 4) return 'Bom humor, aproveite o ritmo.';
  return null;
}

function appendHints(base: string, hints: Array<string | null | undefined>) {
  const extra = hints.filter(Boolean).join(' ');
  if (!extra) return base;
  return `${base} ${extra}`;
}

function parseTimeToMinutes(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function isWithinQuietHours(quietHours?: { start?: string; end?: string } | null) {
  if (!quietHours?.start || !quietHours?.end) return { active: false, nextAllowedAt: null };

  const startMinutes = parseTimeToMinutes(quietHours.start);
  const endMinutes = parseTimeToMinutes(quietHours.end);
  if (startMinutes === null || endMinutes === null) {
    return { active: false, nextAllowedAt: null };
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const crossesMidnight = startMinutes > endMinutes;
  const isQuiet = crossesMidnight
    ? nowMinutes >= startMinutes || nowMinutes < endMinutes
    : nowMinutes >= startMinutes && nowMinutes < endMinutes;

  if (!isQuiet) return { active: false, nextAllowedAt: null };

  const next = new Date(now);
  if (crossesMidnight && nowMinutes >= startMinutes) {
    next.setDate(now.getDate() + 1);
  }
  const nextHours = Math.floor(endMinutes / 60);
  const nextMinutes = endMinutes % 60;
  next.setHours(nextHours, nextMinutes, 0, 0);

  return { active: true, nextAllowedAt: next };
}

export function evaluateNotificationRule(
  eventType: NotificationEvent,
  metadata?: Record<string, any>,
  explicit?: { title?: string; body?: string }
): RuleResult {
  if (!rulesEnabled || eventType === 'manual') {
    return { allowed: true, title: explicit?.title, body: explicit?.body };
  }

  if (eventType === 'srs') {
    if (!ruleConfig.srs.enabled) return { allowed: false, reason: 'rule_disabled' };
    const overdue = Number(metadata?.overdue_count ?? 0);
    if (overdue < ruleConfig.srs.overdueMin) {
      return { allowed: false, reason: 'srs_overdue_min' };
    }
    return {
      allowed: true,
      title: explicit?.title ?? 'Hora de revisar',
      body: explicit?.body
        ?? appendHints(
          `Voce tem ${overdue} cards SRS atrasados.`,
          [resolveStyleHint(metadata?.learning_style ?? metadata?.estilo)]
        ),
    };
  }

  if (eventType === 'abandon') {
    if (!ruleConfig.abandon.enabled) return { allowed: false, reason: 'rule_disabled' };
    const inactive = Number(metadata?.days_inactive ?? 0);
    if (inactive < ruleConfig.abandon.inactiveDays) {
      return { allowed: false, reason: 'abandon_inactive_days' };
    }
    return {
      allowed: true,
      title: explicit?.title ?? 'Vamos retomar?',
      body: explicit?.body
        ?? appendHints(
          `Voce ficou ${inactive} dias sem estudar.`,
          [resolveMoodHint(metadata?.humor ?? metadata?.humor_auto_reportado)]
        ),
    };
  }

  if (eventType === 'exam') {
    if (!ruleConfig.exam.enabled) return { allowed: false, reason: 'rule_disabled' };
    const daysToExam = Number(metadata?.days_to_exam ?? 999);
    if (daysToExam > ruleConfig.exam.daysToExam) {
      return { allowed: false, reason: 'exam_too_far' };
    }
    const examLabel = metadata?.titulo
      ? ` Prova: ${metadata.titulo}.`
      : metadata?.banca
        ? ` Banca: ${metadata.banca}.`
        : '';
    return {
      allowed: true,
      title: explicit?.title ?? 'Prova chegando',
      body: explicit?.body ?? `Faltam ${daysToExam} dias para sua prova.${examLabel}`,
    };
  }

  if (eventType === 'billing') {
    if (!ruleConfig.billing.enabled) return { allowed: false, reason: 'rule_disabled' };
    const status = String(metadata?.status ?? '').toLowerCase();
    if (!ruleConfig.billing.allowedStatuses.includes(status)) {
      return { allowed: false, reason: 'billing_status' };
    }
    return {
      allowed: true,
      title: explicit?.title ?? 'Atencao no pagamento',
      body: explicit?.body ?? 'Seu pagamento precisa de atencao.',
    };
  }

  if (eventType === 'mission') {
    return {
      allowed: true,
      title: explicit?.title ?? 'Missao concluida',
      body: explicit?.body ?? 'Voce concluiu uma missao. Resgate seu XP.',
    };
  }

  if (eventType === 'event') {
    return {
      allowed: true,
      title: explicit?.title ?? 'Evento em andamento',
      body: explicit?.body ?? 'Participe do desafio semanal e suba no ranking.',
    };
  }

  if (eventType === 'study') {
    if (!ruleConfig.study.enabled) return { allowed: false, reason: 'rule_disabled' };
    const energy = Number(metadata?.energia ?? 0);
    const tone = energy > 70 ? 'turbo' : energy > 40 ? 'padrao' : 'calmo';
    const moodHint = resolveMoodHint(metadata?.humor ?? metadata?.humor_auto_reportado);
    const styleHint = resolveStyleHint(metadata?.learning_style ?? metadata?.estilo);
    let baseBody = '';
    if (tone === 'turbo') {
      baseBody = 'Aproveite o ritmo e avance mais um pouco hoje.';
    } else if (tone === 'padrao') {
      baseBody = 'Vamos fechar mais um drop para manter o ritmo.';
    } else {
      baseBody = 'Devagar e sempre: 10 minutos ja contam.';
    }
    return {
      allowed: true,
      title: explicit?.title ?? 'Hora de estudar',
      body: explicit?.body ?? appendHints(baseBody, [moodHint, styleHint]),
    };
  }

  return { allowed: false, reason: 'unknown_event' };
}

export async function getNotificationPreference(userId: string, channel: NotificationChannel): Promise<NotificationPreference> {
  const { rows } = await query<NotificationPreference>(
    `
      SELECT user_id, channel, enabled, quiet_hours, max_per_day, min_interval_minutes, topics
      FROM notification_preferences
      WHERE user_id = $1 AND channel = $2
      LIMIT 1
    `,
    [userId, channel]
  );

  if (rows[0]) {
    return {
      ...rows[0],
      quiet_hours: rows[0].quiet_hours ?? null,
      topics: (rows[0].topics as any) ?? [],
    };
  }

  return {
    user_id: userId,
    channel,
    ...defaultPreference,
  };
}

export async function getUserNotificationPreferences(userId: string) {
  const { rows } = await query<NotificationPreference>(
    `
      SELECT user_id, channel, enabled, quiet_hours, max_per_day, min_interval_minutes, topics
      FROM notification_preferences
      WHERE user_id = $1
      ORDER BY channel ASC
    `,
    [userId]
  );
  return rows;
}

export async function upsertNotificationPreference(params: {
  userId: string;
  channel: NotificationChannel;
  enabled?: boolean;
  quietHours?: { start?: string; end?: string } | null;
  maxPerDay?: number | null;
  minIntervalMinutes?: number | null;
  topics?: string[] | null;
}) {
  await query(
    `
      INSERT INTO notification_preferences (
        user_id, channel, enabled, quiet_hours, max_per_day, min_interval_minutes, topics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, channel) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        quiet_hours = EXCLUDED.quiet_hours,
        max_per_day = EXCLUDED.max_per_day,
        min_interval_minutes = EXCLUDED.min_interval_minutes,
        topics = EXCLUDED.topics,
        updated_at = NOW()
    `,
    [
      params.userId,
      params.channel,
      params.enabled ?? true,
      params.quietHours ?? {},
      params.maxPerDay ?? null,
      params.minIntervalMinutes ?? null,
      params.topics ?? [],
    ]
  );
}

export async function registerNotificationDevice(params: {
  userId: string;
  provider: string;
  token: string;
  deviceId?: string | null;
  platform?: string | null;
}) {
  const tokenHash = hashField(params.token);
  const tokenEncrypted = encryptField(params.token);
  const tokenLast4 = params.token.slice(-4);

  const { rows } = await query<{ id: string }>(
    `
      SELECT id
      FROM notification_devices
      WHERE provider = $1
        AND (token = $2 OR token_hash = $3)
      LIMIT 1
    `,
    [params.provider, params.token, tokenHash]
  );

  if (rows[0]?.id) {
    await query(
      `
        UPDATE notification_devices
        SET user_id = $2,
            token = $3,
            token_hash = $4,
            token_encrypted = $5,
            token_last4 = $6,
            device_id = $7,
            platform = $8,
            enabled = true,
            last_seen_at = NOW()
        WHERE id = $1
      `,
      [
        rows[0].id,
        params.userId,
        tokenHash,
        tokenHash,
        tokenEncrypted,
        tokenLast4,
        params.deviceId ?? null,
        params.platform ?? null,
      ]
    );
    return;
  }

  await query(
    `
      INSERT INTO notification_devices (
        user_id, provider, token, token_hash, token_encrypted, token_last4, device_id, platform, enabled, last_seen_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      ON CONFLICT (provider, token) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        token_hash = EXCLUDED.token_hash,
        token_encrypted = EXCLUDED.token_encrypted,
        token_last4 = EXCLUDED.token_last4,
        device_id = EXCLUDED.device_id,
        platform = EXCLUDED.platform,
        enabled = true,
        last_seen_at = NOW()
    `,
    [
      params.userId,
      params.provider,
      tokenHash,
      tokenHash,
      tokenEncrypted,
      tokenLast4,
      params.deviceId ?? null,
      params.platform ?? null,
    ]
  );
}

export async function listNotificationDevices(userId: string) {
  const { rows } = await query(
    `
      SELECT id, user_id, provider, token, token_hash, token_last4, device_id, platform, enabled, last_seen_at, created_at
      FROM notification_devices
      WHERE user_id = $1
      ORDER BY last_seen_at DESC NULLS LAST
    `,
    [userId]
  );
  return rows.map((row: any) => {
    const { token, token_hash, ...rest } = row;
    const tokenMasked = row.token_last4 ? `****${row.token_last4}` : null;
    return {
      ...rest,
      token_masked: tokenMasked,
    };
  });
}

export async function shouldSendNotification(params: {
  userId: string;
  channel: NotificationChannel;
  eventType?: NotificationEvent;
}) {
  const preference = await getNotificationPreference(params.userId, params.channel);
  if (!preference.enabled) {
    return { allowed: false, reason: 'preference_disabled' };
  }

  if (preference.topics && preference.topics.length > 0 && params.eventType) {
    if (!preference.topics.includes(params.eventType)) {
      return { allowed: false, reason: 'topic_disabled' };
    }
  }

  const quiet = isWithinQuietHours(preference.quiet_hours ?? null);
  if (quiet.active) {
    return { allowed: false, reason: 'quiet_hours', nextAllowedAt: quiet.nextAllowedAt };
  }

  const dailyLimit = toNumber(process.env.NOTIFY_MAX_PER_DAY, 5);
  const minIntervalMinutes = toNumber(process.env.NOTIFY_MIN_INTERVAL_MINUTES, 30);
  const resolvedDailyLimit =
    preference.max_per_day !== null && preference.max_per_day !== undefined
      ? preference.max_per_day
      : dailyLimit;
  const resolvedMinInterval =
    preference.min_interval_minutes !== null && preference.min_interval_minutes !== undefined
      ? preference.min_interval_minutes
      : minIntervalMinutes;
  const applyDailyLimit = resolvedDailyLimit > 0;
  const applyInterval = resolvedMinInterval > 0;

  if (applyDailyLimit) {
    const { rows } = await query<{ count: string }>(
      `
        SELECT COUNT(*)::int AS count
        FROM notifications_log
        WHERE user_id = $1
          AND status IN ('queued', 'sent')
          AND created_at >= CURRENT_DATE
      `,
      [params.userId]
    );
    const count = Number(rows[0]?.count ?? 0);
    if (count >= resolvedDailyLimit) {
      return {
        allowed: false,
        reason: 'daily_limit',
        remaining: 0,
        nextAllowedAt: new Date(new Date().setHours(24, 0, 0, 0)),
      };
    }
    const remaining = Math.max(0, resolvedDailyLimit - count);
    if (!applyInterval) {
      return { allowed: true, remaining };
    }
  }

  if (applyInterval) {
    const { rows } = await query<{ created_at: Date }>(
      `
        SELECT created_at
        FROM notifications_log
        WHERE user_id = $1
          AND status IN ('queued', 'sent')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [params.userId]
    );
    const lastSent = rows[0]?.created_at ? new Date(rows[0].created_at) : null;
    if (lastSent) {
      const nextAllowed = new Date(lastSent.getTime() + resolvedMinInterval * 60 * 1000);
      if (new Date() < nextAllowed) {
        return {
          allowed: false,
          reason: 'min_interval',
          nextAllowedAt: nextAllowed,
        };
      }
    }
  }

  return { allowed: true };
}

export async function logNotification(params: {
  userId: string;
  eventType: NotificationEvent;
  channel: NotificationChannel;
  title?: string;
  body?: string;
  status: NotificationStatus;
  reason?: string;
  metadata?: Record<string, any>;
  sentAt?: Date | null;
}): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `
      INSERT INTO notifications_log (
        user_id, event_type, channel, title, body, status, reason, metadata, created_at, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      RETURNING id
    `,
    [
      params.userId,
      params.eventType,
      params.channel,
      params.title ?? null,
      params.body ?? null,
      params.status,
      params.reason ?? null,
      JSON.stringify(params.metadata ?? {}),
      params.sentAt ?? null,
    ]
  );
  return rows[0]?.id;
}

export async function updateNotificationStatus(params: {
  id: string;
  status: NotificationStatus;
  reason?: string | null;
  sentAt?: Date | null;
}) {
  await query(
    `
      UPDATE notifications_log
      SET status = $2::varchar,
          reason = COALESCE($3, reason),
          sent_at = CASE
            WHEN $2::varchar IN ('sent', 'failed') THEN COALESCE($4, NOW())
            ELSE sent_at
          END
      WHERE id = $1
    `,
    [params.id, params.status, params.reason ?? null, params.sentAt ?? null]
  );
}

export async function listInAppNotifications(params: {
  userId: string;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const limit = Math.min(params.limit ?? 20, 100);
  const { rows } = await query(
    `
      SELECT *
      FROM notifications_log
      WHERE user_id = $1
        AND channel = 'inapp'
        ${params.unreadOnly ? 'AND read_at IS NULL' : ''}
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [params.userId, limit]
  );
  return rows;
}

export async function markNotificationRead(params: { userId: string; id: string }) {
  await query(
    `
      UPDATE notifications_log
      SET read_at = NOW()
      WHERE id = $1 AND user_id = $2
    `,
    [params.id, params.userId]
  );
}

export const NotificationService = {
  evaluateNotificationRule,
  shouldSendNotification,
  logNotification,
  updateNotificationStatus,
  getNotificationPreference,
  getUserNotificationPreferences,
  upsertNotificationPreference,
  registerNotificationDevice,
  listNotificationDevices,
  listInAppNotifications,
  markNotificationRead,
};

export default NotificationService;
