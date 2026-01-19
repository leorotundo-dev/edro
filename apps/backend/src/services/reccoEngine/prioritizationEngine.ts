/**
 * Prioritization Engine
 * 
 * Motor de priorização que decide O QUE estudar
 * baseado em múltiplos critérios
 */

import { query } from '../../db';
import type { Priority, DiagnosisResult } from '../../types/reccoEngine';
import { PersonalizationEngine } from '../personalization/engine';

// ============================================
// TIPOS
// ============================================

export interface PrioritizationInput {
  userId: string;
  diagnosis: DiagnosisResult;
  blueprintId?: number;
  diasAteProva?: number;
  bancaPreferencial?: string;
  forceTopics?: string[];
}

export interface PrioritizationResult {
  priorities: Priority[];
  scores: {
    urgencia_edital: number;
    peso_banca: number;
    proximidade_prova: number;
    fraquezas_criticas: number;
    temas_alta_probabilidade: number;
    lacunas_memoria: number;
  };
}

// ============================================
// CRITÉRIOS DE PRIORIZAÇÃO
// ============================================

/**
 * Calcula urgência do edital (tópicos ainda não cobertos)
 * Score: 1-10
 */
async function calculateUrgenciaEdital(userId: string, blueprintId?: number): Promise<number> {
  // Buscar tópicos do edital
  const { rows: totalTopics } = await query<{ count: string }>(`
    SELECT COUNT(DISTINCT topic_code) as count
    FROM drops
    ${blueprintId ? 'WHERE blueprint_id = $1' : ''}
  `, blueprintId ? [blueprintId] : []);

  // Buscar tópicos já vistos pelo usuário
  const { rows: seenTopics } = await query<{ count: string }>(`
    SELECT COUNT(DISTINCT topic_code) as count
    FROM user_stats
    WHERE user_id = $1
  `, [userId]);

  const total = parseInt(totalTopics[0]?.count || '0', 10);
  const seen = parseInt(seenTopics[0]?.count || '0', 10);

  if (total === 0) return 5; // Neutro

  const coverage = seen / total;
  
  // 0% cobertura = urgência 10 (muito urgente)
  // 100% cobertura = urgência 1 (pouco urgente)
  const urgencia = Math.max(1, Math.min(10, Math.round(10 - (coverage * 9))));

  console.log(`[prioritization] Urgência Edital: ${urgencia}/10 (${seen}/${total} tópicos vistos)`);
  return urgencia;
}

/**
 * Calcula peso da banca (estilo de banca específico)
 * Score: 1-10
 */
async function calculatePesoBanca(userId: string, banca?: string): Promise<number> {
  if (!banca) return 5; // Neutro se não especificado

  // Buscar desempenho do usuário nessa banca
  const { rows } = await query<{ avg_acerto: string }>(`
    SELECT AVG(
      CASE WHEN correct_count + wrong_count > 0 
        THEN correct_count::float / (correct_count + wrong_count)
        ELSE 0 
      END
    ) as avg_acerto
    FROM user_stats us
    JOIN drops d ON d.topic_code = us.topic_code
    WHERE us.user_id = $1 AND d.banca = $2
  `, [userId, banca]);

  const avgAcerto = parseFloat(rows[0]?.avg_acerto || '0.5');

  // Baixo desempenho = peso alto (precisa focar mais)
  const peso = Math.max(1, Math.min(10, Math.round(10 - (avgAcerto * 9))));

  console.log(`[prioritization] Peso Banca ${banca}: ${peso}/10 (acerto: ${(avgAcerto * 100).toFixed(1)}%)`);
  return peso;
}

/**
 * Calcula proximidade da prova (urgência temporal)
 * Score: 1-10
 */
function calculateProximidadeProva(diasAteProva?: number): number {
  if (!diasAteProva) return 5; // Neutro

  // Menos de 7 dias = urgência máxima
  if (diasAteProva <= 7) return 10;
  
  // Menos de 30 dias = urgência alta
  if (diasAteProva <= 30) return 8;
  
  // Menos de 60 dias = urgência média-alta
  if (diasAteProva <= 60) return 6;
  
  // Menos de 90 dias = urgência média
  if (diasAteProva <= 90) return 4;
  
  // Mais de 90 dias = urgência baixa
  return 2;
}

/**
 * Calcula fraquezas críticas (tópicos com alto erro)
 * Score: 1-10
 */
async function calculateFraquezasCriticas(userId: string): Promise<number> {
  const weakTopics = await PersonalizationEngine.identifyWeakTopics(userId, 3, 0.6);

  // Muitos tópicos fracos = score alto (precisa focar)
  const count = weakTopics.length;
  
  if (count === 0) return 1; // Sem fraquezas
  if (count <= 3) return 5;
  if (count <= 7) return 8;
  return 10; // Muitas fraquezas

  console.log(`[prioritization] Fraquezas Críticas: ${count} tópicos fracos`);
}

/**
 * Calcula temas de alta probabilidade (frequentes em provas)
 * Score: 1-10
 */
async function calculateTemasAltaProbabilidade(blueprintId?: number): Promise<number> {
  if (!blueprintId) return 5;

  // Buscar blueprint e extrair tópicos prioritários
  const { rows } = await query<{ priorities: any }>(`
    SELECT priorities FROM exam_blueprints WHERE id = $1
  `, [blueprintId]);

  if (rows.length === 0) return 5;

  const priorities = rows[0].priorities || {};
  const highPriorityCount = Object.values(priorities).filter((p: any) => p > 0.7).length;

  // Muitos tópicos prioritários = score alto
  if (highPriorityCount === 0) return 3;
  if (highPriorityCount <= 5) return 6;
  if (highPriorityCount <= 10) return 8;
  return 10;
}

/**
 * Calcula lacunas de memória (SRS cards overdue)
 * Score: 1-10
 */
async function calculateLacunasMemoria(userId: string): Promise<number> {
  const { rows } = await query<{ overdue: string }>(`
    SELECT COUNT(*) as overdue
    FROM srs_cards
    WHERE user_id = $1 AND next_review_at < NOW()
  `, [userId]);

  const overdue = parseInt(rows[0]?.overdue || '0', 10);

  // Muitos cards atrasados = score alto
  if (overdue === 0) return 1;
  if (overdue <= 5) return 3;
  if (overdue <= 10) return 6;
  if (overdue <= 20) return 8;
  return 10;
}

// ============================================
// MOTOR DE PRIORIZAÇÃO PRINCIPAL
// ============================================

/**
 * Calcula prioridades de estudo para o usuário
 */
export async function calculatePriorities(input: PrioritizationInput): Promise<PrioritizationResult> {
  console.log(`[prioritization] Calculando prioridades para userId=${input.userId}`);

  // 1. Calcular scores dos critérios
  const [
    urgencia_edital,
    peso_banca,
    fraquezas_criticas,
    temas_alta_probabilidade,
    lacunas_memoria
  ] = await Promise.all([
    calculateUrgenciaEdital(input.userId, input.blueprintId),
    calculatePesoBanca(input.userId, input.bancaPreferencial),
    calculateFraquezasCriticas(input.userId),
    calculateTemasAltaProbabilidade(input.blueprintId),
    calculateLacunasMemoria(input.userId)
  ]);

  const proximidade_prova = calculateProximidadeProva(input.diasAteProva);

  const scores = {
    urgencia_edital,
    peso_banca,
    proximidade_prova,
    fraquezas_criticas,
    temas_alta_probabilidade,
    lacunas_memoria
  };

  console.log(`[prioritization] Scores calculados:`, scores);

  // 2. Buscar tópicos candidatos
  const candidateTopics = await getCandidateTopics(input.userId, input.blueprintId);

  // 3. Calcular score final para cada tópico
  const priorities: Priority[] = candidateTopics.map(topic => {
    const score = calculateTopicScore(topic, scores, input.diagnosis);
    
    return {
      action: `Estudar ${topic.name || topic.code}`,
      score: Math.round(score * 100) / 100,
      reason: determineReason(topic, scores),
      urgency: Math.ceil(score),
      type: determineContentType(topic, input.diagnosis),
      content_id: topic.id || topic.code
    };
  });

  // 4. Ordenar por score (maior primeiro)
  priorities.sort((a, b) => b.score - a.score);

  console.log(`[prioritization] ✅ ${priorities.length} prioridades calculadas`);
  console.log(`[prioritization] Top 3:`, priorities.slice(0, 3).map(p => `${p.action} (${p.score})`));

  return { priorities, scores };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Busca tópicos candidatos para priorização
 */
async function getCandidateTopics(userId: string, blueprintId?: number): Promise<any[]> {
  let sql = `
    SELECT DISTINCT 
      d.id,
      d.topic_code as code,
      d.title as name,
      d.difficulty,
      us.correct_count,
      us.wrong_count,
      us.streak,
      sc.next_review_at as srs_due
    FROM drops d
    LEFT JOIN user_stats us ON us.topic_code = d.topic_code AND us.user_id = $1
    LEFT JOIN srs_cards sc ON sc.drop_id = d.id AND sc.user_id = $1
  `;

  const params: any[] = [userId];

  if (blueprintId) {
    sql += ` WHERE d.blueprint_id = $2`;
    params.push(blueprintId);
  }

  sql += ` ORDER BY d.topic_code LIMIT 100`;

  const { rows } = await query(sql, params);

  console.log(`[prioritization] ${rows.length} tópicos candidatos encontrados`);
  return rows;
}

/**
 * Calcula score final de um tópico
 */
function calculateTopicScore(
  topic: any,
  scores: any,
  diagnosis: DiagnosisResult
): number {
  let score = 5; // Base neutra

  // 1. Aplicar critérios globais
  score += (scores.urgencia_edital / 10) * 2; // Peso 2x
  score += (scores.proximidade_prova / 10) * 1.5; // Peso 1.5x
  score += (scores.temas_alta_probabilidade / 10) * 1;

  // 2. Aplicar critérios do tópico
  const totalAttempts = (topic.correct_count || 0) + (topic.wrong_count || 0);
  
  if (totalAttempts > 0) {
    const errorRate = (topic.wrong_count || 0) / totalAttempts;
    score += errorRate * 3; // Tópicos com mais erros = mais prioridade
  }

  // 3. Tópico nunca visto = prioridade média-alta
  if (totalAttempts === 0) {
    score += 2;
  }

  // 4. SRS overdue = prioridade alta
  if (topic.srs_due && new Date(topic.srs_due) < new Date()) {
    score += 4; // Reforço urgente
  }

  // 5. Ajustar por estado cognitivo
  if (diagnosis.estado_cognitivo === 'baixo' || diagnosis.estado_cognitivo === 'saturado') {
    // Estado baixo = preferir drops fáceis
    if (topic.difficulty <= 2) score += 1;
  } else if (diagnosis.estado_cognitivo === 'alto') {
    // Estado alto = preferir drops difíceis
    if (topic.difficulty >= 4) score += 1;
  }

  // 6. Limitar entre 1-10
  return Math.max(1, Math.min(10, score));
}

/**
 * Determina razão da prioridade
 */
function determineReason(topic: any, scores: any): string {
  const reasons: string[] = [];

  const totalAttempts = (topic.correct_count || 0) + (topic.wrong_count || 0);
  
  if (totalAttempts === 0) {
    reasons.push('tópico novo');
  }

  if (totalAttempts > 0) {
    const errorRate = (topic.wrong_count || 0) / totalAttempts;
    if (errorRate > 0.6) reasons.push('alto índice de erros');
  }

  if (topic.srs_due && new Date(topic.srs_due) < new Date()) {
    reasons.push('revisão atrasada');
  }

  if (scores.proximidade_prova >= 8) {
    reasons.push('prova próxima');
  }

  if (scores.urgencia_edital >= 8) {
    reasons.push('tópico do edital ainda não estudado');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'reforço geral';
}

/**
 * Determina tipo de conteúdo ideal
 */
function determineContentType(topic: any, diagnosis: DiagnosisResult): 'drop' | 'questao' | 'revisao' | 'simulado' {
  // SRS overdue = revisão
  if (topic.srs_due && new Date(topic.srs_due) < new Date()) {
    return 'revisao';
  }

  // Tópico novo = drop
  const totalAttempts = (topic.correct_count || 0) + (topic.wrong_count || 0);
  if (totalAttempts === 0) {
    return 'drop';
  }

  // Alto erro = questão para fixar
  const errorRate = (topic.wrong_count || 0) / totalAttempts;
  if (errorRate > 0.5) {
    return 'questao';
  }

  // Estado alto + tópico dominado = simulado
  if (diagnosis.estado_cognitivo === 'alto' && (topic.streak || 0) >= 5) {
    return 'simulado';
  }

  // Default = drop
  return 'drop';
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const PrioritizationEngine = {
  calculatePriorities,
  calculateUrgenciaEdital,
  calculatePesoBanca,
  calculateProximidadeProva,
  calculateFraquezasCriticas,
  calculateTemasAltaProbabilidade,
  calculateLacunasMemoria
};

export default PrioritizationEngine;
