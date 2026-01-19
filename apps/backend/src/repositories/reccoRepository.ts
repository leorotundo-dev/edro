/**
 * ReccoEngine Repository
 * 
 * Gerencia persistência de dados do motor de recomendação
 */

import { query } from '../db';
import type {
  CognitiveState,
  EmotionalState,
  PedagogicalState,
  Priority,
  TrailOfDay,
  TrailItem
} from '../types/reccoEngine';

// ============================================
// INPUTS
// ============================================

export interface ReccoInput {
  user_id: string;
  acertos?: number;
  erros?: number;
  taxa_acerto?: number;
  dificuldade_percebida?: number;
  tempo_por_drop?: number;
  retencao_srs?: number;
  cards_pending?: number;
  cards_overdue?: number;
  desempenho_por_banca?: any;
  estilo_banca?: string;
  tempo_ate_prova?: number;
  topicos_cobertos?: number;
  topicos_faltantes?: number;
  humor?: number;
  energia?: number;
  foco?: number;
  distracao?: boolean;
  saturacao?: boolean;
  velocidade_cognitiva?: number;
}

/**
 * Salva inputs do motor de recomendação
 */
export async function saveReccoInputs(input: ReccoInput): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO recco_inputs (
      user_id, acertos, erros, taxa_acerto, dificuldade_percebida, tempo_por_drop,
      retencao_srs, cards_pending, cards_overdue, desempenho_por_banca, estilo_banca,
      tempo_ate_prova, topicos_cobertos, topicos_faltantes,
      humor, energia, foco, distracao, saturacao, velocidade_cognitiva
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    )
    RETURNING id
  `, [
    input.user_id,
    input.acertos || 0,
    input.erros || 0,
    input.taxa_acerto || 0,
    input.dificuldade_percebida || 3,
    input.tempo_por_drop || 180,
    input.retencao_srs || 0,
    input.cards_pending || 0,
    input.cards_overdue || 0,
    JSON.stringify(input.desempenho_por_banca || {}),
    input.estilo_banca || 'neutro',
    input.tempo_ate_prova || 90,
    input.topicos_cobertos || 0,
    input.topicos_faltantes || 0,
    input.humor || 3,
    input.energia || 50,
    input.foco || 50,
    input.distracao || false,
    input.saturacao || false,
    input.velocidade_cognitiva || 200
  ]);

  console.log(`[recco-repo] Inputs salvos: ${rows[0].id}`);
  return rows[0].id;
}

/**
 * Busca inputs recentes do usuário
 */
export async function getRecentInputs(userId: string, limit: number = 10): Promise<any[]> {
  const { rows } = await query(`
    SELECT * FROM recco_inputs
    WHERE user_id = $1
    ORDER BY timestamp DESC
    LIMIT $2
  `, [userId, limit]);

  return rows;
}

// ============================================
// STATES
// ============================================

export interface ReccoState {
  user_id: string;
  estado_cognitivo: 'alto' | 'medio' | 'baixo' | 'saturado';
  estado_emocional: 'motivado' | 'ansioso' | 'frustrado' | 'neutro';
  estado_pedagogico: 'avancado' | 'medio' | 'iniciante' | 'travado';
  prob_acerto: number;
  prob_retencao: number;
  prob_saturacao: number;
  tempo_otimo_estudo: number;
  conteudo_ideal: string;
}

/**
 * Salva estado calculado do motor
 */
export async function saveReccoState(state: ReccoState): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO recco_states (
      user_id, estado_cognitivo, estado_emocional, estado_pedagogico,
      prob_acerto, prob_retencao, prob_saturacao, tempo_otimo_estudo, conteudo_ideal
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [
    state.user_id,
    state.estado_cognitivo,
    state.estado_emocional,
    state.estado_pedagogico,
    state.prob_acerto,
    state.prob_retencao,
    state.prob_saturacao,
    state.tempo_otimo_estudo,
    state.conteudo_ideal
  ]);

  console.log(`[recco-repo] Estado salvo: ${rows[0].id}`);
  return rows[0].id;
}

/**
 * Busca último estado do usuário
 */
export async function getLatestState(userId: string): Promise<ReccoState | null> {
  const { rows } = await query<ReccoState>(`
    SELECT * FROM recco_states
    WHERE user_id = $1
    ORDER BY timestamp DESC
    LIMIT 1
  `, [userId]);

  return rows[0] || null;
}

// ============================================
// PRIORIDADES
// ============================================

export interface ReccoPriority {
  user_id: string;
  urgencia_edital: number;
  peso_banca: number;
  proximidade_prova: number;
  fraquezas_criticas: number;
  temas_alta_probabilidade: number;
  lacunas_memoria: number;
  lista_priorizada: Priority[];
}

/**
 * Salva prioridades calculadas
 */
export async function saveReccoPriorities(priorities: ReccoPriority): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO recco_prioridades (
      user_id, urgencia_edital, peso_banca, proximidade_prova,
      fraquezas_criticas, temas_alta_probabilidade, lacunas_memoria, lista_priorizada
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [
    priorities.user_id,
    priorities.urgencia_edital,
    priorities.peso_banca,
    priorities.proximidade_prova,
    priorities.fraquezas_criticas,
    priorities.temas_alta_probabilidade,
    priorities.lacunas_memoria,
    JSON.stringify(priorities.lista_priorizada)
  ]);

  console.log(`[recco-repo] Prioridades salvas: ${rows[0].id} (${priorities.lista_priorizada.length} itens)`);
  return rows[0].id;
}

/**
 * Busca última lista de prioridades do usuário
 */
export async function getLatestPriorities(userId: string): Promise<ReccoPriority | null> {
  const { rows } = await query<any>(`
    SELECT * FROM recco_prioridades
    WHERE user_id = $1
    ORDER BY timestamp DESC
    LIMIT 1
  `, [userId]);

  if (rows.length === 0) return null;

  return {
    ...rows[0],
    lista_priorizada: rows[0].lista_priorizada || []
  };
}

// ============================================
// SELEÇÃO
// ============================================

export interface ReccoSelection {
  user_id: string;
  drops_selecionados: any[];
  blocos_selecionados: any[];
  questoes_selecionadas: any[];
  revisoes_srs: any[];
  simulados: any[];
  mnemonicos: any[];
  trilha_do_dia: TrailOfDay;
}

/**
 * Salva seleção de conteúdo
 */
export async function saveReccoSelection(selection: ReccoSelection): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO recco_selecao (
      user_id, drops_selecionados, blocos_selecionados, questoes_selecionadas,
      revisoes_srs, simulados, mnemonicos, trilha_do_dia
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [
    selection.user_id,
    JSON.stringify(selection.drops_selecionados),
    JSON.stringify(selection.blocos_selecionados),
    JSON.stringify(selection.questoes_selecionadas),
    JSON.stringify(selection.revisoes_srs),
    JSON.stringify(selection.simulados),
    JSON.stringify(selection.mnemonicos),
    JSON.stringify(selection.trilha_do_dia)
  ]);

  console.log(`[recco-repo] Seleção salva: ${rows[0].id}`);
  return rows[0].id;
}

/**
 * Busca última seleção do usuário
 */
export async function getLatestSelection(userId: string): Promise<ReccoSelection | null> {
  const { rows } = await query<any>(`
    SELECT * FROM recco_selecao
    WHERE user_id = $1
    ORDER BY timestamp DESC
    LIMIT 1
  `, [userId]);

  if (rows.length === 0) return null;

  return {
    user_id: rows[0].user_id,
    drops_selecionados: rows[0].drops_selecionados || [],
    blocos_selecionados: rows[0].blocos_selecionados || [],
    questoes_selecionadas: rows[0].questoes_selecionadas || [],
    revisoes_srs: rows[0].revisoes_srs || [],
    simulados: rows[0].simulados || [],
    mnemonicos: rows[0].mnemonicos || [],
    trilha_do_dia: rows[0].trilha_do_dia || {}
  };
}

// ============================================
// SEQUÊNCIA
// ============================================

export interface ReccoSequence {
  user_id: string;
  sequencia: TrailItem[];
  curva_dificuldade: string;
  curva_cognitiva: string;
  curva_emocional: string;
  curva_foco: string;
  curva_energia: string;
  curva_pedagogica: string;
  curva_banca: string;
}

/**
 * Salva sequência final
 */
export async function saveReccoSequence(sequence: ReccoSequence): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO recco_sequencia (
      user_id, sequencia, curva_dificuldade, curva_cognitiva, curva_emocional,
      curva_foco, curva_energia, curva_pedagogica, curva_banca
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [
    sequence.user_id,
    JSON.stringify(sequence.sequencia),
    sequence.curva_dificuldade,
    sequence.curva_cognitiva,
    sequence.curva_emocional,
    sequence.curva_foco,
    sequence.curva_energia,
    sequence.curva_pedagogica,
    sequence.curva_banca
  ]);

  console.log(`[recco-repo] Sequência salva: ${rows[0].id} (${sequence.sequencia.length} itens)`);
  return rows[0].id;
}

// ============================================
// REFORÇO
// ============================================

export interface ReccoReinforcement {
  user_id: string;
  subtopico_id?: string;
  drops_reforco: any[];
  mnemonicos_reforco: any[];
  questoes_fixacao: any[];
  ajustes_srs: any;
  trilhas_alternativas: any[];
  motivo: string;
}

/**
 * Salva reforço automático
 */
export async function saveReccoReinforcement(reinforcement: ReccoReinforcement): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO recco_reforco (
      user_id, subtopico_id, drops_reforco, mnemonicos_reforco, questoes_fixacao,
      ajustes_srs, trilhas_alternativas, motivo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [
    reinforcement.user_id,
    reinforcement.subtopico_id || null,
    JSON.stringify(reinforcement.drops_reforco),
    JSON.stringify(reinforcement.mnemonicos_reforco),
    JSON.stringify(reinforcement.questoes_fixacao),
    JSON.stringify(reinforcement.ajustes_srs),
    JSON.stringify(reinforcement.trilhas_alternativas),
    reinforcement.motivo
  ]);

  console.log(`[recco-repo] Reforço salvo: ${rows[0].id} (motivo: ${reinforcement.motivo})`);
  return rows[0].id;
}

// ============================================
// FEEDBACK
// ============================================

export interface ReccoFeedback {
  user_id: string;
  recco_id?: string;
  aluno_completou: boolean;
  aluno_acertou?: boolean;
  aluno_satisfeito?: boolean;
  tempo_real?: number;
  tempo_previsto?: number;
  ajuste_sugerido?: string;
}

/**
 * Registra feedback do usuário
 */
export async function saveReccoFeedback(feedback: ReccoFeedback): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO recco_feedback (
      user_id, recco_id, aluno_completou, aluno_acertou, aluno_satisfeito,
      tempo_real, tempo_previsto, ajuste_sugerido
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [
    feedback.user_id,
    feedback.recco_id || null,
    feedback.aluno_completou,
    feedback.aluno_acertou || null,
    feedback.aluno_satisfeito || null,
    feedback.tempo_real || null,
    feedback.tempo_previsto || null,
    feedback.ajuste_sugerido || null
  ]);

  console.log(`[recco-repo] Feedback salvo: ${rows[0].id}`);
  return rows[0].id;
}

/**
 * Busca feedbacks do usuário
 */
export async function getUserFeedbacks(userId: string, limit: number = 20): Promise<ReccoFeedback[]> {
  const { rows } = await query<ReccoFeedback>(`
    SELECT * FROM recco_feedback
    WHERE user_id = $1
    ORDER BY timestamp DESC
    LIMIT $2
  `, [userId, limit]);

  return rows;
}

// ============================================
// COGNITIVE FLAGS
// ============================================

/**
 * Salva flags cognitivas
 */
export async function saveCognitiveFlags(
  userId: string,
  flags: { foco_baixo: boolean; energia_baixa: boolean; saturacao: boolean; velocidade_lenta: boolean }
): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO recco_cognitive_flags (user_id, foco_baixo, energia_baixa, saturacao, velocidade_lenta)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [userId, flags.foco_baixo, flags.energia_baixa, flags.saturacao, flags.velocidade_lenta]);

  return rows[0].id;
}

/**
 * Salva flags emocionais
 */
export async function saveEmotionalFlags(
  userId: string,
  flags: { ansiedade: boolean; frustracao: boolean; desmotivacao: boolean }
): Promise<string> {
  const { rows } = await query<{ id: string }>(`
    INSERT INTO recco_emotional_flags (user_id, ansiedade, frustracao, desmotivacao)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [userId, flags.ansiedade, flags.frustracao, flags.desmotivacao]);

  return rows[0].id;
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const ReccoRepository = {
  // Inputs
  saveReccoInputs,
  getRecentInputs,

  // States
  saveReccoState,
  getLatestState,

  // Priorities
  saveReccoPriorities,
  getLatestPriorities,

  // Selection
  saveReccoSelection,
  getLatestSelection,

  // Sequence
  saveReccoSequence,

  // Reinforcement
  saveReccoReinforcement,

  // Feedback
  saveReccoFeedback,
  getUserFeedbacks,

  // Flags
  saveCognitiveFlags,
  saveEmotionalFlags
};

export default ReccoRepository;
