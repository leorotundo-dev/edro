/**
 * Redis Cache Service
 * Ativa cache real quando REDIS_URL estiver configurada.
 * Mantém fallback no-op para ambientes sem Redis.
 */

import Redis from 'ioredis';

const DEFAULT_TTL = 300; // 5 minutos

const redisUrl =
  process.env.REDIS_URL ||
  (process.env.REDIS_PASSWORD
    ? `redis://:${process.env.REDIS_PASSWORD}@localhost:${process.env.REDIS_PORT || 6379}`
    : 'redis://localhost:6379');

const redisEnabled = process.env.DISABLE_REDIS !== 'true';

let redis: Redis | null = null;
let redisHealthy = false;

// ============================================
// REDIS CLIENT
// ============================================

export function getRedisClient(): Redis | null {
  if (!redisEnabled) {
    return null;
  }

  if (redis) {
    return redis;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on('connect', () => {
      redisHealthy = true;
      console.log('[redis] Connected to Redis');
    });

    redis.on('error', (err) => {
      redisHealthy = false;
      console.error('[redis] Redis error:', err.message);
    });
  } catch (err) {
    console.warn('[redis] Failed to init Redis, using no-op fallback');
    redisHealthy = false;
    redis = null;
  }

  return redis;
}

// ============================================
// CACHE OPERATIONS (com fallback)
// ============================================

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (err) {
    console.error('[redis] Get error:', err);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: any,
  ttl: number = DEFAULT_TTL
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttl, serialized);
    return true;
  } catch (err) {
    console.error('[redis] Set error:', err);
    return false;
  }
}

export async function cacheDel(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (err) {
    console.error('[redis] Delete error:', err);
    return false;
  }
}

export async function cacheDelPattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;

    await client.del(...keys);
    return keys.length;
  } catch (err) {
    console.error('[redis] Delete pattern error:', err);
    return 0;
  }
}

// ============================================
// CACHE DECORATORS
// ============================================

export function withRedisCache(ttl: number = DEFAULT_TTL) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `cache:${propertyKey}:${JSON.stringify(args)}`;

      const cached = await cacheGet(key);
      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await cacheSet(key, result, ttl);

      return result;
    };

    return descriptor;
  };
}

// ============================================
// STATS
// ============================================

export async function getRedisStats(): Promise<{
  connected: boolean;
  keys: number;
  memory_mb: number;
  maxmemory_mb: number;
  uptime_seconds: number;
}> {
  const client = getRedisClient();
  if (!client) {
    return {
      connected: false,
      keys: 0,
      memory_mb: 0,
      maxmemory_mb: 0,
      uptime_seconds: 0,
    };
  }

  try {
    const [info, dbsize] = await Promise.all([client.info(), client.dbsize()]);

    const memoryMatch = info.match(/used_memory:(\d+)/);
    const maxMemoryMatch = info.match(/maxmemory:(\d+)/);
    const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);

    return {
      connected: redisHealthy,
      keys: dbsize,
      memory_mb: memoryMatch ? Math.round(Number(memoryMatch[1]) / 1024 / 1024) : 0,
      maxmemory_mb: maxMemoryMatch ? Math.round(Number(maxMemoryMatch[1]) / 1024 / 1024) : 0,
      uptime_seconds: uptimeMatch ? Number(uptimeMatch[1]) : 0,
    };
  } catch (err) {
    console.error('[redis] Stats error:', err);
    return {
      connected: false,
      keys: 0,
      memory_mb: 0,
      maxmemory_mb: 0,
      uptime_seconds: 0,
    };
  }
}

export const RedisCache = {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  delPattern: cacheDelPattern,
  getStats: getRedisStats,
  withCache: withRedisCache,
  getClient: getRedisClient,
};

export default RedisCache;
