import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;
export const redis = createClient({ url: redisUrl });

export async function initRedis() {
  if (!redisUrl) {
    return;
  }
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function cacheGetJSON<T>(key: string): Promise<T | null> {
  if (!redis.isOpen) return null;
  const value = await redis.get(key);
  return value ? (JSON.parse(value) as T) : null;
}

export async function cacheSetJSON(key: string, value: any, ttlSeconds: number) {
  if (!redis.isOpen) return;
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

export function cacheKey(parts: Record<string, any>) {
  const normalized = Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : String(value ?? '')}`)
    .join('|');
  return normalized;
}
