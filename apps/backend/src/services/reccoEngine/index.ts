/**
 * ReccoEngine V3 - Motor Principal
 * 
 * Orquestra todo o processo de recomendação:
 * 1. Diagnóstico (inferência de estado)
 * 2. Priorização (o que estudar)
 * 3. Seleção (buscar conteúdo)
 * 4. Sequenciamento (em que ordem)
 * 5. Persistência (salvar resultado)
 */

import { runInference } from './inferenceEngine';
import { calculateCompleteState } from './stateCalculator';
import { calculatePriorities, PrioritizationEngine } from './prioritizationEngine';
import { generateSequence, SequencingEngine } from './sequencingEngine';
import { ReccoRepository } from '../../repositories/reccoRepository';
import type { ReccoEngineInput, TrailOfDay, DiagnosisResult } from '../../types/reccoEngine';
import { listDueCards } from '../../repositories/srsRepository';
import { MonitoringService } from '../../middleware/monitoring';

// ============================================
// TIPOS
// ============================================

export interface ReccoEngineOptions {
  userId: string;
  blueprintId?: number;
  diasAteProva?: number;
  bancaPreferencial?: string;
  tempoDisponivel?: number; // minutos
  forceTopics?: string[];
  debug?: boolean;
}

export interface ReccoEngineResult {
  diagnosis: DiagnosisResult;
  trail: TrailOfDay;
  metadata: {
    generated_at: string;
    processing_time_ms: number;
    version: string;
    srs_backlog?: number;
    debug?: {
      priorities_full?: any[];
      priorities_sample: Array<{
        action: string;
        score: number;
        reason: string;
        type?: string;
      }>;
      sequencing_sample: Array<{
        order: number;
        type: string;
        content_id: string;
        duration_minutes: number;
        reason: string;
      }>;
    };
  };
}

// ============================================
// MOTOR PRINCIPAL
// ============================================

/**
 * Executa o ReccoEngine completo
 * 
 * Este é o ponto de entrada principal do motor de recomendação
 */
export async function runReccoEngine(options: ReccoEngineOptions): Promise<ReccoEngineResult> {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 ReccoEngine V3 - INICIANDO`);
  console.log(`${'='.repeat(60)}`);
  console.log(`User ID: ${options.userId}`);
  console.log(`Blueprint ID: ${options.blueprintId || 'N/A'}`);
  console.log(`Tempo disponível: ${options.tempoDisponivel || 60} min`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // ============================================
    // PASSO 1: DIAGNÓSTICO (Inference + State)
    // ============================================
    console.log(`📊 PASSO 1: DIAGNÓSTICO`);
    console.log(`${'─'.repeat(60)}`);

    const inference = await runInference(options.userId);
    const completeState = await calculateCompleteState(options.userId);

    const diagnosis: DiagnosisResult = {
      cognitive: completeState.cognitive,
      emotional: completeState.emotional,
      pedagogical: completeState.pedagogical,
      estado_cognitivo: classifyCognitiveState(completeState.cognitive),
      estado_emocional: classifyEmotionalState(completeState.emotional),
      estado_pedagogico: classifyPedagogicalState(completeState.pedagogical),
      prob_acerto: inference.probabilities.prob_acerto,
      prob_retencao: inference.probabilities.prob_retencao,
      prob_saturacao: inference.probabilities.prob_saturacao,
      tempo_otimo_estudo: inference.tempo_otimo_estudo
    };

    console.log(`✅ Diagnóstico completo:`);
    console.log(`   Estado Cognitivo: ${diagnosis.estado_cognitivo}`);
    console.log(`   Estado Emocional: ${diagnosis.estado_emocional}`);
    console.log(`   Estado Pedagógico: ${diagnosis.estado_pedagogico}`);
    console.log(`   Prob. Acerto: ${(diagnosis.prob_acerto * 100).toFixed(1)}%`);
    console.log(`   Prob. Retenção: ${(diagnosis.prob_retencao * 100).toFixed(1)}%`);
    console.log(`   Prob. Saturação: ${(diagnosis.prob_saturacao * 100).toFixed(1)}%`);
    console.log(`   Tempo Ótimo: ${diagnosis.tempo_otimo_estudo} min\n`);

    // ============================================
    // PASSO 2: PRIORIZAÇÃO (O que estudar)
    // ============================================
    console.log(`📋 PASSO 2: PRIORIZAÇÃO`);
    console.log(`${'─'.repeat(60)}`);

    const prioritizationResult = await calculatePriorities({
      userId: options.userId,
      diagnosis,
      blueprintId: options.blueprintId,
      diasAteProva: options.diasAteProva,
      bancaPreferencial: options.bancaPreferencial,
      forceTopics: options.forceTopics
    });

    console.log(`✅ Prioridades calculadas: ${prioritizationResult.priorities.length} itens`);
    console.log(`   Top 5 prioridades:`);
    prioritizationResult.priorities.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.action} (score: ${p.score.toFixed(1)}, reason: ${p.reason})`);
    });
    console.log();

    // Salvar prioridades
    await ReccoRepository.saveReccoPriorities({
      user_id: options.userId,
      ...prioritizationResult.scores,
      lista_priorizada: prioritizationResult.priorities
    });

    // ============================================
    // PASSO 3: SELEÇÃO (Buscar conteúdo)
    // ============================================
    console.log(`🔍 PASSO 3: SELEÇÃO DE CONTEÚDO`);
    console.log(`${'─'.repeat(60)}`);

    // TODO: Implementar seleção real de conteúdo do banco
    // Por enquanto, usar as prioridades diretamente e incluir SRS vencido na frente
    const dueCards = await listDueCards(options.userId, 30);
    const srsItems = dueCards.map((card) => ({
      action: 'revisao_srs',
      score: 999,
      reason: 'revisao_srs_vencida',
      urgency: 10,
      type: 'revisao',
      content_id: card.drop_id,
    }));

    const selectedContent = [...srsItems, ...prioritizationResult.priorities];

    console.log(`✅ Conteúdo selecionado: ${selectedContent.length} itens (inclui ${srsItems.length} revisões SRS)\n`);

    // ============================================
    // PASSO 4: SEQUENCIAMENTO (Em que ordem)
    // ============================================
    console.log(`🔄 PASSO 4: SEQUENCIAMENTO`);
    console.log(`${'─'.repeat(60)}`);

    const tempoDisponivel = options.tempoDisponivel || diagnosis.tempo_otimo_estudo || 60;

    const sequencingResult = generateSequence({
      priorities: selectedContent,
      diagnosis,
      tempoDisponivel
    });

    console.log(`✅ Sequência gerada: ${sequencingResult.sequencia.length} itens`);
    console.log(`   Duração total: ${sequencingResult.total_duration} min`);
    console.log(`   Curvas aplicadas:`);
    console.log(`   - Dificuldade: ${sequencingResult.curvas_aplicadas.curva_dificuldade}`);
    console.log(`   - Cognitiva: ${sequencingResult.curvas_aplicadas.curva_cognitiva}`);
    console.log(`   - Emocional: ${sequencingResult.curvas_aplicadas.curva_emocional}\n`);

    // Salvar sequência
    await ReccoRepository.saveReccoSequence({
      user_id: options.userId,
      sequencia: sequencingResult.sequencia,
      ...sequencingResult.curvas_aplicadas
    });

    // ============================================
    // PASSO 5: GERAR TRILHA DO DIA
    // ============================================
    console.log(`🎯 PASSO 5: TRILHA DO DIA`);
    console.log(`${'─'.repeat(60)}`);

    const trail: TrailOfDay = {
      user_id: options.userId,
      date: new Date(),
      items: sequencingResult.sequencia,
      total_duration_minutes: sequencingResult.total_duration,
      difficulty_curve: sequencingResult.curvas_aplicadas.curva_dificuldade as any,
      generated_at: new Date()
    };

    console.log(`✅ Trilha do dia gerada:`);
    console.log(`   ${trail.items.length} itens`);
    console.log(`   ${trail.total_duration_minutes} minutos`);
    console.log(`   Curva: ${trail.difficulty_curve}\n`);

    // Salvar seleção com trilha
    await ReccoRepository.saveReccoSelection({
      user_id: options.userId,
      drops_selecionados: trail.items.filter(i => i.type === 'drop'),
      blocos_selecionados: trail.items.filter(i => i.type === 'bloco'),
      questoes_selecionadas: trail.items.filter(i => i.type === 'questao'),
      revisoes_srs: trail.items.filter(i => i.type === 'revisao_srs'),
      simulados: trail.items.filter(i => i.type === 'simulado'),
      mnemonicos: [],
      trilha_do_dia: trail
    });

    // ============================================
    // RESULTADO FINAL
    // ============================================
    const processingTime = Date.now() - startTime;

    console.log(`${'='.repeat(60)}`);
    console.log(`✅ ReccoEngine V3 - CONCLUÍDO`);
    console.log(`${'='.repeat(60)}`);
    console.log(`⏱️  Tempo de processamento: ${processingTime}ms`);
    console.log(`${'='.repeat(60)}\n`);

    const result = {
      diagnosis,
      trail,
      metadata: {
        generated_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        version: '3.1.0',
        srs_backlog: srsItems.length,
        debug: options.debug
          ? {
              priorities_full: selectedContent,
              priorities_sample: selectedContent.slice(0, 10).map((p: any) => ({
                action: p.action,
                score: p.score,
                reason: p.reason,
                type: p.type,
              })),
              sequencing_sample: trail.items.slice(0, 10).map((i: any) => ({
                order: i.order,
                type: i.type,
                content_id: i.content_id,
                duration_minutes: i.duration_minutes,
                reason: i.reason,
              })),
            }
          : undefined,
      }
    };

    MonitoringService.trackReccoRun({
      durationMs: processingTime,
      items: trail.items.length,
      status: 'ok',
      srsBacklog: srsItems.length
    });

    return result;

  } catch (error) {
    console.error(`❌ Erro no ReccoEngine:`, error);
    MonitoringService.trackReccoRun({
      durationMs: Date.now() - startTime,
      items: 0,
      status: 'error',
      errorMessage: (error as any)?.message,
      srsBacklog: undefined
    });
    throw error;
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function classifyCognitiveState(cognitive: any): 'alto' | 'medio' | 'baixo' | 'saturado' {
  if (cognitive.saturacao) return 'saturado';
  const nec = cognitive.nec || 50;
  if (nec >= 70) return 'alto';
  if (nec >= 40) return 'medio';
  return 'baixo';
}

function classifyEmotionalState(emotional: any): 'motivado' | 'ansioso' | 'frustrado' | 'neutro' {
  if (emotional.ansiedade) return 'ansioso';
  if (emotional.frustracao) return 'frustrado';
  if (emotional.motivacao && (emotional.humor || 3) >= 4) return 'motivado';
  return 'neutro';
}

function classifyPedagogicalState(pedagogical: any): 'avancado' | 'medio' | 'iniciante' | 'travado' {
  if (pedagogical.nivel_medio >= 4) return 'avancado';
  if (pedagogical.nivel_medio >= 3) return 'medio';
  if (pedagogical.topicos_frageis.length > 5) return 'travado';
  return 'iniciante';
}

// ============================================
// FUNÇÕES DE CONVENIÊNCIA
// ============================================

/**
 * Gera trilha diária simplificada
 */
export async function generateDailyTrail(
  userId: string,
  blueprintId?: number
): Promise<TrailOfDay> {
  const result = await runReccoEngine({
    userId,
    blueprintId,
    tempoDisponivel: 60 // 1 hora padrão
  });

  return result.trail;
}

/**
 * Gera trilha personalizada com tempo específico
 */
export async function generateCustomTrail(
  userId: string,
  tempoDisponivel: number,
  options?: Partial<ReccoEngineOptions>
): Promise<TrailOfDay> {
  const result = await runReccoEngine({
    userId,
    tempoDisponivel,
    ...options
  });

  return result.trail;
}

/**
 * Apenas executa diagnóstico sem gerar trilha
 */
export async function diagnoseUser(userId: string): Promise<DiagnosisResult> {
  const inference = await runInference(userId);
  const completeState = await calculateCompleteState(userId);

  return {
    cognitive: completeState.cognitive,
    emotional: completeState.emotional,
    pedagogical: completeState.pedagogical,
    estado_cognitivo: classifyCognitiveState(completeState.cognitive),
    estado_emocional: classifyEmotionalState(completeState.emotional),
    estado_pedagogico: classifyPedagogicalState(completeState.pedagogical),
    prob_acerto: inference.probabilities.prob_acerto,
    prob_retencao: inference.probabilities.prob_retencao,
    prob_saturacao: inference.probabilities.prob_saturacao,
    tempo_otimo_estudo: inference.tempo_otimo_estudo
  };
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const ReccoEngine = {
  run: runReccoEngine,
  generateDailyTrail,
  generateCustomTrail,
  diagnoseUser,
  
  // Sub-engines (para uso avançado)
  Inference: { runInference },
  State: { calculateCompleteState },
  Prioritization: PrioritizationEngine,
  Sequencing: SequencingEngine,
  Repository: ReccoRepository
};

export default ReccoEngine;
