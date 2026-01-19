/**
 * Gold Rule Configuration
 * 
 * Define regras de priorização e geração de drops
 * baseadas no edital e no desempenho do usuário.
 */

// ============================================
// CONSTANTES DE CONFIGURAÇÃO
// ============================================

/**
 * Threshold mínimo de prioridade para gerar drops
 * Tópicos com prioridade < PRIORITY_THRESHOLD são ignorados
 */
export const PRIORITY_THRESHOLD = 0.7;

/**
 * Temperatura do softmax para distribuição de probabilidades
 * Valores maiores = distribuição mais uniforme
 * Valores menores = concentração nos tópicos top
 */
export const SOFTMAX_TEMPERATURE = 1.5;

/**
 * Número máximo de drops por tópico
 */
export const MAX_DROPS_PER_TOPIC = 10;

/**
 * Número mínimo de drops por tópico (para tópicos prioritários)
 */
export const MIN_DROPS_PER_TOPIC = 3;

/**
 * Score mínimo de prioridade para considerar tópico
 */
export const MIN_PRIORITY_SCORE = 0.3;

/**
 * Peso do erro do usuário na repriorização
 * 0.0 = não considera erros
 * 1.0 = erros têm peso total
 */
export const ERROR_WEIGHT = 0.5;

/**
 * Penalidade por domínio (streak alto)
 * Reduz prioridade de tópicos que o usuário já domina
 */
export const MASTERY_PENALTY = 0.2;

/**
 * Streak mínimo para considerar "dominado"
 */
export const MASTERY_STREAK_THRESHOLD = 5;

// ============================================
// FUNÇÕES DE PRIORIZAÇÃO
// ============================================

/**
 * Aplica softmax para normalizar prioridades
 * 
 * @param scores - Array de scores de prioridade
 * @param temperature - Temperatura para controlar distribuição
 * @returns Array de probabilidades normalizadas (soma = 1)
 */
export function applySoftmax(scores: number[], temperature: number = SOFTMAX_TEMPERATURE): number[] {
  if (scores.length === 0) return [];
  
  // Aplicar exponencial com temperatura
  const exp = scores.map(s => Math.exp(s / temperature));
  
  // Somar todos os valores
  const sum = exp.reduce((a, b) => a + b, 0);
  
  // Normalizar (dividir pelo total)
  return exp.map(e => e / sum);
}

/**
 * Filtra tópicos por threshold de prioridade
 * 
 * @param topics - Array de tópicos com prioridade
 * @param threshold - Valor mínimo de prioridade
 * @returns Tópicos filtrados
 */
export function filterByThreshold<T extends { priority: number }>(
  topics: T[],
  threshold: number = PRIORITY_THRESHOLD
): T[] {
  return topics.filter(topic => topic.priority >= threshold);
}

/**
 * Limita número de tópicos/drops
 * 
 * @param items - Array de itens
 * @param max - Número máximo
 * @returns Itens limitados
 */
export function limitItems<T>(items: T[], max: number): T[] {
  return items.slice(0, max);
}

// ============================================
// GOLD RULE PRINCIPAL
// ============================================

export interface TopicWithPriority {
  code: string;
  name: string;
  priority: number;
  [key: string]: any;
}

export interface GoldRuleOptions {
  maxPerTopic?: number;
  threshold?: number;
  temperature?: number;
}

/**
 * Aplica Gold Rule: filtra, normaliza e prioriza tópicos
 * 
 * @param topics - Lista de tópicos com prioridades
 * @param options - Opções de configuração
 * @returns Tópicos priorizados e filtrados
 */
export function applyGoldRule(
  topics: TopicWithPriority[],
  options: GoldRuleOptions = {}
): TopicWithPriority[] {
  const {
    maxPerTopic = MAX_DROPS_PER_TOPIC,
    threshold = PRIORITY_THRESHOLD,
    temperature = SOFTMAX_TEMPERATURE
  } = options;

  console.log(`[gold-rule] Aplicando Gold Rule em ${topics.length} tópicos`);
  console.log(`[gold-rule] Threshold: ${threshold}, Temperature: ${temperature}`);

  // 1. Filtrar por score mínimo
  const validTopics = topics.filter(t => t.priority >= MIN_PRIORITY_SCORE);
  console.log(`[gold-rule] ${validTopics.length} tópicos com priority >= ${MIN_PRIORITY_SCORE}`);

  if (validTopics.length === 0) {
    console.warn('[gold-rule] ⚠️  Nenhum tópico válido após filtro mínimo');
    return [];
  }

  // 2. Aplicar softmax para normalizar
  const priorities = validTopics.map(t => t.priority);
  const softmaxScores = applySoftmax(priorities, temperature);
  
  const topicsWithSoftmax = validTopics.map((topic, i) => ({
    ...topic,
    softmaxScore: softmaxScores[i]
  }));

  // 3. Filtrar por threshold
  const filtered = topicsWithSoftmax.filter(t => t.softmaxScore >= threshold);
  console.log(`[gold-rule] ${filtered.length} tópicos com softmax >= ${threshold}`);

  // 4. Ordenar por softmax score (maior primeiro)
  const sorted = filtered.sort((a, b) => b.softmaxScore - a.softmaxScore);

  // 5. Limitar quantidade
  const limited = limitItems(sorted, maxPerTopic);
  console.log(`[gold-rule] ✅ ${limited.length} tópicos finais (max: ${maxPerTopic})`);

  return limited;
}

// ============================================
// PERSONALIZAÇÃO POR USUÁRIO
// ============================================

export interface UserStat {
  topic_code: string;
  correct_count: number;
  wrong_count: number;
  streak: number;
  last_seen_at?: string;
  next_due_at?: string;
}

/**
 * Ajusta prioridades baseado no desempenho do usuário
 * 
 * @param topics - Tópicos com prioridade base
 * @param userStats - Estatísticas do usuário
 * @returns Tópicos com prioridade ajustada
 */
export function reweightByUserPerformance(
  topics: TopicWithPriority[],
  userStats: UserStat[]
): TopicWithPriority[] {
  console.log(`[gold-rule] Ajustando prioridades para ${userStats.length} stats do usuário`);

  return topics.map(topic => {
    const stat = userStats.find(s => s.topic_code === topic.code);
    
    // Se usuário nunca viu, mantém prioridade original
    if (!stat) {
      return { ...topic, personalPriority: topic.priority };
    }

    let adjustment = 0;

    // 1. Aumenta prioridade se usuário erra muito
    const totalAttempts = stat.correct_count + stat.wrong_count;
    if (totalAttempts > 0) {
      const errorRate = stat.wrong_count / totalAttempts;
      adjustment += errorRate * ERROR_WEIGHT;
    }

    // 2. Diminui prioridade se já domina (streak alto)
    if (stat.streak >= MASTERY_STREAK_THRESHOLD) {
      adjustment -= MASTERY_PENALTY;
    }

    // 3. Calcula nova prioridade (limitada entre 0 e 1)
    const newPriority = Math.max(0, Math.min(1, topic.priority + adjustment));

    console.log(`[gold-rule] ${topic.code}: ${topic.priority.toFixed(2)} → ${newPriority.toFixed(2)} (adj: ${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(2)})`);

    return {
      ...topic,
      personalPriority: newPriority,
      originalPriority: topic.priority,
      adjustment
    };
  });
}

// ============================================
// EXPORTAÇÃO COMPLETA
// ============================================

export const GoldRuleConfig = {
  // Constantes
  PRIORITY_THRESHOLD,
  SOFTMAX_TEMPERATURE,
  MAX_DROPS_PER_TOPIC,
  MIN_DROPS_PER_TOPIC,
  MIN_PRIORITY_SCORE,
  ERROR_WEIGHT,
  MASTERY_PENALTY,
  MASTERY_STREAK_THRESHOLD,

  // Funções
  applySoftmax,
  filterByThreshold,
  limitItems,
  applyGoldRule,
  reweightByUserPerformance
};

export default GoldRuleConfig;
