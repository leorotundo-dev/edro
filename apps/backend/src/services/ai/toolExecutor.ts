/**
 * Tool executor for the Jarvis AI Agent.
 * Implements all 22 tools with DB queries and service calls.
 */

import { query } from '../../db';
import {
  createBriefing,
  createBriefingStages,
  createCopyVersion,
  getBriefingById,
  listBriefings,
  deleteBriefing,
  archiveBriefing,
  updateTaskStatus,
} from '../../repositories/edroBriefingRepository';
import { getClientById } from '../../repos/clientsRepo';
import { generateCopy } from './copyService';
import { listClientDocuments, listClientSources, getLatestClientInsight } from '../../repos/clientIntelligenceRepo';
import { tavilySearch, tavilyExtract, isTavilyConfigured } from '../tavilyService';
import { logTavilyUsage } from './aiUsageLogger';
import { generateCampaignStrategy } from './agentPlanner';
import { generateBehavioralDraft } from './agentWriter';
import { auditDraftContent } from './agentAuditor';
import { tagCopy } from './agentTagger';
import { loadBehaviorProfiles, recomputeClientBehaviorProfiles } from '../behaviorClusteringService';
import { loadLearningRules, recomputeClientLearningRules } from '../learningEngine';
import { orchestrateCreative } from './artDirectorOrchestrator';
import { createLibraryItem } from '../../library/libraryRepo';
import { generatePautaSuggestions } from '../pautaSuggestionService';
import { recordPreferenceFeedback } from '../preferenceEngine';
import { analyzeCognitiveLoad } from '../cognitiveLoadService';
import { generateWithProvider } from './copyOrchestrator';
import { enqueueJob } from '../../jobs/jobQueue';
import crypto from 'crypto';

// ── Types ──────────────────────────────────────────────────────

export type ToolContext = {
  tenantId: string;
  clientId: string;         // TEXT id from clients table
  edroClientId: string | null; // UUID from edro_clients table
  userId?: string;
  userEmail?: string;
};

export type OperationsToolContext = {
  tenantId: string;
  userId?: string;
  userEmail?: string;
};

export type ToolResult = {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: { row_count?: number; truncated?: boolean };
};

const MAX_RESULT_CHARS = 4000;
const CLIENT_EVIDENCE_SOURCE_TYPES = [
  'meeting',
  'meeting_chat',
  'whatsapp_message',
  'whatsapp_insight',
  'whatsapp_digest',
  'client_document',
] as const;

type ClientEvidenceSourceType = typeof CLIENT_EVIDENCE_SOURCE_TYPES[number];

function truncateResult(result: ToolResult): ToolResult {
  const json = JSON.stringify(result.data);
  if (json && json.length > MAX_RESULT_CHARS) {
    const truncateValue = (value: any, depth = 0): any => {
      if (value == null) return value;
      if (typeof value === 'string') {
        return value.length > 280 ? `${value.slice(0, 279)}…` : value;
      }
      if (typeof value !== 'object') return value;
      if (depth >= 2) return '[truncated]';
      if (Array.isArray(value)) {
        return value.slice(0, 6).map((item) => truncateValue(item, depth + 1));
      }
      return Object.fromEntries(
        Object.entries(value)
          .slice(0, 16)
          .map(([key, nested]) => [key, truncateValue(nested, depth + 1)]),
      );
    };
    return {
      ...result,
      data: truncateValue(result.data),
      metadata: { ...result.metadata, truncated: true },
    };
  }
  return result;
}

function safeData(data: any, maxItems = 10): any {
  if (Array.isArray(data) && data.length > maxItems) {
    return {
      items: data.slice(0, maxItems),
      total: data.length,
      showing: maxItems,
    };
  }
  return data;
}

function normalizeCreativePlatform(platform?: string | null) {
  const value = String(platform || '').trim().toLowerCase();
  if (!value) return 'Instagram';
  if (value === 'linkedin') return 'LinkedIn';
  if (value === 'tiktok') return 'TikTok';
  if (value === 'facebook') return 'Facebook';
  if (value === 'youtube') return 'YouTube';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeCreativeFormat(format?: string | null) {
  const value = String(format || '').trim().toLowerCase();
  if (!value || value === 'post' || value === 'feed') return 'Feed 1:1';
  if (value.includes('reels') || value.includes('reel')) return 'Reels 9:16';
  if (value.includes('stories') || value.includes('story')) return 'Story 9:16';
  if (value.includes('carousel') || value.includes('carrossel')) return 'Carousel 1:1';
  if (value.includes('video')) return 'Video 16:9';
  return format || 'Feed 1:1';
}

function deriveBriefingTitleFromRequest(request: string, explicitTitle?: string | null) {
  const trimmed = String(explicitTitle || '').trim();
  if (trimmed) return trimmed.slice(0, 140);
  const normalized = String(request || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Novo post';
  const sentence = normalized.split(/[.!?]/)[0]?.trim() || normalized;
  return sentence.slice(0, 140);
}

function tokenizeEvidenceQuestion(question: string) {
  const stopwords = new Set([
    'a', 'o', 'os', 'as', 'de', 'do', 'da', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
    'um', 'uma', 'uns', 'umas', 'que', 'como', 'qual', 'quais', 'pra', 'para', 'com', 'sem',
    'foi', 'sao', 'são', 'por', 'sobre', 'cliente', 'jarvis', 'falou', 'disse', 'pediu', 'falando',
    'reuniao', 'reunião', 'whatsapp', 'zap',
  ]);
  const tokens = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopwords.has(token));
  return Array.from(new Set(tokens)).slice(0, 8);
}

function scoreEvidence(questionTokens: string[], haystack: string, occurredAt?: string | null) {
  const normalized = String(haystack || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let score = 0;
  for (const token of questionTokens) {
    if (normalized.includes(token)) score += 5;
  }

  if (occurredAt) {
    const timestamp = new Date(occurredAt).getTime();
    if (!Number.isNaN(timestamp)) {
      const daysAgo = (Date.now() - timestamp) / 86400000;
      if (daysAgo <= 7) score += 3;
      else if (daysAgo <= 30) score += 1;
    }
  }

  return score;
}

function buildEvidenceExcerpt(value: string | null | undefined, maxChars = 280) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

function getToolTimeoutMs(toolName: string) {
  switch (toolName) {
    case 'create_post_pipeline':
      return 45000;
    case 'generate_campaign_strategy':
    case 'generate_behavioral_copy':
      return 20000;
    default:
      return 10000;
  }
}

// ── Main Dispatcher ────────────────────────────────────────────

const TOOL_MAP: Record<string, (args: any, ctx: ToolContext) => Promise<ToolResult>> = {
  list_briefings: toolListBriefings,
  get_briefing: toolGetBriefing,
  create_briefing: toolCreateBriefing,
  update_briefing_status: toolUpdateBriefingStatus,
  generate_copy_for_briefing: toolGenerateCopy,
  list_upcoming_events: toolListUpcomingEvents,
  search_events: toolSearchEvents,
  get_event_relevance: toolGetEventRelevance,
  add_calendar_event: toolAddCalendarEvent,
  create_campaign: toolCreateCampaign,
  generate_campaign_strategy: toolGenerateCampaignStrategy,
  generate_behavioral_copy: toolGenerateBehavioralCopy,
  add_library_note: toolAddLibraryNote,
  add_library_url: toolAddLibraryUrl,
  create_briefing_from_clipping: toolCreateBriefingFromClipping,
  pin_clipping_item: toolPinClippingItem,
  archive_clipping_item: toolArchiveClippingItem,
  search_clipping: toolSearchClipping,
  get_clipping_item: toolGetClippingItem,
  list_clipping_sources: toolListClippingSources,
  list_social_trends: toolListSocialTrends,
  search_social_mentions: toolSearchSocialMentions,
  list_social_keywords: toolListSocialKeywords,
  search_library: toolSearchLibrary,
  list_library_items: toolListLibraryItems,
  list_campaigns: toolListCampaigns,
  get_campaign: toolGetCampaign,
  list_opportunities: toolListOpportunities,
  action_opportunity: toolActionOpportunity,
  get_client_profile: toolGetClientProfile,
  get_intelligence_health: toolGetIntelligenceHealth,
  search_client_content: toolSearchClientContent,
  list_client_sources: toolListClientSources,
  get_client_insights: toolGetClientInsights,
  retrieve_client_evidence: toolRetrieveClientEvidence,
  create_post_pipeline: toolCreatePostPipeline,
  web_search: toolWebSearch,
  web_extract: toolWebExtract,
  web_research: toolWebResearch,
  // Grupo 1 — Lifecycle de Briefings
  delete_briefing: toolDeleteBriefing,
  archive_briefing: toolArchiveBriefing,
  generate_approval_link: toolGenerateApprovalLink,
  schedule_briefing: toolScheduleBriefing,
  // Grupo 2 — Workflow
  update_task: toolUpdateTask,
  generate_strategic_brief: toolGenerateStrategicBrief,
  // Grupo 3 — Inteligência Comportamental
  compute_behavior_profiles: toolComputeBehaviorProfiles,
  compute_learning_rules: toolComputeLearningRules,
  // Grupo 4 — Pauta Inbox
  generate_pauta: toolGeneratePauta,
  list_pauta_inbox: toolListPautaInbox,
  approve_pauta: toolApprovePauta,
  reject_pauta: toolRejectPauta,
  // Grupo 5 — Fontes de Clipping
  add_clipping_source: toolAddClippingSource,
  pause_clipping_source: toolPauseClippingSource,
  resume_clipping_source: toolResumeClippingSource,
  // Grupo 6 — Análise
  analyze_cognitive_load: toolAnalyzeCognitiveLoad,
  // Grupo 7 — Consulta Multi-IA
  consult_gemini: toolConsultGemini,
  consult_openai: toolConsultOpenAI,
  // Grupo 8 — WhatsApp / Grupos
  search_whatsapp_messages: toolSearchWhatsAppMessages,
  list_whatsapp_groups: toolListWhatsAppGroups,
  get_whatsapp_insights: toolGetWhatsAppInsights,
  get_whatsapp_digests: toolGetWhatsAppDigests,
  // Grupo 9 — Briefing Inteligente de Jobs
  get_job_briefing: toolGetJobBriefing,
  fill_job_briefing: toolFillJobBriefing,
  submit_job_briefing: toolSubmitJobBriefing,
  approve_job_briefing: toolApproveJobBriefing,
  get_job_creative_drafts: toolGetJobCreativeDrafts,
  approve_creative_draft: toolApproveCreativeDraft,
  regenerate_creative_draft: toolRegenerateCreativeDraft,
};

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const handler = TOOL_MAP[toolName];
  // Fall through to operations tool map — ToolContext satisfies OperationsToolContext
  if (!handler) {
    const opsHandler = OPS_TOOL_MAP[toolName];
    if (opsHandler) return executeOperationsTool(toolName, args, ctx);
    return { success: false, error: `Tool '${toolName}' not found` };
  }
  try {
    const timeoutMs = getToolTimeoutMs(toolName);
    const result = await Promise.race([
      handler(args, ctx),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error(`TOOL_TIMEOUT_${Math.round(timeoutMs / 1000)}s`)), timeoutMs),
      ),
    ]);
    return truncateResult(result);
  } catch (err: any) {
    console.error(`[toolExecutor] ${toolName} failed:`, err.message);
    return { success: false, error: err.message || 'Tool execution failed' };
  }
}

// ── Briefings & Workflow ───────────────────────────────────────

async function toolListBriefings(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.edroClientId) return { success: false, error: 'Client not found in edro_clients' };
  const limit = Math.min(args.limit || 10, 20);
  const params: any[] = [ctx.edroClientId];
  let where = 'WHERE client_id = $1::uuid';
  if (args.status) {
    params.push(args.status);
    where += ` AND status = $${params.length}`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT id, title, status, source, created_at, updated_at,
            (payload->>'objective') as objective,
            (payload->>'platform') as platform,
            due_at
     FROM edro_briefings ${where}
     ORDER BY created_at DESC LIMIT $${params.length}`,
    params,
  );
  return { success: true, data: safeData(rows), metadata: { row_count: rows.length } };
}

async function toolGetBriefing(args: any, ctx: ToolContext): Promise<ToolResult> {
  const briefing = await getBriefingById(args.briefing_id);
  if (!briefing) return { success: false, error: 'Briefing not found' };
  // Get stages
  const { rows: stages } = await query(
    `SELECT stage, status, position FROM edro_briefing_stages WHERE briefing_id = $1 ORDER BY position`,
    [args.briefing_id],
  );
  // Get copies (last 3)
  const { rows: copies } = await query(
    `SELECT id, language, model, output, created_at FROM edro_copy_versions
     WHERE briefing_id = $1 ORDER BY created_at DESC LIMIT 3`,
    [args.briefing_id],
  );
  // Get tasks
  const { rows: tasks } = await query(
    `SELECT id, type, status, assigned_to, channels FROM edro_tasks
     WHERE briefing_id = $1 ORDER BY created_at DESC`,
    [args.briefing_id],
  );
  return {
    success: true,
    data: {
      ...briefing,
      stages,
      copies: copies.map((c: any) => ({ ...c, output: (c.output || '').slice(0, 500) })),
      tasks,
    },
  };
}

async function toolCreateBriefing(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.edroClientId) return { success: false, error: 'Client not found in edro_clients' };
  const briefing = await createBriefing({
    clientId: ctx.edroClientId,
    title: args.title,
    payload: {
      objective: args.objective ?? null,
      platform: args.platform ?? null,
      format: args.format ?? null,
      notes: args.notes ?? null,
      channels: args.channels ?? null,
      source: 'planning_chat_tool',
    },
    createdBy: ctx.userEmail ?? null,
    dueAt: args.deadline ? new Date(args.deadline) : null,
    source: 'planning_chat_tool',
  });
  await createBriefingStages(briefing.id, ctx.userEmail ?? null).catch(() => {});
  return {
    success: true,
    data: { id: briefing.id, title: briefing.title, status: briefing.status },
  };
}

async function toolUpdateBriefingStatus(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { rows } = await query(
    `UPDATE edro_briefings SET status = $1, updated_at = now()
     WHERE id = $2 RETURNING id, title, status`,
    [args.status, args.briefing_id],
  );
  if (!rows[0]) return { success: false, error: 'Briefing not found' };
  return { success: true, data: rows[0] };
}

async function toolGenerateCopy(args: any, ctx: ToolContext): Promise<ToolResult> {
  const briefing = await getBriefingById(args.briefing_id);
  if (!briefing) return { success: false, error: 'Briefing not found' };
  const client = await getClientById(ctx.tenantId, ctx.clientId);
  const count = Math.min(args.count || 3, 5);
  const language = args.language || 'pt';
  const payload = (briefing as any).payload || {};

  const promptLines = [
    `Cliente: ${client?.name || 'Cliente'}`,
    client?.segment_primary ? `Segmento: ${client.segment_primary}` : null,
    `Briefing: ${(briefing as any).title}`,
    payload.objective ? `Objetivo: ${payload.objective}` : null,
    payload.platform ? `Plataforma: ${payload.platform}` : null,
    payload.format ? `Formato: ${payload.format}` : null,
    args.instructions ? `Instruções: ${args.instructions}` : null,
    `Gere ${count} opções completas de copy.`,
    `Cada opção deve conter: Headline, Corpo e CTA.`,
    `Idioma: ${language}.`,
  ].filter(Boolean) as string[];

  const copyResult = await generateCopy({
    prompt: promptLines.join('\n'),
    taskType: 'social_post',
  });

  const copyVersion = await createCopyVersion({
    briefingId: briefing.id,
    language,
    model: copyResult.model,
    prompt: promptLines.join('\n'),
    output: copyResult.output,
    payload: copyResult.payload,
    createdBy: ctx.userEmail ?? null,
  });

  return {
    success: true,
    data: {
      copy_id: copyVersion.id,
      briefing_title: (briefing as any).title,
      model: copyResult.model,
      preview: copyResult.output.slice(0, 600),
    },
  };
}

// ── Calendario & Eventos ───────────────────────────────────────

async function toolListUpcomingEvents(args: any, ctx: ToolContext): Promise<ToolResult> {
  const days = Math.min(args.days || 14, 60);
  const params: any[] = [];
  let catFilter = '';
  if (args.categories?.length) {
    params.push(args.categories);
    catFilter = `AND categories && $${params.length}`;
  }
  const { rows } = await query(
    `SELECT id, name, date, categories, base_relevance, scope
     FROM events
     WHERE date IS NOT NULL AND length(date) = 10
       AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD')
       AND date <= to_char(CURRENT_DATE + INTERVAL '${days} days', 'YYYY-MM-DD')
       ${catFilter}
     ORDER BY date, base_relevance DESC
     LIMIT 20`,
    params,
  );
  return { success: true, data: safeData(rows), metadata: { row_count: rows.length } };
}

async function toolSearchEvents(args: any, ctx: ToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 10, 20);
  const year = args.year || new Date().getFullYear();
  const { rows } = await query(
    `SELECT id, name, date, categories, base_relevance
     FROM events
     WHERE LOWER(name) LIKE $1
       AND (year IS NULL OR year = $2 OR date LIKE $3)
     ORDER BY base_relevance DESC, date
     LIMIT $4`,
    [`%${(args.query || '').toLowerCase()}%`, year, `${year}%`, limit],
  );
  return { success: true, data: safeData(rows), metadata: { row_count: rows.length } };
}

async function toolGetEventRelevance(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { rows } = await query(
    `SELECT cer.relevance_score, cer.is_relevant, cer.relevance_reason,
            e.name, e.date, e.categories, e.base_relevance
     FROM calendar_event_relevance cer
     JOIN events e ON e.id = cer.calendar_event_id
     WHERE cer.calendar_event_id = $1
       AND cer.client_id = $2
       AND cer.tenant_id = $3::uuid`,
    [args.event_id, ctx.clientId, ctx.tenantId],
  );
  if (!rows[0]) {
    // Fallback: return base event info
    const { rows: ev } = await query(`SELECT id, name, date, categories, base_relevance FROM events WHERE id = $1`, [args.event_id]);
    if (!ev[0]) return { success: false, error: 'Event not found' };
    return { success: true, data: { ...ev[0], relevance_score: null, note: 'No custom relevance calculated for this client' } };
  }
  return { success: true, data: rows[0] };
}

async function toolAddCalendarEvent(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { title, event_date, description, category, event_id, notes } = args;

  if (!title || !event_date) {
    return { success: false, error: 'title e event_date são obrigatórios.' };
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
    return { success: false, error: 'event_date deve estar no formato YYYY-MM-DD.' };
  }

  // Path A: associar evento global existente ao cliente via override
  if (event_id) {
    await query(
      `INSERT INTO calendar_event_overrides
         (tenant_id, calendar_event_id, client_id, force_include, notes)
       VALUES ($1::uuid, $2, $3, true, $4)
       ON CONFLICT (tenant_id, calendar_event_id, client_id)
       DO UPDATE SET force_include = true, notes = EXCLUDED.notes, updated_at = now()`,
      [ctx.tenantId, event_id, ctx.clientId, notes || null],
    );
    return {
      success: true,
      data: {
        message: `"${title}" adicionado ao calendário do cliente.`,
        event_id,
        date: event_date,
        type: 'override',
      },
    };
  }

  // Path B: criar evento personalizado em calendar_events (requer edroClientId UUID)
  if (!ctx.edroClientId) {
    return { success: false, error: 'Cliente não localizado no sistema de calendário. Tente fornecer o event_id do evento.' };
  }

  const { rows } = await query(
    `INSERT INTO calendar_events (client_id, title, description, event_date, category, source)
     VALUES ($1::uuid, $2, $3, $4::date, $5, 'jarvis')
     ON CONFLICT DO NOTHING
     RETURNING id, title, event_date, category`,
    [ctx.edroClientId, title, description || null, event_date, category || 'comemorativo'],
  );

  if (!rows[0]) {
    return { success: false, error: 'Não foi possível criar o evento (possível duplicata).' };
  }

  return {
    success: true,
    data: {
      message: `"${title}" criado no calendário do cliente para ${event_date}.`,
      event: rows[0],
      type: 'custom',
    },
  };
}

// ── Campanhas ─────────────────────────────────────────────────

async function toolCreateCampaign(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { name, objective, platforms, start_date, end_date, budget_brl } = args;

  if (!name || !objective || !start_date) {
    return { success: false, error: 'name, objective e start_date são obrigatórios.' };
  }

  const platformList: string[] = Array.isArray(platforms) && platforms.length
    ? platforms
    : ['instagram'];

  // Build minimal formats (1 Feed per platform)
  const formatRows: any[] = [];
  for (const platform of platformList) {
    const { rows } = await query(
      `INSERT INTO campaign_formats
         (tenant_id, client_id, format_name, platform, production_type, status)
       VALUES ($1, $2, $3, $4, 'digital', 'pending')
       RETURNING id, format_name, platform`,
      [ctx.tenantId, ctx.clientId, 'Feed', platform],
    );
    if (rows[0]) formatRows.push(rows[0]);
  }

  const { rows: [campaign] } = await query(
    `INSERT INTO campaigns
       (tenant_id, client_id, name, objective, budget_brl, start_date, end_date, status,
        phases, audiences, behavior_intents)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'active','[]','[]','[]')
     RETURNING id, name, objective, start_date, end_date, status`,
    [ctx.tenantId, ctx.clientId, name, objective, budget_brl ?? null, start_date, end_date ?? null],
  );

  // Update formats to link to the campaign
  if (formatRows.length > 0) {
    await query(
      `UPDATE campaign_formats SET campaign_id=$1 WHERE id = ANY($2::uuid[])`,
      [campaign.id, formatRows.map((f) => f.id)],
    );
  }

  return {
    success: true,
    data: {
      message: `Campanha "${name}" criada. Use generate_campaign_strategy para gerar a estratégia comportamental.`,
      campaign,
      formats: formatRows,
    },
  };
}

async function toolGenerateCampaignStrategy(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { campaign_id } = args;
  if (!campaign_id) return { success: false, error: 'campaign_id obrigatório.' };

  const { rows: [campaign] } = await query(
    `SELECT id, name, objective, client_id FROM campaigns WHERE id=$1 AND tenant_id=$2`,
    [campaign_id, ctx.tenantId],
  );
  if (!campaign) return { success: false, error: 'Campanha não encontrada.' };

  const { rows: [client] } = await query(
    `SELECT segment_primary, profile FROM clients WHERE id=$1 AND tenant_id=$2`,
    [campaign.client_id, ctx.tenantId],
  );
  const personas: any[] = client?.profile?.personas ?? [];

  let behaviorClusters: any[] = [];
  let learningRules: any[] = [];
  try {
    [behaviorClusters, learningRules] = await Promise.all([
      loadBehaviorProfiles(ctx.tenantId, campaign.client_id),
      loadLearningRules(ctx.tenantId, campaign.client_id),
    ]);
  } catch { /* non-blocking */ }

  const strategy = await generateCampaignStrategy({
    campaignName: campaign.name,
    campaignObjective: campaign.objective ?? '',
    clientSegment: client?.segment_primary ?? '',
    personas,
    behaviorClusters: behaviorClusters.length ? behaviorClusters : undefined,
    learningRules: learningRules.length ? learningRules : undefined,
  });

  await query(
    `UPDATE campaigns
     SET phases=$3::jsonb, audiences=$4::jsonb, behavior_intents=$5::jsonb, updated_at=now()
     WHERE id=$1 AND tenant_id=$2`,
    [campaign_id, ctx.tenantId, JSON.stringify(strategy.phases), JSON.stringify(strategy.audiences), JSON.stringify(strategy.behavior_intents)],
  );

  return {
    success: true,
    data: {
      message: `Estratégia gerada para "${campaign.name}". ${strategy.behavior_intents.length} behavior intents criados.`,
      phases: strategy.phases,
      behavior_intents: strategy.behavior_intents,
      concepts: strategy.concepts,
    },
  };
}

async function toolGenerateBehavioralCopy(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { campaign_id, behavior_intent_id, platform, format } = args;
  if (!campaign_id || !behavior_intent_id || !platform) {
    return { success: false, error: 'campaign_id, behavior_intent_id e platform são obrigatórios.' };
  }

  const { rows: [campaign] } = await query(
    `SELECT id, name, objective, client_id, behavior_intents, audiences, phases
     FROM campaigns WHERE id=$1 AND tenant_id=$2`,
    [campaign_id, ctx.tenantId],
  );
  if (!campaign) return { success: false, error: 'Campanha não encontrada.' };

  const { rows: [client] } = await query(
    `SELECT name, segment_primary, profile FROM clients WHERE id=$1 AND tenant_id=$2`,
    [campaign.client_id, ctx.tenantId],
  );

  const intents: any[] = campaign.behavior_intents || [];
  const intent = intents.find((bi: any) => bi.id === behavior_intent_id);
  if (!intent) return { success: false, error: 'Behavior intent não encontrado.' };

  const audiences: any[] = campaign.audiences || [];
  const audience = audiences.find((a: any) => a.id === intent.audience_id);
  const clientProfile = client?.profile || {};
  const personas: any[] = clientProfile.personas || [];
  const matchingPersona = audience?.persona_id
    ? personas.find((p: any) => p.id === audience.persona_id)
    : null;

  let learningRules: any[] = [];
  try { learningRules = await loadLearningRules(ctx.tenantId, campaign.client_id); } catch { /* ok */ }

  const rulesBlock = learningRules.length
    ? `\n\nREGRAS DE APRENDIZADO:\n${learningRules.slice(0, 4).map((r: any) => `  - ${r.effective_pattern}`).join('\n')}`
    : '';

  const persona = {
    name: matchingPersona?.name || audience?.persona_name || 'Público principal',
    role: matchingPersona?.role,
    momento_consciencia: audience?.momento_consciencia || intent.momento,
    language_style: matchingPersona?.language_style || clientProfile.tone,
    forbidden_terms: matchingPersona?.forbidden_terms || clientProfile.forbidden_terms || [],
  };

  const behaviorIntent = {
    amd: intent.amd,
    momento: intent.momento,
    triggers: intent.triggers || [],
    target_behavior: intent.target_behavior,
    phase_id: intent.phase_id,
  };

  const draft = await generateBehavioralDraft({
    platform,
    format: format ?? 'Feed',
    persona,
    behaviorIntent,
    campaignObjective: campaign.objective,
    clientName: client?.name ?? '',
    clientSegment: client?.segment_primary ?? '',
    knowledgeBlock: rulesBlock,
  });

  let auditResult: any = null;
  let tags: any = null;
  try {
    [auditResult, tags] = await Promise.all([
      auditDraftContent({ draft, persona, behaviorIntent }),
      tagCopy(draft.hook_text + ' ' + draft.content_text, platform),
    ]);
  } catch { /* non-blocking */ }

  return {
    success: true,
    data: {
      message: 'Copy comportamental gerado e auditado.',
      hook: draft.hook_text,
      copy: draft.content_text,
      cta: draft.cta_text,
      rationale: draft.behavioral_rationale,
      fogg_scores: auditResult ? {
        motivacao: auditResult.fogg_motivation,
        habilidade: auditResult.fogg_ability,
        prompt: auditResult.fogg_prompt,
      } : null,
      emotional_tone: tags?.emotional_tone ?? null,
      amd: intent.amd,
      triggers: intent.triggers,
    },
  };
}

// ── Biblioteca de Conhecimento ────────────────────────────────

async function toolAddLibraryNote(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { title, content, category, tags, use_in_ai } = args;
  if (!title || !content) return { success: false, error: 'title e content são obrigatórios.' };

  const item = await createLibraryItem({
    tenant_id: ctx.tenantId,
    client_id: ctx.clientId,
    type: 'note',
    title: title.slice(0, 200),
    notes: content,
    description: content.slice(0, 500),
    category: category || 'referencia',
    tags: Array.isArray(tags) ? tags : [],
    weight: 'medium',
    use_in_ai: use_in_ai !== false,
    created_by: ctx.userEmail ?? 'jarvis',
  });

  return {
    success: true,
    data: {
      message: `Nota "${title}" salva na biblioteca e disponível para uso na IA.`,
      library_item_id: item.id,
    },
  };
}

async function toolAddLibraryUrl(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { url, category, tags } = args;
  if (!url) return { success: false, error: 'url é obrigatória.' };

  if (!isTavilyConfigured()) {
    return { success: false, error: 'Extração de URL não configurada neste ambiente.' };
  }

  // Deduplicate
  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM library_items WHERE client_id=$1 AND source_url=$2 LIMIT 1`,
    [ctx.clientId, url],
  );
  if (existing.length > 0) {
    return { success: true, data: { message: 'URL já estava na biblioteca.', library_item_id: existing[0].id, duplicate: true } };
  }

  const t0 = Date.now();
  let extracted: { url: string; content: string; title?: string } | null = null;
  try {
    const result = await tavilyExtract([url], { timeoutMs: 15000 });
    logTavilyUsage({ tenant_id: ctx.tenantId, operation: 'extract', unit_count: 1, feature: 'library_jarvis', duration_ms: Date.now() - t0, metadata: { client_id: ctx.clientId, url } });
    extracted = result.results[0] ?? null;
  } catch (err: any) {
    return { success: false, error: `Falha ao extrair URL: ${err?.message}` };
  }

  if (!extracted?.content || extracted.content.length < 50) {
    return { success: false, error: 'Conteúdo da URL muito curto ou vazio.' };
  }

  const item = await createLibraryItem({
    tenant_id: ctx.tenantId,
    client_id: ctx.clientId,
    type: 'note',
    title: (extracted.title || url).slice(0, 200),
    description: extracted.content.slice(0, 500),
    category: category || 'referencia',
    tags: Array.isArray(tags) ? [...tags, 'importado', 'url'] : ['importado', 'url'],
    weight: 'medium',
    use_in_ai: true,
    source_url: url,
    notes: extracted.content.slice(0, 3000),
    created_by: ctx.userEmail ?? 'jarvis',
  });

  return {
    success: true,
    data: {
      message: `URL extraída e salva na biblioteca: "${extracted.title || url}".`,
      library_item_id: item.id,
    },
  };
}

// ── Clipping Avançado ─────────────────────────────────────────

async function toolCreateBriefingFromClipping(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { clipping_id, platform, format, notes } = args;
  if (!clipping_id) return { success: false, error: 'clipping_id é obrigatório.' };

  const { rows: [item] } = await query(
    `SELECT id, title, snippet, published_at FROM clipping_items WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [clipping_id, ctx.tenantId],
  );
  if (!item) return { success: false, error: 'Item de clipping não encontrado.' };

  const briefing = await createBriefing({
    mainClientId: ctx.clientId,
    title: item.title || 'Briefing de notícia',
    payload: {
      objective: 'engajamento',
      platform: platform || 'instagram',
      format: format || 'Feed',
      notes: notes ? `${notes}\n\nNotícia original: ${item.snippet || ''}` : (item.snippet || ''),
    },
    source: 'clipping',
    createdBy: ctx.userEmail ?? null,
  });

  await createBriefingStages(briefing.id, ctx.userEmail ?? null).catch(() => {});

  return {
    success: true,
    data: {
      message: `Briefing "${briefing.title}" criado a partir da notícia. Acesse em /studio para gerar o copy.`,
      briefing_id: briefing.id,
      title: briefing.title,
      clipping_title: item.title,
    },
  };
}

async function toolPinClippingItem(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { clipping_id } = args;
  if (!clipping_id) return { success: false, error: 'clipping_id é obrigatório.' };

  await query(
    `UPDATE clipping_items SET status='PINNED', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
    [clipping_id, ctx.tenantId],
  );

  await query(
    `INSERT INTO clipping_item_actions (tenant_id, item_id, user_id, action, payload)
     VALUES ($1,$2,$3,'PIN','{}')`,
    [ctx.tenantId, clipping_id, ctx.userId ?? null],
  );

  return { success: true, data: { message: 'Item fixado com sucesso.', clipping_id } };
}

async function toolArchiveClippingItem(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { clipping_id } = args;
  if (!clipping_id) return { success: false, error: 'clipping_id é obrigatório.' };

  await query(
    `UPDATE clipping_items SET status='ARCHIVED', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
    [clipping_id, ctx.tenantId],
  );

  await query(
    `INSERT INTO clipping_item_actions (tenant_id, item_id, user_id, action, payload)
     VALUES ($1,$2,$3,'ARCHIVE','{}')`,
    [ctx.tenantId, clipping_id, ctx.userId ?? null],
  );

  return { success: true, data: { message: 'Item arquivado.', clipping_id } };
}

// ── Clipping & Monitoramento ───────────────────────────────────

async function toolSearchClipping(args: any, ctx: ToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 10, 20);
  const minScore = args.min_score || 0;
  const params: any[] = [ctx.clientId, ctx.tenantId, minScore];

  let recencyFilter = '';
  if (args.recency === '24h') recencyFilter = "AND ci.published_at > NOW() - INTERVAL '24 hours'";
  else if (args.recency === '7d') recencyFilter = "AND ci.published_at > NOW() - INTERVAL '7 days'";
  else if (args.recency === '30d') recencyFilter = "AND ci.published_at > NOW() - INTERVAL '30 days'";

  let searchFilter = '';
  if (args.query) {
    params.push(`%${args.query.toLowerCase()}%`);
    searchFilter = `AND (LOWER(ci.title) LIKE $${params.length} OR LOWER(ci.snippet) LIKE $${params.length})`;
  }

  params.push(limit);
  const { rows } = await query(
    `SELECT ci.id, ci.title, ci.snippet, ci.url, ci.published_at, cm.score, cm.matched_keywords
     FROM clipping_matches cm
     JOIN clipping_items ci ON ci.id = cm.clipping_item_id
     WHERE cm.client_id = $1 AND cm.tenant_id = $2::uuid AND cm.score >= $3
     ${recencyFilter} ${searchFilter}
     ORDER BY cm.score DESC, ci.published_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return {
    success: true,
    data: safeData(rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      snippet: (r.snippet || '').slice(0, 200),
      url: r.url,
      score: r.score,
      keywords: r.matched_keywords,
      published_at: r.published_at,
    }))),
    metadata: { row_count: rows.length },
  };
}

async function toolGetClippingItem(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { rows } = await query(
    `SELECT ci.id, ci.title, ci.snippet, ci.summary, ci.content, ci.url, ci.published_at,
            ci.score, ci.categories, ci.tags, ci.status, ci.author
     FROM clipping_items ci
     WHERE ci.id = $1::uuid AND ci.tenant_id = $2::uuid`,
    [args.item_id, ctx.tenantId],
  );
  if (!rows[0]) return { success: false, error: 'Clipping item not found' };
  const item = rows[0];
  // Truncate content for context window
  if (item.content) item.content = item.content.slice(0, 1000);
  return { success: true, data: item };
}

async function toolListClippingSources(args: any, ctx: ToolContext): Promise<ToolResult> {
  const params: any[] = [ctx.tenantId];
  let typeFilter = '';
  if (args.source_type) {
    params.push(args.source_type);
    typeFilter = `AND type = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT id, name, url, type, is_active, status, last_fetched_at, scope, client_id
     FROM clipping_sources
     WHERE tenant_id = $1::uuid ${typeFilter}
       AND (scope = 'GLOBAL' OR client_id = $2)
     ORDER BY name
     LIMIT 20`,
    [...params, ctx.clientId],
  );
  return { success: true, data: safeData(rows), metadata: { row_count: rows.length } };
}

// ── Social Listening ───────────────────────────────────────────

async function toolListSocialTrends(args: any, ctx: ToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 10, 20);
  const params: any[] = [ctx.tenantId, ctx.clientId];
  let platformFilter = '';
  if (args.platform) {
    params.push(args.platform);
    platformFilter = `AND platform = $${params.length}`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT keyword, platform, mention_count, positive_count, negative_count,
            total_engagement, average_sentiment, period_start, period_end
     FROM social_listening_trends
     WHERE tenant_id = $1::uuid AND (client_id = $2 OR client_id IS NULL)
       ${platformFilter}
     ORDER BY created_at DESC, mention_count DESC
     LIMIT $${params.length}`,
    params,
  );
  return { success: true, data: safeData(rows), metadata: { row_count: rows.length } };
}

async function toolSearchSocialMentions(args: any, ctx: ToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 10, 20);
  const params: any[] = [ctx.tenantId, args.keyword];
  let filters = '';
  if (args.platform) {
    params.push(args.platform);
    filters += ` AND platform = $${params.length}`;
  }
  if (args.sentiment) {
    params.push(args.sentiment);
    filters += ` AND sentiment = $${params.length}`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT id, keyword, platform, content, author, sentiment, sentiment_score,
            engagement_likes, engagement_comments, engagement_shares, published_at
     FROM social_listening_mentions
     WHERE tenant_id = $1::uuid AND keyword ILIKE '%' || $2 || '%'
       ${filters}
     ORDER BY published_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return {
    success: true,
    data: safeData(rows.map((r: any) => ({
      ...r,
      content: (r.content || '').slice(0, 300),
    }))),
    metadata: { row_count: rows.length },
  };
}

async function toolListSocialKeywords(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { rows } = await query(
    `SELECT id, keyword, category, is_active, created_at
     FROM social_listening_keywords
     WHERE tenant_id = $1::uuid AND (client_id = $2 OR client_id IS NULL)
     ORDER BY keyword`,
    [ctx.tenantId, ctx.clientId],
  );
  return { success: true, data: safeData(rows), metadata: { row_count: rows.length } };
}

// ── Biblioteca & Conhecimento ──────────────────────────────────

async function toolSearchLibrary(args: any, ctx: ToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 10, 20);
  const params: any[] = [ctx.tenantId, ctx.clientId, `%${(args.query || '').toLowerCase()}%`];
  let catFilter = '';
  if (args.category) {
    params.push(args.category);
    catFilter = `AND category = $${params.length}`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT li.id, li.type, li.title, li.description, li.category, li.tags,
            li.use_in_ai, li.created_at
     FROM library_items li
     WHERE li.tenant_id = $1::uuid AND li.client_id = $2
       AND (LOWER(li.title) LIKE $3 OR LOWER(li.description) LIKE $3 OR LOWER(li.notes) LIKE $3)
       AND li.status != 'deleted'
       ${catFilter}
     ORDER BY li.weight DESC, li.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return { success: true, data: safeData(rows), metadata: { row_count: rows.length } };
}

async function toolListLibraryItems(args: any, ctx: ToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 10, 20);
  const params: any[] = [ctx.tenantId, ctx.clientId];
  let filters = '';
  if (args.type) {
    params.push(args.type);
    filters += ` AND type = $${params.length}`;
  }
  if (args.category) {
    params.push(args.category);
    filters += ` AND category = $${params.length}`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT id, type, title, description, category, tags, use_in_ai, created_at
     FROM library_items
     WHERE tenant_id = $1::uuid AND client_id = $2 AND status != 'deleted'
       ${filters}
     ORDER BY weight DESC, created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return { success: true, data: safeData(rows), metadata: { row_count: rows.length } };
}

// ── Campanhas ──────────────────────────────────────────────────

async function toolListCampaigns(args: any, ctx: ToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 10, 20);
  const params: any[] = [ctx.tenantId, ctx.clientId];
  let statusFilter = '';
  if (args.status) {
    params.push(args.status);
    statusFilter = `AND status = $${params.length}`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT id, name, objective, budget_brl, start_date, end_date, status, created_at
     FROM campaigns
     WHERE tenant_id = $1::uuid AND client_id = $2
       ${statusFilter}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return { success: true, data: safeData(rows), metadata: { row_count: rows.length } };
}

async function toolGetCampaign(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { rows: campaigns } = await query(
    `SELECT id, name, objective, budget_brl, start_date, end_date, status
     FROM campaigns WHERE id = $1::uuid AND tenant_id = $2::uuid`,
    [args.campaign_id, ctx.tenantId],
  );
  if (!campaigns[0]) return { success: false, error: 'Campaign not found' };

  const { rows: formats } = await query(
    `SELECT id, format_name, platform, production_type, predicted_ml_score,
            predicted_roi_multiplier, estimated_production_cost_min_brl,
            estimated_media_cost_brl, status
     FROM campaign_formats WHERE campaign_id = $1::uuid
     ORDER BY predicted_ml_score DESC`,
    [args.campaign_id],
  );

  const { rows: summary } = await query(
    `SELECT campaign_format_id, total_impressions, total_clicks, total_conversions,
            total_spend_brl, total_revenue_brl, actual_roas, avg_engagement_rate
     FROM format_performance_summary WHERE campaign_format_id = ANY($1::uuid[])`,
    [formats.map((f: any) => f.id)],
  );

  const summaryMap = new Map(summary.map((s: any) => [s.campaign_format_id, s]));
  return {
    success: true,
    data: {
      ...campaigns[0],
      formats: formats.map((f: any) => ({
        ...f,
        performance: summaryMap.get(f.id) || null,
      })),
    },
  };
}

// ── Oportunidades AI ───────────────────────────────────────────

async function toolListOpportunities(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.edroClientId) return { success: false, error: 'Client not found in edro_clients' };
  const limit = Math.min(args.limit || 10, 20);
  const params: any[] = [ctx.edroClientId, ctx.tenantId];
  let priorityFilter = '';
  if (args.priority) {
    params.push(args.priority);
    priorityFilter = `AND priority = $${params.length}`;
  }
  params.push(limit);
  const { rows } = await query(
    `SELECT id, title, description, source, priority, status, confidence, score,
            suggested_action, trending_up, created_at
     FROM ai_opportunities
     WHERE client_id = $1::uuid AND tenant_id = $2::text
       AND status NOT IN ('dismissed')
       ${priorityFilter}
     ORDER BY score DESC, created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return { success: true, data: safeData(rows), metadata: { row_count: rows.length } };
}

async function toolActionOpportunity(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.edroClientId) return { success: false, error: 'Client not found in edro_clients' };

  if (args.action === 'dismiss') {
    const { rows } = await query(
      `UPDATE ai_opportunities SET status = 'dismissed', actioned_at = now(), actioned_by = $1
       WHERE id = $2::uuid AND client_id = $3::uuid
       RETURNING id, title, status`,
      [ctx.userEmail || ctx.userId, args.opportunity_id, ctx.edroClientId],
    );
    if (!rows[0]) return { success: false, error: 'Opportunity not found' };
    return { success: true, data: { ...rows[0], action: 'dismissed' } };
  }

  if (args.action === 'accept') {
    // Get opportunity details
    const { rows: opps } = await query(
      `SELECT id, title, description, suggested_action, source
       FROM ai_opportunities WHERE id = $1::uuid AND client_id = $2::uuid`,
      [args.opportunity_id, ctx.edroClientId],
    );
    if (!opps[0]) return { success: false, error: 'Opportunity not found' };
    const opp = opps[0];

    // Create briefing from opportunity
    const briefing = await createBriefing({
      clientId: ctx.edroClientId,
      title: opp.title,
      payload: {
        objective: opp.suggested_action,
        notes: opp.description,
        source: `opportunity_${opp.source}`,
        opportunity_id: opp.id,
      },
      createdBy: ctx.userEmail ?? null,
      source: 'opportunity_accepted',
    });
    await createBriefingStages(briefing.id, ctx.userEmail ?? null).catch(() => {});

    // Mark opportunity as actioned
    await query(
      `UPDATE ai_opportunities SET status = 'actioned', actioned_at = now(), actioned_by = $1
       WHERE id = $2::uuid`,
      [ctx.userEmail || ctx.userId, args.opportunity_id],
    );

    return {
      success: true,
      data: {
        action: 'accepted',
        opportunity: { id: opp.id, title: opp.title },
        briefing_created: { id: briefing.id, title: briefing.title },
      },
    };
  }

  return { success: false, error: 'Invalid action. Use "accept" or "dismiss".' };
}

// ── Inteligencia do Cliente ────────────────────────────────────

async function toolGetClientProfile(args: any, ctx: ToolContext): Promise<ToolResult> {
  const client = await getClientById(ctx.tenantId, ctx.clientId);
  if (!client) return { success: false, error: 'Client not found' };

  const profile = client.profile || {};
  const knowledge = profile.knowledge_base || {};

  return {
    success: true,
    data: {
      id: client.id,
      name: client.name,
      segment_primary: client.segment_primary,
      segment_secondary: client.segment_secondary,
      country: client.country,
      uf: client.uf,
      city: client.city,
      knowledge_base: {
        description: knowledge.description,
        audience: knowledge.audience,
        brand_promise: knowledge.brand_promise,
        keywords: knowledge.keywords,
        pillars: knowledge.pillars,
        tone_of_voice: knowledge.tone_of_voice,
        competitors: knowledge.competitors,
      },
    },
  };
}

async function toolGetIntelligenceHealth(args: any, ctx: ToolContext): Promise<ToolResult> {
  // Library count
  const { rows: libCount } = await query(
    `SELECT COUNT(*) as total FROM library_items
     WHERE tenant_id = $1::uuid AND client_id = $2 AND status != 'deleted'`,
    [ctx.tenantId, ctx.clientId],
  );

  // Clipping matches count (last 30 days)
  const { rows: clipCount } = await query(
    `SELECT COUNT(*) as total FROM clipping_matches
     WHERE tenant_id = $1::uuid AND client_id = $2
       AND created_at > NOW() - INTERVAL '30 days'`,
    [ctx.tenantId, ctx.clientId],
  );

  // Social keywords count
  const { rows: socialKw } = await query(
    `SELECT COUNT(*) as total FROM social_listening_keywords
     WHERE tenant_id = $1::uuid AND (client_id = $2 OR client_id IS NULL) AND is_active = true`,
    [ctx.tenantId, ctx.clientId],
  );

  // Social mentions (last 7 days)
  const { rows: socialMentions } = await query(
    `SELECT COUNT(*) as total FROM social_listening_mentions
     WHERE tenant_id = $1::uuid AND (client_id = $2 OR client_id IS NULL)
       AND collected_at > NOW() - INTERVAL '7 days'`,
    [ctx.tenantId, ctx.clientId],
  );

  // Opportunities (active)
  let oppCount = 0;
  if (ctx.edroClientId) {
    const { rows: opps } = await query(
      `SELECT COUNT(*) as total FROM ai_opportunities
       WHERE client_id = $1::uuid AND tenant_id = $2::text
         AND status NOT IN ('dismissed', 'actioned')`,
      [ctx.edroClientId, ctx.tenantId],
    );
    oppCount = Number(opps[0]?.total || 0);
  }

  // Briefings (active)
  let briefingCount = 0;
  if (ctx.edroClientId) {
    const { rows: brf } = await query(
      `SELECT COUNT(*) as total FROM edro_briefings
       WHERE client_id = $1::uuid AND status NOT IN ('done', 'cancelled')`,
      [ctx.edroClientId],
    );
    briefingCount = Number(brf[0]?.total || 0);
  }

  return {
    success: true,
    data: {
      library: { total_items: Number(libCount[0]?.total || 0) },
      clipping: { matches_last_30d: Number(clipCount[0]?.total || 0) },
      social_listening: {
        active_keywords: Number(socialKw[0]?.total || 0),
        mentions_last_7d: Number(socialMentions[0]?.total || 0),
      },
      opportunities: { active: oppCount },
      briefings: { active: briefingCount },
    },
  };
}

// ── Client Content & Intelligence ──────────────────────────────

async function toolSearchClientContent(args: any, ctx: ToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 10, 20);
  const keyword = (args.query || '').toLowerCase().trim();

  if (!keyword) {
    // No keyword — return most recent documents
    const docs = await listClientDocuments({ tenantId: ctx.tenantId, clientId: ctx.clientId, limit });
    return {
      success: true,
      data: safeData(docs.map((d: any) => ({
        id: d.id,
        platform: d.platform,
        source_type: d.source_type,
        title: d.title,
        excerpt: (d.content_excerpt || d.content_text || '').slice(0, 200),
        url: d.url,
        published_at: d.published_at,
      }))),
      metadata: { row_count: docs.length },
    };
  }

  const { rows } = await query(
    `SELECT id, platform, source_type, title, content_excerpt, content_text, url, published_at
     FROM client_documents
     WHERE tenant_id = $1::uuid AND client_id = $2
       AND (LOWER(title) LIKE $3 OR LOWER(content_text) LIKE $3)
     ORDER BY published_at DESC NULLS LAST
     LIMIT $4`,
    [ctx.tenantId, ctx.clientId, `%${keyword}%`, limit],
  );

  return {
    success: true,
    data: safeData(rows.map((d: any) => ({
      id: d.id,
      platform: d.platform,
      source_type: d.source_type,
      title: d.title,
      excerpt: (d.content_excerpt || d.content_text || '').slice(0, 200),
      url: d.url,
      published_at: d.published_at,
    }))),
    metadata: { row_count: rows.length },
  };
}

async function toolListClientSources(args: any, ctx: ToolContext): Promise<ToolResult> {
  const sources = await listClientSources({ tenantId: ctx.tenantId, clientId: ctx.clientId, sourceType: args.source_type });
  return {
    success: true,
    data: safeData(sources.map((s: any) => ({
      id: s.id,
      source_type: s.source_type,
      platform: s.platform,
      url: s.url,
      handle: s.handle,
      status: s.status,
      last_fetched_at: s.last_fetched_at,
    }))),
    metadata: { row_count: sources.length },
  };
}

async function toolGetClientInsights(args: any, ctx: ToolContext): Promise<ToolResult> {
  const insight = await getLatestClientInsight({ tenantId: ctx.tenantId, clientId: ctx.clientId });
  if (!insight) {
    return { success: true, data: { message: 'Nenhum insight disponível. O worker de intelligence pode ainda não ter rodado para este cliente.' } };
  }
  return {
    success: true,
    data: {
      id: insight.id,
      period: insight.period,
      created_at: insight.created_at,
      summary: insight.summary,
    },
  };
}

async function toolRetrieveClientEvidence(args: any, ctx: ToolContext): Promise<ToolResult> {
  const question = String(args.question || '').trim();
  if (!question) return { success: false, error: 'question é obrigatória.' };

  const daysBack = Math.min(args.days_back ?? 30, 90);
  const limit = Math.min(args.limit ?? 8, 12);
  const requestedSourceTypes = Array.isArray(args.source_types)
    ? args.source_types.map((value: any) => String(value || '').trim())
    : [];
  const sourceTypes = requestedSourceTypes.length
    ? requestedSourceTypes.filter((value): value is ClientEvidenceSourceType => CLIENT_EVIDENCE_SOURCE_TYPES.includes(value as ClientEvidenceSourceType))
    : [...CLIENT_EVIDENCE_SOURCE_TYPES];

  const tokens = tokenizeEvidenceQuestion(question);
  const hasTokenFilter = tokens.length > 0;
  const sourceSet = new Set<ClientEvidenceSourceType>(sourceTypes);
  const evidence: Array<Record<string, any>> = [];

  if (sourceSet.has('meeting')) {
    const { rows } = await query<any>(
      `SELECT id, title, summary, transcript, recorded_at
         FROM meetings
        WHERE tenant_id = $1
          AND client_id = $2
          AND recorded_at > NOW() - make_interval(days => $3)
        ORDER BY recorded_at DESC
        LIMIT 25`,
      [ctx.tenantId, ctx.clientId, daysBack],
    );
    for (const row of rows) {
      const haystack = [row.title, row.summary, row.transcript].filter(Boolean).join(' \n ');
      const score = scoreEvidence(tokens, haystack, row.recorded_at);
      if (hasTokenFilter && score <= 0) continue;
      evidence.push({
        source_type: 'meeting',
        source_label: 'Reunião',
        source_id: row.id,
        title: row.title || 'Reunião',
        excerpt: buildEvidenceExcerpt(row.summary || row.transcript),
        occurred_at: row.recorded_at,
        score,
      });
    }
  }

  if (sourceSet.has('meeting_chat')) {
    const { rows } = await query<any>(
      `SELECT mcm.id,
              mcm.sender_name,
              mcm.message_text,
              mcm.sent_at,
              m.title AS meeting_title
         FROM meeting_chat_messages mcm
         JOIN meetings m ON m.id = mcm.meeting_id
        WHERE mcm.tenant_id = $1
          AND mcm.client_id = $2
          AND COALESCE(mcm.sent_at, mcm.created_at) > NOW() - make_interval(days => $3)
        ORDER BY COALESCE(mcm.sent_at, mcm.created_at) DESC
        LIMIT 40`,
      [ctx.tenantId, ctx.clientId, daysBack],
    );
    for (const row of rows) {
      const haystack = [row.meeting_title, row.sender_name, row.message_text].filter(Boolean).join(' \n ');
      const score = scoreEvidence(tokens, haystack, row.sent_at);
      if (hasTokenFilter && score <= 0) continue;
      evidence.push({
        source_type: 'meeting_chat',
        source_label: 'Chat da reunião',
        source_id: row.id,
        title: row.meeting_title ? `${row.meeting_title} · ${row.sender_name || 'Participante'}` : (row.sender_name || 'Chat da reunião'),
        excerpt: buildEvidenceExcerpt(row.message_text),
        occurred_at: row.sent_at,
        score,
      });
    }
  }

  if (sourceSet.has('whatsapp_message')) {
    const { rows } = await query<any>(
      `SELECT wgm.id,
              wg.group_name,
              wgm.sender_name,
              wgm.content,
              wgm.created_at
         FROM whatsapp_group_messages wgm
         JOIN whatsapp_groups wg ON wg.id = wgm.group_id
        WHERE wgm.tenant_id = $1
          AND wg.client_id = $2
          AND wgm.created_at > NOW() - make_interval(days => $3)
        ORDER BY wgm.created_at DESC
        LIMIT 40`,
      [ctx.tenantId, ctx.clientId, daysBack],
    );
    for (const row of rows) {
      const haystack = [row.group_name, row.sender_name, row.content].filter(Boolean).join(' \n ');
      const score = scoreEvidence(tokens, haystack, row.created_at);
      if (hasTokenFilter && score <= 0) continue;
      evidence.push({
        source_type: 'whatsapp_message',
        source_label: 'WhatsApp',
        source_id: row.id,
        title: `${row.group_name || 'Grupo'} · ${row.sender_name || 'Contato'}`,
        excerpt: buildEvidenceExcerpt(row.content),
        occurred_at: row.created_at,
        score,
      });
    }
  }

  if (sourceSet.has('whatsapp_insight')) {
    const { rows } = await query<any>(
      `SELECT id, insight_type, summary, sentiment, urgency, created_at
         FROM whatsapp_message_insights
        WHERE tenant_id = $1
          AND client_id = $2
          AND created_at > NOW() - make_interval(days => $3)
        ORDER BY created_at DESC
        LIMIT 25`,
      [ctx.tenantId, ctx.clientId, daysBack],
    );
    for (const row of rows) {
      const haystack = [row.insight_type, row.summary, row.sentiment, row.urgency].filter(Boolean).join(' \n ');
      const score = scoreEvidence(tokens, haystack, row.created_at);
      if (hasTokenFilter && score <= 0) continue;
      evidence.push({
        source_type: 'whatsapp_insight',
        source_label: 'Insight de WhatsApp',
        source_id: row.id,
        title: `Insight · ${row.insight_type || 'mensagem'}`,
        excerpt: buildEvidenceExcerpt(row.summary),
        occurred_at: row.created_at,
        score,
      });
    }
  }

  if (sourceSet.has('whatsapp_digest')) {
    const { rows } = await query<any>(
      `SELECT id, period, summary, key_decisions, pending_actions, created_at
         FROM whatsapp_group_digests
        WHERE tenant_id = $1
          AND client_id = $2
          AND created_at > NOW() - make_interval(days => $3)
        ORDER BY created_at DESC
        LIMIT 20`,
      [ctx.tenantId, ctx.clientId, daysBack],
    );
    for (const row of rows) {
      const haystack = [row.period, row.summary, JSON.stringify(row.key_decisions || []), JSON.stringify(row.pending_actions || [])].join(' \n ');
      const score = scoreEvidence(tokens, haystack, row.created_at);
      if (hasTokenFilter && score <= 0) continue;
      evidence.push({
        source_type: 'whatsapp_digest',
        source_label: 'Digest de WhatsApp',
        source_id: row.id,
        title: `Digest ${row.period || ''}`.trim(),
        excerpt: buildEvidenceExcerpt(row.summary),
        occurred_at: row.created_at,
        score,
      });
    }
  }

  if (sourceSet.has('client_document')) {
    const docs = await listClientDocuments({ tenantId: ctx.tenantId, clientId: ctx.clientId, limit: 40 });
    for (const doc of docs) {
      const occurredAt = doc.published_at || doc.created_at || null;
      if (occurredAt) {
        const timestamp = new Date(occurredAt).getTime();
        if (!Number.isNaN(timestamp) && (Date.now() - timestamp) / 86400000 > daysBack) continue;
      }
      const haystack = [doc.title, doc.content_excerpt, doc.content_text, doc.url].filter(Boolean).join(' \n ');
      const score = scoreEvidence(tokens, haystack, occurredAt);
      if (hasTokenFilter && score <= 0) continue;
      evidence.push({
        source_type: 'client_document',
        source_label: 'Documento do cliente',
        source_id: doc.id,
        title: doc.title || doc.url || 'Documento do cliente',
        excerpt: buildEvidenceExcerpt(doc.content_excerpt || doc.content_text),
        occurred_at: occurredAt,
        score,
      });
    }
  }

  const sortedEvidence = evidence
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return new Date(right.occurred_at || 0).getTime() - new Date(left.occurred_at || 0).getTime();
    })
    .slice(0, limit)
    .map((item) => ({
      source_type: item.source_type,
      source_label: item.source_label,
      source_id: item.source_id,
      title: item.title,
      excerpt: item.excerpt,
      occurred_at: item.occurred_at,
    }));

  return {
    success: true,
    data: {
      message: sortedEvidence.length
        ? `${sortedEvidence.length} evidências recuperadas para a pergunta.`
        : 'Nenhuma evidência relevante encontrada no recorte atual.',
      question,
      searched_sources: sourceTypes,
      total: sortedEvidence.length,
      evidence: sortedEvidence,
    },
    metadata: { row_count: sortedEvidence.length },
  };
}

async function toolCreatePostPipeline(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.edroClientId) return { success: false, error: 'Client not found in edro_clients' };

  const requestText = String(args.request || '').trim();
  if (!requestText) return { success: false, error: 'request é obrigatória.' };

  const client = await getClientById(ctx.tenantId, ctx.clientId);
  if (!client) return { success: false, error: 'Cliente não encontrado.' };

  const platform = String(args.platform || 'instagram').trim().toLowerCase();
  const format = String(args.format || 'post').trim();
  const briefingTitle = deriveBriefingTitleFromRequest(requestText, args.title);
  const objective = String(args.objective || 'engajamento').trim();
  const language = String(args.language || 'pt').trim();

  const briefing = await createBriefing({
    clientId: ctx.edroClientId,
    title: briefingTitle,
    payload: {
      objective,
      platform,
      format,
      notes: requestText,
      source: 'jarvis_create_post_pipeline',
    },
    createdBy: ctx.userEmail ?? null,
    dueAt: args.deadline ? new Date(args.deadline) : null,
    source: 'jarvis_create_post_pipeline',
  });
  await createBriefingStages(briefing.id, ctx.userEmail ?? null).catch(() => {});

  const latestInsight = await getLatestClientInsight({ tenantId: ctx.tenantId, clientId: ctx.clientId }).catch(() => null);
  const recentDocs = await listClientDocuments({ tenantId: ctx.tenantId, clientId: ctx.clientId, limit: 8 }).catch(() => []);
  const recentSocialPosts = recentDocs
    .filter((doc) => String(doc.source_type || '') === 'social')
    .slice(0, 3)
    .map((doc) => buildEvidenceExcerpt(doc.content_excerpt || doc.content_text, 160));

  const copyPrompt = [
    `Cliente: ${client.name}`,
    client.segment_primary ? `Segmento: ${client.segment_primary}` : null,
    `Pedido do usuário: ${requestText}`,
    `Objetivo: ${objective}`,
    `Plataforma: ${platform}`,
    `Formato: ${format}`,
    latestInsight?.summary?.summary_text ? `Insight atual: ${latestInsight.summary.summary_text}` : null,
    recentSocialPosts.length ? `Posts recentes para não repetir: ${recentSocialPosts.join(' | ')}` : null,
    `Gere uma única peça pronta para produção em ${language}.`,
    'Entregue obrigatoriamente: HEADLINE, CORPO, CTA e LEGENDA/CAPTION final.',
  ].filter(Boolean).join('\n');

  const copyResult = await generateCopy({
    prompt: copyPrompt,
    taskType: 'social_post',
  });

  const copyVersion = await createCopyVersion({
    briefingId: briefing.id,
    language,
    model: copyResult.model,
    prompt: copyPrompt,
    output: copyResult.output,
    payload: copyResult.payload,
    createdBy: ctx.userEmail ?? null,
  });

  const profile = (client as any).profile || {};
  const brandColors = Array.isArray(profile.brand_colors) ? profile.brand_colors : [];
  const brandTokens = profile.brand_tokens || null;
  let learningContext = '';
  try {
    const rules = await loadLearningRules(ctx.tenantId, ctx.clientId);
    if (rules.length) {
      learningContext = rules
        .sort((left: any, right: any) => Number(right.uplift_value || 0) - Number(left.uplift_value || 0))
        .slice(0, 5)
        .map((rule: any) => `• ${rule.effective_pattern} (↑${Number(rule.uplift_value || 0).toFixed(1)}% ${rule.uplift_metric})`)
        .join('\n');
    }
  } catch {
    learningContext = '';
  }

  const orchestrated = await orchestrateCreative({
    copy: copyResult.output,
    brand: {
      name: client.name,
      segment: client.segment_primary || '',
      primaryColor: brandColors[0] || '',
    },
    format: normalizeCreativeFormat(format),
    platform: normalizeCreativePlatform(platform),
    tenantId: ctx.tenantId,
    clientId: ctx.clientId,
    learningContext,
    brandTokens,
  });

  let approvalUrl: string | null = null;
  if (args.generate_approval_link !== false) {
    const approvalResult = await toolGenerateApprovalLink({
      briefing_id: briefing.id,
      client_name: client.name,
      expires_in_days: 7,
    }, ctx);
    approvalUrl = approvalResult.success ? approvalResult.data?.approvalUrl || null : null;
  }

  return {
    success: true,
    data: {
      message: `Pipeline criativo montado para ${client.name}: briefing, copy e direção de arte.`,
      briefing_id: briefing.id,
      briefing_title: briefing.title,
      copy_id: copyVersion.id,
      platform,
      format,
      copy_preview: buildEvidenceExcerpt(copyResult.output, 520),
      visual_strategy: orchestrated.visualStrategy
        ? {
            intent: orchestrated.visualStrategy.intent,
            strategy_summary: orchestrated.visualStrategy.strategySummary,
            reference_movements: orchestrated.visualStrategy.referenceMovements,
          }
        : null,
      layout: {
        eyebrow: orchestrated.layout.eyebrow,
        headline: orchestrated.layout.headline,
        cta: orchestrated.layout.cta,
      },
      image_prompt_preview: buildEvidenceExcerpt(orchestrated.imgPrompt.positive, 320),
      approvalUrl,
      next_step: approvalUrl
        ? 'Copy, direção de arte e link de aprovação já foram preparados.'
        : 'Copy e direção de arte já foram preparados. Gere o link de aprovação quando quiser enviar ao cliente.',
    },
  };
}

// ── Web Search (Tavily) ─────────────────────────────────────────

async function toolWebSearch(args: any, ctx: ToolContext): Promise<ToolResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'Web search não configurado. Adicione TAVILY_API_KEY nas variáveis de ambiente.',
    };
  }

  const query: string = (args.query || '').slice(0, 400);
  if (!query.trim()) return { success: false, error: 'Query vazia.' };

  const contextNote = args.context ? ` (contexto: ${args.context})` : '';
  const fullQuery = contextNote ? `${query} ${contextNote}` : query;

  const t0 = Date.now();
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: fullQuery,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.status.toString());
      return { success: false, error: `Tavily error ${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = await res.json() as {
      answer?: string;
      results?: Array<{ title: string; url: string; content: string; score?: number }>;
    };

    const results = (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: (r.content || '').slice(0, 600),
    }));

    logTavilyUsage({
      tenant_id: ctx.tenantId,
      operation: 'search-basic',
      unit_count: 1,
      feature: 'web_search',
      duration_ms: Date.now() - t0,
      metadata: { query: fullQuery, result_count: results.length },
    });

    return {
      success: true,
      data: {
        query: fullQuery,
        answer: data.answer || null,
        results,
      },
      metadata: { row_count: results.length },
    };
  } catch (err: any) {
    return { success: false, error: `Web search falhou: ${err.message}` };
  }
}

// ── Web Extract ─────────────────────────────────────────────────

async function toolWebExtract(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!isTavilyConfigured()) {
    return { success: false, error: 'Web extract não configurado. Adicione TAVILY_API_KEY nas variáveis de ambiente.' };
  }

  const rawUrls = args.urls;
  if (!Array.isArray(rawUrls) || rawUrls.length === 0) {
    return { success: false, error: 'urls deve ser um array não vazio.' };
  }
  const urls = rawUrls.slice(0, 3).map((u: any) => String(u));

  const t0 = Date.now();
  try {
    const result = await tavilyExtract(urls, { timeoutMs: 14000 });

    logTavilyUsage({
      tenant_id: ctx.tenantId,
      operation: 'extract',
      unit_count: urls.length,
      feature: 'web_extract',
      duration_ms: Date.now() - t0,
      metadata: { urls, result_count: result.results.length },
    });

    return {
      success: true,
      data: {
        extracted: result.results,
        failed: result.failed_results ?? [],
      },
      metadata: { row_count: result.results.length },
    };
  } catch (err: any) {
    return { success: false, error: `Web extract falhou: ${err.message}` };
  }
}

// ── Web Research (deep) ─────────────────────────────────────────

async function toolWebResearch(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!isTavilyConfigured()) {
    return { success: false, error: 'Web research não configurado. Adicione TAVILY_API_KEY nas variáveis de ambiente.' };
  }

  const query: string = (args.query || '').slice(0, 400);
  if (!query.trim()) return { success: false, error: 'Query vazia.' };

  const focusHint = args.focus ? ` [foco: ${args.focus}]` : '';

  const t0 = Date.now();
  try {
    const result = await tavilySearch(
      query + focusHint,
      { searchDepth: 'advanced', maxResults: 8, includeAnswer: true, timeoutMs: 14000 }
    );

    logTavilyUsage({
      tenant_id: ctx.tenantId,
      operation: 'search-advanced',
      unit_count: 1,
      feature: 'web_research',
      duration_ms: Date.now() - t0,
      metadata: { query, focus: args.focus || null, result_count: result.results.length },
    });

    return {
      success: true,
      data: {
        query,
        focus: args.focus || null,
        summary: result.answer || null,
        sources: result.results,
      },
      metadata: { row_count: result.results.length },
    };
  } catch (err: any) {
    return { success: false, error: `Web research falhou: ${err.message}` };
  }
}

// ── GRUPO 1: Lifecycle de Briefings ──────────────────────────────

async function toolDeleteBriefing(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { briefing_id } = args;
  if (!briefing_id) return { success: false, error: 'briefing_id é obrigatório.' };
  const deleted = await deleteBriefing(briefing_id);
  if (!deleted) return { success: false, error: 'Briefing não encontrado.' };
  return { success: true, data: { message: 'Briefing deletado permanentemente.' } };
}

async function toolArchiveBriefing(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { briefing_id } = args;
  if (!briefing_id) return { success: false, error: 'briefing_id é obrigatório.' };
  const briefing = await archiveBriefing(briefing_id);
  if (!briefing) return { success: false, error: 'Briefing não encontrado.' };
  return { success: true, data: { message: 'Briefing arquivado com sucesso.', briefing } };
}

async function toolGenerateApprovalLink(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { briefing_id, client_name, expires_in_days } = args;
  if (!briefing_id) return { success: false, error: 'briefing_id é obrigatório.' };

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomBytes(8).toString('hex');
  const days = Math.min(expires_in_days ?? 7, 30);
  const expiresAt = new Date(Date.now() + days * 86400000);

  await query(
    `INSERT INTO edro_approval_tokens (briefing_id, token, client_name, expires_at, tenant_id)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING`,
    [briefing_id, token, client_name ?? null, expiresAt, ctx.tenantId]
  );

  const approvalUrl = `${process.env.WEB_URL ?? 'https://edro-production.up.railway.app'}/edro/aprovacao-externa?token=${token}`;
  return { success: true, data: { approvalUrl, expiresAt: expiresAt.toISOString(), token, expires_in_days: days } };
}

async function toolScheduleBriefing(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { briefing_id, copy_id, channel, scheduled_for } = args;
  if (!briefing_id || !copy_id || !channel || !scheduled_for) {
    return { success: false, error: 'briefing_id, copy_id, channel e scheduled_for são obrigatórios.' };
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO edro_publish_schedule (briefing_id, copy_version_id, channel, scheduled_for, tenant_id, status)
     VALUES ($1,$2,$3,$4,$5,'pending')
     RETURNING id`,
    [briefing_id, copy_id, channel, scheduled_for, ctx.tenantId]
  );

  return {
    success: true,
    data: { message: `Briefing agendado para ${channel} em ${scheduled_for}.`, scheduleId: rows[0]?.id, scheduledFor: scheduled_for, channel },
  };
}

// ── GRUPO 2: Workflow e Planejamento ────────────────────────────

async function toolUpdateTask(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { task_id, status } = args;
  if (!task_id || !status) return { success: false, error: 'task_id e status são obrigatórios.' };

  const task = await updateTaskStatus({ taskId: task_id, status });
  if (!task) return { success: false, error: 'Tarefa não encontrada.' };
  return { success: true, data: { message: `Tarefa atualizada para "${status}".`, task } };
}

async function toolGenerateStrategicBrief(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.edroClientId) return { success: false, error: 'Cliente não encontrado no contexto.' };

  const targetMonth = args.month || new Date().getMonth() + 2;
  const targetYear = args.year || new Date().getFullYear();
  const periodFrom = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [metricsRes, calendarRes, opportunitiesRes, clientRes] = await Promise.all([
    query<{ total: string; completed: string; completion_rate: string }>(
      `SELECT COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'done') AS completed,
         ROUND(COUNT(*) FILTER (WHERE status = 'done')::numeric / NULLIF(COUNT(*), 0) * 100) AS completion_rate
       FROM edro_briefings WHERE client_id = $1 AND created_at >= $2`,
      [ctx.edroClientId, periodFrom]
    ),
    query<{ title: string; event_date: string }>(
      `SELECT title, event_date::text FROM calendar_events
       WHERE client_id = $1 AND EXTRACT(MONTH FROM event_date) = $2 AND EXTRACT(YEAR FROM event_date) = $3
       ORDER BY event_date LIMIT 10`,
      [ctx.edroClientId, targetMonth, targetYear]
    ).catch(() => ({ rows: [] as { title: string; event_date: string }[] })),
    query<{ title: string; priority: string }>(
      `SELECT title, priority FROM ai_opportunities
       WHERE client_id = $1 AND status = 'active'
       ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END LIMIT 6`,
      [ctx.edroClientId]
    ).catch(() => ({ rows: [] as { title: string; priority: string }[] })),
    query<{ name: string; segment_primary: string | null }>(
      `SELECT name, segment_primary FROM clients WHERE id = $1 LIMIT 1`,
      [ctx.clientId]
    ),
  ]);

  const m = metricsRes.rows[0];
  const client = clientRes.rows[0];
  const monthName = new Date(targetYear, targetMonth - 1).toLocaleDateString('pt-BR', { month: 'long' });
  const calendarBlock = calendarRes.rows.map((e) => `• ${e.event_date?.slice(0, 10)}: ${e.title}`).join('\n') || 'Nenhum evento mapeado.';
  const oppsBlock = opportunitiesRes.rows.map((o) => `• [${o.priority.toUpperCase()}] ${o.title}`).join('\n') || 'Nenhuma oportunidade.';

  const prompt = `Você é o estrategista-chefe da Edro Studio. Prepare o PLANEJAMENTO ESTRATÉGICO MENSAL para ${client?.name ?? 'o cliente'} — referente a ${monthName}/${targetYear}.

## DADOS DOS ÚLTIMOS 60 DIAS
- Briefings: ${m?.total || 0} total, ${m?.completed || 0} concluídos (${m?.completion_rate || 0}% conclusão)

## CALENDÁRIO ${monthName.toUpperCase()}/${targetYear}
${calendarBlock}

## OPORTUNIDADES IA
${oppsBlock}

Entregue um planejamento executivo com: 1) Diagnóstico (3 pontos), 2) Objetivos do mês, 3) Estratégia de conteúdo, 4) Top 5 datas para ativar, 5) Copy Guidelines, 6) KPIs com metas, 7) Alerta de risco. Máximo 700 palavras.`;

  const result = await generateWithProvider('claude', { prompt, temperature: 0.6, maxTokens: 2000 });
  return {
    success: true,
    data: {
      brief: result.output,
      client_name: client?.name,
      period: { month: targetMonth, year: targetYear, label: `${monthName}/${targetYear}` },
      data_used: { calendar_events: calendarRes.rows.length, ai_opportunities: opportunitiesRes.rows.length },
    },
  };
}

// ── GRUPO 3: Inteligência Comportamental ────────────────────────

async function toolComputeBehaviorProfiles(args: any, ctx: ToolContext): Promise<ToolResult> {
  const profiles = await recomputeClientBehaviorProfiles(ctx.tenantId, ctx.clientId);
  const topCluster = profiles[0] ?? null;
  return {
    success: true,
    data: {
      message: `${profiles.length} perfis comportamentais recalculados.`,
      profiles_count: profiles.length,
      top_cluster: topCluster ? `${topCluster.cluster_label} (confiança: ${topCluster.confidence_score?.toFixed(2)})` : null,
    },
  };
}

async function toolComputeLearningRules(args: any, ctx: ToolContext): Promise<ToolResult> {
  const rules = await recomputeClientLearningRules(ctx.tenantId, ctx.clientId);
  const topRule = rules[0] ?? null;
  return {
    success: true,
    data: {
      message: `${rules.length} regras de aprendizado recalculadas.`,
      rules_count: rules.length,
      top_rule: topRule ? `${topRule.rule_name} (uplift: +${(topRule.uplift_value ?? 0).toFixed(1)}%)` : null,
    },
  };
}

// ── GRUPO 4: Pauta Inbox ──────────────────────────────────────────

async function toolGeneratePauta(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { title, source_text, platforms, topic_category } = args;
  if (!title) return { success: false, error: 'title é obrigatório.' };

  const { rows } = await query<{ id: string }>(
    `INSERT INTO pauta_suggestions (client_id, tenant_id, title, status, source_type, topic_category)
     VALUES ($1,$2,$3,'pending','manual',$4)
     RETURNING id`,
    [ctx.clientId, ctx.tenantId, title, topic_category ?? null]
  );

  const pautaId = rows[0]?.id;
  if (!pautaId) return { success: false, error: 'Erro ao criar pauta.' };

  // Fire-and-forget AI generation
  const source = {
    type: 'manual' as const,
    id: pautaId,
    title,
    summary: source_text ?? title,
    date: new Date().toISOString().slice(0, 10),
  };
  generatePautaSuggestions({ client_id: ctx.clientId, tenant_id: ctx.tenantId, sources: [source] }).catch(() => {});

  return {
    success: true,
    data: { message: 'Pauta enfileirada — abordagens A/B serão geradas em breve.', pauta_id: pautaId },
  };
}

async function toolListPautaInbox(args: any, ctx: ToolContext): Promise<ToolResult> {
  const status = args.status ?? null;
  const limit = Math.min(args.limit ?? 10, 50);

  const { rows } = await query<any>(
    `SELECT id, title, status, topic_category, suggested_deadline, approach_a, approach_b, created_at
     FROM pauta_suggestions
     WHERE client_id=$1 AND tenant_id=$2
       ${status ? `AND status=$3` : ''}
     ORDER BY created_at DESC LIMIT ${limit}`,
    status ? [ctx.clientId, ctx.tenantId, status] : [ctx.clientId, ctx.tenantId]
  );

  return { success: true, data: { pautas: rows, total: rows.length }, metadata: { row_count: rows.length } };
}

async function toolApprovePauta(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { pauta_id, approach } = args;
  if (!pauta_id) return { success: false, error: 'pauta_id é obrigatório.' };

  const { rows } = await query<any>(
    `SELECT * FROM pauta_suggestions WHERE id=$1 AND client_id=$2 AND tenant_id=$3 LIMIT 1`,
    [pauta_id, ctx.clientId, ctx.tenantId]
  );
  const pauta = rows[0];
  if (!pauta) return { success: false, error: 'Pauta não encontrada.' };

  const chosenApproach = approach === 'B' ? (pauta.approach_b ?? {}) : (pauta.approach_a ?? {});
  const title = chosenApproach.title ?? pauta.title ?? 'Briefing';

  const briefing = await createBriefing({
    mainClientId: ctx.edroClientId ?? undefined,
    title,
    payload: { ...chosenApproach, pauta_id, approach: approach ?? 'A' },
    source: 'pauta_inbox',
  });

  if (briefing?.id) {
    await createBriefingStages(briefing.id);
  }

  // Record preference feedback (non-blocking)
  recordPreferenceFeedback({
    tenantId: ctx.tenantId,
    clientId: ctx.clientId,
    payload: {
      feedback_type: 'pauta',
      action: 'approved',
      pauta_id,
      pauta_approach: approach ?? 'A',
      pauta_source_type: pauta.source_type ?? null,
      pauta_topic_category: pauta.topic_category ?? null,
      pauta_platforms: chosenApproach.platforms ?? null,
    } as any,
  }).catch(() => {});

  await query(
    `UPDATE pauta_suggestions SET status='approved' WHERE id=$1`,
    [pauta_id]
  );

  return {
    success: true,
    data: { message: `Pauta aprovada (Abordagem ${approach ?? 'A'}). Briefing criado.`, briefing_id: briefing?.id },
  };
}

async function toolRejectPauta(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { pauta_id, reason, tags } = args;
  if (!pauta_id) return { success: false, error: 'pauta_id é obrigatório.' };

  recordPreferenceFeedback({
    tenantId: ctx.tenantId,
    clientId: ctx.clientId,
    payload: {
      feedback_type: 'pauta',
      action: 'rejected',
      pauta_id,
      rejection_reason: reason ?? null,
      rejection_tags: tags ?? null,
    } as any,
  }).catch(() => {});

  await query(`UPDATE pauta_suggestions SET status='rejected' WHERE id=$1`, [pauta_id]);

  return { success: true, data: { message: 'Pauta rejeitada. Feedback registrado para melhorar futuras sugestões.' } };
}

// ── GRUPO 5: Fontes de Clipping ────────────────────────────────

async function toolAddClippingSource(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { name, url, type, include_keywords } = args;
  if (!name || !url) return { success: false, error: 'name e url são obrigatórios.' };

  const keywords = Array.isArray(include_keywords) ? include_keywords : [];

  const { rows } = await query<{ id: string }>(
    `INSERT INTO clipping_sources (tenant_id, client_id, name, url, type, include_keywords, scope, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,'CLIENT',true)
     RETURNING id`,
    [ctx.tenantId, ctx.clientId, name, url, type ?? 'NEWS', keywords.length ? keywords : null]
  );

  return {
    success: true,
    data: { message: `Fonte "${name}" adicionada ao monitoramento.`, source_id: rows[0]?.id },
  };
}

async function toolPauseClippingSource(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { source_id } = args;
  if (!source_id) return { success: false, error: 'source_id é obrigatório.' };

  await query(
    `UPDATE clipping_sources SET is_active=false WHERE id=$1 AND tenant_id=$2`,
    [source_id, ctx.tenantId]
  );
  return { success: true, data: { message: 'Monitoramento da fonte pausado.' } };
}

async function toolResumeClippingSource(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { source_id } = args;
  if (!source_id) return { success: false, error: 'source_id é obrigatório.' };

  await query(
    `UPDATE clipping_sources SET is_active=true WHERE id=$1 AND tenant_id=$2`,
    [source_id, ctx.tenantId]
  );
  return { success: true, data: { message: 'Monitoramento da fonte retomado.' } };
}

// ── GRUPO 6: Análise e Relatórios ──────────────────────────────

async function toolAnalyzeCognitiveLoad(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { text, platform } = args;
  if (!text) return { success: false, error: 'text é obrigatório.' };

  const analysis = analyzeCognitiveLoad(text, platform ?? null);

  return {
    success: true,
    data: {
      lc_score: analysis.lc,
      density: analysis.components.ds,
      tonal_stress: analysis.components.sigma,
      platform_ideal_range: analysis.threshold ? `${analysis.threshold.min}–${analysis.threshold.max} (${analysis.threshold.label})` : null,
      is_optimal: analysis.passed,
      status: analysis.status,
      diagnosis: analysis.diagnosis,
    },
  };
}

// ── Grupo 7 — Consulta Multi-IA ────────────────────────────────────────────

const CONSULTANT_SYSTEM = `Você é um estrategista sênior de comunicação e marketing com especialidade em criatividade, posicionamento de marca e persuasão comportamental. Responda de forma direta, estratégica e acionável em português brasileiro. Entregue insights únicos, não genéricos.`;

async function toolConsultGemini(args: any, _ctx: ToolContext): Promise<ToolResult> {
  const { question, context } = args;
  if (!question) return { success: false, error: 'question é obrigatório.' };

  const prompt = context
    ? `CONTEXTO:\n${context}\n\nPERGUNTA:\n${question}`
    : question;

  try {
    const result = await generateWithProvider('gemini', {
      prompt,
      systemPrompt: CONSULTANT_SYSTEM,
      temperature: 0.8,
      maxTokens: 1500,
    });
    return {
      success: true,
      data: {
        provider: 'Gemini (Google)',
        response: result.output,
      },
    };
  } catch (err: any) {
    return { success: false, error: `Gemini indisponível: ${err?.message ?? 'erro desconhecido'}` };
  }
}

async function toolConsultOpenAI(args: any, _ctx: ToolContext): Promise<ToolResult> {
  const { question, context } = args;
  if (!question) return { success: false, error: 'question é obrigatório.' };

  const prompt = context
    ? `CONTEXTO:\n${context}\n\nPERGUNTA:\n${question}`
    : question;

  try {
    const result = await generateWithProvider('openai', {
      prompt,
      systemPrompt: CONSULTANT_SYSTEM,
      temperature: 0.8,
      maxTokens: 1500,
    });
    return {
      success: true,
      data: {
        provider: 'GPT-4o (OpenAI)',
        response: result.output,
      },
    };
  } catch (err: any) {
    return { success: false, error: `OpenAI indisponível: ${err?.message ?? 'erro desconhecido'}` };
  }
}

// ── GRUPO 8: WhatsApp / Grupos ────────────────────────────────────

async function toolSearchWhatsAppMessages(args: any, ctx: ToolContext): Promise<ToolResult> {
  const daysBack = Math.min(args.days_back ?? 7, 30);
  const limit = Math.min(args.limit ?? 30, 100);
  const searchQuery = args.query?.trim() || null;
  const groupName = args.group_name?.trim() || null;

  const params: any[] = [ctx.clientId, daysBack];
  let sql = `
    SELECT wgm.sender_name, wgm.content, wgm.type, wgm.created_at,
           wg.group_name
    FROM whatsapp_group_messages wgm
    JOIN whatsapp_groups wg ON wg.id = wgm.group_id
    WHERE wg.client_id = $1
      AND wg.active = true
      AND wgm.content IS NOT NULL
      AND wgm.created_at > NOW() - make_interval(days => $2)
  `;

  if (groupName) {
    params.push(`%${groupName}%`);
    sql += ` AND wg.group_name ILIKE $${params.length}`;
  }

  if (searchQuery) {
    params.push(`%${searchQuery}%`);
    sql += ` AND wgm.content ILIKE $${params.length}`;
  }

  sql += ` ORDER BY wgm.created_at DESC LIMIT ${limit}`;

  const { rows } = await query(sql, params);
  if (!rows.length) {
    return { success: true, data: { messages: [], total: 0, note: 'Nenhuma mensagem encontrada para este cliente nos últimos ' + daysBack + ' dias.' } };
  }

  const messages = rows.map((r: any) => ({
    grupo: r.group_name,
    remetente: r.sender_name,
    mensagem: (r.content || '').slice(0, 500),
    tipo: r.type,
    data: r.created_at,
  }));

  return { success: true, data: safeData(messages, 30), metadata: { row_count: rows.length } };
}

async function toolListWhatsAppGroups(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { rows } = await query(
    `SELECT wg.id, wg.group_name, wg.participant_count, wg.auto_briefing, wg.notify_jarvis,
            wg.last_message_at,
            (SELECT COUNT(*) FROM whatsapp_group_messages wgm WHERE wgm.group_id = wg.id) AS message_count
     FROM whatsapp_groups wg
     WHERE wg.client_id = $1 AND wg.active = true
     ORDER BY wg.last_message_at DESC NULLS LAST`,
    [ctx.clientId],
  );

  if (!rows.length) {
    return { success: true, data: { groups: [], note: 'Nenhum grupo de WhatsApp linkado a este cliente.' } };
  }

  return {
    success: true,
    data: rows.map((r: any) => ({
      id: r.id,
      nome: r.group_name,
      participantes: r.participant_count,
      mensagens: Number(r.message_count),
      auto_briefing: r.auto_briefing,
      jarvis_ativo: r.notify_jarvis,
      ultima_mensagem: r.last_message_at,
    })),
  };
}

async function toolGetWhatsAppInsights(args: any, ctx: ToolContext): Promise<ToolResult> {
  const daysBack = Math.min(args.days_back ?? 14, 60);
  const insightType = args.insight_type || null;

  const params: any[] = [ctx.clientId, daysBack];
  let sql = `
    SELECT wi.insight_type, wi.summary, wi.sentiment, wi.urgency, wi.entities, wi.confidence, wi.created_at
    FROM whatsapp_message_insights wi
    WHERE wi.client_id = $1
      AND wi.created_at > NOW() - make_interval(days => $2)
  `;

  if (insightType) {
    params.push(insightType);
    sql += ` AND wi.insight_type = $${params.length}`;
  }

  sql += ` ORDER BY wi.created_at DESC LIMIT 30`;

  const { rows } = await query(sql, params);
  if (!rows.length) {
    return { success: true, data: { insights: [], note: 'Nenhum insight extraído nos últimos ' + daysBack + ' dias.' } };
  }

  return {
    success: true,
    data: safeData(rows.map((r: any) => ({
      tipo: r.insight_type,
      resumo: r.summary,
      sentimento: r.sentiment,
      urgencia: r.urgency,
      entidades: r.entities,
      data: r.created_at,
    })), 20),
    metadata: { row_count: rows.length },
  };
}

async function toolGetWhatsAppDigests(args: any, ctx: ToolContext): Promise<ToolResult> {
  const period = args.period || 'daily';
  const limit = Math.min(args.limit ?? 5, 20);

  const { rows } = await query(
    `SELECT wd.period, wd.summary, wd.key_decisions, wd.pending_actions,
            wd.message_count, wd.insight_count, wd.created_at
     FROM whatsapp_group_digests wd
     WHERE wd.client_id = $1 AND wd.period = $2
     ORDER BY wd.created_at DESC
     LIMIT $3`,
    [ctx.clientId, period, limit],
  );

  if (!rows.length) {
    return { success: true, data: { digests: [], note: `Nenhum digest ${period} encontrado.` } };
  }

  return {
    success: true,
    data: rows.map((r: any) => ({
      periodo: r.period,
      resumo: r.summary,
      decisoes: r.key_decisions,
      acoes_pendentes: r.pending_actions,
      mensagens: r.message_count,
      insights: r.insight_count,
      data: r.created_at,
    })),
  };
}

// ══════════════════════════════════════════════════════════════════
// ── OPERATIONS TOOLS (tenant-scoped, no clientId) ────────────────
// ══════════════════════════════════════════════════════════════════

import {
  buildOverviewSnapshot,
  buildRiskSnapshot,
  upsertJobAllocation,
  syncOperationalRuntimeForJob,
} from '../../services/jobs/operationsRuntimeService';
import { calculatePriority } from '../../services/jobs/priorityService';
import { estimateMinutes } from '../../services/jobs/estimationService';

const OPS_TOOL_MAP: Record<string, (args: any, ctx: OperationsToolContext) => Promise<ToolResult>> = {
  list_operations_jobs: opsListJobs,
  get_operations_job: opsGetJob,
  get_operations_overview: opsGetOverview,
  get_operations_risks: opsGetRisks,
  get_operations_signals: opsGetSignals,
  get_operations_team: opsGetTeam,
  get_operations_lookups: opsGetLookups,
  create_operations_job: opsCreateJob,
  update_operations_job: opsUpdateJob,
  change_job_status: opsChangeJobStatus,
  assign_job_owner: opsAssignOwner,
  resolve_operations_signal: opsResolveSignal,
  snooze_operations_signal: opsSnoozeSignal,
  manage_job_allocation: opsManageAllocation,
};

export async function executeOperationsTool(
  toolName: string,
  args: Record<string, any>,
  ctx: OperationsToolContext,
): Promise<ToolResult> {
  const handler = OPS_TOOL_MAP[toolName];
  if (!handler) {
    return { success: false, error: `Operations tool '${toolName}' not found` };
  }
  try {
    const result = await Promise.race([
      handler(args, ctx),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error('TOOL_TIMEOUT_10s')), 10000),
      ),
    ]);
    return truncateResult(result);
  } catch (err: any) {
    console.error(`[opsToolExecutor] ${toolName} failed:`, err.message);
    return { success: false, error: err.message || 'Tool execution failed' };
  }
}

// ── Operations Tool Implementations ──────────────────────────────

async function opsListJobs(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const values: any[] = [ctx.tenantId];
  const where = [`j.tenant_id = $1`, `j.status <> 'archived'`];

  if (args.status) { values.push(args.status); where.push(`j.status = $${values.length}`); }
  if (args.priority_band) { values.push(args.priority_band); where.push(`j.priority_band = $${values.length}`); }
  if (args.owner_id) { values.push(args.owner_id); where.push(`j.owner_id = $${values.length}`); }
  if (args.client_id) { values.push(args.client_id); where.push(`j.client_id = $${values.length}`); }
  if (args.urgent === true) { where.push(`j.is_urgent = true`); }
  if (args.unassigned === true) { where.push(`j.owner_id IS NULL`); }

  const limit = Math.min(args.limit || 20, 50);

  const { rows } = await query(
    `SELECT j.id, j.title, j.status, j.priority_band, j.job_type, j.complexity,
            j.is_urgent, j.deadline_at, j.estimated_minutes, j.created_at,
            c.name AS client_name,
            COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN edro_users u ON u.id = j.owner_id
     WHERE ${where.join(' AND ')}
     ORDER BY
       CASE j.priority_band WHEN 'p0' THEN 0 WHEN 'p1' THEN 1 WHEN 'p2' THEN 2 WHEN 'p3' THEN 3 ELSE 4 END,
       j.deadline_at ASC NULLS LAST,
       j.created_at DESC
     LIMIT $${values.length + 1}`,
    [...values, limit],
  );

  return { success: true, data: safeData(rows, 30), metadata: { row_count: rows.length } };
}

async function opsGetJob(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const { rows } = await query(
    `SELECT j.*,
            c.name AS client_name,
            COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
            u.email AS owner_email
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN edro_users u ON u.id = j.owner_id
     WHERE j.tenant_id = $1 AND j.id = $2
     LIMIT 1`,
    [ctx.tenantId, args.job_id],
  );
  if (!rows.length) return { success: false, error: 'Job não encontrado.' };

  const history = await query(
    `SELECT h.from_status, h.to_status, h.reason, h.changed_at,
            COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS changed_by_name
     FROM job_status_history h
     LEFT JOIN edro_users u ON u.id = h.changed_by
     WHERE h.job_id = $1
     ORDER BY h.changed_at DESC LIMIT 10`,
    [args.job_id],
  );

  const comments = await query(
    `SELECT jc.body, jc.created_at,
            COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS author_name
     FROM job_comments jc
     LEFT JOIN edro_users u ON u.id = jc.author_id
     WHERE jc.job_id = $1
     ORDER BY jc.created_at DESC LIMIT 10`,
    [args.job_id],
  );

  return {
    success: true,
    data: {
      ...rows[0],
      history: history.rows,
      comments: comments.rows,
    },
  };
}

async function opsGetOverview(_args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const data = await buildOverviewSnapshot(ctx.tenantId);
  return { success: true, data };
}

async function opsGetRisks(_args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const data = await buildRiskSnapshot(ctx.tenantId);
  return { success: true, data };
}

async function opsGetSignals(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 20, 50);
  const { rows } = await query(
    `SELECT id, domain, signal_type, severity, title, summary,
            entity_type, entity_id, client_id, client_name,
            actions, created_at, snoozed_until
     FROM operational_signals
     WHERE tenant_id = $1 AND resolved_at IS NULL
       AND (snoozed_until IS NULL OR snoozed_until < now())
     ORDER BY severity DESC, created_at DESC
     LIMIT $2`,
    [ctx.tenantId, limit],
  );
  return { success: true, data: safeData(rows, 20), metadata: { row_count: rows.length } };
}

async function opsGetTeam(_args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const { rows } = await query(
    `SELECT
       u.id,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name,
       u.email,
       tu.role,
       fp.specialty,
       CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS person_type,
       (SELECT COUNT(*) FROM jobs j WHERE j.owner_id = u.id AND j.tenant_id = $1 AND j.status NOT IN ('done','archived')) AS active_jobs,
       (SELECT COALESCE(SUM(j.estimated_minutes),0) FROM jobs j WHERE j.owner_id = u.id AND j.tenant_id = $1 AND j.status NOT IN ('done','archived')) AS total_estimated_minutes
     FROM tenant_users tu
     JOIN edro_users u ON u.id = tu.user_id
     LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
     WHERE tu.tenant_id = $1
     ORDER BY name ASC`,
    [ctx.tenantId],
  );
  return { success: true, data: safeData(rows, 20) };
}

async function opsGetLookups(_args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const [jobTypesRes, skillsRes, channelsRes, clientsRes, ownersRes] = await Promise.all([
    query(`SELECT code, label FROM job_types ORDER BY label ASC`),
    query(`SELECT code, label, category FROM skills ORDER BY label ASC`),
    query(`SELECT code, label FROM channels ORDER BY label ASC`),
    query(`SELECT id, name FROM clients WHERE tenant_id = $1 ORDER BY name ASC`, [ctx.tenantId]),
    query(
      `SELECT u.id, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name
       FROM tenant_users tu JOIN edro_users u ON u.id = tu.user_id
       WHERE tu.tenant_id = $1 ORDER BY name ASC`,
      [ctx.tenantId],
    ),
  ]);
  return {
    success: true,
    data: {
      job_types: jobTypesRes.rows,
      skills: skillsRes.rows,
      channels: channelsRes.rows,
      clients: clientsRes.rows,
      owners: ownersRes.rows,
    },
  };
}

async function opsCreateJob(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const estMinutes = args.estimated_minutes || estimateMinutes({
    jobType: args.job_type,
    complexity: args.complexity,
    channel: args.channel,
  });
  const { priorityScore, priorityBand } = calculatePriority({
    deadlineAt: args.deadline_at,
    impactLevel: args.impact_level ?? 2,
    dependencyLevel: args.dependency_level ?? 2,
    clientWeight: 3,
    isUrgent: args.is_urgent,
    intakeComplete: Boolean(args.client_id && args.owner_id && args.deadline_at),
    blocked: false,
  });

  const { rows } = await query(
    `INSERT INTO jobs (
       tenant_id, client_id, title, summary, job_type, complexity, channel, source,
       status, priority_score, priority_band, impact_level, dependency_level,
       owner_id, deadline_at, estimated_minutes, is_urgent, urgency_reason,
       created_by, metadata
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,'intake',$9,$10,2,2,$11,$12,$13,$14,$15,$16,'{}'::jsonb
     ) RETURNING *`,
    [
      ctx.tenantId,
      args.client_id ?? null,
      args.title,
      args.summary ?? null,
      args.job_type,
      args.complexity,
      args.channel ?? null,
      args.source || 'jarvis',
      priorityScore,
      priorityBand,
      args.owner_id ?? null,
      args.deadline_at ?? null,
      estMinutes,
      args.is_urgent ?? false,
      args.urgency_reason ?? null,
      ctx.userId ?? null,
    ],
  );

  await query(
    `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
     VALUES ($1, NULL, 'intake', $2, 'created_by_jarvis')`,
    [rows[0].id, ctx.userId ?? null],
  );
  await syncOperationalRuntimeForJob(ctx.tenantId, rows[0].id);

  // Briefing gate: all jobs with a client require briefing before copy generation
  if (args.client_id) {
    await query(
      `UPDATE jobs SET automation_status = 'briefing_pending' WHERE id = $1 AND tenant_id = $2`,
      [rows[0].id, ctx.tenantId],
    );
  }

  return { success: true, data: { id: rows[0].id, title: rows[0].title, status: rows[0].status, priority_band: rows[0].priority_band, briefing_url: `/admin/operacoes/jobs/${rows[0].id}/briefing` } };
}

async function opsUpdateJob(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const existingRes = await query(`SELECT * FROM jobs WHERE tenant_id = $1 AND id = $2 LIMIT 1`, [ctx.tenantId, args.job_id]);
  if (!existingRes.rows.length) return { success: false, error: 'Job não encontrado.' };

  const existing = existingRes.rows[0];
  const sets: string[] = [];
  const values: any[] = [ctx.tenantId, args.job_id];

  const updatable: Record<string, string> = {
    title: 'title', summary: 'summary', owner_id: 'owner_id',
    deadline_at: 'deadline_at', complexity: 'complexity',
    is_urgent: 'is_urgent', urgency_reason: 'urgency_reason',
  };

  for (const [argKey, col] of Object.entries(updatable)) {
    if (args[argKey] !== undefined) {
      values.push(args[argKey]);
      sets.push(`${col} = $${values.length}`);
    }
  }

  if (!sets.length) return { success: false, error: 'Nenhum campo para atualizar.' };

  const { rows } = await query(
    `UPDATE jobs SET ${sets.join(', ')} WHERE tenant_id = $1 AND id = $2 RETURNING id, title, status, owner_id, deadline_at`,
    values,
  );
  await syncOperationalRuntimeForJob(ctx.tenantId, args.job_id);

  return { success: true, data: rows[0] };
}

async function opsChangeJobStatus(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const currentRes = await query(`SELECT * FROM jobs WHERE tenant_id = $1 AND id = $2 LIMIT 1`, [ctx.tenantId, args.job_id]);
  if (!currentRes.rows.length) return { success: false, error: 'Job não encontrado.' };
  const current = currentRes.rows[0];

  if (current.status === args.status) return { success: true, data: { message: 'Status já é ' + args.status } };

  const completedAt = args.status === 'done' ? new Date().toISOString() : current.completed_at;

  const { rows } = await query(
    `UPDATE jobs SET status = $3, completed_at = $4 WHERE tenant_id = $1 AND id = $2 RETURNING id, title, status`,
    [ctx.tenantId, args.job_id, args.status, completedAt],
  );

  await query(
    `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [args.job_id, current.status, args.status, ctx.userId ?? null, args.reason ?? 'changed_by_jarvis'],
  );
  await syncOperationalRuntimeForJob(ctx.tenantId, args.job_id);

  return { success: true, data: { ...rows[0], from_status: current.status } };
}

async function opsAssignOwner(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const { rows } = await query(
    `UPDATE jobs SET owner_id = $3 WHERE tenant_id = $1 AND id = $2 RETURNING id, title, owner_id`,
    [ctx.tenantId, args.job_id, args.owner_id],
  );
  if (!rows.length) return { success: false, error: 'Job não encontrado.' };
  await syncOperationalRuntimeForJob(ctx.tenantId, args.job_id);

  // Resolve owner name
  const ownerRes = await query(
    `SELECT COALESCE(NULLIF(name, ''), split_part(email, '@', 1)) AS name FROM edro_users WHERE id = $1`,
    [args.owner_id],
  );
  return { success: true, data: { ...rows[0], owner_name: ownerRes.rows[0]?.name ?? args.owner_id } };
}

async function opsResolveSignal(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  await query(
    `UPDATE operational_signals SET resolved_at = now(), resolved_by = $3
     WHERE id = $1 AND tenant_id = $2`,
    [args.signal_id, ctx.tenantId, ctx.userId ?? null],
  );
  return { success: true, data: { signal_id: args.signal_id, resolved: true } };
}

async function opsSnoozeSignal(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const hours = Math.min(args.hours || 4, 72);
  await query(
    `UPDATE operational_signals SET snoozed_until = now() + ($3 || ' hours')::interval
     WHERE id = $1 AND tenant_id = $2`,
    [args.signal_id, ctx.tenantId, String(hours)],
  );
  return { success: true, data: { signal_id: args.signal_id, snoozed_hours: hours } };
}

async function opsManageAllocation(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const data = await upsertJobAllocation(ctx.tenantId, {
    jobId: args.job_id,
    ownerId: args.owner_id,
    status: args.status || 'committed',
    plannedMinutes: args.planned_minutes,
    startsAt: args.starts_at ?? null,
    endsAt: args.ends_at ?? null,
    notes: args.notes ?? null,
    changedBy: ctx.userId ?? null,
  });
  await syncOperationalRuntimeForJob(ctx.tenantId, args.job_id);
  return { success: true, data };
}

// ══════════════════════════════════════════════════════════════════
// ── GRUPO 9 — Briefing Inteligente de Jobs ────────────────────────
// ══════════════════════════════════════════════════════════════════

async function toolGetJobBriefing(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { job_id } = args;
  if (!job_id) return { success: false, error: 'job_id é obrigatório' };

  // Fetch job + client name
  const { rows: jobRows } = await query<any>(
    `SELECT j.*, c.name AS client_name
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
      WHERE j.id = $1 AND j.tenant_id = $2`,
    [job_id, ctx.tenantId],
  );
  if (!jobRows.length) return { success: false, error: 'Job não encontrado.' };
  const job = jobRows[0];

  // Fetch briefing + pieces
  const { rows: briefRows } = await query<any>(
    `SELECT * FROM job_briefings WHERE job_id = $1 AND tenant_id = $2`,
    [job_id, ctx.tenantId],
  );
  const briefing = briefRows[0] ?? null;
  const pieces = briefing
    ? (await query<any>(`SELECT * FROM job_briefing_pieces WHERE briefing_id = $1 ORDER BY sort_order`, [briefing.id])).rows
    : [];

  // Build client_context
  let clientContext: Record<string, any> = {};
  if (job.client_id) {
    const { rows: clientRows } = await query<any>(
      `SELECT profile FROM clients WHERE id = $1 AND tenant_id = $2`,
      [job.client_id, ctx.tenantId],
    );
    const profile = clientRows[0]?.profile ?? {};
    const kb = profile.knowledge_base ?? {};
    const bt = profile.brand_tokens ?? {};

    const { rows: clusterRows } = await query<any>(
      `SELECT id, cluster_type, cluster_label, preferred_amd, preferred_triggers,
              avg_save_rate, avg_click_rate, avg_engagement_rate
         FROM client_behavior_profiles
        WHERE client_id = $1 AND tenant_id = $2
        ORDER BY confidence_score DESC`,
      [job.client_id, ctx.tenantId],
    );
    const { rows: vsRows } = await query<any>(
      `SELECT style_summary, mood FROM client_visual_style
        WHERE client_id = $1 AND tenant_id = $2
        ORDER BY analyzed_at DESC LIMIT 1`,
      [job.client_id, ctx.tenantId],
    );
    const { rows: ruleRows } = await query<any>(
      `SELECT rule_type, rule_text, uplift_pct FROM learning_rules
        WHERE client_id = $1 AND tenant_id = $2 AND is_active = true
        ORDER BY uplift_pct DESC LIMIT 5`,
      [job.client_id, ctx.tenantId],
    );

    clientContext = {
      tone_description: profile.tone_description ?? null,
      personality_traits: profile.personality_traits ?? [],
      formality_level: profile.formality_level ?? null,
      forbidden_claims: kb.forbidden_claims ?? [],
      negative_keywords: profile.negative_keywords ?? [],
      pillars: profile.pillars ?? [],
      reference_brands: bt.referenceStyles ?? [],
      audience: kb.audience ?? null,
      brand_promise: kb.brand_promise ?? null,
      visual_style: vsRows[0]?.style_summary ?? null,
      behavior_clusters: clusterRows,
      learning_rules: ruleRows,
    };
  }

  return {
    success: true,
    data: {
      job: { id: job.id, title: job.title, job_type: job.job_type, client_id: job.client_id, client_name: job.client_name, automation_status: job.automation_status },
      briefing,
      pieces,
      client_context: clientContext,
    },
  };
}

async function toolFillJobBriefing(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { job_id } = args;
  if (!job_id) return { success: false, error: 'job_id é obrigatório' };

  // Verify job + get client_id
  const { rows: jobRows } = await query<any>(
    `SELECT id, client_id FROM jobs WHERE id = $1 AND tenant_id = $2`,
    [job_id, ctx.tenantId],
  );
  if (!jobRows.length) return { success: false, error: 'Job não encontrado.' };
  const clientId = jobRows[0].client_id;
  if (!clientId) return { success: false, error: 'Job sem cliente associado.' };

  // Block if already submitted/approved
  const { rows: existing } = await query<any>(
    `SELECT id, status FROM job_briefings WHERE job_id = $1 AND tenant_id = $2`,
    [job_id, ctx.tenantId],
  );
  if (existing.length && existing[0].status !== 'draft') {
    return { success: false, error: `Briefing com status '${existing[0].status}'. Só é possível editar em draft.` };
  }

  // Upsert briefing
  const { rows: briefRows } = await query<any>(
    `INSERT INTO job_briefings (
        job_id, tenant_id, client_id,
        context_trigger, consumer_moment, main_risk,
        main_objective, success_metrics,
        target_cluster_ids, specific_barriers,
        message_structure, desired_emotion, desired_amd,
        tone_override, regulatory_flags,
        ref_links, ref_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17)
      ON CONFLICT (job_id) DO UPDATE SET
        context_trigger    = EXCLUDED.context_trigger,
        consumer_moment    = EXCLUDED.consumer_moment,
        main_risk          = EXCLUDED.main_risk,
        main_objective     = EXCLUDED.main_objective,
        success_metrics    = EXCLUDED.success_metrics,
        target_cluster_ids = EXCLUDED.target_cluster_ids,
        specific_barriers  = EXCLUDED.specific_barriers,
        message_structure  = EXCLUDED.message_structure,
        desired_emotion    = EXCLUDED.desired_emotion,
        desired_amd        = EXCLUDED.desired_amd,
        tone_override      = EXCLUDED.tone_override,
        regulatory_flags   = EXCLUDED.regulatory_flags,
        ref_links          = EXCLUDED.ref_links,
        ref_notes          = EXCLUDED.ref_notes,
        updated_at         = now()
      RETURNING *`,
    [
      job_id, ctx.tenantId, clientId,
      args.context_trigger ?? null,
      args.consumer_moment ?? null,
      args.main_risk ?? null,
      args.main_objective ?? null,
      args.success_metrics ?? null,
      args.target_cluster_ids ?? null,
      args.specific_barriers ?? null,
      args.message_structure ?? null,
      args.desired_emotion ?? null,
      args.desired_amd ?? null,
      args.tone_override ? JSON.stringify(args.tone_override) : null,
      args.regulatory_flags ?? null,
      args.ref_links ?? null,
      args.ref_notes ?? null,
    ],
  );
  const briefing = briefRows[0];

  // Parse and replace pieces (format: "format_type|platform|versions")
  if (args.pieces !== undefined && Array.isArray(args.pieces)) {
    await query(`DELETE FROM job_briefing_pieces WHERE briefing_id = $1`, [briefing.id]);
    for (const [i, piece] of args.pieces.entries()) {
      let format_type: string, platform: string | null = null, versions = 1, priority = 'media', notes: string | null = null;
      if (typeof piece === 'string') {
        const parts = piece.split('|');
        format_type = parts[0]?.trim() || piece;
        platform = parts[1]?.trim() || null;
        versions = parseInt(parts[2]?.trim() || '1', 10) || 1;
      } else {
        format_type = piece.format_type;
        platform = piece.platform ?? null;
        versions = piece.versions ?? 1;
        priority = piece.priority ?? 'media';
        notes = piece.notes ?? null;
      }
      await query(
        `INSERT INTO job_briefing_pieces (briefing_id, format_type, platform, versions, priority, notes, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [briefing.id, format_type, platform, versions, priority, notes, i],
      );
    }
  }

  const { rows: pieces } = await query<any>(
    `SELECT * FROM job_briefing_pieces WHERE briefing_id = $1 ORDER BY sort_order`,
    [briefing.id],
  );
  return { success: true, data: { briefing, pieces, message: 'Briefing salvo como rascunho.' } };
}

async function toolSubmitJobBriefing(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { job_id } = args;
  if (!job_id) return { success: false, error: 'job_id é obrigatório' };

  const { rows } = await query<any>(
    `UPDATE job_briefings
        SET status = 'submitted', submitted_at = now()
      WHERE job_id = $1 AND tenant_id = $2 AND status = 'draft'
      RETURNING *`,
    [job_id, ctx.tenantId],
  );
  if (!rows.length) return { success: false, error: 'Briefing não encontrado ou já submetido.' };

  await query(
    `UPDATE jobs SET automation_status = 'briefing_pending', updated_at = now()
      WHERE id = $1 AND tenant_id = $2`,
    [job_id, ctx.tenantId],
  );

  return { success: true, data: { briefing: rows[0], message: 'Briefing submetido para aprovação. Status do job: briefing_pending.' } };
}

async function toolApproveJobBriefing(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { job_id } = args;
  if (!job_id) return { success: false, error: 'job_id é obrigatório' };

  const { rows } = await query<any>(
    `UPDATE job_briefings
        SET status = 'approved', approved_at = now(), approved_by = $3::uuid
      WHERE job_id = $1 AND tenant_id = $2 AND status = 'submitted'
      RETURNING *`,
    [job_id, ctx.tenantId, ctx.userId ?? null],
  );
  if (!rows.length) return { success: false, error: 'Briefing não encontrado ou não está em status submitted.' };

  await query(
    `UPDATE jobs
        SET status = 'in_progress', automation_status = 'copy_pending', updated_at = now()
      WHERE id = $1 AND tenant_id = $2`,
    [job_id, ctx.tenantId],
  );

  await enqueueJob(ctx.tenantId, 'job_automation', { jobId: job_id, step: 'copy' });

  return { success: true, data: { briefing: rows[0], message: 'Briefing aprovado. Geração de copy iniciada (copy_pending).' } };
}

async function toolGetJobCreativeDrafts(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { job_id } = args;
  if (!job_id) return { success: false, error: 'job_id é obrigatório' };

  const { rows } = await query<any>(
    `SELECT id, draft_type, piece_label, content, approval_status,
            draft_approved_at, created_at
       FROM job_creative_drafts
      WHERE tenant_id = $1 AND job_id = $2
      ORDER BY created_at DESC`,
    [ctx.tenantId, job_id],
  );

  if (!rows.length) {
    return { success: true, data: { drafts: [], message: 'Nenhum rascunho gerado ainda para este job.' } };
  }

  return {
    success: true,
    data: { drafts: rows, total: rows.length },
    metadata: { row_count: rows.length },
  };
}

async function toolApproveCreativeDraft(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { draft_id, job_id } = args;
  if (!draft_id || !job_id) return { success: false, error: 'draft_id e job_id são obrigatórios' };

  const { rows } = await query<any>(
    `UPDATE job_creative_drafts
        SET draft_approved_by = $3,
            draft_approved_at = now(),
            approval_status = 'approved'
      WHERE tenant_id = $1 AND id = $2 AND job_id = $4
      RETURNING id, piece_label, draft_type, approval_status`,
    [ctx.tenantId, draft_id, ctx.userId ?? null, job_id],
  );
  if (!rows.length) return { success: false, error: 'Rascunho não encontrado.' };

  // Auto-advance job from in_review → approved
  const jobRes = await query<any>(
    `SELECT status FROM jobs WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
    [ctx.tenantId, job_id],
  );
  if (jobRes.rows[0]?.status === 'in_review') {
    await query(`UPDATE jobs SET status = 'approved' WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, job_id]);
  }

  return { success: true, data: { draft: rows[0], message: `Rascunho '${rows[0].piece_label}' aprovado.` } };
}

async function toolRegenerateCreativeDraft(args: any, ctx: ToolContext): Promise<ToolResult> {
  const { job_id, step } = args;
  if (!job_id) return { success: false, error: 'job_id é obrigatório' };
  const draftStep = step === 'image' ? 'image' : 'copy';

  const jobRes = await query<any>(
    `SELECT id FROM jobs WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
    [ctx.tenantId, job_id],
  );
  if (!jobRes.rows.length) return { success: false, error: 'Job não encontrado.' };

  const automationStatus = draftStep === 'copy' ? 'copy_pending' : 'image_pending';
  await query(
    `UPDATE jobs SET automation_status = $2 WHERE id = $1 AND tenant_id = $3`,
    [job_id, automationStatus, ctx.tenantId],
  );
  await enqueueJob(ctx.tenantId, 'job_automation', { jobId: job_id, step: draftStep });

  return { success: true, data: { message: `Regeneração de ${draftStep} enfileirada. automation_status → ${automationStatus}.` } };
}
