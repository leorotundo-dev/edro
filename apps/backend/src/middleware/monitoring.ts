/**
 * Monitoring Middleware
 * 
 * Sistema de monitoramento e métricas
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db';
import { getRedisStats } from '../services/redisCache';
import { enqueueAiUsage } from '../services/ai/aiUsageStore';
import { estimateAiCostUsd } from '../services/ai/aiPricing';
import QueueService from '../services/queueService';
import { AlertService } from '../services/alertService';
import { RequestContextService } from '../services/requestContext';

// ============================================
// REQUEST TRACKING
// ============================================

export interface RequestMetrics {
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ip?: string;
}

const requestMetrics: RequestMetrics[] = [];
const MAX_METRICS = 10000; // Manter últimas 10k requests

// ============================================
// IA USAGE
// ============================================

interface IaUsage {
  totalCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  byModel: Record<string, { calls: number; tokens: number }>;
}

const iaUsage: IaUsage = {
  totalCalls: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  byModel: {},
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value?: string | null): string | null {
  if (!value) return null;
  return UUID_REGEX.test(value) ? value : null;
}

// ============================================
// RECCO METRICS
// ============================================

interface ReccoMetrics {
  runs: number;
  avg_ms: number;
  last_ms: number;
  last_status: 'ok' | 'error';
  last_error?: string;
  last_generated_at?: Date;
  last_items?: number;
  last_srs_backlog?: number;
}

const reccoMetrics: ReccoMetrics = {
  runs: 0,
  avg_ms: 0,
  last_ms: 0,
  last_status: 'ok',
};

interface SimuladoMetrics {
  runs: number;
  completed: number;
  avg_accuracy: number;
  avg_time_seconds: number;
  last_mode?: string;
  last_accuracy?: number;
  last_time?: number;
  transitions: {
    up: number;
    down: number;
    stable: number;
  };
}

const simuladoMetrics: SimuladoMetrics = {
  runs: 0,
  completed: 0,
  avg_accuracy: 0,
  avg_time_seconds: 0,
  transitions: { up: 0, down: 0, stable: 0 },
};

interface TutorMetrics {
  calls: number;
  rag_calls: number;
  rag_rate: number;
  avg_latency_ms: number;
  last_latency_ms: number;
  last_model?: string;
  last_rag_used?: boolean;
}

const tutorMetrics: TutorMetrics = {
  calls: 0,
  rag_calls: 0,
  rag_rate: 0,
  avg_latency_ms: 0,
  last_latency_ms: 0,
};

const customMetrics: Record<string, number> = {};

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const monitorThresholds = {
  errors5xx: toNumber(process.env.MONITOR_ERRORS_5XX_THRESHOLD, 10),
  slowRequests: toNumber(process.env.MONITOR_SLOW_REQUESTS_THRESHOLD, 20),
  errorsHourly: toNumber(process.env.MONITOR_ERRORS_HOURLY_THRESHOLD, 50),
  ragRateMin: clamp01(toNumber(process.env.MONITOR_RAG_RATE_MIN, 0.2)),
};

// Histórico leve das últimas decisões do Recco
interface ReccoDecisionSnapshot {
  userId: string;
  generated_at: Date;
  duration_ms: number;
  items: number;
  srs_backlog?: number;
  priorities_sample?: any[];
  sequencing_sample?: any[];
  diagnosis?: any;
}

const reccoDecisions: ReccoDecisionSnapshot[] = [];
const MAX_RECCO_DECISIONS = 50;

export function trackMetric(name: string, value: number = 1, metadata?: Record<string, any>) {
  customMetrics[name] = (customMetrics[name] || 0) + value;
  if (metadata) {
    // Placeholder for future structured metric storage.
  }
}

export function trackIaUsage(params: {
  model?: string;
  type: 'completion' | 'embedding';
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  promptType?: string;
  latencyMs?: number;
}) {
  const promptTokens = params.promptTokens || 0;
  const completionTokens = params.completionTokens || 0;
  const totalTokens =
    params.totalTokens ||
    (params.completionTokens !== undefined
      ? promptTokens + completionTokens
      : Math.max(promptTokens, completionTokens));

  iaUsage.totalCalls += 1;
  iaUsage.promptTokens += promptTokens;
  iaUsage.completionTokens += completionTokens;
  iaUsage.totalTokens += totalTokens;

  if (params.model) {
    const entry = iaUsage.byModel[params.model] || { calls: 0, tokens: 0 };
    entry.calls += 1;
    entry.tokens += totalTokens;
    iaUsage.byModel[params.model] = entry;
  }

  enqueueAiUsage({
    model: params.model || 'unknown',
    promptTokens,
    completionTokens,
    totalTokens,
    calls: 1,
  });

  const context = RequestContextService.getRequestContext();
  const userId = normalizeUuid(context.userId || null);
  const costUsd = estimateAiCostUsd({
    model: params.model,
    type: params.type,
    promptTokens,
    completionTokens,
    totalTokens,
  });
  const logContext = {
    plan: context.plan || null,
    path: context.path || null,
    method: context.method || null,
    requestId: context.requestId || null,
  };

  void query(
    `
      INSERT INTO logs_ia (
        model, provider, prompt_type, input_tokens, output_tokens, total_tokens,
        cost_usd, latency_ms, user_id, context, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `,
    [
      params.model || 'unknown',
      'openai',
      params.promptType || params.type,
      promptTokens,
      completionTokens,
      totalTokens,
      Math.round(costUsd * 1_000_000) / 1_000_000,
      params.latencyMs ?? null,
      userId,
      JSON.stringify(logContext),
    ]
  ).catch((err) => {
    console.warn('[monitoring] Failed to persist IA log.', err);
  });
}

export function getIaUsage() {
  return iaUsage;
}

export function trackReccoRun(params: {
  durationMs: number;
  items: number;
  status: 'ok' | 'error';
  errorMessage?: string;
  srsBacklog?: number;
  userId?: string;
  diagnosis?: any;
  prioritiesSample?: any[];
  sequencingSample?: any[];
}) {
  const prevTotal = reccoMetrics.avg_ms * reccoMetrics.runs;
  const newRuns = reccoMetrics.runs + 1;
  const newAvg = (prevTotal + params.durationMs) / newRuns;

  reccoMetrics.runs = newRuns;
  reccoMetrics.avg_ms = newAvg;
  reccoMetrics.last_ms = params.durationMs;
  reccoMetrics.last_status = params.status;
  reccoMetrics.last_error = params.errorMessage;
  reccoMetrics.last_items = params.items;
  reccoMetrics.last_srs_backlog = params.srsBacklog;
  reccoMetrics.last_generated_at = new Date();

  if (params.status === 'ok') {
    reccoDecisions.push({
      userId: params.userId || 'unknown',
      generated_at: new Date(),
      duration_ms: params.durationMs,
      items: params.items,
      srs_backlog: params.srsBacklog,
      priorities_sample: params.prioritiesSample,
      sequencing_sample: params.sequencingSample,
      diagnosis: params.diagnosis,
    });
    if (reccoDecisions.length > MAX_RECCO_DECISIONS) {
      reccoDecisions.shift();
    }
  }
}

export function getReccoMetrics() {
  return reccoMetrics;
}

export function getReccoDecisionHistory(limit: number = 20) {
  return reccoDecisions.slice(-limit).reverse();
}

export function trackSimulado(params: {
  accuracy: number;
  totalTimeSeconds: number;
  mode?: string;
  completed?: boolean;
  transition?: 'up' | 'down' | 'stable';
}) {
  const prevTotalAcc = simuladoMetrics.avg_accuracy * simuladoMetrics.runs;
  const prevTotalTime = simuladoMetrics.avg_time_seconds * simuladoMetrics.runs;
  const newRuns = simuladoMetrics.runs + 1;

  simuladoMetrics.runs = newRuns;
  simuladoMetrics.completed += params.completed === false ? 0 : 1;
  simuladoMetrics.avg_accuracy = (prevTotalAcc + params.accuracy) / newRuns;
  simuladoMetrics.avg_time_seconds = (prevTotalTime + params.totalTimeSeconds) / newRuns;
  simuladoMetrics.last_mode = params.mode;
  simuladoMetrics.last_accuracy = params.accuracy;
  simuladoMetrics.last_time = params.totalTimeSeconds;
  if (params.transition) {
    simuladoMetrics.transitions[params.transition] =
      (simuladoMetrics.transitions[params.transition] || 0) + 1;
  }
}

export function getSimuladoMetrics() {
  return simuladoMetrics;
}

export function trackTutorCall(params: { latencyMs: number; model?: string; ragUsed?: boolean }) {
  const prevTotal = tutorMetrics.avg_latency_ms * tutorMetrics.calls;
  const newCalls = tutorMetrics.calls + 1;
  const ragCalls = tutorMetrics.rag_calls + (params.ragUsed ? 1 : 0);

  tutorMetrics.calls = newCalls;
  tutorMetrics.avg_latency_ms = (prevTotal + params.latencyMs) / newCalls;
  tutorMetrics.last_latency_ms = params.latencyMs;
  tutorMetrics.last_model = params.model;
  tutorMetrics.last_rag_used = params.ragUsed;
  tutorMetrics.rag_calls = ragCalls;
  tutorMetrics.rag_rate = newCalls > 0 ? ragCalls / newCalls : 0;
}

export function getTutorMetrics() {
  return tutorMetrics;
}

/**
 * Middleware de tracking de requests
 */
export async function requestTracker(request: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now();
  // Usa evento de finalização do response para calcular duração
  reply.raw.once('finish', () => {
    const duration = Date.now() - startTime;

    const metrics: RequestMetrics = {
      path: request.url,
      method: request.method,
      statusCode: reply.raw.statusCode,
      duration,
      timestamp: new Date(),
      userId: (request.user as any)?.id,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    };

    requestMetrics.push(metrics);
    if (requestMetrics.length > MAX_METRICS) {
      requestMetrics.shift();
    }

    if (duration > 1000) {
      console.warn(`[monitoring] Slow request: ${request.method} ${request.url} - ${duration}ms`);
    }

    if (reply.raw.statusCode >= 500) {
      console.error(`[monitoring] Server error: ${request.method} ${request.url} - ${reply.raw.statusCode}`);
    }
  });
}

// ============================================
// METRICS AGGREGATION
// ============================================

export function getRequestMetrics(): {
  total: number;
  last_hour: number;
  avg_duration: number;
  errors_5xx: number;
  errors_4xx: number;
  slow_requests: number;
  by_endpoint: Record<string, number>;
  by_status: Record<number, number>;
} {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  const lastHour = requestMetrics.filter(m => m.timestamp.getTime() > oneHourAgo);

  const totalDuration = requestMetrics.reduce((sum, m) => sum + m.duration, 0);
  const avgDuration = requestMetrics.length > 0 ? totalDuration / requestMetrics.length : 0;

  const errors5xx = requestMetrics.filter(m => m.statusCode >= 500).length;
  const errors4xx = requestMetrics.filter(m => m.statusCode >= 400 && m.statusCode < 500).length;
  const slowRequests = requestMetrics.filter(m => m.duration > 1000).length;

  // Agrupar por endpoint
  const byEndpoint: Record<string, number> = {};
  requestMetrics.forEach(m => {
    byEndpoint[m.path] = (byEndpoint[m.path] || 0) + 1;
  });

  // Agrupar por status
  const byStatus: Record<number, number> = {};
  requestMetrics.forEach(m => {
    byStatus[m.statusCode] = (byStatus[m.statusCode] || 0) + 1;
  });

  return {
    total: requestMetrics.length,
    last_hour: lastHour.length,
    avg_duration: avgDuration,
    errors_5xx: errors5xx,
    errors_4xx: errors4xx,
    slow_requests: slowRequests,
    by_endpoint: byEndpoint,
    by_status: byStatus,
  };
}

// ============================================
// SYSTEM METRICS
// ============================================

export function getSystemMetrics(): {
  uptime: number;
  memory: {
    used_mb: number;
    total_mb: number;
    usage_percent: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  process: {
    pid: number;
    node_version: string;
    platform: string;
  };
} {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();

  return {
    uptime: process.uptime(),
    memory: {
      used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      usage_percent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
    },
    cpu: {
      user: cpu.user,
      system: cpu.system,
    },
    process: {
      pid: process.pid,
      node_version: process.version,
      platform: process.platform,
    },
  };
}

// ============================================
// ERROR TRACKING
// ============================================

interface ErrorLog {
  message: string;
  stack?: string;
  statusCode: number;
  path: string;
  method: string;
  timestamp: Date;
  userId?: string;
}

const errorLogs: ErrorLog[] = [];
const MAX_ERRORS = 1000;

export function logError(error: Error, request: FastifyRequest, statusCode: number = 500) {
  const errorLog: ErrorLog = {
    message: error.message,
    stack: error.stack,
    statusCode,
    path: request.url,
    method: request.method,
    timestamp: new Date(),
    userId: (request.user as any)?.id,
  };

  errorLogs.push(errorLog);

  if (errorLogs.length > MAX_ERRORS) {
    errorLogs.shift();
  }

  console.error('[monitoring] Error tracked:', errorLog);
}

export function getErrorLogs(limit: number = 100): ErrorLog[] {
  return errorLogs.slice(-limit);
}

export function getErrorStats(): {
  total_errors: number;
  last_hour: number;
  by_status: Record<number, number>;
  most_common: Array<{ message: string; count: number }>;
} {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  const lastHour = errorLogs.filter(e => e.timestamp.getTime() > oneHourAgo);

  const byStatus: Record<number, number> = {};
  errorLogs.forEach(e => {
    byStatus[e.statusCode] = (byStatus[e.statusCode] || 0) + 1;
  });

  // Agrupar por mensagem
  const messageCount: Record<string, number> = {};
  errorLogs.forEach(e => {
    messageCount[e.message] = (messageCount[e.message] || 0) + 1;
  });

  const mostCommon = Object.entries(messageCount)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total_errors: errorLogs.length,
    last_hour: lastHour.length,
    by_status: byStatus,
    most_common: mostCommon,
  };
}

// ============================================
// HEALTH CHECK
// ============================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  checks: {
    database: boolean;
    redis?: boolean;
    queues?: boolean;
    external_apis?: boolean;
  };
  metrics: {
    requests_per_minute: number;
    avg_response_time: number;
    error_rate: number;
    ia_calls?: number;
  };
  queue_backlog?: number;
  redis?: {
    connected: boolean;
    keys: number;
    memory_mb: number;
    uptime_seconds: number;
  };
}

async function isDatabaseHealthy() {
  try {
    await query('SELECT 1');
    return true;
  } catch (err) {
    console.error('[monitoring] Database health check failed:', err);
    return false;
  }
}

async function getQueuesSnapshot() {
  try {
    return await QueueService.getAllQueuesStats();
  } catch (err) {
    console.error('[monitoring] Queue stats error:', err);
    return [];
  }
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const metrics = getRequestMetrics();
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  const [dbHealthy, redisStats, queuesStats] = await Promise.all([
    isDatabaseHealthy(),
    getRedisStats(),
    getQueuesSnapshot(),
  ]);
  const redisExpected = process.env.DISABLE_REDIS !== 'true';
  const redisOk = !redisExpected || redisStats.connected;

  const lastMinute = requestMetrics.filter(m => m.timestamp.getTime() > oneMinuteAgo);
  const requestsPerMinute = lastMinute.length;
  const errorRate = metrics.total > 0 
    ? ((metrics.errors_5xx + metrics.errors_4xx) / metrics.total) * 100 
    : 0;

  const queueBacklog = queuesStats.reduce(
    (sum, q) => sum + (q?.waiting || 0) + (q?.delayed || 0),
    0
  );

  // Determinar status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (!dbHealthy) status = 'unhealthy';
  if (status === 'healthy' && (!redisOk || queueBacklog > 200)) {
    status = 'degraded';
  }
  if (errorRate > 25 || metrics.avg_duration > 5000) {
    status = 'unhealthy';
  } else if (status === 'healthy' && (errorRate > 10 || metrics.avg_duration > 2000)) {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date(),
    uptime: process.uptime(),
    checks: {
      database: dbHealthy,
      redis: redisExpected ? redisStats.connected : undefined,
      queues: queuesStats.length > 0 ? queueBacklog < 1000 : undefined,
      external_apis: undefined,
    },
    metrics: {
      requests_per_minute: requestsPerMinute,
      avg_response_time: metrics.avg_duration,
      error_rate: errorRate,
      ia_calls: getIaUsage().totalCalls,
    },
    queue_backlog: queueBacklog,
    redis: redisStats,
  };
}

// ============================================
// ALERTS
// ============================================

interface Alert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: any;
}

const alerts: Alert[] = [];
const MAX_ALERTS = 500;

export function triggerAlert(level: Alert['level'], message: string, metadata?: any) {
  const alert: Alert = {
    level,
    message,
    timestamp: new Date(),
    metadata,
  };

  alerts.push(alert);

  if (alerts.length > MAX_ALERTS) {
    alerts.shift();
  }

  console.warn(`[monitoring] ALERT [${level}]:`, message, metadata);
  void AlertService.notifyAlert({
    level,
    message,
    timestamp: alert.timestamp,
    metadata,
  });
}

export function getAlerts(limit: number = 100): Alert[] {
  return alerts.slice(-limit);
}

// ============================================
// AUTO-MONITORING
// ============================================

let monitoringInterval: NodeJS.Timeout | null = null;

export function startAutoMonitoring() {
  if (monitoringInterval) return;

  console.log('[monitoring] 📊 Auto-monitoring iniciado');

  monitoringInterval = setInterval(async () => {
    const health = await getHealthStatus();
    const metrics = getRequestMetrics();
    const errors = getErrorStats();
    const tutor = getTutorMetrics();

    // Alertas automáticos
    if (health.status === 'unhealthy') {
      triggerAlert('critical', 'System is unhealthy', { health });
    } else if (health.status === 'degraded') {
      triggerAlert('warning', 'System is degraded', { health });
    }

    if (metrics.errors_5xx > monitorThresholds.errors5xx) {
      triggerAlert('warning', `High error rate: ${metrics.errors_5xx} 5xx errors`, { metrics });
    }

    if (metrics.slow_requests > monitorThresholds.slowRequests) {
      triggerAlert('warning', `Many slow requests: ${metrics.slow_requests}`, { metrics });
    }

    if (errors.last_hour > monitorThresholds.errorsHourly) {
      triggerAlert('critical', `High error rate: ${errors.last_hour} errors in last hour`, { errors });
    }

    if (tutor.calls >= 20 && tutor.rag_rate < monitorThresholds.ragRateMin) {
      const ragRatePct = Math.round(monitorThresholds.ragRateMin * 100);
      triggerAlert('warning', `Tutor IA com baixa taxa de RAG (<${ragRatePct}%)`, {
        calls: tutor.calls,
        rag_calls: tutor.rag_calls,
        rag_rate: tutor.rag_rate,
      });
    }

    // Log métricas a cada 5 minutos
    console.log('[monitoring] Health:', health.status);
    console.log('[monitoring] Requests/min:', health.metrics.requests_per_minute);
    console.log('[monitoring] Avg response time:', Math.round(health.metrics.avg_response_time), 'ms');
    console.log('[monitoring] Error rate:', health.metrics.error_rate.toFixed(2), '%');
  }, 60000); // A cada 1 minuto
}

export function stopAutoMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('[monitoring] Auto-monitoring parado');
  }
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const MonitoringService = {
  requestTracker,
  getRequestMetrics,
  getSystemMetrics,
  logError,
  getErrorLogs,
  getErrorStats,
  getHealthStatus,
  trackIaUsage,
  getIaUsage,
  trackReccoRun,
  getReccoMetrics,
  getReccoDecisionHistory,
  trackSimulado,
  trackMetric,
  getSimuladoMetrics,
  trackTutorCall,
  getTutorMetrics,
  triggerAlert,
  getAlerts,
  startAutoMonitoring,
  stopAutoMonitoring,
};

export default MonitoringService;
