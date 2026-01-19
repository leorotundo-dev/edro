/**
 * Job Service
 * 
 * Sistema de jobs agendados e queue
 */

import { query } from '../db';

// ============================================
// TIPOS
// ============================================

export interface Job {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  data: any;
  result?: any;
  error?: string;
  attempts: number;
  max_attempts: number;
  scheduled_for?: Date;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  duration_ms: number;
}

// ============================================
// JOB MANAGEMENT
// ============================================

export async function createJob(params: {
  name: string;
  type: string;
  data?: any;
  priority?: number;
  scheduledFor?: Date;
  maxAttempts?: number;
}): Promise<string> {
  console.log(`[jobs] Criando job: ${params.name} (${params.type})`);

  const { rows } = await query<{ id: string }>(`
    INSERT INTO jobs (
      name, type, data, priority, scheduled_for, max_attempts
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [
    params.name,
    params.type,
    JSON.stringify(params.data || {}),
    params.priority || 5,
    params.scheduledFor,
    params.maxAttempts || 3,
  ]);

  return rows[0].id;
}

export async function getNextJob(): Promise<Job | null> {
  const { rows } = await query<Job>(`
    SELECT * FROM jobs
    WHERE status = 'pending'
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      AND attempts < max_attempts
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `);

  return rows[0] || null;
}

export async function startJob(jobId: string): Promise<void> {
  await query(`
    UPDATE jobs
    SET status = 'running',
        started_at = NOW(),
        attempts = attempts + 1
    WHERE id = $1
  `, [jobId]);
}

export async function completeJob(jobId: string, result: any): Promise<void> {
  await query(`
    UPDATE jobs
    SET status = 'completed',
        result = $2,
        completed_at = NOW()
    WHERE id = $1
  `, [jobId, JSON.stringify(result)]);
}

export async function updateJobProgress(
  jobId: string,
  progress: number,
  result?: Record<string, any>
): Promise<void> {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const payload = {
    progress: clamped,
    updated_at: new Date().toISOString(),
    ...(result || {}),
  };

  await query(`
    UPDATE jobs
    SET result = COALESCE(result, '{}'::jsonb) || $2::jsonb
    WHERE id = $1
  `, [jobId, JSON.stringify(payload)]);
}

export async function failJob(jobId: string, error: string): Promise<void> {
  // Verificar se deve tentar novamente
  const { rows } = await query<Job>(`
    SELECT attempts, max_attempts FROM jobs WHERE id = $1
  `, [jobId]);

  const job = rows[0];
  const shouldRetry = job && job.attempts < job.max_attempts;

  if (shouldRetry) {
    // Tentar novamente
    await query(`
      UPDATE jobs
      SET status = 'pending',
          error = $2,
          scheduled_for = NOW() + INTERVAL '5 minutes'
      WHERE id = $1
    `, [jobId, error]);
  } else {
    // Falhou permanentemente
    await query(`
      UPDATE jobs
      SET status = 'failed',
          error = $2,
          completed_at = NOW()
      WHERE id = $1
    `, [jobId, error]);
  }
}

export async function getJobStatus(jobId: string): Promise<Job | null> {
  const { rows } = await query<Job>(`
    SELECT * FROM jobs WHERE id = $1
  `, [jobId]);

  return rows[0] || null;
}

// ============================================
// JOB EXECUTORS
// ============================================

export async function executeJob(job: Job): Promise<JobResult> {
  console.log(`[jobs] Executando job: ${job.name} (${job.type})`);

  const startTime = Date.now();

  try {
    let result: any;

    switch (job.type) {
      case 'harvest':
        result = await executeHarvestJob(job.data);
        break;

      case 'generate_embeddings':
        result = await executeEmbeddingsJob(job.data);
        break;

      case 'generate_drops':
        result = await executeGenerateDropsJob(job.data);
        break;

      case 'generate_questions':
        result = await executeGenerateQuestionsJob(job.data);
        break;

      case 'cleanup':
        result = await executeCleanupJob(job.data);
        break;

      case 'update_stats':
        result = await executeUpdateStatsJob(job.data);
        break;

      case 'reprocess_edital':
        result = await executeReprocessEditalJob(job);
        break;

      default:
        throw new Error(`Tipo de job desconhecido: ${job.type}`);
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      data: result,
      duration_ms: duration,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const error = err instanceof Error ? err.message : 'Erro desconhecido';

    console.error(`[jobs] Erro no job ${job.id}:`, error);

    return {
      success: false,
      error,
      duration_ms: duration,
    };
  }
}

// ============================================
// JOB IMPLEMENTATIONS
// ============================================

async function executeHarvestJob(data: any): Promise<any> {
  const { HarvestService } = await import('./harvestService');
  
  if (data.sourceId) {
    return await HarvestService.harvestFromSource(data.sourceId, data.limit || 10);
  } else {
    return await HarvestService.harvestAll(data.limit || 10);
  }
}

async function executeEmbeddingsJob(data: any): Promise<any> {
  const { RagServiceExpanded } = await import('./ragServiceExpanded');
  return await RagServiceExpanded.regenerateAllEmbeddings();
}

async function executeGenerateDropsJob(data: any): Promise<any> {
  const { OpenAIService } = await import('./ai/openaiService');
  
  const drop = await OpenAIService.generateDrop({
    topico: data.topico,
    subtopico: data.subtopico,
    banca: data.banca,
    dificuldade: data.dificuldade,
  });

  // TODO: Salvar drop no banco
  return drop;
}

async function executeGenerateQuestionsJob(data: any): Promise<any> {
  if (data?.editalId && data?.userId) {
    const { generateQuestionsForEdital } = await import('./questionGenerationService');
    return await generateQuestionsForEdital({
      editalId: data.editalId,
      userId: data.userId,
      maxTotalQuestions: data.maxTotalQuestions,
      maxTopics: data.maxTopics,
      maxPerTopic: data.maxPerTopic,
      status: data.status,
    });
  }

  const { OpenAIService } = await import('./ai/openaiService');

  const question = await OpenAIService.generateQuestion({
    topico: data.topico,
    subtopico: data.subtopico,
    banca: data.banca,
    dificuldade: data.dificuldade,
  });

  return question;
}

async function executeCleanupJob(data: any): Promise<any> {
  const { AuthService } = await import('./authService');
  
  const result = await AuthService.cleanupExpiredTokens();
  
  // Cleanup outros itens
  await query(`
    DELETE FROM jobs
    WHERE status IN ('completed', 'failed')
      AND completed_at < NOW() - INTERVAL '7 days'
  `);

  return {
    ...result,
    jobsCleaned: 'Jobs antigos removidos',
  };
}

async function executeUpdateStatsJob(data: any): Promise<any> {
  // TODO: Atualizar estatísticas gerais
  return {
    message: 'Estatísticas atualizadas',
  };
}

async function executeReprocessEditalJob(job: Job): Promise<any> {
  const { HarvestService } = await import('./harvestService');

  const harvestId = job.data?.harvestId;
  if (!harvestId) {
    throw new Error('harvestId obrigatorio');
  }

  const forceExtraction = Boolean(job.data?.forceExtraction);
  const pdfOnly = Boolean(job.data?.pdfOnly);
  const editalId = typeof job.data?.editalId === 'string' ? job.data.editalId : undefined;

  await updateJobProgress(job.id, 5, {
    step: 'iniciado',
    harvest_id: harvestId,
    edital_id: editalId,
  });

  const result = await HarvestService.importHarvestedToEdital(harvestId, {
    forceExtraction,
    pdfOnly,
    onProgress: async (progress, step, data) => {
      await updateJobProgress(job.id, progress, {
        step,
        harvest_id: harvestId,
        edital_id: editalId,
        ...(data || {}),
      });
    },
  });

  await updateJobProgress(job.id, 100, {
    step: 'concluido',
    harvest_id: harvestId,
    edital_id: result.editalId || editalId,
  });

  return {
    ...result,
    harvest_id: harvestId,
    progress: 100,
  };
}

// ============================================
// JOB QUEUE WORKER
// ============================================

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const workerWatchdogIntervalMs = toPositiveInt(
  process.env.JOB_WORKER_WATCHDOG_MS,
  30000
);

let workerRunning = false;
let workerWatchdog: NodeJS.Timeout | null = null;

export async function startJobWorker(): Promise<void> {
  if (workerRunning) {
    console.log('[jobs] Worker já está rodando');
    return;
  }

  workerRunning = true;
  console.log('[jobs] 🚀 Job worker iniciado');

  while (workerRunning) {
    try {
      const job = await getNextJob();

      if (!job) {
        // Nenhum job na fila, aguardar
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Marcar job como iniciado
      await startJob(job.id);

      // Executar job
      const result = await executeJob(job);

      if (result.success) {
        await completeJob(job.id, result.data);
        console.log(`[jobs] ✅ Job ${job.id} completado em ${result.duration_ms}ms`);
      } else {
        await failJob(job.id, result.error || 'Erro desconhecido');
        console.log(`[jobs] ❌ Job ${job.id} falhou: ${result.error}`);
      }
    } catch (err) {
      console.error('[jobs] Erro no worker:', err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('[jobs] Job worker parado');
}

export function stopJobWorker(): void {
  workerRunning = false;
}

export function startJobWorkerWatchdog(intervalMs: number = workerWatchdogIntervalMs): void {
  if (workerWatchdog) return;
  workerWatchdog = setInterval(() => {
    if (!workerRunning) {
      startJobWorker().catch((err) => {
        console.error('[jobs] Worker restart failed:', err);
      });
    }
  }, intervalMs);
  workerWatchdog.unref?.();
}

export function stopJobWorkerWatchdog(): void {
  if (workerWatchdog) {
    clearInterval(workerWatchdog);
    workerWatchdog = null;
  }
}

// ============================================
// STATISTICS
// ============================================

export async function getJobStats(): Promise<{
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  avg_duration_ms: number;
}> {
  const { rows } = await query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) as avg_duration_ms
    FROM jobs
  `);

  return {
    total: parseInt(rows[0].total),
    pending: parseInt(rows[0].pending),
    running: parseInt(rows[0].running),
    completed: parseInt(rows[0].completed),
    failed: parseInt(rows[0].failed),
    avg_duration_ms: parseFloat(rows[0].avg_duration_ms || '0'),
  };
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const JobService = {
  createJob,
  getNextJob,
  startJob,
  completeJob,
  updateJobProgress,
  failJob,
  getJobStatus,
  executeJob,
  startJobWorker,
  stopJobWorker,
  startJobWorkerWatchdog,
  stopJobWorkerWatchdog,
  getJobStats,
};

export default JobService;

