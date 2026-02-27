import { FastifyInstance } from 'fastify';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import {
  recomputeClientLearningRules,
  loadLearningRules,
} from '../services/learningEngine';

export default async function learningRulesRoutes(app: FastifyInstance) {
  // ── POST /clients/:clientId/learning-rules/compute ─────────────────────────
  // Triggers full recomputation of learning rules for a client.
  // Returns newly generated rules sorted by uplift_value DESC.

  app.post('/clients/:clientId/learning-rules/compute', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard],
  }, async (request, reply) => {
    const tenantId = (request as any).tenantId as string;
    const { clientId } = request.params as { clientId: string };

    try {
      const rules = await recomputeClientLearningRules(tenantId, clientId);
      return reply.send({ success: true, data: rules, count: rules.length });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message ?? 'compute_failed' });
    }
  });

  // ── GET /clients/:clientId/learning-rules ──────────────────────────────────
  // Returns stored active learning rules (last computed).

  app.get('/clients/:clientId/learning-rules', {
    preHandler: [authGuard, requirePerm('clients:read'), tenantGuard],
  }, async (request, reply) => {
    const tenantId = (request as any).tenantId as string;
    const { clientId } = request.params as { clientId: string };

    const rules = await loadLearningRules(tenantId, clientId);
    return reply.send({ success: true, data: rules });
  });
}
