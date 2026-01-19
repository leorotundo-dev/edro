/**
 * Progress Service
 * 
 * Cálculo e gerenciamento de Progress & Mastery
 */

import { ProgressRepository } from '../repositories/progressRepository';
import type { 
  ProgressDiario, 
  ProgressSemanal, 
  ProgressMensal,
  MasterySubtopico 
} from '../repositories/progressRepository';

// ============================================
// CÁLCULO DE PROGRESS DIÁRIO
// ============================================

export async function calculateDailyProgress(userId: string, date?: Date): Promise<ProgressDiario> {
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0];

  console.log(`[progress] Calculando progresso diário para ${userId} em ${dateStr}`);

  // TODO: Buscar dados do dia de diferentes fontes
  // - exam_log (questões)
  // - srs_reviews (revisões)
  // - daily_plans (drops completados)
  // - tracking (tempo estudado, NEC, NCA)

  const progress: Partial<ProgressDiario> = {
    user_id: userId,
    date: dateStr,
    drops_completados: 0,
    questoes_respondidas: 0,
    questoes_corretas: 0,
    taxa_acerto: 0,
    tempo_estudado_minutos: 0,
    srs_revisoes: 0,
    xp_ganho: 0,
    nivel: 1,
    streak: 0,
  };

  // Salvar no banco
  await ProgressRepository.saveProgressDiario(progress);

  return progress as ProgressDiario;
}

// ============================================
// CÁLCULO DE PROGRESS SEMANAL
// ============================================

export async function calculateWeeklyProgress(userId: string, weekStart?: Date): Promise<ProgressSemanal> {
  const targetWeek = weekStart || getWeekStart(new Date());
  const weekStartStr = targetWeek.toISOString().split('T')[0];

  console.log(`[progress] Calculando progresso semanal para ${userId}, semana ${weekStartStr}`);

  // Buscar todos os dias da semana
  const weekEnd = new Date(targetWeek);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const dailyProgress = await ProgressRepository.getProgressDiarioRange(userId, targetWeek, weekEnd);

  // Agregar dados
  const totalDrops = dailyProgress.reduce((sum, p) => sum + p.drops_completados, 0);
  const totalQuestoes = dailyProgress.reduce((sum, p) => sum + p.questoes_respondidas, 0);
  const totalCorretas = dailyProgress.reduce((sum, p) => sum + p.questoes_corretas, 0);
  const tempoTotal = dailyProgress.reduce((sum, p) => sum + p.tempo_estudado_minutos, 0);
  const diasEstudados = dailyProgress.length;
  const taxaAcerto = totalQuestoes > 0 ? (totalCorretas / totalQuestoes) * 100 : 0;

  // Calcular evolução vs semana anterior
  const previousWeek = new Date(targetWeek);
  previousWeek.setDate(previousWeek.getDate() - 7);
  const previousWeekData = await ProgressRepository.getProgressSemanal(userId, previousWeek);
  
  let evolucao = undefined;
  if (previousWeekData && previousWeekData.total_questoes > 0) {
    evolucao = ((totalQuestoes - previousWeekData.total_questoes) / previousWeekData.total_questoes) * 100;
  }

  const progress: Partial<ProgressSemanal> = {
    user_id: userId,
    week_start: weekStartStr,
    total_drops: totalDrops,
    total_questoes: totalQuestoes,
    taxa_acerto: taxaAcerto,
    tempo_total_minutos: tempoTotal,
    dias_estudados: diasEstudados,
    evolucao_vs_semana_anterior: evolucao,
  };

  // Salvar no banco
  await ProgressRepository.saveProgressSemanal(progress);

  return progress as ProgressSemanal;
}

// ============================================
// CÁLCULO DE PROGRESS MENSAL
// ============================================

export async function calculateMonthlyProgress(userId: string, month?: Date): Promise<ProgressMensal> {
  const targetMonth = month || new Date();
  const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
  const monthStr = monthStart.toISOString().split('T')[0];

  console.log(`[progress] Calculando progresso mensal para ${userId}, mês ${monthStr}`);

  // Buscar todos os dias do mês
  const dailyProgress = await ProgressRepository.getProgressDiarioRange(userId, monthStart, monthEnd);

  // Agregar dados
  const totalDrops = dailyProgress.reduce((sum, p) => sum + p.drops_completados, 0);
  const totalQuestoes = dailyProgress.reduce((sum, p) => sum + p.questoes_respondidas, 0);
  const totalCorretas = dailyProgress.reduce((sum, p) => sum + p.questoes_corretas, 0);
  const tempoTotal = dailyProgress.reduce((sum, p) => sum + p.tempo_estudado_minutos, 0);
  const diasEstudados = dailyProgress.length;
  const taxaAcerto = totalQuestoes > 0 ? (totalCorretas / totalQuestoes) * 100 : 0;

  // Calcular evolução vs mês anterior
  const previousMonth = new Date(targetMonth);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const previousMonthData = await ProgressRepository.getProgressMensal(userId, previousMonth);
  
  let evolucao = undefined;
  if (previousMonthData && previousMonthData.total_questoes > 0) {
    evolucao = ((totalQuestoes - previousMonthData.total_questoes) / previousMonthData.total_questoes) * 100;
  }

  const progress: Partial<ProgressMensal> = {
    user_id: userId,
    month: monthStr,
    total_drops: totalDrops,
    total_questoes: totalQuestoes,
    taxa_acerto: taxaAcerto,
    tempo_total_minutos: tempoTotal,
    dias_estudados: diasEstudados,
    evolucao_vs_mes_anterior: evolucao,
  };

  // Salvar no banco
  await ProgressRepository.saveProgressMensal(progress);

  return progress as ProgressMensal;
}

// ============================================
// CÁLCULO DE MASTERY
// ============================================

export async function calculateMastery(
  userId: string,
  subtopico: string
): Promise<MasterySubtopico> {
  console.log(`[progress] Calculando mastery para ${userId}, subtópico: ${subtopico}`);

  // TODO: Buscar dados de performance do subtópico
  // - exam_log (taxa de acerto)
  // - srs_cards (retenção)
  // - tracking (velocidade de resposta)

  const tentativas = 0;
  const acertos = 0;
  const taxaAcerto = tentativas > 0 ? (acertos / tentativas) * 100 : 0;
  const retencaoSRS = 0;
  const velocidadeResposta = 0;
  const consistencia = 0;

  // Calcular mastery score (média ponderada)
  const masteryScore = (
    taxaAcerto * 0.4 +
    retencaoSRS * 0.3 +
    velocidadeResposta * 0.2 +
    consistencia * 0.1
  );

  // Determinar nível
  let nivel: 'iniciante' | 'intermediario' | 'avancado' | 'expert' = 'iniciante';
  if (masteryScore >= 90) nivel = 'expert';
  else if (masteryScore >= 70) nivel = 'avancado';
  else if (masteryScore >= 50) nivel = 'intermediario';

  const mastery: Partial<MasterySubtopico> = {
    user_id: userId,
    subtopico,
    mastery_score: masteryScore,
    taxa_acerto: taxaAcerto,
    retencao_srs: retencaoSRS,
    velocidade_resposta: velocidadeResposta,
    consistencia,
    nivel,
    tentativas,
    acertos,
    ultima_tentativa: new Date(),
  };

  // Salvar no banco
  await ProgressRepository.saveMasterySubtopico(mastery);

  return mastery as MasterySubtopico;
}

// ============================================
// OBTER DADOS DE PROGRESS
// ============================================

export async function getDailyProgress(userId: string, date?: Date): Promise<ProgressDiario | null> {
  const targetDate = date || new Date();
  return ProgressRepository.getProgressDiario(userId, targetDate);
}

export async function getWeeklyProgress(userId: string, weekStart?: Date): Promise<ProgressSemanal | null> {
  const targetWeek = weekStart || getWeekStart(new Date());
  return ProgressRepository.getProgressSemanal(userId, targetWeek);
}

export async function getMonthlyProgress(userId: string, month?: Date): Promise<ProgressMensal | null> {
  const targetMonth = month || new Date();
  return ProgressRepository.getProgressMensal(userId, targetMonth);
}

export async function getProgressHistory(userId: string, days: number = 30): Promise<{
  daily: ProgressDiario[];
  weekly: ProgressSemanal[];
  monthly: ProgressMensal[];
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const daily = await ProgressRepository.getProgressDiarioRange(userId, startDate, endDate);
  const weekly = await ProgressRepository.getProgressSemanalHistory(userId, Math.ceil(days / 7));
  const monthly = await ProgressRepository.getProgressMensalHistory(userId, Math.ceil(days / 30));

  return { daily, weekly, monthly };
}

export async function getProgressSummary(userId: string): Promise<any> {
  const summary = await ProgressRepository.getProgressSummary(userId);
  const masterySummary = await ProgressRepository.getMasterySummary(userId);

  return {
    progress: summary,
    mastery: masterySummary,
  };
}

// ============================================
// MASTERY
// ============================================

export async function getMastery(userId: string, subtopico?: string): Promise<MasterySubtopico | MasterySubtopico[]> {
  if (subtopico) {
    const mastery = await ProgressRepository.getMasterySubtopico(userId, subtopico);
    if (!mastery) {
      // Se não existe, calcular
      return calculateMastery(userId, subtopico);
    }
    return mastery;
  } else {
    return ProgressRepository.getAllMastery(userId);
  }
}

export async function getTopMastery(userId: string, limit: number = 10): Promise<MasterySubtopico[]> {
  return ProgressRepository.getTopMastery(userId, limit);
}

export async function getWeakMastery(userId: string, limit: number = 10): Promise<MasterySubtopico[]> {
  return ProgressRepository.getWeakMastery(userId, limit);
}

// ============================================
// ATUALIZAÇÃO EM TEMPO REAL
// ============================================

export async function updateProgressRealtime(params: {
  userId: string;
  type: 'drop' | 'question' | 'srs_review';
  correct?: boolean;
  timeSpent?: number;
  subtopico?: string;
}): Promise<void> {
  console.log(`[progress] Atualizando progresso em tempo real: ${params.type}`);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  // Buscar ou criar progresso do dia
  let progressToday = await ProgressRepository.getProgressDiario(params.userId, today);
  
  if (!progressToday) {
    progressToday = {
      id: '',
      user_id: params.userId,
      date: dateStr,
      drops_completados: 0,
      questoes_respondidas: 0,
      questoes_corretas: 0,
      taxa_acerto: 0,
      tempo_estudado_minutos: 0,
      srs_revisoes: 0,
      xp_ganho: 0,
      nivel: 1,
      streak: 0,
    };
  }

  // Atualizar baseado no tipo
  if (params.type === 'drop') {
    progressToday.drops_completados++;
  } else if (params.type === 'question') {
    progressToday.questoes_respondidas++;
    if (params.correct) {
      progressToday.questoes_corretas++;
    }
    // Recalcular taxa de acerto
    progressToday.taxa_acerto = (progressToday.questoes_corretas / progressToday.questoes_respondidas) * 100;
  } else if (params.type === 'srs_review') {
    progressToday.srs_revisoes++;
  }

  // Adicionar tempo
  if (params.timeSpent) {
    progressToday.tempo_estudado_minutos += Math.ceil(params.timeSpent / 60);
  }

  // Salvar
  await ProgressRepository.saveProgressDiario(progressToday);

  // Se tem subtópico, atualizar mastery
  if (params.subtopico) {
    await updateMasteryRealtime({
      userId: params.userId,
      subtopico: params.subtopico,
      correct: params.correct,
      timeSpent: params.timeSpent,
    });
  }
}

async function updateMasteryRealtime(params: {
  userId: string;
  subtopico: string;
  correct?: boolean;
  timeSpent?: number;
}): Promise<void> {
  let mastery = await ProgressRepository.getMasterySubtopico(params.userId, params.subtopico);

  if (!mastery) {
    mastery = {
      id: '',
      user_id: params.userId,
      subtopico: params.subtopico,
      mastery_score: 0,
      taxa_acerto: 0,
      nivel: 'iniciante',
      tentativas: 0,
      acertos: 0,
    };
  }

  mastery.tentativas++;
  if (params.correct) {
    mastery.acertos++;
  }
  mastery.taxa_acerto = (mastery.acertos / mastery.tentativas) * 100;
  mastery.ultima_tentativa = new Date();

  // Recalcular mastery score
  mastery.mastery_score = mastery.taxa_acerto; // Simplificado por ora

  // Atualizar nível
  if (mastery.mastery_score >= 90) mastery.nivel = 'expert';
  else if (mastery.mastery_score >= 70) mastery.nivel = 'avancado';
  else if (mastery.mastery_score >= 50) mastery.nivel = 'intermediario';
  else mastery.nivel = 'iniciante';

  await ProgressRepository.saveMasterySubtopico(mastery);
}

// ============================================
// HELPERS
// ============================================

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para segunda-feira
  return new Date(d.setDate(diff));
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const ProgressService = {
  calculateDailyProgress,
  calculateWeeklyProgress,
  calculateMonthlyProgress,
  calculateMastery,
  getDailyProgress,
  getWeeklyProgress,
  getMonthlyProgress,
  getProgressHistory,
  getProgressSummary,
  getMastery,
  getTopMastery,
  getWeakMastery,
  updateProgressRealtime,
};

export default ProgressService;
