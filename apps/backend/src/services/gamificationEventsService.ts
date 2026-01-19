import { query } from '../db';
import { GamificationService } from './gamificationService';

export type EventMetric =
  | 'xp_total'
  | 'drops_completed'
  | 'srs_reviews'
  | 'questions_answered'
  | 'simulado_finish';

type EventRow = {
  id: string;
  type: 'challenge' | 'event';
  title: string;
  description?: string;
  rules?: any;
  rewards?: any;
  is_active: boolean;
  start_at: Date;
  end_at: Date;
};

type RewardConfig = {
  xp_bonus?: number;
  xp?: number;
  streak_freeze?: number;
  badge_code?: string;
  scope?: 'all' | 'top';
  top_n?: number;
  topN?: number;
  positions?: Record<string, any>;
  position_rewards?: Record<string, any>;
};

function isEventActive(event: EventRow) {
  const now = new Date();
  return event.is_active && event.start_at <= now && event.end_at >= now;
}

function getMetricKey(metric: EventMetric) {
  switch (metric) {
    case 'xp_total':
      return 'xp';
    case 'drops_completed':
      return 'drops';
    case 'srs_reviews':
      return 'srs';
    case 'questions_answered':
      return 'questions';
    case 'simulado_finish':
      return 'simulados';
    default:
      return 'value';
  }
}

export async function listActiveEvents(userId?: string) {
  if (userId) {
    const { rows } = await query(
      `
        SELECT e.*,
          p.score,
          p.progress,
          p.status AS participant_status,
          p.joined_at
        FROM gamification_events e
        LEFT JOIN event_participants p
          ON p.event_id = e.id AND p.user_id = $1
        WHERE e.is_active = true
          AND e.start_at <= NOW()
          AND e.end_at >= NOW()
        ORDER BY e.start_at DESC
      `,
      [userId]
    );
    return rows;
  }

  const { rows } = await query(
    `
      SELECT *
      FROM gamification_events
      WHERE is_active = true
        AND start_at <= NOW()
        AND end_at >= NOW()
      ORDER BY start_at DESC
    `
  );
  return rows;
}

export async function joinEvent(params: { userId: string; eventId: string }) {
  await query(
    `
      INSERT INTO event_participants (event_id, user_id, score, progress, status, joined_at)
      VALUES ($1, $2, 0, '{}'::jsonb, 'active', NOW())
      ON CONFLICT (event_id, user_id) DO NOTHING
    `,
    [params.eventId, params.userId]
  );
}

export async function updateEventProgress(params: {
  userId: string;
  metric: EventMetric;
  delta: number;
}) {
  if (!params.delta) return;

  const { rows } = await query<EventRow>(
    `
      SELECT *
      FROM gamification_events
      WHERE is_active = true
        AND start_at <= NOW()
        AND end_at >= NOW()
    `
  );

  const metricKey = getMetricKey(params.metric);

  for (const event of rows) {
    if (!isEventActive(event)) continue;
    const ruleType = event.rules?.type;
    if (ruleType && ruleType !== params.metric) continue;

    const shouldAutoJoin = event.type === 'event' || event.rules?.auto_join === true;

    if (shouldAutoJoin) {
      await joinEvent({ userId: params.userId, eventId: event.id });
    } else {
      const { rows: joined } = await query(
        `
          SELECT id
          FROM event_participants
          WHERE event_id = $1 AND user_id = $2
          LIMIT 1
        `,
        [event.id, params.userId]
      );
      if (joined.length === 0) continue;
    }

    await query(
      `
        INSERT INTO event_participants (event_id, user_id, score, progress, status, joined_at)
        VALUES ($1, $2, $3::int, jsonb_build_object($4::text, $3::int), 'active', NOW())
        ON CONFLICT (event_id, user_id) DO UPDATE SET
          score = event_participants.score + EXCLUDED.score,
          progress = jsonb_set(
            COALESCE(event_participants.progress, '{}'::jsonb),
            ARRAY[$4::text],
            to_jsonb(COALESCE((event_participants.progress->>$4::text)::int, 0) + EXCLUDED.score),
            true
          ),
          status = 'active'
      `,
      [event.id, params.userId, params.delta, metricKey]
    );
  }
}

export async function getEventLeaderboard(eventId: string, limit: number = 20) {
  const { rows } = await query(
    `
      SELECT p.user_id, p.score, p.progress, u.name, u.email
      FROM event_participants p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.event_id = $1
      ORDER BY p.score DESC, p.joined_at ASC
      LIMIT $2
    `,
    [eventId, Math.min(limit, 50)]
  );
  return rows;
}

function resolveRewardScope(event: EventRow, rewards: RewardConfig) {
  if (rewards.scope) return rewards.scope;
  return event.type === 'challenge' ? 'top' : 'all';
}

function resolveTopN(rewards: RewardConfig) {
  const explicit = Number(rewards.top_n ?? rewards.topN ?? 0);
  return Number.isFinite(explicit) && explicit > 0 ? explicit : null;
}

async function grantEventReward(params: {
  userId: string;
  event: EventRow & { code?: string };
  reward: RewardConfig;
  position?: number;
}): Promise<boolean> {
  const xpReward = Number(params.reward.xp_bonus ?? params.reward.xp ?? 0);
  const freezeReward = Number(params.reward.streak_freeze ?? 0);
  const badgeCode = params.reward.badge_code ? String(params.reward.badge_code) : null;

  if (!(xpReward > 0 || freezeReward > 0 || badgeCode)) {
    return false;
  }

  if (xpReward > 0) {
    await GamificationService.trackActivity({
      userId: params.userId,
      action: 'event_reward',
      sourceId: params.event.id,
      metadata: {
        xp: xpReward,
        event_id: params.event.id,
        position: params.position ?? null,
      },
      reason: `Event reward: ${params.event.code ?? params.event.id}`,
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
    await GamificationService.awardBadgeByCode(params.userId, badgeCode, {
      event_id: params.event.id,
      position: params.position ?? null,
    });
  }

  return true;
}

export async function finalizeEndedEvents() {
  const { rows: events } = await query<EventRow & { code?: string }>(
    `
      SELECT *
      FROM gamification_events
      WHERE is_active = true
        AND end_at < NOW()
      ORDER BY end_at ASC
    `
  );

  let processed = 0;
  let rewarded = 0;

  for (const event of events) {
    const { rows: participants } = await query<{
      user_id: string;
      score: number;
      status: string;
      joined_at: Date;
    }>(
      `
        SELECT user_id, score, status, joined_at
        FROM event_participants
        WHERE event_id = $1
        ORDER BY score DESC, joined_at ASC
      `,
      [event.id]
    );

    const eligible = participants.filter((p) => p.status !== 'rewarded');
    const rewards = (event.rewards || {}) as RewardConfig;
    const positions = rewards.positions || rewards.position_rewards;
    const scope = resolveRewardScope(event, rewards);
    const topN = resolveTopN(rewards) ?? (scope === 'top' ? 3 : null);

    const targets: Array<{ userId: string; reward: RewardConfig; position: number }> = [];

    if (positions && typeof positions === 'object') {
      const entries = Object.entries(positions).sort(
        ([a], [b]) => Number(a) - Number(b)
      );
      for (const [rank, rewardOverride] of entries) {
        const index = Number(rank) - 1;
        if (!Number.isFinite(index) || index < 0) continue;
        const participant = eligible[index];
        if (!participant) continue;
        targets.push({
          userId: participant.user_id,
          reward: { ...rewards, ...(rewardOverride as RewardConfig) },
          position: index + 1,
        });
      }
    } else if (scope === 'top') {
      const limit = topN && topN > 0 ? topN : 3;
      eligible.slice(0, limit).forEach((participant, idx) => {
        targets.push({
          userId: participant.user_id,
          reward: rewards,
          position: idx + 1,
        });
      });
    } else {
      eligible.forEach((participant, idx) => {
        targets.push({
          userId: participant.user_id,
          reward: rewards,
          position: idx + 1,
        });
      });
    }

    for (const target of targets) {
      const applied = await grantEventReward({
        userId: target.userId,
        event,
        reward: target.reward,
        position: target.position,
      });
      if (applied) {
        rewarded += 1;
        await query(
          `
            UPDATE event_participants
            SET status = 'rewarded'
            WHERE event_id = $1 AND user_id = $2
          `,
          [event.id, target.userId]
        );
      }
    }

    await query(
      `
        UPDATE event_participants
        SET status = 'completed'
        WHERE event_id = $1 AND status <> 'rewarded'
      `,
      [event.id]
    );

    await query(
      `
        UPDATE gamification_events
        SET is_active = false
        WHERE id = $1
      `,
      [event.id]
    );

    processed += 1;
  }

  return { processed, rewarded };
}

export const GamificationEventsService = {
  listActiveEvents,
  joinEvent,
  updateEventProgress,
  getEventLeaderboard,
  finalizeEndedEvents,
};

export default GamificationEventsService;
