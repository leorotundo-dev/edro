import { AsyncLocalStorage } from 'async_hooks';
import type { FastifyReply, FastifyRequest } from 'fastify';

export type RequestContext = {
  requestId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userId?: string | null;
  plan?: string | null;
  role?: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

function buildBaseContext(req: FastifyRequest): RequestContext {
  return {
    requestId: String((req as any).id || ''),
    path: req.url,
    method: req.method,
    ip: req.ip,
  };
}

export function requestContextHook(
  req: FastifyRequest,
  _reply: FastifyReply,
  done: (err?: Error) => void
) {
  const baseContext = buildBaseContext(req);
  storage.run(baseContext, done);
}

export function getRequestContext(): RequestContext {
  return storage.getStore() || {};
}

export function setRequestContext(patch: Partial<RequestContext>) {
  const store = storage.getStore();
  if (!store) return;
  Object.assign(store, patch);
}

export const RequestContextService = {
  requestContextHook,
  getRequestContext,
  setRequestContext,
};

export default RequestContextService;
