/**
 * Adaptive Exam Engine
 * 
 * Motor de simulados adaptativos que ajusta dificuldade em tempo real
 */

import { query } from '../../db';

// ============================================
// TIPOS
// ============================================

export interface AdaptiveConfig {
  initialDifficulty: number; // 1-5
  minDifficulty: number;
  maxDifficulty: number;
  increaseThreshold: number; // Acertos consecutivos para aumentar
  decreaseThreshold: number; // Erros consecutivos para diminuir
  difficultyStep: number; // Quanto aumentar/diminuir
}

export interface QuestionSelection {
  questionId: string;
  difficulty: number;
  reason: string;
}

export interface AdaptiveState {
  currentDifficulty: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  totalCorrect: number;
  totalWrong: number;
  averageTime: number;
  performanceByDifficulty: Record<number, { correct: number; total: number }>;
  lastQuestions?: Array<{ id: string; correct: boolean; difficulty: number; time: number }>;
}

// ============================================
// CONFIGURAÇÕES PADRÃO
// ============================================

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  initialDifficulty: 3, // Começar no médio
  minDifficulty: 1,
  maxDifficulty: 5,
  increaseThreshold: 3, // 3 acertos seguidos
  decreaseThreshold: 2, // 2 erros seguidos
  difficultyStep: 1,
};

// ============================================
// MOTOR ADAPTATIVO
// ============================================

/**
 * Calcula próxima dificuldade baseado no desempenho
 */
export function calculateNextDifficulty(
  state: AdaptiveState,
  config: AdaptiveConfig = DEFAULT_ADAPTIVE_CONFIG
): number {
  let newDifficulty = state.currentDifficulty;

  // Aumentar dificuldade se acertou muitas seguidas
  if (state.consecutiveCorrect >= config.increaseThreshold) {
    newDifficulty = Math.min(
      config.maxDifficulty,
      state.currentDifficulty + config.difficultyStep
    );
    console.log(`[adaptive] ⬆️  Aumentando dificuldade: ${state.currentDifficulty} → ${newDifficulty}`);
  }
  // Diminuir dificuldade se errou muitas seguidas
  else if (state.consecutiveWrong >= config.decreaseThreshold) {
    newDifficulty = Math.max(
      config.minDifficulty,
      state.currentDifficulty - config.difficultyStep
    );
    console.log(`[adaptive] ⬇️  Diminuindo dificuldade: ${state.currentDifficulty} → ${newDifficulty}`);
  }

  // Ajuste fino baseado na taxa de acerto geral
  const totalAttempts = state.totalCorrect + state.totalWrong;
  if (totalAttempts >= 5) {
    const accuracy = state.totalCorrect / totalAttempts;

    // Se está acertando muito (>80%), tentar aumentar
    if (accuracy > 0.8 && newDifficulty < config.maxDifficulty) {
      newDifficulty = Math.min(config.maxDifficulty, newDifficulty + 0.5);
      console.log(`[adaptive] 📈 Ajuste fino (alta taxa): ${newDifficulty}`);
    }
    // Se está errando muito (<40%), tentar diminuir
    else if (accuracy < 0.4 && newDifficulty > config.minDifficulty) {
      newDifficulty = Math.max(config.minDifficulty, newDifficulty - config.difficultyStep);
      console.log(`[adaptive] 📉 Ajuste fino (baixa taxa): ${newDifficulty}`);
    }
  }

  return Math.round(newDifficulty);
}

export function getDifficultyTransition(
  prevDifficulty: number,
  nextDifficulty: number
): 'up' | 'down' | 'stable' {
  if (nextDifficulty > prevDifficulty) return 'up';
  if (nextDifficulty < prevDifficulty) return 'down';
  return 'stable';
}

/**
 * Atualiza estado adaptativo após resposta
 */
export function updateAdaptiveState(
  state: AdaptiveState,
  isCorrect: boolean,
  difficulty: number,
  timeSpent: number,
  questionId?: string
): AdaptiveState {
  const newState = { ...state };

  // Atualizar contadores consecutivos
  if (isCorrect) {
    newState.consecutiveCorrect++;
    newState.consecutiveWrong = 0;
    newState.totalCorrect++;
  } else {
    newState.consecutiveWrong++;
    newState.consecutiveCorrect = 0;
    newState.totalWrong++;
  }

  // Atualizar performance por dificuldade
  if (!newState.performanceByDifficulty[difficulty]) {
    newState.performanceByDifficulty[difficulty] = { correct: 0, total: 0 };
  }
  newState.performanceByDifficulty[difficulty].total++;
  if (isCorrect) {
    newState.performanceByDifficulty[difficulty].correct++;
  }

  // Atualizar tempo médio
  const totalAttempts = newState.totalCorrect + newState.totalWrong;
  newState.averageTime = 
    (newState.averageTime * (totalAttempts - 1) + timeSpent) / totalAttempts;

  // Rastrear últimas N questões
  const last = newState.lastQuestions ? [...newState.lastQuestions] : [];
  if (questionId) {
    last.push({ id: questionId, correct: isCorrect, difficulty, time: timeSpent });
    if (last.length > 10) last.shift();
  }
  newState.lastQuestions = last;

  return newState;
}

/**
 * Seleciona próxima questão baseado no estado adaptativo
 */
export async function selectNextQuestion(
  state: AdaptiveState,
  config: AdaptiveConfig,
  filters: {
    discipline?: string;
    topics?: string[];
    examBoard?: string;
    examBoards?: string[];
    excludeIds?: string[];
    bancaWeight?: number;
    desiredDifficulty?: number;
  }
): Promise<QuestionSelection | null> {
  // Calcular dificuldade desejada
  const targetDifficulty = filters.desiredDifficulty ?? calculateNextDifficulty(state, config);

  // Buscar questões na dificuldade alvo (±1 para ter opções)
  let sql = `
    SELECT id, difficulty, topic
    FROM questoes
    WHERE status = 'active'
    AND difficulty >= $1
    AND difficulty <= $2
  `;
  const params: any[] = [
    Math.max(1, targetDifficulty - 1),
    Math.min(5, targetDifficulty + 1),
  ];
  let paramIndex = 3;

  if (filters.discipline) {
    sql += ` AND discipline = $${paramIndex++}`;
    params.push(filters.discipline);
  }

  if (filters.topics && filters.topics.length > 0) {
    sql += ` AND topic = ANY($${paramIndex++})`;
    params.push(filters.topics);
  }

  if (filters.examBoards && filters.examBoards.length > 0) {
    sql += ` AND exam_board = ANY($${paramIndex++})`;
    params.push(filters.examBoards);
  } else if (filters.examBoard) {
    sql += ` AND exam_board = $${paramIndex++}`;
    params.push(filters.examBoard);
  }

  if (filters.excludeIds && filters.excludeIds.length > 0) {
    sql += ` AND id != ALL($${paramIndex++})`;
    params.push(filters.excludeIds);
  }

  // Ponderar banca/tópico se informado
  const weightBoard = filters.examBoard || (filters.examBoards ? filters.examBoards[0] : undefined);
  if (filters.bancaWeight && filters.bancaWeight > 0 && weightBoard) {
    sql += ` ORDER BY (CASE WHEN exam_board = $${paramIndex++} THEN $${paramIndex++} ELSE 1 END) * RANDOM() DESC LIMIT 1`;
    params.push(weightBoard, filters.bancaWeight);
  } else {
    sql += ` ORDER BY RANDOM() LIMIT 1`;
  }

  const { rows } = await query<{ id: string; difficulty: number; topic: string }>(
    sql,
    params
  );

  if (rows.length === 0) {
    console.warn('[adaptive] ⚠️  Nenhuma questão encontrada');
    return null;
  }

  const question = rows[0];
  const reason = getSelectionReason(state, question.difficulty, targetDifficulty);

  return {
    questionId: question.id,
    difficulty: question.difficulty,
    reason,
  };
}

/**
 * Determina razão da seleção
 */
function getSelectionReason(
  state: AdaptiveState,
  selectedDifficulty: number,
  targetDifficulty: number
): string {
  if (state.consecutiveCorrect >= 3) {
    return 'Desempenho alto - aumentando desafio';
  }
  if (state.consecutiveWrong >= 3) {
    return 'Dificuldade encontrada - ajustando nível';
  }
  if (selectedDifficulty > state.currentDifficulty) {
    return 'Testando nível mais alto';
  }
  if (selectedDifficulty < state.currentDifficulty) {
    return 'Reforçando fundamentos';
  }
  return 'Mantendo nível atual';
}

/**
 * Cria estado adaptativo inicial
 */
export function createInitialState(
  config: AdaptiveConfig = DEFAULT_ADAPTIVE_CONFIG
): AdaptiveState {
  return {
    currentDifficulty: config.initialDifficulty,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    totalCorrect: 0,
    totalWrong: 0,
    averageTime: 0,
    performanceByDifficulty: {},
  };
}

/**
 * Predição de desempenho futuro
 */
export function predictPerformance(state: AdaptiveState): {
  predictedAccuracy: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
} {
  const totalAttempts = state.totalCorrect + state.totalWrong;
  
  if (totalAttempts < 5) {
    return {
      predictedAccuracy: 0.5,
      confidence: 0.3,
      trend: 'stable',
    };
  }

  const currentAccuracy = state.totalCorrect / totalAttempts;
  
  // Calcular tendência baseada nos últimos resultados
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (state.consecutiveCorrect >= 2) {
    trend = 'improving';
  } else if (state.consecutiveWrong >= 2) {
    trend = 'declining';
  }

  // Confiança aumenta com mais tentativas
  const confidence = Math.min(0.9, totalAttempts / 20);

  return {
    predictedAccuracy: currentAccuracy,
    confidence,
    trend,
  };
}

/**
 * Calcula score de dificuldade percebida
 */
export function calculatePerceivedDifficulty(state: AdaptiveState): number {
  let weightedSum = 0;
  let totalWeight = 0;

  Object.entries(state.performanceByDifficulty).forEach(([diff, perf]) => {
    const difficulty = parseInt(diff);
    const accuracy = perf.correct / perf.total;
    
    // Peso maior para dificuldades mais recentes (implícito pelo estado)
    const weight = perf.total;
    
    // Dificuldade percebida: quanto menor a taxa de acerto, mais difícil
    const perceivedDiff = difficulty * (2 - accuracy);
    
    weightedSum += perceivedDiff * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 3;
}
