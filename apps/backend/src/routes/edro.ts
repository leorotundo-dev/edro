import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generateCopyWithValidation, generateCopy, getOrchestratorInfo, TaskType } from '../services/ai/copyService';
import {
  createBriefing,
  createBriefingStages,
  createCopyVersion,
  createNotification,
  createTask,
  ensureBriefingStages,
  getBriefingById,
  getOrCreateClientByName,
  listBriefings,
  listBriefingStages,
  listCopyVersions,
  listTasks,
  updateBriefingStageStatus,
  updateBriefingStatus,
} from '../repositories/edroBriefingRepository';
import { dispatchNotification } from '../services/notificationService';
import {
  WORKFLOW_STAGES,
  WorkflowStage,
  getNextStage,
  getStageIndex,
  isWorkflowStage,
} from '../utils/workflow';
import { env } from '../env';

const DEFAULT_TRAFFIC_CHANNELS = ['whatsapp', 'email', 'portal'];
const DEFAULT_DESIGN_CHANNELS = ['whatsapp', 'email'];

type RequestUser = {
  sub?: string;
  id?: string;
  email?: string;
  role?: string;
};

function resolveUser(request: any) {
  const user = request.user as RequestUser | undefined;
  return {
    id: user?.id || user?.sub || null,
    email: user?.email || null,
    role: user?.role || null,
  };
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildCopyPrompt(params: {
  briefing: {
    title: string;
    client_name?: string | null;
    payload: Record<string, any>;
  };
  language: string;
  count: number;
  instructions?: string | null;
}): string {
  const languageLabel = params.language === 'es' ? 'espanhol' : 'portugues';
  const payloadText = JSON.stringify(params.briefing.payload || {}, null, 2);

  return [
    'Voce e um redator para agencia de propaganda.',
    `Crie ${params.count} copys para pecas criativas.`,
    `Idioma: ${languageLabel}.`,
    'Formato: lista numerada. Cada item deve ter titulo curto, corpo e CTA.',
    `Cliente: ${params.briefing.client_name || 'nao informado'}.`,
    `Titulo do briefing: ${params.briefing.title}.`,
    'Detalhes do briefing (JSON):',
    payloadText,
    params.instructions ? `Instrucoes extras: ${params.instructions}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function ensureStageUnlocked(stage: WorkflowStage, stages: { stage: WorkflowStage; status: string }[]) {
  const stageIndex = getStageIndex(stage);
  if (stageIndex <= 0) return { ok: true, missing: [] as string[] };

  const missing = stages
    .filter((item) => getStageIndex(item.stage) < stageIndex && item.status !== 'done')
    .map((item) => item.stage);

  return { ok: missing.length === 0, missing };
}

async function refreshBriefingStatus(briefingId: string) {
  const stages = await listBriefingStages(briefingId);
  const inProgress = stages.find((stage) => stage.status === 'in_progress');
  const pending = stages.find((stage) => stage.status !== 'done');
  const nextStage = inProgress?.stage || pending?.stage || 'done';
  await updateBriefingStatus(briefingId, nextStage);
  return { stages, currentStage: nextStage };
}

async function promoteStageIfPending(
  briefingId: string,
  stage: WorkflowStage,
  updatedBy?: string | null
) {
  const stages = await listBriefingStages(briefingId);
  const target = stages.find((item) => item.stage === stage);
  if (target && target.status === 'pending') {
    await updateBriefingStageStatus({
      briefingId,
      stage,
      status: 'in_progress',
      updatedBy: updatedBy ?? null,
    });
  }
}

async function createTaskNotifications(params: {
  briefingId: string;
  taskId: string;
  channels: string[];
  recipient: string;
  payload: Record<string, any>;
}) {
  const notifications = [];

  for (const channel of params.channels) {
    const notification = await createNotification({
      briefingId: params.briefingId,
      taskId: params.taskId,
      channel,
      recipient: params.recipient,
      payload: params.payload,
    });
    notifications.push(notification);
    await dispatchNotification({
      id: notification.id,
      channel: notification.channel,
      recipient: notification.recipient,
      payload: notification.payload ?? params.payload,
    });
  }

  return notifications;
}

export default async function edroRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ success: false, error: 'Nao autorizado.' });
    }
  });

  app.get('/edro/briefings', async (request, reply) => {
    const querySchema = z.object({
      status: z.string().optional(),
      clientId: z.string().uuid().optional(),
      limit: z.string().optional(),
      offset: z.string().optional(),
    });

    const query = querySchema.parse(request.query);
    const limit = query.limit ? Math.min(parseInt(query.limit, 10) || 50, 200) : 50;
    const offset = query.offset ? parseInt(query.offset, 10) || 0 : 0;

    const briefings = await listBriefings({
      status: query.status,
      clientId: query.clientId,
      limit,
      offset,
    });

    return reply.send({ success: true, data: briefings });
  });

  app.post('/edro/briefings', async (request, reply) => {
    const bodySchema = z
      .object({
        client_id: z.string().uuid().optional(),
        client_name: z.string().min(2).optional(),
        client_segment: z.string().optional(),
        client_timezone: z.string().optional(),
        title: z.string().min(3),
        payload: z.record(z.any()).optional(),
        created_by: z.string().optional(),
        traffic_owner: z.string().optional(),
        meeting_url: z.string().optional(),
        due_at: z.string().optional(),
        source: z.string().optional(),
        notify_traffic: z.boolean().optional(),
        traffic_channels: z.array(z.string()).optional(),
        traffic_recipient: z.string().optional(),
      })
      .refine((data) => data.client_id || data.client_name, {
        message: 'client_id or client_name is required',
        path: ['client_id'],
      });

    const body = bodySchema.parse(request.body);
    const user = resolveUser(request);

    const dueAt = parseDate(body.due_at);
    if (body.due_at && !dueAt) {
      return reply.status(400).send({ success: false, error: 'due_at invalido' });
    }

    let clientId = body.client_id || null;
    if (!clientId && body.client_name) {
      const client = await getOrCreateClientByName({
        name: body.client_name,
        segment: body.client_segment ?? null,
        timezone: body.client_timezone ?? null,
      });
      clientId = client.id;
    }

    const briefing = await createBriefing({
      clientId,
      title: body.title,
      status: 'briefing',
      payload: body.payload ?? {},
      createdBy: body.created_by ?? user.email,
      trafficOwner: body.traffic_owner ?? null,
      meetingUrl: body.meeting_url ?? null,
      dueAt: dueAt ?? null,
      source: body.source ?? 'manual',
    });

    const stages = await createBriefingStages(briefing.id, user.email);

    const shouldNotifyTraffic =
      body.notify_traffic ?? Boolean(body.traffic_owner || body.traffic_recipient);

    let trafficTask = null;
    let trafficNotifications: any[] = [];

    if (shouldNotifyTraffic) {
      const trafficRecipient = body.traffic_recipient || body.traffic_owner;
      if (!trafficRecipient) {
        return reply.status(400).send({
          success: false,
          error: 'traffic_recipient or traffic_owner is required to notify traffic',
        });
      }

      const trafficChannels = body.traffic_channels ?? DEFAULT_TRAFFIC_CHANNELS;
      trafficTask = await createTask({
        briefingId: briefing.id,
        type: 'traffic',
        assignedTo: trafficRecipient,
        channels: trafficChannels,
        payload: {
          briefingId: briefing.id,
          title: briefing.title,
          client: briefing.client_name || body.client_name || null,
          status: briefing.status,
        },
      });

      trafficNotifications = await createTaskNotifications({
        briefingId: briefing.id,
        taskId: trafficTask.id,
        channels: trafficChannels,
        recipient: trafficRecipient,
        payload: {
          briefing,
          event: 'briefing_created',
        },
      });
    }

    return reply.status(201).send({
      success: true,
      data: {
        briefing,
        stages,
        trafficTask,
        trafficNotifications,
      },
    });
  });

  app.get('/edro/briefings/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });

    const params = paramsSchema.parse(request.params);
    const briefing = await getBriefingById(params.id);

    if (!briefing) {
      return reply.status(404).send({ success: false, error: 'briefing nao encontrado' });
    }

    const stages = await ensureBriefingStages(briefing.id);
    const copies = await listCopyVersions(briefing.id);
    const tasks = await listTasks(briefing.id);

    return reply.send({
      success: true,
      data: {
        briefing,
        stages,
        copies,
        tasks,
      },
    });
  });

  app.get('/edro/briefings/:id/stages', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const stages = await ensureBriefingStages(params.id);
    return reply.send({ success: true, data: stages });
  });

  app.patch('/edro/briefings/:id/stages/:stage', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
      stage: z.string(),
    });

    const bodySchema = z.object({
      status: z.enum(['in_progress', 'done']),
      metadata: z.record(z.any()).optional(),
    });

    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    if (!isWorkflowStage(params.stage)) {
      return reply.status(400).send({ success: false, error: 'stage invalido' });
    }

    const user = resolveUser(request);
    const stages = await ensureBriefingStages(params.id, user.email);
    const unlock = ensureStageUnlocked(params.stage, stages as any);

    if (!unlock.ok) {
      return reply.status(409).send({
        success: false,
        error: 'Etapa anterior pendente.',
        missing: unlock.missing,
      });
    }

    if (params.stage === 'aprovacao' && body.status === 'done' && user.role !== 'gestor') {
      return reply.status(403).send({
        success: false,
        error: 'Aprovacao requer perfil gestor.',
      });
    }

    const updatedStage = await updateBriefingStageStatus({
      briefingId: params.id,
      stage: params.stage,
      status: body.status,
      updatedBy: user.email,
      metadata: body.metadata ?? null,
    });

    if (!updatedStage) {
      return reply.status(404).send({ success: false, error: 'stage nao encontrado' });
    }

    if (body.status === 'done') {
      const nextStage = getNextStage(params.stage);
      if (nextStage) {
        await promoteStageIfPending(params.id, nextStage, user.email);
      }

      if (params.stage === 'iclips_in' || params.stage === 'iclips_out') {
        const briefing = await getBriefingById(params.id);
        const recipient = env.EDRO_ICLIPS_NOTIFY_EMAIL || briefing?.traffic_owner || user.email;
        if (recipient) {
          const notification = await createNotification({
            briefingId: params.id,
            channel: 'iclips',
            recipient,
            payload: {
              briefing,
              event: params.stage,
            },
          });
          await dispatchNotification({
            id: notification.id,
            channel: notification.channel,
            recipient: notification.recipient,
            payload: notification.payload ?? {},
          });
        }
      }
    }

    const refreshed = await refreshBriefingStatus(params.id);

    return reply.send({
      success: true,
      data: {
        stage: updatedStage,
        currentStage: refreshed.currentStage,
        stages: refreshed.stages,
      },
    });
  });

  app.post('/edro/briefings/:id/copy', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      language: z.string().default('pt'),
      count: z.number().int().min(1).max(20).optional(),
      prompt: z.string().optional(),
      instructions: z.string().optional(),
      output: z.string().optional(),
      model: z.string().optional(),
      created_by: z.string().optional(),
      notify_traffic: z.boolean().optional(),
      traffic_channels: z.array(z.string()).optional(),
      traffic_recipient: z.string().optional(),
    });

    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);
    const briefing = await getBriefingById(params.id);

    if (!briefing) {
      return reply.status(404).send({ success: false, error: 'briefing nao encontrado' });
    }

    const user = resolveUser(request);
    const stages = await ensureBriefingStages(briefing.id, user.email);
    const unlock = ensureStageUnlocked('copy_ia', stages as any);

    if (!unlock.ok) {
      return reply.status(409).send({
        success: false,
        error: 'Etapas anteriores pendentes.',
        missing: unlock.missing,
      });
    }

    const count = body.count ?? 10;

    let output = body.output;
    let prompt = body.prompt;
    let model = body.model ?? process.env.OPENAI_MODEL ?? null;
    let payload: Record<string, any> | null = null;

    if (!output) {
      prompt = prompt ||
        buildCopyPrompt({
          briefing,
          language: body.language,
          count,
          instructions: body.instructions ?? null,
        });

      try {
        const result = await generateCopyWithValidation({
          prompt,
          temperature: 0.6,
          maxTokens: 1500,
        });
        output = result.output;
        model = result.model;
        payload = result.payload;
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: 'Erro ao gerar copy com IA.',
        });
      }
    }

    const copy = await createCopyVersion({
      briefingId: briefing.id,
      language: body.language,
      model,
      prompt: prompt ?? null,
      output,
      payload,
      createdBy: body.created_by ?? user.email,
    });

    await updateBriefingStageStatus({
      briefingId: briefing.id,
      stage: 'copy_ia',
      status: 'done',
      updatedBy: user.email,
      metadata: { copyVersionId: copy.id },
    });

    await promoteStageIfPending(briefing.id, 'aprovacao', user.email);

    await refreshBriefingStatus(briefing.id);

    const shouldNotifyTraffic = body.notify_traffic ?? true;
    let trafficTask = null;
    let trafficNotifications: any[] = [];

    if (shouldNotifyTraffic) {
      const trafficRecipient = body.traffic_recipient || briefing.traffic_owner;
      if (!trafficRecipient) {
        return reply.status(400).send({
          success: false,
          error: 'traffic_recipient or briefing.traffic_owner is required to notify traffic',
        });
      }

      const trafficChannels = body.traffic_channels ?? DEFAULT_TRAFFIC_CHANNELS;
      trafficTask = await createTask({
        briefingId: briefing.id,
        type: 'traffic_copy',
        assignedTo: trafficRecipient,
        channels: trafficChannels,
        payload: {
          briefingId: briefing.id,
          copyVersionId: copy.id,
          status: 'copy_ready',
        },
      });

      trafficNotifications = await createTaskNotifications({
        briefingId: briefing.id,
        taskId: trafficTask.id,
        channels: trafficChannels,
        recipient: trafficRecipient,
        payload: {
          briefing,
          copy,
          event: 'copy_ready',
        },
      });
    }

    return reply.status(201).send({
      success: true,
      data: {
        copy,
        trafficTask,
        trafficNotifications,
      },
    });
  });

  app.post('/edro/briefings/:id/assign-da', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      assigned_to: z.string().min(1),
      channels: z.array(z.string()).optional(),
      recipients: z.record(z.string()).optional(),
      message: z.string().optional(),
      copy_version_id: z.string().uuid().optional(),
      created_by: z.string().optional(),
    });

    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);
    const briefing = await getBriefingById(params.id);

    if (!briefing) {
      return reply.status(404).send({ success: false, error: 'briefing nao encontrado' });
    }

    const user = resolveUser(request);
    const stages = await ensureBriefingStages(briefing.id, user.email);
    const unlock = ensureStageUnlocked('producao', stages as any);

    if (!unlock.ok) {
      return reply.status(409).send({
        success: false,
        error: 'Etapas anteriores pendentes.',
        missing: unlock.missing,
      });
    }

    const copies = await listCopyVersions(briefing.id);
    const selectedCopy = body.copy_version_id
      ? copies.find((copy) => copy.id === body.copy_version_id) || null
      : copies[0] ?? null;

    const channels = body.channels ?? DEFAULT_DESIGN_CHANNELS;
    const taskPayload: Record<string, any> = {
      briefing,
      copy: selectedCopy,
      message: body.message ?? null,
    };

    const task = await createTask({
      briefingId: briefing.id,
      type: 'design',
      assignedTo: body.assigned_to,
      channels,
      payload: taskPayload,
    });

    const recipients = body.recipients ?? {};
    const notifications: any[] = [];

    for (const channel of channels) {
      const recipient = recipients[channel] || body.assigned_to;
      const notification = await createNotification({
        briefingId: briefing.id,
        taskId: task.id,
        channel,
        recipient,
        payload: taskPayload,
      });
      notifications.push(notification);
      await dispatchNotification({
        id: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        payload: notification.payload ?? taskPayload,
      });
    }

    await promoteStageIfPending(briefing.id, 'producao', user.email);

    await refreshBriefingStatus(briefing.id);

    return reply.status(201).send({
      success: true,
      data: {
        task,
        notifications,
      },
    });
  });

  app.get('/edro/workflow', async (_request, reply) => {
    return reply.send({ success: true, data: WORKFLOW_STAGES });
  });

  app.get('/edro/orchestrator', async (_request, reply) => {
    const info = getOrchestratorInfo();
    return reply.send({ success: true, data: info });
  });

  app.post('/edro/orchestrator/test', async (request, reply) => {
    const bodySchema = z.object({
      prompt: z.string().min(1),
      taskType: z.enum([
        'briefing_analysis',
        'social_post',
        'variations',
        'validation',
        'headlines',
        'institutional_copy',
        'campaign_strategy',
        'final_review',
      ]).optional(),
      forceProvider: z.enum(['openai', 'gemini', 'claude']).optional(),
    });

    const body = bodySchema.parse(request.body);

    try {
      const result = await generateCopy({
        prompt: body.prompt,
        taskType: body.taskType as TaskType,
        forceProvider: body.forceProvider,
      });

      return reply.send({
        success: true,
        data: {
          output: result.output,
          model: result.model,
          provider: result.payload.provider,
          tier: result.payload.tier,
          taskType: result.payload.taskType,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao gerar copy',
      });
    }
  });
}
