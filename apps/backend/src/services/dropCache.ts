import { query } from '../db/db';
import { makeDropCacheKey } from '../utils/hash';

interface DropCacheRow {
  id: number;
  cache_key: string;
  blueprint_id: number;
  topic_code: string;
  payload: any;
  created_at: string;
}

export async function getDropCache(
  blueprintId: number,
  topicCode: string
): Promise<DropCacheRow | null> {
  const cacheKey = makeDropCacheKey(blueprintId, topicCode);

  const { rows } = await query<DropCacheRow>(
    `
    SELECT id, cache_key, blueprint_id, topic_code, payload, created_at
    FROM drop_cache
    WHERE cache_key = $1
    LIMIT 1
    `,
    [cacheKey]
  );

  return rows[0] ?? null;
}

export async function saveDropCache(
  blueprintId: number,
  topicCode: string,
  payload: any
): Promise<void> {
  const cacheKey = makeDropCacheKey(blueprintId, topicCode);

  await query(
    `
    INSERT INTO drop_cache (cache_key, blueprint_id, topic_code, payload)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (cache_key)
    DO UPDATE SET payload = EXCLUDED.payload
    `,
    [cacheKey, blueprintId, topicCode, payload]
  );
}
