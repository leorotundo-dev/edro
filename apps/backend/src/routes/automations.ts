import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import {
  listWorkflowTriggers,
  createWorkflowTrigger,
  updateWorkflowTrigger,
  deleteWorkflowTrigger,
} from '../services/workflowAutomationService';

export default async function automationsRoutes(app: FastifyInstance) {
  // List all automation triggers for the tenant
  app.get('/automations', {
    preHandler: [authGuard, tenantGuard(), requirePerm('integrations:write')],
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;
    const triggers = await listWorkflowTriggers(tenantId);
    return { triggers };
  });

  // Create a new automation trigger
  app.post('/automations', {
    preHandler: [authGuard, tenantGuard(), requirePerm('integrations:write')],
    schema: {
      body: z.object({
        trigger_event: z.string().min(1),
        action_type: z.enum(['notify_team', 'notify_client', 'generate_copy']),
        config: z.record(z.any()).optional(),
      }),
    },
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;
    const body = request.body as { trigger_event: string; action_type: string; config?: Record<string, any> };
    const trigger = await createWorkflowTrigger(tenantId, body);
    return { trigger };
  });

  // Update (enable/disable or config)
  app.patch('/automations/:id', {
    preHandler: [authGuard, tenantGuard(), requirePerm('integrations:write')],
    schema: {
      body: z.object({
        enabled: z.boolean().optional(),
        config: z.record(z.any()).optional(),
      }),
    },
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;
    const { id } = request.params as { id: string };
    const body = request.body as { enabled?: boolean; config?: Record<string, any> };
    const trigger = await updateWorkflowTrigger(id, tenantId, body);
    return { trigger };
  });

  // Delete
  app.delete('/automations/:id', {
    preHandler: [authGuard, tenantGuard(), requirePerm('integrations:write')],
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;
    const { id } = request.params as { id: string };
    await deleteWorkflowTrigger(id, tenantId);
    return { success: true };
  });
}
