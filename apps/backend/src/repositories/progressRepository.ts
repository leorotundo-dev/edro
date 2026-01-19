/**
 * Progress Repository
 * 
 * Persistência para Progress & Mastery
 */

import { query } from '../db';

// ============================================
// TIPOS
// ============================================

export interface ProgressDiario {
  id: string;
  user_id: string;
  date: string;
  drops_completados: number;
  questoes_respondidas: number;
  questoes_corretas: number;
  taxa_acerto: number;
  tempo_estudado_minutos: number;
  srs_revisoes: number;
  xp_ganho: number;
  nivel: number;
  streak: number;
  avg_nec?: number;
  avg_nca?: number;
  avg_humor?: number;
}

export interface ProgressSemanal {
  id: string;
  user_id: string;
  week_start: string;
  total_drops: number;
  total_questoes: number;
  taxa_acerto: number;
  tempo_total_minutos: number;
  dias_estudados: number;
  evolucao_vs_semana_anterior?: number;
}

export interface ProgressMensal {
  id: string;
  user_id: string;
  month: string;
  total_drops: number;
  total_questoes: number;
  taxa_acerto: number;
  tempo_total_minutos: number;
  dias_estudados: number;
  evolucao_vs_mes_anterior?: number;
}

export interface MasterySubtopico {
  id: string;
  user_id: string;
  subtopico: string;
  disciplina_id?: string;
  mastery_score: number;
  taxa_acerto: number;
  retencao_srs?: number;
  velocidade_resposta?: number;
  consistencia?: number;
  nivel: 'iniciante' | 'intermediario' | 'avancado' | 'expert';
  tentativas: number;
  acertos: number;
  ultima_tentativa?: Date;
}

export interface ProgressEvolucao {
  id: string;
  user_id: string;
  snapshot_type: 'diario' | 'semanal' | 'mensal' | 'milestone';
  total_drops_ate_agora: number;
  total_questoes_ate_agora: number;
  taxa_acerto_geral: number;
  mastery_score_medio: number;
  nivel: number;
  xp_total: number;
  timestamp: Date;
}

// ============================================
// PROGRESS DIÁRIO
// ============================================

export async function saveProgressDiario(data: Partial<ProgressDiario>): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO progress_diario (
      user_id, date, drops_completados, questoes_respondidas,
      questoes_corretas, taxa_acerto, tempo_estudado_minutos,
      srs_revisoes, xp_ganho, nivel, streak,
      avg_nec, avg_nca, avg_humor
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
      drops_completados = $3,
      questoes_respondidas = $4,
      questoes_corretas = $5,
      taxa_acerto = $6,
      tempo_estudado_minutos = $7,
      srs_revisoes = $8,
      xp_ganho = $9,
      nivel = $10,
      streak = $11,
      avg_nec = $12,
      avg_nca = $13,
      avg_humor = $14
    RETURNING id
  `, [
    data.user_id,
    data.date,
    data.drops_completados || 0,
    data.questoes_respondidas || 0,
    data.questoes_corretas || 0,
    data.taxa_acerto || 0,
    data.tempo_estudado_minutos || 0,
    data.srs_revisoes || 0,
    data.xp_ganho || 0,
    data.nivel || 1,
    data.streak || 0,
    data.avg_nec,
    data.avg_nca,
    data.avg_humor,
  ]);

  return rows[0].id;
}

export async function getProgressDiario(userId: string, date: Date): Promise<ProgressDiario | null> {
  const dateStr = date.toISOString().split('T')[0];
  const { rows } = await query<ProgressDiario>(`
    SELECT * FROM progress_diario
    WHERE user_id = $1 AND date = $2
  `, [userId, dateStr]);

  return rows[0] || null;
}

export async function getProgressDiarioRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ProgressDiario[]> {
  const { rows } = await query<ProgressDiario>(`
    SELECT * FROM progress_diario
    WHERE user_id = $1 
      AND date >= $2 
      AND date <= $3
    ORDER BY date DESC
  `, [
    userId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  ]);

  return rows;
}

// ============================================
// PROGRESS SEMANAL
// ============================================

export async function saveProgressSemanal(data: Partial<ProgressSemanal>): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO progress_semanal (
      user_id, week_start, total_drops, total_questoes,
      taxa_acerto, tempo_total_minutos, dias_estudados,
      evolucao_vs_semana_anterior
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id, week_start)
    DO UPDATE SET
      total_drops = $3,
      total_questoes = $4,
      taxa_acerto = $5,
      tempo_total_minutos = $6,
      dias_estudados = $7,
      evolucao_vs_semana_anterior = $8
    RETURNING id
  `, [
    data.user_id,
    data.week_start,
    data.total_drops || 0,
    data.total_questoes || 0,
    data.taxa_acerto || 0,
    data.tempo_total_minutos || 0,
    data.dias_estudados || 0,
    data.evolucao_vs_semana_anterior,
  ]);

  return rows[0].id;
}

export async function getProgressSemanal(userId: string, weekStart: Date): Promise<ProgressSemanal | null> {
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const { rows } = await query<ProgressSemanal>(`
    SELECT * FROM progress_semanal
    WHERE user_id = $1 AND week_start = $2
  `, [userId, weekStartStr]);

  return rows[0] || null;
}

export async function getProgressSemanalHistory(userId: string, limit: number = 12): Promise<ProgressSemanal[]> {
  const { rows } = await query<ProgressSemanal>(`
    SELECT * FROM progress_semanal
    WHERE user_id = $1
    ORDER BY week_start DESC
    LIMIT $2
  `, [userId, limit]);

  return rows;
}

// ============================================
// PROGRESS MENSAL
// ============================================

export async function saveProgressMensal(data: Partial<ProgressMensal>): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO progress_mensal (
      user_id, month, total_drops, total_questoes,
      taxa_acerto, tempo_total_minutos, dias_estudados,
      evolucao_vs_mes_anterior
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id, month)
    DO UPDATE SET
      total_drops = $3,
      total_questoes = $4,
      taxa_acerto = $5,
      tempo_total_minutos = $6,
      dias_estudados = $7,
      evolucao_vs_mes_anterior = $8
    RETURNING id
  `, [
    data.user_id,
    data.month,
    data.total_drops || 0,
    data.total_questoes || 0,
    data.taxa_acerto || 0,
    data.tempo_total_minutos || 0,
    data.dias_estudados || 0,
    data.evolucao_vs_mes_anterior,
  ]);

  return rows[0].id;
}

export async function getProgressMensal(userId: string, month: Date): Promise<ProgressMensal | null> {
  const monthStr = month.toISOString().split('T')[0].substring(0, 7) + '-01';
  const { rows } = await query<ProgressMensal>(`
    SELECT * FROM progress_mensal
    WHERE user_id = $1 AND month = $2
  `, [userId, monthStr]);

  return rows[0] || null;
}

export async function getProgressMensalHistory(userId: string, limit: number = 12): Promise<ProgressMensal[]> {
  const { rows } = await query<ProgressMensal>(`
    SELECT * FROM progress_mensal
    WHERE user_id = $1
    ORDER BY month DESC
    LIMIT $2
  `, [userId, limit]);

  return rows;
}

// ============================================
// MASTERY POR SUBTÓPICO
// ============================================

export async function saveMasterySubtopico(data: Partial<MasterySubtopico>): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO mastery_subtopicos (
      user_id, subtopico, disciplina_id, mastery_score,
      taxa_acerto, retencao_srs, velocidade_resposta,
      consistencia, nivel, tentativas, acertos, ultima_tentativa
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (user_id, subtopico)
    DO UPDATE SET
      mastery_score = $4,
      taxa_acerto = $5,
      retencao_srs = $6,
      velocidade_resposta = $7,
      consistencia = $8,
      nivel = $9,
      tentativas = $10,
      acertos = $11,
      ultima_tentativa = $12,
      updated_at = NOW()
    RETURNING id
  `, [
    data.user_id,
    data.subtopico,
    data.disciplina_id,
    data.mastery_score || 0,
    data.taxa_acerto || 0,
    data.retencao_srs,
    data.velocidade_resposta,
    data.consistencia,
    data.nivel || 'iniciante',
    data.tentativas || 0,
    data.acertos || 0,
    data.ultima_tentativa,
  ]);

  return rows[0].id;
}

export async function getMasterySubtopico(userId: string, subtopico: string): Promise<MasterySubtopico | null> {
  const { rows } = await query<MasterySubtopico>(`
    SELECT * FROM mastery_subtopicos
    WHERE user_id = $1 AND subtopico = $2
  `, [userId, subtopico]);

  return rows[0] || null;
}

export async function getAllMastery(userId: string): Promise<MasterySubtopico[]> {
  const { rows } = await query<MasterySubtopico>(`
    SELECT * FROM mastery_subtopicos
    WHERE user_id = $1
    ORDER BY mastery_score DESC
  `, [userId]);

  return rows;
}

export async function getTopMastery(userId: string, limit: number = 10): Promise<MasterySubtopico[]> {
  const { rows } = await query<MasterySubtopico>(`
    SELECT * FROM mastery_subtopicos
    WHERE user_id = $1
    ORDER BY mastery_score DESC
    LIMIT $2
  `, [userId, limit]);

  return rows;
}

export async function getWeakMastery(userId: string, limit: number = 10): Promise<MasterySubtopico[]> {
  const { rows } = await query<MasterySubtopico>(`
    SELECT * FROM mastery_subtopicos
    WHERE user_id = $1 AND tentativas > 3
    ORDER BY mastery_score ASC
    LIMIT $2
  `, [userId, limit]);

  return rows;
}

// ============================================
// EVOLUÇÃO (TIMELINE)
// ============================================

export async function saveProgressEvolucao(data: Partial<ProgressEvolucao>): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO progress_evolucao (
      user_id, snapshot_type, total_drops_ate_agora,
      total_questoes_ate_agora, taxa_acerto_geral,
      mastery_score_medio, nivel, xp_total, timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [
    data.user_id,
    data.snapshot_type || 'diario',
    data.total_drops_ate_agora || 0,
    data.total_questoes_ate_agora || 0,
    data.taxa_acerto_geral || 0,
    data.mastery_score_medio || 0,
    data.nivel || 1,
    data.xp_total || 0,
    data.timestamp || new Date(),
  ]);

  return rows[0].id;
}

export async function getProgressEvolucao(
  userId: string,
  limit: number = 30
): Promise<ProgressEvolucao[]> {
  const { rows } = await query<ProgressEvolucao>(`
    SELECT * FROM progress_evolucao
    WHERE user_id = $1
    ORDER BY timestamp DESC
    LIMIT $2
  `, [userId, limit]);

  return rows;
}

// ============================================
// AGREGAÇÕES E ESTATÍSTICAS
// ============================================

export async function getProgressSummary(userId: string): Promise<any> {
  const { rows } = await query(`
    SELECT 
      SUM(drops_completados) as total_drops,
      SUM(questoes_respondidas) as total_questoes,
      SUM(questoes_corretas) as total_corretas,
      AVG(taxa_acerto) as taxa_acerto_media,
      SUM(tempo_estudado_minutos) as tempo_total,
      COUNT(DISTINCT date) as dias_estudados,
      MAX(streak) as max_streak,
      MAX(nivel) as nivel_atual
    FROM progress_diario
    WHERE user_id = $1
  `, [userId]);

  return rows[0];
}

export async function getMasterySummary(userId: string): Promise<any> {
  const { rows } = await query(`
    SELECT 
      COUNT(*) as total_subtopicos,
      AVG(mastery_score) as mastery_medio,
      COUNT(CASE WHEN nivel = 'expert' THEN 1 END) as experts,
      COUNT(CASE WHEN nivel = 'avancado' THEN 1 END) as avancados,
      COUNT(CASE WHEN nivel = 'intermediario' THEN 1 END) as intermediarios,
      COUNT(CASE WHEN nivel = 'iniciante' THEN 1 END) as iniciantes
    FROM mastery_subtopicos
    WHERE user_id = $1
  `, [userId]);

  return rows[0];
}

export const ProgressRepository = {
  // Diário
  saveProgressDiario,
  getProgressDiario,
  getProgressDiarioRange,
  
  // Semanal
  saveProgressSemanal,
  getProgressSemanal,
  getProgressSemanalHistory,
  
  // Mensal
  saveProgressMensal,
  getProgressMensal,
  getProgressMensalHistory,
  
  // Mastery
  saveMasterySubtopico,
  getMasterySubtopico,
  getAllMastery,
  getTopMastery,
  getWeakMastery,
  
  // Evolução
  saveProgressEvolucao,
  getProgressEvolucao,
  
  // Agregações
  getProgressSummary,
  getMasterySummary,
};

export default ProgressRepository;
