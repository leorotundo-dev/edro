// State Calculator - Calcula estados cognitivos/emocionais/pedagógicos
import { query } from '../../db';

export interface CognitiveState {
  foco?: number;
  energia?: number;
  nec?: number; // Nível de Energia Cognitiva
  nca?: number; // Nível de Carga de Atenção
  velocidade?: number;
  saturacao?: boolean;
  estabilidade?: number;
}

export interface EmotionalState {
  humor?: number;
  frustracao?: boolean;
  ansiedade?: boolean;
  motivacao?: boolean;
  confianca?: number;
}

export interface PedagogicalState {
  topicos_dominados: string[];
  topicos_frageis: string[];
  topicos_ignorados: string[];
  taxa_acerto_geral: number;
  nivel_medio: number; // 1-5
  retencao_srs: number; // 0-100%
}

export interface CompleteState {
  cognitive: CognitiveState;
  emotional: EmotionalState;
  pedagogical: PedagogicalState;
  timestamp: Date;
}

/**
 * Calcula o estado cognitivo atual do aluno
 */
export async function calculateCognitiveState(userId: string): Promise<CognitiveState> {
  // Buscar último estado cognitivo (últimos 5 minutos)
  const { rows } = await query<any>(`
    SELECT 
      foco, energia, velocidade, nec, nca,
      hesitacao, abandono_drop
    FROM tracking_cognitive
    WHERE user_id = $1 
      AND timestamp > NOW() - INTERVAL '5 minutes'
    ORDER BY timestamp DESC
    LIMIT 10
  `, [userId]);

  if (rows.length === 0) {
    return {
      foco: 50,
      energia: 50,
      nec: 50,
      nca: 1.0,
      velocidade: 200,
      saturacao: false,
      estabilidade: 50
    };
  }

  // Calcular médias
  const avgFoco = rows.reduce((sum, r) => sum + (r.foco || 0), 0) / rows.length;
  const avgEnergia = rows.reduce((sum, r) => sum + (r.energia || 0), 0) / rows.length;
  const avgVelocidade = rows.reduce((sum, r) => sum + (r.velocidade || 0), 0) / rows.length;
  
  // NEC = (foco + energia) / 2
  const nec = (avgFoco + avgEnergia) / 2;
  
  // NCA = velocidade / tempo_medio (normalizado)
  const nca = avgVelocidade / 200; // 200 wpm é baseline
  
  // Detectar saturação (muitas hesitações/abandonos)
  const hesitacoes = rows.filter(r => r.hesitacao).length;
  const abandonos = rows.filter(r => r.abandono_drop).length;
  const saturacao = (hesitacoes + abandonos) > rows.length * 0.3;
  
  // Estabilidade = variação do foco (quanto menos variar, mais estável)
  const focusVariance = calculateVariance(rows.map(r => r.foco || 50));
  const estabilidade = Math.max(0, 100 - focusVariance);

  return {
    foco: Math.round(avgFoco),
    energia: Math.round(avgEnergia),
    nec: Math.round(nec * 100) / 100,
    nca: Math.round(nca * 100) / 100,
    velocidade: Math.round(avgVelocidade),
    saturacao,
    estabilidade: Math.round(estabilidade)
  };
}

/**
 * Calcula o estado emocional atual do aluno
 */
export async function calculateEmotionalState(userId: string): Promise<EmotionalState> {
  // Buscar último estado emocional (últimos 10 minutos)
  const { rows } = await query<any>(`
    SELECT 
      humor_auto_reportado,
      frustracao_inferida,
      ansiedade_inferida,
      motivacao_inferida
    FROM tracking_emotional
    WHERE user_id = $1 
      AND timestamp > NOW() - INTERVAL '10 minutes'
    ORDER BY timestamp DESC
    LIMIT 10
  `, [userId]);

  if (rows.length === 0) {
    return {
      humor: 3,
      frustracao: false,
      ansiedade: false,
      motivacao: true,
      confianca: 50
    };
  }

  // Última emoção (mais recente)
  const latest = rows[0];
  
  // Média de humor
  const avgHumor = rows
    .filter(r => r.humor_auto_reportado)
    .reduce((sum, r) => sum + r.humor_auto_reportado, 0) / Math.max(rows.filter(r => r.humor_auto_reportado).length, 1);
  
  // Calcular confiança baseado em humor e ausência de frustração
  const frustracoesRecentes = rows.filter(r => r.frustracao_inferida).length;
  const confianca = avgHumor * 20 - (frustracoesRecentes * 10); // 1-5 humor → 20-100, -10 por frustração

  return {
    humor: Math.round(avgHumor * 10) / 10,
    frustracao: latest.frustracao_inferida || false,
    ansiedade: latest.ansiedade_inferida || false,
    motivacao: latest.motivacao_inferida || false,
    confianca: Math.max(0, Math.min(100, Math.round(confianca)))
  };
}

/**
 * Calcula o estado pedagógico (desempenho, domínio de tópicos)
 */
export async function calculatePedagogicalState(userId: string): Promise<PedagogicalState> {
  // Buscar mastery por subtópico
  const { rows: masteryRows } = await query<any>(`
    SELECT 
      subtopico,
      mastery_score,
      taxa_acerto
    FROM mastery_subtopicos
    WHERE user_id = $1
    ORDER BY mastery_score DESC
  `, [userId]);

  // Classificar tópicos
  const topicos_dominados = masteryRows
    .filter(r => r.mastery_score >= 70)
    .map(r => r.subtopico);
  
  const topicos_frageis = masteryRows
    .filter(r => r.mastery_score < 50)
    .map(r => r.subtopico);
  
  // Buscar tópicos do edital que o aluno ainda não tocou
  const { rows: ignoradosRows } = await query<any>(`
    SELECT DISTINCT COALESCE(topic_code, title) as subtopico
    FROM drops
    WHERE COALESCE(topic_code, title) NOT IN (
      SELECT DISTINCT subtopico
      FROM mastery_subtopicos
      WHERE user_id = $1
    )
    LIMIT 20
  `, [userId]);
  
  const topicos_ignorados = ignoradosRows.map(r => r.subtopico);

  // Taxa de acerto geral
  const { rows: acertoRows } = await query<any>(`
    SELECT 
      COUNT(CASE WHEN was_correct THEN 1 END) as acertos,
      COUNT(*) as total
    FROM exam_logs
    WHERE user_id = $1
      AND answered_at > NOW() - INTERVAL '30 days'
  `, [userId]);

  const taxa_acerto_geral = acertoRows[0]?.total > 0 
    ? (acertoRows[0].acertos / acertoRows[0].total) * 100 
    : 0;

  // Nível médio que o aluno está estudando
  const nivel_medio = masteryRows.length > 0
    ? Math.min(5, Math.max(1, Math.round(masteryRows.reduce((sum, r) => sum + (r.mastery_score / 20), 0) / masteryRows.length)))
    : 1;

  // Retenção SRS (% de cards lembrados)
  const { rows: srsRows } = await query<any>(`
    SELECT 
      COUNT(CASE WHEN grade >= 3 THEN 1 END) as lembrados,
      COUNT(*) as total
    FROM srs_reviews
    WHERE user_id = $1
      AND reviewed_at > NOW() - INTERVAL '7 days'
  `, [userId]);

  const retencao_srs = srsRows[0]?.total > 0
    ? (srsRows[0].lembrados / srsRows[0].total) * 100
    : 100;

  return {
    topicos_dominados: topicos_dominados.slice(0, 10),
    topicos_frageis: topicos_frageis.slice(0, 10),
    topicos_ignorados: topicos_ignorados.slice(0, 10),
    taxa_acerto_geral: Math.round(taxa_acerto_geral * 100) / 100,
    nivel_medio,
    retencao_srs: Math.round(retencao_srs * 100) / 100
  };
}

/**
 * Calcula o estado completo do aluno (cognitive + emotional + pedagogical)
 */
export async function calculateCompleteState(userId: string): Promise<CompleteState> {
  const [cognitive, emotional, pedagogical] = await Promise.all([
    calculateCognitiveState(userId),
    calculateEmotionalState(userId),
    calculatePedagogicalState(userId)
  ]);

  return {
    cognitive,
    emotional,
    pedagogical,
    timestamp: new Date()
  };
}

/**
 * Salva o estado calculado no banco (tabela recco_states)
 */
export async function saveState(userId: string, state: CompleteState): Promise<void> {
  await query(`
    INSERT INTO recco_states (
      user_id,
      estado_cognitivo,
      estado_emocional,
      estado_pedagogico,
      prob_acerto,
      prob_retencao,
      prob_saturacao,
      tempo_otimo_estudo,
      conteudo_ideal
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    userId,
    classifyCognitiveState(state.cognitive),
    classifyEmotionalState(state.emotional),
    classifyPedagogicalState(state.pedagogical),
    state.pedagogical.taxa_acerto_geral / 100,
    state.pedagogical.retencao_srs / 100,
    state.cognitive.saturacao ? 0.8 : 0.2,
    calculateOptimalStudyTime(state),
    determineIdealContent(state)
  ]);
}

// Helper functions
function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function classifyCognitiveState(cognitive: CognitiveState): string {
  const nec = cognitive.nec || 50;
  if (nec < 30) return 'baixo';
  if (nec < 60) return 'medio';
  if (cognitive.saturacao) return 'saturado';
  return 'alto';
}

function classifyEmotionalState(emotional: EmotionalState): string {
  if (emotional.ansiedade) return 'ansioso';
  if (emotional.frustracao) return 'frustrado';
  if (emotional.motivacao && (emotional.humor || 3) >= 4) return 'motivado';
  return 'neutro';
}

function classifyPedagogicalState(pedagogical: PedagogicalState): string {
  if (pedagogical.nivel_medio >= 4) return 'avancado';
  if (pedagogical.nivel_medio >= 3) return 'medio';
  if (pedagogical.topicos_frageis.length > 5) return 'travado';
  return 'iniciante';
}

function calculateOptimalStudyTime(state: CompleteState): number {
  const baseTime = 60; // 60 minutos base
  const energyFactor = (state.cognitive.energia || 50) / 50;
  return Math.round(baseTime * energyFactor);
}

function determineIdealContent(state: CompleteState): string {
  if (state.cognitive.saturacao) return 'revisao_leve';
  if ((state.cognitive.nec || 50) < 40) return 'drops_curtos';
  if ((state.cognitive.nec || 50) > 70) return 'drops_avancados';
  return 'drops_medios';
}
