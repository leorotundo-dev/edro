/**
 * Performance Middleware
 * 
 * Otimizações de performance para APIs
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { promisify } from 'util';
import { gzip } from 'zlib';

const gzipAsync = promisify(gzip);

// ============================================
// COMPRESSION
// ============================================

/**
 * Middleware de compressão (desabilitado - usar @fastify/compress)
 */
export async function compressionMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Compressão é feita pelo plugin @fastify/compress
  // Este middleware está aqui apenas para compatibilidade
  return;
}

// ============================================
// RESPONSE TIME
// ============================================

/**
 * Adiciona header X-Response-Time
 */
export async function responseTimeMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const start = Date.now();
  
  // Usar reply.raw para compatibilidade
  const originalEnd = reply.raw.end;
  reply.raw.end = function(...args: any[]) {
    const duration = Date.now() - start;
    reply.header('X-Response-Time', `${duration}ms`);
    return originalEnd.apply(this, args);
  };
}

// ============================================
// REQUEST SIZE LIMIT
// ============================================

const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Limita tamanho de requests
 */
export async function requestSizeLimiter(request: FastifyRequest, reply: FastifyReply) {
  const contentLength = parseInt(request.headers['content-length'] || '0');

  if (contentLength > MAX_REQUEST_SIZE) {
    return reply.status(413).send({
      success: false,
      error: 'Request too large',
      max_size: `${MAX_REQUEST_SIZE / 1024 / 1024}MB`,
    });
  }
}

// ============================================
// PAGINATION HELPER
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function extractPaginationParams(query: any): PaginationParams {
  const page = parseInt(query.page || '1');
  const limit = Math.min(parseInt(query.limit || '50'), 100); // Max 100
  const offset = (page - 1) * limit;

  return {
    page: Math.max(1, page),
    limit: Math.max(1, limit),
    offset: Math.max(0, offset),
  };
}

export function createPaginationResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
) {
  const totalPages = Math.ceil(total / params.limit);

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

// ============================================
// PERFORMANCE METRICS
// ============================================

interface PerformanceMetric {
  endpoint: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  calls: number;
}

const performanceMetrics = new Map<string, number[]>();

/**
 * Registra métrica de performance
 */
export function recordPerformance(endpoint: string, durationMs: number) {
  const metrics = performanceMetrics.get(endpoint) || [];
  metrics.push(durationMs);

  // Manter apenas últimas 100 métricas
  if (metrics.length > 100) {
    metrics.shift();
  }

  performanceMetrics.set(endpoint, metrics);
}

/**
 * Obtém métricas de performance
 */
export function getPerformanceMetrics(): PerformanceMetric[] {
  const results: PerformanceMetric[] = [];

  for (const [endpoint, times] of performanceMetrics.entries()) {
    if (times.length === 0) continue;

    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    results.push({
      endpoint,
      avgTime: Math.round(avg),
      minTime: Math.round(min),
      maxTime: Math.round(max),
      calls: times.length,
    });
  }

  return results.sort((a, b) => b.avgTime - a.avgTime);
}

// ============================================
// POOL STATS
// ============================================

export interface PoolStats {
  total: number;
  idle: number;
  active: number;
  waiting: number;
}

export async function getPoolStats(): Promise<PoolStats> {
  return {
    total: 20,
    idle: 15,
    active: 5,
    waiting: 0,
  };
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const PerformanceService = {
  compressionMiddleware,
  responseTimeMiddleware,
  requestSizeLimiter,
  extractPaginationParams,
  createPaginationResponse,
  recordPerformance,
  getPerformanceMetrics,
  getPoolStats,
};

export default PerformanceService;
