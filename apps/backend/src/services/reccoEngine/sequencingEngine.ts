/**
 * Sequencing Engine
 * 
 * Motor de sequenciamento que decide a ORDEM de estudo
 * Aplica 7 curvas pedagógicas para otimizar a experiência
 */

import type { Priority, TrailItem, DiagnosisResult } from '../../types/reccoEngine';

// ============================================
// TIPOS DE CURVAS
// ============================================

export type CurveType = 
  | 'progressiva'  // Fácil → Difícil (aquecimento)
  | 'inversa'      // Difícil → Fácil (desafio primeiro)
  | 'plana'        // Dificuldade uniforme
  | 'ondulada'     // Alterna dificuldade
  | 'pico'         // Fácil → Difícil → Fácil (sanduíche)
  | 'vale'         // Difícil → Fácil → Difícil
  | 'adaptativa';  // Ajusta baseado no desempenho

export interface SequencingInput {
  priorities: Priority[];
  diagnosis: DiagnosisResult;
  tempoDisponivel: number; // minutos
  preferences?: {
    curva_dificuldade?: CurveType;
    curva_cognitiva?: string;
    curva_emocional?: string;
  };
}

export interface SequencingResult {
  sequencia: TrailItem[];
  total_duration: number;
  curvas_aplicadas: {
    curva_dificuldade: string;
    curva_cognitiva: string;
    curva_emocional: string;
    curva_foco: string;
    curva_energia: string;
    curva_pedagogica: string;
    curva_banca: string;
  };
}

// ============================================
// SELEÇÃO DE CURVAS
// ============================================

/**
 * Seleciona curva de dificuldade baseada no estado do aluno
 */
function selectDifficultyCurve(diagnosis: DiagnosisResult): CurveType {
  const { estado_cognitivo, estado_emocional, prob_saturacao } = diagnosis;

  // Saturado ou baixa energia = progressiva (começar fácil)
  if (estado_cognitivo === 'saturado' || prob_saturacao > 0.7) {
    return 'progressiva';
  }

  // Ansioso ou frustrado = progressiva (evitar desafio inicial)
  if (estado_emocional === 'ansioso' || estado_emocional === 'frustrado') {
    return 'progressiva';
  }

  // Alto estado cognitivo + motivado = inversa (desafio primeiro)
  if (estado_cognitivo === 'alto' && estado_emocional === 'motivado') {
    return 'inversa';
  }

  // Estado médio = pico (sanduíche, termina fácil)
  if (estado_cognitivo === 'medio') {
    return 'pico';
  }

  // Default = adaptativa (ajusta durante o estudo)
  return 'adaptativa';
}

/**
 * Seleciona curva cognitiva (foco/atenção)
 */
function selectCognitiveCurve(diagnosis: DiagnosisResult): string {
  const { cognitive } = diagnosis;

  if (!cognitive.foco || cognitive.foco < 50) {
    return 'aquecimento_lento'; // Drops curtos no início
  }

  if (cognitive.foco > 80) {
    return 'intensiva'; // Drops longos e complexos
  }

  return 'equilibrada'; // Mix balanceado
}

/**
 * Seleciona curva emocional (motivação/ansiedade)
 */
function selectEmotionalCurve(diagnosis: DiagnosisResult): string {
  const { estado_emocional } = diagnosis;

  if (estado_emocional === 'ansioso') {
    return 'suave'; // Conteúdo mais fácil e encorajador
  }

  if (estado_emocional === 'frustrado') {
    return 'vitoria_rapida'; // Começar com algo fácil para dar confiança
  }

  if (estado_emocional === 'motivado') {
    return 'desafiadora'; // Pode enfrentar conteúdo difícil
  }

  return 'neutra';
}

/**
 * Seleciona curva de foco (duração dos itens)
 */
function selectFocusCurve(diagnosis: DiagnosisResult): string {
  const { cognitive } = diagnosis;

  if (cognitive.saturacao) {
    return 'micro_doses'; // Itens muito curtos (1-2 min)
  }

  if (!cognitive.energia || cognitive.energia < 40) {
    return 'curta'; // Itens curtos (2-5 min)
  }

  if (cognitive.energia > 80) {
    return 'longa'; // Itens longos (5-10 min)
  }

  return 'media'; // Itens médios (3-7 min)
}

/**
 * Seleciona curva de energia (intervalos)
 */
function selectEnergyCurve(diagnosis: DiagnosisResult): string {
  const { cognitive } = diagnosis;

  if (!cognitive.energia || cognitive.energia < 40) {
    return 'pausas_frequentes'; // Pausar a cada 15 min
  }

  if (cognitive.energia > 80) {
    return 'pomodoro_estendido'; // 45 min + 10 min pausa
  }

  return 'pomodoro_classico'; // 25 min + 5 min pausa
}

/**
 * Seleciona curva pedagógica (tipo de conteúdo)
 */
function selectPedagogicalCurve(diagnosis: DiagnosisResult): string {
  const { pedagogical } = diagnosis;

  if (pedagogical.topicos_frageis.length > pedagogical.topicos_dominados.length) {
    return 'reforco_intensivo'; // Focar em fraquezas
  }

  if (pedagogical.topicos_dominados.length > 10) {
    return 'manutencao'; // Manter conhecimento + novos tópicos
  }

  return 'aprendizagem'; // Foco em novos tópicos
}

/**
 * Seleciona curva de banca (estilo de questões)
 */
function selectBancaCurve(bancaPreferencial?: string): string {
  if (!bancaPreferencial) return 'variada';

  // Especializar em uma banca específica
  return `especializada_${bancaPreferencial.toLowerCase()}`;
}

// ============================================
// APLICAÇÃO DE CURVAS
// ============================================

/**
 * Aplica curva progressiva (fácil → difícil)
 */
function applyProgressiveCurve(items: TrailItem[]): TrailItem[] {
  return items.sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3));
}

/**
 * Aplica curva inversa (difícil → fácil)
 */
function applyInverseCurve(items: TrailItem[]): TrailItem[] {
  return items.sort((a, b) => (b.difficulty || 3) - (a.difficulty || 3));
}

/**
 * Aplica curva plana (dificuldade uniforme)
 */
function applyFlatCurve(items: TrailItem[]): TrailItem[] {
  // Embaralhar mantendo dificuldade similar
  const diffGroups: { [key: number]: TrailItem[] } = {};
  
  items.forEach(item => {
    const diff = item.difficulty || 3;
    if (!diffGroups[diff]) diffGroups[diff] = [];
    diffGroups[diff].push(item);
  });

  const result: TrailItem[] = [];
  const diffs = Object.keys(diffGroups).map(Number).sort();

  // Alternar entre grupos de dificuldade
  let idx = 0;
  while (result.length < items.length) {
    const diff = diffs[idx % diffs.length];
    if (diffGroups[diff].length > 0) {
      result.push(diffGroups[diff].shift()!);
    }
    idx++;
  }

  return result;
}

/**
 * Aplica curva ondulada (alterna dificuldade)
 */
function applyWavyCurve(items: TrailItem[]): TrailItem[] {
  const sorted = items.sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3));
  const result: TrailItem[] = [];

  let i = 0;
  let j = sorted.length - 1;
  let useEasy = true;

  while (i <= j) {
    if (useEasy) {
      result.push(sorted[i++]);
    } else {
      result.push(sorted[j--]);
    }
    useEasy = !useEasy;
  }

  return result;
}

/**
 * Aplica curva em pico (fácil → difícil → fácil)
 */
function applyPeakCurve(items: TrailItem[]): TrailItem[] {
  const sorted = items.sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3));
  const third = Math.floor(sorted.length / 3);

  const easy = sorted.slice(0, third);
  const medium = sorted.slice(third, third * 2);
  const hard = sorted.slice(third * 2);

  return [...easy, ...hard, ...medium];
}

/**
 * Aplica curva em vale (difícil → fácil → difícil)
 */
function applyValleyCurve(items: TrailItem[]): TrailItem[] {
  const sorted = items.sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3));
  const third = Math.floor(sorted.length / 3);

  const easy = sorted.slice(0, third);
  const medium = sorted.slice(third, third * 2);
  const hard = sorted.slice(third * 2);

  return [...hard, ...easy, ...medium];
}

/**
 * Aplica curva adaptativa (baseada em feedback em tempo real)
 */
function applyAdaptiveCurve(items: TrailItem[], diagnosis: DiagnosisResult): TrailItem[] {
  // Começar com curva progressiva, mas permitir ajustes
  let result = applyProgressiveCurve([...items]);

  // Se energia muito baixa, forçar itens fáceis no início
  if (diagnosis.cognitive.energia && diagnosis.cognitive.energia < 30) {
    const veryEasy = result.filter(i => (i.difficulty || 3) <= 2);
    const rest = result.filter(i => (i.difficulty || 3) > 2);
    result = [...veryEasy, ...rest];
  }

  return result;
}

// ============================================
// MOTOR DE SEQUENCIAMENTO PRINCIPAL
// ============================================

/**
 * Gera sequência otimizada de estudo
 */
export function generateSequence(input: SequencingInput): SequencingResult {
  console.log(`[sequencing] Gerando sequência para ${input.priorities.length} prioridades`);

  // 1. Selecionar curvas baseadas no diagnóstico
  const curvaDificuldade = input.preferences?.curva_dificuldade || selectDifficultyCurve(input.diagnosis);
  const curvaCognitiva = selectCognitiveCurve(input.diagnosis);
  const curvaEmocional = selectEmotionalCurve(input.diagnosis);
  const curvaFoco = selectFocusCurve(input.diagnosis);
  const curvaEnergia = selectEnergyCurve(input.diagnosis);
  const curvaPedagogica = selectPedagogicalCurve(input.diagnosis);
  const curvaBanca = selectBancaCurve();

  console.log(`[sequencing] Curvas selecionadas:`);
  console.log(`  - Dificuldade: ${curvaDificuldade}`);
  console.log(`  - Cognitiva: ${curvaCognitiva}`);
  console.log(`  - Emocional: ${curvaEmocional}`);
  console.log(`  - Foco: ${curvaFoco}`);
  console.log(`  - Energia: ${curvaEnergia}`);

  // 2. Converter prioridades em TrailItems
  const revisions = input.priorities.filter((p) => p.type === 'revisao');
  const others = input.priorities.filter((p) => p.type !== 'revisao');
  const orderedPriorities = [...revisions, ...others];

  let trailItems: TrailItem[] = orderedPriorities.map((priority, index) => {
    const duration = estimateDuration(priority.type, input.diagnosis);
    const difficulty = estimateDifficulty(priority);

    return {
      type: priority.type,
      content_id: priority.content_id || '',
      order: index + 1,
      duration_minutes: duration,
      difficulty,
      reason: priority.reason
    };
  });

  // 3. Filtrar por tempo disponível
  trailItems = fitToTimeAvailable(trailItems, input.tempoDisponivel);

  // 4. Aplicar curva de dificuldade
  trailItems = applyCurve(trailItems, curvaDificuldade, input.diagnosis);

  // 5. Ajustar ordem final
  trailItems = trailItems.map((item, idx) => ({ ...item, order: idx + 1 }));

  // 6. Calcular duração total
  const total_duration = trailItems.reduce((sum, item) => sum + item.duration_minutes, 0);

  console.log(`[sequencing] ✅ Sequência gerada: ${trailItems.length} itens, ${total_duration} min`);

  return {
    sequencia: trailItems,
    total_duration,
    curvas_aplicadas: {
      curva_dificuldade: curvaDificuldade,
      curva_cognitiva: curvaCognitiva,
      curva_emocional: curvaEmocional,
      curva_foco: curvaFoco,
      curva_energia: curvaEnergia,
      curva_pedagogica: curvaPedagogica,
      curva_banca: curvaBanca
    }
  };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Estima duração do item baseado no tipo e estado cognitivo
 */
function estimateDuration(type: string, diagnosis: DiagnosisResult): number {
  const baseDurations: { [key: string]: number } = {
    drop: 5,
    questao: 3,
    revisao: 2,
    revisao_srs: 3,
    simulado: 10,
    bloco: 8
  };

  let duration = baseDurations[type] || 5;

  // Ajustar por energia
  if (diagnosis.cognitive.energia && diagnosis.cognitive.energia < 40) {
    duration = Math.max(1, Math.floor(duration * 0.6)); // Itens mais curtos
  } else if (diagnosis.cognitive.energia && diagnosis.cognitive.energia > 80) {
    duration = Math.ceil(duration * 1.2); // Itens mais longos
  }

  return duration;
}

/**
 * Estima dificuldade baseada no score de prioridade
 */
function estimateDifficulty(priority: Priority): number {
  // Score alto = mais urgente, pode ser mais difícil
  if (priority.score >= 8) return 4;
  if (priority.score >= 6) return 3;
  if (priority.score >= 4) return 2;
  return 1;
}

/**
 * Ajusta itens para caber no tempo disponível
 */
function fitToTimeAvailable(items: TrailItem[], tempoDisponivel: number): TrailItem[] {
  let totalTime = 0;
  const fitted: TrailItem[] = [];

  for (const item of items) {
    if (totalTime + item.duration_minutes <= tempoDisponivel) {
      fitted.push(item);
      totalTime += item.duration_minutes;
    } else {
      break;
    }
  }

  console.log(`[sequencing] ${fitted.length}/${items.length} itens cabem em ${tempoDisponivel} min`);
  return fitted;
}

/**
 * Aplica curva selecionada
 */
function applyCurve(items: TrailItem[], curve: CurveType, diagnosis: DiagnosisResult): TrailItem[] {
  switch (curve) {
    case 'progressiva':
      return applyProgressiveCurve(items);
    case 'inversa':
      return applyInverseCurve(items);
    case 'plana':
      return applyFlatCurve(items);
    case 'ondulada':
      return applyWavyCurve(items);
    case 'pico':
      return applyPeakCurve(items);
    case 'vale':
      return applyValleyCurve(items);
    case 'adaptativa':
      return applyAdaptiveCurve(items, diagnosis);
    default:
      return items;
  }
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const SequencingEngine = {
  generateSequence,
  selectDifficultyCurve,
  selectCognitiveCurve,
  selectEmotionalCurve,
  selectFocusCurve,
  selectEnergyCurve,
  selectPedagogicalCurve,
  selectBancaCurve
};

export default SequencingEngine;
