/**
 * Personalization Engine
 * 
 * Motor de personalização que ajusta prioridades e planos de estudo
 * baseado no desempenho individual do usuário.
 */

import { query } from '../../db';
import { reweightByUserPerformance, type UserStat, type TopicWithPriority } from '../../config/goldRule';

// ============================================
// TIPOS
// ============================================

export interface ExamBlueprint {
  id: number;
  banca?: string;
  cargo?: string;
  disciplina?: string;
  blueprint: any;
  priorities?: any;
}

export interface ReweightedBlueprint extends ExamBlueprint {
  personalizedTopics: TopicWithPriority[];
}

export interface PersonalizationOptions {
  userId: string;
  blueprintId?: number;
  disciplina?: string;
  includeNewTopics?: boolean;
  maxTopics?: number;
}

export interface PersonalizationResult {
  userId: string;
  totalTopics: number;
  reviewTopics: number;
  newTopics: number;
  prioritizedTopics: TopicWithPriority[];
  generatedAt: string;
}

// ============================================
// BUSCAR DADOS DO USUÁRIO
// ============================================

/**
 * Busca estatísticas do usuário por disciplina ou blueprint
 */
export async function getUserStats(
  userId: string,
  filters?: { disciplina?: string; blueprintId?: number }
): Promise<UserStat[]> {
  let sql = `
    SELECT 
      topic_code,
      correct_count,
      wrong_count,
      streak,
      last_seen_at,
      next_due_at
    FROM user_stats
    WHERE user_id = $1
  `;

  const params: any[] = [userId];

  // Adicionar filtros opcionais
  // (requer join com drops se quiser filtrar por disciplina/blueprint)

  const { rows } = await query<UserStat>(sql, params);
  
  console.log(`[personalization] Encontradas ${rows.length} stats para userId=${userId}`);
  
  return rows;
}

/**
 * Busca tópicos de um blueprint
 */
export async function getBlueprintTopics(blueprintId: number): Promise<TopicWithPriority[]> {
  const { rows } = await query<{ blueprint: any }>(
    'SELECT blueprint FROM exam_blueprints WHERE id = $1',
    [blueprintId]
  );

  if (rows.length === 0) {
    console.warn(`[personalization] Blueprint ${blueprintId} não encontrado`);
    return [];
  }

  const blueprint = rows[0].blueprint;
  
  // Extrair tópicos do blueprint (estrutura pode variar)
  // Assumindo: { topics: [{ code, name, priority }] }
  const topics = blueprint?.topics || blueprint?.disciplines?.[0]?.topics || [];
  
  console.log(`[personalization] Blueprint ${blueprintId} tem ${topics.length} tópicos`);
  
  return topics.map((t: any) => ({
    code: t.code || t.topic_code,
    name: t.name || t.topic_name,
    priority: t.priority || t.weight || 0.5
  }));
}

/**
 * Busca todos os tópicos disponíveis (de todos os drops)
 */
export async function getAllAvailableTopics(): Promise<TopicWithPriority[]> {
  const { rows } = await query<{ topic_code: string; count: string }>(
    `
    SELECT 
      topic_code,
      COUNT(*) as count
    FROM drops
    WHERE topic_code IS NOT NULL
    GROUP BY topic_code
    ORDER BY COUNT(*) DESC
    `
  );

  console.log(`[personalization] ${rows.length} tópicos disponíveis no sistema`);

  return rows.map(r => ({
    code: r.topic_code,
    name: r.topic_code, // Nome pode ser enriquecido depois
    priority: 0.5, // Prioridade neutra
    dropCount: parseInt(r.count, 10)
  }));
}

// ============================================
// MOTOR DE PERSONALIZAÇÃO PRINCIPAL
// ============================================

/**
 * Gera plano personalizado para um usuário
 * 
 * Algoritmo:
 * 1. Busca estatísticas do usuário
 * 2. Busca tópicos do blueprint/disciplina
 * 3. Ajusta prioridades baseado no desempenho
 * 4. Identifica tópicos para revisão (SRS)
 * 5. Adiciona tópicos novos se necessário
 * 6. Retorna lista priorizada
 */
export async function generatePersonalizedPlan(
  options: PersonalizationOptions
): Promise<PersonalizationResult> {
  const { 
    userId, 
    blueprintId, 
    disciplina,
    includeNewTopics = true,
    maxTopics = 30
  } = options;

  console.log(`[personalization] Gerando plano personalizado para userId=${userId}`);

  // 1. Buscar stats do usuário
  const userStats = await getUserStats(userId, { disciplina, blueprintId });

  // 2. Buscar tópicos disponíveis
  let topics: TopicWithPriority[] = [];

  if (blueprintId) {
    topics = await getBlueprintTopics(blueprintId);
  } else {
    topics = await getAllAvailableTopics();
  }

  if (topics.length === 0) {
    console.warn('[personalization] ⚠️  Nenhum tópico disponível');
    return {
      userId,
      totalTopics: 0,
      reviewTopics: 0,
      newTopics: 0,
      prioritizedTopics: [],
      generatedAt: new Date().toISOString()
    };
  }

  // 3. Ajustar prioridades por desempenho do usuário
  const reweighted = reweightByUserPerformance(topics, userStats);

  // 4. Separar tópicos com revisão pendente
  const now = new Date();
  const reviewTopics = userStats
    .filter(s => s.next_due_at && new Date(s.next_due_at) <= now)
    .map(s => s.topic_code);

  const topicsForReview = reweighted.filter(t => reviewTopics.includes(t.code));
  const otherTopics = reweighted.filter(t => !reviewTopics.includes(t.code));

  // 5. Identificar tópicos novos (usuário nunca viu)
  const seenTopicCodes = new Set(userStats.map(s => s.topic_code));
  const newTopics = otherTopics.filter(t => !seenTopicCodes.has(t.code));
  const oldTopics = otherTopics.filter(t => seenTopicCodes.has(t.code));

  // 6. Priorizar: revisões > novos > antigos
  const prioritized: TopicWithPriority[] = [
    ...topicsForReview.sort((a, b) => (b.personalPriority || b.priority) - (a.personalPriority || a.priority)),
    ...(includeNewTopics ? newTopics.sort((a, b) => (b.personalPriority || b.priority) - (a.personalPriority || a.priority)) : []),
    ...oldTopics.sort((a, b) => (b.personalPriority || b.priority) - (a.personalPriority || a.priority))
  ];

  // 7. Limitar ao máximo
  const final = prioritized.slice(0, maxTopics);

  console.log(`[personalization] ✅ Plano gerado:`);
  console.log(`  - Total de tópicos: ${final.length}`);
  console.log(`  - Para revisão: ${topicsForReview.length}`);
  console.log(`  - Novos: ${newTopics.length}`);

  return {
    userId,
    totalTopics: final.length,
    reviewTopics: topicsForReview.length,
    newTopics: newTopics.length,
    prioritizedTopics: final,
    generatedAt: new Date().toISOString()
  };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Reweighta um blueprint completo com dados do usuário
 */
export async function reweightBlueprint(
  blueprintId: number,
  userId: string
): Promise<ReweightedBlueprint> {
  console.log(`[personalization] Reweighting blueprint ${blueprintId} para userId=${userId}`);

  // Buscar blueprint
  const { rows } = await query<ExamBlueprint>(
    'SELECT * FROM exam_blueprints WHERE id = $1',
    [blueprintId]
  );

  if (rows.length === 0) {
    throw new Error(`Blueprint ${blueprintId} não encontrado`);
  }

  const blueprint = rows[0];

  // Buscar tópicos
  const topics = await getBlueprintTopics(blueprintId);

  // Buscar stats do usuário
  const userStats = await getUserStats(userId);

  // Reweightar
  const personalizedTopics = reweightByUserPerformance(topics, userStats);

  return {
    ...blueprint,
    personalizedTopics
  };
}

/**
 * Calcula score de dificuldade para um usuário em um tópico
 */
export function calculateDifficultyScore(stat: UserStat): number {
  const totalAttempts = stat.correct_count + stat.wrong_count;
  
  if (totalAttempts === 0) return 0.5; // Neutro se nunca tentou
  
  const errorRate = stat.wrong_count / totalAttempts;
  
  // 0% erro = dificuldade 0 (fácil)
  // 100% erro = dificuldade 1 (difícil)
  return errorRate;
}

/**
 * Identifica tópicos que o usuário tem dificuldade
 */
export async function identifyWeakTopics(
  userId: string,
  minAttempts: number = 3,
  errorThreshold: number = 0.5
): Promise<UserStat[]> {
  const { rows } = await query<UserStat>(
    `
    SELECT 
      topic_code,
      correct_count,
      wrong_count,
      streak,
      last_seen_at,
      next_due_at
    FROM user_stats
    WHERE user_id = $1
      AND (correct_count + wrong_count) >= $2
    ORDER BY (wrong_count::float / (correct_count + wrong_count)) DESC
    `,
    [userId, minAttempts]
  );

  const weak = rows.filter(stat => {
    const errorRate = stat.wrong_count / (stat.correct_count + stat.wrong_count);
    return errorRate >= errorThreshold;
  });

  console.log(`[personalization] ${weak.length} tópicos com dificuldade (threshold: ${errorThreshold})`);

  return weak;
}

/**
 * Identifica tópicos que o usuário domina
 */
export async function identifyMasteredTopics(
  userId: string,
  minStreak: number = 5,
  minAccuracy: number = 0.8
): Promise<UserStat[]> {
  const { rows } = await query<UserStat>(
    `
    SELECT 
      topic_code,
      correct_count,
      wrong_count,
      streak,
      last_seen_at,
      next_due_at
    FROM user_stats
    WHERE user_id = $1
      AND streak >= $2
      AND (correct_count + wrong_count) > 0
    ORDER BY streak DESC
    `,
    [userId, minStreak]
  );

  const mastered = rows.filter(stat => {
    const accuracy = stat.correct_count / (stat.correct_count + stat.wrong_count);
    return accuracy >= minAccuracy;
  });

  console.log(`[personalization] ${mastered.length} tópicos dominados (streak >= ${minStreak}, accuracy >= ${minAccuracy})`);

  return mastered;
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const PersonalizationEngine = {
  generatePersonalizedPlan,
  reweightBlueprint,
  getUserStats,
  getBlueprintTopics,
  getAllAvailableTopics,
  calculateDifficultyScore,
  identifyWeakTopics,
  identifyMasteredTopics
};

export default PersonalizationEngine;
