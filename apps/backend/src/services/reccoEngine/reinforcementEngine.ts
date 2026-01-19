/**
 * Reinforcement Engine
 * 
 * Sistema de reforço inteligente após erros ou fraquezas detectadas
 * Parte final do ReccoEngine V3
 */

import { query } from '../../db';
import type { Drop } from '../../types/drop';

// ============================================
// TIPOS
// ============================================

export interface WeaknessDetection {
  subtopico: string;
  nivel_fraqueza: 'critico' | 'alto' | 'medio' | 'baixo';
  erros_consecutivos: number;
  taxa_acerto: number;
  retencao_srs: number;
  motivo: string;
  recomendacoes: string[];
}

export interface ReinforcementPlan {
  subtopico: string;
  acoes: ReinforcementAction[];
  duracao_estimada: number;
  prioridade: number;
}

export interface ReinforcementAction {
  tipo: 'drop' | 'mnemonico' | 'questao' | 'srs_extra' | 'revisao';
  content_id?: string;
  descricao: string;
  ordem: number;
  duration_minutes: number;
}

export interface IntervalAdjustment {
  subtopico: string;
  intervalo_atual: number;
  intervalo_sugerido: number;
  ease_factor_atual: number;
  ease_factor_sugerido: number;
  motivo: string;
}

// ============================================
// DETECTAR FRAQUEZAS
// ============================================

export async function detectWeakness(params: {
  userId: string;
  subtopico?: string;
  minErrors?: number;
}): Promise<WeaknessDetection[]> {
  console.log(`[reinforcement] Detectando fraquezas para ${params.userId}`);

  const minErrors = params.minErrors || 3;
  const weaknesses: WeaknessDetection[] = [];

  // Buscar subtópicos com problemas
  let sql = `
    SELECT 
      subtopico,
      SUM(CASE WHEN correct = false THEN 1 ELSE 0 END) as erros,
      SUM(CASE WHEN correct = true THEN 1 ELSE 0 END) as acertos,
      COUNT(*) as total,
      SUM(CASE WHEN correct = false THEN 1 ELSE 0 END)::float / COUNT(*)::float as taxa_erro
    FROM exam_log
    WHERE user_id = $1
  `;

  const params_sql: any[] = [params.userId];
  let paramCount = 2;

  if (params.subtopico) {
    sql += ` AND subtopico = $${paramCount++}`;
    params_sql.push(params.subtopico);
  }

  sql += `
    GROUP BY subtopico
    HAVING SUM(CASE WHEN correct = false THEN 1 ELSE 0 END) >= $${paramCount}
    ORDER BY taxa_erro DESC
  `;
  params_sql.push(minErrors);

  const { rows } = await query(sql, params_sql);

  for (const row of rows) {
    const erros = parseInt(row.erros);
    const acertos = parseInt(row.acertos);
    const total = parseInt(row.total);
    const taxaAcerto = (acertos / total) * 100;
    const taxaErro = parseFloat(row.taxa_erro) * 100;

    // Verificar erros consecutivos
    const errosConsecutivos = await getConsecutiveErrors(params.userId, row.subtopico);

    // Buscar retenção SRS
    const retencaoSRS = await getSRSRetention(params.userId, row.subtopico);

    // Determinar nível de fraqueza
    let nivel: 'critico' | 'alto' | 'medio' | 'baixo' = 'baixo';
    if (errosConsecutivos >= 5 || taxaErro >= 70) {
      nivel = 'critico';
    } else if (errosConsecutivos >= 3 || taxaErro >= 50) {
      nivel = 'alto';
    } else if (taxaErro >= 30) {
      nivel = 'medio';
    }

    // Gerar motivo
    const motivos: string[] = [];
    if (errosConsecutivos >= 3) {
      motivos.push(`${errosConsecutivos} erros consecutivos`);
    }
    if (taxaErro >= 50) {
      motivos.push(`taxa de erro de ${taxaErro.toFixed(1)}%`);
    }
    if (retencaoSRS < 50) {
      motivos.push(`baixa retenção no SRS (${retencaoSRS.toFixed(1)}%)`);
    }

    const motivo = motivos.join(', ');

    // Gerar recomendações
    const recomendacoes = generateRecommendations(nivel, taxaAcerto, retencaoSRS);

    weaknesses.push({
      subtopico: row.subtopico,
      nivel_fraqueza: nivel,
      erros_consecutivos: errosConsecutivos,
      taxa_acerto: taxaAcerto,
      retencao_srs: retencaoSRS,
      motivo,
      recomendacoes,
    });
  }

  console.log(`[reinforcement] ✅ Detectadas ${weaknesses.length} fraquezas`);

  return weaknesses;
}

async function getConsecutiveErrors(userId: string, subtopico: string): Promise<number> {
  const { rows } = await query(`
    SELECT correct
    FROM exam_log
    WHERE user_id = $1 AND subtopico = $2
    ORDER BY timestamp DESC
    LIMIT 10
  `, [userId, subtopico]);

  let consecutive = 0;
  for (const row of rows) {
    if (!row.correct) {
      consecutive++;
    } else {
      break;
    }
  }

  return consecutive;
}

async function getSRSRetention(userId: string, subtopico: string): Promise<number> {
  const { rows } = await query(`
    SELECT 
      SUM(CASE WHEN quality >= 3 THEN 1 ELSE 0 END)::float / 
      COUNT(*)::float * 100 as retencao
    FROM srs_reviews
    WHERE card_id IN (
      SELECT id FROM srs_cards WHERE user_id = $1 AND subtopico = $2
    )
  `, [userId, subtopico]);

  return rows[0]?.retencao || 0;
}

function generateRecommendations(
  nivel: string,
  taxaAcerto: number,
  retencaoSRS: number
): string[] {
  const recomendacoes: string[] = [];

  if (nivel === 'critico' || nivel === 'alto') {
    recomendacoes.push('Revise a teoria deste tópico');
    recomendacoes.push('Use mnemônicos para fixar conceitos');
    recomendacoes.push('Resolva questões comentadas');
  }

  if (taxaAcerto < 40) {
    recomendacoes.push('Foque em entender os fundamentos');
  }

  if (retencaoSRS < 50) {
    recomendacoes.push('Aumente a frequência de revisão SRS');
    recomendacoes.push('Reduza os intervalos de revisão');
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push('Continue praticando com questões');
  }

  return recomendacoes;
}

// ============================================
// GERAR PLANO DE REFORÇO
// ============================================

export async function generateReinforcementPlan(params: {
  userId: string;
  subtopico: string;
  weakness: WeaknessDetection;
}): Promise<ReinforcementPlan> {
  console.log(`[reinforcement] Gerando plano de reforço para ${params.subtopico}`);

  const acoes: ReinforcementAction[] = [];
  let ordem = 1;

  // 1. Revisar teoria (Drop)
  const drops = await findDropsForTopic(params.subtopico);
  if (drops.length > 0) {
    acoes.push({
      tipo: 'drop',
      content_id: drops[0].id,
      descricao: `Revisar Drop: ${drops[0].title}`,
      ordem: ordem++,
      duration_minutes: 10,
    });
  }

  // 2. Criar/usar mnemônico
  acoes.push({
    tipo: 'mnemonico',
    descricao: `Criar mnemônico para ${params.subtopico}`,
    ordem: ordem++,
    duration_minutes: 5,
  });

  // 3. Resolver questões fáceis
  acoes.push({
    tipo: 'questao',
    descricao: `Resolver 3 questões fáceis sobre ${params.subtopico}`,
    ordem: ordem++,
    duration_minutes: 15,
  });

  // 4. Revisão SRS extra
  if (params.weakness.retencao_srs < 60) {
    acoes.push({
      tipo: 'srs_extra',
      descricao: `Revisão extra de cards SRS`,
      ordem: ordem++,
      duration_minutes: 10,
    });
  }

  // 5. Resolver questões médias/difíceis
  acoes.push({
    tipo: 'questao',
    descricao: `Resolver 3 questões médias sobre ${params.subtopico}`,
    ordem: ordem++,
    duration_minutes: 15,
  });

  const duracaoTotal = acoes.reduce((sum, a) => sum + a.duration_minutes, 0);

  // Prioridade baseada no nível de fraqueza
  const prioridades = {
    critico: 10,
    alto: 8,
    medio: 6,
    baixo: 4,
  };
  const prioridade = prioridades[params.weakness.nivel_fraqueza] || 5;

  return {
    subtopico: params.subtopico,
    acoes,
    duracao_estimada: duracaoTotal,
    prioridade,
  };
}

async function findDropsForTopic(subtopico: string): Promise<Drop[]> {
  // TODO: Buscar drops relacionados ao subtópico
  return [];
}

// ============================================
// AJUSTAR INTERVALOS SRS
// ============================================

export async function adjustIntervals(params: {
  userId: string;
  subtopico?: string;
}): Promise<IntervalAdjustment[]> {
  console.log(`[reinforcement] Ajustando intervalos SRS para ${params.userId}`);

  const adjustments: IntervalAdjustment[] = [];

  // Buscar cards com baixa retenção
  let sql = `
    SELECT 
      sc.subtopico,
      sc.interval,
      sc.ease_factor,
      AVG(CASE WHEN sr.quality >= 3 THEN 1 ELSE 0 END) as retencao
    FROM srs_cards sc
    LEFT JOIN srs_reviews sr ON sr.card_id = sc.id
    WHERE sc.user_id = $1
  `;

  const params_sql: any[] = [params.userId];
  let paramCount = 2;

  if (params.subtopico) {
    sql += ` AND sc.subtopico = $${paramCount++}`;
    params_sql.push(params.subtopico);
  }

  sql += `
    GROUP BY sc.subtopico, sc.interval, sc.ease_factor
    HAVING AVG(CASE WHEN sr.quality >= 3 THEN 1 ELSE 0 END) < 0.7
  `;

  const { rows } = await query(sql, params_sql);

  for (const row of rows) {
    const retencao = parseFloat(row.retencao) * 100;
    const intervaloAtual = row.interval;
    const easeAtual = row.ease_factor;

    // Calcular ajustes
    let intervaloSugerido = intervaloAtual;
    let easeSugerido = easeAtual;
    let motivo = '';

    if (retencao < 50) {
      // Retenção muito baixa - reduzir drasticamente
      intervaloSugerido = Math.floor(intervaloAtual * 0.5);
      easeSugerido = Math.max(1.3, easeAtual - 0.2);
      motivo = 'Retenção muito baixa (< 50%)';
    } else if (retencao < 70) {
      // Retenção baixa - reduzir moderadamente
      intervaloSugerido = Math.floor(intervaloAtual * 0.7);
      easeSugerido = Math.max(1.3, easeAtual - 0.1);
      motivo = 'Retenção baixa (< 70%)';
    }

    adjustments.push({
      subtopico: row.subtopico,
      intervalo_atual: intervaloAtual,
      intervalo_sugerido: intervaloSugerido,
      ease_factor_atual: easeAtual,
      ease_factor_sugerido: easeSugerido,
      motivo,
    });
  }

  console.log(`[reinforcement] ✅ ${adjustments.length} ajustes sugeridos`);

  return adjustments;
}

// ============================================
// APLICAR AJUSTES
// ============================================

export async function applyIntervalAdjustments(
  userId: string,
  adjustments: IntervalAdjustment[]
): Promise<void> {
  console.log(`[reinforcement] Aplicando ${adjustments.length} ajustes`);

  for (const adjustment of adjustments) {
    await query(`
      UPDATE srs_cards
      SET 
        interval = $2,
        ease_factor = $3,
        updated_at = NOW()
      WHERE user_id = $1 AND subtopico = $4
    `, [
      userId,
      adjustment.intervalo_sugerido,
      adjustment.ease_factor_sugerido,
      adjustment.subtopico,
    ]);
  }

  console.log('[reinforcement] ✅ Ajustes aplicados');
}

// ============================================
// SALVAR REFORÇOS
// ============================================

export async function saveReinforcementRecord(params: {
  userId: string;
  subtopico: string;
  plan: ReinforcementPlan;
  motivo: string;
}): Promise<void> {
  await query(`
    INSERT INTO recco_reforco (
      user_id, subtopico_id, drops_reforco, mnemonicos_reforco,
      questoes_fixacao, motivo
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    params.userId,
    params.subtopico,
    JSON.stringify(params.plan.acoes.filter(a => a.tipo === 'drop')),
    JSON.stringify(params.plan.acoes.filter(a => a.tipo === 'mnemonico')),
    JSON.stringify(params.plan.acoes.filter(a => a.tipo === 'questao')),
    params.motivo,
  ]);
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const ReinforcementEngine = {
  detectWeakness,
  generateReinforcementPlan,
  adjustIntervals,
  applyIntervalAdjustments,
  saveReinforcementRecord,
};

export default ReinforcementEngine;
