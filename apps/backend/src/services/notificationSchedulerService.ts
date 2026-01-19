import { query } from '../db';
import { dispatchNotification } from './notificationDispatchService';
import { NotificationChannel, NotificationEvent } from './notificationService';

type Candidate = {
  userId: string;
  event: NotificationEvent;
  metadata: Record<string, any>;
  channels: NotificationChannel[];
};

type UserContext = {
  learning_style?: string;
  energia?: number;
  humor?: number;
};

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
};

const rulesEnabled = toBool(process.env.NOTIFY_RULES_ENABLED, true);
const ruleSrsEnabled = toBool(process.env.NOTIFY_RULE_SRS_ENABLED, true);
const ruleAbandonEnabled = toBool(process.env.NOTIFY_RULE_ABANDON_ENABLED, true);
const ruleExamEnabled = toBool(process.env.NOTIFY_RULE_EXAM_ENABLED, true);
const ruleBillingEnabled = toBool(process.env.NOTIFY_RULE_BILLING_ENABLED, true);
const ruleStudyEnabled = toBool(process.env.NOTIFY_RULE_STUDY_ENABLED, true);

const srsOverdueMin = toNumber(process.env.NOTIFY_SRS_OVERDUE_MIN, 5);
const abandonDays = toNumber(process.env.NOTIFY_ABANDON_DAYS, 3);
const examDays = toNumber(process.env.NOTIFY_EXAM_DAYS, 10);
const trialWindowDays = toNumber(process.env.NOTIFY_BILLING_TRIAL_DAYS, 14);
const cancelWindowDays = toNumber(process.env.NOTIFY_BILLING_CANCEL_DAYS, 30);
const notifyFreeBilling = toBool(process.env.NOTIFY_BILLING_FREE, false);

const channelsByEvent: Record<NotificationEvent, NotificationChannel[]> = {
  srs: ['inapp'],
  study: ['inapp'],
  abandon: ['push', 'inapp'],
  exam: ['push', 'inapp'],
  billing: ['push', 'inapp'],
  mission: ['inapp'],
  event: ['inapp'],
  manual: [],
};

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

async function listSrsCandidates(): Promise<Candidate[]> {
  if (!rulesEnabled || !ruleSrsEnabled) return [];
  const { rows } = await query<{
    user_id: string;
    due: number;
    overdue: number;
  }>(
    `
      SELECT
        user_id,
        COUNT(*) FILTER (WHERE next_review_at <= NOW())::int AS due,
        COUNT(*) FILTER (WHERE next_review_at <= NOW() - INTERVAL '1 day')::int AS overdue
      FROM srs_cards
      GROUP BY user_id
      HAVING COUNT(*) FILTER (WHERE next_review_at <= NOW() - INTERVAL '1 day')::int >= $1
    `,
    [srsOverdueMin]
  );

  return rows.map((row) => ({
    userId: row.user_id,
    event: 'srs',
    metadata: {
      due_count: Number(row.due ?? 0),
      overdue_count: Number(row.overdue ?? 0),
    },
    channels: channelsByEvent.srs,
  }));
}

async function listAbandonCandidates(): Promise<Candidate[]> {
  if (!rulesEnabled || !ruleAbandonEnabled) return [];
  const { rows } = await query<{
    user_id: string;
    last_study_at: Date;
  }>(
    `
      SELECT
        u.id AS user_id,
        COALESCE(g.last_study_at, u.created_at) AS last_study_at
      FROM users u
      LEFT JOIN gamification_profiles g ON g.user_id = u.id
      WHERE COALESCE(g.last_study_at, u.created_at) <= NOW() - ($1 * INTERVAL '1 day')
    `,
    [abandonDays]
  );

  const now = new Date();
  return rows.map((row) => ({
    userId: row.user_id,
    event: 'abandon',
    metadata: {
      days_inactive: daysBetween(new Date(row.last_study_at), now),
    },
    channels: channelsByEvent.abandon,
  }));
}

async function listStudyCandidates(): Promise<Candidate[]> {
  if (!rulesEnabled || !ruleStudyEnabled) return [];
  const { rows } = await query<{
    user_id: string;
    last_study_at: Date;
  }>(
    `
      SELECT
        u.id AS user_id,
        COALESCE(g.last_study_at, u.created_at) AS last_study_at
      FROM users u
      LEFT JOIN gamification_profiles g ON g.user_id = u.id
      WHERE COALESCE(g.last_study_at, u.created_at)::date < CURRENT_DATE
    `
  );

  const now = new Date();
  return rows
    .map((row) => ({
      userId: row.user_id,
      event: 'study' as const,
      metadata: {
        days_inactive: daysBetween(new Date(row.last_study_at), now),
      },
      channels: channelsByEvent.study,
    }))
    .filter((candidate) => candidate.metadata.days_inactive >= 1 && candidate.metadata.days_inactive < abandonDays);
}

async function listExamCandidates(): Promise<Candidate[]> {
  if (!rulesEnabled || !ruleExamEnabled) return [];
  const { rows } = await query<{
    user_id: string;
    edital_id: string;
    titulo: string | null;
    banca: string | null;
    data_prova_prevista: Date;
  }>(
    `
      SELECT DISTINCT ON (eu.user_id)
        eu.user_id,
        e.id AS edital_id,
        e.titulo,
        e.banca,
        e.data_prova_prevista
      FROM edital_usuarios eu
      JOIN editais e ON e.id = eu.edital_id
      WHERE (eu.notificacoes_ativas IS DISTINCT FROM false)
        AND e.data_prova_prevista IS NOT NULL
        AND e.data_prova_prevista >= CURRENT_DATE
      ORDER BY eu.user_id, e.data_prova_prevista ASC
    `
  );

  const now = new Date();
  return rows
    .map((row) => {
      const daysToExam = daysBetween(now, new Date(row.data_prova_prevista));
      return {
        userId: row.user_id,
        event: 'exam' as const,
        metadata: {
          days_to_exam: daysToExam,
          edital_id: row.edital_id,
          titulo: row.titulo ?? undefined,
          banca: row.banca ?? undefined,
        },
        channels: channelsByEvent.exam,
      };
    })
    .filter((candidate) => candidate.metadata.days_to_exam <= examDays);
}

type BillingStatus = 'active' | 'trial' | 'cancelled' | 'free';

function inferBillingStatus(row: { plan: string | null; created_at: Date; updated_at: Date }): BillingStatus {
  if (row.plan) return 'active';

  const createdAt = row.created_at ? new Date(row.created_at) : null;
  const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
  const now = Date.now();

  if (createdAt && now - createdAt.getTime() <= trialWindowDays * 24 * 60 * 60 * 1000) {
    return 'trial';
  }

  if (
    updatedAt &&
    createdAt &&
    updatedAt.getTime() > createdAt.getTime() &&
    now - updatedAt.getTime() <= cancelWindowDays * 24 * 60 * 60 * 1000
  ) {
    return 'cancelled';
  }

  return 'free';
}

async function listBillingCandidates(): Promise<Candidate[]> {
  if (!rulesEnabled || !ruleBillingEnabled) return [];
  const { rows } = await query<{
    id: string;
    plan: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `
      SELECT id, plan, created_at, updated_at
      FROM users
    `
  );

  const candidates: Candidate[] = [];
  for (const row of rows) {
    const status = inferBillingStatus(row);
    if (status === 'cancelled') {
      candidates.push({
        userId: row.id,
        event: 'billing',
        metadata: { status: 'failed' },
        channels: channelsByEvent.billing,
      });
    }
    if (notifyFreeBilling && status === 'free') {
      candidates.push({
        userId: row.id,
        event: 'billing',
        metadata: { status: 'late' },
        channels: channelsByEvent.billing,
      });
    }
  }

  return candidates;
}

async function loadUserContext(userIds: string[]): Promise<Map<string, UserContext>> {
  const map = new Map<string, UserContext>();
  if (userIds.length === 0) return map;

  const { rows: settingsRows } = await query<{ user_id: string; learning_style: string }>(
    `
      SELECT user_id, learning_style
      FROM srs_user_settings
      WHERE user_id = ANY($1)
    `,
    [userIds]
  );

  settingsRows.forEach((row) => {
    map.set(row.user_id, { ...map.get(row.user_id), learning_style: row.learning_style });
  });

  const { rows: cognitiveRows } = await query<{ user_id: string; energia: number | null }>(
    `
      SELECT DISTINCT ON (user_id) user_id, energia
      FROM tracking_cognitive
      WHERE user_id = ANY($1)
      ORDER BY user_id, timestamp DESC
    `,
    [userIds]
  );

  cognitiveRows.forEach((row) => {
    map.set(row.user_id, { ...map.get(row.user_id), energia: row.energia ?? undefined });
  });

  const { rows: emotionalRows } = await query<{ user_id: string; humor_auto_reportado: number | null }>(
    `
      SELECT DISTINCT ON (user_id) user_id, humor_auto_reportado
      FROM tracking_emotional
      WHERE user_id = ANY($1)
      ORDER BY user_id, timestamp DESC
    `,
    [userIds]
  );

  emotionalRows.forEach((row) => {
    map.set(row.user_id, { ...map.get(row.user_id), humor: row.humor_auto_reportado ?? undefined });
  });

  return map;
}

async function listUsersWithPushDevices(userIds: string[]): Promise<Set<string>> {
  const result = new Set<string>();
  if (userIds.length === 0) return result;

  const { rows } = await query<{ user_id: string }>(
    `
      SELECT DISTINCT user_id
      FROM notification_devices
      WHERE enabled = true AND user_id = ANY($1)
    `,
    [userIds]
  );

  rows.forEach((row) => result.add(row.user_id));
  return result;
}

export async function runNotificationSweep() {
  const [srsCandidates, abandonCandidates, examCandidates, billingCandidates, studyCandidates] =
    await Promise.all([
      listSrsCandidates(),
      listAbandonCandidates(),
      listExamCandidates(),
      listBillingCandidates(),
      listStudyCandidates(),
    ]);

  const abandonUsers = new Set(abandonCandidates.map((c) => c.userId));
  const srsUsers = new Set(srsCandidates.map((c) => c.userId));
  const filteredStudy = studyCandidates.filter(
    (c) => !abandonUsers.has(c.userId) && !srsUsers.has(c.userId)
  );

  const candidates = [
    ...billingCandidates,
    ...examCandidates,
    ...abandonCandidates,
    ...srsCandidates,
    ...filteredStudy,
  ];

  const userIds = Array.from(new Set(candidates.map((c) => c.userId)));
  const contextMap = await loadUserContext(userIds);
  const pushUsers = await listUsersWithPushDevices(userIds);

  let queued = 0;
  let sent = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const context = contextMap.get(candidate.userId) || {};
    const metadata = { ...context, ...candidate.metadata };

    for (const channel of candidate.channels) {
      if (channel === 'push' && !pushUsers.has(candidate.userId)) {
        continue;
      }

      const result = await dispatchNotification({
        userId: candidate.userId,
        eventType: candidate.event,
        channel,
        metadata,
      });

      if (result.skipped) {
        skipped += 1;
      } else if (channel === 'inapp') {
        sent += 1;
      } else if (result.queued) {
        queued += 1;
      }
    }
  }

  return {
    total: candidates.length,
    queued,
    sent,
    skipped,
  };
}

export default {
  runNotificationSweep,
};
