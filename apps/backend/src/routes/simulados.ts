/**
 * Simulados Routes
 * 
 * Endpoints para simulados adaptativos
 */

import type { FastifyInstance } from 'fastify';
import { SimuladoRepository } from '../repositories/simuladoRepository';
import { QuestionRepository } from '../repositories/questionRepository';
import {
  createInitialState,
  selectNextQuestion,
  updateAdaptiveState,
  DEFAULT_ADAPTIVE_CONFIG,
  AdaptiveState,
  calculateNextDifficulty,
  getDifficultyTransition,
} from '../services/simulados/adaptiveEngine';
import { generateFullAnalysis } from '../services/simulados/analysisEngine';
import { MonitoringService } from '../middleware/monitoring';
import {
  registerSrsErrorReview
} from '../repositories/srsRepository';
import { generateMnemonic, addToUser } from '../services/mnemonicService';
import { ReccoEngine } from '../services/reccoEngine';
import { query } from '../db';
import { GamificationService } from '../services/gamificationService';
import { ensureDropForQuestion } from '../services/questions/questionDrop';
import { upsertUserStatsForTopic } from '../services/learn/userStats';
import { ProgressService } from '../services/progressService';

function normalizeConfig(config: any): any {
  if (!config) return {};
  if (typeof config === 'string') {
    try {
      return JSON.parse(config);
    } catch {
      return {};
    }
  }
  return config;
}

function toArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  return [String(value)];
}

function resolveMode(simulado: any, requestedMode?: 'padrao' | 'turbo' | 'consciente') {
  if (requestedMode === 'turbo' || requestedMode === 'consciente' || requestedMode === 'padrao') {
    return requestedMode;
  }
  const tipo = (simulado?.tipo || '').toString().toLowerCase();
  if (tipo === 'turbo') return 'turbo';
  if (simulado?.modo_timer === 'consciente') return 'consciente';
  if (simulado?.modo_timer === 'turbo') return 'turbo';
  return 'padrao';
}

function resolveBaseTimerSeconds(simulado: any): number | null {
  if (Number.isFinite(simulado?.time_limit_minutes)) {
    return Math.round(simulado.time_limit_minutes * 60);
  }
  if (Number.isFinite(simulado?.tempo_total_segundos)) {
    return Number(simulado.tempo_total_segundos);
  }
  return null;
}

function resolveQuestionFilters(simulado: any) {
  const config = normalizeConfig(simulado?.config);
  const topics = toArray(config.topics || config.subtopics || config.topic);
  const examBoards = toArray(config.bancas || config.examBoards || config.exam_board);
  const tipo = (simulado?.tipo || '').toString().toLowerCase();
  const baseExamBoard = simulado?.exam_board || config.exam_board;
  const useExamBoards = examBoards.length > 0 ? examBoards : baseExamBoard ? [baseExamBoard] : [];

  return {
    topics,
    examBoard: tipo === 'banca_mista' ? undefined : baseExamBoard,
    examBoards: tipo === 'banca_mista' ? useExamBoards : undefined,
  };
}

function resolveDifficulty(simulado: any): number {
  const config = normalizeConfig(simulado?.config);
  const fallback = simulado?.dificuldade_inicial ?? config.difficulty ?? 3;
  return Number.isFinite(fallback) ? Number(fallback) : 3;
}

function resolveDurationMinutes(simulado: any): number | null {
  const config = normalizeConfig(simulado?.config);
  if (Number.isFinite(simulado?.time_limit_minutes)) return simulado.time_limit_minutes;
  if (Number.isFinite(simulado?.tempo_total_segundos)) return Math.round(simulado.tempo_total_segundos / 60);
  if (Number.isFinite(config.duration_minutes)) return config.duration_minutes;
  return null;
}

function normalizeSimuladoStatus(status?: string): 'draft' | 'active' | 'archived' {
  const normalized = (status || '').toString().toLowerCase();
  if (normalized === 'draft' || normalized === 'active' || normalized === 'archived') {
    return normalized;
  }
  if (normalized === 'finalizado') return 'archived';
  if (normalized === 'pausado') return 'draft';
  return 'active';
}

function buildSimuladoPayload(simulado: any) {
  const config = normalizeConfig(simulado?.config);
  const totalQuestions = simulado?.total_questions ?? simulado?.total_questoes ?? 0;
  const title = simulado?.name || simulado?.title || 'Simulado';

  return {
    ...simulado,
    title,
    name: title,
    exam_board: simulado?.exam_board || simulado?.banca || '',
    total_questions: totalQuestions,
    duration_minutes: resolveDurationMinutes(simulado),
    difficulty: resolveDifficulty(simulado),
    topics: toArray(config.topics || config.subtopics || config.topic || simulado?.discipline || ''),
    status: normalizeSimuladoStatus(simulado?.status),
  };
}

export default async function simuladosRoutes(app: FastifyInstance) {

  // ============================================
  // CRUD DE SIMULADOS
  // ============================================

  /**
   * POST /simulados
   * Cria um novo simulado
   */
  app.post<{
    Body: {
      name: string;
      description?: string;
      discipline: string;
      examBoard: string;
      totalQuestions: number;
      timeLimitMinutes?: number;
      tipo: string;
      config?: any;
      userId?: string;
    };
  }>('/simulados', async (request, reply) => {
    const { name, description, discipline, examBoard, totalQuestions, timeLimitMinutes, tipo, config, userId } = request.body;
    const anyReq: any = request;
    const tokenUserId = (anyReq.user as { id?: string; sub?: string } | undefined)?.id
      || (anyReq.user as { id?: string; sub?: string } | undefined)?.sub
      || undefined;
    const resolvedUserId = userId || tokenUserId;

    if (!name || !discipline || !examBoard || !totalQuestions || !tipo || !resolvedUserId) {
      return reply.code(400).send({
        success: false,
        error: 'Campos obrigatorios: name, discipline, examBoard, totalQuestions, tipo, userId'
      });
    }

    try {
      const simuladoId = await SimuladoRepository.createSimulado({
        userId: resolvedUserId,
        name,
        description,
        discipline,
        examBoard,
        totalQuestions,
        timeLimitMinutes,
        tipo,
        config: config || {},
      });

      const simulado = await SimuladoRepository.findSimuladoById(simuladoId);

      return reply.code(201).send({
        success: true,
        data: simulado ? buildSimuladoPayload(simulado) : simulado
      });

    } catch (error: any) {
      console.error('[simulados-api] Erro ao criar:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /simulados
   * Lista simulados
   */
  app.get<{
    Querystring: {
      discipline?: string;
      examBoard?: string;
      tipo?: string;
    };
  }>('/simulados', async (request, reply) => {
    try {
      const simulados = await SimuladoRepository.listSimulados(request.query);
      const data = (simulados || []).map((simulado) => buildSimuladoPayload(simulado));

      return reply.code(200).send({
        success: true,
        data
      });

    } catch (error: any) {
      console.error('[simulados-api] Erro ao listar:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /simulados/:id
   * Busca simulado por ID
   */
  app.get<{
    Params: { id: string };
  }>('/simulados/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const simulado = await SimuladoRepository.findSimuladoById(id);
      if (!simulado) {
        return reply.code(404).send({
          success: false,
          error: 'Simulado não encontrado'
        });
      }

      const stats = await SimuladoRepository.getSimuladoStats(id);

      return reply.code(200).send({
        success: true,
        data: {
          ...buildSimuladoPayload(simulado),
          stats
        }
      });

    } catch (error: any) {
      console.error('[simulados-api] Erro ao buscar:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // EXECUÇÃO DE SIMULADOS
  // ============================================

  /**
   * POST /simulados/:id/start
   * Inicia execução de um simulado
   */
  app.post<{
    Params: { id: string };
    Body: { userId: string; mode?: 'padrao' | 'turbo' | 'consciente' };
  }>('/simulados/:id/start', async (request, reply) => {
    const { id } = request.params;
    const { userId, mode } = request.body;

    if (!userId) {
      return reply.code(400).send({
        success: false,
        error: 'userId é obrigatório'
      });
    }

    try {
      const simulado = await SimuladoRepository.findSimuladoById(id);
      const normalizedMode = resolveMode(simulado, mode);

      if (!simulado) {
        return reply.code(404).send({
          success: false,
          error: 'Simulado não encontrado'
        });
      }

      // Verificar se já tem execução ativa
      const activeExecution = await SimuladoRepository.findActiveExecution(userId, id);
      if (activeExecution) {
        return reply.code(400).send({
          success: false,
          error: 'Você já tem uma execução ativa deste simulado',
          data: activeExecution
        });
      }

      // Criar estado adaptativo inicial
      const adaptiveConfig = {
        ...DEFAULT_ADAPTIVE_CONFIG,
        initialDifficulty: resolveDifficulty(simulado),
      };
      const initialState = createInitialState(adaptiveConfig);

      // Timer por modo
      const baseTimerSeconds = resolveBaseTimerSeconds(simulado);
      const modeTimer = normalizedMode === 'turbo'
        ? (baseTimerSeconds ? Math.floor(baseTimerSeconds * 0.5) : null)
        : normalizedMode === 'consciente'
          ? null
          : baseTimerSeconds;

      // Iniciar execução
      const executionId = await SimuladoRepository.startExecution(id, userId, {
        mode: normalizedMode,
        timerSeconds: modeTimer,
        adaptiveState: initialState,
      });

      // Selecionar primeira questão
      const filters = resolveQuestionFilters(simulado);
      const firstQuestion = await selectNextQuestion(
        initialState,
        adaptiveConfig,
        {
          discipline: simulado.discipline,
          topics: filters.topics,
          examBoard: filters.examBoard,
          examBoards: filters.examBoards,
          bancaWeight: 2,
          desiredDifficulty: initialState.currentDifficulty,
        }
      );
      const simuladoPayload = buildSimuladoPayload(simulado);
      const totalQuestions = simuladoPayload.total_questions || 0;
      const perQuestionTimer = modeTimer && totalQuestions > 0
        ? Math.max(20, Math.floor(modeTimer / totalQuestions))
        : null;
      const timeRemaining = modeTimer ?? null;

      return reply.code(201).send({
        success: true,
        data: {
          executionId,
          simulado: simuladoPayload,
          currentQuestion: firstQuestion,
          adaptiveState: initialState,
          mode: normalizedMode,
          timerSeconds: modeTimer ?? null,
          questionTimerSeconds: perQuestionTimer,
          timeRemainingSeconds: timeRemaining,
          progress: {
            current: totalQuestions > 0 ? 1 : 0,
            total: totalQuestions,
          }
        }
      });

    } catch (error: any) {
      console.error('[simulados-api] Erro ao iniciar:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });


  /**
   * POST /simulados/executions/:id/answer
   * Registra resposta de uma questao
   */
  app.post<{
    Params: { id: string };
    Body: {
      questionId: string;
      selectedAnswer: string;
      timeSpent: number;
    };
  }>('/simulados/executions/:id/answer', async (request, reply) => {
    const { id: executionId } = request.params;
    const { questionId, selectedAnswer, timeSpent } = request.body;

    if (!questionId || !selectedAnswer || timeSpent === undefined) {
      return reply.code(400).send({
        success: false,
        error: 'Campos obrigatorios: questionId, selectedAnswer, timeSpent'
      });
    }

    try {
      const execution = await SimuladoRepository.findExecutionById(executionId);

      if (!execution) {
        return reply.code(404).send({
          success: false,
          error: 'Execucao nao encontrada'
        });
      }

      if (execution.status !== 'in_progress') {
        return reply.code(400).send({
          success: false,
          error: 'Execucao nao esta em andamento'
        });
      }

      const simulado = await SimuladoRepository.findSimuladoById(execution.simulado_id);
      if (!simulado) {
        return reply.code(404).send({
          success: false,
          error: 'Simulado nao encontrado'
        });
      }

      const question = await QuestionRepository.findQuestionById(questionId);
      if (!question) {
        return reply.code(404).send({
          success: false,
          error: 'Questao nao encontrada'
        });
      }

      const correctAnswer = question.correct_answer || '';
      const isCorrect = selectedAnswer.toLowerCase() === correctAnswer.toLowerCase();

      const adaptiveConfig = {
        ...DEFAULT_ADAPTIVE_CONFIG,
        initialDifficulty: resolveDifficulty(simulado),
      };
      const currentState: AdaptiveState = execution.adaptive_state || createInitialState(adaptiveConfig);
      const questionDifficulty = question.difficulty || currentState.currentDifficulty || adaptiveConfig.initialDifficulty;
      const newState = updateAdaptiveState(
        currentState,
        isCorrect,
        questionDifficulty,
        timeSpent,
        questionId
      );
      const nextDifficulty = calculateNextDifficulty(newState, adaptiveConfig);
      newState.currentDifficulty = nextDifficulty;
      const transition = getDifficultyTransition(currentState.currentDifficulty, nextDifficulty);

      await SimuladoRepository.recordAnswer({
        executionId,
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpent,
        difficulty: questionDifficulty,
        adaptiveState: newState,
        timeSpentTotal: (execution.time_spent_seconds || 0) + timeSpent,
      });

      await QuestionRepository.recordQuestionAttempt(questionId, execution.user_id, isCorrect, timeSpent);

      const topicCode = question.topic || question.subtopico || null;

      if (topicCode) {
        try {
          await upsertUserStatsForTopic({
            userId: execution.user_id,
            topicCode,
            wasCorrect: isCorrect,
          });
        } catch (err) {
          console.warn('[simulados-api] Falha ao atualizar user_stats:', (err as any)?.message);
        }
      }

      try {
        await ProgressService.updateProgressRealtime({
          userId: execution.user_id,
          type: 'question',
          correct: isCorrect,
          timeSpent,
          subtopico: topicCode || undefined,
        });
      } catch (err) {
        console.warn('[simulados-api] Falha ao atualizar progress:', (err as any)?.message);
      }

      if (!isCorrect) {
        try {
          await query(
            `
            INSERT INTO questoes_erro_map (
              user_id, questao_id, resposta_escolhida, tempo_gasto
            ) VALUES ($1, $2, $3, $4)
            `,
            [execution.user_id, question.id, selectedAnswer, timeSpent]
          );
        } catch (err) {
          console.warn('[simulados-api] Falha ao registrar questoes_erro_map:', (err as any)?.message);
        }

        try {
          const srsDropId = await ensureDropForQuestion(question);
          if (srsDropId) {
            await registerSrsErrorReview({
              userId: execution.user_id,
              contentType: 'question',
              contentId: question.id,
              dropId: srsDropId
            });
          }

          if (question.topic) {
            const mnemonicoId = await generateMnemonic({
              subtopico: question.topic,
              conteudo: question.explanation || question.question_text || question.topic,
              tecnica: 'acronimo',
              estilo_cognitivo: 'visual',
            }).catch(() => null);

            if (mnemonicoId) {
              await addToUser(execution.user_id, mnemonicoId);
              console.log(`[simulados-api] Mnemonico gerado e associado para user=${execution.user_id} question=${questionId}`);
            }
          }
        } catch (err) {
          console.warn('[simulados-api] Falha ao registrar reforco SRS:', (err as any)?.message);
        }
      }

      try {
        await GamificationService.trackActivity({
          userId: execution.user_id,
          action: 'question_answered',
          sourceId: question.id,
          metadata: {
            isCorrect,
            timeSpent,
            topic: question.topic,
            simuladoId: execution.simulado_id,
          },
        });
      } catch (err) {
        console.warn('[simulados-api] Falha ao atualizar gamificacao:', (err as any)?.message);
      }

      const totalQuestions = simulado.total_questions || simulado.total_questoes || 0;
      const newCurrentQuestion = (execution.current_question || 0) + 1;
      const isCompleted = totalQuestions > 0 ? newCurrentQuestion >= totalQuestions : true;

      let nextQuestion = null;
      if (!isCompleted) {
        const answeredIds = (execution.questions || []).map((q: any) => q.question_id);
        answeredIds.push(questionId);
        const filters = resolveQuestionFilters(simulado);
        nextQuestion = await selectNextQuestion(
          newState,
          adaptiveConfig,
          {
            discipline: simulado.discipline,
            topics: filters.topics,
            examBoard: filters.examBoard,
            examBoards: filters.examBoards,
            excludeIds: answeredIds,
            bancaWeight: 2,
            desiredDifficulty: newState.currentDifficulty,
          }
        );
      }

      const totalTimeSpent = (execution.questions || []).reduce(
        (sum: number, q: any) => sum + (q.time_spent || 0),
        0
      ) + timeSpent;

      const remainingQuestions = Math.max(1, totalQuestions - newCurrentQuestion);
      const perQuestionTimer = execution.timer_seconds
        ? Math.max(
            20,
            Math.floor(((execution.timer_seconds || 0) - totalTimeSpent) / remainingQuestions)
          )
        : null;

      const timeRemaining = execution.timer_seconds
        ? Math.max(0, execution.timer_seconds - totalTimeSpent)
        : null;

      MonitoringService.trackSimulado({
        accuracy: (newState.totalCorrect / (newState.totalCorrect + newState.totalWrong || 1)) || 0,
        totalTimeSeconds: totalTimeSpent,
        mode: execution.mode,
        completed: false,
        transition,
      });

      return reply.code(200).send({
        success: true,
        data: {
          isCorrect,
          correctAnswer: question.correct_answer,
          explanation: question.explanation,
          isCompleted,
          nextQuestion,
          adaptiveState: newState,
          questionTimerSeconds: perQuestionTimer,
          timeSpentSeconds: totalTimeSpent,
          timeRemainingSeconds: timeRemaining,
          progress: {
            current: Math.min(totalQuestions || 0, newCurrentQuestion),
            total: totalQuestions,
          }
        }
      });

    } catch (error: any) {
      console.error('[simulados-api] Erro ao registrar resposta:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });


  /**
   * GET /simulados/executions/:id
   * Retorna estado atual da execucao e proxima questao
   */
  app.get<{
    Params: { id: string };
  }>('/simulados/executions/:id', async (request, reply) => {
    const { id: executionId } = request.params;

    try {
      const execution = await SimuladoRepository.findExecutionById(executionId);

      if (!execution) {
        return reply.code(404).send({
          success: false,
          error: 'Execucao nao encontrada'
        });
      }

      const simulado = await SimuladoRepository.findSimuladoById(execution.simulado_id);
      if (!simulado) {
        return reply.code(404).send({
          success: false,
          error: 'Simulado nao encontrado'
        });
      }

      const totalQuestions = simulado.total_questions || simulado.total_questoes || 0;
      const adaptiveConfig = {
        ...DEFAULT_ADAPTIVE_CONFIG,
        initialDifficulty: resolveDifficulty(simulado),
      };
      const adaptiveState: AdaptiveState = execution.adaptive_state || createInitialState(adaptiveConfig);

      const totalTimeSpent = (execution.questions || []).reduce(
        (sum: number, q: any) => sum + (q.time_spent || 0),
        0
      );

      const isCompleted = totalQuestions > 0
        ? (execution.status === 'completed' || execution.current_question >= totalQuestions)
        : execution.status === 'completed';

      let nextQuestion = null;
      if (!isCompleted) {
        const answeredIds = (execution.questions || []).map((q: any) => q.question_id);
        const filters = resolveQuestionFilters(simulado);
        nextQuestion = await selectNextQuestion(
          adaptiveState,
          adaptiveConfig,
          {
            discipline: simulado.discipline,
            topics: filters.topics,
            examBoard: filters.examBoard,
            examBoards: filters.examBoards,
            excludeIds: answeredIds,
            bancaWeight: 2,
            desiredDifficulty: adaptiveState.currentDifficulty,
          }
        );
      }

      const remainingQuestions = Math.max(1, totalQuestions - (execution.current_question || 0));
      const perQuestionTimer = execution.timer_seconds
        ? Math.max(
            20,
            Math.floor(((execution.timer_seconds || 0) - (execution.time_spent_seconds || 0)) / remainingQuestions)
          )
        : null;

      const timeRemaining = execution.timer_seconds
        ? Math.max(0, execution.timer_seconds - totalTimeSpent)
        : null;

      const simuladoPayload = buildSimuladoPayload(simulado);
      const currentQuestionNumber = isCompleted
        ? (execution.current_question || 0)
        : Math.min(totalQuestions || 0, (execution.current_question || 0) + (nextQuestion ? 1 : 0));

      return reply.code(200).send({
        success: true,
        data: {
          executionId: execution.id,
          simulado: simuladoPayload,
          currentQuestion: nextQuestion,
          adaptiveState,
          isCompleted,
          mode: execution.mode || 'padrao',
          timerSeconds: execution.timer_seconds ?? null,
          questionTimerSeconds: perQuestionTimer,
          timeRemainingSeconds: timeRemaining,
          progress: {
            current: currentQuestionNumber,
            total: totalQuestions,
          },
        }
      });
    } catch (error: any) {
      console.error('[simulados-api] Erro ao carregar execucao:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /simulados/executions/:id/finish
   * Finaliza execução e gera análise
   */
  app.post<{
    Params: { id: string };
  }>('/simulados/executions/:id/finish', async (request, reply) => {
    const { id: executionId } = request.params;

    try {
      const execution = await SimuladoRepository.findExecutionById(executionId);

      if (!execution) {
        return reply.code(404).send({
          success: false,
          error: 'Execução não encontrada'
        });
      }

      // Finalizar execução
      await SimuladoRepository.finishExecution(executionId);

      // Gerar análise completa
      console.log('[simulados-api] Gerando análise completa...');
      const totalTime = (execution.questions || []).reduce(
        (sum: number, q: any) => sum + (q.time_spent || 0),
        0
      );
      const analysis = await generateFullAnalysis({
        ...execution,
        total_time: totalTime,
      });

      // Salvar resultado
      const resultId = await SimuladoRepository.saveResult({
        executionId,
        userId: execution.user_id,
        simuladoId: execution.simulado_id,
        totalQuestions: analysis.summary.total_questions,
        correctCount: analysis.summary.correct_answers,
        wrongCount: analysis.summary.wrong_answers,
        accuracy: analysis.summary.accuracy,
        totalTimeSeconds: analysis.summary.total_time_seconds,
        score: analysis.summary.score,
        grade: analysis.summary.grade,
      });

      // Salvar 10 mapas
      await SimuladoRepository.saveAnalysisMaps(resultId, analysis);

      // Reforços pós-prova: criar revisões SRS para tópicos fracos
      try {
        const weakTopics = (analysis.weaknesses || []).map((w: any) => w.topic).filter(Boolean);
        const resolveDropIdForTopic = async (topic: string) => {
          const { rows } = await query<{ id: string }>(
            'SELECT id FROM drops WHERE topic_code = $1 LIMIT 1',
            [topic]
          );
          return rows[0]?.id || null;
        };
        for (const topic of weakTopics.slice(0, 5)) {
          const dropId = await resolveDropIdForTopic(topic);
          if (!dropId) continue;
          await registerSrsErrorReview({
            userId: execution.user_id,
            contentType: 'drop',
            contentId: dropId,
            dropId
          });
        }
      } catch (err) {
        console.warn('[simulados-api] Falha ao registrar reforços pós-prova:', (err as any)?.message);
      }

      // Disparar reorganização de trilha Recco com tópicos fracos (assíncrono)
      try {
        const weakTopics = (analysis.weaknesses || []).map((w: any) => w.topic).filter(Boolean);
        if (weakTopics.length > 0) {
          ReccoEngine.run({
            userId: execution.user_id,
            forceTopics: weakTopics.slice(0, 5),
            tempoDisponivel: 45,
          }).catch((err: any) => {
            console.warn('[simulados-api] Falha ao disparar Recco pós-simulado:', err?.message);
          });
        }
      } catch (err) {
        console.warn('[simulados-api] Erro ao disparar Recco pós-simulado:', (err as any)?.message);
      }

      // Telemetria de simulado
      MonitoringService.trackSimulado({
        accuracy: analysis.summary.accuracy,
        totalTimeSeconds: analysis.summary.total_time_seconds,
        mode: execution.mode,
        completed: true,
      });

      try {
        await GamificationService.trackActivity({
          userId: execution.user_id,
          action: 'simulado_finished',
          sourceId: execution.id,
          metadata: {
            accuracy: analysis.summary.accuracy,
            totalQuestions: analysis.summary.total_questions,
            correctQuestions: analysis.summary.correct_answers,
          },
        });
      } catch (err) {
        console.warn('[simulados-api] Falha ao atualizar gamificacao:', (err as any)?.message);
      }

      return reply.code(200).send({
        success: true,
        data: {
          resultId,
          analysis,
          mode: execution.mode || 'padrao',
          timerSeconds: execution.timer_seconds ?? null,
          timeRemainingSeconds: execution.timer_seconds
            ? Math.max(0, (execution.timer_seconds || 0) - (analysis.summary.total_time_seconds || 0))
            : null,
        }
      });

    } catch (error: any) {
      console.error('[simulados-api] Erro ao finalizar:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // ============================================
  // RESULTADOS E ANÁLISES
  // ============================================

  /**
   * GET /simulados/results/:id
   * Busca resultado com análise completa
   */
  app.get<{
    Params: { id: string };
  }>('/simulados/results/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const result = await SimuladoRepository.getResultWithMaps(id);

      if (!result) {
        return reply.code(404).send({
          success: false,
          error: 'Resultado não encontrado'
        });
      }

      return reply.code(200).send({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('[simulados-api] Erro ao buscar resultado:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });


  /**
   * GET /users/:userId/simulados
   * Lista simulados com status do usuario
   */
  app.get<{
    Params: { userId: string };
  }>('/users/:userId/simulados', async (request, reply) => {
    const { userId } = request.params;

    try {
      const [simulados, activeExecutions, results] = await Promise.all([
        SimuladoRepository.listSimulados(),
        query(`
          SELECT id, simulado_id, current_question, status, timer_seconds, time_spent_seconds
          FROM simulados_execucao
          WHERE user_id = $1 AND status = 'in_progress'
        `, [userId]),
        query(`
          SELECT *
          FROM simulados_resultados
          WHERE user_id = $1
          ORDER BY finished_at DESC
        `, [userId]),
      ]);

      const activeMap = new Map<string, any>();
      for (const row of activeExecutions.rows || []) {
        activeMap.set(row.simulado_id, row);
      }

      const resultMap = new Map<string, any>();
      for (const row of results.rows || []) {
        if (!resultMap.has(row.simulado_id)) {
          resultMap.set(row.simulado_id, row);
        }
      }

      const data = (simulados || []).map((simulado: any) => {
        const config = normalizeConfig(simulado.config);
        const totalQuestions = simulado.total_questions || simulado.total_questoes || 0;
        const active = activeMap.get(simulado.id);
        const lastAttempt = resultMap.get(simulado.id);

        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (active) status = 'in_progress';
        else if (lastAttempt) status = 'completed';

        const progress = active && totalQuestions > 0
          ? Math.round((active.current_question / totalQuestions) * 100)
          : undefined;

        return {
          id: simulado.id,
          title: simulado.name || simulado.title || 'Simulado',
          name: simulado.name || simulado.title || 'Simulado',
          description: simulado.description || '',
          exam_board: simulado.exam_board || simulado.banca || '',
          total_questions: totalQuestions,
          duration_minutes: resolveDurationMinutes(simulado),
          difficulty: resolveDifficulty(simulado),
          topics: toArray(config.topics || config.subtopics || config.topic || simulado.discipline || ''),
          status,
          progress,
          executionId: active ? active.id : null,
          lastAttempt: lastAttempt
            ? {
                resultId: lastAttempt.id,
                date: lastAttempt.finished_at,
                score: Number(lastAttempt.score || 0),
                correctAnswers: Number(lastAttempt.correct_count || 0),
                timeSpent: Math.round((Number(lastAttempt.total_time_seconds || 0)) / 60),
              }
            : null,
        };
      });

      return reply.code(200).send({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('[simulados-api] Erro ao listar simulados do usuario:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /users/:userId/simulados/results
   * Lista resultados do usuário
   */
  app.get<{
    Params: { userId: string };
    Querystring: { limit?: string };
  }>('/users/:userId/simulados/results', async (request, reply) => {
    const { userId } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit) : 10;

    try {
      const results = await SimuladoRepository.getUserResults(userId, limit);

      return reply.code(200).send({
        success: true,
        data: results
      });

    } catch (error: any) {
      console.error('[simulados-api] Erro ao listar resultados:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /simulados/reports/heatmap
   * Heatmap de performance por banca/dificuldade/tempo
   */
  app.get('/simulados/reports/heatmap', async (_request, reply) => {
    try {
      const heatmap = await SimuladoRepository.getPerformanceHeatmap();
      return reply.code(200).send({
        success: true,
        data: heatmap,
      });
    } catch (error: any) {
      console.error('[simulados-api] Erro ao gerar heatmap:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /simulados/modes
   * Lista modos configurados (padrão/turbo/consciente) com timers e regras.
   */
  app.get('/simulados/modes', async (_request, reply) => {
    const modes = [
      {
        id: 'padrao',
        label: 'Padrão',
        timer: { type: 'fixed', minutes: 120 },
        behavior: { adaptive: true, penaltyWrong: 0, bonusStreak: true },
      },
      {
        id: 'turbo',
        label: 'Turbo',
        timer: { type: 'aggressive', minutes: 60 },
        behavior: { adaptive: true, penaltyWrong: 0.5, bonusStreak: true },
      },
      {
        id: 'consciente',
        label: 'Consciente',
        timer: { type: 'flex', minutes: 150 },
        behavior: { adaptive: false, penaltyWrong: 0, bonusStreak: false, mindfulPauses: true },
      },
    ];

    return reply.code(200).send({
      success: true,
      data: modes,
    });
  });
}
