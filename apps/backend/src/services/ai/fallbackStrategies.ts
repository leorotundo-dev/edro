/**
 * Estratégias de Fallback para IA
 * 
 * Quando a OpenAI falha, usamos estas estratégias para não quebrar o sistema
 */

import { LoggerService } from '../loggerService';
import { query } from '../../db';

// ============================================
// TIPOS
// ============================================

export interface FallbackContext {
  operation: string;
  params: any;
  error?: Error;
  attemptNumber: number;
}

export interface FallbackResult<T> {
  data: T;
  source: 'cache' | 'precomputed' | 'degraded' | 'queued';
  timestamp: Date;
  metadata?: any;
}

const cacheTypeOverrides: Record<string, string> = {
  generateEmbedding: 'embedding',
  generateCompletion: 'completion',
  generateJSON: 'completion',
};

const validCacheTypes = new Set([
  'embedding',
  'completion',
  'mnemonic',
  'analysis',
  'question',
  'drop',
  'summary',
  'blueprint',
]);

function resolveCacheType(operation: string): string {
  const mapped = cacheTypeOverrides[operation] || operation;
  return validCacheTypes.has(mapped) ? mapped : 'completion';
}

// ============================================
// 1. CACHED RESPONSE FALLBACK
// ============================================

/**
 * Retorna última resposta válida do cache
 */
export async function cachedResponseFallback<T>(
  context: FallbackContext
): Promise<FallbackResult<T> | null> {
  LoggerService.info(`[Fallback] Tentando cache para ${context.operation}`);

  try {
    const cacheKey = generateCacheKey(context.operation, context.params);
    const cacheType = resolveCacheType(context.operation);
    
    const { rows } = await query<{
      output_data: any;
      created_at: Date;
      hit_count: number;
    }>(
      `SELECT output_data, created_at, hit_count
       FROM ai_cache
       WHERE cache_key = $1
       AND cache_type = $2
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY hit_count DESC, created_at DESC
       LIMIT 1`,
      [cacheKey, cacheType]
    );

    if (rows[0]) {
      // Incrementar hit count
      await query(
        `UPDATE ai_cache SET hit_count = hit_count + 1 WHERE cache_key = $1`,
        [cacheKey]
      );

      LoggerService.info(`[Fallback] Cache hit para ${context.operation}`);
      
      return {
        data: rows[0].output_data as T,
        source: 'cache',
        timestamp: rows[0].created_at,
        metadata: {
          cacheKey,
          hitCount: rows[0].hit_count + 1,
        },
      };
    }

    LoggerService.warn(`[Fallback] Sem cache disponível para ${context.operation}`);
    return null;
  } catch (error) {
    LoggerService.error(`[Fallback] Erro ao buscar cache:`, error);
    return null;
  }
}

/**
 * Busca resposta similar no cache (usando embeddings)
 */
export async function similarCachedResponseFallback<T>(
  context: FallbackContext,
  similarityThreshold: number = 0.85
): Promise<FallbackResult<T> | null> {
  LoggerService.info(`[Fallback] Buscando resposta similar para ${context.operation}`);

  try {
    // TODO: Implementar busca por similaridade quando tiver embeddings
    // Por enquanto, usar cache exato
    return await cachedResponseFallback<T>(context);
  } catch (error) {
    LoggerService.error(`[Fallback] Erro ao buscar similar:`, error);
    return null;
  }
}

// ============================================
// 2. PRECOMPUTED FALLBACK
// ============================================

/**
 * Retorna resposta pré-computada genérica
 */
export async function precomputedFallback<T>(
  context: FallbackContext
): Promise<FallbackResult<T> | null> {
  LoggerService.info(`[Fallback] Usando resposta pré-computada para ${context.operation}`);

  const precomputedResponses: Record<string, any> = {
    'generateMnemonic': {
      texto: 'Sistema temporariamente indisponível. Por favor, tente novamente em alguns instantes.',
      explicacao: 'A geração de mnemônicos está temporariamente offline.',
    },
    'analyzeQuestion': {
      difficulty: 3,
      topics: ['Conhecimentos Gerais'],
      explanation: 'Análise temporariamente indisponível. A questão será analisada em breve.',
      bancaStyle: 'N/A',
    },
    'generateDrop': {
      title: 'Conteúdo Temporariamente Indisponível',
      content: 'Estamos processando seu conteúdo. Por favor, tente novamente em alguns minutos.',
      examples: [],
      tips: ['Tente novamente em breve', 'O sistema estará disponível em instantes'],
    },
    'generateQuestion': {
      statement: 'Geração de questões temporariamente indisponível.',
      options: ['Aguarde alguns instantes', 'Tente novamente', 'Sistema em manutenção', 'Voltamos logo', 'Obrigado pela paciência'],
      correctAnswer: 'a',
      explanation: 'Sistema temporariamente offline.',
    },
  };

  const response = precomputedResponses[context.operation];
  
  if (response) {
    return {
      data: response as T,
      source: 'precomputed',
      timestamp: new Date(),
      metadata: {
        operation: context.operation,
      },
    };
  }

  return null;
}

// ============================================
// 3. DEGRADED FALLBACK
// ============================================

/**
 * Retorna versão degradada (sem IA, apenas estrutura)
 */
export async function degradedFallback<T>(
  context: FallbackContext
): Promise<FallbackResult<T> | null> {
  LoggerService.info(`[Fallback] Usando modo degradado para ${context.operation}`);

  // Retornar estrutura básica baseada na operação
  const degradedResponses: Record<string, any> = {
    'generateEmbedding': {
      // Retornar embedding zerado (pode ser usado para matching exato)
      embedding: new Array(1536).fill(0),
    },
    'generateCompletion': {
      // Retornar mensagem padrão
      content: 'Sistema em modo econômico. Resposta completa disponível em instantes.',
    },
    'summarizeForRAG': {
      // Retornar texto original truncado
      summary: context.params.rawText?.substring(0, 500) + '...',
    },
  };

  const response = degradedResponses[context.operation];
  
  if (response) {
    return {
      data: response as T,
      source: 'degraded',
      timestamp: new Date(),
      metadata: {
        operation: context.operation,
        note: 'Resposta degradada devido a indisponibilidade temporária',
      },
    };
  }

  return null;
}

// ============================================
// 4. QUEUE FOR LATER FALLBACK
// ============================================

/**
 * Adiciona requisição à fila para processar depois
 */
export async function queueForLaterFallback<T>(
  context: FallbackContext
): Promise<FallbackResult<T>> {
  LoggerService.info(`[Fallback] Enfileirando ${context.operation} para processar depois`);

  try {
    // Adicionar à tabela de jobs pendentes
    await query(
      `INSERT INTO jobs (
        type,
        data,
        status,
        priority,
        created_at,
        scheduled_for
      ) VALUES ($1, $2, 'pending', 5, NOW(), NOW() + INTERVAL '5 minutes')`,
      [
        `ai_retry_${context.operation}`,
        JSON.stringify({
          operation: context.operation,
          params: context.params,
          originalError: context.error?.message,
          attemptNumber: context.attemptNumber,
        }),
      ]
    );

    LoggerService.info(`[Fallback] Job enfileirado para ${context.operation}`);

    return {
      data: {
        queued: true,
        message: 'Sua requisição foi enfileirada e será processada em breve.',
        estimatedTime: '5 minutos',
      } as any,
      source: 'queued',
      timestamp: new Date(),
      metadata: {
        operation: context.operation,
        retryAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    };
  } catch (error) {
    LoggerService.error(`[Fallback] Erro ao enfileirar:`, error);
    throw error;
  }
}

// ============================================
// 5. HYBRID FALLBACK (Cascade)
// ============================================

/**
 * Tenta múltiplas estratégias em cascata
 */
export async function cascadeFallback<T>(
  context: FallbackContext
): Promise<FallbackResult<T>> {
  LoggerService.info(`[Fallback] Iniciando cascade para ${context.operation}`);

  // Estratégia 1: Tentar cache
  const cached = await cachedResponseFallback<T>(context);
  if (cached) {
    return cached;
  }

  // Estratégia 2: Tentar pré-computado
  const precomputed = await precomputedFallback<T>(context);
  if (precomputed) {
    return precomputed;
  }

  // Estratégia 3: Modo degradado
  const degraded = await degradedFallback<T>(context);
  if (degraded) {
    return degraded;
  }

  // Estratégia 4: Enfileirar para depois
  return await queueForLaterFallback<T>(context);
}

// ============================================
// HELPERS
// ============================================

/**
 * Gera chave de cache consistente
 */
function generateCacheKey(operation: string, params: any): string {
  const paramString = JSON.stringify(params, Object.keys(params).sort());
  const hash = simpleHash(paramString);
  return `${operation}:${hash}`;
}

/**
 * Hash simples para cache keys
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Salva resposta no cache para futuro fallback
 */
export async function saveFallbackCache(
  operation: string,
  params: any,
  response: any,
  ttlHours: number = 24
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(operation, params);
    const cacheType = resolveCacheType(operation);
    
    await query(
      `INSERT INTO ai_cache (
        cache_key,
        cache_type,
        input_text,
        output_data,
        ttl_hours,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '${ttlHours} hours')
      ON CONFLICT (cache_key) 
      DO UPDATE SET 
        output_data = $4,
        hit_count = ai_cache.hit_count + 1,
        expires_at = NOW() + INTERVAL '${ttlHours} hours'`,
      [
        cacheKey,
        cacheType,
        JSON.stringify(params),
        JSON.stringify(response),
        ttlHours,
      ]
    );

    LoggerService.debug(`[Fallback] Cache salvo para ${operation}`);
  } catch (error) {
    LoggerService.error(`[Fallback] Erro ao salvar cache:`, error);
    // Não propagar erro, cache é opcional
  }
}

// ============================================
// STRATEGY SELECTOR
// ============================================

export type FallbackStrategy = 'cache' | 'precomputed' | 'degraded' | 'queued' | 'cascade';

/**
 * Seleciona e executa estratégia de fallback
 */
export async function executeFallbackStrategy<T>(
  strategy: FallbackStrategy,
  context: FallbackContext
): Promise<FallbackResult<T>> {
  switch (strategy) {
    case 'cache':
      const cached = await cachedResponseFallback<T>(context);
      if (cached) return cached;
      throw new Error('Sem cache disponível');
      
    case 'precomputed':
      const precomputed = await precomputedFallback<T>(context);
      if (precomputed) return precomputed;
      throw new Error('Sem resposta pré-computada');
      
    case 'degraded':
      const degraded = await degradedFallback<T>(context);
      if (degraded) return degraded;
      throw new Error('Sem fallback degradado');
      
    case 'queued':
      return await queueForLaterFallback<T>(context);
      
    case 'cascade':
    default:
      return await cascadeFallback<T>(context);
  }
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const FallbackStrategies = {
  cachedResponseFallback,
  similarCachedResponseFallback,
  precomputedFallback,
  degradedFallback,
  queueForLaterFallback,
  cascadeFallback,
  executeFallbackStrategy,
  saveFallbackCache,
};

export default FallbackStrategies;
