import { query } from '../db';
import { MonitoringService } from '../middleware/monitoring';
import { updateEventProgress } from './gamificationEventsService';
import { updateClanScoreForUser } from './clanService';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GamificationAction =
  | 'drop_completed'
  | 'srs_review'
  | 'question_answered'
  | 'simulado_finished'
  | 'plan_item_completed'
  | 'mission_reward'
  | 'event_reward'
  | 'manual';

type ActivityMetrics = {
  dropsCompleted?: number;
  srsReviews?: number;
  questionsAnswered?: number;
  questionsCorrect?: number;
  simuladosFinished?: number;
  studyMinutes?: number;
};

type ProfileRow = {
  user_id: string;
  xp_total: number;
  level: number;
  streak_current: number;
  streak_best: number;
  streak_freezes: number;
  last_study_at?: Date | null;
  last_streak_at?: Date | null;
  avatar_level: number;
};

const LEVEL_XP = toPositiveInt(process.env.GAMIFICATION_XP_PER_LEVEL, 500);

const DEDUPE_ACTIONS = new Set<GamificationAction>([
  'drop_completed',
  'question_answered',
  'simulado_finished',
]);

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeUuid(value?: string | null): string | null {
  if (!value) return null;
  return UUID_REGEX.test(value) ? value : null;
}

function computeLevel(xpTotal: number) {
  return Math.max(1, Math.floor(xpTotal / LEVEL_XP) + 1);
}

function computeAvatarLevel(level: number) {
  return Math.max(1, Math.floor((level - 1) / 5) + 1);
}

function getDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(a: Date, b: Date) {
  const start = getDateOnly(a).getTime();
  const end = getDateOnly(b).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function buildMetricsFromAction(action: GamificationAction, metadata?: Record<string, any>): {
  xp: number;
  metrics: ActivityMetrics;
  study: boolean;
} {
  const metrics: ActivityMetrics = {};
  let xp = 0;
  let study = false;

  switch (action) {
    case 'drop_completed':
      xp = 20;
      metrics.dropsCompleted = 1;
      study = true;
      break;
    case 'srs_review':
      xp = 5;
      metrics.srsReviews = 1;
      study = true;
      break;
    case 'question_answered': {
      const correctBonus = metadata?.isCorrect ? 4 : 0;
      xp = 8 + correctBonus;
      metrics.questionsAnswered = 1;
      metrics.questionsCorrect = metadata?.isCorrect ? 1 : 0;
      study = true;
      break;
    }
    case 'simulado_finished': {
      const accuracy = Number(metadata?.accuracy ?? 0);
      const base = 60;
      const bonus = Math.min(40, Math.round(accuracy * 0.4));
      xp = base + bonus;
      metrics.simuladosFinished = 1;
      metrics.questionsAnswered = Number(metadata?.totalQuestions ?? 0) || 0;
      metrics.questionsCorrect = Number(metadata?.correctQuestions ?? 0) || 0;
      study = true;
      break;
    }
    case 'plan_item_completed': {
      const itemType = String(metadata?.itemType || '');
      if (itemType === 'drop') {
        xp = 12;
        metrics.dropsCompleted = 1;
      } else if (itemType === 'srs_review') {
        xp = 6;
        metrics.srsReviews = 1;
      } else if (itemType === 'question') {
        xp = 8;
        metrics.questionsAnswered = 1;
      } else if (itemType === 'simulado') {
        xp = 20;
        metrics.simuladosFinished = 1;
      } else {
        xp = 2;
      }
      study = true;
      break;
    }
    case 'mission_reward':
    case 'event_reward':
    case 'manual':
    default:
      xp = Number(metadata?.xp ?? 0) || 0;
      break;
  }

  if (metadata?.studyMinutes) {
    metrics.studyMinutes = Number(metadata.studyMinutes);
  }

  return { xp, metrics, study };
}

export async function ensureProfile(userId: string): Promise<ProfileRow> {
  await query(
    `
      INSERT INTO gamification_profiles (user_id, xp_total, level, streak_current, streak_best, streak_freezes, avatar_level)
      VALUES ($1, 0, 1, 0, 0, 0, 1)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId]
  );

  const { rows } = await query<ProfileRow>(
    `SELECT * FROM gamification_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  return rows[0];
}

async function hasDuplicateEvent(userId: string, action: GamificationAction, sourceId?: string | null) {
  if (!sourceId || !DEDUPE_ACTIONS.has(action)) return false;
  const normalized = normalizeUuid(sourceId);
  if (!normalized) return false;
  const { rows } = await query(
    `
      SELECT id FROM xp_events
      WHERE user_id = $1 AND source_type = $2 AND source_id = $3
      LIMIT 1
    `,
    [userId, action, normalized]
  );
  return rows.length > 0;
}

async function addXpEvent(params: {
  userId: string;
  action: GamificationAction;
  amount: number;
  sourceId?: string | null;
  reason?: string;
  metadata?: Record<string, any>;
}) {
  if (!params.amount) {
    return { xpTotal: null, level: null };
  }

  const sourceId = normalizeUuid(params.sourceId);
  await query(
    `
      INSERT INTO xp_events (user_id, source_type, source_id, amount, reason, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
    [
      params.userId,
      params.action,
      sourceId,
      params.amount,
      params.reason ?? null,
      JSON.stringify(params.metadata ?? {}),
    ]
  );

  const { rows } = await query<{ xp_total: number }>(
    `
      UPDATE gamification_profiles
      SET xp_total = xp_total + $2
      WHERE user_id = $1
      RETURNING xp_total
    `,
    [params.userId, params.amount]
  );

  const xpTotal = Number(rows[0]?.xp_total ?? 0);
  const level = computeLevel(xpTotal);
  const avatarLevel = computeAvatarLevel(level);

  await query(
    `
      UPDATE gamification_profiles
      SET level = $2, avatar_level = $3, updated_at = NOW()
      WHERE user_id = $1
    `,
    [params.userId, level, avatarLevel]
  );

  return { xpTotal, level };
}

async function updateStreak(userId: string, profile: ProfileRow) {
  const now = new Date();
  const lastStreakAt = profile.last_streak_at ? new Date(profile.last_streak_at) : null;
  const rawDiff = lastStreakAt ? diffDays(lastStreakAt, now) : null;
  const diff = rawDiff !== null ? Math.max(rawDiff, 0) : null;
  let streakCurrent = profile.streak_current;
  let streakBest = profile.streak_best;
  let streakFreezes = profile.streak_freezes;
  let usedFreezes = 0;

  if (diff === 0) {
    // Same day, no change
  } else if (diff === null) {
    streakCurrent = 1;
  } else if (diff === 1) {
    streakCurrent = streakCurrent + 1;
  } else {
    const needed = diff - 1;
    if (streakFreezes >= needed) {
      streakFreezes -= needed;
      usedFreezes = needed;
    } else {
      streakCurrent = 1;
    }
  }

  if (streakCurrent > streakBest) {
    streakBest = streakCurrent;
  }

  await query(
    `
      UPDATE gamification_profiles
      SET streak_current = $2,
          streak_best = $3,
          streak_freezes = $4,
          last_study_at = NOW(),
          last_streak_at = NOW(),
          updated_at = NOW()
      WHERE user_id = $1
    `,
    [userId, streakCurrent, streakBest, streakFreezes]
  );

  return { streakCurrent, streakBest, streakFreezes, usedFreezes };
}

async function updateDailyProgress(params: {
  userId: string;
  metrics: ActivityMetrics;
  xpDelta: number;
  level: number;
  streak: number;
}) {
  const dateStr = new Date().toISOString().split('T')[0];
  const drops = params.metrics.dropsCompleted ?? 0;
  const srs = params.metrics.srsReviews ?? 0;
  const questions = params.metrics.questionsAnswered ?? 0;
  const correct = params.metrics.questionsCorrect ?? 0;
  const minutes = params.metrics.studyMinutes ?? 0;

  await query(
    `
      INSERT INTO progress_diario (
        user_id, date, drops_completados, questoes_respondidas, questoes_corretas,
        taxa_acerto, tempo_estudado_minutos, srs_revisoes, xp_ganho, nivel, streak
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id, date) DO UPDATE SET
        drops_completados = progress_diario.drops_completados + EXCLUDED.drops_completados,
        questoes_respondidas = progress_diario.questoes_respondidas + EXCLUDED.questoes_respondidas,
        questoes_corretas = progress_diario.questoes_corretas + EXCLUDED.questoes_corretas,
        tempo_estudado_minutos = progress_diario.tempo_estudado_minutos + EXCLUDED.tempo_estudado_minutos,
        srs_revisoes = progress_diario.srs_revisoes + EXCLUDED.srs_revisoes,
        xp_ganho = progress_diario.xp_ganho + EXCLUDED.xp_ganho,
        nivel = EXCLUDED.nivel,
        streak = EXCLUDED.streak,
        taxa_acerto = CASE
          WHEN (progress_diario.questoes_respondidas + EXCLUDED.questoes_respondidas) > 0
            THEN ((progress_diario.questoes_corretas + EXCLUDED.questoes_corretas)::float
              / (progress_diario.questoes_respondidas + EXCLUDED.questoes_respondidas)) * 100
          ELSE progress_diario.taxa_acerto
        END
    `,
    [
      params.userId,
      dateStr,
      drops,
      questions,
      correct,
      questions > 0 ? (correct / Math.max(1, questions)) * 100 : 0,
      minutes,
      srs,
      params.xpDelta,
      params.level,
      params.streak,
    ]
  );
}

async function listActiveMissions() {
  const { rows } = await query(
    `
      SELECT *
      FROM missions
      WHERE is_active = true
        AND (start_at IS NULL OR start_at <= NOW())
        AND (end_at IS NULL OR end_at >= NOW())
      ORDER BY type ASC, created_at ASC
    `
  );
  return rows;
}

function getMissionWindow(mission: { type: string; start_at?: Date; end_at?: Date }) {
  const now = new Date();
  if (mission.type === 'weekly') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diff));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }
  if (mission.type === 'event' && mission.start_at && mission.end_at) {
    return { start: mission.start_at, end: mission.end_at };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  return { start, end };
}

async function updateMissionProgress(params: {
  userId: string;
  metrics: ActivityMetrics;
  xpDelta: number;
  streakCurrent: number;
}) {
  const missions = await listActiveMissions();
  if (missions.length === 0) return;

  for (const mission of missions) {
    const rules = mission.rules || {};
    const type = String(rules.type || '');
    let delta = 0;
    let currentValue = 0;
    let overwriteWithValue = false;

    if (type === 'drops_completed') {
      delta = params.metrics.dropsCompleted ?? 0;
      currentValue = delta;
    } else if (type === 'srs_reviews') {
      delta = params.metrics.srsReviews ?? 0;
      currentValue = delta;
    } else if (type === 'questions_answered') {
      delta = params.metrics.questionsAnswered ?? 0;
      currentValue = delta;
    } else if (type === 'simulado_finish') {
      delta = params.metrics.simuladosFinished ?? 0;
      currentValue = delta;
    } else if (type === 'xp_total') {
      delta = params.xpDelta;
      currentValue = delta;
    } else if (type === 'streak_current') {
      currentValue = params.streakCurrent;
      overwriteWithValue = true;
    }

    if (currentValue === 0 && delta === 0) {
      continue;
    }

    const goal = Number(rules.goal ?? 0);
    const { start, end } = getMissionWindow(mission);
    const windowStart = start.toISOString().split('T')[0];
    const windowEnd = end.toISOString().split('T')[0];

    const { rows } = await query<{
      id: string;
      progress: number;
      goal: number;
      status: string;
    }>(
      `
        INSERT INTO mission_progress (
          mission_id, user_id, progress, goal, status, window_start, window_end
        ) VALUES ($1, $2, $3, $4, 'active', $5, $6)
        ON CONFLICT (mission_id, user_id, window_start)
        DO UPDATE SET
          progress = CASE
            WHEN $7::boolean THEN GREATEST(mission_progress.progress, $3)
            ELSE LEAST(mission_progress.progress + $3, $4)
          END,
          goal = $4,
          updated_at = NOW()
        RETURNING id, progress, goal, status
      `,
      [mission.id, params.userId, overwriteWithValue ? currentValue : delta, goal, windowStart, windowEnd, overwriteWithValue]
    );

    const progress = rows[0]?.progress ?? 0;
    const status = rows[0]?.status ?? 'active';
    if (status !== 'completed' && goal > 0 && progress >= goal) {
      await query(
        `
          UPDATE mission_progress
          SET status = 'completed', updated_at = NOW()
          WHERE id = $1
        `,
        [rows[0].id]
      );
      await grantMissionReward({
        userId: params.userId,
        mission,
      });
    }
  }
}

async function grantMissionReward(params: {
  userId: string;
  mission: any;
}) {
  const rewards = params.mission.rewards || {};
  const xpReward = Number(rewards.xp ?? 0);
  const freezeReward = Number(rewards.streak_freeze ?? 0);
  const badgeCode = rewards.badge_code ? String(rewards.badge_code) : null;

  if (xpReward > 0) {
    await addXpEvent({
      userId: params.userId,
      action: 'mission_reward',
      amount: xpReward,
      sourceId: params.mission.id,
      reason: `Mission reward: ${params.mission.code}`,
      metadata: { mission_id: params.mission.id },
    });
  }

  if (freezeReward > 0) {
    await query(
      `
        UPDATE gamification_profiles
        SET streak_freezes = streak_freezes + $2, updated_at = NOW()
        WHERE user_id = $1
      `,
      [params.userId, freezeReward]
    );
  }

  if (badgeCode) {
    await awardBadgeByCode(params.userId, badgeCode, {
      mission_id: params.mission.id,
    });
  }
}

async function getBadgeMetrics(userId: string, profile: ProfileRow) {
  const { rows } = await query<{
    source_type: string;
    count: string;
  }>(
    `
      SELECT source_type, COUNT(*)::int AS count
      FROM xp_events
      WHERE user_id = $1
      GROUP BY source_type
    `,
    [userId]
  );
  const counts: Record<string, number> = {};
  rows.forEach((row) => {
    counts[row.source_type] = Number(row.count);
  });

  return {
    xp_total: profile.xp_total,
    streak_current: profile.streak_current,
    srs_reviews: counts.srs_review ?? 0,
    simulado_finish: counts.simulado_finished ?? 0,
    questions_answered: counts.question_answered ?? 0,
    drops_completed: counts.drop_completed ?? 0,
  };
}

async function awardBadges(userId: string, profile: ProfileRow) {
  const { rows: badges } = await query<any>(
    `
      SELECT b.*
      FROM badges b
      WHERE b.is_active = true
    `
  );

  if (badges.length === 0) return [];

  const metrics = await getBadgeMetrics(userId, profile);

  const awarded: any[] = [];
  for (const badge of badges) {
    const { rows: existing } = await query(
      `
        SELECT 1 FROM user_badges
        WHERE user_id = $1 AND badge_id = $2
        LIMIT 1
      `,
      [userId, badge.id]
    );
    if (existing.length > 0) continue;

    const ruleType = String(badge.rule_type || '');
    const threshold = Number(badge.rule_config?.threshold ?? 0);
    const value = Number((metrics as any)[ruleType] ?? 0);
    if (threshold > 0 && value >= threshold) {
      await query(
        `
          INSERT INTO user_badges (user_id, badge_id, earned_at, metadata)
          VALUES ($1, $2, NOW(), $3)
        `,
        [userId, badge.id, JSON.stringify({ value })]
      );
      awarded.push(badge);
    }
  }

  return awarded;
}

export async function awardBadgeByCode(userId: string, badgeCode: string, metadata?: Record<string, any>) {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM badges WHERE code = $1 LIMIT 1`,
    [badgeCode]
  );
  const badgeId = rows[0]?.id;
  if (!badgeId) return false;

  await query(
    `
      INSERT INTO user_badges (user_id, badge_id, earned_at, metadata)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (user_id, badge_id) DO NOTHING
    `,
    [userId, badgeId, JSON.stringify(metadata ?? {})]
  );
  return true;
}

export async function trackActivity(params: {
  userId: string;
  action: GamificationAction;
  sourceId?: string | null;
  metadata?: Record<string, any>;
  reason?: string;
}) {
  const duplicate = await hasDuplicateEvent(params.userId, params.action, params.sourceId);
  if (duplicate) {
    return { skipped: true };
  }

  const profile = await ensureProfile(params.userId);
  const { xp, metrics, study } = buildMetricsFromAction(params.action, params.metadata);

  let streakCurrent = profile.streak_current;
  if (study) {
    const streakResult = await updateStreak(params.userId, profile);
    streakCurrent = streakResult.streakCurrent;
  }

  const xpResult = await addXpEvent({
    userId: params.userId,
    action: params.action,
    amount: xp,
    sourceId: params.sourceId,
    reason: params.reason,
    metadata: params.metadata,
  });

  const xpTotal = xpResult.xpTotal ?? profile.xp_total;
  const level = xpResult.level ?? profile.level;

  await updateDailyProgress({
    userId: params.userId,
    metrics,
    xpDelta: xp,
    level,
    streak: streakCurrent,
  });

  await updateMissionProgress({
    userId: params.userId,
    metrics,
    xpDelta: xp,
    streakCurrent,
  });

  if (xp > 0) {
    const updateEvents =
      params.action !== 'mission_reward' &&
      params.action !== 'event_reward' &&
      params.action !== 'manual';
    if (updateEvents) {
      await updateEventProgress({
        userId: params.userId,
        metric: 'xp_total',
        delta: xp,
      });
    }
    await updateClanScoreForUser({
      userId: params.userId,
      xpDelta: xp,
    });
  }

  if (metrics.dropsCompleted) {
    await updateEventProgress({
      userId: params.userId,
      metric: 'drops_completed',
      delta: metrics.dropsCompleted,
    });
  }
  if (metrics.srsReviews) {
    await updateEventProgress({
      userId: params.userId,
      metric: 'srs_reviews',
      delta: metrics.srsReviews,
    });
  }
  if (metrics.questionsAnswered) {
    await updateEventProgress({
      userId: params.userId,
      metric: 'questions_answered',
      delta: metrics.questionsAnswered,
    });
  }
  if (metrics.simuladosFinished) {
    await updateEventProgress({
      userId: params.userId,
      metric: 'simulado_finish',
      delta: metrics.simuladosFinished,
    });
  }

  await awardBadges(params.userId, {
    ...profile,
    xp_total: xpTotal,
    level,
    streak_current: streakCurrent,
  } as ProfileRow);

  MonitoringService.trackMetric('gamification_xp', xp);
  MonitoringService.trackMetric(`gamification_action_${params.action}`, 1);

  return {
    xp,
    xpTotal,
    level,
    streak: streakCurrent,
  };
}

export async function getProfileSummary(userId: string) {
  const profile = await ensureProfile(userId);
  const level = computeLevel(profile.xp_total);
  const nextLevelXp = level * LEVEL_XP;
  const xpIntoLevel = profile.xp_total - (level - 1) * LEVEL_XP;

  const { rows: badges } = await query(
    `
      SELECT b.id, b.code, b.title, b.description, b.category, ub.earned_at
      FROM user_badges ub
      JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
    `,
    [userId]
  );

  return {
    xp_total: profile.xp_total,
    level,
    next_level_xp: nextLevelXp,
    xp_into_level: xpIntoLevel,
    streak_current: profile.streak_current,
    max_streak: profile.streak_best,
    streak_freezes: profile.streak_freezes,
    avatar_level: profile.avatar_level,
    badges,
  };
}

export async function listMissionsForUser(userId: string) {
  const missions = await listActiveMissions();
  const results = [];
  for (const mission of missions) {
    const { start } = getMissionWindow(mission);
    const windowStart = start.toISOString().split('T')[0];
    const { rows } = await query(
      `
        SELECT progress, goal, status, window_start, window_end
        FROM mission_progress
        WHERE mission_id = $1 AND user_id = $2 AND window_start = $3
        LIMIT 1
      `,
      [mission.id, userId, windowStart]
    );

    results.push({
      ...mission,
      progress: rows[0]?.progress ?? 0,
      goal: rows[0]?.goal ?? Number(mission.rules?.goal ?? 0),
      status: rows[0]?.status ?? 'active',
      window_start: rows[0]?.window_start ?? windowStart,
      window_end: rows[0]?.window_end ?? getMissionWindow(mission).end.toISOString().split('T')[0],
    });
  }

  return results;
}

export async function listGlobalLeaderboard(limit: number = 20) {
  const { rows } = await query(
    `
      SELECT p.user_id, p.xp_total, p.level, p.streak_current, u.name, u.email
      FROM gamification_profiles p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.xp_total DESC
      LIMIT $1
    `,
    [Math.min(limit, 50)]
  );
  return rows;
}

export const GamificationService = {
  trackActivity,
  getProfileSummary,
  listMissionsForUser,
  listGlobalLeaderboard,
  awardBadgeByCode,
  ensureProfile,
};

export default GamificationService;
