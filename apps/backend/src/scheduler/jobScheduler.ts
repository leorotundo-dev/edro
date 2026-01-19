import cron from 'node-cron';
import { query } from '../db';
import { extractBlueprint } from '../services/ai/extractBlueprint';
import { summarizeRAGBlock } from '../services/ai/summarizeRAG';
import { generateDropsFromEditais } from '../services/dropGenerationFromEditais';
import { createBlueprint } from '../repositories/blueprintRepository';
import { findHarvestByStatus, updateHarvestStatus } from '../repositories/harvestRepository';
import { runNotificationSweep } from '../services/notificationSchedulerService';
import { finalizeEndedEvents } from '../services/gamificationEventsService';
// Removido: import fetch from 'node-fetch' - usar fetch nativo do Node 18+

interface JobScheduleRow {
  id: number;
  job_name: string;
  cron_expression: string;
  is_active: boolean;
  last_run_at?: Date;
  next_run_at?: Date;
}

interface HarvestItem {
  id: number;
  source: string;
  url: string;
  raw_html: string;
  status: string;
}

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Registrar execução de job no banco
 */
async function logJobExecution(
  jobName: string,
  status: 'STARTED' | 'COMPLETED' | 'FAILED',
  itemsProcessed: number = 0,
  itemsFailed: number = 0,
  errorMessage?: string
) {
  try {
    await query(
      `
      INSERT INTO job_logs (job_name, status, items_processed, items_failed, error_message)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [jobName, status, itemsProcessed, itemsFailed, errorMessage || null]
    );
  } catch (err) {
    console.error('[scheduler] Erro ao registrar log:', err);
  }
}

/**
 * Job: Extrair blueprints de harvest items pendentes
 */
async function extractBlueprintsJob() {
  console.log('[scheduler] Iniciando job: extract-blueprints');
  const jobName = 'extract-blueprints';
  let itemsProcessed = 0;
  let itemsFailed = 0;

  try {
    await logJobExecution(jobName, 'STARTED');

    const { rows } = await query<HarvestItem>(
      `
      SELECT id, source, url, raw_html, status
      FROM harvest_items
      WHERE status = 'PENDING'
      ORDER BY id ASC
      LIMIT 10
      `
    );

    if (rows.length === 0) {
      console.log('[scheduler] Nenhum harvest_item PENDING encontrado.');
      await logJobExecution(jobName, 'COMPLETED', 0, 0);
      return;
    }

    console.log(`[scheduler] Encontrados ${rows.length} itens para processar`);

    for (const item of rows) {
      try {
        console.log(`[scheduler] Processando harvest id=${item.id}`);

        const blueprint = await extractBlueprint(item.raw_html) as any;

        await query(
          `
          INSERT INTO exam_blueprints (
            harvest_item_id,
            exam_code,
            banca,
            cargo,
            disciplina,
            blueprint,
            priorities
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)
          `,
          [
            item.id,
            null,
            blueprint.banca,
            blueprint.cargo ?? null,
            null,
            JSON.stringify(blueprint),
            null
          ]
        );

        await query(
          `
          UPDATE harvest_items
          SET status = $1, processed_at = NOW()
          WHERE id = $2
          `,
          ['BLUEPRINT_DONE', item.id]
        );

        itemsProcessed++;
        console.log(`[scheduler] Sucesso para harvest id=${item.id}`);
      } catch (err) {
        itemsFailed++;
        console.error(`[scheduler] Erro para harvest id=${item.id}:`, err);

        try {
          await query(
            `UPDATE harvest_items SET status = $1, processed_at = NOW() WHERE id = $2`,
            ['BLUEPRINT_ERROR', item.id]
          );
        } catch (updateErr) {
          console.error('[scheduler] Erro ao atualizar status para BLUEPRINT_ERROR:', updateErr);
        }
      }
    }

    await logJobExecution(jobName, 'COMPLETED', itemsProcessed, itemsFailed);
    console.log(`[scheduler] Job extract-blueprints finalizado: ${itemsProcessed} sucesso, ${itemsFailed} falhas`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logJobExecution(jobName, 'FAILED', itemsProcessed, itemsFailed, errorMsg);
    console.error('[scheduler] Erro fatal no job extract-blueprints:', err);
  }
}

/**
 * Job: Processar harvest_items PENDING e criar blueprints
 * Esse job roda no scheduler para automatizar o pipeline dos scrapers.
 */
async function processHarvestJob() {
  console.log('[scheduler] Iniciando job: process-harvest');
  const jobName = 'process-harvest';
  let itemsProcessed = 0;
  let itemsFailed = 0;

  try {
    await logJobExecution(jobName, 'STARTED');

    const pending = await findHarvestByStatus('PENDING');
    if (pending.length === 0) {
      console.log('[scheduler] Nenhum harvest_item PENDING encontrado.');
      await logJobExecution(jobName, 'COMPLETED', 0, 0);
      return;
    }

    console.log(`[scheduler] Encontrados ${pending.length} harvests pendentes`);

    for (const item of pending) {
      try {
        await updateHarvestStatus({ id: item.id, status: 'PROCESSING' });

        const blueprint = await extractBlueprint(item.raw_html) as any;
        if (!blueprint) throw new Error('Blueprint extraction returned empty result');

        await createBlueprint({
          harvest_item_id: item.id,
          exam_code: blueprint.exam_code || null,
          banca: blueprint.banca || item.source || null,
          cargo: blueprint.cargo || null,
          disciplina: blueprint.disciplina || null,
          blueprint: blueprint.topics || blueprint,
          priorities: blueprint.priorities || null
        });

        await updateHarvestStatus({ id: item.id, status: 'COMPLETED' });

        itemsProcessed++;
        console.log(`[scheduler] Harvest ${item.id} processado`);
      } catch (err) {
        itemsFailed++;
        console.error(`[scheduler] Erro ao processar harvest ${item.id}:`, err);
        try {
          await updateHarvestStatus({ id: item.id, status: 'FAILED' });
        } catch (e) {
          console.error('[scheduler] Erro ao marcar harvest como FAILED:', e);
        }
      }
    }

    await logJobExecution(jobName, 'COMPLETED', itemsProcessed, itemsFailed);
    console.log(`[scheduler] Job process-harvest finalizado: ${itemsProcessed} sucesso, ${itemsFailed} falhas`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logJobExecution(jobName, 'FAILED', itemsProcessed, itemsFailed, errorMsg);
    console.error('[scheduler] Erro fatal no job process-harvest:', err);
  }
}

/**
 * Job: Gerar drops a partir de editais
 */
async function generateDropsJob() {
  console.log('[scheduler] Iniciando job: generate-drops');
  const jobName = 'generate-drops';
  let itemsProcessed = 0;
  let itemsFailed = 0;

  try {
    await logJobExecution(jobName, 'STARTED');

    const result = await generateDropsFromEditais({
      limitEditais: toPositiveInt(process.env.GENERATE_DROPS_EDITAIS_LIMIT, 5),
      maxTopicsPerEdital: toPositiveInt(process.env.GENERATE_DROPS_MAX_TOPICS_PER_EDITAL, 25),
      maxTotalTopics: toPositiveInt(process.env.GENERATE_DROPS_MAX_TOTAL_TOPICS, 120),
    });

    itemsProcessed = result.dropsGenerated;
    itemsFailed = result.failedTopics;

    console.log(`[scheduler] Editais processados: ${result.editaisProcessed}`);
    console.log(`[scheduler] Topicos processados: ${result.topicsProcessed}`);
    console.log(`[scheduler] Drops gerados: ${result.dropsGenerated}`);
    console.log(`[scheduler] Falhas em topicos: ${result.failedTopics}`);

    await logJobExecution(jobName, 'COMPLETED', itemsProcessed, itemsFailed);
    console.log(`[scheduler] Job generate-drops finalizado: ${itemsProcessed} sucesso, ${itemsFailed} falhas`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logJobExecution(jobName, 'FAILED', itemsProcessed, itemsFailed, errorMsg);
    console.error('[scheduler] Erro fatal no job generate-drops:', err);
  }
}

/**
 * Job: Engajamento (notificacoes + eventos encerrados)
 */
async function engagementSweepJob() {
  console.log('[scheduler] Iniciando job: engagement-sweep');
  const jobName = 'engagement-sweep';
  let itemsProcessed = 0;
  let itemsFailed = 0;

  try {
    await logJobExecution(jobName, 'STARTED');

    const [eventResult, notificationResult] = await Promise.all([
      finalizeEndedEvents(),
      runNotificationSweep(),
    ]);

    itemsProcessed =
      (eventResult?.processed ?? 0) +
      (notificationResult?.queued ?? 0) +
      (notificationResult?.sent ?? 0);

    await logJobExecution(jobName, 'COMPLETED', itemsProcessed, itemsFailed);
    console.log(
      `[scheduler] engagement-sweep finalizado: ${itemsProcessed} itens, ${itemsFailed} falhas`
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logJobExecution(jobName, 'FAILED', itemsProcessed, itemsFailed, errorMsg);
    console.error('[scheduler] Erro fatal no job engagement-sweep:', err);
  }
}

/**
 * Inicializar scheduler
 */
export async function initializeScheduler() {
  console.log('[scheduler] Inicializando scheduler de jobs...');

  try {
    const { rows } = await query<JobScheduleRow>(
      `SELECT id, job_name, cron_expression, is_active FROM job_schedule WHERE is_active = true`
    );

    let schedules: JobScheduleRow[] = rows;

    if (!schedules || schedules.length === 0) {
      console.log('[scheduler] Nenhum job agendado ativo. Usando defaults.');
      schedules = [
        { id: 0, job_name: 'process-harvest', cron_expression: '*/5 * * * *', is_active: true },
        { id: 0, job_name: 'extract-blueprints', cron_expression: '*/7 * * * *', is_active: true },
        { id: 0, job_name: 'generate-drops', cron_expression: '*/15 * * * *', is_active: true }
      ];
    } else {
      console.log(`[scheduler] Encontrados ${schedules.length} jobs agendados`);
    }

    const engagementEnabled = process.env.NOTIFY_SWEEP_ENABLED !== 'false';
    const engagementCron = process.env.NOTIFY_SWEEP_CRON || '0 9 * * *';
    if (engagementEnabled) {
      const exists = schedules.some((s) => s.job_name === 'engagement-sweep');
      if (!exists) {
        schedules = [
          ...schedules,
          {
            id: 0,
            job_name: 'engagement-sweep',
            cron_expression: engagementCron,
            is_active: true,
          },
        ];
      }
    }

    for (const schedule of schedules) {
      console.log(`[scheduler] Agendando job: ${schedule.job_name} com cron: ${schedule.cron_expression}`);

      if (schedule.job_name === 'extract-blueprints') {
        cron.schedule(schedule.cron_expression, () => {
          console.log(`[scheduler] Executando job: ${schedule.job_name}`);
          extractBlueprintsJob().catch(err => {
            console.error(`[scheduler] Erro ao executar ${schedule.job_name}:`, err);
          });
        });
      } else if (schedule.job_name === 'process-harvest') {
        cron.schedule(schedule.cron_expression, () => {
          console.log(`[scheduler] Executando job: ${schedule.job_name}`);
          processHarvestJob().catch(err => {
            console.error(`[scheduler] Erro ao executar ${schedule.job_name}:`, err);
          });
        });
      } else if (schedule.job_name === 'generate-drops') {
        cron.schedule(schedule.cron_expression, () => {
          console.log(`[scheduler] Executando job: ${schedule.job_name}`);
          generateDropsJob().catch(err => {
            console.error(`[scheduler] Erro ao executar ${schedule.job_name}:`, err);
          });
        });
      } else if (schedule.job_name === 'engagement-sweep') {
        cron.schedule(schedule.cron_expression, () => {
          console.log(`[scheduler] Executando job: ${schedule.job_name}`);
          engagementSweepJob().catch(err => {
            console.error(`[scheduler] Erro ao executar ${schedule.job_name}:`, err);
          });
        });
      } else if (schedule.job_name === 'rag-feeder') {
        cron.schedule(schedule.cron_expression, () => {
          console.log(`[scheduler] Executando job: ${schedule.job_name}`);
          ragFeederJob().catch(err => {
            console.error(`[scheduler] Erro ao executar ${schedule.job_name}:`, err);
          });
        });
      }
    }

    console.log('[scheduler] Scheduler inicializado com sucesso');
  } catch (err) {
    console.error('[scheduler] Erro ao inicializar scheduler:', err);
  }
}
/**
 * Job: Alimentar rag_blocks com conteúdo de fontes externas
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const RAG_SOURCES = [
  {
    disciplina: 'Português',
    topicCode: 'PT-01',
    topicName: 'Morfologia',
    banca: null,
    sourceUrl: 'https://brasilescola.uol.com.br/gramatica/morfologia.htm'
  },
  {
    disciplina: 'Direito Constitucional',
    topicCode: 'DC-01',
    topicName: 'Constituição Federal – Princípios Fundamentais',
    banca: null,
    sourceUrl: 'https://www.todamateria.com.br/constituicao-federal/'
  }
];

async function ragFeederJob() {
  console.log('[scheduler] Iniciando job: rag-feeder');
  const jobName = 'rag-feeder';
  let itemsProcessed = 0;
  let itemsFailed = 0;

  try {
    await logJobExecution(jobName, 'STARTED');

    for (const src of RAG_SOURCES) {
      try {
        console.log(`[scheduler] Processando: ${src.topicCode} - ${src.topicName}`);

        // Verificar se já existe
        const { rows: existing } = await query<{ id: number }>(
          `
          SELECT id
          FROM rag_blocks
          WHERE disciplina = $1
            AND topic_code = $2
            AND (banca IS NULL OR banca = $3)
            AND source_url = $4
          LIMIT 1
          `,
          [src.disciplina, src.topicCode, src.banca ?? null, src.sourceUrl]
        );

        if (existing.length > 0) {
          console.log('[scheduler] ⏭️  Já existe registro para esta fonte, pulando.');
          continue;
        }

        // Buscar HTML
        const res = await fetch(src.sourceUrl);
        if (!res.ok) {
          console.error(`[scheduler] Erro ao buscar URL (${res.status}): ${src.sourceUrl}`);
          itemsFailed++;
          continue;
        }

        // Extrair texto
        const html = await res.text();
        const plainText = htmlToText(html);

        if (!plainText || plainText.length < 500) {
          console.warn('[scheduler] ⚠️  Texto extraído muito curto, pulando.');
          continue;
        }

        // Gerar resumo com IA
        const { summary } = await summarizeRAGBlock({
          disciplina: src.disciplina,
          topicCode: src.topicCode,
          topicName: src.topicName,
          banca: src.banca ?? undefined,
          sourceUrl: src.sourceUrl,
          content: plainText
        });

        if (!summary) {
          console.warn('[scheduler] ⚠️  Summary vazio, pulando.');
          continue;
        }

        // Inserir em rag_blocks
        await query(
          `
          INSERT INTO rag_blocks (
            disciplina,
            topic_code,
            banca,
            source_url,
            summary,
            embedding
          ) VALUES ($1, $2, $3, $4, $5, NULL)
          `,
          [
            src.disciplina,
            src.topicCode,
            src.banca ?? null,
            src.sourceUrl,
            summary
          ]
        );

        itemsProcessed++;
        console.log('[scheduler] Bloco inserido em rag_blocks.');
      } catch (err) {
        itemsFailed++;
        console.error('[scheduler] Erro ao processar fonte:', err);
      }
    }

    await logJobExecution(jobName, 'COMPLETED', itemsProcessed, itemsFailed);
    console.log(`[scheduler] Job rag-feeder finalizado: ${itemsProcessed} processados, ${itemsFailed} falhas`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logJobExecution(jobName, 'FAILED', itemsProcessed, itemsFailed, errorMsg);
    console.error('[scheduler] Erro fatal no job rag-feeder:', err);
  }
}

/**
 * Executar jobs manualmente (para testes)
 */
export async function runJobManually(jobName: string) {
  console.log(`[scheduler] Executando job manualmente: ${jobName}`);

  if (jobName === 'extract-blueprints') {
    await extractBlueprintsJob();
  } else if (jobName === 'process-harvest') {
    await processHarvestJob();
  } else if (jobName === 'generate-drops') {
    await generateDropsJob();
  } else if (jobName === 'engagement-sweep') {
    await engagementSweepJob();
  } else if (jobName === 'rag-feeder') {
    await ragFeederJob();
  } else {
    console.error(`[scheduler] Job desconhecido: ${jobName}`);
  }
}
