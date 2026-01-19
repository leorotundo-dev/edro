import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { HarvestService } from '../services/harvestService';
import type { EditalProcessingSteps } from '../types/edital';

interface QAMetricRow {
  status: string;
  total: number;
}

interface DailyMetricRow {
  date: string;
  metric_name: string;
  metric_value: string;
}

type DailyMetricName =
  | 'users_new'
  | 'drops_created'
  | 'harvested_content'
  | 'reviews_completed';

const DEFAULT_QA_STATUSES = ['pending', 'approved', 'rejected'];
const HARVEST_PROGRESS_FIELDS: Array<keyof EditalProcessingSteps> = [
  'coletado_at',
  'edital_encontrado_at',
  'edital_processado_at',
  'ocr_processado_at',
  'materias_encontradas_at',
  'materias_processadas_at',
  'cronograma_processado_at'
];

const normalizeHarvestStatus = (status?: string | null) => {
  if (!status) return undefined;
  if (status === 'error') return 'failed';
  return status;
};

const computeHarvestProgress = (steps?: EditalProcessingSteps | null) => {
  if (!steps) return undefined;
  const total = HARVEST_PROGRESS_FIELDS.length;
  if (total === 0) return undefined;
  const completed = HARVEST_PROGRESS_FIELDS.filter((field) => Boolean(steps[field])).length;
  return Math.round((completed / total) * 100);
};

const resolveHarvestTitle = (item: any, metadata: Record<string, any>) =>
  item.title || metadata.title || metadata.titulo || 'Sem titulo';

const resolveHarvestSource = (item: any, metadata: Record<string, any>) =>
  item.source_name ||
  metadata.banca ||
  metadata.source ||
  metadata.exam_board ||
  metadata.orgao ||
  'Nao identificada';

const buildAdminHarvestItem = (item: any) => {
  const metadata = (item.metadata as Record<string, any>) || {};
  const progress = computeHarvestProgress(item.processing_steps as EditalProcessingSteps | null);
  const updatedAt =
    typeof metadata.updated_at === 'string'
      ? metadata.updated_at
      : typeof metadata.processed_at === 'string'
        ? metadata.processed_at
        : item.created_at;
  return {
    id: item.id,
    title: resolveHarvestTitle(item, metadata),
    source: resolveHarvestSource(item, metadata),
    url: item.url,
    status: normalizeHarvestStatus(item.status),
    progress,
    created_at: item.created_at,
    updated_at: updatedAt,
    metadata,
    content_type: item.content_type,
    source_id: item.source_id,
    edital_id: item.edital_id ?? null
  };
};

/**
 * Rotas de M├®tricas e Analytics
 */
/**
 * Rotas de Debug de Blueprints
 */
export async function adminDebugRoutes(app: FastifyInstance) {
  app.get('/admin/debug/blueprints', async (req, reply) => {
    try {
      const { rows } = await query<any>(
        `SELECT id, harvest_item_id, exam_code, banca, cargo, disciplina, created_at FROM exam_blueprints LIMIT 100`
      );
      return { success: true, items: rows };
    } catch (err) {
      console.error('[admin-debug] Erro:', err);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar blueprints' });
    }
  });

  app.get('/admin/debug/blueprints/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await query<any>(
        `SELECT id, harvest_item_id, exam_code, banca, cargo, disciplina, created_at, updated_at FROM exam_blueprints WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'Blueprint n├úo encontrado' });
      }
      return rows[0];
    } catch (err) {
      console.error('[admin-debug] Erro ao buscar blueprint:', err);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar blueprint' });
    }
  });
}

/**
 * Rotas de Harvest
 */
export async function adminHarvestRoutes(app: FastifyInstance) {
  app.get('/admin/harvest/items', async (req, reply) => {
    try {
      const queryParams = req.query as {
        limit?: string;
        status?: string;
        sourceId?: string;
        contentType?: string;
      };
      const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 100;
      const statusFilter =
        queryParams.status === 'failed'
          ? 'error'
          : typeof queryParams.status === 'string'
            ? queryParams.status
            : undefined;

      const content = await HarvestService.getHarvestedContent({
        limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100,
        status: statusFilter,
        sourceId: typeof queryParams.sourceId === 'string' ? queryParams.sourceId : undefined,
        contentType: typeof queryParams.contentType === 'string' ? queryParams.contentType : undefined
      });

      return { success: true, items: content.map(buildAdminHarvestItem) };
    } catch (err) {
      console.error('[admin-harvest] Erro:', err);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar harvest items' });
    }
  });

  app.get('/admin/harvest/items/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const item = await HarvestService.getHarvestedById(id);
      if (!item) {
        return reply.status(404).send({ success: false, error: 'Harvest item n├úo encontrado' });
      }
      return buildAdminHarvestItem(item);
    } catch (err) {
      console.error('[admin-harvest] Erro ao buscar harvest item:', err);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar harvest item' });
    }
  });
}

export async function adminHarvestRoutesRegister(app: FastifyInstance) {
  await adminHarvestRoutes(app);
}

/**
 * Rotas de RAG
 */
export async function adminRagRoutes(app: FastifyInstance) {
  app.get('/admin/rag/blocks', async (req, reply) => {
    try {
      const { disciplina = '*', topicCode = '*' } = req.query as any;
      const { rows } = await query<any>(
        `SELECT id, disciplina, topic_code, summary, created_at FROM rag_blocks 
         WHERE (disciplina = $1 OR $1 = '*') 
         AND (topic_code = $2 OR $2 = '*')
         LIMIT 100`,
        [disciplina, topicCode]
      );
      return { success: true, items: rows };
    } catch (err) {
      console.error('[admin-rag] Erro:', err);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar RAG blocks' });
    }
  });

  app.get('/admin/rag/blocks/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await query<any>(
        `SELECT id, disciplina, topic_code, summary, created_at, updated_at FROM rag_blocks WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'RAG block n├úo encontrado' });
      }
      return rows[0];
    } catch (err) {
      console.error('[admin-rag] Erro ao buscar RAG block:', err);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar RAG block' });
    }
  });
}

export async function adminRagRoutesRegister(app: FastifyInstance) {
  await adminRagRoutes(app);
}

/**
 * Rotas de Usu├írios
 */
export async function adminUsersRoutes(app: FastifyInstance) {
  app.get('/admin/users', async (req, reply) => {
    try {
      const { rows } = await query<any>(
        `SELECT id, email, name, created_at FROM users LIMIT 100`
      );
      return { success: true, items: rows };
    } catch (err) {
      console.error('[admin-users] Erro:', err);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar usu├írios' });
    }
  });

  app.get('/admin/debug/users', async (req, reply) => {
    try {
      const { limit = '50', offset = '0' } = req.query as {
        limit?: string;
        offset?: string;
      };

      const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);
      const parsedOffset = parseInt(offset, 10) || 0;

      console.log(`[admin-debug-users] Listando usu├írios: limit=${parsedLimit}, offset=${parsedOffset}`);

      const { rows } = await query<any>(
        `SELECT id, email, name, created_at FROM users LIMIT $1 OFFSET $2`,
        [parsedLimit, parsedOffset]
      );
      return { success: true, items: rows };
    } catch (err) {
      console.error('[admin-debug-users] Erro:', err);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar usu├írios' });
    }
  });

  app.get('/admin/users/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await query<any>(
        `SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (rows.length === 0) {
        return reply.status(404).send({ success: false, error: 'Usu├írio n├úo encontrado' });
      }
      return rows[0];
    } catch (err) {
      console.error('[admin-users] Erro ao buscar usu├írio:', err);
      return reply.status(500).send({ success: false, error: 'Erro ao buscar usu├írio' });
    }
  });
}

export async function adminMetricsRoutes(app: FastifyInstance) {
  /**
   * GET /admin/metrics/qa/summary
   * Resumo de QA por status
   * 
   * Retorna contagem de qa_reviews agrupado por status
   */
  app.get('/admin/metrics/qa/summary', async (req, reply) => {
    try {
      console.log('[admin-metrics] Buscando resumo de QA');

      const { rows } = await query<QAMetricRow>(
        `
        SELECT status, COUNT(*) AS total
        FROM qa_reviews
        GROUP BY status
        ORDER BY status ASC
        `
      );

      const summaryMap = new Map<string, number>();
      rows.forEach((row) => {
        const status = row.status || 'unknown';
        summaryMap.set(status, Number(row.total) || 0);
      });

      DEFAULT_QA_STATUSES.forEach((status) => {
        if (!summaryMap.has(status)) {
          summaryMap.set(status, 0);
        }
      });

      const items = Array.from(summaryMap.entries())
        .map(([status, total]) => ({ status, total }))
        .sort((a, b) => a.status.localeCompare(b.status));

      return { success: true, items };
    } catch (err) {
      console.error('[admin-metrics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar resumo de QA'
      });
    }
  });

  /**
   * GET /admin/metrics/overview
   * Vis├úo geral de m├®tricas do sistema
   */
  app.get('/admin/metrics/overview', async (req, reply) => {
    try {
      console.log('[admin-metrics] Buscando vis├úo geral de m├®tricas');

      // Contar usu├írios
      const { rows: userRows } = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM users'
      );
      const usersCount = parseInt(userRows[0]?.count || '0', 10);

      // Contar drops
      const { rows: dropRows } = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM drops'
      );
      const dropsCount = parseInt(dropRows[0]?.count || '0', 10);

      // Contar disciplinas
      const { rows: disciplineRows } = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM disciplines'
      );
      const disciplinesCount = parseInt(disciplineRows[0]?.count || '0', 10);

      // Contar reviews de hoje
      const { rows: reviewRows } = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM srs_reviews 
         WHERE DATE(reviewed_at) = CURRENT_DATE`
      );
      const reviewsToday = parseInt(reviewRows[0]?.count || '0', 10);

      return {
        success: true,
        usersCount,
        dropsCount,
        disciplinesCount,
        reviewsToday
      };
    } catch (err) {
      console.error('[admin-metrics] Erro ao buscar overview:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar m├®tricas'
      });
    }
  });

  /**
   * GET /admin/metrics/daily
   * M├®tricas di├írias com filtros
   * 
   * Query params:
   * - metricName: filtrar por m├®trica (opcional)
   * - days: n├║mero de dias (padr├úo: 30, m├íximo: 365)
   */
  app.get('/admin/metrics/daily', async (req, reply) => {
    try {
      const { metricName, days = '30' } = req.query as {
        metricName?: DailyMetricName;
        days?: string;
      };

      const parsedDays = Math.max(1, Math.min(parseInt(days, 10) || 30, 365));
      const metricFilter = metricName ? new Set<DailyMetricName>([metricName]) : null;

      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - (parsedDays - 1));
      const startDateISO = startDate.toISOString();

      console.log(
        `[admin-metrics] Buscando m├®tricas di├írias: metricName=${metricName ?? 'all'}, days=${parsedDays}`
      );

      const [userRows, dropRows, harvestRows, reviewRows] = await Promise.all([
        query<{ date: string; total: string }>(
          `
          SELECT DATE(created_at) AS date, COUNT(*)::text AS total
          FROM users
          WHERE created_at >= $1
          GROUP BY 1
          `,
          [startDateISO]
        ),
        query<{ date: string; total: string }>(
          `
          SELECT DATE(created_at) AS date, COUNT(*)::text AS total
          FROM drops
          WHERE created_at >= $1
          GROUP BY 1
          `,
          [startDateISO]
        ),
        query<{ date: string; total: string }>(
          `
          SELECT DATE(created_at) AS date, COUNT(*)::text AS total
          FROM harvested_content
          WHERE created_at >= $1
          GROUP BY 1
          `,
          [startDateISO]
        ),
        query<{ date: string; total: string }>(
          `
          SELECT DATE(reviewed_at) AS date, COUNT(*)::text AS total
          FROM srs_reviews
          WHERE reviewed_at >= $1
          GROUP BY 1
          `,
          [startDateISO]
        )
      ]);

      const dateSeries = buildDateSeries(parsedDays);
      const metricsMap: Record<DailyMetricName, Map<string, number>> = {
        users_new: rowsToDailyMap(userRows.rows),
        drops_created: rowsToDailyMap(dropRows.rows),
        harvested_content: rowsToDailyMap(harvestRows.rows),
        reviews_completed: rowsToDailyMap(reviewRows.rows)
      };

      const result: DailyMetricRow[] = [];
      dateSeries.forEach((date) => {
        (Object.keys(metricsMap) as DailyMetricName[]).forEach((name) => {
          if (metricFilter && !metricFilter.has(name)) {
            return;
          }
          const value = metricsMap[name].get(date) ?? 0;
          result.push({
            date,
            metric_name: name,
            metric_value: value.toString()
          });
        });
      });

      return { success: true, items: result };
    } catch (err) {
      console.error('[admin-metrics] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar m├®tricas di├írias'
      });
    }
  });
}

function rowsToDailyMap(rows: Array<{ date: string; total: string }>): Map<string, number> {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    if (row?.date) {
      map.set(row.date, Number(row.total) || 0);
    }
  });
  return map;
}

function buildDateSeries(days: number): string[] {
  const series: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    series.push(date.toISOString().split('T')[0]);
  }
  return series;
}
