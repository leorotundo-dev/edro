/**
 * Queue Service
 * Gerencia filas BullMQ com fallback seguro quando Redis/filas estiverem desabilitados.
 */

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { updateNotificationStatus } from './notificationService';

const redisUrl =
  process.env.REDIS_URL ||
  (process.env.REDIS_PASSWORD
    ? `redis://:${process.env.REDIS_PASSWORD}@localhost:${process.env.REDIS_PORT || 6379}`
    : 'redis://localhost:6379');

const queuesEnabled = process.env.DISABLE_QUEUES !== 'true';
const workersEnabled = process.env.ENABLE_QUEUE_WORKERS !== 'false'; // default: on

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeBackoffType = (value: string | undefined): 'fixed' | 'exponential' => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'fixed' ? 'fixed' : 'exponential';
};

const defaultAttempts = toPositiveInt(process.env.QUEUE_JOB_ATTEMPTS, 5);
const defaultBackoffDelayMs = toPositiveInt(process.env.QUEUE_BACKOFF_DELAY_MS, 30000);
const defaultBackoffType = normalizeBackoffType(process.env.QUEUE_BACKOFF_TYPE);
const promotionIntervalMs = toPositiveInt(process.env.QUEUE_PROMOTE_INTERVAL_MS, 1000);
const workerRestartDelayMs = toPositiveInt(process.env.QUEUE_WORKER_RESTART_MS, 5000);
const workerWatchdogIntervalMs = toPositiveInt(process.env.QUEUE_WORKER_WATCHDOG_MS, 30000);

type QueueName =
  | 'generateDrops'
  | 'processHarvest'
  | 'generateEmbeddings'
  | 'sendNotifications'
  | 'generateQuestions'
  | 'cleanupData';

const queueKeys: Record<QueueName, string> = {
  generateDrops: 'generate-drops',
  processHarvest: 'process-harvest',
  generateEmbeddings: 'generate-embeddings',
  sendNotifications: 'send-notifications',
  generateQuestions: 'generate-questions',
  cleanupData: 'cleanup-data',
};

let connection: Redis | null = null;
let connectionHealthy = false;
let workersStarted = false;
let restartTimer: NodeJS.Timeout | null = null;
let watchdogTimer: NodeJS.Timeout | null = null;

const queueInstances: Partial<Record<QueueName, Queue>> = {};
const workerInstances: Partial<Record<QueueName, Worker>> = {};
const promotionTimers: Partial<Record<QueueName, NodeJS.Timeout>> = {};

async function stopWorkers(reason?: string) {
  if (reason) {
    console.warn(`[queue] Stopping workers (${reason})`);
  }
  await Promise.all(Object.values(workerInstances).map((worker) => worker?.close()));
  (Object.keys(workerInstances) as QueueName[]).forEach((key) => {
    delete workerInstances[key];
  });
  workersStarted = false;
}

function startWorkerWatchdog() {
  if (watchdogTimer || !workersEnabled) return;
  watchdogTimer = setInterval(() => {
    if (!workersEnabled) return;
    if (!connectionHealthy) return;

    const workers = Object.values(workerInstances).filter(Boolean) as Worker[];
    const missingWorkers = workers.length === 0;
    const stoppedWorkers = workers.some((worker) => !worker.isRunning());

    if (workersStarted && (missingWorkers || stoppedWorkers)) {
      scheduleWorkersRestart('watchdog');
      return;
    }

    if (!workersStarted && !missingWorkers) {
      workersStarted = true;
      return;
    }

    if (!workersStarted && missingWorkers) {
      ensureWorkersStarted();
    }
  }, workerWatchdogIntervalMs);
  watchdogTimer?.unref?.();
}

function scheduleWorkersRestart(reason: string) {
  if (!workersEnabled) return;
  if (restartTimer) return;
  console.warn(`[queue] Scheduling workers restart (${reason})`);
  restartTimer = setTimeout(async () => {
    restartTimer = null;
    await stopWorkers(reason);
    ensureWorkersStarted();
  }, workerRestartDelayMs);
  restartTimer?.unref?.();
}

function getConnection(): Redis | null {
  if (!queuesEnabled) return null;
  if (connection) return connection;

  try {
    connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

    connection.on('connect', () => {
      connectionHealthy = true;
      console.log('[queue] Connected to Redis for queues');
      if (workersEnabled && !workersStarted) {
        ensureWorkersStarted();
      }
    });

    connection.on('error', (err) => {
      connectionHealthy = false;
      console.error('[queue] Redis queue error:', err.message);
      scheduleWorkersRestart('redis_error');
    });

    return connection;
  } catch (err) {
    console.warn('[queue] Failed to init Redis connection, queues disabled');
    connectionHealthy = false;
    connection = null;
    return null;
  }
}

function getQueue(name: QueueName): Queue | null {
  if (queueInstances[name]) return queueInstances[name]!;

  const conn = getConnection();
  if (!conn) return null;

  queueInstances[name] = new Queue(queueKeys[name], { connection: conn });
  if (!promotionTimers[name]) {
    const queue = queueInstances[name]!;
    promotionTimers[name] = setInterval(async () => {
      try {
        await queue.promoteJobs();
      } catch (err: any) {
        console.warn('[queue] Failed to promote delayed jobs:', err?.message || err);
      }
    }, promotionIntervalMs);
    promotionTimers[name]?.unref?.();
  }
  return queueInstances[name]!;
}

// ============================================
// JOB INTERFACES
// ============================================

export interface GenerateDropsJob {
  disciplineId: string;
  topicCode: string;
  count: number;
}

export interface ProcessHarvestJob {
  harvestId: string;
  sourceUrl: string;
}

export interface GenerateEmbeddingsJob {
  type: 'drops' | 'questions' | 'rag';
  ids: string[];
}

export interface SendNotificationJob {
  userId: string;
  type: 'email' | 'push';
  title: string;
  body: string;
  logId?: string | null;
}

export interface GenerateQuestionsJob {
  disciplineId: string;
  topicCode: string;
  count: number;
  difficulty: number;
}

export interface CleanupDataJob {
  type: 'old_logs' | 'expired_sessions' | 'temp_files';
  olderThanDays: number;
}

// ============================================
// WORKERS
// ============================================

function attachWorkerEvents(worker: Worker, name: string) {
  worker.on('completed', (job) => {
    console.log(`[worker:${name}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker:${name}] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[worker:${name}] Worker error:`, err.message);
    scheduleWorkersRestart(`worker_error:${name}`);
  });
}

function ensureWorkersStarted() {
  if (!workersEnabled || workersStarted) return;

  const conn = getConnection();
  if (!conn) {
    console.warn('[queue] Workers not started: Redis connection unavailable');
    return;
  }

  workerInstances.generateDrops = new Worker<GenerateDropsJob>(
    queueKeys.generateDrops,
    async (job) => {
      const { disciplineId, topicCode, count } = job.data;
      // TODO: implementar gera├º├úo real
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { success: true, generated: count, disciplineId, topicCode };
    },
    { connection: conn, concurrency: 2 }
  );

  workerInstances.processHarvest = new Worker<ProcessHarvestJob>(
    queueKeys.processHarvest,
    async (job) => {
      const { harvestId, sourceUrl } = job.data;
      // TODO: implementar processamento real
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return { success: true, harvestId, sourceUrl };
    },
    { connection: conn, concurrency: 1 }
  );

  workerInstances.generateEmbeddings = new Worker<GenerateEmbeddingsJob>(
    queueKeys.generateEmbeddings,
    async (job) => {
      const { type, ids } = job.data;
      // TODO: implementar gera├º├úo real
      await new Promise((resolve) => setTimeout(resolve, ids.length * 100));
      return { success: true, processed: ids.length, type };
    },
    { connection: conn, concurrency: 3 }
  );

  workerInstances.sendNotifications = new Worker<SendNotificationJob>(
    queueKeys.sendNotifications,
    async (job) => {
      const { userId, type, title, body, logId } = job.data;
      try {
        // TODO: implementar envio real
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (logId) {
          await updateNotificationStatus({ id: logId, status: 'sent' });
        }
        return { success: true, sent: true, userId, type, title, body };
      } catch (err: any) {
        if (logId) {
          await updateNotificationStatus({
            id: logId,
            status: 'failed',
            reason: err?.message || 'send_failed',
          });
        }
        throw err;
      }
    },
    { connection: conn, concurrency: 10 }
  );

  workerInstances.generateQuestions = new Worker<GenerateQuestionsJob>(
    queueKeys.generateQuestions,
    async (job) => {
      const { disciplineId, topicCode, count, difficulty } = job.data;
      // TODO: implementar gera├º├úo real
      await new Promise((resolve) => setTimeout(resolve, count * 1000));
      return { success: true, generated: count, disciplineId, topicCode, difficulty };
    },
    { connection: conn, concurrency: 2 }
  );

  workerInstances.cleanupData = new Worker<CleanupDataJob>(
    queueKeys.cleanupData,
    async (job) => {
      const { type, olderThanDays } = job.data;
      // TODO: implementar limpeza real
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true, deletedCount: 0, type, olderThanDays };
    },
    { connection: conn, concurrency: 1 }
  );

  Object.entries(workerInstances).forEach(([name, worker]) => {
    if (worker) attachWorkerEvents(worker, name);
  });

  workersStarted = true;
  startWorkerWatchdog();
  console.log('[queue] Workers iniciados');
}

export async function restartWorkers(reason: string = 'manual') {
  if (!workersEnabled) {
    console.warn('[queue] Workers restart skipped (disabled)');
    return;
  }
  await stopWorkers(reason);
  ensureWorkersStarted();
}

// ============================================
// QUEUE OPERATIONS
// ============================================

export async function addToQueue<T>(
  queueName: QueueName,
  data: T,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
): Promise<Job<T> | null> {
  const queue = getQueue(queueName);

  if (!queue) {
    console.warn(`[queue] Queue ${queueName} unavailable (queues disabled or Redis down)`);
    return null;
  }

  if (workersEnabled) {
    ensureWorkersStarted();
  }

  const attempts = options?.attempts ?? defaultAttempts;
  const delay =
    typeof options?.delay === 'number' && options.delay > 0
      ? options.delay
      : undefined;
  const jobOptions: {
    delay?: number;
    priority?: number;
    attempts: number;
    backoff: { type: 'fixed' | 'exponential'; delay: number };
    removeOnComplete: { age: number; count: number };
    removeOnFail: { age: number };
  } = {
    priority: options?.priority,
    attempts,
    backoff: { type: defaultBackoffType, delay: defaultBackoffDelayMs },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800 },
  };

  if (delay !== undefined) {
    jobOptions.delay = delay;
  }

  const job = await queue.add(queueKeys[queueName], data, jobOptions);

  if (delay === undefined) {
    setTimeout(() => {
      job
        .getState()
        .then((state) => {
          if (state !== 'delayed') return;
          return job.promote();
        })
        .catch((err: any) => {
          if (!String(err?.message || '').includes('not in the delayed state')) {
            console.warn('[queue] Failed to promote job:', err?.message || err);
          }
        });
    }, 500);
  }

  console.log(`[queue] Job added to ${queueName}: ${job.id}`);
  return job;
}

export async function getQueueStats(queueName: QueueName) {
  const queue = getQueue(queueName);
  if (!queue) {
    return {
      name: queueName,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
      enabled: false,
      redisHealthy: connectionHealthy,
    };
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    name: queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
    enabled: true,
    redisHealthy: connectionHealthy,
  };
}

export async function getAllQueuesStats() {
  const stats = await Promise.all(
    (Object.keys(queueKeys) as QueueName[]).map((name) => getQueueStats(name))
  );

  return stats;
}

export async function getQueueHealth() {
  const stats = await getAllQueuesStats();
  const backlog = stats.reduce(
    (sum, queue) => sum + (queue?.waiting || 0) + (queue?.delayed || 0),
    0
  );

  return {
    enabled: queuesEnabled,
    workersEnabled,
    redisHealthy: connectionHealthy,
    backlog,
    defaults: {
      attempts: defaultAttempts,
      backoff: {
        type: defaultBackoffType,
        delay_ms: defaultBackoffDelayMs,
      },
    },
    queues: stats,
  };
}

export async function pauseQueue(queueName: QueueName) {
  const queue = getQueue(queueName);
  if (!queue) return;
  await queue.pause();
}

export async function resumeQueue(queueName: QueueName) {
  const queue = getQueue(queueName);
  if (!queue) return;
  await queue.resume();
}

export async function clearQueue(queueName: QueueName) {
  const queue = getQueue(queueName);
  if (!queue) return;
  await queue.drain();
}

// ============================================
// SCHEDULED JOBS
// ============================================

export async function scheduleRecurringJobs() {
  if (!queuesEnabled) {
    console.log('[queue] Recurring jobs skipped (queues disabled)');
    return;
  }

  const cleanupQueue = getQueue('cleanupData');
  const embeddingsQueue = getQueue('generateEmbeddings');

  if (!cleanupQueue || !embeddingsQueue) return;

  await cleanupQueue.add(
    'daily-cleanup',
    { type: 'old_logs', olderThanDays: 30 },
    { repeat: { pattern: '0 2 * * *' } }
  );

  await embeddingsQueue.add(
    'weekly-embeddings',
    { type: 'drops', ids: [] },
    { repeat: { pattern: '0 3 * * 0' } }
  );

  console.log('[queue] Recurring jobs scheduled');
}

// ============================================
// SHUTDOWN
// ============================================

export async function shutdownQueues() {
  console.log('[queue] Shutting down queues...');

  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
  await stopWorkers('shutdown');
  Object.values(promotionTimers).forEach((timer) => timer && clearInterval(timer));
  await Promise.all(Object.values(queueInstances).map((queue) => queue?.close()));
  if (connection) {
    await connection.quit();
  }
}

// ============================================
// EXPORTS
// ============================================

export const queues = queueInstances;

export const QueueService = {
  queues: queueInstances,
  addToQueue,
  getQueueStats,
  getAllQueuesStats,
  getQueueHealth,
  pauseQueue,
  resumeQueue,
  clearQueue,
  restartWorkers,
  scheduleRecurringJobs,
  shutdownQueues,
};

export const queueNames = Object.keys(queueKeys) as QueueName[];

export default QueueService;
export type { QueueName };
