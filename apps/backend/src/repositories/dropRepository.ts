import { query } from '../db';

export interface Drop {
  id: string;
  discipline_id: string;
  title: string;
  content: string;
  difficulty: number;
  topic_code?: string | null;
  drop_type?: string | null;
  drop_text?: string | null;
  blueprint_id?: number | null;
  status?: 'draft' | 'published' | 'archived' | string;
  origin?: string | null;
  origin_user_id?: string | null;
  origin_meta?: any;
  approved_by?: string | null;
  approved_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDropInput {
  discipline_id: string;
  title: string;
  content: string;
  difficulty?: number;
  topic_code?: string | null;
  drop_type?: string | null;
  drop_text?: string | null;
  blueprint_id?: number | null;
  status?: 'draft' | 'published' | 'archived';
  origin?: string;
  origin_user_id?: string | null;
  origin_meta?: any;
}

export async function listDrops(
  params?: string | { disciplineId?: string; status?: string; origin?: string }
): Promise<Drop[]> {
  const filters =
    typeof params === 'string'
      ? { disciplineId: params }
      : (params ?? {});

  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (filters.disciplineId) {
    values.push(filters.disciplineId);
    conditions.push(`discipline_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }

  if (filters.origin) {
    values.push(filters.origin);
    conditions.push(`origin = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query<Drop>(
    `SELECT * FROM drops ${whereClause} ORDER BY created_at ASC`,
    values
  );
  return rows;
}

export async function createDrop(input: CreateDropInput): Promise<Drop> {
  const difficulty = input.difficulty ?? 1;
  const status = input.status ?? 'published';
  const origin = input.origin ?? 'manual';
  const originUserId = input.origin_user_id ?? null;
  const originMeta = input.origin_meta ?? {};

  const { rows } = await query<Drop>(
    `
      INSERT INTO drops (
        discipline_id, title, content, difficulty, status, origin, origin_user_id, origin_meta,
        topic_code, drop_type, drop_text, blueprint_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `,
    [
      input.discipline_id,
      input.title,
      input.content,
      difficulty,
      status,
      origin,
      originUserId,
      JSON.stringify(originMeta),
      input.topic_code ?? null,
      input.drop_type ?? null,
      input.drop_text ?? null,
      input.blueprint_id ?? null,
    ]
  );
  return rows[0];
}

export async function findDropByOriginQuestion(questionId: string): Promise<Drop | null> {
  const { rows } = await query<Drop>(
    `
      SELECT *
      FROM drops
      WHERE origin = 'question'
        AND origin_meta->>'question_id' = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [questionId]
  );
  return rows[0] ?? null;
}

export async function findDropForTopic(params: {
  topicCode: string;
  disciplineId?: string | null;
}): Promise<Drop | null> {
  if (!params.topicCode) return null;

  const values: Array<string> = [params.topicCode];
  let sql = `
    SELECT *
    FROM drops
    WHERE topic_code = $1
  `;

  if (params.disciplineId) {
    values.push(params.disciplineId);
    sql += ` AND discipline_id = $2`;
  }

  sql += `
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const { rows } = await query<Drop>(sql, values);
  if (rows[0]) return rows[0];

  const { rows: fallbackRows } = await query<Drop>(
    `
      SELECT *
      FROM drops
      WHERE LOWER(title) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [params.topicCode]
  );

  return fallbackRows[0] ?? null;
}

export async function findDropById(id: string | number): Promise<Drop | null> {
  const { rows } = await query<Drop>(
    `
      SELECT
        id,
        discipline_id,
        title,
        content,
        difficulty,
        status,
        origin,
        origin_user_id,
        origin_meta,
        approved_by,
        approved_at,
        blueprint_id,
        topic_code,
        drop_type,
        drop_text,
        created_at,
        updated_at
      FROM drops
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );
  return rows[0] || null;
}

export async function updateDropStatus(params: {
  id: string;
  status: 'draft' | 'published' | 'archived';
  approvedBy?: string | null;
}): Promise<Drop | null> {
  const { rows } = await query<Drop>(
    `
      UPDATE drops
      SET status = $2::varchar,
          approved_by = CASE WHEN $2::varchar = 'published' THEN $3 ELSE approved_by END,
          approved_at = CASE WHEN $2::varchar = 'published' THEN NOW() ELSE approved_at END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [params.id, params.status, params.approvedBy ?? null]
  );
  return rows[0] || null;
}
