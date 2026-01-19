import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OpenAIService } from '../services/ai/openaiService';
import {
  createBriefing,
  createCopyVersion,
  createNotification,
  createTask,
  getBriefingById,
  getOrCreateClientByName,
  listBriefings,
  listCopyVersions,
  listTasks,
  updateBriefingStatus,
} from '../repositories/edroBriefingRepository';

const DEFAULT_TRAFFIC_CHANNELS = ['whatsapp', 'email', 'portal'];
const DEFAULT_DESIGN_CHANNELS = ['whatsapp', 'email'];

function resolveUserId(request: any): string | null {
  const user = request.user as { id?: string; sub?: string } | undefined;
  return user?.id || user?.sub || null;
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
  ].filter(Boolean).join('\n');
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
  }

  return notifications;
}

export default async function edroRoutes(app: FastifyInstance) {
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
    const bodySchema = z.object({
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
      status: z.string().optional(),
    }).refine(data => data.client_id || data.client_name, {
      message: 'client_id or client_name is required',
      path: ['client_id'],
    });

    const body = bodySchema.parse(request.body);
    const userId = resolveUserId(request);

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
      status: body.status ?? 'new',
      payload: body.payload ?? {},
      createdBy: body.created_by ?? userId,
      trafficOwner: body.traffic_owner ?? null,
      meetingUrl: body.meeting_url ?? null,
      dueAt: dueAt ?? null,
      source: body.source ?? 'manual',
    });

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
          briefing: briefing,
          event: 'briefing_created',
        },
      });
    }

    return reply.status(201).send({
      success: true,
      data: {
        briefing,
        trafficTask,
        trafficNotifications,
      },
    });
  });

  app.get('/edro/briefings/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const params = paramsSchema.parse(request.params);
    const briefing = await getBriefingById(params.id);

    if (!briefing) {
      return reply.status(404).send({ success: false, error: 'briefing nao encontrado' });
    }

    const copies = await listCopyVersions(briefing.id);
    const tasks = await listTasks(briefing.id);

    return reply.send({
      success: true,
      data: {
        briefing,
        copies,
        tasks,
      },
    });
  });

  app.patch('/edro/briefings/:id/status', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({ status: z.string().min(2) });

    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    const briefing = await updateBriefingStatus(params.id, body.status);
    if (!briefing) {
      return reply.status(404).send({ success: false, error: 'briefing nao encontrado' });
    }

    return reply.send({ success: true, data: briefing });
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

    const userId = resolveUserId(request);
    const count = body.count ?? 10;

    let output = body.output;
    let prompt = body.prompt;
    let model = body.model ?? process.env.OPENAI_MODEL ?? null;

    if (!output) {
      prompt = prompt || buildCopyPrompt({
        briefing,
        language: body.language,
        count,
        instructions: body.instructions ?? null,
      });

      output = await OpenAIService.generateCompletion({
        prompt,
        temperature: 0.6,
        maxTokens: 1500,
      });
    }

    const copy = await createCopyVersion({
      briefingId: briefing.id,
      language: body.language,
      model,
      prompt: prompt ?? null,
      output,
      createdBy: body.created_by ?? userId,
    });

    await updateBriefingStatus(briefing.id, 'copy_ready');

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

    const copies = await listCopyVersions(briefing.id);
    const selectedCopy = body.copy_version_id
      ? copies.find(copy => copy.id === body.copy_version_id) || null
      : (copies[0] ?? null);

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
    }

    await updateBriefingStatus(briefing.id, 'design_pending');

    return reply.status(201).send({
      success: true,
      data: {
        task,
        notifications,
      },
    });
  });
}
