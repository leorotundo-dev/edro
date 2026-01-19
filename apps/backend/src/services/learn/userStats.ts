import { query } from '../../db';

interface UserStatRow {
  id: number;
  correct_count: number | null;
  wrong_count: number | null;
  streak: number | null;
  next_due_at: string | null;
}

export interface UserStatUpdateResult {
  status: 'created' | 'updated';
  topicCode: string;
  streak: number;
  nextDue: Date;
  wasCorrect: boolean;
  correctCount?: number;
  wrongCount?: number;
}

/**
 * Simple cadence for SRS-like topic review based on streak.
 */
export function computeNextDueDate(streak: number, wasCorrect: boolean): Date {
  const now = new Date();

  if (!wasCorrect) {
    now.setHours(now.getHours() + 6);
    return now;
  }

  let offsetDays = 1;
  if (streak === 2) offsetDays = 2;
  else if (streak === 3) offsetDays = 4;
  else if (streak >= 4) offsetDays = 7;

  now.setDate(now.getDate() + offsetDays);
  return now;
}

export async function upsertUserStatsForTopic(params: {
  userId: string;
  topicCode: string;
  wasCorrect: boolean;
  now?: Date;
}): Promise<UserStatUpdateResult> {
  const { userId, topicCode, wasCorrect } = params;
  const now = params.now ?? new Date();

  const { rows: statRows } = await query<UserStatRow>(
    `
    SELECT id, correct_count, wrong_count, streak, next_due_at
    FROM user_stats
    WHERE user_id = $1 AND topic_code = $2
    LIMIT 1
    `,
    [userId, topicCode]
  );

  if (statRows.length === 0) {
    const initialStreak = wasCorrect ? 1 : 0;
    const nextDue = computeNextDueDate(initialStreak, wasCorrect);

    await query(
      `
      INSERT INTO user_stats (
        user_id, topic_code,
        correct_count, wrong_count, streak,
        last_seen_at, next_due_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        userId,
        topicCode,
        wasCorrect ? 1 : 0,
        wasCorrect ? 0 : 1,
        initialStreak,
        now,
        nextDue
      ]
    );

    return {
      status: 'created',
      topicCode,
      streak: initialStreak,
      nextDue,
      wasCorrect
    };
  }

  const stat = statRows[0];
  const newCorrect = (stat.correct_count ?? 0) + (wasCorrect ? 1 : 0);
  const newWrong = (stat.wrong_count ?? 0) + (wasCorrect ? 0 : 1);
  const newStreak = wasCorrect ? (stat.streak ?? 0) + 1 : 0;
  const nextDue = computeNextDueDate(newStreak, wasCorrect);

  await query(
    `
    UPDATE user_stats
    SET correct_count=$1,
        wrong_count=$2,
        streak=$3,
        last_seen_at=$4,
        next_due_at=$5
    WHERE user_id=$6 AND topic_code=$7
    `,
    [
      newCorrect,
      newWrong,
      newStreak,
      now,
      nextDue,
      userId,
      topicCode
    ]
  );

  return {
    status: 'updated',
    topicCode,
    streak: newStreak,
    nextDue,
    wasCorrect,
    correctCount: newCorrect,
    wrongCount: newWrong
  };
}
