// Motor de Inferência - Calcula estados e probabilidades do aluno
import { query } from '../../db';

export interface CognitiveState {
  foco: number;
  energia: number;
  nec: number; // Nível de Energia Cognitiva
  nca: number; // Nível de Carga de Atenção
  velocidade: number;
  saturacao: boolean;
}

export interface EmotionalState {
  humor: number;
  ansiedade: boolean;
  frustracao: boolean;
  motivacao: boolean;
  confianca: number;
}

export interface PedagogicalState {
  topicos_dominados: number;
  topicos_frageis: number;
  topicos_ignorados: number;
  taxa_acerto_geral: number;
  nivel_medio: number;
  progresso_geral: number;
}

export interface InferenceResult {
  cognitive: CognitiveState;
  emotional: EmotionalState;
  pedagogical: PedagogicalState;
  probabilities: {
    prob_acerto: number;
    prob_retencao: number;
    prob_saturacao: number;
  };
  tempo_otimo_estudo: number; // minutos
  recomendacao: string;
}

/**
 * Calcula o estado cognitivo atual do aluno
 */
export async function calculateCognitiveState(userId: string): Promise<CognitiveState> {
  // Buscar últimos 10 registros cognitivos
  const { rows } = await query<any>(`
    SELECT foco, energia, nec, nca, velocidade, timestamp
    FROM tracking_cognitive
    WHERE user_id = $1
    ORDER BY timestamp DESC
    LIMIT 10
  `, [userId]);

  if (rows.length === 0) {
    return {
      foco: 50,
      energia: 50,
      nec: 50,
      nca: 50,
      velocidade: 200,
      saturacao: false
    };
  }

  // Média dos últimos 10 registros (mais peso nos recentes)
  let totalFoco = 0, totalEnergia = 0, totalNec = 0, totalNca = 0, totalVelocidade = 0;
  let totalWeight = 0;

  rows.forEach((row, index) => {
    const weight = rows.length - index; // Mais recente = mais peso
    totalFoco += (row.foco || 50) * weight;
    totalEnergia += (row.energia || 50) * weight;
    totalNec += (row.nec || 50) * weight;
    totalNca += (row.nca || 50) * weight;
    totalVelocidade += (row.velocidade || 200) * weight;
    totalWeight += weight;
  });

  const foco = Math.round(totalFoco / totalWeight);
  const energia = Math.round(totalEnergia / totalWeight);
  const nec = Math.round(totalNec / totalWeight);
  const nca = Math.round(totalNca / totalWeight);
  const velocidade = Math.round(totalVelocidade / totalWeight);

  // Detectar saturação (NEC baixo + NCA alto)
  const saturacao = nec < 40 && nca > 70;

  return { foco, energia, nec, nca, velocidade, saturacao };
}

/**
 * Calcula o estado emocional atual do aluno
 */
export async function calculateEmotionalState(userId: string): Promise<EmotionalState> {
  // Buscar últimos 10 registros emocionais
  const { rows } = await query<any>(`
    SELECT humor_auto_reportado, frustracao_inferida, ansiedade_inferida, motivacao_inferida
    FROM tracking_emotional
    WHERE user_id = $1
    ORDER BY timestamp DESC
    LIMIT 10
  `, [userId]);

  if (rows.length === 0) {
    return {
      humor: 3,
      ansiedade: false,
      frustracao: false,
      motivacao: true,
      confianca: 50
    };
  }

  // Calcular médias
  const avgHumor = rows.reduce((sum, r) => sum + (r.humor_auto_reportado || 3), 0) / rows.length;
  const ansiedadeCount = rows.filter(r => r.ansiedade_inferida).length;
  const frustracaoCount = rows.filter(r => r.frustracao_inferida).length;
  const motivacaoCount = rows.filter(r => r.motivacao_inferida).length;

  return {
    humor: Math.round(avgHumor * 10) / 10,
    ansiedade: ansiedadeCount > rows.length / 2,
    frustracao: frustracaoCount > rows.length / 2,
    motivacao: motivacaoCount > rows.length / 2,
    confianca: Math.round((avgHumor / 5) * 100)
  };
}

/**
 * Calcula o estado pedagógico do aluno
 */
export async function calculatePedagogicalState(userId: string): Promise<PedagogicalState> {
  // Buscar estatísticas gerais
  const { rows: statsRows } = await query<any>(`
    SELECT 
      COUNT(*) as total_tentativas,
      SUM(CASE WHEN correct_count > wrong_count THEN 1 ELSE 0 END) as topicos_dominados,
      SUM(CASE WHEN wrong_count > correct_count THEN 1 ELSE 0 END) as topicos_frageis,
      AVG(CASE WHEN correct_count + wrong_count > 0 
        THEN correct_count::float / (correct_count + wrong_count) 
        ELSE 0 END) as taxa_acerto
    FROM user_stats
    WHERE user_id = $1
  `, [userId]);

  const stats = statsRows[0] || { topicos_dominados: 0, topicos_frageis: 0, taxa_acerto: 0 };

  // Buscar progresso geral
  const { rows: progressRows } = await query<any>(`
    SELECT AVG(mastery_score) as progresso_medio
    FROM mastery_subtopicos
    WHERE user_id = $1
  `, [userId]);

  const progressoGeral = progressRows[0]?.progresso_medio || 0;

  return {
    topicos_dominados: Number(stats.topicos_dominados) || 0,
    topicos_frageis: Number(stats.topicos_frageis) || 0,
    topicos_ignorados: 0, // TODO: calcular
    taxa_acerto_geral: Number(stats.taxa_acerto) || 0,
    nivel_medio: 2.5, // TODO: calcular nível médio real
    progresso_geral: Number(progressoGeral) || 0
  };
}

/**
 * Calcula probabilidades baseadas nos estados
 */
export function calculateProbabilities(
  cognitive: CognitiveState,
  emotional: EmotionalState,
  pedagogical: PedagogicalState
): { prob_acerto: number; prob_retencao: number; prob_saturacao: number } {
  
  // Probabilidade de Acerto
  // Baseado em: estado cognitivo (40%) + estado emocional (30%) + histórico (30%)
  const cognitiveScore = (cognitive.nec + cognitive.foco) / 200;
  const emotionalScore = emotional.motivacao && !emotional.ansiedade ? 0.8 : 0.5;
  const historicalScore = pedagogical.taxa_acerto_geral;

  const prob_acerto = (cognitiveScore * 0.4) + (emotionalScore * 0.3) + (historicalScore * 0.3);

  // Probabilidade de Retenção
  // Baseado em: energia (50%) + progresso (30%) + foco (20%)
  const prob_retencao = 
    (cognitive.energia / 100) * 0.5 +
    (pedagogical.progresso_geral / 100) * 0.3 +
    (cognitive.foco / 100) * 0.2;

  // Probabilidade de Saturação
  // Baseado em: NEC baixo + NCA alto + frustração
  let prob_saturacao = 0;
  if (cognitive.nec < 50) prob_saturacao += 0.3;
  if (cognitive.nca > 70) prob_saturacao += 0.3;
  if (emotional.frustracao) prob_saturacao += 0.2;
  if (emotional.ansiedade) prob_saturacao += 0.2;

  return {
    prob_acerto: Math.min(Math.max(prob_acerto, 0), 1),
    prob_retencao: Math.min(Math.max(prob_retencao, 0), 1),
    prob_saturacao: Math.min(Math.max(prob_saturacao, 0), 1)
  };
}

/**
 * Calcula tempo ótimo de estudo (em minutos)
 */
export function calculateOptimalStudyTime(
  cognitive: CognitiveState,
  emotional: EmotionalState,
  probabilities: any
): number {
  // Base: 25 minutos (Pomodoro)
  let tempoBase = 25;

  // Ajustar por energia
  if (cognitive.energia < 40) tempoBase = 15; // Reduz se energia baixa
  else if (cognitive.energia > 80) tempoBase = 45; // Aumenta se energia alta

  // Ajustar por saturação
  if (probabilities.prob_saturacao > 0.6) tempoBase = 10;

  // Ajustar por ansiedade
  if (emotional.ansiedade) tempoBase = Math.min(tempoBase, 20);

  return tempoBase;
}

/**
 * Gera recomendação textual baseada nos estados
 */
export function generateRecomendacao(
  cognitive: CognitiveState,
  emotional: EmotionalState,
  pedagogical: PedagogicalState,
  probabilities: any
): string {
  // Priorizar por severidade
  if (probabilities.prob_saturacao > 0.7) {
    return 'Você está saturado. Recomendo pausar ou fazer atividades leves.';
  }

  if (emotional.ansiedade && cognitive.nec < 50) {
    return 'Percebo ansiedade e baixa energia. Vamos com calma: começar com drops curtos.';
  }

  if (cognitive.energia > 80 && emotional.motivacao) {
    return 'Você está ótimo! Aproveite para estudar tópicos mais difíceis.';
  }

  if (pedagogical.topicos_frageis > pedagogical.topicos_dominados) {
    return 'Vamos reforçar seus pontos fracos hoje.';
  }

  return 'Tudo equilibrado. Continue seu ritmo normal de estudos.';
}

/**
 * Motor de Inferência Completo
 */
export async function runInference(userId: string): Promise<InferenceResult> {
  // 1. Calcular estados
  const cognitive = await calculateCognitiveState(userId);
  const emotional = await calculateEmotionalState(userId);
  const pedagogical = await calculatePedagogicalState(userId);

  // 2. Calcular probabilidades
  const probabilities = calculateProbabilities(cognitive, emotional, pedagogical);

  // 3. Calcular tempo ótimo
  const tempo_otimo_estudo = calculateOptimalStudyTime(cognitive, emotional, probabilities);

  // 4. Gerar recomendação
  const recomendacao = generateRecomendacao(cognitive, emotional, pedagogical, probabilities);

  // 5. Salvar no banco (recco_states)
  await query(`
    INSERT INTO recco_states 
      (user_id, estado_cognitivo, estado_emocional, estado_pedagogico, 
       prob_acerto, prob_retencao, prob_saturacao, tempo_otimo_estudo, conteudo_ideal)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    userId,
    cognitive.nec > 70 ? 'alto' : cognitive.nec > 40 ? 'medio' : 'baixo',
    emotional.motivacao ? 'motivado' : emotional.ansiedade ? 'ansioso' : 'neutro',
    pedagogical.progresso_geral > 70 ? 'avancado' : pedagogical.progresso_geral > 30 ? 'medio' : 'iniciante',
    probabilities.prob_acerto,
    probabilities.prob_retencao,
    probabilities.prob_saturacao,
    tempo_otimo_estudo,
    recomendacao
  ]);

  return {
    cognitive,
    emotional,
    pedagogical,
    probabilities,
    tempo_otimo_estudo,
    recomendacao
  };
}
