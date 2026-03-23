import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { hasClientPerm, requireClientPerm } from '../auth/clientPerms';
import {
  recomputeClientLearningRules,
  loadLearningRules,
} from '../services/learningEngine';
import { query } from '../db';

export default async function learningRulesRoutes(app: FastifyInstance) {
  // ── POST /clients/:clientId/learning-rules/compute ─────────────────────────
  // Triggers full recomputation of learning rules for a client.
  // Returns newly generated rules sorted by uplift_value DESC.

  app.post('/clients/:clientId/learning-rules/compute', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard(), requireClientPerm('write')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
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
    preHandler: [authGuard, requirePerm('clients:read'), tenantGuard(), requireClientPerm('read')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const { clientId } = request.params as { clientId: string };

    const rules = await loadLearningRules(tenantId, clientId);
    return reply.send({ success: true, data: rules });
  });

  // ── GET /clients/:clientId/directives ──────────────────────────────────────
  // Returns all human-confirmed permanent directives for a client.

  app.get('/clients/:clientId/directives', {
    preHandler: [authGuard, requirePerm('clients:read'), tenantGuard(), requireClientPerm('read')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const { clientId } = request.params as { clientId: string };

    const { rows } = await query(
      `SELECT id, directive_type, directive, source, confirmed_by, created_at
         FROM client_directives
        WHERE tenant_id = $1 AND client_id = $2
        ORDER BY created_at DESC`,
      [tenantId, clientId],
    );
    return reply.send({ success: true, data: rows });
  });

  // ── POST /clients/:clientId/directives ─────────────────────────────────────
  // Manually add a permanent directive (direct from UI, not from WhatsApp/meeting).

  app.post('/clients/:clientId/directives', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard(), requireClientPerm('write')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const { clientId } = request.params as { clientId: string };
    const body = z.object({
      directive: z.string().min(3).max(500),
      directive_type: z.enum(['boost', 'avoid']),
    }).parse(request.body);

    const { rows } = await query(
      `INSERT INTO client_directives (tenant_id, client_id, source, directive_type, directive, confirmed_by)
       VALUES ($1, $2, 'manual', $3, $4, $5)
       ON CONFLICT (tenant_id, client_id, directive) DO NOTHING
       RETURNING id, directive_type, directive, source, confirmed_by, created_at`,
      [tenantId, clientId, body.directive_type, body.directive, (request.user as any)?.email ?? 'manual'],
    );
    return reply.send({ success: true, data: rows[0] ?? null });
  });

  // ── DELETE /clients/directives/:directiveId ────────────────────────────────
  // Remove a permanent directive.

  app.delete('/clients/directives/:directiveId', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const user = request.user as { sub?: string; role?: string } | undefined;
    const { directiveId } = z.object({ directiveId: z.string().uuid() }).parse(request.params);

    const { rows } = await query<{ client_id: string }>(
      `SELECT client_id FROM client_directives WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [directiveId, tenantId],
    );
    const clientId = rows[0]?.client_id;
    if (!clientId) {
      return reply.status(404).send({ error: 'directive_not_found' });
    }

    const allowed = await hasClientPerm({
      tenantId,
      userId: user?.sub || '',
      role: user?.role,
      clientId,
      perm: 'write',
    });
    if (!allowed) {
      return reply.status(403).send({ error: 'client_forbidden', perm: 'write', client_id: clientId });
    }

    await query(
      `DELETE FROM client_directives WHERE id = $1 AND tenant_id = $2`,
      [directiveId, tenantId],
    );
    return reply.send({ success: true });
  });
}
