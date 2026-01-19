/**
 * APM (Application Performance Monitoring) Service
 * Advanced monitoring and tracing
 */

import { FastifyRequest, FastifyReply } from 'fastify';

// ============================================
// TRACING
// ============================================

interface Trace {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  spans: Span[];
}

interface Span {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
}

const activeTraces = new Map<string, Trace>();
const completedTraces: Trace[] = [];
const MAX_TRACES = 1000;

export function startTrace(name: string, tags: Record<string, any> = {}): string {
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const trace: Trace = {
    id: traceId,
    name,
    startTime: Date.now(),
    tags,
    spans: [],
  };
  
  activeTraces.set(traceId, trace);
  
  return traceId;
}

export function addSpan(
  traceId: string,
  spanName: string,
  tags: Record<string, any> = {}
): string {
  const trace = activeTraces.get(traceId);
  if (!trace) return '';
  
  const spanId = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const span: Span = {
    id: spanId,
    name: spanName,
    startTime: Date.now(),
    tags,
  };
  
  trace.spans.push(span);
  
  return spanId;
}

export function endSpan(traceId: string, spanId: string) {
  const trace = activeTraces.get(traceId);
  if (!trace) return;
  
  const span = trace.spans.find(s => s.id === spanId);
  if (!span) return;
  
  span.endTime = Date.now();
  span.duration = span.endTime - span.startTime;
}

export function endTrace(traceId: string) {
  const trace = activeTraces.get(traceId);
  if (!trace) return;
  
  trace.endTime = Date.now();
  trace.duration = trace.endTime - trace.startTime;
  
  // Move to completed
  completedTraces.push(trace);
  activeTraces.delete(traceId);
  
  // Limit size
  if (completedTraces.length > MAX_TRACES) {
    completedTraces.shift();
  }
}

export function getTraces(limit: number = 100): Trace[] {
  return completedTraces.slice(-limit).reverse();
}

export function getTrace(traceId: string): Trace | undefined {
  return activeTraces.get(traceId) || completedTraces.find(t => t.id === traceId);
}

// ============================================
// APM METRICS
// ============================================

interface APMMetrics {
  requests: {
    total: number;
    success: number;
    error: number;
    avgDuration: number;
  };
  database: {
    queries: number;
    avgDuration: number;
    slowQueries: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  errors: {
    total: number;
    rate: number;
    topErrors: Array<{ message: string; count: number }>;
  };
}

let apmMetrics: APMMetrics = {
  requests: { total: 0, success: 0, error: 0, avgDuration: 0 },
  database: { queries: 0, avgDuration: 0, slowQueries: 0 },
  cache: { hits: 0, misses: 0, hitRate: 0 },
  errors: { total: 0, rate: 0, topErrors: [] },
};

const requestDurations: number[] = [];
const dbQueryDurations: number[] = [];
const errorCounts = new Map<string, number>();

export function recordRequest(duration: number, success: boolean) {
  apmMetrics.requests.total++;
  
  if (success) {
    apmMetrics.requests.success++;
  } else {
    apmMetrics.requests.error++;
  }
  
  requestDurations.push(duration);
  if (requestDurations.length > 1000) requestDurations.shift();
  
  const sum = requestDurations.reduce((a, b) => a + b, 0);
  apmMetrics.requests.avgDuration = Math.round(sum / requestDurations.length);
}

export function recordDbQuery(duration: number) {
  apmMetrics.database.queries++;
  
  if (duration > 1000) {
    apmMetrics.database.slowQueries++;
  }
  
  dbQueryDurations.push(duration);
  if (dbQueryDurations.length > 1000) dbQueryDurations.shift();
  
  const sum = dbQueryDurations.reduce((a, b) => a + b, 0);
  apmMetrics.database.avgDuration = Math.round(sum / dbQueryDurations.length);
}

export function recordCacheHit(hit: boolean) {
  if (hit) {
    apmMetrics.cache.hits++;
  } else {
    apmMetrics.cache.misses++;
  }
  
  const total = apmMetrics.cache.hits + apmMetrics.cache.misses;
  apmMetrics.cache.hitRate = total > 0 
    ? Math.round((apmMetrics.cache.hits / total) * 100) 
    : 0;
}

export function recordError(error: string) {
  apmMetrics.errors.total++;
  
  const count = errorCounts.get(error) || 0;
  errorCounts.set(error, count + 1);
  
  apmMetrics.errors.rate = apmMetrics.requests.total > 0
    ? Math.round((apmMetrics.errors.total / apmMetrics.requests.total) * 100)
    : 0;
  
  // Update top errors
  apmMetrics.errors.topErrors = Array.from(errorCounts.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function getAPMMetrics(): APMMetrics {
  return { ...apmMetrics };
}

export function resetAPMMetrics() {
  apmMetrics = {
    requests: { total: 0, success: 0, error: 0, avgDuration: 0 },
    database: { queries: 0, avgDuration: 0, slowQueries: 0 },
    cache: { hits: 0, misses: 0, hitRate: 0 },
    errors: { total: 0, rate: 0, topErrors: [] },
  };
  requestDurations.length = 0;
  dbQueryDurations.length = 0;
  errorCounts.clear();
}

// ============================================
// MIDDLEWARE
// ============================================

export function apmMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = startTrace(`${request.method} ${request.url}`, {
      method: request.method,
      url: request.url,
      ip: request.ip,
    });
    
    const startTime = Date.now();
    
    // Store traceId in request
    (request as any).traceId = traceId;
    
    reply.raw.once('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = reply.raw.statusCode;
      const success = statusCode < 400;

      recordRequest(duration, success);

      if (!success) {
        recordError(`${statusCode} ${request.url}`);
      }

      endTrace(traceId);
    });
  };
}

// ============================================
// HEALTH SCORE
// ============================================

export function calculateHealthScore(): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: Record<string, number>;
} {
  const factors: Record<string, number> = {};
  
  // Response time (max 30 points)
  const avgDuration = apmMetrics.requests.avgDuration;
  if (avgDuration < 100) factors.responseTime = 30;
  else if (avgDuration < 300) factors.responseTime = 20;
  else if (avgDuration < 1000) factors.responseTime = 10;
  else factors.responseTime = 0;
  
  // Error rate (max 25 points)
  const errorRate = apmMetrics.errors.rate;
  if (errorRate < 1) factors.errorRate = 25;
  else if (errorRate < 5) factors.errorRate = 15;
  else if (errorRate < 10) factors.errorRate = 5;
  else factors.errorRate = 0;
  
  // Cache hit rate (max 20 points)
  const cacheHitRate = apmMetrics.cache.hitRate;
  if (cacheHitRate > 80) factors.cacheHitRate = 20;
  else if (cacheHitRate > 60) factors.cacheHitRate = 15;
  else if (cacheHitRate > 40) factors.cacheHitRate = 10;
  else factors.cacheHitRate = 5;
  
  // Database performance (max 25 points)
  const dbAvgDuration = apmMetrics.database.avgDuration;
  if (dbAvgDuration < 50) factors.dbPerformance = 25;
  else if (dbAvgDuration < 150) factors.dbPerformance = 15;
  else if (dbAvgDuration < 500) factors.dbPerformance = 10;
  else factors.dbPerformance = 0;
  
  const score = Object.values(factors).reduce((a, b) => a + b, 0);
  
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 50) grade = 'D';
  else grade = 'F';
  
  return { score, grade, factors };
}

// ============================================
// EXPORTS
// ============================================

export const APMService = {
  startTrace,
  addSpan,
  endSpan,
  endTrace,
  getTraces,
  getTrace,
  recordRequest,
  recordDbQuery,
  recordCacheHit,
  recordError,
  getAPMMetrics,
  resetAPMMetrics,
  apmMiddleware,
  calculateHealthScore,
};

export default APMService;
