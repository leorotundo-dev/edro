/**
 * Question Repository
 * 
 * Gerencia persistência de questões no banco de dados
 */

import { query } from '../db';
import type { GeneratedQuestion } from '../services/ai/questionGenerator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveDisciplineId(input?: string): Promise<string | null> {
  if (!input) return null;
  if (UUID_REGEX.test(input)) return input;

  const { rows } = await query<{ id: string }>(
    'SELECT id FROM disciplines WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [input]
  );

  return rows[0]?.id ?? null;
}

// ============================================
// TIPOS
// ============================================

export interface Question {
  id: string; // UUID
  enunciado: string;
  alternativas: any; // JSONB
  correta: string;
  explicacao_curta?: string;
  explicacao_longa?: string;
  subtopico?: string;
  disciplina_id?: string; // UUID
  banca?: string;
  dificuldade: number;
  nivel_cognitivo?: string;
  probabilidade_prova?: number;
  tempo_estimado?: number;
  tags?: any; // JSONB
  contexto_semantico?: string;
  pegadinhas?: any; // JSONB
  criado_por: string;
  versao: string;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
  question_text?: string;
  question_type?: string;
  alternatives?: any;
  correct_answer?: string;
  explanation?: string;
  concepts?: any;
  cognitive_level?: string;
  estimated_time_seconds?: number;
  quality_score?: number;
  ai_generated?: boolean;
  discipline?: string;
  topic?: string;
  exam_board?: string;
  difficulty?: number;
  usage_count?: number;
  average_accuracy?: number;
  similarity?: number;
  status?: 'draft' | 'active' | 'archived'; // Adicionado para manter compatibilidade
}

export interface QuestionStatistics {
  question_id: string;
  questao_id?: string;
  total_attempts: number;
  correct_attempts: number;
  wrong_attempts: number;
  average_time_seconds: number;
  difficulty_real: number;
  last_updated: string;
}

function toStringArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function normalizeToken(value: string): string | null {
  const token = value.trim().toLowerCase();
  return token ? token : null;
}

function collectTokens(question: Question): string[] {
  const tokens = new Set<string>();
  const push = (value?: string) => {
    const normalized = value ? normalizeToken(value) : null;
    if (normalized) tokens.add(normalized);
  };

  push(question.topic ?? question.subtopico);
  push(question.discipline);
  push(question.exam_board ?? question.banca);
  push(question.cognitive_level ?? question.nivel_cognitivo);
  if (question.difficulty) {
    tokens.add(`diff:${question.difficulty}`);
  }

  toStringArray(question.tags).forEach((tag) => push(`tag:${tag}`));
  toStringArray((question as any).concepts).forEach((concept) => push(`concept:${concept}`));
  toStringArray(question.pegadinhas).forEach((trap) => push(`trap:${trap}`));

  const semanticContext = question.contexto_semantico;
  if (semanticContext) {
    semanticContext.split(',').forEach((item) => push(`ctx:${item}`));
  }

  return Array.from(tokens);
}

function jaccardSimilarity(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let intersection = 0;

  for (const token of aSet) {
    if (bSet.has(token)) intersection += 1;
  }

  const union = aSet.size + bSet.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function computeSimilarityScore(base: Question, candidate: Question): number {
  const baseTokens = collectTokens(base);
  const candidateTokens = collectTokens(candidate);
  let score = jaccardSimilarity(baseTokens, candidateTokens);

  if (base.exam_board && candidate.exam_board && base.exam_board === candidate.exam_board) {
    score += 0.1;
  }
  if (base.difficulty && candidate.difficulty) {
    const diffGap = Math.abs(base.difficulty - candidate.difficulty);
    if (diffGap <= 1) score += 0.05;
  }

  return Math.min(1, Math.max(0, score));
}

async function refreshSimilarQuestions(questionId: string, limit: number = 5): Promise<Question[]> {
  const baseQuestion = await findQuestionById(questionId);
  if (!baseQuestion) return [];

  let sql = `SELECT * FROM questoes WHERE id != $1 AND status = 'active'`;
  const params: any[] = [questionId];
  const conditions: string[] = [];
  let paramIndex = 2;

  if (baseQuestion.topic) {
    conditions.push(`topic = $${paramIndex++}`);
    params.push(baseQuestion.topic);
  }
  if (baseQuestion.discipline) {
    conditions.push(`discipline = $${paramIndex++}`);
    params.push(baseQuestion.discipline);
  }
  if (baseQuestion.exam_board) {
    conditions.push(`exam_board = $${paramIndex++}`);
    params.push(baseQuestion.exam_board);
  }

  if (conditions.length > 0) {
    sql += ` AND (${conditions.join(' OR ')})`;
  }

  const { rows: candidates } = await query<Question>(sql, params);

  const scored = candidates
    .map((candidate) => ({
      question: candidate,
      score: computeSimilarityScore(baseQuestion, candidate),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length > 0) {
    await query(`DELETE FROM questoes_similares WHERE questao_id = $1`, [questionId]);
    for (const item of scored) {
      await query(
        `
        INSERT INTO questoes_similares (questao_id, similar_questao_id, similaridade_score)
        VALUES ($1, $2, $3)
        ON CONFLICT (questao_id, similar_questao_id)
        DO UPDATE SET similaridade_score = EXCLUDED.similaridade_score
        `,
        [questionId, item.question.id, item.score]
      );
    }
  }

  return scored.map((item) => ({
    ...item.question,
    similarity: Math.round(item.score * 100) / 100,
  }));
}

// ============================================
// CREATE
// ============================================

/**
 * Salva uma questão gerada pela IA
 */
export async function saveGeneratedQuestion(
  question: GeneratedQuestion,
  discipline: string,
  topic: string,
  examBoard: string,
  status: 'draft' | 'active' = 'draft'
): Promise<string> {
  const disciplineId = await resolveDisciplineId(discipline);
  const explanation = question.explanation || '';
  const shortExplanation = explanation ? explanation.substring(0, 250) : '';
  const alternatives = question.alternatives || [];
  const tags = question.tags || [];
  const concepts = question.concepts || [];
  const difficultyScore = question.difficulty_score || 3;
  const questionType = question.question_type || 'multiple_choice';

  const { rows } = await query<{ id: string }>(`
    INSERT INTO questoes (
      enunciado, alternativas, correta, explicacao_curta, explicacao_longa,
      subtopico, disciplina_id, banca, dificuldade, nivel_cognitivo,
      tempo_estimado, tags, contexto_semantico, criado_por, versao, status,
      question_text, question_type, alternatives, correct_answer, explanation,
      concepts, cognitive_level, estimated_time_seconds, difficulty, discipline,
      topic, exam_board, ai_generated
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21,
      $22, $23, $24, $25, $26,
      $27, $28, $29
    )
    RETURNING id
  `, [
    question.question_text,
    JSON.stringify(alternatives),
    question.correct_answer,
    shortExplanation,
    explanation,
    topic,
    disciplineId,
    examBoard,
    difficultyScore,
    question.cognitive_level,
    question.estimated_time_seconds,
    JSON.stringify(tags),
    concepts.join(', '),
    'IA',
    'v1.0',
    status,
    question.question_text,
    questionType,
    JSON.stringify(alternatives),
    question.correct_answer,
    explanation,
    JSON.stringify(concepts),
    question.cognitive_level,
    question.estimated_time_seconds,
    difficultyScore,
    discipline,
    topic,
    examBoard,
    true
  ]);

  console.log(`[question-repo] Questao salva: ${rows[0].id}`);
  void refreshSimilarQuestions(rows[0].id).catch((err) => {
    console.warn('[question-repo] Falha ao atualizar similares:', (err as any)?.message);
  });
  return rows[0].id;
}

/**
 * Cria uma questão manualmente
 */
export async function createQuestion(params: {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  alternatives: any;
  correct_answer: string;
  explanation: string;
  discipline: string;
  topic: string;
  exam_board: string;
  difficulty: number;
  concepts: string[];
  cognitive_level: string;
  tags: any;
  estimated_time_seconds: number;
}): Promise<string> {
  const disciplineId = await resolveDisciplineId(params.discipline);
  const explanation = params.explanation || '';
  const shortExplanation = explanation ? explanation.substring(0, 250) : '';
  const concepts = params.concepts || [];

  const { rows } = await query<{ id: string }>(`
    INSERT INTO questoes (
      question_text, question_type, alternatives, correct_answer, explanation,
      discipline, topic, exam_board, difficulty, concepts, cognitive_level,
      tags, estimated_time_seconds, ai_generated, status,
      enunciado, alternativas, correta, explicacao_curta, explicacao_longa,
      subtopico, disciplina_id, banca, dificuldade, nivel_cognitivo,
      tempo_estimado, contexto_semantico, pegadinhas, criado_por, versao
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25,
      $26, $27, $28, $29, $30
    )
    RETURNING id
  `, [
    params.question_text,
    params.question_type,
    JSON.stringify(params.alternatives),
    params.correct_answer,
    explanation,
    params.discipline,
    params.topic,
    params.exam_board,
    params.difficulty,
    JSON.stringify(concepts),
    params.cognitive_level,
    JSON.stringify(params.tags),
    params.estimated_time_seconds,
    false,
    'draft',
    params.question_text,
    JSON.stringify(params.alternatives),
    params.correct_answer,
    shortExplanation,
    explanation,
    params.topic,
    disciplineId,
    params.exam_board,
    params.difficulty,
    params.cognitive_level,
    params.estimated_time_seconds,
    concepts.join(', '),
    JSON.stringify([]),
    'Humano',
    'v1.0'
  ]);

  console.log(`[question-repo] Questao criada: ${rows[0].id}`);
  void refreshSimilarQuestions(rows[0].id).catch((err) => {
    console.warn('[question-repo] Falha ao atualizar similares:', (err as any)?.message);
  });
  return rows[0].id;
}

/**
 * Busca questão por ID
 */
export async function findQuestionById(id: string): Promise<Question | null> {
  const { rows } = await query<Question>(`
    SELECT * FROM questoes WHERE id = $1
  `, [id]);

  return rows[0] || null;
}

/**
 * Lista questões com filtros
 */
export async function listQuestions(filters?: {
  discipline?: string;
  topic?: string;
  examBoard?: string;
  difficulty?: number;
  cognitiveLevel?: string;
  tags?: string[];
  status?: string;
  aiGenerated?: boolean;
  editalId?: string;
  limit?: number;
  offset?: number;
}): Promise<Question[]> {
  let sql = `
    SELECT
      q.*,
      COALESCE(s.total_attempts, 0) AS usage_count,
      COALESCE(ROUND((s.correct_attempts::float / NULLIF(s.total_attempts, 0)) * 100), 0) AS average_accuracy
    FROM questoes q
    ${filters?.editalId ? 'JOIN edital_questoes eq ON eq.questao_id = q.id' : ''}
    LEFT JOIN questoes_estatisticas s ON s.questao_id = q.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.editalId) {
    sql += ` AND eq.edital_id = $${paramIndex++}`;
    params.push(filters.editalId);
  }

  if (filters?.discipline) {
    sql += ` AND q.discipline = $${paramIndex++}`;
    params.push(filters.discipline);
  }

  if (filters?.topic) {
    sql += ` AND q.topic = $${paramIndex++}`;
    params.push(filters.topic);
  }

  if (filters?.examBoard) {
    sql += ` AND q.exam_board = $${paramIndex++}`;
    params.push(filters.examBoard);
  }

  if (filters?.difficulty) {
    sql += ` AND q.difficulty = $${paramIndex++}`;
    params.push(filters.difficulty);
  }

  if (filters?.cognitiveLevel) {
    sql += ` AND q.cognitive_level = $${paramIndex++}`;
    params.push(filters.cognitiveLevel);
  }

  if (filters?.tags && filters.tags.length > 0) {
    sql += ` AND q.tags @> $${paramIndex++}::jsonb`;
    params.push(JSON.stringify(filters.tags));
  }

  if (filters?.status) {
    sql += ` AND q.status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters?.aiGenerated !== undefined) {
    sql += ` AND q.ai_generated = $${paramIndex++}`;
    params.push(filters.aiGenerated);
  }

  sql += ' ORDER BY q.created_at DESC';

  if (filters?.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
  }

  if (filters?.offset) {
    sql += ` OFFSET $${paramIndex++}`;
    params.push(filters.offset);
  }

  const { rows } = await query<Question>(sql, params);
  return rows;
}

/**
 * Busca questões por conceito
 */
export async function findQuestionsByConcept(concept: string, limit: number = 10): Promise<Question[]> {
  const { rows } = await query<Question>(`
    SELECT * FROM questoes
    WHERE concepts::text ILIKE $1
    AND status = 'active'
    ORDER BY quality_score DESC NULLS LAST
    LIMIT $2
  `, [`%${concept}%`, limit]);

  return rows;
}

/**
 * Busca questões similares
 */
export async function findSimilarQuestions(
  questionId: string,
  limit: number = 5
): Promise<Question[]> {
  const { rows: cached } = await query<(Question & { similarity: number })>(`
    SELECT q.*, qs.similaridade_score AS similarity
    FROM questoes_similares qs
    JOIN questoes q ON q.id = qs.similar_questao_id
    WHERE qs.questao_id = $1
    ORDER BY qs.similaridade_score DESC
    LIMIT $2
  `, [questionId, limit]);

  if (cached.length > 0) {
    return cached.map((row) => ({
      ...row,
      similarity: typeof row.similarity === 'number'
        ? row.similarity
        : parseFloat(String(row.similarity || 0)),
    }));
  }

  const computed = await refreshSimilarQuestions(questionId, limit);
  if (computed.length > 0) return computed;

  const question = await findQuestionById(questionId);
  if (!question || !question.topic) return [];

  const { rows } = await query<Question>(`
    SELECT * FROM questoes
    WHERE topic = $1 AND id != $2 AND status = 'active'
    ORDER BY quality_score DESC NULLS LAST
    LIMIT $3
  `, [question.topic, questionId, limit]);

  return rows;
}

// ============================================
// UPDATE
// ============================================

/**
 * Atualiza questão
 */
export async function updateQuestion(
  id: string,
  updates: Partial<Question>
): Promise<boolean> {
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  
  if (fields.length === 0) return false;

  const setClause = fields.map((field, idx) => `${field} = $${idx + 2}`).join(', ');
  
  const { rowCount } = await query(`
    UPDATE questoes
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
  `, [id, ...values]);

  return (rowCount || 0) > 0;
}

/**
 * Atualiza status da questão
 */
export async function updateQuestionStatus(
  id: string,
  status: 'draft' | 'active' | 'archived'
): Promise<boolean> {
  const { rowCount } = await query(`
    UPDATE questoes
    SET status = $2, updated_at = NOW()
    WHERE id = $1
  `, [id, status]);

  return (rowCount || 0) > 0;
}

/**
 * Atualiza quality score
 */
export async function updateQualityScore(
  id: string,
  qualityScore: number
): Promise<boolean> {
  const { rowCount } = await query(`
    UPDATE questoes
    SET quality_score = $2, updated_at = NOW()
    WHERE id = $1
  `, [id, qualityScore]);

  return (rowCount || 0) > 0;
}

// ============================================
// DELETE
// ============================================

/**
 * Remove questão (soft delete)
 */
export async function deleteQuestion(id: string): Promise<boolean> {
  return updateQuestionStatus(id, 'archived');
}

/**
 * Remove questão permanentemente
 */
export async function hardDeleteQuestion(id: string): Promise<boolean> {
  const { rowCount } = await query(`
    DELETE FROM questoes WHERE id = $1
  `, [id]);

  return (rowCount || 0) > 0;
}

// ============================================
// ESTATÍSTICAS
// ============================================

/**
 * Registra tentativa de resposta
 */
export async function recordQuestionAttempt(
  questionId: string,
  userId: string,
  isCorrect: boolean,
  timeSpent: number
): Promise<void> {
  // Inserir ou atualizar estatísticas
  await query(`
    INSERT INTO questoes_estatisticas (
      questao_id, total_attempts, correct_attempts, wrong_attempts,
      average_time_seconds, last_updated
    ) VALUES ($1, 1, $2, $3, $4, NOW())
    ON CONFLICT (questao_id) DO UPDATE SET
      total_attempts = questoes_estatisticas.total_attempts + 1,
      correct_attempts = questoes_estatisticas.correct_attempts + $2,
      wrong_attempts = questoes_estatisticas.wrong_attempts + $3,
      average_time_seconds = (
        questoes_estatisticas.average_time_seconds * questoes_estatisticas.total_attempts + $4
      ) / (questoes_estatisticas.total_attempts + 1),
      last_updated = NOW()
  `, [
    questionId,
    isCorrect ? 1 : 0,
    isCorrect ? 0 : 1,
    timeSpent,
  ]);

  console.log(`[question-repo] Tentativa registrada: ${questionId} (${isCorrect ? 'correta' : 'errada'})`);
}

/**
 * Busca estatísticas de uma questão
 */
export async function getQuestionStatistics(questionId: string): Promise<QuestionStatistics | null> {
  const { rows } = await query<QuestionStatistics>(`
    SELECT
      questao_id AS question_id,
      total_attempts,
      correct_attempts,
      wrong_attempts,
      average_time_seconds,
      difficulty_real,
      last_updated
    FROM questoes_estatisticas
    WHERE questao_id = $1
  `, [questionId]);

  return rows[0] || null;
}

/**
 * Conta total de questões
 */
export async function countQuestions(filters?: {
  discipline?: string;
  status?: string;
  aiGenerated?: boolean;
  editalId?: string;
}): Promise<number> {
  let sql = 'SELECT COUNT(*) as count FROM questoes q';
  if (filters?.editalId) {
    sql += ' JOIN edital_questoes eq ON eq.questao_id = q.id';
  }
  sql += ' WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.editalId) {
    sql += ` AND eq.edital_id = $${paramIndex++}`;
    params.push(filters.editalId);
  }

  if (filters?.discipline) {
    sql += ` AND q.discipline = $${paramIndex++}`;
    params.push(filters.discipline);
  }

  if (filters?.status) {
    sql += ` AND q.status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters?.aiGenerated !== undefined) {
    sql += ` AND q.ai_generated = $${paramIndex++}`;
    params.push(filters.aiGenerated);
  }

  const { rows } = await query<{ count: string }>(sql, params);
  return parseInt(rows[0].count, 10);
}

/**
 * Busca os erros mais recentes de um usuário
 */
export async function getRecentErrors(userId: string, limit: number = 5): Promise<any[]> {
  const { rows } = await query(`
    SELECT
      q.question_text,
      q.correct_answer,
      e.resposta_escolhida,
      e.timestamp
    FROM questoes_erro_map e
    JOIN questoes q ON e.questao_id = q.id
    WHERE e.user_id = $1
    ORDER BY e.timestamp DESC
    LIMIT $2
  `, [userId, limit]);

  return rows;
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const QuestionRepository = {
  saveGeneratedQuestion,
  createQuestion,
  findQuestionById,
  listQuestions,
  findQuestionsByConcept,
  findSimilarQuestions,
  updateQuestion,
  updateQuestionStatus,
  updateQualityScore,
  deleteQuestion,
  hardDeleteQuestion,
  recordQuestionAttempt,
  getQuestionStatistics,
  countQuestions,
  getRecentErrors,
};

export default QuestionRepository;
