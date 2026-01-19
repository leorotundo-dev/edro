/**
 * Redis Cache Service - DISABLED VERSION
 * Fallback when Redis is not available
 */

// ============================================
// CACHE OPERATIONS (NO-OP)
// ============================================

export function getRedisClient(): null {
  return null;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  // No cache available
  return null;
}

export async function cacheSet(
  key: string,
  value: any,
  ttl: number = 300
): Promise<boolean> {
  // No cache available
  return false;
}

export async function cacheDel(key: string): Promise<boolean> {
  return false;
}

export async function cacheDelPattern(pattern: string): Promise<number> {
  return 0;
}

// ============================================
// CACHE DECORATORS (NO-OP)
// ============================================

export function withRedisCache(ttl: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // Just return the original method without caching
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
  uptime_seconds: number;
}> {
  return {
    connected: false,
    keys: 0,
    memory_mb: 0,
    uptime_seconds: 0,
  };
}

export const RedisCache = {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  delPattern: cacheDelPattern,
  getStats: getRedisStats,
  withCache: withRedisCache,
};

export default RedisCache;

console.log('[redis] ⚠️  Redis Cache DISABLED - using no-op fallback');
