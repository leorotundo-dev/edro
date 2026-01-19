/**
 * Cache Middleware
 * 
 * Sistema de cache para otimização de performance
 */

import { FastifyRequest, FastifyReply } from 'fastify';

// ============================================
// IN-MEMORY CACHE
// ============================================

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 1000;

/**
 * Gera chave de cache baseado na request
 */
function generateCacheKey(request: FastifyRequest): string {
  const url = request.url;
  const method = request.method;
  const userId = (request.user as any)?.id || 'anonymous';
  
  return `${method}:${url}:${userId}`;
}

/**
 * Middleware de cache
 */
export function cacheMiddleware(ttlSeconds: number = 300) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Apenas GET requests
    if (request.method !== 'GET') {
      return;
    }

    const key = generateCacheKey(request);
    const cached = cache.get(key);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      
      if (age < cached.ttl) {
        // Cache hit
        reply.header('X-Cache', 'HIT');
        reply.header('X-Cache-Age', Math.floor(age / 1000).toString());
        reply.send(cached.data);
        return;
      } else {
        // Cache expired
        cache.delete(key);
      }
    }

    // Cache miss - interceptar resposta
    reply.header('X-Cache', 'MISS');

    const originalSend = reply.send.bind(reply);
    reply.send = (payload?: any) => {
      if (reply.statusCode === 200) {
        setCacheEntry(key, payload, ttlSeconds * 1000);
      }
      return originalSend(payload);
    };
  };
}

/**
 * Salva entrada no cache
 */
function setCacheEntry(key: string, data: any, ttl: number) {
  // Limitar tamanho do cache
  if (cache.size >= MAX_CACHE_SIZE) {
    // Remover entrada mais antiga
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Limpa cache
 */
export function clearCache(pattern?: string) {
  if (pattern) {
    // Limpar por padrão
    const regex = new RegExp(pattern);
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
  } else {
    // Limpar tudo
    cache.clear();
  }
}

/**
 * Estatísticas de cache
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  hitRate: number;
  entries: Array<{ key: string; age: number; ttl: number }>;
} {
  const entries = Array.from(cache.entries()).map(([key, entry]) => ({
    key,
    age: Date.now() - entry.timestamp,
    ttl: entry.ttl,
  }));

  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    hitRate: 0, // TODO: Track hits/misses
    entries: entries.slice(0, 10), // Top 10
  };
}

// ============================================
// RESPONSE CACHE DECORATOR
// ============================================

export function withCache(ttlSeconds: number = 300) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const request = args[0] as FastifyRequest;
      const key = generateCacheKey(request);
      
      const cached = cache.get(key);
      if (cached && (Date.now() - cached.timestamp < cached.ttl)) {
        return cached.data;
      }

      const result = await originalMethod.apply(this, args);
      
      setCacheEntry(key, result, ttlSeconds * 1000);
      
      return result;
    };

    return descriptor;
  };
}

// ============================================
// CACHE WARMING
// ============================================

let warmingInterval: NodeJS.Timeout | null = null;

export function startCacheWarming(endpoints: string[], intervalMinutes: number = 60) {
  if (warmingInterval) return;

  console.log('[cache] 🔥 Starting cache warming...');

  const intervalMs = intervalMinutes * 60 * 1000;

  warmingInterval = setInterval(() => {
    console.log('[cache] Warming cache...');
    // TODO: Pre-fetch common endpoints
  }, intervalMs);
}

export function stopCacheWarming() {
  if (warmingInterval) {
    clearInterval(warmingInterval);
    warmingInterval = null;
  }
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const CacheService = {
  middleware: cacheMiddleware,
  clearCache,
  getCacheStats,
  withCache,
  startCacheWarming,
  stopCacheWarming,
};

export default CacheService;
