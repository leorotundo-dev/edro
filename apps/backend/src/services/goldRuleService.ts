/**
 * Gold Rule Service
 * 
 * Sistema de priorização baseado na Regra de Ouro
 * "O que cai mais? O que tem mais peso? O que você erra mais?"
 */

import { query } from '../db';

// ============================================
// TIPOS
// ============================================

export interface GoldRuleCriteria {
  frequencia_em_provas: number;        // 0-100 (% de provas que aparece)
  peso_no_edital: number;              // 0-10 (importância oficial)
  taxa_erro_aluno: number;             // 0-100 (% de erros do aluno)
  ultima_cobranca: number;             // dias desde última cobrança
  tendencia_banca: number;             // 0-10 (tendência de cobrar)
}

export interface GoldRuleScore {
  subtopico: string;
  score: number;
  criterios: GoldRuleCriteria;
  prioridade: 'muito_alta' | 'alta' | 'media' | 'baixa' | 'muito_baixa';
  recomendacao: string;
}

export interface GoldRuleWeights {
  frequencia: number;
  peso_edital: number;
  taxa_erro: number;
  ultima_cobranca: number;
  tendencia: number;
}

// Pesos padrão da Regra de Ouro
export const DEFAULT_WEIGHTS: GoldRuleWeights = {
  frequencia: 0.35,          // 35% - O que cai mais
  peso_edital: 0.25,         // 25% - O que tem mais peso
  taxa_erro: 0.25,           // 25% - O que você erra mais
  ultima_cobranca: 0.10,     // 10% - Atualidade
  tendencia: 0.05,           // 5%  - Tendência da banca
};

// ============================================
// CALCULAR SCORE
// ============================================

export async function calculateGoldRuleScore(params: {
  subtopico: string;
  userId: string;
  blueprintId?: string;
  banca?: string;
  weights?: GoldRuleWeights;
}): Promise<GoldRuleScore> {
  console.log(`[gold-rule] Calculando score para: ${params.subtopico}`);

  const weights = params.weights || DEFAULT_WEIGHTS;

  // Buscar critérios
  const criterios = await getCriteria({
    subtopico: params.subtopico,
    userId: params.userId,
    blueprintId: params.blueprintId,
    banca: params.banca,
  });

  // Normalizar critérios (0-1)
  const freq = criterios.frequencia_em_provas / 100;
  const peso = criterios.peso_no_edital / 10;
  const erro = criterios.taxa_erro_aluno / 100;
  const ultima = normalizeUltimaCobranca(criterios.ultima_cobranca);
  const tend = criterios.tendencia_banca / 10;

  // Calcular score final (0-100)
  const score = (
    freq * weights.frequencia +
    peso * weights.peso_edital +
    erro * weights.taxa_erro +
    ultima * weights.ultima_cobranca +
    tend * weights.tendencia
  ) * 100;

  // Determinar prioridade
  const prioridade = determinePriority(score);

  // Gerar recomendação
  const recomendacao = generateRecommendation(score, criterios);

  return {
    subtopico: params.subtopico,
    score,
    criterios,
    prioridade,
    recomendacao,
  };
}

// ============================================
// BUSCAR CRITÉRIOS
// ============================================

async function getCriteria(params: {
  subtopico: string;
  userId: string;
  blueprintId?: string;
  banca?: string;
}): Promise<GoldRuleCriteria> {
  // Buscar frequência em provas
  const frequencia = await getFrequenciaEmProvas(params.subtopico, params.banca);

  // Buscar peso no edital
  const peso = await getPesoNoEdital(params.subtopico, params.blueprintId);

  // Buscar taxa de erro do aluno
  const taxaErro = await getTaxaErroAluno(params.subtopico, params.userId);

  // Buscar última cobrança
  const ultimaCobranca = await getUltimaCobranca(params.subtopico, params.banca);

  // Buscar tendência da banca
  const tendencia = await getTendenciaBanca(params.subtopico, params.banca);

  return {
    frequencia_em_provas: frequencia,
    peso_no_edital: peso,
    taxa_erro_aluno: taxaErro,
    ultima_cobranca: ultimaCobranca,
    tendencia_banca: tendencia,
  };
}

async function getFrequenciaEmProvas(subtopico: string, banca?: string): Promise<number> {
  // TODO: Buscar em histórico de questões
  // Por ora, retorna valor simulado
  return Math.random() * 100;
}

async function getPesoNoEdital(subtopico: string, blueprintId?: string): Promise<number> {
  if (!blueprintId) return 5; // Peso médio padrão

  // TODO: Buscar peso no blueprint
  return 5;
}

async function getTaxaErroAluno(subtopico: string, userId: string): Promise<number> {
  const { rows } = await query(`
    SELECT 
      SUM(CASE WHEN correct = false THEN 1 ELSE 0 END)::float / 
      COUNT(*)::float * 100 as taxa_erro
    FROM exam_log
    WHERE user_id = $1 
      AND subtopico = $2
  `, [userId, subtopico]);

  return rows[0]?.taxa_erro || 0;
}

async function getUltimaCobranca(subtopico: string, banca?: string): Promise<number> {
  // TODO: Buscar última questão com esse subtópico
  // Por ora, retorna valor simulado (0-365 dias)
  return Math.floor(Math.random() * 365);
}

async function getTendenciaBanca(subtopico: string, banca?: string): Promise<number> {
  // TODO: Analisar tendência de cobrança da banca
  // Por ora, retorna valor simulado
  return Math.random() * 10;
}

// ============================================
// HELPERS
// ============================================

function normalizeUltimaCobranca(dias: number): number {
  // Quanto mais recente, maior a prioridade
  // 0 dias = 1.0, 365 dias = 0.0
  const normalized = Math.max(0, (365 - dias) / 365);
  return normalized;
}

function determinePriority(score: number): 'muito_alta' | 'alta' | 'media' | 'baixa' | 'muito_baixa' {
  if (score >= 80) return 'muito_alta';
  if (score >= 60) return 'alta';
  if (score >= 40) return 'media';
  if (score >= 20) return 'baixa';
  return 'muito_baixa';
}

function generateRecommendation(score: number, criterios: GoldRuleCriteria): string {
  const reasons: string[] = [];

  if (criterios.frequencia_em_provas > 70) {
    reasons.push('aparece frequentemente em provas');
  }

  if (criterios.peso_no_edital >= 7) {
    reasons.push('tem alto peso no edital');
  }

  if (criterios.taxa_erro_aluno > 50) {
    reasons.push('você tem dificuldade neste tópico');
  }

  if (criterios.ultima_cobranca < 30) {
    reasons.push('foi cobrado recentemente');
  }

  if (criterios.tendencia_banca >= 7) {
    reasons.push('é tendência da banca');
  }

  if (reasons.length === 0) {
    return 'Tópico de prioridade padrão';
  }

  return `Estude este tópico porque ${reasons.join(', ')}.`;
}

// ============================================
// PRIORIZAR LISTA
// ============================================

export async function prioritizeContent(params: {
  subtopicos: string[];
  userId: string;
  blueprintId?: string;
  banca?: string;
  weights?: GoldRuleWeights;
  limit?: number;
}): Promise<GoldRuleScore[]> {
  console.log(`[gold-rule] Priorizando ${params.subtopicos.length} subtópicos`);

  const scores: GoldRuleScore[] = [];

  for (const subtopico of params.subtopicos) {
    try {
      const score = await calculateGoldRuleScore({
        subtopico,
        userId: params.userId,
        blueprintId: params.blueprintId,
        banca: params.banca,
        weights: params.weights,
      });
      scores.push(score);
    } catch (err) {
      console.error(`[gold-rule] Erro ao calcular ${subtopico}:`, err);
    }
  }

  // Ordenar por score (maior primeiro)
  scores.sort((a, b) => b.score - a.score);

  // Limitar quantidade
  const limit = params.limit || scores.length;
  return scores.slice(0, limit);
}

// ============================================
// APLICAR REGRA DE OURO
// ============================================

export async function applyGoldRule(params: {
  userId: string;
  blueprintId?: string;
  banca?: string;
  limit?: number;
}): Promise<{
  prioridade_muito_alta: GoldRuleScore[];
  prioridade_alta: GoldRuleScore[];
  prioridade_media: GoldRuleScore[];
  total_analisados: number;
}> {
  console.log(`[gold-rule] Aplicando Regra de Ouro para usuário ${params.userId}`);

  // Buscar todos os subtópicos disponíveis
  // TODO: Buscar do blueprint ou de todas as questões
  const subtopicos: string[] = await getAllSubtopicos(params.blueprintId);

  // Priorizar
  const scores = await prioritizeContent({
    subtopicos,
    userId: params.userId,
    blueprintId: params.blueprintId,
    banca: params.banca,
    limit: params.limit,
  });

  // Agrupar por prioridade
  const muitoAlta = scores.filter(s => s.prioridade === 'muito_alta');
  const alta = scores.filter(s => s.prioridade === 'alta');
  const media = scores.filter(s => s.prioridade === 'media');

  return {
    prioridade_muito_alta: muitoAlta,
    prioridade_alta: alta,
    prioridade_media: media,
    total_analisados: scores.length,
  };
}

async function getAllSubtopicos(blueprintId?: string): Promise<string[]> {
  // TODO: Buscar do blueprint ou de questões
  // Por ora, retorna lista vazia
  return [];
}

// ============================================
// ESTATÍSTICAS
// ============================================

export async function getGoldRuleStats(userId: string): Promise<{
  total_subtopicos_analisados: number;
  prioridades: {
    muito_alta: number;
    alta: number;
    media: number;
    baixa: number;
    muito_baixa: number;
  };
  criterios_medios: GoldRuleCriteria;
}> {
  // TODO: Implementar estatísticas
  return {
    total_subtopicos_analisados: 0,
    prioridades: {
      muito_alta: 0,
      alta: 0,
      media: 0,
      baixa: 0,
      muito_baixa: 0,
    },
    criterios_medios: {
      frequencia_em_provas: 0,
      peso_no_edital: 0,
      taxa_erro_aluno: 0,
      ultima_cobranca: 0,
      tendencia_banca: 0,
    },
  };
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const GoldRuleService = {
  calculateGoldRuleScore,
  prioritizeContent,
  applyGoldRule,
  getGoldRuleStats,
  DEFAULT_WEIGHTS,
};

export default GoldRuleService;
