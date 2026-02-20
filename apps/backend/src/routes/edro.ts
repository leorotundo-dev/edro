import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  generateCopy,
  generateCollaborativeCopy,
  generateCopyWithValidation,
  generatePremiumCopy,
  getOrchestratorInfo,
  TaskType,
} from '../services/ai/copyService';
import { generateAdCreative } from '../services/adCreativeService';
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
  getTaskById,
  listAllTasks,
  listBriefings,
  listBriefingStages,
  listCopyVersions,
  listTasks,
  updateBriefingStageStatus,
  updateBriefingStatus,
  updateTaskStatus,
  deleteBriefing,
  archiveBriefing,
  listEdroClients,
  getBriefingTimeline,
} from '../repositories/edroBriefingRepository';
import { dispatchNotification } from '../services/notificationService';
import { buildStageChangeEmail } from '../services/stageNotificationTemplates';
import {
  WORKFLOW_STAGES,
  WorkflowStage,
  getNextStage,
  getStageIndex,
  isWorkflowStage,
} from '@edro/shared/workflow';
import { env } from '../env';
import { saveFile, buildKey } from '../library/storage';
import { refreshAllClientsForTenant } from '../clientIntelligence/worker';
import { getClientPreferences, rebuildClientPreferences } from '../services/learningLoopService';
import { recordPreferenceFeedback } from '../services/preferenceEngine';
import {
  createABTest,
  listABTests,
  getABResults,
  recordABResult,
  declareWinner,
  cancelABTest,
} from '../services/abTestService';
import { buildPredictiveInsights, predictEngagement } from '../services/predictiveService';
import { buildIndustryBenchmarks, getIndustryBenchmarks, compareClientToIndustry } from '../services/benchmarkService';
import {
  searchPerplexity,
  searchTrendingTopics,
  enrichClippingItem,
  researchCompetitorActivity,
  researchForCopy,
  isPerplexityConfigured,
} from '../services/perplexityService';

const DEFAULT_TRAFFIC_CHANNELS = ['whatsapp', 'email', 'portal'];
const DEFAULT_DESIGN_CHANNELS = ['whatsapp', 'email'];
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value?: string | null) => Boolean(value && UUID_REGEX.test(value));

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

function formatReporteiKpi(metric?: string, value?: any) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value != null ? String(value) : '';
  if (metric === 'ctr' || metric === 'engagement_rate') {
    return `${(numeric * 100).toFixed(2)}%`;
  }
  if (numeric >= 1000) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(numeric);
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
}

function buildReporteiCopyContext(params: {
  payload?: any | null;
  selectedFormat?: string | null;
  selectedPlatform?: string | null;
}) {
  if (!params.payload) return { promptBlock: '', summary: null as any };
  const byFormat = Array.isArray(params.payload.by_format) ? params.payload.by_format : [];
  const byTag = Array.isArray(params.payload.by_tag) ? params.payload.by_tag : [];
  const editorialInsights = Array.isArray(params.payload.editorial_insights)
    ? params.payload.editorial_insights
    : [];
  if (!byFormat.length && !byTag.length && !editorialInsights.length) {
    return { promptBlock: '', summary: null as any };
  }

  const normalize = (value?: string) => String(value || '').trim().toLowerCase();
  const selectedFormatKey = normalize(params.selectedFormat || '');
  const sortedFormats = [...byFormat].sort((a, b) => Number(b?.score ?? 0) - Number(a?.score ?? 0));
  const sortedTags = [...byTag].sort((a, b) => Number(b?.score ?? 0) - Number(a?.score ?? 0));

  const matchedFormat =
    selectedFormatKey && byFormat.length
      ? byFormat.find((item) => normalize(item?.format) === selectedFormatKey)
      : null;
  const topFormat = matchedFormat || sortedFormats[0] || null;
  const topTag = sortedTags[0] || null;

  const kpis =
    topFormat?.kpis?.length
      ? topFormat.kpis
          .slice(0, 3)
          .map((kpi: any) => `${kpi.metric}: ${formatReporteiKpi(kpi.metric, kpi.value)}`)
      : [];
  const insightsForPrompt = editorialInsights.slice(0, 3);
  const insightsFull = editorialInsights;

  const windowLabel = params.payload?.window || params.payload?.time_window || '30d';
  const summary = {
    source: 'reportei',
    platform: params.selectedPlatform || params.payload?.platform || null,
    window: windowLabel,
    format: topFormat
      ? {
          name: topFormat.format,
          score: Number(topFormat.score ?? 0),
          basis: matchedFormat ? 'selected' : 'top',
        }
      : null,
    tag: topTag
      ? {
          name: topTag.tag,
          score: Number(topTag.score ?? 0),
        }
      : null,
    kpis,
    insights: insightsFull,
    used_in_prompt: true,
  };

  const lines = [
    `Dados Reportei (${windowLabel}):`,
    topFormat ? `- Formato destaque: ${topFormat.format} (score ${Math.round(topFormat.score ?? 0)}).` : '',
    topTag ? `- Tag destaque: ${topTag.tag} (score ${Math.round(topTag.score ?? 0)}).` : '',
    kpis.length ? `- KPIs: ${kpis.join(', ')}.` : '',
    insightsForPrompt.length ? `- Insights editoriais: ${insightsForPrompt.join(' | ')}.` : '',
    'Use esses sinais para priorizar estrutura, CTA e tom, sem sair do formato selecionado.',
  ].filter(Boolean);

  return {
    promptBlock: lines.join('\n'),
    summary,
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

async function syncExamplesToProfile(tenantId: string, clientId: string) {
  const [approvedRows, rejectedRows] = await Promise.all([
    query<{ text: string | null }>(
      `
      SELECT copy_approved_text as text
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='copy'
        AND action IN ('approved','approved_after_edit')
        AND copy_approved_text IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [tenantId, clientId]
    ),
    query<{ text: string | null }>(
      `
      SELECT copy_rejected_text as text
      FROM preference_feedback
      WHERE tenant_id=$1 AND client_id=$2
        AND feedback_type='copy'
        AND action='rejected'
        AND copy_rejected_text IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [tenantId, clientId]
    ),
  ]);

  const goodExamples = approvedRows.rows
    .map((row) => String(row.text || '').trim())
    .filter(Boolean);
  const badExamples = rejectedRows.rows
    .map((row) => String(row.text || '').trim())
    .filter(Boolean);

  const existing = await query<{ profile: Record<string, any> | null }>(
    `SELECT profile FROM clients WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
    [tenantId, clientId]
  );
  if (!existing.rows.length) return;

  const nextProfile = {
    ...(existing.rows[0]?.profile || {}),
    good_copy_examples: goodExamples,
    bad_copy_examples: badExamples,
  };

  await query(
    `UPDATE clients SET profile=$1::jsonb, updated_at=NOW() WHERE tenant_id=$2 AND id=$3`,
    [JSON.stringify(nextProfile), tenantId, clientId]
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
  reporteiHint?: string | null;
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
    params.reporteiHint ? params.reporteiHint : '',
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

async function notifyStageChange(params: {
  briefingId: string;
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
  updatedBy?: string | null;
}) {
  try {
    const briefing = await getBriefingById(params.briefingId);
    if (!briefing) return;

    const recipients = new Set<string>();
    if (briefing.created_by) recipients.add(briefing.created_by);
    if (briefing.traffic_owner) recipients.add(briefing.traffic_owner);
    if (params.updatedBy) recipients.add(params.updatedBy);

    if (!recipients.size) return;

    const email = buildStageChangeEmail({
      briefingTitle: briefing.title,
      clientName: briefing.client_name,
      fromStage: params.fromStage,
      toStage: params.toStage,
      updatedBy: params.updatedBy,
      briefingId: params.briefingId,
      baseUrl: env.WEB_URL || undefined,
    });

    for (const recipient of recipients) {
      const notification = await createNotification({
        briefingId: params.briefingId,
        channel: 'email',
        recipient,
        payload: {
          briefing: { id: briefing.id, title: briefing.title, client_name: briefing.client_name },
          fromStage: params.fromStage,
          toStage: params.toStage,
          type: 'stage_change',
        },
      });
      await dispatchNotification({
        id: notification.id,
        channel: 'email',
        recipient,
        payload: {
          _email: email,
          briefing: { id: briefing.id, title: briefing.title, client_name: briefing.client_name },
        },
      });
    }
  } catch (err) {
    // Non-blocking — log but don't fail the stage transition
    console.error('[notifyStageChange] error:', err);
  }
}

export default async function edroRoutes(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

  app.addHook('preHandler', async (request, reply) => {
    // Public approval endpoints don't require authentication
    if ((request.url as string).startsWith('/api/edro/public/')) return;
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ success: false, error: 'Nao autorizado.' });
    }
  });

  app.get('/edro/briefings', async (request, reply) => {
    const querySchema = z.object({
      status: z.string().optional(),
      clientId: z.string().optional(),
      search: z.string().optional(),
      limit: z.string().optional(),
      offset: z.string().optional(),
    });

    const q = querySchema.parse(request.query);
    const limit = q.limit ? Math.min(parseInt(q.limit, 10) || 50, 200) : 50;
    const offset = q.offset ? parseInt(q.offset, 10) || 0 : 0;

    const { rows: briefings, total } = await listBriefings({
      status: q.status,
      clientId: q.clientId,
      search: q.search,
      limit,
      offset,
    });

    return reply.send({ success: true, data: briefings, total, limit, offset });
  });

  app.get('/edro/clients', async (_request, reply) => {
    const clients = await listEdroClients();
    return reply.send({ success: true, data: clients });
  });

  // ── Briefing Templates ────────────────────────────────────────
  app.get('/edro/templates', async (_request, reply) => {
    const { rows } = await query<any>(
      `SELECT * FROM edro_briefing_templates
       WHERE tenant_id = '00000000-0000-0000-0000-000000000000' OR is_system = true
       ORDER BY is_system DESC, name ASC`
    );
    return reply.send({ success: true, data: rows });
  });

  app.post('/edro/templates', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(2),
      category: z.string().default('social'),
      objective: z.string().optional(),
      target_audience: z.string().optional(),
      channels: z.array(z.string()).optional(),
      additional_notes: z.string().optional(),
      platform_config: z.record(z.any()).optional(),
    });

    const body = bodySchema.parse(request.body);
    const id = `tpl_${crypto.randomUUID().slice(0, 12)}`;

    const { rows } = await query<any>(
      `INSERT INTO edro_briefing_templates (id, tenant_id, name, category, objective, target_audience, channels, additional_notes, platform_config)
       VALUES ($1, '00000000-0000-0000-0000-000000000000', $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING *`,
      [
        id,
        body.name,
        body.category,
        body.objective ?? null,
        body.target_audience ?? null,
        body.channels ?? [],
        body.additional_notes ?? null,
        JSON.stringify(body.platform_config ?? {}),
      ]
    );

    return reply.status(201).send({ success: true, data: rows[0] });
  });

  app.delete('/edro/templates/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const { rows } = await query<any>(
      `DELETE FROM edro_briefing_templates WHERE id = $1 AND is_system = false RETURNING id`,
      [id]
    );

    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Template não encontrado ou é do sistema.' });
    }

    return reply.send({ success: true });
  });

  // ── Creative Image for Mockups ────────────────────────────────
  app.post('/edro/briefings/:id/creative-image', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const briefing = await getBriefingById(id);
    if (!briefing) {
      return reply.status(404).send({ success: false, error: 'Briefing não encontrado.' });
    }

    const contentType = String(request.headers['content-type'] || '');

    if (contentType.includes('multipart')) {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ success: false, error: 'Arquivo não enviado.' });
      }

      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.mimetype)) {
        return reply.status(400).send({ success: false, error: 'Formato não suportado. Use JPG, PNG, WebP ou GIF.' });
      }

      const buffer = await file.toBuffer();
      const ext = file.filename.split('.').pop() || 'jpg';
      const key = `edro/briefings/${id}/creative_${Date.now()}.${ext}`;
      await saveFile(buffer, key);

      const imageUrl = env.S3_ENDPOINT
        ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`
        : `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;

      await query(`UPDATE edro_briefings SET creative_image_url = $1 WHERE id = $2`, [imageUrl, id]);

      return reply.send({ success: true, data: { creative_image_url: imageUrl } });
    }

    const bodySchema = z.object({ imageUrl: z.string().url() });
    const body = bodySchema.parse(request.body);

    await query(`UPDATE edro_briefings SET creative_image_url = $1 WHERE id = $2`, [body.imageUrl, id]);

    return reply.send({ success: true, data: { creative_image_url: body.imageUrl } });
  });

  app.delete('/edro/briefings/:id/creative-image', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await query(`UPDATE edro_briefings SET creative_image_url = NULL WHERE id = $1`, [id]);
    return reply.send({ success: true });
  });

  // ── Briefings CRUD ────────────────────────────────────────────
  app.post('/edro/briefings', async (request, reply) => {
    const bodySchema = z
      .object({
        client_id: z.string().optional(),
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

    const tenantId = (request.user as any)?.tenant_id;
    let clientId = body.client_id || null;
    let clientName = body.client_name ?? null;
    let clientSegment = body.client_segment ?? null;
    let clientTimezone = body.client_timezone ?? null;
    const payload = { ...(body.payload ?? {}) } as Record<string, any>;

    if (clientId && !isUuid(clientId)) {
      if (tenantId) {
        const coreClient = await getClientById(tenantId, clientId);
        if (coreClient) {
          clientName = coreClient.name;
          clientSegment = clientSegment ?? coreClient.segment_primary ?? null;
          clientTimezone = clientTimezone ?? coreClient.timezone ?? null;
        }
      }
      if (!clientName) clientName = clientId;
      payload.client_ref = {
        id: clientId,
        name: clientName ?? null,
      };
      clientId = null;
    }

    if (!clientId && clientName) {
      const client = await getOrCreateClientByName({
        name: clientName,
        segment: clientSegment ?? null,
        timezone: clientTimezone ?? null,
      });
      clientId = client.id;
    }

    const briefing = await createBriefing({
      clientId,
      title: body.title,
      status: 'briefing',
      payload,
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

  // DELETE /edro/briefings/:id - Delete a briefing permanently
  app.delete('/edro/briefings/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const deleted = await deleteBriefing(id);
    if (!deleted) return reply.status(404).send({ success: false, error: 'not_found' });
    return reply.send({ success: true });
  });

  // PATCH /edro/briefings/:id/archive - Archive a briefing
  app.patch('/edro/briefings/:id/archive', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const briefing = await archiveBriefing(id);
    if (!briefing) return reply.status(404).send({ success: false, error: 'not_found' });
    return reply.send({ success: true, data: briefing });
  });

  // POST /edro/briefings/bulk/advance - Advance multiple briefings to next stage
  app.post('/edro/briefings/bulk/advance', async (request, reply) => {
    const bodySchema = z.object({
      ids: z.array(z.string().uuid()).min(1).max(200),
    });
    const { ids } = bodySchema.parse(request.body);

    const user = (request as any).user || {};
    const results: { id: string; ok: boolean; from?: string; to?: string; error?: string }[] = [];

    for (const briefingId of ids) {
      try {
        const stages = await ensureBriefingStages(briefingId);
        const current = stages.find((s: any) => s.status === 'in_progress');
        if (!current) {
          results.push({ id: briefingId, ok: false, error: 'no_active_stage' });
          continue;
        }

        await updateBriefingStageStatus({
          briefingId,
          stage: current.stage as WorkflowStage,
          status: 'done',
          updatedBy: user.email ?? null,
        });

        const next = getNextStage(current.stage as WorkflowStage);
        if (next) {
          await promoteStageIfPending(briefingId, next, user.email ?? null);
          notifyStageChange({
            briefingId,
            fromStage: current.stage as WorkflowStage,
            toStage: next,
            updatedBy: user.email ?? null,
          });
        }
        await refreshBriefingStatus(briefingId);

        results.push({ id: briefingId, ok: true, from: current.stage, to: next ?? 'done' });
      } catch (err: any) {
        results.push({ id: briefingId, ok: false, error: err.message });
      }
    }

    const advanced = results.filter((r) => r.ok).length;
    return reply.send({ success: true, advanced, total: ids.length, results });
  });

  app.get('/edro/briefings/:id/stages', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const stages = await ensureBriefingStages(params.id);
    return reply.send({ success: true, data: stages });
  });

  app.get('/edro/briefings/:id/timeline', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const timeline = await getBriefingTimeline(id);
    return reply.send({ success: true, data: timeline });
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
        notifyStageChange({
          briefingId: params.id,
          fromStage: params.stage as WorkflowStage,
          toStage: nextStage,
          updatedBy: user.email,
        });
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

  // ── Copy Feedback & Scoring ────────────────────────────────────
  app.patch('/edro/copies/:copyId/feedback', async (request, reply) => {
    const { copyId } = z.object({ copyId: z.string().uuid() }).parse(request.params);
    const bodySchema = z.object({
      status: z.enum(['approved', 'rejected']).optional(),
      score: z.number().int().min(1).max(5).optional(),
      feedback: z.string().max(2000).optional(),
      rejection_tags: z.array(z.string()).optional(),
      rejection_reason: z.string().max(2000).optional(),
      approved_text: z.string().optional(),
      rejected_text: z.string().optional(),
      regeneration_instruction: z.string().max(2000).optional(),
      regeneration_count: z.number().int().min(0).max(20).optional(),
    });
    const body = bodySchema.parse(request.body);

    const { rows } = await query<any>(
      `UPDATE edro_copy_versions
       SET status = COALESCE($2, status),
           score = COALESCE($3, score),
           feedback = COALESCE($4, feedback)
       WHERE id = $1
       RETURNING *`,
      [copyId, body.status ?? null, body.score ?? null, body.feedback ?? null]
    );

    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Copy não encontrada.' });
    }

    const copyRow = rows[0];
    const tenantId = (request.user as any)?.tenant_id;
    const user = resolveUser(request);

    if (tenantId && copyRow?.briefing_id) {
      try {
        const briefing = await getBriefingById(copyRow.briefing_id);
        const clientId = briefing?.client_id || null;
        if (clientId) {
          const payload = copyRow.payload || {};
          const action =
            body.status === 'approved'
              ? body.rejected_text || body.regeneration_count
                ? 'approved_after_edit'
                : 'approved'
              : 'rejected';

          await recordPreferenceFeedback({
            tenantId,
            clientId,
            payload: {
              feedback_type: 'copy',
              action,
              copy_briefing_id: copyRow.briefing_id,
              copy_platform: payload?.platform || null,
              copy_format: payload?.format || null,
              copy_pipeline: payload?.pipeline || null,
              copy_task_type: payload?.taskType || null,
              copy_tone: payload?.tone || null,
              copy_approved_text:
                body.approved_text || (body.status === 'approved' ? copyRow.output : null),
              copy_rejected_text:
                body.rejected_text || (body.status === 'rejected' ? copyRow.output : null),
              rejection_tags: body.rejection_tags,
              rejection_reason: body.rejection_reason || body.feedback,
              regeneration_instruction: body.regeneration_instruction,
              regeneration_count: body.regeneration_count || 0,
              created_by: user.email || user.id || null,
            },
          });

          await syncExamplesToProfile(tenantId, clientId);
        }
      } catch {
        // Keep feedback endpoint resilient; preference logging cannot block UX.
      }
    }

    // Fire-and-forget: rebuild preferences if score was provided
    if (body.score && copyRow?.briefing_id) {
      if (tenantId) {
        getBriefingById(copyRow.briefing_id).then((briefing) => {
          if (briefing?.client_id) {
            rebuildClientPreferences({ tenant_id: tenantId, client_id: briefing.client_id }).catch(() => {});
          }
        }).catch(() => {});
      }
    }

    return reply.send({ success: true, data: rows[0] });
  });

  // ── Bulk Copy Generation ──────────────────────────────────────
  app.post('/edro/briefings/bulk-copy', async (request, reply) => {
    const bodySchema = z.object({
      briefingIds: z.array(z.string().uuid()).min(1).max(20),
      language: z.string().default('pt'),
      count: z.number().int().min(1).max(5).default(3),
    });

    const body = bodySchema.parse(request.body);
    const results: { briefingId: string; ok: boolean; copies?: number; error?: string }[] = [];

    for (const briefingId of body.briefingIds) {
      try {
        const briefing = await getBriefingById(briefingId);
        if (!briefing) {
          results.push({ briefingId, ok: false, error: 'not_found' });
          continue;
        }

        const clientRow = briefing.client_id
          ? await getClientById('81fe2f7f-69d7-441a-9a2e-5c4f5d4c5cc5', briefing.client_id)
          : null;
        const knowledge = buildClientKnowledgeFromRow(clientRow);
        const knowledgeBlock = buildClientKnowledgeBlock(knowledge);

        const payload = briefing.payload || {};
        const platforms = String(payload.channels || 'instagram').split(',').map((c: string) => c.trim());
        const platform = platforms[0] || 'instagram';
        const platformProfile = getPlatformProfile(platform);

        const generated = await generateCopy({
          brief: `Campanha: ${briefing.title}\nObjetivo: ${payload.objective || 'engajamento'}\nPúblico: ${payload.target_audience || 'público geral'}\nObservações: ${payload.additional_notes || ''}`,
          platform,
          language: body.language,
          count: body.count,
          customKnowledge: knowledgeBlock || undefined,
          platformProfile: platformProfile || undefined,
        });

        let copyCount = 0;
        if (generated?.copies) {
          for (const copy of generated.copies) {
            await createCopyVersion({
              briefingId,
              language: body.language,
              model: generated.model || null,
              prompt: null,
              output: copy.text || copy.output || String(copy),
              payload: { bulk: true, platform },
              createdBy: (request as any).user?.email || null,
            });
            copyCount++;
          }
        }

        results.push({ briefingId, ok: true, copies: copyCount });
      } catch (err: any) {
        results.push({ briefingId, ok: false, error: err.message });
      }
    }

    return reply.send({ success: true, data: results });
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
      pipeline: z.enum(['simple', 'standard', 'premium', 'collaborative']).optional(),
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
    const metadata = (body.metadata || {}) as Record<string, any>;
    const selectedPlatform =
      typeof metadata.platform === 'string'
        ? metadata.platform
        : typeof (briefing.payload as any)?.platform === 'string'
          ? (briefing.payload as any).platform
          : null;
    const selectedFormat =
      typeof metadata.format === 'string'
        ? metadata.format
        : typeof (briefing.payload as any)?.format === 'string'
          ? (briefing.payload as any).format
          : null;
    const selectedClientId =
      typeof metadata.client_id === 'string'
        ? metadata.client_id
        : typeof (briefing as any)?.client_id === 'string'
          ? (briefing as any).client_id
          : null;
    const performanceHint = selectedPlatform
      ? await fetchPerformanceHint(tenantId, selectedClientId, selectedPlatform)
      : null;
    const reporteiContext = buildReporteiCopyContext({
      payload: performanceHint?.payload,
      selectedFormat,
      selectedPlatform,
    });
    const stages = await ensureBriefingStages(briefing.id, user.email);
    const unlock = ensureStageUnlocked('copy_ia', stages as any);
    const allowAutoStage = Boolean(
      body.metadata &&
        (body.metadata.allow_auto_stage ||
          body.metadata.source === 'studio' ||
          body.metadata.origin === 'studio' ||
          body.metadata.format ||
          body.metadata.platform ||
          body.metadata.production_type)
    );

    if (!unlock.ok) {
      if (allowAutoStage || unlock.missing.length) {
        for (const stage of unlock.missing) {
          await updateBriefingStageStatus({
            briefingId: briefing.id,
            stage,
            status: 'done',
            updatedBy: user.email,
            metadata: { autoCompleted: true },
          });
        }
        await promoteStageIfPending(briefing.id, 'copy_ia', user.email);
      }
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
          reporteiHint: reporteiContext?.promptBlock || null,
        });

      try {
        const baseParams = {
          prompt,
          temperature: 0.6,
          maxTokens: 1500,
        };
        const pipeline = body.pipeline ?? 'standard';
        const taskType = (body.task_type as TaskType | undefined) ?? 'social_post';
        const knowledgeBlock = clientKnowledge ? buildClientKnowledgeBlock(clientKnowledge) : '';
        const usageCtx = tenantId ? { tenant_id: tenantId, feature: 'copy_studio' } : undefined;
        let result;
        if (pipeline === 'collaborative') {
          result = await generateCollaborativeCopy({
            prompt: prompt!,
            count,
            knowledgeBlock: knowledgeBlock || undefined,
            reporteiHint: reporteiContext?.promptBlock || undefined,
            clientName: briefing.client_name || metadata.client_name || undefined,
            instructions: body.instructions || undefined,
            usageContext: usageCtx,
          });
        } else if (pipeline === 'simple') {
          result = await generateCopy({
            ...baseParams,
            taskType,
            forceProvider: body.force_provider,
            usageContext: usageCtx,
          });
        } else if (pipeline === 'premium') {
          result = await generatePremiumCopy({ ...baseParams, usageContext: usageCtx });
        } else {
          result = await generateCopyWithValidation({ ...baseParams, usageContext: usageCtx });
        }
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

    const basePayload =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload
        : payload
          ? { raw: payload }
          : {};
    const edroPayload = {
      ...(basePayload as any)._edro,
      ...(body.metadata && Object.keys(body.metadata).length ? body.metadata : {}),
    } as Record<string, any>;
    if (reporteiContext?.summary) {
      edroPayload.reportei = reporteiContext.summary;
    }
    const hasEdroPayload = Object.keys(edroPayload).length > 0;
    const hasBasePayload = Object.keys(basePayload).length > 0;
    let enrichedPayload = payload ?? null;
    if (hasBasePayload || hasEdroPayload) {
      enrichedPayload = {
        ...basePayload,
        ...(hasEdroPayload ? { _edro: edroPayload } : {}),
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
        request.log?.info('skip traffic notification — no recipient configured');
      } else {
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

    const testTenantId = (request.user as any)?.tenant_id || 'test';
    try {
      const result = await generateCopy({
        prompt: body.prompt,
        taskType,
        forceProvider,
        usageContext: { tenant_id: testTenantId, feature: 'orchestrator_test' },
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
        usageContext: tenantId ? { tenant_id: tenantId, feature: 'format_recommendation' } : undefined,
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

  app.get('/edro/metrics', async (request, reply) => {
    try {
      // Total briefings
      const { rows: totalRows } = await query<any>('SELECT COUNT(*) as count FROM edro_briefings');
      const total = Number(totalRows[0]?.count || 0);

      // By status
      const { rows: statusRows } = await query<any>(`
        SELECT status, COUNT(*) as count
        FROM edro_briefings
        GROUP BY status
      `);

      // Average time per stage (in hours)
      const { rows: stageTimeRows } = await query<any>(`
        SELECT
          stage,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours
        FROM edro_briefing_stages
        WHERE status = 'done'
        GROUP BY stage
      `);

      // Copies generated
      const { rows: copiesRows } = await query<any>('SELECT COUNT(*) as count FROM edro_copy_versions');
      const totalCopies = Number(copiesRows[0]?.count || 0);

      // Tasks by type
      const { rows: tasksRows } = await query<any>(`
        SELECT type, COUNT(*) as count
        FROM edro_tasks
        GROUP BY type
      `);

      // Recent activity (last 7 days)
      const { rows: recentRows } = await query<any>(`
        SELECT COUNT(*) as count
        FROM edro_briefings
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);
      const recentBriefings = Number(recentRows[0]?.count || 0);

      // Bottlenecks (stages with most in_progress)
      const { rows: bottleneckRows } = await query<any>(`
        SELECT stage, COUNT(*) as count
        FROM edro_briefing_stages
        WHERE status = 'in_progress'
        GROUP BY stage
        ORDER BY count DESC
        LIMIT 3
      `);

      // Weekly velocity (completed briefings per week, last 8 weeks)
      const { rows: weeklyRows } = await query<any>(`
        SELECT
          date_trunc('week', updated_at) as week,
          COUNT(*) as count
        FROM edro_briefings
        WHERE status = 'done' AND updated_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY week
        ORDER BY week ASC
      `);

      // Overdue briefings
      const { rows: overdueRows } = await query<any>(`
        SELECT COUNT(*) as count
        FROM edro_briefings
        WHERE due_at < NOW() AND status NOT IN ('done', 'archived', 'cancelled')
      `);
      const overdue = Number(overdueRows[0]?.count || 0);

      // Stage funnel (count per current stage)
      const { rows: funnelRows } = await query<any>(`
        SELECT
          COALESCE(
            (SELECT stage FROM edro_briefing_stages WHERE briefing_id = b.id AND status = 'in_progress' ORDER BY position LIMIT 1),
            (SELECT stage FROM edro_briefing_stages WHERE briefing_id = b.id AND status <> 'done' ORDER BY position LIMIT 1),
            'done'
          ) as current_stage,
          COUNT(*) as count
        FROM edro_briefings b
        WHERE b.status NOT IN ('archived', 'cancelled')
        GROUP BY current_stage
      `);

      // Copies per week (last 8 weeks)
      const { rows: copiesWeeklyRows } = await query<any>(`
        SELECT
          date_trunc('week', created_at) as week,
          COUNT(*) as count
        FROM edro_copy_versions
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY week
        ORDER BY week ASC
      `);

      // Reportei: latest insights per platform (aggregated across clients)
      const { rows: reporteiRows } = await query<any>(`
        SELECT DISTINCT ON (platform)
          platform,
          payload,
          created_at
        FROM learned_insights
        WHERE created_at >= NOW() - INTERVAL '30 days'
        ORDER BY platform, created_at DESC
      `);

      // Predictive: best posting times (aggregated across clients)
      const { rows: predictiveRows } = await query<any>(`
        SELECT platform, day_of_week, hour, avg_engagement, sample_size
        FROM posting_time_analytics
        ORDER BY avg_engagement DESC
        LIMIT 15
      `);

      // Learning preferences summary
      const { rows: learningRows } = await query<any>(`
        SELECT client_id, preferences, rebuilt_at
        FROM copy_performance_preferences
        ORDER BY rebuilt_at DESC
        LIMIT 10
      `);

      const reporteiPlatforms = reporteiRows.map((row: any) => {
        const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
        const topFormats = (payload?.by_format || [])
          .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
          .slice(0, 3)
          .map((f: any) => ({
            format: f.format,
            score: f.score,
            kpis: (f.kpis || []).slice(0, 4),
          }));
        return {
          platform: row.platform,
          updatedAt: row.created_at,
          topFormats,
          insights: (payload?.editorial_insights || []).slice(0, 3),
        };
      });

      return reply.send({
        success: true,
        data: {
          total,
          byStatus: statusRows.reduce((acc: any, row: any) => {
            acc[row.status] = Number(row.count);
            return acc;
          }, {}),
          avgTimePerStage: stageTimeRows.reduce((acc: any, row: any) => {
            acc[row.stage] = Math.round(Number(row.avg_hours || 0) * 10) / 10;
            return acc;
          }, {}),
          totalCopies,
          tasksByType: tasksRows.reduce((acc: any, row: any) => {
            acc[row.type] = Number(row.count);
            return acc;
          }, {}),
          recentBriefings,
          overdue,
          bottlenecks: bottleneckRows.map((row: any) => ({
            stage: row.stage,
            count: Number(row.count),
          })),
          weeklyVelocity: weeklyRows.map((row: any) => ({
            week: row.week,
            count: Number(row.count),
          })),
          stageFunnel: funnelRows.map((row: any) => ({
            stage: row.current_stage,
            count: Number(row.count),
          })),
          copiesWeekly: copiesWeeklyRows.map((row: any) => ({
            week: row.week,
            count: Number(row.count),
          })),
          reporteiPlatforms,
          predictiveTimes: predictiveRows.map((row: any) => ({
            platform: row.platform,
            day_of_week: Number(row.day_of_week),
            hour: Number(row.hour),
            avg_engagement: Number(row.avg_engagement),
            sample_size: Number(row.sample_size),
          })),
          learningInsights: learningRows.map((row: any) => {
            const prefs = typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences;
            return {
              client_id: row.client_id,
              rebuilt_at: row.rebuilt_at,
              total_scored_copies: prefs?.copy_feedback?.total_scored_copies || 0,
              overall_avg_score: prefs?.copy_feedback?.overall_avg_score || 0,
              boost: prefs?.directives?.boost || [],
              avoid: prefs?.directives?.avoid || [],
              preferred_formats: prefs?.copy_feedback?.preferred_formats || [],
            };
          }),
        },
      });
    } catch (err: any) {
      request.log?.error({ err }, 'metrics_failed');
      return reply.status(500).send({ success: false, error: 'Erro ao buscar métricas.' });
    }
  });

  // ── Client Approval Portal ────────────────────────────────────
  app.post('/edro/briefings/:id/approval-link', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const bodySchema = z.object({
      clientName: z.string().optional(),
      expiresInDays: z.number().int().min(1).max(30).default(7),
    });
    const body = bodySchema.parse(request.body);

    const briefing = await getBriefingById(id);
    if (!briefing) {
      return reply.status(404).send({ success: false, error: 'Briefing não encontrado.' });
    }

    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const expiresAt = new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO edro_approval_tokens (briefing_id, token, client_name, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [id, token, body.clientName || briefing.client_name || null, expiresAt]
    );

    const baseUrl = env.WEB_URL || '';
    const approvalUrl = `${baseUrl}/edro/aprovacao-externa?token=${token}`;

    return reply.send({ success: true, data: { token, approvalUrl, expiresAt } });
  });

  // Public endpoint — no auth required (registered in separate scope below)
  app.get('/edro/public/approval', async (request, reply) => {
    const { token } = z.object({ token: z.string().min(20) }).parse(request.query);

    const { rows } = await query<any>(
      `SELECT t.*, b.title, b.payload, b.client_id,
              c.name as client_name_from_client
       FROM edro_approval_tokens t
       JOIN edro_briefings b ON b.id = t.briefing_id
       LEFT JOIN edro_clients c ON c.id = b.client_id
       WHERE t.token = $1 AND t.expires_at > NOW() AND t.used_at IS NULL
       LIMIT 1`,
      [token]
    );

    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Link inválido ou expirado.' });
    }

    const approval = rows[0];
    const copies = await listCopyVersions(approval.briefing_id);

    return reply.send({
      success: true,
      data: {
        briefingTitle: approval.title,
        clientName: approval.client_name || approval.client_name_from_client,
        copies: copies.map((c: any) => ({
          id: c.id,
          output: c.output,
          language: c.language,
          created_at: c.created_at,
        })),
        expiresAt: approval.expires_at,
      },
    });
  });

  app.post('/edro/public/approval', async (request, reply) => {
    const bodySchema = z.object({
      token: z.string().min(20),
      copyId: z.string().uuid(),
      action: z.enum(['approve', 'reject']),
      comments: z.string().max(2000).optional(),
    });
    const body = bodySchema.parse(request.body);

    const { rows } = await query<any>(
      `SELECT * FROM edro_approval_tokens
       WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL
       LIMIT 1`,
      [body.token]
    );

    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Link inválido ou expirado.' });
    }

    const approval = rows[0];

    // Update copy status
    await query(
      `UPDATE edro_copy_versions SET status = $1, feedback = $2 WHERE id = $3`,
      [body.action === 'approve' ? 'approved' : 'rejected', body.comments ?? null, body.copyId]
    );

    // If approved, advance the approval stage
    if (body.action === 'approve') {
      await updateBriefingStageStatus({
        briefingId: approval.briefing_id,
        stage: 'aprovacao',
        status: 'done',
        updatedBy: approval.client_name || 'cliente',
        metadata: { approvedCopyId: body.copyId, approvedViaPortal: true, comments: body.comments },
      });

      const nextStage = getNextStage('aprovacao');
      if (nextStage) {
        await promoteStageIfPending(approval.briefing_id, nextStage, approval.client_name);
        notifyStageChange({
          briefingId: approval.briefing_id,
          fromStage: 'aprovacao',
          toStage: nextStage,
          updatedBy: approval.client_name || 'cliente (portal)',
        });
      }
    }

    // Mark token as used
    await query(`UPDATE edro_approval_tokens SET used_at = NOW() WHERE id = $1`, [approval.id]);

    return reply.send({ success: true, data: { action: body.action } });
  });

  // ── Intelligence Refresh ──────────────────────────────────────
  app.post('/edro/intelligence/refresh-all', async (request, reply) => {
    const user = resolveUser(request);
    if (user.role !== 'admin' && user.role !== 'gestor') {
      return reply.status(403).send({ success: false, error: 'Apenas admin ou gestor pode disparar refresh.' });
    }

    // Use a fixed tenant for Edro (same as used elsewhere)
    const tenantId = '81fe2f7f-69d7-441a-9a2e-5c4f5d4c5cc5';
    const result = await refreshAllClientsForTenant(tenantId);

    return reply.send({ success: true, data: result });
  });

  // ── Publication Scheduling ────────────────────────────────────
  app.post('/edro/briefings/:id/schedule', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const bodySchema = z.object({
      copyId: z.string().uuid(),
      channel: z.string().min(1),
      scheduledFor: z.string(),
      payload: z.record(z.any()).optional(),
    });
    const body = bodySchema.parse(request.body);
    const user = resolveUser(request);

    const briefing = await getBriefingById(id);
    if (!briefing) {
      return reply.status(404).send({ success: false, error: 'Briefing nao encontrado.' });
    }

    const copies = await listCopyVersions(id);
    const copy = copies.find((c: any) => c.id === body.copyId);
    if (!copy) {
      return reply.status(404).send({ success: false, error: 'Copy nao encontrada.' });
    }

    const { rows } = await query<any>(
      `INSERT INTO edro_publish_schedule (briefing_id, copy_id, channel, scheduled_for, payload, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING id`,
      [id, body.copyId, body.channel, body.scheduledFor, JSON.stringify(body.payload || {}), user.email || user.sub]
    );

    return reply.send({ success: true, data: { scheduleId: rows[0]?.id } });
  });

  app.get('/edro/briefings/:id/schedules', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const { rows } = await query<any>(
      `SELECT ps.*, cv.output as copy_output, cv.language
       FROM edro_publish_schedule ps
       LEFT JOIN edro_copy_versions cv ON cv.id = ps.copy_id
       WHERE ps.briefing_id = $1
       ORDER BY ps.scheduled_for ASC`,
      [id]
    );

    return reply.send({ success: true, data: rows });
  });

  app.delete('/edro/schedules/:scheduleId', async (request, reply) => {
    const { scheduleId } = z.object({ scheduleId: z.string().uuid() }).parse(request.params);

    await query(
      `UPDATE edro_publish_schedule SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status = 'scheduled'`,
      [scheduleId]
    );

    return reply.send({ success: true });
  });

  app.get('/edro/reports/export', async (request, reply) => {
    const querySchema = z.object({
      format: z.enum(['csv', 'json']).default('csv'),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    });

    const query_params = querySchema.parse(request.query);

    try {
      let sql = `
        SELECT
          b.id,
          b.client_name,
          b.title,
          b.status,
          b.source,
          b.traffic_owner,
          b.created_at,
          b.due_at,
          b.payload,
          COUNT(DISTINCT cv.id) as copy_count,
          COUNT(DISTINCT t.id) as task_count
        FROM edro_briefings b
        LEFT JOIN edro_copy_versions cv ON cv.briefing_id = b.id
        LEFT JOIN edro_tasks t ON t.briefing_id = b.id
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      if (query_params.startDate) {
        conditions.push(`b.created_at >= $${params.length + 1}`);
        params.push(query_params.startDate);
      }

      if (query_params.endDate) {
        conditions.push(`b.created_at <= $${params.length + 1}`);
        params.push(query_params.endDate);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ` GROUP BY b.id ORDER BY b.created_at DESC`;

      const { rows } = await query<any>(sql, params);

      if (query_params.format === 'json') {
        return reply.send({ success: true, data: rows });
      }

      // CSV format
      const headers = [
        'ID',
        'Cliente',
        'Título',
        'Status',
        'Fonte',
        'Responsável',
        'Data Criação',
        'Prazo',
        'Copies Geradas',
        'Tarefas',
      ];

      const csvRows = rows.map((row: any) => [
        row.id,
        row.client_name || '',
        row.title,
        row.status,
        row.source || '',
        row.traffic_owner || '',
        new Date(row.created_at).toISOString(),
        row.due_at ? new Date(row.due_at).toISOString() : '',
        row.copy_count,
        row.task_count,
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map((row: any[]) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="edro-briefings-${Date.now()}.csv"`)
        .send(csvContent);
    } catch (err: any) {
      request.log?.error({ err }, 'export_failed');
      return reply.status(500).send({ success: false, error: 'Erro ao exportar relatório.' });
    }
  });

  app.post('/edro/briefings/:id/generate-creative', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      copy_version_id: z.string().uuid(),
      format: z.string().default('instagram-feed'),
      style: z.string().optional(),
    });

    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    const briefing = await getBriefingById(params.id);
    if (!briefing) {
      return reply.status(404).send({ success: false, error: 'Briefing não encontrado' });
    }

    const copies = await listCopyVersions(params.id);
    const selectedCopy = copies.find((c) => c.id === body.copy_version_id);

    if (!selectedCopy) {
      return reply.status(404).send({ success: false, error: 'Copy não encontrada' });
    }

    try {
      const result = await generateAdCreative({
        copy: selectedCopy.output,
        format: body.format,
        brand: briefing.client_name || undefined,
        style: body.style,
      });

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          error: result.error || 'Erro ao gerar criativo',
        });
      }

      // Store creative in task or attachment table
      const user = resolveUser(request);
      await createTask({
        briefingId: briefing.id,
        type: 'creative_generated',
        assignedTo: user.email || 'system',
        channels: ['portal'],
        payload: {
          copyVersionId: selectedCopy.id,
          imageUrl: result.image_url,
          format: body.format,
          style: body.style,
        },
      });

      return reply.send({
        success: true,
        data: {
          image_url: result.image_url,
          format: body.format,
        },
      });
    } catch (err: any) {
      request.log?.error({ err }, 'generate_creative_failed');
      return reply.status(500).send({
        success: false,
        error: 'Erro ao gerar criativo visual.',
      });
    }
  });

  // ========================================
  // Task Endpoints
  // ========================================

  app.get('/edro/tasks', async (request, reply) => {
    const querySchema = z.object({
      briefing_id: z.string().uuid().optional(),
      status: z.string().optional(),
      type: z.string().optional(),
      assigned_to: z.string().optional(),
    });

    try {
      const filters = querySchema.parse(request.query);
      const tasks = await listAllTasks({
        briefingId: filters.briefing_id,
        status: filters.status,
        type: filters.type,
        assignedTo: filters.assigned_to,
      });

      return reply.send({ success: true, data: tasks });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: 'Invalid query parameters',
          details: err.errors,
        });
      }

      request.log?.error({ err }, 'list_tasks_failed');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list tasks',
      });
    }
  });

  app.get('/edro/tasks/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    try {
      const params = paramsSchema.parse(request.params);
      const task = await getTaskById(params.id);

      if (!task) {
        return reply.status(404).send({
          success: false,
          error: 'Task not found',
        });
      }

      return reply.send({ success: true, data: task });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: 'Invalid task ID',
        });
      }

      request.log?.error({ err }, 'get_task_failed');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get task',
      });
    }
  });

  app.patch('/edro/tasks/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const bodySchema = z.object({
      status: z.string().min(1),
      payload: z.record(z.any()).optional(),
    });

    try {
      const params = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body);

      const task = await getTaskById(params.id);
      if (!task) {
        return reply.status(404).send({
          success: false,
          error: 'Task not found',
        });
      }

      const updatedTask = await updateTaskStatus({
        taskId: params.id,
        status: body.status,
        payload: body.payload,
      });

      return reply.send({
        success: true,
        data: updatedTask,
        message: 'Task updated successfully',
      });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request',
          details: err.errors,
        });
      }

      request.log?.error({ err }, 'update_task_failed');
      return reply.status(500).send({
        success: false,
        error: 'Failed to update task',
      });
    }
  });

  // ── Learning Loop Endpoints ───────────────────────────────────────

  app.get('/edro/clients/:clientId/learning/preferences', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const tenantId = (request.user as any)?.tenant_id;
    if (!tenantId) return reply.status(400).send({ success: false, error: 'tenant_id required' });

    const preferences = await getClientPreferences({ tenant_id: tenantId, client_id: clientId });
    return reply.send({ success: true, data: preferences });
  });

  app.post('/edro/clients/:clientId/learning/rebuild', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const tenantId = (request.user as any)?.tenant_id;
    if (!tenantId) return reply.status(400).send({ success: false, error: 'tenant_id required' });

    const preferences = await rebuildClientPreferences({ tenant_id: tenantId, client_id: clientId });
    return reply.send({ success: true, data: preferences });
  });

  // ── A/B Testing Endpoints ──────────────────────────────────────

  app.post('/edro/briefings/:id/ab-test', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({
      variant_a_id: z.string().uuid(),
      variant_b_id: z.string().uuid(),
      metric: z.enum(['engagement', 'clicks', 'conversions', 'score']).default('engagement'),
    }).parse(request.body);

    const test = await createABTest({ briefing_id: id, ...body });
    return reply.send({ success: true, data: test });
  });

  app.get('/edro/briefings/:id/ab-tests', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const tests = await listABTests(id);

    // Enrich with results
    const enriched = await Promise.all(
      tests.map(async (t) => {
        const results = await getABResults(t.id);
        return { ...t, results };
      }),
    );
    return reply.send({ success: true, data: enriched });
  });

  app.patch('/edro/ab-tests/:testId/result', async (request, reply) => {
    const { testId } = z.object({ testId: z.string().uuid() }).parse(request.params);
    const body = z.object({
      variant_id: z.string().uuid(),
      impressions: z.number().int().min(0).optional(),
      clicks: z.number().int().min(0).optional(),
      engagement: z.number().min(0).optional(),
      conversions: z.number().int().min(0).optional(),
      score: z.number().min(0).max(100).optional(),
    }).parse(request.body);

    const result = await recordABResult({ test_id: testId, ...body });
    return reply.send({ success: true, data: result });
  });

  app.post('/edro/ab-tests/:testId/declare-winner', async (request, reply) => {
    const { testId } = z.object({ testId: z.string().uuid() }).parse(request.params);
    const tenantId = (request.user as any)?.tenant_id;

    const test = await declareWinner({ test_id: testId, tenant_id: tenantId });
    return reply.send({ success: true, data: test });
  });

  app.delete('/edro/ab-tests/:testId', async (request, reply) => {
    const { testId } = z.object({ testId: z.string().uuid() }).parse(request.params);
    const test = await cancelABTest(testId);
    return reply.send({ success: true, data: test });
  });

  // ── Predictive Intelligence Endpoints ─────────────────────────────

  app.get('/edro/clients/:clientId/predictive', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const tenantId = (request.user as any)?.tenant_id;
    if (!tenantId) return reply.status(400).send({ success: false, error: 'tenant_id required' });

    const insights = await buildPredictiveInsights({ tenant_id: tenantId, client_id: clientId });
    return reply.send({ success: true, data: insights });
  });

  app.post('/edro/clients/:clientId/predictive/engagement', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const body = z.object({
      platform: z.string(),
      format: z.string(),
      day_of_week: z.number().int().min(0).max(6).optional(),
      hour: z.number().int().min(0).max(23).optional(),
    }).parse(request.body);

    const prediction = await predictEngagement({ client_id: clientId, ...body });
    return reply.send({ success: true, data: { predicted_engagement: prediction } });
  });

  // ── Benchmark Endpoints ──────────────────────────────────────────

  app.get('/edro/benchmarks/:industry', async (request, reply) => {
    const { industry } = z.object({ industry: z.string() }).parse(request.params);
    const tenantId = (request.user as any)?.tenant_id;
    if (!tenantId) return reply.status(400).send({ success: false, error: 'tenant_id required' });

    const benchmarks = await getIndustryBenchmarks({ tenant_id: tenantId, industry });
    return reply.send({ success: true, data: benchmarks });
  });

  app.post('/edro/benchmarks/rebuild', async (request, reply) => {
    const tenantId = (request.user as any)?.tenant_id;
    if (!tenantId) return reply.status(400).send({ success: false, error: 'tenant_id required' });

    const benchmarks = await buildIndustryBenchmarks({ tenant_id: tenantId });
    return reply.send({ success: true, data: benchmarks });
  });

  app.get('/edro/clients/:clientId/benchmark-comparison', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const tenantId = (request.user as any)?.tenant_id;
    if (!tenantId) return reply.status(400).send({ success: false, error: 'tenant_id required' });

    const comparison = await compareClientToIndustry({ tenant_id: tenantId, client_id: clientId });
    return reply.send({ success: true, data: comparison });
  });

  // ── Perplexity AI Search Endpoints ──────────────────────────────

  app.get('/edro/perplexity/status', async (_request, reply) => {
    return reply.send({ success: true, data: { configured: isPerplexityConfigured() } });
  });

  app.post('/edro/perplexity/search', async (request, reply) => {
    const body = z.object({
      query: z.string().min(3).max(1000),
      model: z.enum(['sonar', 'sonar-pro', 'sonar-reasoning-pro']).optional(),
      search_recency_filter: z.enum(['hour', 'day', 'week', 'month', 'year']).optional(),
      search_domain_filter: z.array(z.string()).optional(),
      max_tokens: z.number().int().min(100).max(4096).optional(),
    }).parse(request.body);

    const result = await searchPerplexity(body);
    return reply.send({ success: true, data: result });
  });

  app.post('/edro/clients/:clientId/perplexity/trending', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const tenantId = (request.user as any)?.tenant_id;
    if (!tenantId) return reply.status(400).send({ success: false, error: 'tenant_id required' });

    // Fetch client keywords for trending search
    const { rows: clients } = await query(
      `SELECT name, profile FROM clients WHERE id = $1 AND tenant_id = $2`,
      [clientId, tenantId],
    );
    const client = clients[0] as any;
    if (!client) return reply.status(404).send({ success: false, error: 'Client not found' });

    const profile = typeof client.profile === 'string' ? JSON.parse(client.profile) : client.profile || {};
    const keywords = Array.isArray(profile.keywords) ? profile.keywords : [];

    const result = await searchTrendingTopics({
      client_name: client.name,
      keywords: keywords.length ? keywords : [client.name],
      segment: profile.segment || undefined,
    });
    return reply.send({ success: true, data: result });
  });

  app.post('/edro/perplexity/enrich-clipping', async (request, reply) => {
    const body = z.object({
      title: z.string(),
      snippet: z.string().optional().default(''),
      url: z.string(),
      client_keywords: z.array(z.string()).optional(),
    }).parse(request.body);

    const result = await enrichClippingItem(body);
    return reply.send({ success: true, data: result });
  });

  app.post('/edro/perplexity/research-competitor', async (request, reply) => {
    const body = z.object({
      client_name: z.string(),
      segment: z.string(),
      platforms: z.array(z.string()).optional(),
    }).parse(request.body);

    const result = await researchCompetitorActivity(body);
    return reply.send({ success: true, data: result });
  });

  app.post('/edro/perplexity/research-for-copy', async (request, reply) => {
    const body = z.object({
      topic: z.string(),
      platform: z.string(),
      objective: z.string(),
    }).parse(request.body);

    const result = await researchForCopy(body);
    return reply.send({ success: true, data: result });
  });
}
