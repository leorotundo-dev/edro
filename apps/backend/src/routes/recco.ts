/**
 * ReccoEngine V3 - Rotas da API
 * 
 * Endpoints para o motor de recomendação
 */

import type { FastifyInstance } from 'fastify';
import { ReccoEngine } from '../services/reccoEngine';
import { ReccoRepository } from '../repositories/reccoRepository';
import { query } from '../db';
import { enforceIaCallLimit } from '../middleware/planLimits';
import { MonitoringService } from '../middleware/monitoring';

const COGNITIVE_STATES = ['alto', 'medio', 'baixo', 'saturado'] as const;
const EMOTIONAL_STATES = ['motivado', 'ansioso', 'frustrado', 'neutro'] as const;
const PEDAGOGICAL_STATES = ['avancado', 'medio', 'iniciante', 'travado'] as const;

type CognitiveStateKey = (typeof COGNITIVE_STATES)[number];
type EmotionalStateKey = (typeof EMOTIONAL_STATES)[number];
type PedagogicalStateKey = (typeof PEDAGOGICAL_STATES)[number];

interface LatestStateRow {
  user_id: string;
  estado_cognitivo: CognitiveStateKey | null;
  estado_emocional: EmotionalStateKey | null;
  estado_pedagogico: PedagogicalStateKey | null;
  prob_acerto: number | string | null;
  prob_retencao: number | string | null;
  prob_saturacao: number | string | null;
  tempo_otimo_estudo: number | string | null;
  timestamp: string;
}

interface RecentTrailRow {
  user_id: string;
  timestamp: string;
  trilha_do_dia: {
    total_duration_minutes?: number;
    generated_at?: string;
    items?: unknown[];
  } | string | null;
}

interface FeedbackAggRow {
  total_feedbacks: number | string | null;
  completed: number | string | null;
  hits: number | string | null;
  satisfied: number | string | null;
  avg_real_time: number | string | null;
  avg_expected_time: number | string | null;
  avg_time_diff: number | string | null;
  adjustments: number | string | null;
}

const toNumber = (value: unknown, precision?: number): number => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  if (typeof precision === 'number') {
    return Number(num.toFixed(precision));
  }
  return num;
};

const parseTrailPayload = (payload: RecentTrailRow['trilha_do_dia']) => {
  if (!payload) return {};
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }
  return payload;
};

const buildStateDistribution = (rows: LatestStateRow[]) => {
  const distribution = {
    cognitive: COGNITIVE_STATES.reduce<Record<CognitiveStateKey, number>>((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as Record<CognitiveStateKey, number>),
    emotional: EMOTIONAL_STATES.reduce<Record<EmotionalStateKey, number>>((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as Record<EmotionalStateKey, number>),
    pedagogical: PEDAGOGICAL_STATES.reduce<Record<PedagogicalStateKey, number>>((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as Record<PedagogicalStateKey, number>)
  };

  rows.forEach((row) => {
    if (row.estado_cognitivo && distribution.cognitive[row.estado_cognitivo] !== undefined) {
      distribution.cognitive[row.estado_cognitivo] += 1;
    }
    if (row.estado_emocional && distribution.emotional[row.estado_emocional] !== undefined) {
      distribution.emotional[row.estado_emocional] += 1;
    }
    if (row.estado_pedagogico && distribution.pedagogical[row.estado_pedagogico] !== undefined) {
      distribution.pedagogical[row.estado_pedagogico] += 1;
    }
  });

  return distribution;
};

async function resolveDiasAteProva(userId: string): Promise<number | undefined> {
  if (!userId) return undefined;
  const { rows } = await query<{ data_prova_prevista: string | Date | null }>(
    `
      SELECT e.data_prova_prevista
      FROM edital_usuarios eu
      JOIN editais e ON e.id = eu.edital_id
      WHERE eu.user_id = $1
        AND e.data_prova_prevista IS NOT NULL
        AND e.data_prova_prevista > NOW()
      ORDER BY e.data_prova_prevista ASC
      LIMIT 1
    `,
    [userId]
  );

  const nextDate = rows[0]?.data_prova_prevista;
  if (!nextDate) return undefined;
  const diffMs = new Date(nextDate).getTime() - Date.now();
  if (!Number.isFinite(diffMs)) return undefined;
  return Math.max(0, Math.ceil(diffMs / 86400000));
}

export default async function reccoRoutes(app: FastifyInstance) {
  
  // ============================================
  // GERAÇÃO DE TRILHA
  // ============================================

  /**
   * POST /recco/trail/generate
   * Gera trilha do dia personalizada
   */
  app.post<{
    Body: {
      user_id: string;
      blueprint_id?: number;
      dias_ate_prova?: number;
      banca_preferencial?: string;
      tempo_disponivel?: number;
      force_topics?: string[];
      debug?: boolean;
    };
  }>('/recco/trail/generate', { preHandler: enforceIaCallLimit }, async (request, reply) => {
    const {
      user_id,
      blueprint_id,
      dias_ate_prova,
      banca_preferencial,
      tempo_disponivel,
      force_topics,
      debug
    } = request.body;

    if (!user_id) {
      return reply.code(400).send({ error: 'user_id é obrigatório' });
    }

    try {
      console.log(`[recco-api] Gerando trilha para userId=${user_id}`);

      const providedDias =
        typeof dias_ate_prova === 'number' && Number.isFinite(dias_ate_prova)
          ? dias_ate_prova
          : undefined;
      const resolvedDias = providedDias ?? await resolveDiasAteProva(user_id);
      const diasSource = providedDias !== undefined
        ? 'request'
        : (resolvedDias !== undefined ? 'edital' : undefined);

      const result = await ReccoEngine.run({
        userId: user_id,
        blueprintId: blueprint_id,
        diasAteProva: resolvedDias,
        bancaPreferencial: banca_preferencial,
        tempoDisponivel: tempo_disponivel,
        forceTopics: force_topics,
        debug,
      });

      return reply.code(200).send({
        success: true,
        data: {
          trail: result.trail,
          diagnosis: result.diagnosis,
          metadata: {
            ...result.metadata,
            dias_ate_prova: resolvedDias,
            dias_ate_prova_source: diasSource,
          }
        }
      });
    } catch (error: any) {
      console.error('[recco-api] Erro ao gerar trilha:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Erro ao gerar trilha'
      });
    }
  });

  /**
   * GET /recco/trail/daily/:userId
   * Gera trilha diária simplificada (1 hora)
   */
  app.get<{
    Params: { userId: string };
    Querystring: { blueprint_id?: string };
  }>('/recco/trail/daily/:userId', async (request, reply) => {
    const { userId } = request.params;
    const { blueprint_id } = request.query;

    try {
      const trail = await ReccoEngine.generateDailyTrail(
        userId,
        blueprint_id ? parseInt(blueprint_id, 10) : undefined
      );

      return reply.code(200).send({
        success: true,
        data: trail
      });
    } catch (error: any) {
      console.error('[recco-api] Erro ao gerar trilha diária:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /recco/trail/latest/:userId
   * Busca última trilha gerada do usuário
   */
  app.get<{
    Params: { userId: string };
  }>('/recco/trail/latest/:userId', async (request, reply) => {
    const { userId } = request.params;

    try {
      const selection = await ReccoRepository.getLatestSelection(userId);

      if (!selection) {
        return reply.code(404).send({
          success: false,
          error: 'Nenhuma trilha encontrada'
        });
      }

      return reply.code(200).send({
        success: true,
        data: selection.trilha_do_dia
      });
    } catch (error: any) {
      console.error('[recco-api] Erro ao buscar trilha:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // DIAGNÓSTICO
  // ============================================

  /**
   * GET /recco/diagnosis/:userId
   * Executa diagnóstico completo do usuário
   */
  app.get<{
    Params: { userId: string };
  }>('/recco/diagnosis/:userId', async (request, reply) => {
    const { userId } = request.params;

    try {
      const diagnosis = await ReccoEngine.diagnoseUser(userId);

      return reply.code(200).send({
        success: true,
        data: diagnosis
      });
    } catch (error: any) {
      console.error('[recco-api] Erro ao diagnosticar usuário:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /recco/state/:userId
   * Busca último estado calculado do usuário
   */
  app.get<{
    Params: { userId: string };
  }>('/recco/state/:userId', async (request, reply) => {
    const { userId } = request.params;

    try {
      const state = await ReccoRepository.getLatestState(userId);

      if (!state) {
        return reply.code(404).send({
          success: false,
          error: 'Nenhum estado encontrado'
        });
      }

      return reply.code(200).send({
        success: true,
        data: state
      });
    } catch (error: any) {
      console.error('[recco-api] Erro ao buscar estado:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // PRIORIDADES
  // ============================================

  /**
   * GET /recco/priorities/:userId
   * Busca últimas prioridades calculadas
   */
  app.get<{
    Params: { userId: string };
  }>('/recco/priorities/:userId', async (request, reply) => {
    const { userId } = request.params;

    try {
      const priorities = await ReccoRepository.getLatestPriorities(userId);

      if (!priorities) {
        return reply.code(404).send({
          success: false,
          error: 'Nenhuma prioridade encontrada'
        });
      }

      return reply.code(200).send({
        success: true,
        data: priorities
      });
    } catch (error: any) {
      console.error('[recco-api] Erro ao buscar prioridades:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // FEEDBACK
  // ============================================

  /**
   * POST /recco/feedback
   * Registra feedback do usuário sobre a trilha
   */
  app.post<{
    Body: {
      user_id: string;
      recco_id?: string;
      aluno_completou: boolean;
      aluno_acertou?: boolean;
      aluno_satisfeito?: boolean;
      tempo_real?: number;
      tempo_previsto?: number;
      ajuste_sugerido?: string;
    };
  }>('/recco/feedback', async (request, reply) => {
    const feedback = request.body;

    if (!feedback.user_id) {
      return reply.code(400).send({ error: 'user_id é obrigatório' });
    }

    try {
      const id = await ReccoRepository.saveReccoFeedback(feedback);

      return reply.code(201).send({
        success: true,
        data: { id, ...feedback }
      });
    } catch (error: any) {
      console.error('[recco-api] Erro ao salvar feedback:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /recco/feedback/:userId
   * Busca feedbacks do usuário
   */
  app.get<{
    Params: { userId: string };
    Querystring: { limit?: string };
  }>('/recco/feedback/:userId', async (request, reply) => {
    const { userId } = request.params;
    const { limit } = request.query;

    try {
      const feedbacks = await ReccoRepository.getUserFeedbacks(
        userId,
        limit ? parseInt(limit, 10) : 20
      );

      return reply.code(200).send({
        success: true,
        data: feedbacks
      });
    } catch (error: any) {
      console.error('[recco-api] Erro ao buscar feedbacks:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // ADMIN / DEBUG
  // ============================================

  /**
   * GET /recco/admin/stats
   * EstatÇðsticas gerais do motor
   */
  app.get('/recco/admin/stats', async (request, reply) => {
    try {
      const [
        overviewResult,
        latestStatesResult,
        recentTrailsResult,
        feedbackAggResult,
        recentFeedbackResult,
        versionResult
      ] = await Promise.all([
        query<{
          total_recommendations: number | string | null;
          users_reached: number | string | null;
          trails_last_24h: number | string | null;
          active_users_week: number | string | null;
          avg_trail_duration: number | string | null;
          avg_trail_items: number | string | null;
          avg_prob_acerto: number | string | null;
          avg_prob_retencao: number | string | null;
          avg_prob_saturacao: number | string | null;
        }>(`
          SELECT
            (SELECT COUNT(*) FROM recco_selecao) AS total_recommendations,
            (SELECT COUNT(DISTINCT user_id) FROM recco_selecao) AS users_reached,
            (SELECT COUNT(*) FROM recco_selecao WHERE timestamp >= NOW() - INTERVAL '24 hours') AS trails_last_24h,
            (SELECT COUNT(DISTINCT user_id) FROM recco_selecao WHERE timestamp >= NOW() - INTERVAL '7 days') AS active_users_week,
            (
              SELECT COALESCE(AVG((trilha_do_dia ->> 'total_duration_minutes')::numeric), 0)
              FROM recco_selecao
              WHERE trilha_do_dia ? 'total_duration_minutes'
            ) AS avg_trail_duration,
            (
              SELECT COALESCE(AVG(jsonb_array_length(trilha_do_dia -> 'items')), 0)
              FROM recco_selecao
              WHERE trilha_do_dia ? 'items'
            ) AS avg_trail_items,
            (SELECT COALESCE(AVG(prob_acerto), 0) FROM recco_states) AS avg_prob_acerto,
            (SELECT COALESCE(AVG(prob_retencao), 0) FROM recco_states) AS avg_prob_retencao,
            (SELECT COALESCE(AVG(prob_saturacao), 0) FROM recco_states) AS avg_prob_saturacao
        `),
        query<LatestStateRow>(`
          WITH latest AS (
            SELECT DISTINCT ON (user_id)
              user_id,
              estado_cognitivo,
              estado_emocional,
              estado_pedagogico,
              prob_acerto,
              prob_retencao,
              prob_saturacao,
              tempo_otimo_estudo,
              timestamp
            FROM recco_states
            ORDER BY user_id, timestamp DESC
          )
          SELECT * FROM latest
          ORDER BY timestamp DESC
          LIMIT 100
        `),
        query<RecentTrailRow>(`
          SELECT
            user_id,
            timestamp,
            trilha_do_dia
          FROM recco_selecao
          ORDER BY timestamp DESC
          LIMIT 6
        `),
        query<FeedbackAggRow>(`
          SELECT
            COUNT(*) AS total_feedbacks,
            SUM(CASE WHEN aluno_completou THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN aluno_acertou THEN 1 ELSE 0 END) AS hits,
            SUM(CASE WHEN aluno_satisfeito THEN 1 ELSE 0 END) AS satisfied,
            AVG(tempo_real) AS avg_real_time,
            AVG(tempo_previsto) AS avg_expected_time,
            AVG(tempo_real - tempo_previsto) AS avg_time_diff,
            SUM(CASE WHEN ajuste_sugerido IS NOT NULL AND ajuste_sugerido <> '' THEN 1 ELSE 0 END) AS adjustments
          FROM recco_feedback
        `),
        query<{
          user_id: string;
          aluno_completou: boolean | null;
          aluno_acertou: boolean | null;
          aluno_satisfeito: boolean | null;
          tempo_real: number | string | null;
          tempo_previsto: number | string | null;
          ajuste_sugerido: string | null;
          timestamp: string;
        }>(`
          SELECT
            user_id,
            aluno_completou,
            aluno_acertou,
            aluno_satisfeito,
            tempo_real,
            tempo_previsto,
            ajuste_sugerido,
            timestamp
          FROM recco_feedback
          ORDER BY timestamp DESC
          LIMIT 5
        `),
        query<{ version: string }>(`
          SELECT version
          FROM recco_versions
          WHERE active = true
          ORDER BY updated_at DESC
          LIMIT 1
        `)
      ]);

      const overview = overviewResult.rows[0] || {};
      const totals = {
        totalRecommendations: toNumber(overview.total_recommendations),
        usersReached: toNumber(overview.users_reached),
        trailsLast24h: toNumber(overview.trails_last_24h),
        activeUsersWeek: toNumber(overview.active_users_week)
      };

      const trailQuality = {
        avgTrailDuration: toNumber(overview.avg_trail_duration, 1),
        avgTrailItems: toNumber(overview.avg_trail_items, 1),
        avgProbabilities: {
          accuracy: toNumber(overview.avg_prob_acerto, 2),
          retention: toNumber(overview.avg_prob_retencao, 2),
          saturation: toNumber(overview.avg_prob_saturacao, 2)
        }
      };

      const latestStates = latestStatesResult.rows.map((row) => ({
        userId: row.user_id,
        cognitive: row.estado_cognitivo,
        emotional: row.estado_emocional,
        pedagogical: row.estado_pedagogico,
        probAcerto: toNumber(row.prob_acerto, 2),
        probRetencao: toNumber(row.prob_retencao, 2),
        probSaturacao: toNumber(row.prob_saturacao, 2),
        tempoOtimoEstudo: toNumber(row.tempo_otimo_estudo),
        updatedAt: row.timestamp
      }));

      const stateDistribution = buildStateDistribution(latestStatesResult.rows);

      const recentTrails = recentTrailsResult.rows.map((row) => {
        const payload = parseTrailPayload(row.trilha_do_dia as RecentTrailRow['trilha_do_dia']);
        const items = Array.isArray(payload?.items) ? payload.items : [];
        return {
          userId: row.user_id,
          generatedAt: payload?.generated_at || row.timestamp,
          totalDurationMinutes: toNumber(payload?.total_duration_minutes),
          itemsCount: items.length,
          timestamp: row.timestamp
        };
      });

      const feedbackAgg = feedbackAggResult.rows[0] || {};
      const totalFeedbacks = toNumber(feedbackAgg.total_feedbacks);
      const completedFeedbacks = toNumber(feedbackAgg.completed);
      const accurateFeedbacks = toNumber(feedbackAgg.hits);
      const satisfiedFeedbacks = toNumber(feedbackAgg.satisfied);
      const completionRate = totalFeedbacks ? Number(((completedFeedbacks / totalFeedbacks) * 100).toFixed(1)) : 0;
      const accuracyRate = totalFeedbacks ? Number(((accurateFeedbacks / totalFeedbacks) * 100).toFixed(1)) : 0;
      const satisfactionRate = totalFeedbacks ? Number(((satisfiedFeedbacks / totalFeedbacks) * 100).toFixed(1)) : 0;

      const feedbackSummary = {
        totalFeedbacks,
        completionRate,
        accuracyRate,
        satisfactionRate,
        avgRealTime: toNumber(feedbackAgg.avg_real_time, 1),
        avgExpectedTime: toNumber(feedbackAgg.avg_expected_time, 1),
        avgTimeDelta: toNumber(feedbackAgg.avg_time_diff, 1),
        adjustments: toNumber(feedbackAgg.adjustments),
        recent: recentFeedbackResult.rows.map((feedback) => ({
          userId: feedback.user_id,
          completed: Boolean(feedback.aluno_completou),
          accuracy: feedback.aluno_acertou,
          satisfied: feedback.aluno_satisfeito,
          tempoReal: toNumber(feedback.tempo_real),
          tempoPrevisto: toNumber(feedback.tempo_previsto),
          ajuste: feedback.ajuste_sugerido,
          timestamp: feedback.timestamp
        }))
      };

      const status = totals.totalRecommendations > 0 ? 'operational' : 'standby';
      const version = versionResult.rows[0]?.version || '3.0.0';
      const message =
        totals.trailsLast24h > 0
          ? `Motor entregou ${totals.trailsLast24h} trilhas nas Ç§ltimas 24h`
          : 'Nenhuma trilha registrada nas Ç§ltimas 24h';

      return reply.code(200).send({
        success: true,
        status,
        version,
        message,
        data: {
          totals,
          trailQuality,
          stateDistribution,
          latestStates,
          recentTrails,
          feedbackSummary,
          metadata: {
            lastSync: new Date().toISOString()
          }
        }
      });
    } catch (error: any) {
      console.error('[recco-api] Erro ao gerar estatÇðsticas', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Erro ao buscar estatÇðsticas do ReccoEngine'
      });
    }
  });
  /**
   * POST /recco/admin/test/:userId
   * Testa o motor completo para um usuário
   */
  app.post<{
    Params: { userId: string };
  }>('/recco/admin/test/:userId', async (request, reply) => {
    const { userId } = request.params;

    try {
      console.log(`[recco-api] Teste completo para userId=${userId}`);

      const result = await ReccoEngine.run({
        userId,
        tempoDisponivel: 30 // 30 min para teste
      });

      return reply.code(200).send({
        success: true,
        data: {
          message: 'Teste concluído com sucesso',
          diagnosis: result.diagnosis,
          trail_items: result.trail.items.length,
          total_duration: result.trail.total_duration_minutes,
          processing_time: result.metadata.processing_time_ms
        }
      });
    } catch (error: any) {
      console.error('[recco-api] Erro no teste:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  /**
   * GET /recco/admin/debug/:userId
   * Última trilha + prioridades + estado (debug)
   */
  app.get<{
    Params: { userId: string };
  }>('/recco/admin/debug/:userId', async (request, reply) => {
    const { userId } = request.params;

    try {
      const [selection, priorities, state] = await Promise.all([
        ReccoRepository.getLatestSelection(userId),
        ReccoRepository.getLatestPriorities(userId),
        ReccoRepository.getLatestState(userId),
      ]);

      if (!selection && !priorities && !state) {
        return reply.code(404).send({
          success: false,
          error: 'Nenhum dado encontrado',
        });
      }

      return reply.code(200).send({
        success: true,
        data: {
          selection,
          priorities,
          state,
        },
      });
    } catch (error: any) {
      console.error('[recco-api] Erro no debug:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Erro ao obter debug do ReccoEngine',
      });
    }
  });

  /**
   * GET /recco/admin/decisions
   * Últimas decisões registradas (snapshot)
   */
  app.get('/recco/admin/decisions', async (request, reply) => {
    const queryParams = request.query as { limit?: string };
    const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 20;

    const decisions = MonitoringService.getReccoDecisionHistory(limit);

    return reply.code(200).send({
      success: true,
      data: decisions,
      count: decisions.length,
    });
  });
}
