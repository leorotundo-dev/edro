/**
 * Analysis Engine
 * 
 * Gera 10 mapas de análise do simulado
 */

import { query } from '../../db';

// ============================================
// TIPOS
// ============================================

export interface SimuladoExecution {
  id: string;
  user_id: string;
  simulado_id: string;
  questions: Array<{
    question_id: string;
    selected_answer: string;
    is_correct: boolean;
    time_spent: number;
    difficulty: number;
    topic: string;
    concepts: string[];
    exam_board?: string;
    discipline?: string;
    cognitive_level?: string;
    tags?: any;
  }>;
  started_at: string;
  finished_at?: string;
  total_time?: number;
  adaptive_state: any;
}

export interface SimuladoAnalysis {
  // Mapa 1: Resumo Geral
  summary: {
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    accuracy: number;
    total_time_seconds: number;
    average_time_per_question: number;
    score: number; // 0-100
    grade: string; // A, B, C, D, F
  };

  // Mapa 2: Performance por Dificuldade
  performanceByDifficulty: Array<{
    difficulty: number;
    total: number;
    correct: number;
    accuracy: number;
  }>;

  // Mapa 3: Performance por Tópico
  performanceByTopic: Array<{
    topic: string;
    total: number;
    correct: number;
    accuracy: number;
    average_time: number;
  }>;

  // Mapa extra: Performance por Banca
  performanceByBanca: Array<{
    banca: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;

  // Mapa extra: Tempo
  timeMap: {
    buckets: Array<{
      label: string;
      total: number;
      correct: number;
      accuracy: number;
      average_time: number;
    }>;
    slow_questions: Array<{
      question_id: string;
      topic: string;
      time_spent: number;
    }>;
    fast_questions: Array<{
      question_id: string;
      topic: string;
      time_spent: number;
    }>;
  };

  // Mapa extra: Erros
  errorMap: {
    total_errors: number;
    by_topic: Array<{
      topic: string;
      count: number;
      average_time: number;
    }>;
    questions: Array<{
      question_id: string;
      topic: string;
      difficulty: number;
      time_spent: number;
    }>;
  };

  // Mapa 4: Mapa de Calor (Timeline)
  heatmap: Array<{
    question_number: number;
    is_correct: boolean;
    difficulty: number;
    time_spent: number;
    streak: number; // Sequência de acertos/erros
  }>;

  // Mapa 5: Evolução Durante o Simulado
  evolution: {
    accuracy_trend: Array<{ question: number; accuracy: number }>;
    difficulty_trend: Array<{ question: number; difficulty: number }>;
    time_trend: Array<{ question: number; time: number }>;
  };

  // Mapa 6: Pontos Fortes
  strengths: Array<{
    topic: string;
    accuracy: number;
    reason: string;
  }>;

  // Mapa 7: Pontos Fracos
  weaknesses: Array<{
    topic: string;
    accuracy: number;
    reason: string;
    priority: 'alta' | 'média' | 'baixa';
  }>;

  // Mapa 8: Comparação com Outros Alunos
  comparison: {
    your_score: number;
    average_score: number;
    percentile: number; // 0-100
    better_than_percent: number;
  };

  // Mapa 9: Predição de Nota
  prediction: {
    estimated_score: number;
    confidence: number;
    factors: Array<{ factor: string; impact: number }>;
  };

  // Mapa 10: Recomendações
  recommendations: Array<{
    type: 'study' | 'review' | 'practice' | 'rest';
    priority: 'alta' | 'média' | 'baixa';
    title: string;
    description: string;
    topics?: string[];
  }>;
}

// ============================================
// GERAÇÃO DOS 10 MAPAS
// ============================================

/**
 * Gera análise completa com 10 mapas
 */
export async function generateFullAnalysis(
  execution: SimuladoExecution
): Promise<SimuladoAnalysis> {
  console.log(`[analysis] Gerando análise completa para execução ${execution.id}`);

  const [
    summary,
    performanceByDifficulty,
    performanceByTopic,
    performanceByBanca,
    timeMap,
    errorMap,
    heatmap,
    evolution,
    strengths,
    weaknesses,
    comparison,
    prediction,
    recommendations,
  ] = await Promise.all([
    generateSummary(execution),
    generatePerformanceByDifficulty(execution),
    generatePerformanceByTopic(execution),
    generatePerformanceByBanca(execution),
    generateTimeMap(execution),
    generateErrorMap(execution),
    generateHeatmap(execution),
    generateEvolution(execution),
    generateStrengths(execution),
    generateWeaknesses(execution),
    generateComparison(execution),
    generatePrediction(execution),
    generateRecommendations(execution),
  ]);

  return {
    summary,
    performanceByDifficulty,
    performanceByTopic,
    performanceByBanca,
    timeMap,
    errorMap,
    heatmap,
    evolution,
    strengths,
    weaknesses,
    comparison,
    prediction,
    recommendations,
  };
}

// ============================================
// MAPA 1: RESUMO GERAL
// ============================================

async function generateSummary(execution: SimuladoExecution) {
  const correct = execution.questions.filter(q => q.is_correct).length;
  const total = execution.questions.length;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const totalTime = execution.questions.reduce((sum, q) => sum + q.time_spent, 0);
  const avgTime = total > 0 ? totalTime / total : 0;

  const score = Math.round(accuracy);
  const grade = getGrade(accuracy);

  return {
    total_questions: total,
    correct_answers: correct,
    wrong_answers: total - correct,
    accuracy: Math.round(accuracy * 10) / 10,
    total_time_seconds: totalTime,
    average_time_per_question: Math.round(avgTime),
    score,
    grade,
  };
}

function getGrade(accuracy: number): string {
  if (accuracy >= 90) return 'A';
  if (accuracy >= 80) return 'B';
  if (accuracy >= 70) return 'C';
  if (accuracy >= 60) return 'D';
  return 'F';
}

// ============================================
// MAPA 2: PERFORMANCE POR DIFICULDADE
// ============================================

async function generatePerformanceByDifficulty(execution: SimuladoExecution) {
  const byDifficulty: Record<number, { total: number; correct: number }> = {};

  execution.questions.forEach(q => {
    if (!byDifficulty[q.difficulty]) {
      byDifficulty[q.difficulty] = { total: 0, correct: 0 };
    }
    byDifficulty[q.difficulty].total++;
    if (q.is_correct) {
      byDifficulty[q.difficulty].correct++;
    }
  });

  return Object.entries(byDifficulty)
    .map(([diff, stats]) => ({
      difficulty: parseInt(diff),
      total: stats.total,
      correct: stats.correct,
      accuracy: Math.round((stats.correct / stats.total) * 100 * 10) / 10,
    }))
    .sort((a, b) => a.difficulty - b.difficulty);
}

// ============================================
// MAPA 3: PERFORMANCE POR TÓPICO
// ============================================

async function generatePerformanceByTopic(execution: SimuladoExecution) {
  const byTopic: Record<string, { total: number; correct: number; timeSum: number }> = {};

  execution.questions.forEach(q => {
    const topic = q.topic || 'N/A';
    if (!byTopic[topic]) {
      byTopic[topic] = { total: 0, correct: 0, timeSum: 0 };
    }
    byTopic[topic].total++;
    byTopic[topic].timeSum += q.time_spent;
    if (q.is_correct) {
      byTopic[topic].correct++;
    }
  });

  return Object.entries(byTopic)
    .map(([topic, stats]) => ({
      topic,
      total: stats.total,
      correct: stats.correct,
      accuracy: Math.round((stats.correct / stats.total) * 100 * 10) / 10,
      average_time: Math.round(stats.timeSum / stats.total),
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

// ============================================
// MAPA EXTRA: PERFORMANCE POR BANCA
// ============================================

async function generatePerformanceByBanca(execution: SimuladoExecution) {
  const byBanca: Record<string, { total: number; correct: number }> = {};

  execution.questions.forEach((q) => {
    const banca = q.exam_board || 'N/A';
    if (!byBanca[banca]) {
      byBanca[banca] = { total: 0, correct: 0 };
    }
    byBanca[banca].total += 1;
    if (q.is_correct) byBanca[banca].correct += 1;
  });

  return Object.entries(byBanca)
    .map(([banca, stats]) => ({
      banca,
      total: stats.total,
      correct: stats.correct,
      accuracy: Math.round((stats.correct / stats.total) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

// ============================================
// MAPA EXTRA: TEMPO
// ============================================

async function generateTimeMap(execution: SimuladoExecution) {
  const buckets = [
    { label: 'rapidas', max: 60 },
    { label: 'normais', max: 120 },
    { label: 'lentas', max: Number.POSITIVE_INFINITY },
  ];

  const bucketStats = buckets.map((bucket) => ({
    label: bucket.label,
    total: 0,
    correct: 0,
    accuracy: 0,
    average_time: 0,
    timeSum: 0,
  }));

  execution.questions.forEach((q) => {
    const bucketIndex = buckets.findIndex((b) => q.time_spent <= b.max);
    const idx = bucketIndex >= 0 ? bucketIndex : bucketStats.length - 1;
    const bucket = bucketStats[idx];
    bucket.total += 1;
    if (q.is_correct) bucket.correct += 1;
    bucket.timeSum += q.time_spent;
  });

  const bucketsResult = bucketStats.map((bucket) => ({
    label: bucket.label,
    total: bucket.total,
    correct: bucket.correct,
    accuracy: bucket.total > 0 ? Math.round((bucket.correct / bucket.total) * 100 * 10) / 10 : 0,
    average_time: bucket.total > 0 ? Math.round(bucket.timeSum / bucket.total) : 0,
  }));

  const slowQuestions = [...execution.questions]
    .sort((a, b) => b.time_spent - a.time_spent)
    .slice(0, 5)
    .map((q) => ({
      question_id: q.question_id,
      topic: q.topic,
      time_spent: q.time_spent,
    }));

  const fastQuestions = [...execution.questions]
    .sort((a, b) => a.time_spent - b.time_spent)
    .slice(0, 5)
    .map((q) => ({
      question_id: q.question_id,
      topic: q.topic,
      time_spent: q.time_spent,
    }));

  return {
    buckets: bucketsResult,
    slow_questions: slowQuestions,
    fast_questions: fastQuestions,
  };
}

// ============================================
// MAPA EXTRA: ERROS
// ============================================

async function generateErrorMap(execution: SimuladoExecution) {
  const errors = execution.questions.filter((q) => !q.is_correct);
  const byTopic: Record<string, { count: number; timeSum: number }> = {};

  errors.forEach((q) => {
    const topic = q.topic || 'N/A';
    if (!byTopic[topic]) {
      byTopic[topic] = { count: 0, timeSum: 0 };
    }
    byTopic[topic].count += 1;
    byTopic[topic].timeSum += q.time_spent;
  });

  const byTopicList = Object.entries(byTopic).map(([topic, stats]) => ({
    topic,
    count: stats.count,
    average_time: stats.count > 0 ? Math.round(stats.timeSum / stats.count) : 0,
  }));

  return {
    total_errors: errors.length,
    by_topic: byTopicList.sort((a, b) => b.count - a.count),
    questions: errors.slice(0, 10).map((q) => ({
      question_id: q.question_id,
      topic: q.topic,
      difficulty: q.difficulty,
      time_spent: q.time_spent,
    })),
  };
}

// ============================================
// MAPA 4: MAPA DE CALOR
// ============================================

async function generateHeatmap(execution: SimuladoExecution) {
  let currentStreak = 0;
  let lastWasCorrect = false;

  return execution.questions.map((q, index) => {
    if (index === 0) {
      currentStreak = q.is_correct ? 1 : -1;
      lastWasCorrect = q.is_correct;
    } else {
      if (q.is_correct === lastWasCorrect) {
        currentStreak = q.is_correct ? currentStreak + 1 : currentStreak - 1;
      } else {
        currentStreak = q.is_correct ? 1 : -1;
        lastWasCorrect = q.is_correct;
      }
    }

    return {
      question_number: index + 1,
      is_correct: q.is_correct,
      difficulty: q.difficulty,
      time_spent: q.time_spent,
      streak: currentStreak,
    };
  });
}

// ============================================
// MAPA 5: EVOLUÇÃO
// ============================================

async function generateEvolution(execution: SimuladoExecution) {
  const accuracyTrend: Array<{ question: number; accuracy: number }> = [];
  const difficultyTrend: Array<{ question: number; difficulty: number }> = [];
  const timeTrend: Array<{ question: number; time: number }> = [];

  let cumulativeCorrect = 0;

  execution.questions.forEach((q, index) => {
    if (q.is_correct) cumulativeCorrect++;
    
    const currentAccuracy = ((cumulativeCorrect / (index + 1)) * 100);
    
    accuracyTrend.push({
      question: index + 1,
      accuracy: Math.round(currentAccuracy * 10) / 10,
    });

    difficultyTrend.push({
      question: index + 1,
      difficulty: q.difficulty,
    });

    timeTrend.push({
      question: index + 1,
      time: q.time_spent,
    });
  });

  return {
    accuracy_trend: accuracyTrend,
    difficulty_trend: difficultyTrend,
    time_trend: timeTrend,
  };
}

// ============================================
// MAPA 6: PONTOS FORTES
// ============================================

async function generateStrengths(execution: SimuladoExecution) {
  const byTopic = await generatePerformanceByTopic(execution);
  
  return byTopic
    .filter(t => t.accuracy >= 75 && t.total >= 2)
    .slice(0, 5)
    .map(t => ({
      topic: t.topic,
      accuracy: t.accuracy,
      reason: t.accuracy >= 90 ? 'Domínio completo' : 'Bom desempenho',
    }));
}

// ============================================
// MAPA 7: PONTOS FRACOS
// ============================================

async function generateWeaknesses(execution: SimuladoExecution) {
  const byTopic = await generatePerformanceByTopic(execution);
  
  return byTopic
    .filter(t => t.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)
    .map(t => ({
      topic: t.topic,
      accuracy: t.accuracy,
      reason: t.accuracy < 30 ? 'Necessita estudo urgente' : 'Requer revisão',
      priority: (t.accuracy < 30 ? 'alta' : t.accuracy < 50 ? 'média' : 'baixa') as any,
    }));
}

// ============================================
// MAPA 8: COMPARAÇÃO
// ============================================

async function generateComparison(execution: SimuladoExecution) {
  const yourScore = (execution.questions.filter(q => q.is_correct).length / execution.questions.length) * 100;

  // Buscar média de outros alunos no mesmo simulado
  const { rows } = await query<{ avg_score: string; count: string }>(`
    SELECT 
      AVG((correct_count::float / total_questions) * 100) as avg_score,
      COUNT(*) as count
    FROM simulados_resultados
    WHERE simulado_id = $1 AND user_id != $2
  `, [execution.simulado_id, execution.user_id]);

  const averageScore = rows[0]?.avg_score ? parseFloat(rows[0].avg_score) : yourScore;
  const count = parseInt(rows[0]?.count || '0');

  // Calcular percentil (simplificado)
  const betterThan = yourScore >= averageScore ? 
    Math.min(95, 50 + ((yourScore - averageScore) / averageScore * 50)) :
    Math.max(5, 50 - ((averageScore - yourScore) / averageScore * 50));

  return {
    your_score: Math.round(yourScore * 10) / 10,
    average_score: Math.round(averageScore * 10) / 10,
    percentile: Math.round(betterThan),
    better_than_percent: Math.round(betterThan),
  };
}

// ============================================
// MAPA 9: PREDIÇÃO
// ============================================

async function generatePrediction(execution: SimuladoExecution) {
  const currentScore = (execution.questions.filter(q => q.is_correct).length / execution.questions.length) * 100;
  const totalTime = execution.total_time ?? execution.questions.reduce((sum, q) => sum + q.time_spent, 0);

  // Fatores que influenciam a predição
  const factors = [];
  
  // Fator 1: Desempenho atual
  factors.push({
    factor: 'Desempenho atual',
    impact: currentScore >= 70 ? 10 : currentScore >= 50 ? 0 : -10,
  });

  // Fator 2: Evolução (melhorou ou piorou)
  const firstHalf = execution.questions.slice(0, Math.floor(execution.questions.length / 2));
  const secondHalf = execution.questions.slice(Math.floor(execution.questions.length / 2));
  
  const firstHalfAccuracy = firstHalf.filter(q => q.is_correct).length / firstHalf.length;
  const secondHalfAccuracy = secondHalf.filter(q => q.is_correct).length / secondHalf.length;
  
  const evolutionImpact = (secondHalfAccuracy - firstHalfAccuracy) * 50;
  factors.push({
    factor: 'Evolução durante simulado',
    impact: Math.round(evolutionImpact),
  });

  // Fator 3: Tempo médio
  const avgTime = execution.questions.length > 0 ? totalTime / execution.questions.length : 0;
  const timeImpact = avgTime < 60 ? -5 : avgTime > 180 ? -5 : 5;
  factors.push({
    factor: 'Gestão de tempo',
    impact: timeImpact,
  });

  const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
  const estimatedScore = Math.max(0, Math.min(100, currentScore + totalImpact));
  const confidence = execution.questions.length >= 20 ? 0.8 : 0.6;

  return {
    estimated_score: Math.round(estimatedScore),
    confidence,
    factors,
  };
}

// ============================================
// MAPA 10: RECOMENDAÇÕES
// ============================================

async function generateRecommendations(execution: SimuladoExecution) {
  const recommendations = [];
  const weaknesses = await generateWeaknesses(execution);
  const summary = await generateSummary(execution);

  // Recomendação 1: Revisar pontos fracos
  if (weaknesses.length > 0) {
    recommendations.push({
      type: 'review' as const,
      priority: 'alta' as const,
      title: 'Revisar Tópicos com Dificuldade',
      description: `Você teve dificuldade em ${weaknesses.length} tópicos. Recomendamos revisar esses conteúdos.`,
      topics: weaknesses.map(w => w.topic),
    });
  }

  // Recomendação 2: Praticar mais
  if (summary.accuracy < 70) {
    recommendations.push({
      type: 'practice' as const,
      priority: 'alta' as const,
      title: 'Aumentar Prática com Questões',
      description: 'Resolver mais questões vai melhorar seu desempenho. Recomendamos 20-30 questões por dia.',
    });
  }

  // Recomendação 3: Gestão de tempo
  if (summary.average_time_per_question > 180) {
    recommendations.push({
      type: 'practice' as const,
      priority: 'média' as const,
      title: 'Melhorar Gestão de Tempo',
      description: 'Você está gastando muito tempo por questão. Pratique resolver questões em menos de 3 minutos.',
    });
  }

  // Recomendação 4: Descanso
  if (execution.questions.length >= 30 && summary.accuracy < 60) {
    recommendations.push({
      type: 'rest' as const,
      priority: 'média' as const,
      title: 'Fazer uma Pausa',
      description: 'Seu desempenho pode melhorar com descanso adequado. Faça intervalos regulares.',
    });
  }

  // Recomendação 5: Continuar estudando pontos fortes
  const strengths = await generateStrengths(execution);
  if (strengths.length > 0) {
    recommendations.push({
      type: 'study' as const,
      priority: 'baixa' as const,
      title: 'Manter Pontos Fortes',
      description: 'Continue estudando os tópicos que você domina para não perder o conhecimento.',
      topics: strengths.map(s => s.topic),
    });
  }

  return recommendations;
}
