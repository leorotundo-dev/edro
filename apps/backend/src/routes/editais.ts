import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { editalRepository } from '../repositories/editalRepository';
import { HarvestService } from '../services/harvestService';
import { JobService } from '../services/jobService';
import { FileStorageService } from '../services/fileStorage';
import { getPdfCacheByUrl, listPdfCacheByEdital } from '../services/editalPdfCacheService';
import { getProbabilityHeatmap } from '../services/editalHeatmapService';
import { generateAutoFormacao } from '../services/autoFormacaoService';
import { buildMacroSchedule } from '../services/studyScheduleService';
import { buildTopicCodeKey } from '../utils/topicCode';
import { PaywallService } from '../services/paywallService';
import { query } from '../db';
import { createReadStream } from 'fs';
import path from 'path';
import type {
  CreateEditalDTO,
  UpdateEditalDTO,
  CreateEventoDTO,
  EditalFilters,
  Edital,
  EditalStatus,
} from '../types/edital';


type PlanCode = 'free' | 'pro' | 'turbo';

const EDITAL_LIMITS: Record<PlanCode, number | null> = {
  free: 1,
  pro: null,
  turbo: null,
};

const normalizePlanCode = (plan?: string | null): PlanCode => {
  const normalized = String(plan || '').trim().toLowerCase();
  if (!normalized || ['free', 'gratis', 'gratuito', 'base'].includes(normalized)) return 'free';
  if (['turbo', 'elite'].includes(normalized)) return 'turbo';
  if (['pro', 'premium', 'premium_month', 'premium_year'].includes(normalized)) return 'pro';
  return 'pro';
};

async function getCheapestPaidPlan() {
  try {
    const { rows } = await query<{ code: string; name: string; price_cents: number | null }>(
      `
        SELECT code, name, price_cents
        FROM plans
        WHERE price_cents IS NOT NULL
          AND price_cents > 0
        ORDER BY price_cents ASC
        LIMIT 1
      `
    );
    const row = rows[0];
    if (!row) return null;
    const price = Number(row.price_cents);
    return {
      code: row.code,
      name: row.name,
      price: Number.isFinite(price) ? price / 100 : null,
      currency: 'BRL',
    };
  } catch {
    return null;
  }
}

export default async function editaisRoutes(app: FastifyInstance) {
  // =============== EDITAIS ===============

  // Listar todos os editais com filtros
  app.get('/editais', async (request: FastifyRequest<{ Querystring: EditalFilters }>, reply: FastifyReply) => {
    try {
      const filters = request.query;
      const editais = await editalRepository.findAll(filters);
      
      return reply.send({
        success: true,
        data: editais,
        count: editais.length,
      });
    } catch (error) {
      console.error('Erro ao listar editais:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao listar editais',
      });
    }
  });

  // Listar editais acompanhados por um usuario
  app.get('/editais/interesses', async (
    request: FastifyRequest<{ Querystring: { user_id?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = request.query.user_id || (request as any).user?.id || (request as any).user?.sub;
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'user_id obrigatorio',
        });
      }

      const editais = await editalRepository.findInteressesByUserId(userId);
      return reply.send({
        success: true,
        data: editais,
        count: editais.length,
      });
    } catch (error) {
      console.error('Erro ao listar interesses:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao listar interesses',
      });
    }
  });

  // Buscar edital por ID
  app.get('/editais/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const edital = await editalRepository.findById(id);

      if (!edital) {
        const harvested = await HarvestService.getHarvestedById(id);
        if (!harvested) {
          return reply.status(404).send({
            success: false,
            error: 'Edital não encontrado',
          });
        }

        return reply.send({
          success: true,
          data: mapHarvestToEdital(harvested),
        });
      }

      return reply.send({
        success: true,
        data: edital,
      });
    } catch (error) {
      console.error('Erro ao buscar edital:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar edital',
      });
    }
  });

  // Criar novo edital
  app.post('/editais', async (request: FastifyRequest<{ Body: CreateEditalDTO }>, reply: FastifyReply) => {
    try {
      const data = request.body;

      // Validações básicas
      if (!data.codigo || !data.titulo || !data.orgao) {
        return reply.status(400).send({
          success: false,
          error: 'Campos obrigatórios: codigo, titulo, orgao',
        });
      }

      // Verificar se o código já existe
      const existente = await editalRepository.findByCodigo(data.codigo);
      if (existente) {
        return reply.status(409).send({
          success: false,
          error: 'Já existe um edital com este código',
        });
      }

      // @ts-ignore - userId pode vir de middleware de autenticação
      const userId = request.user?.id;
      const edital = await editalRepository.create(data, userId);

      return reply.status(201).send({
        success: true,
        data: edital,
      });
    } catch (error) {
      console.error('Erro ao criar edital:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar edital',
      });
    }
  });

  // Atualizar edital
  app.put('/editais/:id', async (
    request: FastifyRequest<{ Params: { id: string }; Body: Partial<CreateEditalDTO> }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const updates = request.body;

      const existente = await editalRepository.findById(id);
      if (!existente) {
        return reply.status(404).send({
          success: false,
          error: 'Edital não encontrado',
        });
      }

      const realId = existente.id;
      // @ts-ignore
      const userId = request.user?.id;
      const edital = await editalRepository.update({ id: realId, ...updates }, userId);
      await HarvestService.refreshEditalProcessingSteps(realId);

      return reply.send({
        success: true,
        data: edital,
      });
    } catch (error) {
      console.error('Erro ao atualizar edital:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar edital',
      });
    }
  });

  // Reprocessar edital com base no conteudo coletado
  app.post('/editais/:id/reprocess', async (
    request: FastifyRequest<{ Params: { id: string }; Body?: { forceExtraction?: boolean; forcePdf?: boolean } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const forceExtraction = Boolean(request.body?.forceExtraction);
      const forcePdf = Boolean(request.body?.forcePdf);
      const edital = await editalRepository.findById(id);
      const workersEnabled = process.env.ENABLE_WORKERS === 'true';
      let harvestId: string | null = null;

      if (!edital) {
        const harvested = await HarvestService.getHarvestedById(id);
        if (!harvested) {
          return reply.status(404).send({
            success: false,
            error: 'Edital nao encontrado',
          });
        }
        harvestId = harvested.id;
      } else {
        const realId = edital.id;
        const { query } = await import('../db');

        const byMeta = await query<{ id: string }>(
          `SELECT id
           FROM harvested_content
           WHERE metadata->>'edital_id' = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [realId]
        );
        if (byMeta.rows.length) {
          harvestId = byMeta.rows[0].id;
        }

        if (!harvestId && edital.link_edital_completo) {
          const link = edital.link_edital_completo;
          const byLink = await query<{ id: string }>(
            `SELECT id
             FROM harvested_content
             WHERE url = $1
                OR metadata->>'link_edital_completo' = $1
                OR metadata->>'original_url' = $1
                OR metadata->>'edital_url' = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [link]
          );
          if (byLink.rows.length) {
            harvestId = byLink.rows[0].id;
          }
        }
      }

      if (!harvestId) {
        return reply.status(404).send({
          success: false,
          error: 'Conteudo coletado nao encontrado para este edital',
        });
      }

      if (!workersEnabled) {
        return reply.status(409).send({
          success: false,
          error: 'Workers desabilitados. Defina ENABLE_WORKERS=true para reprocessamento assincrono.',
        });
      }

      const jobId = await JobService.createJob({
        name: `Reprocessar edital ${edital?.id || harvestId}`,
        type: 'reprocess_edital',
        data: {
          harvestId,
          editalId: edital?.id || null,
          forceExtraction,
          pdfOnly: forcePdf,
        },
        priority: 8,
        maxAttempts: 1,
      });

      return reply.status(202).send({
        success: true,
        data: {
          job_id: jobId,
          harvest_id: harvestId,
          edital_id: edital?.id || null,
        },
        message: 'Reprocessamento iniciado',
      });
    } catch (error) {
      console.error('Erro ao reprocessar edital:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao reprocessar edital',
      });
    }
  });

  // Deletar edital
  app.delete('/editais/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const existente = await editalRepository.findById(id);
      if (existente) {
        await editalRepository.delete(existente.id);
      } else {
        const deletedHarvest = await HarvestService.deleteHarvestedById(id);
        if (!deletedHarvest) {
          return reply.status(404).send({
            success: false,
            error: 'Edital não encontrado',
          });
        }
      }

      return reply.send({
        success: true,
        message: 'Edital deletado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar edital:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao deletar edital',
      });
    }
  });

  // Obter estatísticas de todos os editais
  app.get('/editais-stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await editalRepository.getStats();
      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao obter estatísticas',
      });
    }
  });

  // Obter estatísticas de um edital específico
  app.get('/editais/:id/stats', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const existente = await editalRepository.findById(id);
      if (!existente) {
        return reply.status(404).send({
          success: false,
          error: 'Estatísticas não encontradas',
        });
      }
      const stats = await editalRepository.getStatById(existente.id);

      if (!stats) {
        return reply.status(404).send({
          success: false,
          error: 'Estatísticas não encontradas',
        });
      }

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao obter estatísticas',
      });
    }
  });

  // Buscar ultimo job associado ao edital
  app.get('/editais/:id/jobs/latest', async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { type?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { type } = request.query;

      const { rows } = await query(
        `
          SELECT *
          FROM jobs
          WHERE (data->>'editalId' = $1 OR data->>'edital_id' = $1)
            AND ($2::text IS NULL OR type = $2)
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [id, type ?? null]
      );

      if (!rows.length) {
        return reply.send({
          success: true,
          data: null,
        });
      }

      return reply.send({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      console.error('Erro ao buscar job do edital:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar job do edital',
      });
    }
  });

  // Gerar plano macro do edital
  app.get('/editais/:id/macro-plan', async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { user_id?: string; start_date?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const userId = request.query.user_id || (request as any).user?.id || (request as any).user?.sub;

      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'user_id obrigatorio',
        });
      }

      const schedule = await buildMacroSchedule({
        editalId: id,
        userId,
        startDate: request.query.start_date,
      });

      return reply.send({
        success: true,
        data: schedule,
      });
    } catch (error) {
      console.error('Erro ao gerar plano macro:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao gerar plano macro',
      });
    }
  });

  // Progresso por materias do edital
  app.get('/editais/:id/materias-progress', async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { user_id?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const userId = request.query.user_id || (request as any).user?.id || (request as any).user?.sub;
      if (!userId) {
        return reply.status(400).send({ success: false, error: 'user_id obrigatorio' });
      }

      const edital = await editalRepository.findById(id);
      if (!edital) {
        return reply.status(404).send({ success: false, error: 'Edital nao encontrado' });
      }

      const autoFormacao = await generateAutoFormacao({ editalId: id, userId });
      const payloadRaw = autoFormacao?.payload;
      const payload = typeof payloadRaw === 'string'
        ? (() => {
            try {
              return JSON.parse(payloadRaw);
            } catch {
              return {};
            }
          })()
        : (payloadRaw ?? {});

      const drops = Array.isArray(payload?.drops) ? payload.drops : [];
      const disciplinasMeta = Array.isArray(edital.disciplinas) ? edital.disciplinas : [];

      const normalize = (value: unknown) => String(value || '').trim();
      const keyOf = (value: unknown) => normalize(value).toLowerCase();

      const disciplinaMetaMap = new Map<string, { peso?: number | null; numero_questoes?: number | null }>();
      disciplinasMeta.forEach((disc: any) => {
        const nome = normalize(disc?.nome || disc?.name);
        if (!nome) return;
        disciplinaMetaMap.set(keyOf(nome), {
          peso: typeof disc?.peso === 'number' ? disc.peso : null,
          numero_questoes: typeof disc?.numero_questoes === 'number' ? disc.numero_questoes : null,
        });
      });

      const topicEntries = drops
        .map((drop: any) => {
          const disciplina = normalize(drop?.disciplina) || 'Disciplina';
          const subtopico = normalize(drop?.subtopico) || normalize(drop?.topic) || 'Conteudo';
          const topicCode = buildTopicCodeKey(disciplina, subtopico);
          return { disciplina, subtopico, topicCode };
        })
        .filter((entry) => entry.topicCode);

      const topicCodes = Array.from(new Set(topicEntries.map((entry) => entry.topicCode)));

      if (!topicCodes.length) {
        return reply.send({
          success: true,
          data: {
            edital_id: id,
            user_id: userId,
            disciplinas: [],
          },
        });
      }

      const { rows: dropRows } = await query<{ topic_code: string; total: string }>(
        `
          SELECT topic_code, COUNT(*) as total
          FROM drops
          WHERE topic_code = ANY($1)
          GROUP BY topic_code
        `,
        [topicCodes]
      );

      const { rows: completedRows } = await query<{ topic_code: string; total: string }>(
        `
          SELECT d.topic_code, COUNT(*) as total
          FROM user_drops ud
          JOIN drops d ON d.id = ud.drop_id
          WHERE ud.user_id = $1
            AND ud.status = 'done'
            AND d.topic_code = ANY($2)
          GROUP BY d.topic_code
        `,
        [userId, topicCodes]
      );

      const { rows: questionRows } = await query<{ topic_code: string; answered: string; correct: string }>(
        `
          SELECT d.topic_code,
                 COUNT(*) as answered,
                 COUNT(*) FILTER (WHERE el.was_correct) as correct
          FROM exam_logs el
          JOIN drops d ON d.id = el.drop_id
          WHERE el.user_id = $1
            AND d.topic_code = ANY($2)
          GROUP BY d.topic_code
        `,
        [userId, topicCodes]
      );

      const dropMap = new Map<string, number>();
      dropRows.forEach((row) => dropMap.set(row.topic_code, Number(row.total || 0)));

      const completedMap = new Map<string, number>();
      completedRows.forEach((row) => completedMap.set(row.topic_code, Number(row.total || 0)));

      const questionMap = new Map<string, { answered: number; correct: number }>();
      questionRows.forEach((row) =>
        questionMap.set(row.topic_code, {
          answered: Number(row.answered || 0),
          correct: Number(row.correct || 0),
        })
      );

      const disciplinasMap = new Map<string, any>();

      topicEntries.forEach((entry) => {
        const discKey = keyOf(entry.disciplina);
        const meta = disciplinaMetaMap.get(discKey);
        if (!disciplinasMap.has(discKey)) {
          disciplinasMap.set(discKey, {
            disciplina: entry.disciplina,
            peso: meta?.peso ?? null,
            numero_questoes: meta?.numero_questoes ?? null,
            total_conteudos: 0,
            drops_gerados: 0,
            concluidos: 0,
            progresso: 0,
            questoes_respondidas: 0,
            questoes_corretas: 0,
            taxa_acerto: null,
            subtopicos: new Map<string, any>(),
          });
        }

        const disc = disciplinasMap.get(discKey);
        const dropCount = dropMap.get(entry.topicCode) ?? 0;
        const completed = completedMap.get(entry.topicCode) ?? 0;
        const questions = questionMap.get(entry.topicCode) ?? { answered: 0, correct: 0 };
        const totalConteudos = 1;

        const subKey = keyOf(entry.subtopico);
        const subExisting = disc.subtopicos.get(subKey);
        const nextSub = subExisting || {
          subtopico: entry.subtopico,
          assunto: null,
          total_conteudos: 0,
          drops_gerados: 0,
          concluidos: 0,
          progresso: 0,
          questoes_respondidas: 0,
          questoes_corretas: 0,
          taxa_acerto: null,
        };

        nextSub.total_conteudos += totalConteudos;
        nextSub.drops_gerados += dropCount;
        nextSub.concluidos += completed;
        nextSub.questoes_respondidas += questions.answered;
        nextSub.questoes_corretas += questions.correct;
        const subDenom = nextSub.drops_gerados || nextSub.total_conteudos;
        nextSub.progresso = subDenom > 0 ? (nextSub.concluidos / subDenom) * 100 : 0;
        nextSub.taxa_acerto =
          nextSub.questoes_respondidas > 0
            ? (nextSub.questoes_corretas / nextSub.questoes_respondidas) * 100
            : null;

        disc.subtopicos.set(subKey, nextSub);

        disc.total_conteudos += totalConteudos;
        disc.drops_gerados += dropCount;
        disc.concluidos += completed;
        disc.questoes_respondidas += questions.answered;
        disc.questoes_corretas += questions.correct;
      });

      const disciplinas = Array.from(disciplinasMap.values()).map((disc: any) => {
        const denom = disc.drops_gerados || disc.total_conteudos;
        const progresso = denom > 0 ? (disc.concluidos / denom) * 100 : 0;
        const taxaAcerto =
          disc.questoes_respondidas > 0
            ? (disc.questoes_corretas / disc.questoes_respondidas) * 100
            : null;
        return {
          ...disc,
          progresso,
          taxa_acerto: taxaAcerto,
          subtopicos: Array.from(disc.subtopicos.values()),
        };
      });

      return reply.send({
        success: true,
        data: {
          edital_id: id,
          user_id: userId,
          disciplinas,
        },
      });
    } catch (error) {
      console.error('Erro ao montar progresso de materias:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar progresso de materias',
      });
    }
  });

  // =============== EVENTOS ===============

  // Listar eventos de um edital
  app.get('/editais/:id/eventos', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const existing = await editalRepository.findById(id);
      if (!existing) {
        const harvested = await HarvestService.getHarvestedById(id);
        if (harvested) {
          return reply.send({
            success: true,
            data: [],
            count: 0,
          });
        }
      }
      const resolvedId = existing?.id ?? id;
      const eventos = await editalRepository.findEventosByEditalId(resolvedId);

      return reply.send({
        success: true,
        data: eventos,
        count: eventos.length,
      });
    } catch (error) {
      console.error('Erro ao listar eventos:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao listar eventos',
      });
    }
  });

  // Criar evento para um edital
  app.post('/editais/:id/eventos', async (
    request: FastifyRequest<{ Params: { id: string }; Body: Omit<CreateEventoDTO, 'edital_id'> }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const eventoData = request.body;

      const edital = await editalRepository.findById(id);
      if (!edital) {
        return reply.status(404).send({
          success: false,
          error: 'Edital não encontrado',
        });
      }

      const realId = edital.id;
      const evento = await editalRepository.createEvento({
        edital_id: realId,
        ...eventoData,
      });
      await HarvestService.refreshEditalProcessingSteps(realId, { hasCronograma: true });

      return reply.status(201).send({
        success: true,
        data: evento,
      });
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar evento',
      });
    }
  });

  // Atualizar evento
  app.put('/editais/eventos/:eventoId', async (
    request: FastifyRequest<{ Params: { eventoId: string }; Body: Partial<CreateEventoDTO> }>,
    reply: FastifyReply
  ) => {
    try {
      const { eventoId } = request.params;
      const updates = request.body;

      const evento = await editalRepository.updateEvento(eventoId, updates);

      if (!evento) {
        return reply.status(404).send({
          success: false,
          error: 'Evento não encontrado',
        });
      }
      await HarvestService.refreshEditalProcessingSteps(evento.edital_id, { hasCronograma: true });

      return reply.send({
        success: true,
        data: evento,
      });
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar evento',
      });
    }
  });

  // Deletar evento
  app.delete('/editais/eventos/:eventoId', async (
    request: FastifyRequest<{ Params: { eventoId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { eventoId } = request.params;
      const { rows } = await query<{ edital_id: string }>(
        'SELECT edital_id FROM edital_eventos WHERE id = $1',
        [eventoId]
      );
      const editalId = rows[0]?.edital_id;
      const deleted = await editalRepository.deleteEvento(eventoId);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: 'Evento não encontrado',
        });
      }
      if (editalId) {
        await HarvestService.refreshEditalProcessingSteps(editalId);
      }

      return reply.send({
        success: true,
        message: 'Evento deletado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar evento:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao deletar evento',
      });
    }
  });

  // =============== UPLOAD DE PDF (DATA URL) ===============
  app.post('/editais/:id/upload-pdf', async (
    request: FastifyRequest<{ Params: { id: string }; Body: { base64: string; filename?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { base64 } = request.body || {};

      if (!base64 || !base64.startsWith('data:application/pdf')) {
        return reply.status(400).send({
          success: false,
          error: 'Envie o PDF como data URL (data:application/pdf;base64,...)',
        });
      }

      const existing = await editalRepository.findById(id);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Edital não encontrado',
        });
      }

      const realId = existing.id;

      const filename = request.body?.filename || 'edital.pdf';
      const prefix = FileStorageService.buildEditalStoragePrefix({
        banca: (existing as any)?.banca,
        publication: (existing as any)?.data_publicacao,
        editalId: realId,
      });
      const publicUrl = await FileStorageService.saveEditalPdf(base64, realId, filename, { prefix });
      const arquivos = Array.isArray(existing.arquivos) ? existing.arquivos : [];
      const hasArquivo = arquivos.some((arquivo) => arquivo?.url === publicUrl);
      const nextArquivos = hasArquivo
        ? arquivos
        : [
            ...arquivos,
            {
              nome: filename.replace(/\.pdf$/i, ''),
              url: publicUrl,
              tipo: 'edital',
              data_upload: new Date().toISOString(),
            },
          ];
      const updated = await editalRepository.update(
        { id: realId, link_edital_completo: publicUrl, arquivos: nextArquivos },
        // @ts-ignore
        request.user?.id
      );
      await HarvestService.refreshEditalProcessingSteps(realId, { hasEditalPdf: true });

      return reply.send({
        success: true,
        data: {
          link_edital_completo: updated?.link_edital_completo || publicUrl,
          storage: FileStorageService.s3Enabled ? 's3' : 'local',
        },
      });
    } catch (error) {
      console.error('Erro ao salvar PDF do edital:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao salvar PDF do edital',
      });
    }
  });

  // Servir PDF salvo
  app.get('/editais/:id/pdf', async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { file: string } }>,
    reply: FastifyReply
  ) => {
    const { file } = request.query;
    if (!file) {
      return reply.status(400).send({ success: false, error: 'Arquivo n\u00e3o informado' });
    }
    const pdfPath = await FileStorageService.getEditalPdfPath(file);
    if (!pdfPath) {
      return reply.status(404).send({ success: false, error: 'PDF n\u00e3o encontrado' });
    }
    reply.header('Content-Disposition', `inline; filename=\"${path.basename(file)}\"`);
    return reply.type('application/pdf').send(createReadStream(pdfPath));
  });


  // Cache de PDFs processados para este edital
  app.get('/editais/:id/cache', async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { url?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { url } = request.query;
      const edital = await editalRepository.findById(id);
      if (!edital) {
        return reply.status(404).send({
          success: false,
          error: 'Edital nao encontrado',
        });
      }

      let entries = await listPdfCacheByEdital(edital.id, { url });
      if (!entries.length && url) {
        const fallback = await getPdfCacheByUrl(url);
        entries = fallback ? [fallback] : [];
      }

      return reply.send({
        success: true,
        data: entries,
        count: entries.length,
      });
    } catch (error) {
      console.error('Erro ao buscar cache de PDF:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar cache de PDF',
      });
    }
  });
  // =============== USUÁRIOS INTERESSADOS ===============

  // Listar usuários interessados em um edital
  app.get('/editais/:id/usuarios', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const existing = await editalRepository.findById(id);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Edital nÇœo encontrado',
        });
      }
      const usuarios = await editalRepository.findUsuariosByEditalId(existing.id);

      return reply.send({
        success: true,
        data: usuarios,
        count: usuarios.length,
      });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao listar usuários',
      });
    }
  });

  // Adicionar interesse em um edital
  app.post('/editais/:id/interesse', async (
    request: FastifyRequest<{ Params: { id: string }; Body: { user_id?: string; cargo_interesse?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { cargo_interesse } = request.body || {};
      const userId = (request.body as any)?.user_id || (request as any).user?.id || (request as any).user?.sub;
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'user_id obrigatorio',
        });
      }

      const edital = await editalRepository.findById(id);
      if (!edital) {
        return reply.status(404).send({
          success: false,
          error: 'Edital não encontrado',
        });
      }

      const realId = edital.id;
      const plan = normalizePlanCode((request as any).user?.plan ?? null);
      const maxEditais = EDITAL_LIMITS[plan];

      if (maxEditais !== null) {
        const { rows: existingRows } = await query<{ exists: number }>(
          'SELECT 1 FROM edital_usuarios WHERE edital_id = $1 AND user_id = $2 LIMIT 1',
          [realId, userId]
        );

        if (!existingRows.length) {
          const { rows: countRows } = await query<{ count: number }>(
            'SELECT COUNT(*)::int AS count FROM edital_usuarios WHERE user_id = $1',
            [userId]
          );
          const currentCount = Number(countRows[0]?.count || 0);

          if (currentCount >= maxEditais) {
            const offer = await getCheapestPaidPlan();
            void PaywallService.logPaywallEvent({
              userId,
              trigger: 'edital_limit',
              action: 'blocked',
              metadata: {
                plan,
                limit: maxEditais,
                current: currentCount,
                editalId: realId,
              },
            });

            return reply.status(402).send({
              success: false,
              error: 'Seu plano permite acompanhar apenas 1 edital gratuito. Atualize o plano para liberar mais editais.',
              code: 'PLAN_EDITAIS_LIMIT',
              plan,
              limit: maxEditais,
              current: currentCount,
              paywall: {
                plan,
                feature: 'editais_limit',
                limit: maxEditais,
                current: currentCount,
                suggestedPlan: plan === 'free' ? 'pro' : null,
                upgradeUrl: process.env.PAYWALL_UPGRADE_URL || null,
                offer,
              },
            });
          }
        }
      }

      const interesse = await editalRepository.addUsuario(realId, userId, cargo_interesse);
      let jobId: string | null = null;

      if (process.env.ENABLE_WORKERS === 'true') {
        try {
          jobId = await JobService.createJob({
            name: `Gerar questoes edital ${realId}`,
            type: 'generate_questions',
            data: {
              editalId: realId,
              userId,
            },
            priority: 7,
            maxAttempts: 1,
          });
        } catch (err) {
          console.warn('[editais] Falha ao agendar geracao de questoes:', (err as any)?.message);
        }
      }

      return reply.status(201).send({
        success: true,
        data: interesse,
        job_id: jobId,
      });
    } catch (error) {
      console.error('Erro ao adicionar interesse:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao adicionar interesse',
      });
    }
  });

  // Remover interesse em um edital
  app.delete('/editais/:id/interesse/:userId', async (
    request: FastifyRequest<{ Params: { id: string; userId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id, userId } = request.params;
      const edital = await editalRepository.findById(id);
      if (!edital) {
        return reply.status(404).send({
          success: false,
          error: 'Edital nÇœo encontrado',
        });
      }
      const removed = await editalRepository.removeUsuario(edital.id, userId);

      if (!removed) {
        return reply.status(404).send({
          success: false,
          error: 'Interesse não encontrado',
        });
      }

      return reply.send({
        success: true,
        message: 'Interesse removido com sucesso',
      });
    } catch (error) {
      console.error('Erro ao remover interesse:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao remover interesse',
      });
    }
  });

  app.delete('/editais/:id/interesse', async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { user_id?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const userId = request.query.user_id || (request as any).user?.id || (request as any).user?.sub;
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'user_id obrigatorio',
        });
      }

      const edital = await editalRepository.findById(id);
      if (!edital) {
        return reply.status(404).send({
          success: false,
          error: 'Edital nao encontrado',
        });
      }

      const removed = await editalRepository.removeUsuario(edital.id, userId);

      if (!removed) {
        return reply.status(404).send({
          success: false,
          error: 'Interesse nao encontrado',
        });
      }

      return reply.send({
        success: true,
        message: 'Interesse removido com sucesso',
      });
    } catch (error) {
      console.error('Erro ao remover interesse:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao remover interesse',
      });
    }
  });

  app.patch('/editais/:id/interesse', async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: { user_id?: string; cargo_interesse?: string | null; notificacoes_ativas?: boolean };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const userId = request.body?.user_id || (request as any).user?.id || (request as any).user?.sub;
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'user_id obrigatorio',
        });
      }

      const edital = await editalRepository.findById(id);
      if (!edital) {
        return reply.status(404).send({
          success: false,
          error: 'Edital nao encontrado',
        });
      }

      const updated = await editalRepository.updateUsuarioInteresse(edital.id, userId, {
        cargo_interesse: request.body?.cargo_interesse,
        notificacoes_ativas: request.body?.notificacoes_ativas,
      });

      if (!updated) {
        return reply.status(404).send({
          success: false,
          error: 'Interesse nao encontrado',
        });
      }

      return reply.send({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error('Erro ao atualizar interesse:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar interesse',
      });
    }
  });

  // =============== RELATÓRIOS E DASHBOARDS ===============

  // Contagem por status
  app.get('/editais/reports/by-status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await editalRepository.countByStatus();
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao gerar relatório',
      });
    }
  });

  // Contagem por banca
  app.get('/editais/reports/by-banca', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await editalRepository.countByBanca();
      return reply.send({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao gerar relatório',
      });
    }
  });

  // Próximas provas
  app.get('/editais/reports/proximas-provas', async (
    request: FastifyRequest<{ Querystring: { limit?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 10;
      const data = await editalRepository.getProximasProvas(limit);
      return reply.send({
        success: true,
        data,
        count: data.length,
      });
    } catch (error) {
      console.error('Erro ao buscar próximas provas:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar próximas provas',
      });
    }
  });

  // Heatmap simples por banca e status
  app.get('/editais/reports/heatmap', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows } = await (await import('../db')).query<{
        banca: string | null;
        status: string;
        total: number;
      }>(`
        SELECT
          COALESCE(banca, 'N/A') as banca,
          status,
          COUNT(*) as total
        FROM editais
        GROUP BY banca, status
        ORDER BY banca, status
      `);

      return reply.send({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error('Erro ao gerar heatmap:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao gerar heatmap',
      });
    }
  });

  // Heatmap de probabilidade por banca/subtopico
  app.get('/editais/reports/heatmap-probabilidade', async (
    request: FastifyRequest<{ Querystring: { banca?: string; min_count?: string; limit?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const banca = request.query.banca;
      const minCountRaw = request.query.min_count ? parseInt(request.query.min_count, 10) : undefined;
      const limitRaw = request.query.limit ? parseInt(request.query.limit, 10) : undefined;
      const minCount = Number.isFinite(minCountRaw) ? minCountRaw : undefined;
      const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;

      const data = await getProbabilityHeatmap({
        banca,
        minCount,
        limit,
      });

      return reply.send({
        success: true,
        data,
        count: data.length,
      });
    } catch (error) {
      console.error('Erro ao gerar heatmap de probabilidade:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao gerar heatmap de probabilidade',
      });
    }
  });

  // Previsão de prova (top N datas futuras)
  app.get('/editais/reports/previsao-provas', async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 10;
      const { rows } = await (await import('../db')).query<{
        id: string;
        titulo: string;
        banca: string | null;
        data_prova_prevista: Date | null;
        status: string;
      }>(`
        SELECT id, titulo, banca, data_prova_prevista, status
        FROM editais
        WHERE data_prova_prevista IS NOT NULL
          AND data_prova_prevista > NOW()
        ORDER BY data_prova_prevista ASC
        LIMIT $1
      `, [limit]);

      return reply.send({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error('Erro ao gerar previsão de provas:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao gerar previsão de provas',
      });
    }
  });

  // Auto-formacoes v2 (modulos/trilhas/blocos/drops N1-N5)
  app.get('/editais/:id/auto-formacoes', async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { user_id?: string; refresh?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const userId = request.query.user_id || (request as any).user?.id || (request as any).user?.sub;
      const refresh = request.query.refresh === 'true' || request.query.refresh === '1';
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'user_id obrigatorio',
        });
      }

      const autoFormacao = await generateAutoFormacao({ editalId: id, userId, force: refresh });
      let payload: any = autoFormacao.payload || {};
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = {};
        }
      }

      return reply.send({
        success: true,
        data: payload,
        meta: {
          version: autoFormacao.version,
          source_hash: autoFormacao.source_hash,
          updated_at: autoFormacao.updated_at,
        },
      });
    } catch (error: any) {
      if (error?.message === 'edital_not_found') {
        return reply.status(404).send({
          success: false,
          error: 'Edital nao encontrado',
        });
      }
      console.error('Erro ao gerar auto-formacoes:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao gerar auto-formacoes',
      });
    }
  });

  app.post('/editais/:id/auto-formacoes', async (
    request: FastifyRequest<{ Params: { id: string }; Body: { user_id?: string; force?: boolean } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const userId = request.body?.user_id || (request as any).user?.id || (request as any).user?.sub;
      const force = Boolean(request.body?.force);
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'user_id obrigatorio',
        });
      }

      const autoFormacao = await generateAutoFormacao({ editalId: id, userId, force });
      let payload: any = autoFormacao.payload || {};
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = {};
        }
      }

      return reply.send({
        success: true,
        data: payload,
        meta: {
          version: autoFormacao.version,
          source_hash: autoFormacao.source_hash,
          updated_at: autoFormacao.updated_at,
        },
      });
    } catch (error: any) {
      if (error?.message === 'edital_not_found') {
        return reply.status(404).send({
          success: false,
          error: 'Edital nao encontrado',
        });
      }
      console.error('Erro ao gerar auto-formacoes:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao gerar auto-formacoes',
      });
    }
  });

}

const VALID_EDITAL_STATUSES = new Set<EditalStatus>([
  'rascunho',
  'publicado',
  'em_andamento',
  'suspenso',
  'cancelado',
  'concluido',
]);

function normalizeEditalStatus(value?: string): EditalStatus {
  if (!value) return 'rascunho';
  const normalized = value.toLowerCase().trim() as EditalStatus;
  return VALID_EDITAL_STATUSES.has(normalized) ? normalized : 'rascunho';
}

function parseCurrencyValue(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function numberOrZero(value: any): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function hasEditalAttachment(link?: string, arquivos?: any[]): boolean {
  if (link && /\.pdf(\?|$)/i.test(link)) return true;
  const list = Array.isArray(arquivos) ? arquivos : [];
  return list.some((arquivo) => {
    const tipo = (arquivo?.tipo || '').toLowerCase();
    const nome = (arquivo?.nome || '').toLowerCase();
    const url = (arquivo?.url || '').toLowerCase();
    return tipo === 'edital' || nome.includes('edital') || url.includes('.pdf');
  });
}

function deriveArquivosFromLinks(meta: any): any[] {
  const rawLinks = [
    ...(Array.isArray(meta?.pdf_links) ? meta.pdf_links : []),
    ...(Array.isArray(meta?.provas_links) ? meta.provas_links : []),
    ...(Array.isArray(meta?.provasLinks) ? meta.provasLinks : [])
  ];
  if (meta?.provas_url) {
    rawLinks.push({ url: meta.provas_url, label: 'prova', kind: 'prova' });
  }

  const normalized = new Map<string, any>();
  for (const item of rawLinks) {
    const url = typeof item === 'string' ? item : item?.url;
    if (!url) continue;
    if (normalized.has(url)) continue;
    const label = (item?.label || '').trim();
    const kind = (item?.kind || label || '').toLowerCase();
    normalized.set(url, {
      url,
      nome: label || url.split('/').pop(),
      tipo: kind || 'pdf'
    });
  }
  return Array.from(normalized.values());
}

function mapHarvestToEdital(h: any): Edital {
  const meta = h.metadata || {};
  const asDate = (value?: any) => {
    if (!value) return undefined;
    try {
      return new Date(value).toISOString();
    } catch {
      return undefined;
    }
  };
  const cargos = Array.isArray(meta.cargos) ? meta.cargos : [];
  const disciplinas = Array.isArray(meta.disciplinas) ? meta.disciplinas : [];
  const conteudo = meta.conteudo_programatico && typeof meta.conteudo_programatico === 'object'
    ? meta.conteudo_programatico
    : {};
  const arquivos = Array.isArray(meta.arquivos) && meta.arquivos.length
    ? meta.arquivos
    : deriveArquivosFromLinks(meta);
  const pdfExtraction = meta.pdf_extraction && typeof meta.pdf_extraction === 'object'
    ? meta.pdf_extraction
    : null;
  const linkEd = meta.link_edital_completo || meta.edital_url || meta.original_url || h.url;
  const collectedAt = asDate(h.created_at) || new Date().toISOString();
  const hasMaterias = disciplinas.length > 0;
  const hasConteudo = Object.keys(conteudo || {}).length > 0;
  const hasEdital = hasEditalAttachment(linkEd, arquivos);
  const hasProcessado = Boolean(meta.descricao || meta.data_publicacao || meta.data_prova_prevista || meta.numero_vagas);
  const processing_steps = {
    coletado_at: collectedAt,
    edital_encontrado_at: hasEdital ? collectedAt : null,
    edital_processado_at: hasProcessado ? collectedAt : null,
    ocr_processado_at: pdfExtraction ? collectedAt : null,
    ocr_status: pdfExtraction?.status ?? null,
    ocr_method: pdfExtraction?.method ?? null,
    ocr_words: typeof pdfExtraction?.words === 'number' ? pdfExtraction.words : null,
    ocr_used: typeof pdfExtraction?.ocr_used === 'boolean' ? pdfExtraction.ocr_used : null,
    materias_encontradas_at: hasMaterias ? collectedAt : null,
    materias_processadas_at: hasConteudo ? collectedAt : null,
    cronograma_processado_at: null,
  };

  return {
    id: h.id,
    codigo: meta.codigo || h.id,
    titulo: meta.title || meta.titulo || 'Edital coletado',
    orgao: meta.orgao || meta.source || 'N/A',
    banca: meta.banca || meta.exam_board || undefined,
    status: normalizeEditalStatus(meta.status),
    data_publicacao: meta.data_publicacao || asDate(h.created_at),
    data_inscricao_inicio: meta.data_inscricao_inicio || meta.data_abertura || meta.data_inscricao || undefined,
    data_inscricao_fim: meta.data_inscricao_fim || undefined,
    data_prova_prevista: meta.data_prova_prevista || undefined,
    descricao: meta.description || '',
    cargos,
    disciplinas,
    conteudo_programatico: conteudo,
    link_edital_completo: linkEd,
    link_inscricao: meta.link_inscricao || undefined,
    arquivos,
    processing_steps,
    numero_vagas: numberOrZero(meta.numero_vagas),
    numero_inscritos: numberOrZero(meta.numero_inscritos),
    taxa_inscricao: parseCurrencyValue(meta.taxa_inscricao),
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    observacoes: meta.author || undefined,
    created_at: asDate(h.created_at) || new Date().toISOString(),
    updated_at: asDate(h.created_at) || new Date().toISOString(),
  };
}
