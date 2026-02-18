import { FastifyInstance } from 'fastify';
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
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['trigger_event', 'action_type'],
        properties: {
          trigger_event: { type: 'string', minLength: 1 },
          action_type: {
            type: 'string',
            enum: ['notify_team', 'notify_client', 'generate_copy'],
          },
          config: { type: 'object', additionalProperties: true },
        },
      },
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
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          enabled: { type: 'boolean' },
          config: { type: 'object', additionalProperties: true },
        },
      },
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
