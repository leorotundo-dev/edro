/**
 * Mnemonic Service
 * 
 * Geração e gerenciamento de mnemônicos
 */

import { MnemonicoRepository } from '../repositories/mnemonicRepository';
import type { Mnemonico, MnemonicoUsuario } from '../repositories/mnemonicRepository';
import { OpenAIService } from './ai/openaiService';
import { findOrCreateCardForContent } from '../repositories/srsRepository';
import { createDrop } from '../repositories/dropRepository';
import { query } from '../db';

// ============================================
// TIPOS DE TÉCNICAS
// ============================================

export const TECNICAS_MNEMONICAS = {
  ACRONIMO: 'acronimo',
  HISTORIA: 'historia',
  IMAGEM: 'imagem',
  SUBSTITUICAO: 'substituicao',
  UM_TRES_UM: '1-3-1',
  ASSOCIACAO_ABSURDA: 'associacao_absurda',
  EMOCAO: 'emocao',
  TURBO: 'turbo',
} as const;

const EVOLUTION_MIN_USES = 3;
const EVOLUTION_MIN_SUCCESS_RATE = 50;

function bumpVersion(current?: string): string {
  if (!current) return 'v1.1';
  const match = /^v(\d+)\.(\d+)$/i.exec(current.trim());
  if (!match) return 'v1.1';
  const major = Number(match[1]);
  const minor = Number(match[2]) + 1;
  return `v${major}.${minor}`;
}

function mergeUnique(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim?.();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    output.push(trimmed);
  }
  return output;
}

export const ESTILOS_COGNITIVOS = {
  VISUAL: 'visual',
  NARRATIVO: 'narrativo',
  LOGICO: 'logico',
  INTUITIVO: 'intuitivo',
  AUDITIVO: 'auditivo',
  RAPIDO: 'rapido',
  PROFUNDO: 'profundo',
} as const;

// ============================================
// CRIAR MNEMÔNICO
// ============================================

export async function createMnemonico(data: {
  tecnica: string;
  texto_principal: string;
  explicacao?: string;
  versoes_alternativas?: string[];
  subtopico?: string;
  disciplina_id?: string;
  banca?: string;
  nivel_dificuldade?: number;
  estilo_cognitivo?: string;
  emocao_ativada?: string;
  criado_por?: string;
}): Promise<string> {
  console.log(`[mnemonics] Criando mnemônico: ${data.tecnica}`);

  const mnemonicoId = await MnemonicoRepository.createMnemonico({
    tecnica: data.tecnica,
    texto_principal: data.texto_principal,
    versoes_alternativas: data.versoes_alternativas,
    explicacao: data.explicacao,
    subtopico: data.subtopico,
    disciplina_id: data.disciplina_id,
    banca: data.banca,
    nivel_dificuldade: data.nivel_dificuldade,
    estilo_cognitivo: data.estilo_cognitivo,
    emocao_ativada: data.emocao_ativada,
    criado_por: data.criado_por || 'Usuario',
    forca_memoria: 0.5, // Inicial
    versao: 'v1.0',
  });

  return mnemonicoId;
}

// ============================================
// GERAR MNEMÔNICO COM IA
// ============================================

export async function generateMnemonic(params: {
  subtopico: string;
  conteudo: string;
  tecnica?: string;
  estilo_cognitivo?: string;
  disciplina_id?: string;
  banca?: string;
  humor?: number;
  energia?: number;
  variacoes?: number;
}): Promise<string> {
  console.log(`[mnemonics] Gerando mnemônico com IA para: ${params.subtopico}`);

  const tecnica = params.tecnica || TECNICAS_MNEMONICAS.ACRONIMO;
  const estilo = params.estilo_cognitivo || ESTILOS_COGNITIVOS.VISUAL;
  const variationCount = Math.max(0, Math.min(params.variacoes ?? 2, 5));

  let texto_principal = '';
  let explicacao = '';
  let variacoes: string[] = [];

  // Tentar gerar com OpenAI
  try {
    const aiResult = await OpenAIService.generateMnemonic({
      subtopico: params.subtopico,
      conteudo: params.conteudo,
      tecnica,
      estilo,
      banca: params.banca,
      humor: params.humor,
      energia: params.energia,
      variacoes: variationCount,
    });

    texto_principal = aiResult.texto;
    explicacao = aiResult.explicacao;
    variacoes = aiResult.variacoes || [];
  } catch (err) {
    console.error('[mnemonics] Erro ao gerar com IA, usando fallback:', err);
    
    // Fallback: geração simples
    if (tecnica === TECNICAS_MNEMONICAS.ACRONIMO) {
      const palavras = params.conteudo.split(' ').slice(0, 5);
      const acronimo = palavras.map(p => p[0]).join('');
      texto_principal = acronimo.toUpperCase();
      explicacao = `Acrônimo para lembrar: ${palavras.join(', ')}`;
    } else if (tecnica === TECNICAS_MNEMONICAS.HISTORIA) {
      texto_principal = `Era uma vez um conceito chamado ${params.subtopico}...`;
      explicacao = `História criada para facilitar memorização`;
    } else if (tecnica === TECNICAS_MNEMONICAS.IMAGEM) {
      texto_principal = `Imagine uma imagem de ${params.subtopico}`;
      explicacao = `Visualização mental para memorização`;
    } else {
      texto_principal = `Mnemônico para ${params.subtopico}`;
      explicacao = `Gerado automaticamente`;
    }

    if (variationCount > 0) {
      variacoes = Array.from({ length: variationCount }, (_, idx) => {
        const suffix = idx + 1;
        return `${texto_principal} (variante ${suffix})`;
      });
    }
  }

  const emocao_ativada =
    typeof params.humor === 'number' || typeof params.energia === 'number'
      ? `humor:${params.humor ?? '-'};energia:${params.energia ?? '-'}`
      : undefined;

  const mnemonicoId = await MnemonicoRepository.createMnemonico({
    tecnica,
    texto_principal,
    explicacao,
    versoes_alternativas: variacoes,
    subtopico: params.subtopico,
    disciplina_id: params.disciplina_id,
    banca: params.banca,
    estilo_cognitivo: estilo,
    emocao_ativada,
    criado_por: 'IA',
    forca_memoria: 0.7,
    versao: 'v1.0',
  });

  console.log(`[mnemonics] ✅ Mnemônico gerado: ${mnemonicoId}`);

  return mnemonicoId;
}

// ============================================
// BUSCAR MNEMÔNICOS
// ============================================

export async function getMnemonico(id: string): Promise<Mnemonico | null> {
  return MnemonicoRepository.getMnemonicoById(id);
}

export async function getMnemonicos(filters?: {
  disciplina_id?: string;
  subtopico?: string;
  banca?: string;
  tecnica?: string;
  limit?: number;
}): Promise<Mnemonico[]> {
  return MnemonicoRepository.getAllMnemonicos(filters);
}

export async function getMnemonicosByTopic(subtopico: string): Promise<Mnemonico[]> {
  return MnemonicoRepository.getMnemonicosBySubtopico(subtopico);
}

// ============================================
// MNEMÔNICOS DO USUÁRIO
// ============================================

export async function addToUser(userId: string, mnemonicoId: string): Promise<void> {
  console.log(`[mnemonics] Adicionando mnemônico ${mnemonicoId} ao usuário ${userId}`);
  await MnemonicoRepository.addMnemonicoToUser({ userId, mnemonicoId });
  try {
    const mnemonico = await MnemonicoRepository.getMnemonicoById(mnemonicoId);
    if (!mnemonico?.disciplina_id) {
      console.warn('[mnemonics] Disciplina ausente; pulando vinculo SRS');
      return;
    }

    let dropId: string | null = null;
    const { rows } = await query<{ id: string }>(
      "SELECT id FROM drops WHERE origin = 'mnemonic' AND origin_meta->>'mnemonico_id' = $1 LIMIT 1",
      [mnemonicoId]
    );
    dropId = rows[0]?.id ?? null;

    if (!dropId) {
      const title = mnemonico.subtopico || mnemonico.texto_principal || 'Mnemonico';
      const content = mnemonico.explicacao || mnemonico.texto_principal || '';
      const drop = await createDrop({
        discipline_id: mnemonico.disciplina_id,
        title,
        content,
        difficulty: mnemonico.nivel_dificuldade ?? 1,
        status: 'draft',
        origin: 'mnemonic',
        origin_user_id: userId,
        origin_meta: {
          mnemonico_id: mnemonicoId,
          subtopico: mnemonico.subtopico ?? null,
        },
      });
      dropId = drop.id;
    }

    await findOrCreateCardForContent({
      userId,
      contentType: 'mnemonic',
      contentId: mnemonicoId,
      dropId: dropId || undefined,
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== '42P01') {
      console.warn('[mnemonics] Falha ao vincular SRS:', (err as any)?.message);
    }
  }
}

export async function getUserMnemonics(userId: string): Promise<MnemonicoUsuario[]> {
  return MnemonicoRepository.getUserMnemonicos(userId);
}

export async function getUserFavorites(userId: string): Promise<MnemonicoUsuario[]> {
  return MnemonicoRepository.getUserFavorites(userId);
}

export async function toggleFavorite(userId: string, mnemonicoId: string): Promise<void> {
  console.log(`[mnemonics] Toggling favorite: ${mnemonicoId} para ${userId}`);
  await MnemonicoRepository.toggleFavorite(userId, mnemonicoId);
}

export async function setFeedback(
  userId: string,
  mnemonicoId: string,
  funcionaBem: boolean,
  motivo?: string
): Promise<void> {
  console.log(`[mnemonics] Feedback: ${mnemonicoId} - ${funcionaBem ? 'funciona' : 'não funciona'}`);
  await MnemonicoRepository.setFeedback(userId, mnemonicoId, funcionaBem);
  if (!funcionaBem && process.env.ENABLE_MNEMONIC_EVOLUTION !== 'false') {
    await evolveMnemonico({
      mnemonicoId,
      motivo: motivo || 'feedback_negativo',
      contexto: 'feedback',
    });
  }
}

export async function removeFromUser(userId: string, mnemonicoId: string): Promise<void> {
  console.log(`[mnemonics] Removendo mnemônico ${mnemonicoId} do usuário ${userId}`);
  await MnemonicoRepository.removeMnemonicoFromUser(userId, mnemonicoId);
}

async function evolveMnemonico(params: {
  mnemonicoId: string;
  motivo: string;
  contexto?: string;
  humor?: number;
  energia?: number;
}): Promise<void> {
  const mnemonico = await MnemonicoRepository.getMnemonicoById(params.mnemonicoId);
  if (!mnemonico) return;

  const conteudoBase = [mnemonico.explicacao, mnemonico.texto_principal]
    .filter(Boolean)
    .join(' | ');

  let nextTexto = mnemonico.texto_principal;
  let nextExplicacao = mnemonico.explicacao || '';
  let nextVariacoes: string[] = [];

  try {
    const aiResult = await OpenAIService.generateMnemonic({
      subtopico: mnemonico.subtopico || 'geral',
      conteudo: conteudoBase || mnemonico.texto_principal,
      tecnica: mnemonico.tecnica,
      estilo: mnemonico.estilo_cognitivo,
      banca: mnemonico.banca,
      humor: params.humor,
      energia: params.energia,
      variacoes: 2,
    });
    if (aiResult.texto) {
      nextTexto = aiResult.texto;
    }
    if (aiResult.explicacao) {
      nextExplicacao = aiResult.explicacao;
    }
    nextVariacoes = aiResult.variacoes || [];
  } catch (err) {
    nextVariacoes = [`${mnemonico.texto_principal} (variante revisada)`];
    console.warn('[mnemonics] Falha ao evoluir com IA:', (err as any)?.message);
  }

  const priorVariacoes = Array.isArray(mnemonico.versoes_alternativas)
    ? mnemonico.versoes_alternativas
    : [];
  const mergedVariacoes = mergeUnique([
    ...priorVariacoes,
    mnemonico.texto_principal,
    ...nextVariacoes,
  ]);
  const nextVersion = bumpVersion(mnemonico.versao);
  const hasChanges =
    nextTexto !== mnemonico.texto_principal
    || nextExplicacao !== (mnemonico.explicacao || '')
    || mergedVariacoes.length !== priorVariacoes.length;

  if (!hasChanges) return;

  await MnemonicoRepository.updateMnemonico(mnemonico.id, {
    texto_principal: nextTexto,
    explicacao: nextExplicacao,
    versoes_alternativas: mergedVariacoes,
    versao: nextVersion,
  });

  await MnemonicoRepository.addMnemonicoVersion({
    mnemonico_id: mnemonico.id,
    versao: nextVersion,
    motivo: params.motivo,
    alteracoes: {
      texto_anterior: mnemonico.texto_principal,
      texto_novo: nextTexto,
      explicacao_anterior: mnemonico.explicacao || '',
      explicacao_nova: nextExplicacao,
      variacoes: nextVariacoes,
      contexto: params.contexto || null,
    },
    ia_model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  });
}

// ============================================
// TRACKING DE EFETIVIDADE
// ============================================

export async function trackUsage(params: {
  userId: string;
  mnemonicoId: string;
  ajudou_lembrar: boolean;
  tempo_para_lembrar?: number;
  contexto?: string;
}): Promise<void> {
  console.log(`[mnemonics] Tracking uso de ${params.mnemonicoId}`);

  // Registrar uso
  await MnemonicoRepository.trackMnemonicoUse({
    user_id: params.userId,
    mnemonico_id: params.mnemonicoId,
    ajudou_lembrar: params.ajudou_lembrar,
    tempo_para_lembrar: params.tempo_para_lembrar,
    contexto: params.contexto,
    timestamp: new Date(),
  });

  // Incrementar contador de uso
  await MnemonicoRepository.updateMnemonicoUsage(params.userId, params.mnemonicoId);

  // Atualizar força de memória baseado em eficácia
  const effectiveness = await MnemonicoRepository.getMnemonicoEffectiveness(params.mnemonicoId);
  const forca_memoria = effectiveness.success_rate / 100;

  await MnemonicoRepository.updateMnemonico(params.mnemonicoId, {
    forca_memoria,
  });

  const shouldEvolve =
    effectiveness.total_uses >= EVOLUTION_MIN_USES
    && effectiveness.success_rate < EVOLUTION_MIN_SUCCESS_RATE
    && effectiveness.total_uses % EVOLUTION_MIN_USES === 0;
  if (shouldEvolve && process.env.ENABLE_MNEMONIC_EVOLUTION !== 'false') {
    await evolveMnemonico({
      mnemonicoId: params.mnemonicoId,
      motivo: 'baixa_eficacia',
      contexto: params.contexto,
    });
  }
}

export async function getEffectiveness(mnemonicoId: string): Promise<{
  total_uses: number;
  success_rate: number;
  avg_time: number;
}> {
  return MnemonicoRepository.getMnemonicoEffectiveness(mnemonicoId);
}

// ============================================
// RECOMENDAÇÃO DE MNEMÔNICOS
// ============================================

export async function recommendMnemonics(params: {
  userId: string;
  subtopico: string;
  estilo_cognitivo?: string;
  limit?: number;
}): Promise<Mnemonico[]> {
  console.log(`[mnemonics] Recomendando mnemônicos para ${params.subtopico}`);

  // Buscar mnemônicos do tópico
  let mnemonicos = await getMnemonicosByTopic(params.subtopico);

  // Filtrar por estilo cognitivo se fornecido
  if (params.estilo_cognitivo) {
    mnemonicos = mnemonicos.filter(m => 
      !m.estilo_cognitivo || m.estilo_cognitivo === params.estilo_cognitivo
    );
  }

  // Ordenar por força de memória
  mnemonicos.sort((a, b) => (b.forca_memoria || 0) - (a.forca_memoria || 0));

  // Limitar quantidade
  const limit = params.limit || 5;
  return mnemonicos.slice(0, limit);
}

// ============================================
// ATUALIZAR MNEMÔNICO
// ============================================

export async function updateMnemonico(
  id: string,
  data: Partial<Mnemonico>
): Promise<void> {
  console.log(`[mnemonics] Atualizando mnemônico ${id}`);
  await MnemonicoRepository.updateMnemonico(id, data);
}

// ============================================
// DELETAR MNEMÔNICO
// ============================================

export async function deleteMnemonico(id: string): Promise<void> {
  console.log(`[mnemonics] Deletando mnemônico ${id}`);
  await MnemonicoRepository.deleteMnemonico(id);
}

// ============================================
// ESTATÍSTICAS
// ============================================

export async function getUserStats(userId: string): Promise<{
  total_mnemonics: number;
  total_favorites: number;
  avg_effectiveness: number;
  most_used: MnemonicoUsuario[];
}> {
  const allMnemonics = await getUserMnemonics(userId);
  const favorites = allMnemonics.filter(m => m.favorito);

  // Calcular efetividade média
  let totalSuccessRate = 0;
  let count = 0;

  for (const m of allMnemonics) {
    const effectiveness = await getEffectiveness(m.mnemonico_id);
    if (effectiveness.total_uses > 0) {
      totalSuccessRate += effectiveness.success_rate;
      count++;
    }
  }

  const avgEffectiveness = count > 0 ? totalSuccessRate / count : 0;

  // Top 5 mais usados
  const mostUsed = allMnemonics
    .sort((a, b) => b.vezes_usado - a.vezes_usado)
    .slice(0, 5);

  return {
    total_mnemonics: allMnemonics.length,
    total_favorites: favorites.length,
    avg_effectiveness: avgEffectiveness,
    most_used: mostUsed,
  };
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const MnemonicService = {
  createMnemonico,
  generateMnemonic,
  getMnemonico,
  getMnemonicos,
  getMnemonicosByTopic,
  addToUser,
  getUserMnemonics,
  getUserFavorites,
  toggleFavorite,
  setFeedback,
  removeFromUser,
  trackUsage,
  getEffectiveness,
  recommendMnemonics,
  updateMnemonico,
  deleteMnemonico,
  getUserStats,
};

export default MnemonicService;
