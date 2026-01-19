/**
 * Sentry Service
 * 
 * Integração com Sentry para error tracking
 */

import * as Sentry from '@sentry/node';
import { FastifyRequest } from 'fastify';

// ============================================
// INITIALIZATION
// ============================================

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.log('[sentry] Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Release tracking
    release: process.env.npm_package_version || '1.0.0',
    
    // Integrations
    integrations: [
      // Performance monitoring
      new Sentry.Integrations.Http({ tracing: true }),
    ],

    // Before sending
    beforeSend(event, hint) {
      // Filtrar erros que não queremos enviar
      if (event.exception) {
        const error = hint.originalException as Error;
        
        // Não enviar erros de validação (400)
        if (error.message?.includes('validation') || error.message?.includes('invalid')) {
          return null;
        }
      }

      return event;
    },
  });

  console.log('[sentry] ✅ Sentry initialized');
}

// ============================================
// ERROR CAPTURE
// ============================================

export function captureError(error: Error, context?: Record<string, any>) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureException(error, {
    extra: context,
  });

  console.error('[sentry] Error captured:', error.message);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureMessage(message, level);
}

// ============================================
// REQUEST CONTEXT
// ============================================

export function captureRequestError(error: Error, request: FastifyRequest) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.withScope(scope => {
    // Adicionar contexto da request
    scope.setContext('request', {
      url: request.url,
      method: request.method,
      headers: sanitizeHeaders(request.headers),
      query: request.query,
      ip: request.ip,
    });

    // Adicionar usuário se autenticado
    if ((request as any).user) {
      scope.setUser({
        id: (request as any).user.id,
        email: (request as any).user.email,
      });
    }

    Sentry.captureException(error);
  });

  console.error('[sentry] Request error captured:', error.message);
}

// ============================================
// PERFORMANCE TRACKING
// ============================================

export function startTransaction(name: string, op: string = 'http.request') {
  if (!process.env.SENTRY_DSN) return null;

  return Sentry.startTransaction({
    name,
    op,
  });
}

export function trackOperation(name: string, operation: () => Promise<any>) {
  if (!process.env.SENTRY_DSN) {
    return operation();
  }

  const transaction = startTransaction(name);

  return operation()
    .then(result => {
      transaction?.finish();
      return result;
    })
    .catch(error => {
      transaction?.setStatus('internal_error');
      transaction?.finish();
      throw error;
    });
}

// ============================================
// BREADCRUMBS
// ============================================

export function addBreadcrumb(message: string, data?: Record<string, any>) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}

// ============================================
// TAGS & CONTEXT
// ============================================

export function setTag(key: string, value: string) {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setTag(key, value);
}

export function setContext(name: string, context: Record<string, any>) {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setContext(name, context);
}

export function setUser(user: { id: string; email?: string; username?: string }) {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setUser(user);
}

// ============================================
// HELPERS
// ============================================

function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized = { ...headers };
  
  // Remover headers sensíveis
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];

  return sanitized;
}

// ============================================
// FLUSH & CLOSE
// ============================================

export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  if (!process.env.SENTRY_DSN) return true;

  console.log('[sentry] Flushing events...');
  return await Sentry.flush(timeout);
}

export async function closeSentry(): Promise<void> {
  if (!process.env.SENTRY_DSN) return;

  console.log('[sentry] Closing...');
  await Sentry.close(2000);
}

// ============================================
// EXPORTAÇÃO
// ============================================

export const SentryService = {
  init: initSentry,
  captureError,
  captureMessage,
  captureRequestError,
  startTransaction,
  trackOperation,
  addBreadcrumb,
  setTag,
  setContext,
  setUser,
  flush: flushSentry,
  close: closeSentry,
};

export default SentryService;
