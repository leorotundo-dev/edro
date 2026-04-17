import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import {
  addCreativeAsset,
  addCreativeVersion,
  getCreativeSessionContext,
  getCreativeSessionContextBySessionId,
  markReadyToPublish,
  openCreativeSession,
  resolveCreativeReview,
  saveCanvasDraft,
  saveCreativeBrief,
  selectCreativeAsset,
  selectCreativeVersion,
  sendCreativeReview,
  updateCreativeStage,
  updateCreativeSessionMetadata,
} from '../services/jobs/creativeSessionService';
import {
  addCreativeAssetSchema,
  addCreativeVersionSchema,
  canvasSaveDraftSchema,
  openCreativeSessionSchema,
  readyToPublishSchema,
  resolveCreativeReviewSchema,
  saveBriefSchema,
  selectCreativeAssetSchema,
  selectCreativeVersionSchema,
  sendCreativeReviewSchema,
  studioHandoffAcceptSchema,
  studioHandoffExportedSchema,
  studioHandoffListQuerySchema,
  studioHandoffReturnSchema,
  studioHandoffSentSchema,
  updateCreativeStageSchema,
  updateCreativeMetadataSchema,
} from './schemas/creativeWorkflowSchemas';
import { listStudioHandoffs, transitionStudioHandoffState } from '../services/studioHandoffService';

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

const sessionParamsSchema = z.object({
  id: z.string().uuid(),
});

export default async function studioWorkflowRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.post('/jobs/:id/creative-session/open', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = idParamsSchema.parse(request.params || {});
    const body = openCreativeSessionSchema.parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const data = await openCreativeSession(tenantId, id, userId, body);
    return { success: true, data };
  });

  app.get('/jobs/:id/creative-session', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = idParamsSchema.parse(request.params || {});
    const tenantId = String(request.user?.tenant_id || '');
    const data = await getCreativeSessionContext(tenantId, id);
    if (!data) return reply.code(404).send({ success: false, error: 'Sessão criativa não encontrada.' });
    return { success: true, data };
  });

  app.get('/creative-sessions/:id', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const tenantId = String(request.user?.tenant_id || '');
    const data = await getCreativeSessionContextBySessionId(tenantId, id);
    if (!data) return reply.code(404).send({ success: false, error: 'Sessão criativa não encontrada.' });
    return { success: true, data };
  });

  app.get('/studio/handoffs', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const query = studioHandoffListQuerySchema.parse(request.query || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const data = await listStudioHandoffs({
      tenantId,
      userId,
      role: query.role || null,
      mine: Boolean(query.mine),
      status: query.status || null,
      overdue: typeof query.overdue === 'boolean' ? query.overdue : undefined,
      clientId: query.client_id || null,
      assignedUserId: query.assigned_user_id || null,
      limit: query.limit || 100,
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/stage', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = updateCreativeStageSchema.parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const data = await updateCreativeStage(tenantId, id, userId, {
      current_stage: body.current_stage,
      reason: body.reason || null,
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/update-metadata', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = updateCreativeMetadataSchema.extend({ job_id: z.string().uuid() }).parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const { job_id, ...input } = body;
    const data = await updateCreativeSessionMetadata(tenantId, id, job_id, userId, {
      metadata: input.metadata || {},
      reason: input.reason || null,
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/save-brief', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = saveBriefSchema.parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const data = await saveCreativeBrief(tenantId, id, userId, {
      briefing_id: body.briefing_id || null,
      title: body.title,
      objective: body.objective,
      message: body.message,
      tone: body.tone,
      event: body.event || null,
      date: body.date || null,
      notes: body.notes || null,
      platforms: body.platforms || [],
      metadata: body.metadata || {},
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/add-version', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = addCreativeVersionSchema.parse(request.body || {});
    const jobId = String(request.body?.job_id || '');
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const data = await addCreativeVersion(tenantId, id, jobId, userId, {
      version_type: body.version_type,
      source: body.source,
      payload: body.payload,
      select: body.select,
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/select-version', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = selectCreativeVersionSchema.extend({ job_id: z.string().uuid() }).parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const data = await selectCreativeVersion(tenantId, id, body.job_id, body.version_id);
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/add-asset', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = addCreativeAssetSchema.extend({ job_id: z.string().uuid() }).parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const { job_id, ...input } = body;
    const data = await addCreativeAsset(tenantId, id, job_id, userId, {
      asset_type: input.asset_type,
      source: input.source,
      file_url: input.file_url,
      thumb_url: input.thumb_url || null,
      metadata: input.metadata || {},
      select: input.select,
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/select-asset', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = selectCreativeAssetSchema.extend({ job_id: z.string().uuid() }).parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const data = await selectCreativeAsset(tenantId, id, body.job_id, body.asset_id);
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/send-review', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = sendCreativeReviewSchema.extend({ job_id: z.string().uuid() }).parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const { job_id, ...input } = body;
    const data = await sendCreativeReview(tenantId, id, job_id, userId, {
      review_type: input.review_type,
      payload: input.payload || {},
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/resolve-review', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = resolveCreativeReviewSchema.extend({ job_id: z.string().uuid() }).parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const { job_id, ...input } = body;
    const data = await resolveCreativeReview(tenantId, id, job_id, userId, {
      review_id: input.review_id,
      status: input.status,
      feedback: input.feedback || {},
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/ready-to-publish', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = readyToPublishSchema.extend({ job_id: z.string().uuid() }).parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const { job_id, ...input } = body;
    const data = await markReadyToPublish(tenantId, id, job_id, userId, input);
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/handoff/accept', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = studioHandoffAcceptSchema.parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const data = await transitionStudioHandoffState({
      tenantId,
      sessionId: id,
      jobId: body.job_id,
      userId,
      action: 'accept',
      note: body.note || null,
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/handoff/return', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = studioHandoffReturnSchema.parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const data = await transitionStudioHandoffState({
      tenantId,
      sessionId: id,
      jobId: body.job_id,
      userId,
      action: 'return_for_changes',
      note: body.note || null,
      nextActor: body.next_actor || null,
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/handoff/exported', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = studioHandoffExportedSchema.parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const data = await transitionStudioHandoffState({
      tenantId,
      sessionId: id,
      jobId: body.job_id,
      userId,
      action: 'mark_exported',
      note: body.note || null,
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/handoff/sent', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = studioHandoffSentSchema.parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const data = await transitionStudioHandoffState({
      tenantId,
      sessionId: id,
      jobId: body.job_id,
      userId,
      action: 'mark_sent',
      note: body.note || null,
    });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/canvas/open', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const tenantId = String(request.user?.tenant_id || '');
    const data = await getCreativeSessionContextBySessionId(tenantId, id);
    if (!data) return reply.code(404).send({ success: false, error: 'Sessão criativa não encontrada.' });
    return { success: true, data };
  });

  app.post('/creative-sessions/:id/canvas/save-draft', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const { id } = sessionParamsSchema.parse(request.params || {});
    const body = canvasSaveDraftSchema.extend({ job_id: z.string().uuid() }).parse(request.body || {});
    const tenantId = String(request.user?.tenant_id || '');
    const userId = String(request.user?.id || '') || null;
    const { job_id, ...input } = body;
    const data = await saveCanvasDraft(tenantId, id, job_id, userId, {
      snapshot: input.snapshot,
      draft_asset: input.draft_asset
        ? {
            asset_type: input.draft_asset.asset_type,
            file_url: input.draft_asset.file_url,
            thumb_url: input.draft_asset.thumb_url || null,
            metadata: input.draft_asset.metadata || {},
          }
        : undefined,
    });
    return { success: true, data };
  });
}
