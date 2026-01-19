/**
 * Circuit Breaker para IA
 * 
 * Protege o sistema contra falhas da OpenAI com fallbacks inteligentes
 */

import { LoggerService } from '../loggerService';
import { MonitoringService } from '../../middleware/monitoring';

const log = LoggerService.createLogger('CircuitBreaker');

// ============================================
// TIPOS
// ============================================

export enum CircuitState {
  CLOSED = 'CLOSED',     // Funcionando normalmente
  OPEN = 'OPEN',         // Circuito aberto (muitas falhas)
  HALF_OPEN = 'HALF_OPEN' // Testando reconexão
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;    // Número de falhas para abrir (padrão: 5)
  successThreshold: number;    // Sucessos para fechar (padrão: 2)
  timeout: number;            // Tempo antes de tentar HALF_OPEN (ms)
  resetTimeout?: number;      // Tempo para resetar contador (ms)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
}

// ============================================
// CIRCUIT BREAKER
// ============================================

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  
  // Estatísticas totais
  private totalCalls: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  constructor(private config: CircuitBreakerConfig) {
    log.info(`[CircuitBreaker] ${config.name} initialized`, {
      failureThreshold: config.failureThreshold,
      timeout: config.timeout,
    });
  }

  /**
   * Executa função com proteção do circuit breaker
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    this.totalCalls++;

    // Se circuito está OPEN, usar fallback imediatamente
    if (this.state === CircuitState.OPEN) {
      const now = new Date();
      
      // Verificar se é hora de tentar reconectar
      if (this.nextAttemptTime && now >= this.nextAttemptTime) {
        log.info(`[CircuitBreaker] ${this.config.name} tentando reconexão (HALF_OPEN)`);
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        log.warn(`[CircuitBreaker] ${this.config.name} está OPEN, usando fallback`);
        MonitoringService.trackMetric('circuit_breaker_open', 1, {
          circuit: this.config.name,
        });
        
        if (fallback) {
          return await fallback();
        }
        throw new CircuitBreakerOpenError(this.config.name, this.nextAttemptTime);
      }
    }

    // Tentar executar a função
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      
      // Se tiver fallback, usar
      if (fallback) {
        log.info(`[CircuitBreaker] ${this.config.name} usando fallback após falha`);
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Callback de sucesso
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        log.info(`[CircuitBreaker] ${this.config.name} FECHADO (recuperado)`);
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        this.nextAttemptTime = undefined;
        
        MonitoringService.trackMetric('circuit_breaker_closed', 1, {
          circuit: this.config.name,
        });
      }
    }

    MonitoringService.trackMetric('circuit_breaker_success', 1, {
      circuit: this.config.name,
      state: this.state,
    });
  }

  /**
   * Callback de falha
   */
  private onFailure(): void {
    this.lastFailureTime = new Date();
    this.totalFailures++;
    this.failureCount++;

    log.warn(`[CircuitBreaker] ${this.config.name} falha registrada`, {
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
    });

    // Se estava em HALF_OPEN, voltar para OPEN
    if (this.state === CircuitState.HALF_OPEN) {
      log.error(`[CircuitBreaker] ${this.config.name} falhou em HALF_OPEN, voltando para OPEN`);
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
      this.successCount = 0;
      
      MonitoringService.trackMetric('circuit_breaker_half_open_failure', 1, {
        circuit: this.config.name,
      });
    }
    // Se atingiu threshold, abrir circuito
    else if (this.failureCount >= this.config.failureThreshold) {
      log.error(`[CircuitBreaker] ${this.config.name} ABERTO (threshold atingido)`);
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
      
      MonitoringService.trackMetric('circuit_breaker_opened', 1, {
        circuit: this.config.name,
        failures: this.failureCount,
      });
    }

    MonitoringService.trackMetric('circuit_breaker_failure', 1, {
      circuit: this.config.name,
      state: this.state,
    });
  }

  /**
   * Retorna estatísticas do circuit breaker
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Força reset do circuit breaker (admin only)
   */
  reset(): void {
    log.info(`[CircuitBreaker] ${this.config.name} reset manual`);
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = undefined;
    
    MonitoringService.trackMetric('circuit_breaker_reset', 1, {
      circuit: this.config.name,
    });
  }

  /**
   * Verifica se circuito está disponível
   */
  isAvailable(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }
    
    if (this.state === CircuitState.HALF_OPEN) {
      return true;
    }
    
    // OPEN: verificar se é hora de tentar
    if (this.nextAttemptTime && new Date() >= this.nextAttemptTime) {
      return true;
    }
    
    return false;
  }
}

// ============================================
// ERRO CUSTOMIZADO
// ============================================

export class CircuitBreakerOpenError extends Error {
  constructor(
    public circuitName: string,
    public nextAttemptTime?: Date
  ) {
    super(`Circuit breaker "${circuitName}" está aberto. Tente novamente em ${nextAttemptTime?.toISOString()}`);
    this.name = 'CircuitBreakerOpenError';
  }
}

// ============================================
// FACTORY DE CIRCUIT BREAKERS
// ============================================

const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Cria ou retorna circuit breaker existente
 */
export function getCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  if (!circuitBreakers.has(config.name)) {
    circuitBreakers.set(config.name, new CircuitBreaker(config));
  }
  return circuitBreakers.get(config.name)!;
}

/**
 * Retorna todos os circuit breakers
 */
export function getAllCircuitBreakers(): Map<string, CircuitBreaker> {
  return circuitBreakers;
}

// ============================================
// CIRCUIT BREAKERS PRÉ-CONFIGURADOS
// ============================================

/**
 * Circuit breaker para OpenAI Completions
 */
export const openaiCompletionCircuit = getCircuitBreaker({
  name: 'openai-completion',
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30s
});

/**
 * Circuit breaker para OpenAI Embeddings
 */
export const openaiEmbeddingCircuit = getCircuitBreaker({
  name: 'openai-embedding',
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30s
});

/**
 * Circuit breaker genérico para IA
 */
export const genericAiCircuit = getCircuitBreaker({
  name: 'generic-ai',
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 60000, // 1min
});

// ============================================
// HELPER: Backoff Exponencial
// ============================================

export function calculateBackoff(attempt: number, baseTimeout: number): number {
  // Backoff exponencial: 30s, 1m, 2m, 4m, 8m (máx: 10min)
  const backoff = Math.min(baseTimeout * Math.pow(2, attempt), 600000);
  return backoff;
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const CircuitBreakerService = {
  getCircuitBreaker,
  getAllCircuitBreakers,
  openaiCompletionCircuit,
  openaiEmbeddingCircuit,
  genericAiCircuit,
  calculateBackoff,
};

export default CircuitBreakerService;
