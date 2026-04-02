import type { FastifyInstance } from 'fastify';
import { authGuard, requirePerm } from '../auth/rbac';
import { requireClientPerm } from '../auth/clientPerms';
import { tenantGuard } from '../auth/tenantGuard';
import {
  approveBoardPresentation,
  createOrRefreshBoardPresentationDraft,
  exportBoardPresentationPptx,
  generateBoardPresentationAiDraft,
  getBoardPresentationDetail,
  listBoardPresentations,
  runBoardPresentationPreflight,
  updateBoardPresentationManualInputs,
  updateBoardPresentationSlides,
} from '../services/boardPresentationService';

function handleBoardPresentationError(reply: any, error: any) {
  if (error?.message === 'board_presentation_blocked') {
    return reply.status(422).send({
      error: 'board_presentation_blocked',
      readiness: error?.readiness ?? null,
    });
  }
  if (error?.message === 'manual_inputs_incomplete') {
    return reply.status(422).send({ error: 'manual_inputs_incomplete' });
  }
  if (error?.message === 'client_not_found') {
    return reply.status(404).send({ error: 'client_not_found' });
  }
  if (error?.message === 'presentation_not_found') {
    return reply.status(404).send({ error: 'presentation_not_found' });
  }
  if (error?.message === 'invalid_slide_count') {
    return reply.status(422).send({ error: 'invalid_slide_count' });
  }
  throw error;
}

export default async function boardPresentationsRoutes(app: FastifyInstance) {
  const guards = [authGuard, tenantGuard(), requirePerm('exports:read'), requireClientPerm('read')];

  app.get('/clients/:clientId/board-presentations', {
    preHandler: guards,
  }, async (request: any, reply: any) => {
    try {
      const tenantId = request.user?.tenant_id as string;
      const { clientId } = request.params as { clientId: string };
      const { period_month: periodMonth } = request.query as { period_month?: string };
      const presentations = await listBoardPresentations({ tenantId, clientId, periodMonth });
      return reply.send({ presentations });
    } catch (error) {
      return handleBoardPresentationError(reply, error);
    }
  });

  app.post('/clients/:clientId/board-presentations/preflight', {
    preHandler: guards,
  }, async (request: any, reply: any) => {
    try {
      const tenantId = request.user?.tenant_id as string;
      const { clientId } = request.params as { clientId: string };
      const { period_month: periodMonth } = request.body as { period_month: string };
      const readiness = await runBoardPresentationPreflight({ tenantId, clientId, periodMonth });
      return reply.send({ readiness });
    } catch (error) {
      return handleBoardPresentationError(reply, error);
    }
  });

  app.post('/clients/:clientId/board-presentations/draft', {
    preHandler: guards,
  }, async (request: any, reply: any) => {
    try {
      const tenantId = request.user?.tenant_id as string;
      const userId = request.user?.sub as string | undefined;
      const { clientId } = request.params as { clientId: string };
      const body = request.body as { period_month: string; manual_inputs?: Record<string, string> };
      const presentation = await createOrRefreshBoardPresentationDraft({
        tenantId,
        clientId,
        periodMonth: body.period_month,
        userId,
        manualInputs: body.manual_inputs,
      });
      return reply.send({ presentation });
    } catch (error) {
      return handleBoardPresentationError(reply, error);
    }
  });

  app.get('/clients/:clientId/board-presentations/:presentationId', {
    preHandler: guards,
  }, async (request: any, reply: any) => {
    try {
      const tenantId = request.user?.tenant_id as string;
      const { clientId, presentationId } = request.params as { clientId: string; presentationId: string };
      const presentation = await getBoardPresentationDetail({ tenantId, clientId, presentationId });
      return reply.send({ presentation });
    } catch (error) {
      return handleBoardPresentationError(reply, error);
    }
  });

  app.patch('/clients/:clientId/board-presentations/:presentationId/manual-inputs', {
    preHandler: guards,
  }, async (request: any, reply: any) => {
    try {
      const tenantId = request.user?.tenant_id as string;
      const userId = request.user?.sub as string | undefined;
      const { clientId, presentationId } = request.params as { clientId: string; presentationId: string };
      const { manual_inputs: manualInputs } = request.body as { manual_inputs: Record<string, string> };
      const presentation = await updateBoardPresentationManualInputs({
        tenantId,
        clientId,
        presentationId,
        manualInputs,
        userId,
      });
      return reply.send({ presentation });
    } catch (error) {
      return handleBoardPresentationError(reply, error);
    }
  });

  app.post('/clients/:clientId/board-presentations/:presentationId/generate-ai-draft', {
    preHandler: guards,
  }, async (request: any, reply: any) => {
    try {
      const tenantId = request.user?.tenant_id as string;
      const userId = request.user?.sub as string | undefined;
      const { clientId, presentationId } = request.params as { clientId: string; presentationId: string };
      const presentation = await generateBoardPresentationAiDraft({
        tenantId,
        clientId,
        presentationId,
        userId,
      });
      return reply.send({ presentation });
    } catch (error) {
      return handleBoardPresentationError(reply, error);
    }
  });

  app.patch('/clients/:clientId/board-presentations/:presentationId/slides', {
    preHandler: guards,
  }, async (request: any, reply: any) => {
    try {
      const tenantId = request.user?.tenant_id as string;
      const userId = request.user?.sub as string | undefined;
      const { clientId, presentationId } = request.params as { clientId: string; presentationId: string };
      const { slides } = request.body as { slides: any[] };
      const presentation = await updateBoardPresentationSlides({
        tenantId,
        clientId,
        presentationId,
        slides,
        userId,
      });
      return reply.send({ presentation });
    } catch (error) {
      return handleBoardPresentationError(reply, error);
    }
  });

  app.post('/clients/:clientId/board-presentations/:presentationId/approve', {
    preHandler: guards,
  }, async (request: any, reply: any) => {
    try {
      const tenantId = request.user?.tenant_id as string;
      const userId = request.user?.sub as string | undefined;
      const { clientId, presentationId } = request.params as { clientId: string; presentationId: string };
      const presentation = await approveBoardPresentation({
        tenantId,
        clientId,
        presentationId,
        userId,
      });
      return reply.send({ presentation });
    } catch (error) {
      return handleBoardPresentationError(reply, error);
    }
  });

  app.post('/clients/:clientId/board-presentations/:presentationId/export-pptx', {
    preHandler: guards,
  }, async (request: any, reply: any) => {
    try {
      const tenantId = request.user?.tenant_id as string;
      const userId = request.user?.sub as string | undefined;
      const { clientId, presentationId } = request.params as { clientId: string; presentationId: string };
      const exported = await exportBoardPresentationPptx({
        tenantId,
        clientId,
        presentationId,
        userId,
      });
      reply.header('Content-Type', exported.contentType);
      reply.header('Content-Disposition', `attachment; filename="${exported.fileName}"`);
      reply.header('Content-Length', exported.buffer.length);
      return reply.send(exported.buffer);
    } catch (error) {
      return handleBoardPresentationError(reply, error);
    }
  });
}
