/**
 * Simulado Repository
 * 
 * Gerencia persistência de simulados adaptativos
 */

import { query } from '../db';
import type { SimuladoAnalysis } from '../services/simulados/analysisEngine';

// ============================================
// TIPOS
// ============================================

export interface Simulado {
  id: string;
  name: string;
  description?: string;
  discipline: string;
  exam_board: string;
  total_questions: number;
  time_limit_minutes?: number;
  tipo: string;
  config: any;
  created_at: string;
  created_by?: string;
  status?: string;
  total_attempts?: number;
  average_score?: number;
  completion_rate?: number;
}

export type SimuladoMode = 'padrao' | 'turbo' | 'consciente';

export interface SimuladoExecution {
  id: string;
  simulado_id: string;
  user_id: string;
  started_at: string;
  finished_at?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  adaptive_state: any;
  current_question: number;
  answers?: any;
  mode?: SimuladoMode;
  timer_seconds?: number | null;
  time_spent_seconds?: number | null;
  last_question_at?: string | null;
}

export interface SimuladoResult {
  id: string;
  execution_id: string;
  user_id: string;
  simulado_id: string;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  accuracy: number;
  total_time_seconds: number;
  score: number;
  grade: string;
  finished_at: string;
}

// ============================================
// CREATE
// ============================================

/**
 * Cria um novo simulado
 */
export async function createSimulado(params: {
  userId: string;
  name: string;
  description?: string;
  discipline: string;
  examBoard: string;
  totalQuestions: number;
  timeLimitMinutes?: number;
  tipo: string;
  config: any;
  createdBy?: string;
}): Promise<string> {
  const createdBy = params.createdBy ?? params.userId;
  const { rows } = await query<{ id: string }>(`
    INSERT INTO simulados (
      user_id, tipo, total_questoes, banca, disciplinas,
      name, description, discipline, exam_board, total_questions,
      time_limit_minutes, config, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `, [
    params.userId,
    params.tipo,
    params.totalQuestions,
    params.examBoard,
    JSON.stringify([params.discipline]),
    params.name,
    params.description,
    params.discipline,
    params.examBoard,
    params.totalQuestions,
    params.timeLimitMinutes,
    JSON.stringify(params.config),
    createdBy,
  ]);

  console.log(`[simulado-repo] Simulado criado: ${rows[0].id}`);
  return rows[0].id;
}

/**
 * Inicia execução de um simulado
 */
export async function startExecution(
  simuladoId: string,
  userId: string,
  params: {
    mode?: SimuladoMode;
    timerSeconds?: number | null;
    adaptiveState: any;
  }
): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO simulados_execucao (
      simulado_id, user_id, status, adaptive_state, current_question, mode, timer_seconds, time_spent_seconds, last_question_at
    ) VALUES ($1, $2, 'in_progress', $3, 0, $4, $5, 0, NOW())
    RETURNING id
  `, [
    simuladoId,
    userId,
    JSON.stringify(params.adaptiveState),
    params.mode || 'padrao',
    params.timerSeconds ?? null,
  ]);

  console.log(`[simulado-repo] Execução iniciada: ${rows[0].id}`);
  return rows[0].id;
}

/**
 * Registra resposta de uma questão
 */
export async function recordAnswer(params: {
  executionId: string;
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  difficulty: number;
  adaptiveState: any;
  timeSpentTotal?: number;
}): Promise<void> {
  await query(`
    INSERT INTO simulados_questoes (
      execution_id, question_id, order_num, selected_answer,
      is_correct, time_spent, difficulty
    ) VALUES (
      $1, $2, 
      (SELECT COALESCE(MAX(order_num), 0) + 1 FROM simulados_questoes WHERE execution_id = $1),
      $3, $4, $5, $6
    )
  `, [
    params.executionId,
    params.questionId,
    params.selectedAnswer,
    params.isCorrect,
    params.timeSpent,
    params.difficulty,
  ]);

  // Atualizar estado adaptativo na execução
  await query(`
    UPDATE simulados_execucao
    SET adaptive_state = $2,
        current_question = current_question + 1,
        time_spent_seconds = COALESCE(time_spent_seconds, 0) + $3,
        last_question_at = NOW()
    WHERE id = $1
  `, [params.executionId, JSON.stringify(params.adaptiveState), params.timeSpent]);

  console.log(`[simulado-repo] Resposta registrada: ${params.executionId}`);
}

/**
 * Finaliza execução
 */
export async function finishExecution(executionId: string): Promise<void> {
  await query(`
    UPDATE simulados_execucao
    SET status = 'completed',
        finished_at = NOW()
    WHERE id = $1
  `, [executionId]);

  console.log(`[simulado-repo] Execução finalizada: ${executionId}`);
}

// ============================================
// READ
// ============================================

/**
 * Busca simulado por ID
 */
export async function findSimuladoById(id: string): Promise<Simulado | null> {
  const { rows } = await query<Simulado>(`
    SELECT * FROM simulados WHERE id = $1
  `, [id]);

  return rows[0] || null;
}

/**
 * Lista simulados
 */
export async function listSimulados(filters?: {
  discipline?: string;
  examBoard?: string;
  tipo?: string;
}): Promise<Simulado[]> {
  let sql = `
    SELECT
      s.*,
      COALESCE(results.total_attempts, 0) AS total_attempts,
      COALESCE(results.average_score, 0) AS average_score,
      COALESCE(
        CASE WHEN execs.total_count > 0
          THEN ROUND((execs.completed_count::float / execs.total_count) * 100)
          ELSE 0
        END,
        0
      ) AS completion_rate
    FROM simulados s
    LEFT JOIN (
      SELECT simulado_id,
             COUNT(*) AS total_attempts,
             AVG(score)::float AS average_score
      FROM simulados_resultados
      GROUP BY simulado_id
    ) results ON results.simulado_id = s.id
    LEFT JOIN (
      SELECT simulado_id,
             COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
             COUNT(*) AS total_count
      FROM simulados_execucao
      GROUP BY simulado_id
    ) execs ON execs.simulado_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.discipline) {
    sql += ` AND s.discipline = $${paramIndex++}`;
    params.push(filters.discipline);
  }

  if (filters?.examBoard) {
    sql += ` AND s.exam_board = $${paramIndex++}`;
    params.push(filters.examBoard);
  }

  if (filters?.tipo) {
    sql += ` AND s.tipo = $${paramIndex++}`;
    params.push(filters.tipo);
  }

  sql += ' ORDER BY s.created_at DESC';

  const { rows } = await query<Simulado>(sql, params);
  return rows;
}

/**
 * Busca execução ativa do usuário
 */
export async function findActiveExecution(
  userId: string,
  simuladoId: string
): Promise<SimuladoExecution | null> {
  const { rows } = await query<SimuladoExecution>(`
    SELECT * FROM simulados_execucao
    WHERE user_id = $1 AND simulado_id = $2 AND status = 'in_progress'
    ORDER BY started_at DESC
    LIMIT 1
  `, [userId, simuladoId]);

  return rows[0] || null;
}

/**
 * Busca execução por ID
 */
export async function findExecutionById(id: string): Promise<any | null> {
  const { rows: execRows } = await query(`
    SELECT * FROM simulados_execucao WHERE id = $1
  `, [id]);

  if (execRows.length === 0) return null;

  const execution = execRows[0];

  // Buscar questões respondidas
  const { rows: questionRows } = await query(`
    SELECT 
      sq.question_id,
      sq.selected_answer,
      sq.is_correct,
      sq.time_spent,
      sq.difficulty,
      q.topic,
      q.concepts,
      q.exam_board,
      q.discipline,
      q.cognitive_level,
      q.tags
    FROM simulados_questoes sq
    JOIN questoes q ON q.id = sq.question_id
    WHERE sq.execution_id = $1
    ORDER BY sq.order_num
  `, [id]);

  return {
    ...execution,
    questions: questionRows,
  };
}

/**
 * Salva resultado do simulado
 */
export async function saveResult(params: {
  executionId: string;
  userId: string;
  simuladoId: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  totalTimeSeconds: number;
  score: number;
  grade: string;
}): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO simulados_resultados (
      execution_id, user_id, simulado_id, total_questions,
      correct_count, wrong_count, accuracy, total_time_seconds,
      score, grade
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `, [
    params.executionId,
    params.userId,
    params.simuladoId,
    params.totalQuestions,
    params.correctCount,
    params.wrongCount,
    params.accuracy,
    params.totalTimeSeconds,
    params.score,
    params.grade,
  ]);

  console.log(`[simulado-repo] Resultado salvo: ${rows[0].id}`);
  return rows[0].id;
}

/**
 * Salva mapas de análise
 */
export async function saveAnalysisMaps(
  resultId: string,
  maps: SimuladoAnalysis
): Promise<void> {
  await query(`
    INSERT INTO simulados_mapas (
      result_id, mapa_tipo, mapa_data
    ) VALUES 
      ($1, 'summary', $2),
      ($1, 'performance_by_difficulty', $3),
      ($1, 'performance_by_topic', $4),
      ($1, 'heatmap', $5),
      ($1, 'evolution', $6),
      ($1, 'strengths', $7),
      ($1, 'weaknesses', $8),
      ($1, 'comparison', $9),
      ($1, 'prediction', $10),
      ($1, 'recommendations', $11),
      ($1, 'banca', $12),
      ($1, 'tempo', $13),
      ($1, 'erros', $14),
      ($1, 'dificuldade', $15)
  `, [
    resultId,
    JSON.stringify(maps.summary),
    JSON.stringify(maps.performanceByDifficulty),
    JSON.stringify(maps.performanceByTopic),
    JSON.stringify(maps.heatmap),
    JSON.stringify(maps.evolution),
    JSON.stringify(maps.strengths),
    JSON.stringify(maps.weaknesses),
    JSON.stringify(maps.comparison),
    JSON.stringify(maps.prediction),
    JSON.stringify(maps.recommendations),
    JSON.stringify(maps.performanceByBanca ?? []),
    JSON.stringify(maps.timeMap ?? {}),
    JSON.stringify(maps.errorMap ?? {}),
    JSON.stringify(maps.performanceByDifficulty),
  ]);

  console.log(`[simulado-repo] 10 mapas salvos para resultado ${resultId}`);
}

/**
 * Busca resultado com mapas
 */
export async function getResultWithMaps(resultId: string): Promise<any | null> {
  const { rows: resultRows } = await query(`
    SELECT * FROM simulados_resultados WHERE id = $1
  `, [resultId]);

  if (resultRows.length === 0) return null;

  const result = resultRows[0];

  // Buscar mapas
  const { rows: mapRows } = await query(`
    SELECT mapa_tipo, mapa_data
    FROM simulados_mapas
    WHERE result_id = $1
  `, [resultId]);

  const maps: any = {};
  mapRows.forEach(row => {
    maps[row.mapa_tipo] = row.mapa_data;
  });

  return {
    ...result,
    analysis: maps,
  };
}

/**
 * Lista resultados do usuário
 */
export async function getUserResults(userId: string, limit: number = 10): Promise<SimuladoResult[]> {
  const { rows } = await query<SimuladoResult>(`
    SELECT sr.*, s.name as simulado_name
    FROM simulados_resultados sr
    JOIN simulados s ON s.id = sr.simulado_id
    WHERE sr.user_id = $1
    ORDER BY sr.finished_at DESC
    LIMIT $2
  `, [userId, limit]);

  return rows;
}

// ============================================
// ESTATÍSTICAS
// ============================================

/**
 * Conta execuções
 */
export async function countExecutions(simuladoId: string): Promise<number> {
  const { rows } = await query<{ count: string }>(`
    SELECT COUNT(*) as count
    FROM simulados_execucao
    WHERE simulado_id = $1 AND status = 'completed'
  `, [simuladoId]);

  return parseInt(rows[0].count, 10);
}

/**
 * Estatísticas do simulado
 */
export async function getSimuladoStats(simuladoId: string): Promise<any> {
  const { rows } = await query(`
    SELECT 
      COUNT(*) as total_executions,
      AVG(score) as avg_score,
      AVG(accuracy) as avg_accuracy,
      AVG(total_time_seconds) as avg_time
    FROM simulados_resultados
    WHERE simulado_id = $1
  `, [simuladoId]);

  return rows[0];
}

/**
 * Heatmap de performance por banca/dificuldade
 */
export async function getPerformanceHeatmap(): Promise<Array<{
  exam_board: string;
  difficulty: number;
  total: number;
  correct: number;
  accuracy: number;
  avg_time_spent: number;
}>> {
  const { rows } = await query<{
    exam_board: string;
    difficulty: number;
    total: string;
    correct: string;
    accuracy: string;
    avg_time_spent: string;
  }>(`
    SELECT
      s.exam_board,
      sq.difficulty,
      COUNT(*) as total,
      SUM(CASE WHEN sq.is_correct THEN 1 ELSE 0 END) as correct,
      AVG(CASE WHEN sq.is_correct THEN 1 ELSE 0 END)::float * 100 as accuracy,
      AVG(sq.time_spent)::float as avg_time_spent
    FROM simulados_questoes sq
    JOIN simulados_execucao se ON se.id = sq.execution_id
    JOIN simulados s ON s.id = se.simulado_id
    WHERE se.status = 'completed'
    GROUP BY s.exam_board, sq.difficulty
    ORDER BY s.exam_board, sq.difficulty
  `);

  return rows.map(r => ({
    exam_board: r.exam_board,
    difficulty: Number(r.difficulty),
    total: Number(r.total),
    correct: Number(r.correct),
    accuracy: Number(r.accuracy || 0),
    avg_time_spent: Number(r.avg_time_spent || 0),
  }));
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const SimuladoRepository = {
  createSimulado,
  startExecution,
  recordAnswer,
  finishExecution,
  findSimuladoById,
  listSimulados,
  findActiveExecution,
  findExecutionById,
  saveResult,
  saveAnalysisMaps,
  getResultWithMaps,
  getUserResults,
  countExecutions,
  getSimuladoStats,
  getPerformanceHeatmap,
};

export default SimuladoRepository;
