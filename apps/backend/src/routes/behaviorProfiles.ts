import { FastifyInstance } from 'fastify';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import {
  recomputeClientBehaviorProfiles,
  loadBehaviorProfiles,
} from '../services/behaviorClusteringService';

export default async function behaviorProfilesRoutes(app: FastifyInstance) {
  // ── POST /clients/:clientId/behavior-profiles/compute ─────────────────────
  // Triggers full recomputation of behavior clusters for a client.
  // Returns the newly computed profiles.

  app.post('/clients/:clientId/behavior-profiles/compute', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard],
  }, async (request, reply) => {
    const tenantId = (request as any).tenantId as string;
    const { clientId } = request.params as { clientId: string };

    try {
      const clusters = await recomputeClientBehaviorProfiles(tenantId, clientId);
      return reply.send({ success: true, data: clusters, count: clusters.length });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message ?? 'compute_failed' });
    }
  });

  // ── GET /clients/:clientId/behavior-profiles ───────────────────────────────
  // Returns stored behavior profiles (last computed).

  app.get('/clients/:clientId/behavior-profiles', {
    preHandler: [authGuard, requirePerm('clients:read'), tenantGuard],
  }, async (request, reply) => {
    const tenantId = (request as any).tenantId as string;
    const { clientId } = request.params as { clientId: string };

    const profiles = await loadBehaviorProfiles(tenantId, clientId);
    return reply.send({ success: true, data: profiles });
  });
}
