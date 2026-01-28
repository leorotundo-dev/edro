import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  generateCopy,
  generateCopyWithValidation,
  generatePremiumCopy,
  getOrchestratorInfo,
  TaskType,
} from '../services/ai/copyService';
import { getPlatformProfile, PLATFORM_PROFILES } from '../platformProfiles';
import { getClientById } from '../repos/clientsRepo';
import { buildClientKnowledgeFromRow } from '../providers/clientKnowledge';
import { buildClientKnowledgeBlock } from '../ai/knowledgePrompt';
import { query } from '../db';
import type { ClientKnowledge } from '../providers/contracts';
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

type RadarEvidence = {
  title: string;
  url: string;
  source_name: string;
  published_at?: string | null;
  summary?: string | null;
};

type ProductionCatalogItem = {
  production_type: string;
  platform: string;
  format_name: string;
  measurability_score?: number;
  measurability_type?: string;
  available_metrics?: string[];
  tracking_tools?: string[];
  attribution_capability?: string;
  ml_performance_score?: {
    overall_score?: number;
    score_weights?: Record<string, number>;
  };
  ml_insights?: {
    ml_insights?: string[];
    recommendations?: string[];
    optimization_tips?: string[];
  };
};

let cachedProductionCatalog: ProductionCatalogItem[] | null = null;

function normalizeText(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeProductionType(value?: string | null) {
  if (!value) return '';
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'eventos') return 'eventos-ativacoes';
  if (trimmed === 'eventos_ativacoes') return 'eventos-ativacoes';
  return trimmed;
}

function loadProductionCatalog(): ProductionCatalogItem[] {
  if (cachedProductionCatalog) return cachedProductionCatalog;
  try {
    const catalogPath = path.resolve(__dirname, '../data/productionCatalog.json');
    const raw = fs.readFileSync(catalogPath, 'utf-8');
    cachedProductionCatalog = JSON.parse(raw) as ProductionCatalogItem[];
  } catch {
    cachedProductionCatalog = [];
  }
  return cachedProductionCatalog;
}

function resolveObjectiveRange(objective?: string | null) {
  const text = (objective || '').toLowerCase();
  if (text.includes('convers') || text.includes('performance') || text.includes('venda') || text.includes('lead')) {
    return { min: 90, max: 100, label: 'performance' };
  }
  if (text.includes('awareness') || text.includes('reconhec') || text.includes('alcance') || text.includes('branding')) {
    return { min: 0, max: 60, label: 'awareness' };
  }
  if (text.includes('engaj') || text.includes('engagement')) {
    return { min: 70, max: 100, label: 'engagement' };
  }
  if (text.includes('balance') || text.includes('equilibr') || text.includes('mix')) {
    return { min: 70, max: 89, label: 'balanced' };
  }
  return { min: 0, max: 100, label: 'general' };
}

async function fetchRadarEvidence(tenantId: string, clientId?: string | null, limit = 3): Promise<RadarEvidence[]> {
  if (!clientId) return [];

  const { rows } = await query<any>(
    `
    SELECT ci.title,
           ci.url,
           ci.published_at,
           COALESCE(ci.summary, ci.snippet) AS summary,
           cs.name AS source_name
    FROM clipping_matches cm
    JOIN clipping_items ci ON ci.id = cm.clipping_item_id
    JOIN clipping_sources cs ON cs.id = ci.source_id
    WHERE cm.tenant_id=$1
      AND cm.client_id=$2
      AND ci.status <> 'ARCHIVED'
    ORDER BY cm.score DESC, ci.published_at DESC NULLS LAST
    LIMIT $3
    `,
    [tenantId, clientId, limit]
  );

  if (rows.length) return rows as RadarEvidence[];

  const fallback = await query<any>(
    `
    SELECT ci.title,
           ci.url,
           ci.published_at,
           COALESCE(ci.summary, ci.snippet) AS summary,
           cs.name AS source_name
    FROM clipping_items ci
    JOIN clipping_sources cs ON cs.id = ci.source_id
    WHERE ci.tenant_id=$1
      AND ci.status <> 'ARCHIVED'
    ORDER BY ci.published_at DESC NULLS LAST
    LIMIT $2
    `,
    [tenantId, limit]
  );

  return (fallback.rows || []) as RadarEvidence[];
}

async function fetchPerformanceHint(tenantId: string, clientId?: string | null, platform?: string) {
  if (!clientId || !platform) return null;
  const { rows } = await query<any>(
    `
    SELECT payload
    FROM learned_insights
    WHERE tenant_id=$1 AND client_id=$2 AND platform=$3
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [tenantId, clientId, platform]
  );
  const payload = rows[0]?.payload || null;
  const byFormat = Array.isArray(payload?.by_format) ? payload.by_format : [];
  if (!byFormat.length) return payload ? { payload } : null;
  const sorted = [...byFormat].sort((a: any, b: any) => Number(b?.score ?? 0) - Number(a?.score ?? 0));
  const top = sorted[0];
  if (!top?.format) return { payload };
  return {
    format: String(top.format),
    score: Number(top.score ?? 0),
    payload,
  };
}

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

function resolveClientIdFromPayload(payload: Record<string, any> | null | undefined) {
  if (!payload) return null;
  return (
    payload.client_id ||
    payload.clientId ||
    payload.client_ref ||
    payload.clientRef ||
    null
  );
}

async function loadClientKnowledge(
  tenantId: string | null | undefined,
  briefing: { payload?: Record<string, any>; client_name?: string | null }
): Promise<ClientKnowledge | null> {
  const clientId = resolveClientIdFromPayload(briefing.payload || {});
  if (!tenantId) return null;
  try {
    if (clientId) {
      const row = await getClientById(tenantId, String(clientId));
      if (row) return buildClientKnowledgeFromRow(row);
    }
    if (briefing.client_name) {
      const { rows } = await query<any>(
        `SELECT * FROM clients WHERE tenant_id=$1 AND LOWER(name)=LOWER($2) LIMIT 1`,
        [tenantId, briefing.client_name]
      );
      const row = rows[0];
      if (row) return buildClientKnowledgeFromRow(row);
    }
    return null;
  } catch {
    return null;
  }
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
  clientKnowledge?: ClientKnowledge | null;
}): string {
  const languageLabel = params.language === 'es' ? 'espanhol' : 'portugues';
  const payloadText = JSON.stringify(params.briefing.payload || {}, null, 2);
  const knowledgeBlock = buildClientKnowledgeBlock(params.clientKnowledge);

  return [
    'Voce e um redator para agencia de propaganda.',
    `Crie ${params.count} copys para pecas criativas.`,
    `Idioma: ${languageLabel}.`,
    'Formato: lista numerada. Cada item deve ter titulo curto, corpo e CTA.',
    `Cliente: ${params.briefing.client_name || 'nao informado'}.`,
    knowledgeBlock ? `Base do cliente:\n${knowledgeBlock}` : '',
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

    if (
      params.stage === 'aprovacao' &&
      body.status === 'done' &&
      user.role !== 'gestor' &&
      user.role !== 'admin'
    ) {
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
      task_type: z.string().optional(),
      tier: z.string().optional(),
      pipeline: z.enum(['simple', 'standard', 'premium']).optional(),
      force_provider: z.enum(['openai', 'gemini', 'claude']).optional(),
      metadata: z.record(z.any()).optional(),
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
    const tenantId = (request.user as any).tenant_id as string | undefined;
    const clientKnowledge = await loadClientKnowledge(tenantId, briefing);
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
          clientKnowledge,
        });

      try {
        const baseParams = {
          prompt,
          temperature: 0.6,
          maxTokens: 1500,
        };
        const pipeline = body.pipeline ?? 'standard';
        const taskType = (body.task_type as TaskType | undefined) ?? 'social_post';
        const result =
          pipeline === 'simple'
            ? await generateCopy({
                ...baseParams,
                taskType,
                forceProvider: body.force_provider,
              })
            : pipeline === 'premium'
              ? await generatePremiumCopy(baseParams)
              : await generateCopyWithValidation(baseParams);
        output = result.output;
        model = result.model;
        payload = result.payload;
      } catch (error: any) {
        request.log?.error({ err: error }, 'copy_ia_failed');
        return reply.status(500).send({
          success: false,
          error: 'Erro ao gerar copy com IA.',
        });
      }
    }

    let enrichedPayload = payload ?? null;
    if (body.metadata && Object.keys(body.metadata).length) {
      const basePayload =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? payload
          : payload
            ? { raw: payload }
            : {};
      enrichedPayload = {
        ...basePayload,
        _edro: {
          ...(basePayload as any)._edro,
          ...body.metadata,
        },
      };
    }

    const copy = await createCopyVersion({
      briefingId: briefing.id,
      language: body.language,
      model,
      prompt: prompt ?? null,
      output,
      payload: enrichedPayload,
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
    return reply.send({ success: true, data: getOrchestratorInfo() });
  });

  app.post('/edro/orchestrator/test', async (request, reply) => {
    const bodySchema = z.object({
      prompt: z.string().min(1),
      taskType: z.enum([
        'briefing_analysis',
        'validation',
        'social_post',
        'variations',
        'headlines',
        'institutional_copy',
        'campaign_strategy',
        'final_review',
      ]).optional(),
      task_type: z.enum([
        'briefing_analysis',
        'validation',
        'social_post',
        'variations',
        'headlines',
        'institutional_copy',
        'campaign_strategy',
        'final_review',
      ]).optional(),
      forceProvider: z.enum(['openai', 'gemini', 'claude']).optional(),
      force_provider: z.enum(['openai', 'gemini', 'claude']).optional(),
      tier: z.enum(['fast', 'creative', 'premium']).optional(),
    });

    const body = bodySchema.parse(request.body);
    const taskType = (body.taskType ?? body.task_type) as TaskType | undefined;
    const forceProvider = body.forceProvider ?? body.force_provider;

    try {
      const result = await generateCopy({
        prompt: body.prompt,
        taskType,
        forceProvider,
      });

      return reply.send({
        success: true,
        data: {
          output: result.output,
          model: result.model,
          provider: result.payload.provider,
          tier: result.payload.tier,
          taskType: result.payload.taskType ?? result.payload.task_type ?? taskType,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Erro ao gerar copy',
      });
    }
  });

  app.post('/edro/recommendations/platforms', async (request, reply) => {
    const bodySchema = z.object({
      objective: z.string().optional(),
      platform: z.string().optional(),
      client_id: z.string().optional(),
      production_type: z.string().optional(),
    });

    const body = bodySchema.parse(request.body);
    const tenantId = (request.user as any).tenant_id as string;

    const objective = body.objective || 'Awareness';
    const productionType = (body.production_type || '').toLowerCase();
    let platform = body.platform || PLATFORM_PROFILES[0]?.platform || 'Instagram';

    let profile;
    try {
      profile = getPlatformProfile(platform as any);
    } catch {
      profile = PLATFORM_PROFILES[0];
      platform = profile?.platform || platform;
    }

    const defaultMix = profile?.defaultMix || {};
    const sorted = Object.entries(defaultMix).sort((a, b) => b[1] - a[1]);

    const objectiveLower = objective.toLowerCase();
    const isConversion =
      objectiveLower.includes('convers') ||
      objectiveLower.includes('venda') ||
      objectiveLower.includes('lead');
    const isAwareness =
      objectiveLower.includes('awareness') ||
      objectiveLower.includes('reconhecimento') ||
      objectiveLower.includes('alcance') ||
      objectiveLower.includes('branding');
    const isEngagement = objectiveLower.includes('engaj') || objectiveLower.includes('engagement');

    const pickPreferred = (candidates: string[]) => {
      for (const candidate of candidates) {
        if (profile?.supportedFormats?.includes(candidate)) return candidate;
      }
      return '';
    };

    let recommendedFormat = '';
    let recommendedDetails: ProductionCatalogItem | null = null;
    const normalizedType = normalizeProductionType(productionType);
    const catalog = loadProductionCatalog();
    if (catalog.length) {
      const platformKey = normalizeText(platform);
      const matches = catalog.filter((item) => {
        const samePlatform = normalizeText(item.platform) === platformKey;
        const sameType = normalizedType ? normalizeProductionType(item.production_type) === normalizedType : true;
        return samePlatform && sameType;
      });

      if (matches.length) {
        const { min, max } = resolveObjectiveRange(objective);
        const scored = matches.filter((item) => typeof item.measurability_score === 'number');
        let pool = scored.filter((item) => {
          const score = Number(item.measurability_score ?? -1);
          return score >= min && score <= max;
        });
        if (!pool.length) {
          pool = scored.length ? scored : matches;
        }
        const scoreFor = (item: ProductionCatalogItem) => {
          const mlScore = item.ml_performance_score?.overall_score;
          if (typeof mlScore === 'number') return mlScore;
          const meas = item.measurability_score;
          return typeof meas === 'number' ? meas : -1;
        };
        pool.sort((a, b) => scoreFor(b) - scoreFor(a));
        if (pool.length) {
          recommendedFormat = pool[0].format_name;
          recommendedDetails = pool[0];
        }
      }
    }
    if (!recommendedFormat && (productionType.includes('midia-on') || productionType.includes('mídia-on'))) {
      if (platform === 'MetaAds') {
        recommendedFormat = isConversion
          ? pickPreferred(['CarouselAd', 'FeedAd'])
          : pickPreferred(['ReelAd', 'StoryAd']);
      } else if (platform === 'GoogleAds') {
        recommendedFormat = isConversion ? pickPreferred(['RSA']) : pickPreferred(['Display']);
      }
    }

    if (!recommendedFormat && isAwareness) {
      recommendedFormat = pickPreferred(['Reels', 'Shorts', 'Video', 'VideoLongo', 'StoryAd', 'ReelAd']);
    }

    if (!recommendedFormat && isConversion) {
      recommendedFormat = pickPreferred(['Carousel', 'Carrossel', 'FeedAd', 'CarouselAd', 'RSA']);
    }

    if (!recommendedFormat && isEngagement) {
      recommendedFormat = pickPreferred(['Stories', 'StoryAd', 'CommunityPost', 'Carrossel']);
    }

    if (!recommendedFormat) {
      recommendedFormat = sorted[0]?.[0] || profile?.supportedFormats?.[0] || 'Post';
    }

    if (!recommendedDetails && recommendedFormat && catalog.length) {
      const platformKey = normalizeText(platform);
      recommendedDetails =
        catalog.find(
          (item) =>
            normalizeText(item.platform) === platformKey &&
            item.format_name === recommendedFormat &&
            (!normalizedType || normalizeProductionType(item.production_type) === normalizedType)
        ) || null;
    }

    let client = null as any;
    if (body.client_id) {
      try {
        client = await getClientById(tenantId, body.client_id);
      } catch {
        client = null;
      }
    }
    const clientKnowledge = client ? buildClientKnowledgeFromRow(client) : null;
    const knowledgeBlock = buildClientKnowledgeBlock(clientKnowledge);

    const performanceHint = await fetchPerformanceHint(tenantId, body.client_id, platform);
    const perfFormat = performanceHint?.format || '';
    const perfScore = Number(performanceHint?.score ?? 0);
    const isPaid = productionType.includes('midia-on') || productionType.includes('mídia-on');
    const perfLooksPaid = perfFormat ? /ad|ads|rsa|display/i.test(perfFormat) : false;
    let usedPerformance = false;
    if (perfFormat && perfScore >= 70 && profile?.supportedFormats?.includes(perfFormat)) {
      if (!isPaid || perfLooksPaid || platform.toLowerCase().includes('ads')) {
        recommendedFormat = perfFormat;
        usedPerformance = true;
      }
    }

    const radarEvidence = await fetchRadarEvidence(tenantId, body.client_id, 3);

    const impact =
      objectiveLower.includes('convers') || objectiveLower.includes('venda') || objectiveLower.includes('lead')
        ? 'Impacto Alto'
        : objectiveLower.includes('awareness') || objectiveLower.includes('reconhecimento')
          ? 'Impacto Médio'
          : 'Impacto Médio';

    const measurabilityLine =
      recommendedDetails?.measurability_score != null
        ? `Score de mensurabilidade ${recommendedDetails.measurability_score}/100 (${recommendedDetails.measurability_type || 'n/a'}).`
        : '';
    const mlScoreLine =
      recommendedDetails?.ml_performance_score?.overall_score != null
        ? `Score de performance (ML) ${Math.round(recommendedDetails.ml_performance_score.overall_score)}/100.`
        : '';
    let reason = `Para o objetivo de ${objective}, o formato ${recommendedFormat} tende a gerar melhores resultados em ${platform}. ${mlScoreLine} ${measurabilityLine}`.trim();

    try {
      const editorialInsights = Array.isArray(performanceHint?.payload?.editorial_insights)
        ? performanceHint?.payload?.editorial_insights?.slice(0, 2)
        : [];
      const evidenceLines = [] as string[];
      if (perfFormat) {
        evidenceLines.push(
          `Dados internos (ultimos 30 dias): formato ${perfFormat} com score ${Math.round(perfScore)}.`
        );
      }
      if (editorialInsights?.length) {
        evidenceLines.push(`Insights internos: ${editorialInsights.join(' | ')}.`);
      }
      if (recommendedDetails?.measurability_score != null) {
        evidenceLines.push(
          `Mensurabilidade do formato: ${recommendedDetails.measurability_score}/100 (${recommendedDetails.measurability_type || 'n/a'}).`
        );
      }
      if (recommendedDetails?.available_metrics?.length) {
        evidenceLines.push(`Metricas disponiveis: ${recommendedDetails.available_metrics.slice(0, 6).join(', ')}.`);
      }
      if (recommendedDetails?.tracking_tools?.length) {
        evidenceLines.push(`Ferramentas de tracking: ${recommendedDetails.tracking_tools.slice(0, 4).join(', ')}.`);
      }
      if (recommendedDetails?.attribution_capability) {
        evidenceLines.push(`Capacidade de atribuicao: ${recommendedDetails.attribution_capability}.`);
      }
      if (recommendedDetails?.ml_performance_score?.overall_score != null) {
        evidenceLines.push(
          `Score de performance (ML): ${Math.round(recommendedDetails.ml_performance_score.overall_score)}/100.`
        );
      }
      if (recommendedDetails?.ml_insights?.ml_insights?.length) {
        evidenceLines.push(`Insights ML: ${recommendedDetails.ml_insights.ml_insights.slice(0, 2).join(' | ')}.`);
      }
      if (radarEvidence.length) {
        evidenceLines.push('Fontes Radar (use no maximo 1 se for relevante):');
        radarEvidence.forEach((item) => {
          evidenceLines.push(`- ${item.source_name}: ${item.title}`);
        });
      }

      const prompt = [
        'Voce e um estrategista de marketing digital.',
        'Gere uma recomendacao objetiva de formato (1-2 frases) para a campanha abaixo.',
        `Objetivo: ${objective}.`,
        `Plataforma: ${platform}.`,
        `Formato recomendado: ${recommendedFormat}.`,
        productionType ? `Tipo de producao: ${productionType}.` : '',
        client?.name ? `Cliente: ${client.name}.` : '',
        client?.segment_primary ? `Segmento: ${client.segment_primary}.` : '',
        knowledgeBlock ? `Base do cliente:\n${knowledgeBlock}` : '',
        usedPerformance ? 'Preferencia baseada em performance real do cliente.' : '',
        evidenceLines.length ? `Evidencias:\n${evidenceLines.join('\n')}` : '',
        'Se citar fonte, use "segundo {fonte}". Se nao houver fonte relevante, nao cite.',
        'Responda em portugues do Brasil. Sem markdown.',
      ]
        .filter(Boolean)
        .join('\n');

      const ai = await generateCopy({
        prompt,
        taskType: 'campaign_strategy',
        maxTokens: 300,
      });
      if (ai?.output) reason = ai.output;
    } catch {
      // fallback mantém template
    }

    return reply.send({
      success: true,
      data: {
        objective,
        platform,
        format: recommendedFormat,
        impact,
        reason,
        sources: radarEvidence.map((item) => ({
          title: item.title,
          url: item.url,
          source: item.source_name,
          published_at: item.published_at ?? null,
        })),
        performance: perfFormat
          ? {
              format: perfFormat,
              score: perfScore,
            }
          : null,
        measurability: recommendedDetails
          ? {
              score: recommendedDetails.measurability_score ?? null,
              type: recommendedDetails.measurability_type ?? null,
              metrics: recommendedDetails.available_metrics ?? [],
              tools: recommendedDetails.tracking_tools ?? [],
              attribution: recommendedDetails.attribution_capability ?? null,
            }
          : null,
        ml_performance: recommendedDetails?.ml_performance_score
          ? {
              overall_score: recommendedDetails.ml_performance_score.overall_score ?? null,
              weights: recommendedDetails.ml_performance_score.score_weights ?? null,
              insights: recommendedDetails.ml_insights?.ml_insights ?? [],
              recommendations: recommendedDetails.ml_insights?.recommendations ?? [],
              optimizations: recommendedDetails.ml_insights?.optimization_tips ?? [],
            }
          : null,
      },
    });
  });
}
