import { query } from '../db';
import { cacheDelPattern, cacheGet, cacheSet } from '../services/redisCache';

export type SrsStatus = 'learning' | 'review' | 'suspended';
export type SrsContentType = 'drop' | 'question' | 'mnemonic';

export interface SrsCard {
  id: string;
  user_id: string;
  drop_id: string;
  status: SrsStatus;
  interval_days: number;
  ease_factor: number;
  repetition: number;
  next_review_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SrsReview {
  id: string;
  card_id: string;
  user_id: string;
  grade: number;
  reviewed_at: Date;
}

export type SrsQueueMode = 'today' | 'overdue' | 'upcoming' | 'all';

export interface SrsUserSettings {
  user_id: string;
  memory_strength: 'weak' | 'normal' | 'strong';
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  max_new_cards_per_day: number;
  base_interval_days: number;
  created_at: Date;
  updated_at: Date;
}

export interface SrsUserInterval {
  id: string;
  user_id: string;
  subtopico: string;
  interval_multiplier: number;
  ease_multiplier: number;
  avg_retention?: number | null;
  avg_time_per_review?: number | null;
  updated_at: Date;
}

const DEFAULT_SETTINGS: Omit<SrsUserSettings, 'user_id' | 'created_at' | 'updated_at'> = {
  memory_strength: 'normal',
  learning_style: 'mixed',
  max_new_cards_per_day: 20,
  base_interval_days: 1,
};

const PG_MISSING_TABLE = '42P01';

function isMissingTable(err: unknown) {
  return (err as { code?: string })?.code === PG_MISSING_TABLE;
}

export async function findCardByUserAndDrop(userId: string, dropId: string): Promise<SrsCard | null> {
  const { rows } = await query<SrsCard>(
    'SELECT * FROM srs_cards WHERE user_id = $1 AND drop_id = $2 LIMIT 1',
    [userId, dropId]
  );
  return rows[0] ?? null;
}

export async function createCard(userId: string, dropId: string): Promise<SrsCard> {
  const { rows } = await query<SrsCard>(
    `
      INSERT INTO srs_cards (user_id, drop_id, status, interval_days, ease_factor, repetition, next_review_at)
      VALUES ($1, $2, 'learning', 1, 2.5, 0, NOW())
      RETURNING *
    `,
    [userId, dropId]
  );
  return rows[0];
}

export async function findCardByContent(
  userId: string,
  contentType: SrsContentType,
  contentId: string
): Promise<SrsCard | null> {
  try {
    const { rows } = await query<SrsCard>(
      `
        SELECT sc.*
        FROM srs_cards sc
        JOIN srs_card_content_map scm ON scm.card_id = sc.id
        WHERE sc.user_id = $1
          AND scm.content_type = $2
          AND scm.content_id = $3
        LIMIT 1
      `,
      [userId, contentType, contentId]
    );
    return rows[0] ?? null;
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}

export async function linkCardToContent(
  cardId: string,
  contentType: SrsContentType,
  contentId: string
): Promise<boolean> {
  try {
    await query(
      `
        INSERT INTO srs_card_content_map (card_id, content_type, content_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (card_id, content_type, content_id) DO NOTHING
      `,
      [cardId, contentType, contentId]
    );
    return true;
  } catch (err) {
    if (isMissingTable(err)) return false;
    throw err;
  }
}

export async function findOrCreateCardForContent(params: {
  userId: string;
  contentType: SrsContentType;
  contentId: string;
  dropId?: string;
}): Promise<SrsCard> {
  const { userId, contentType, contentId, dropId } = params;

  const mapped = await findCardByContent(userId, contentType, contentId);
  if (mapped) return mapped;

  const legacy = await findCardByUserAndDrop(userId, contentId);
  if (legacy) {
    await linkCardToContent(legacy.id, contentType, contentId);
    return legacy;
  }

  const card = await createCard(userId, dropId ?? contentId);
  await linkCardToContent(card.id, contentType, contentId);
  return card;
}

async function resolveSubtopicFromContent(params: {
  contentType: SrsContentType;
  contentId: string;
  dropId?: string;
}): Promise<string | null> {
  if (params.dropId) {
    const { rows: dropRows } = await query<{ topic_code: string | null }>(
      'SELECT topic_code FROM drops WHERE id = $1 LIMIT 1',
      [params.dropId]
    );
    if (dropRows[0]?.topic_code) return dropRows[0].topic_code;
  }

  if (params.contentType === 'drop') {
    const { rows: dropRows } = await query<{ topic_code: string | null }>(
      'SELECT topic_code FROM drops WHERE id = $1 LIMIT 1',
      [params.contentId]
    );
    return dropRows[0]?.topic_code ?? null;
  }

  if (params.contentType === 'question') {
    const { rows: questionRows } = await query<{ topic: string | null; subtopico: string | null }>(
      'SELECT topic, subtopico FROM questoes WHERE id = $1 LIMIT 1',
      [params.contentId]
    );
    return questionRows[0]?.topic || questionRows[0]?.subtopico || null;
  }

  if (params.contentType === 'mnemonic') {
    const { rows: mnemonicRows } = await query<{ subtopico: string | null }>(
      'SELECT subtopico FROM mnemonicos WHERE id = $1 LIMIT 1',
      [params.contentId]
    );
    return mnemonicRows[0]?.subtopico ?? null;
  }

  return null;
}

export async function resolveSubtopicForCard(_userId: string, card: SrsCard): Promise<string | null> {
  const direct = await resolveSubtopicFromContent({
    contentType: 'drop',
    contentId: card.drop_id,
    dropId: card.drop_id,
  });
  if (direct) return direct;

  try {
    const { rows } = await query<{ content_type: SrsContentType; content_id: string }>(
      `
        SELECT content_type, content_id
        FROM srs_card_content_map
        WHERE card_id = $1
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [card.id]
    );
    if (!rows[0]) return null;
    return resolveSubtopicFromContent({
      contentType: rows[0].content_type,
      contentId: rows[0].content_id,
      dropId: card.drop_id,
    });
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}

export async function getUserInterval(userId: string, subtopico: string): Promise<SrsUserInterval | null> {
  try {
    const { rows } = await query<SrsUserInterval>(
      `
        SELECT *
        FROM srs_user_intervals
        WHERE user_id = $1 AND subtopico = $2
        LIMIT 1
      `,
      [userId, subtopico]
    );
    return rows[0] ?? null;
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}

export async function listUserIntervals(
  userId: string,
  limit: number = 100
): Promise<SrsUserInterval[]> {
  try {
    const { rows } = await query<SrsUserInterval>(
      `
        SELECT *
        FROM srs_user_intervals
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT $2
      `,
      [userId, limit]
    );
    return rows;
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

export async function upsertUserInterval(
  userId: string,
  subtopico: string,
  data: Partial<Pick<SrsUserInterval, 'interval_multiplier' | 'ease_multiplier' | 'avg_retention' | 'avg_time_per_review'>>
): Promise<SrsUserInterval> {
  const intervalMultiplier = data.interval_multiplier ?? 1.0;
  const easeMultiplier = data.ease_multiplier ?? 1.0;

  const { rows } = await query<SrsUserInterval>(
    `
      INSERT INTO srs_user_intervals (
        user_id, subtopico, interval_multiplier, ease_multiplier, avg_retention, avg_time_per_review, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id, subtopico) DO UPDATE SET
        interval_multiplier = EXCLUDED.interval_multiplier,
        ease_multiplier = EXCLUDED.ease_multiplier,
        avg_retention = EXCLUDED.avg_retention,
        avg_time_per_review = EXCLUDED.avg_time_per_review,
        updated_at = NOW()
      RETURNING *
    `,
    [
      userId,
      subtopico,
      intervalMultiplier,
      easeMultiplier,
      data.avg_retention ?? null,
      data.avg_time_per_review ?? null,
    ]
  );

  await invalidateCache(userId);
  return rows[0];
}

export async function registerSrsErrorReview(params: {
  userId: string;
  contentType: SrsContentType;
  contentId: string;
  dropId?: string;
}): Promise<SrsCard> {
  const card = await findOrCreateCardForContent(params);
  const settings = await getUserSettings(params.userId);
  const subtopico = await resolveSubtopicFromContent({
    contentType: params.contentType,
    contentId: params.contentId,
    dropId: params.dropId ?? card.drop_id,
  });
  const interval = subtopico ? await getUserInterval(params.userId, subtopico) : null;

  await saveReview(params.userId, card.id, 1);

  const scheduling = computeNextScheduling(
    card.interval_days,
    card.ease_factor,
    card.repetition,
    1,
    {
      settings,
      intervalMultiplier: interval?.interval_multiplier ?? 1,
      easeMultiplier: interval?.ease_multiplier ?? 1,
    }
  );

  const updated = await updateCardScheduling(card.id, {
    interval_days: scheduling.nextInterval,
    ease_factor: scheduling.nextEase,
    repetition: scheduling.nextRepetition,
  });

  await invalidateCache(params.userId);
  return updated;
}

export async function listDueCards(userId: string, limit: number = 20): Promise<SrsCard[]> {
  const { rows } = await query<SrsCard>(
    `
      SELECT * FROM srs_cards
      WHERE user_id = $1
        AND next_review_at <= NOW()
      ORDER BY next_review_at ASC
      LIMIT $2
    `,
    [userId, limit]
  );
  return rows;
}

export async function listCardsByMode(
  userId: string,
  mode: SrsQueueMode = 'today',
  limit: number = 50,
  useCache: boolean = true
): Promise<SrsCard[]> {
  const cacheKey = `srs:queue:${userId}:${mode}:${limit}`;
  if (useCache) {
    const cached = await cacheGet<SrsCard[]>(cacheKey);
    if (cached) return cached;
  }

  const { rows } = await query<SrsCard>(
    `
      SELECT *
      FROM srs_cards
      WHERE user_id = $1
        AND (
          $2 = 'all' OR
          ($2 = 'today' AND next_review_at <= (CURRENT_DATE + INTERVAL '1 day')) OR
          ($2 = 'overdue' AND next_review_at < (CURRENT_DATE)) OR
          ($2 = 'upcoming' AND next_review_at > (CURRENT_DATE + INTERVAL '1 day') AND next_review_at <= (CURRENT_DATE + INTERVAL '7 day'))
        )
      ORDER BY next_review_at ASC
      LIMIT $3
    `,
    [userId, mode, limit]
  );

  if (useCache) {
    await cacheSet(cacheKey, rows, 60);
  }

  return rows;
}

export async function saveReview(userId: string, cardId: string, grade: number): Promise<void> {
  await query(
    `
      INSERT INTO srs_reviews (card_id, user_id, grade, reviewed_at)
      VALUES ($1, $2, $3, NOW())
    `,
    [cardId, userId, grade]
  );
}

/**
 * Simple SM-2-like algorithm for scheduling.
 * grade: 0-5, where:
 * 0-2: reset repetition, interval = 1
 * 3-5: increase repetition and grow interval
 */
export function computeNextScheduling(
  currentInterval: number,
  currentEase: number,
  currentRepetition: number,
  grade: number,
  opts?: {
    settings?: Partial<SrsUserSettings>;
    intervalMultiplier?: number;
    easeMultiplier?: number;
  }
): { nextInterval: number; nextEase: number; nextRepetition: number } {
  let ease = currentEase;
  let repetition = currentRepetition;
  let interval = currentInterval;
  const settings = opts?.settings;
  const intervalMultiplier = opts?.intervalMultiplier ?? 1;
  const easeMultiplier = opts?.easeMultiplier ?? 1;

  // Personaliza‡Æo por perfil do usu rio
  const strengthBias =
    settings?.memory_strength === 'strong'
      ? 1.25
      : settings?.memory_strength === 'weak'
        ? 0.65
        : 1;
  const styleBias =
    settings?.learning_style === 'visual'
      ? 1.05
      : settings?.learning_style === 'auditory'
        ? 0.95
        : 1;
  const baseInterval = settings?.base_interval_days ?? 1;

  if (grade < 3) {
    repetition = 0;
    interval = baseInterval;
  } else {
    if (repetition === 0) {
      interval = baseInterval;
    } else if (repetition === 1) {
      interval = Math.max(2, Math.round(6 * strengthBias));
    } else {
      interval = Math.round(interval * ease * strengthBias * styleBias);
    }
    repetition += 1;
    ease = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    ease = ease * easeMultiplier;
    if (ease < 1.3) {
      ease = 1.3;
    }
  }

  interval = Math.max(baseInterval, Math.round(interval * intervalMultiplier));

  return {
    nextInterval: interval,
    nextEase: ease,
    nextRepetition: repetition
  };
}

export async function updateCardScheduling(cardId: string, data: {
  interval_days: number;
  ease_factor: number;
  repetition: number;
}): Promise<SrsCard> {
  const { rows } = await query<SrsCard>(
    `
      UPDATE srs_cards
      SET interval_days = $2,
          ease_factor = $3,
          repetition = $4,
          next_review_at = NOW() + (CAST($2 AS INTEGER) * INTERVAL '1 day'),
          status = 'review',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [cardId, data.interval_days, data.ease_factor, data.repetition]
  );
  return rows[0];
}

export interface SrsSummary {
  due: number;
  overdue: number;
  upcoming: number;
  due_today: number;
  due_next7: number;
  retention_rate: number;
  last_review?: Date;
}

export async function getSrsSummary(userId: string): Promise<SrsSummary> {
  const cacheKey = `srs:summary:${userId}`;
  const cached = await cacheGet<SrsSummary>(cacheKey);
  if (cached) return cached;

  const { rows } = await query<{
    due: string;
    overdue: string;
    upcoming: string;
    due_today: string;
    due_next7: string;
    retention_rate: string | null;
    last_review: Date | null;
  }>(
    `
      WITH counts AS (
        SELECT
          SUM(CASE WHEN next_review_at <= NOW() THEN 1 ELSE 0 END) AS due,
          SUM(CASE WHEN next_review_at <= NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) AS overdue,
          SUM(CASE WHEN next_review_at > NOW() THEN 1 ELSE 0 END) AS upcoming,
          SUM(CASE WHEN next_review_at <= (CURRENT_DATE + INTERVAL '1 day') THEN 1 ELSE 0 END) AS due_today,
          SUM(CASE WHEN next_review_at > (CURRENT_DATE + INTERVAL '1 day') AND next_review_at <= (CURRENT_DATE + INTERVAL '7 day') THEN 1 ELSE 0 END) AS due_next7
        FROM srs_cards
        WHERE user_id = $1
      ),
      retention AS (
        SELECT
          AVG(CASE WHEN grade >= 3 THEN 1 ELSE 0 END) AS retention_rate,
          MAX(reviewed_at) AS last_review
        FROM srs_reviews
        WHERE user_id = $1
      )
      SELECT
        counts.due,
        counts.overdue,
        counts.upcoming,
        counts.due_today,
        counts.due_next7,
        retention.retention_rate,
        retention.last_review
      FROM counts, retention
    `,
    [userId]
  );

  const row = rows[0] || {
    due: '0',
    overdue: '0',
    upcoming: '0',
    retention_rate: null,
    last_review: null
  };

  return {
    due: Number(row.due) || 0,
    overdue: Number(row.overdue) || 0,
    upcoming: Number(row.upcoming) || 0,
    due_today: Number(row.due_today) || 0,
    due_next7: Number(row.due_next7) || 0,
    retention_rate: row.retention_rate !== null ? Number(row.retention_rate) : 0,
    last_review: row.last_review || undefined
  };
}

export async function getUserSettings(userId: string): Promise<SrsUserSettings> {
  const { rows } = await query<SrsUserSettings>(
    `
      SELECT * FROM srs_user_settings WHERE user_id = $1 LIMIT 1
    `,
    [userId]
  );

  if (rows[0]) {
    return rows[0];
  }

  return {
    user_id: userId,
    created_at: new Date(),
    updated_at: new Date(),
    ...DEFAULT_SETTINGS,
  };
}

export async function upsertUserSettings(
  userId: string,
  partial: Partial<Omit<SrsUserSettings, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<SrsUserSettings> {
  const existing = await getUserSettings(userId);
  const next = {
    ...existing,
    ...partial,
    user_id: userId,
  };

  const { rows } = await query<SrsUserSettings>(
    `
      INSERT INTO srs_user_settings (user_id, memory_strength, learning_style, max_new_cards_per_day, base_interval_days, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET memory_strength = EXCLUDED.memory_strength,
            learning_style = EXCLUDED.learning_style,
            max_new_cards_per_day = EXCLUDED.max_new_cards_per_day,
            base_interval_days = EXCLUDED.base_interval_days,
            updated_at = NOW()
      RETURNING *
    `,
    [
      userId,
      next.memory_strength,
      next.learning_style,
      next.max_new_cards_per_day,
      next.base_interval_days,
    ]
  );

  await invalidateCache(userId);
  return rows[0];
}

export async function invalidateCache(userId: string) {
  await cacheDelPattern(`srs:queue:${userId}:*`);
  await cacheDelPattern(`srs:summary:${userId}*`);
}

export async function listRecentReviews(
  userId: string,
  limit: number = 20
): Promise<SrsReview[]> {
  const { rows } = await query<SrsReview>(
    `
      SELECT *
      FROM srs_reviews
      WHERE user_id = $1
      ORDER BY reviewed_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );
  return rows;
}
