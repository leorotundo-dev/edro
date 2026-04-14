/**
 * Tool executor for the Jarvis AI Agent.
 * Implements all 22 tools with DB queries and service calls.
 */

import crypto from 'crypto';
import { pool, query } from '../../db';
import { hasClientPerm } from '../../auth/clientPerms';
import { can, normalizeRole } from '../../auth/rbac';
import {
  createBriefing,
  createBriefingStages,
  createCopyVersion,
  getBriefingById,
  listCopyVersions,
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
import { autoCreateJobFromBriefing } from '../jobs/briefingToJobService';
import {
  addCreativeVersion,
  getCreativeSessionContext,
  getCreativeSessionContextBySessionId,
  markReadyToPublish,
  openCreativeSession,
  saveCreativeBrief,
  sendCreativeReview,
  updateCreativeSessionMetadata,
  updateCreativeStage,
} from '../jobs/creativeSessionService';
import { createLibraryItem } from '../../library/libraryRepo';
import { stripTrelloTitle } from '../trelloCardMapper';
import { enqueueOutbox } from '../trelloOutboxService';
import { generatePautaSuggestions } from '../pautaSuggestionService';
import { recordPreferenceFeedback } from '../preferenceEngine';
import { analyzeCognitiveLoad } from '../cognitiveLoadService';
import { generateWithProvider } from './copyOrchestrator';
import { enqueueJob, getJobById as getQueueJobById } from '../../jobs/jobQueue';
import { buildJarvisBackgroundArtifact } from '../jarvisBackgroundJobService';
import { sendEmail } from '../emailService';
import { sendWhatsAppText } from '../whatsappService';
import { decryptJSON } from '../../security/secrets';
import { enforceJarvisToolGovernance } from '../jarvisPolicyService';
import { buildClientLivingMemory } from '../clientLivingMemoryService';
import { listClientMemoryFacts, recordClientMemoryFact } from '../clientMemoryFactsService';
import { analyzeClientMemoryGovernance, applyClientMemoryGovernanceAction } from '../clientMemoryGovernanceService';
import { buildClientState, processAlerts } from '../jarvisDecisionEngine';
import { buildBriefingDiagnostics } from '../briefingDiagnosticService';
import { buildReporteiSemanticSummary } from '../reporteiSemanticService';
import { getTrelloCredentials } from '../trelloSyncService';
import { buildDailyDigest } from '../agencyDigestService';
import {
  createCalendarEvent,
  createCalendarMeeting,
  updateCalendarMeeting,
  deleteCalendarEvent,
} from '../integrations/googleCalendarService';
import { createMeeting, getMeeting, updateMeetingState } from '../meetingService';
import {
  buildSystemHealthSnapshot,
  resolveSystemRepairPlan,
  runSystemRepair,
  SYSTEM_REPAIR_LABELS,
} from '../jarvisSystemHealthService';

// ── Types ──────────────────────────────────────────────────────

export type ToolContext = {
  tenantId: string;
  clientId: string;         // TEXT id from clients table
  edroClientId: string | null; // UUID from edro_clients table
  userId?: string;
  userEmail?: string;
  role?: string | null;
  explicitConfirmation?: boolean;
  conversationId?: string | null;
  conversationRoute?: 'planning' | 'operations';
  pageData?: Record<string, unknown> | null;
};

export type OperationsToolContext = {
  tenantId: string;
  userId?: string;
  userEmail?: string;
  role?: string | null;
  explicitConfirmation?: boolean;
};

export type ToolResult = {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    row_count?: number;
    truncated?: boolean;
    governance?: any;
    confirmation_required?: boolean;
    access?: {
      systemPerm?: string | null;
      clientPerm?: ClientPerm | null;
      role?: string | null;
      clientId?: string;
    };
  };
};

const MAX_RESULT_CHARS = 4000;
const CLIENT_EVIDENCE_SOURCE_TYPES = [
  'meeting',
  'meeting_chat',
  'gmail_message',
  'whatsapp_message',
  'whatsapp_insight',
  'whatsapp_digest',
  'client_document',
] as const;

type ClientEvidenceSourceType = typeof CLIENT_EVIDENCE_SOURCE_TYPES[number];
type ClientPerm = 'read' | 'write' | 'review' | 'publish';
type ToolPermissionRequirement = {
  systemPerm?: string;
  clientPerm?: ClientPerm;
};

function buildRequirementMap(
  toolNames: string[],
  requirement: ToolPermissionRequirement,
): Record<string, ToolPermissionRequirement> {
  return Object.fromEntries(toolNames.map((toolName) => [toolName, requirement]));
}

const TOOL_REQUIREMENTS: Record<string, ToolPermissionRequirement> = {
  ...buildRequirementMap([
    'list_briefings',
    'get_briefing',
    'generate_copy_for_briefing',
    'generate_campaign_strategy',
    'generate_behavioral_copy',
    'search_clipping',
    'get_clipping_item',
    'list_clipping_sources',
    'list_social_trends',
    'search_social_mentions',
    'list_social_keywords',
    'search_library',
    'list_library_items',
    'list_campaigns',
    'get_campaign',
    'list_opportunities',
    'get_client_profile',
    'get_client_living_memory',
    'get_client_memory_facts',
    'get_client_memory_governance',
    'get_client_state',
    'get_context_packet',
    'get_client_reportei_summary',
    'get_briefing_diagnostics',
    'get_intelligence_health',
    'search_client_content',
    'list_client_sources',
    'get_client_insights',
    'retrieve_client_evidence',
    'web_search',
    'web_extract',
    'web_research',
    'generate_strategic_brief',
    'compute_behavior_profiles',
    'compute_learning_rules',
    'list_pauta_inbox',
    'analyze_cognitive_load',
    'consult_gemini',
    'consult_openai',
    'search_whatsapp_messages',
    'list_whatsapp_groups',
    'get_whatsapp_insights',
    'get_whatsapp_digests',
    'get_job_briefing',
    'get_job_creative_drafts',
  ], { systemPerm: 'clients:read', clientPerm: 'read' }),
  ...buildRequirementMap([
    'list_upcoming_events',
    'search_events',
    'get_event_relevance',
  ], { systemPerm: 'calendars:read', clientPerm: 'read' }),
  ...buildRequirementMap([
    'create_briefing',
    'update_briefing_status',
    'delete_briefing',
    'archive_briefing',
    'create_campaign',
    'add_library_note',
    'add_library_url',
    'create_briefing_from_clipping',
    'create_post_pipeline',
    'record_client_memory_fact',
    'apply_client_memory_governance',
    'fill_job_briefing',
    'submit_job_briefing',
    'regenerate_creative_draft',
    'action_opportunity',
  ], { systemPerm: 'clients:write', clientPerm: 'write' }),
  ...buildRequirementMap([
    'pin_clipping_item',
    'archive_clipping_item',
    'add_clipping_source',
    'pause_clipping_source',
    'resume_clipping_source',
  ], { systemPerm: 'clipping:write', clientPerm: 'write' }),
  ...buildRequirementMap([
    'add_calendar_event',
  ], { systemPerm: 'calendars:write', clientPerm: 'write' }),
  ...buildRequirementMap([
    'schedule_meeting',
    'reschedule_meeting',
    'cancel_meeting',
    'schedule_briefing',
  ], { systemPerm: 'meetings:write', clientPerm: 'write' }),
  ...buildRequirementMap([
    'generate_approval_link',
    'prepare_post_approval',
    'approve_pauta',
    'reject_pauta',
    'approve_job_briefing',
    'approve_creative_draft',
  ], { systemPerm: 'posts:review', clientPerm: 'review' }),
  ...buildRequirementMap([
    'schedule_post_publication',
    'publish_studio_post',
  ], { systemPerm: 'posts:review', clientPerm: 'publish' }),
};

const OPS_TOOL_REQUIREMENTS: Record<string, ToolPermissionRequirement> = {
  ...buildRequirementMap([
    'get_client_weekly_summary',
    'get_operations_daily_brief',
  ], { systemPerm: 'clients:read' }),
  ...buildRequirementMap([
    'send_whatsapp_message',
    'send_email',
    'create_trello_card',
    'execute_multi_step_workflow',
  ], { systemPerm: 'clients:write' }),
  get_system_health: { systemPerm: 'portfolio:read' },
  run_system_repair: { systemPerm: 'admin:jobs' },
  ...buildRequirementMap([
    'list_operations_jobs',
    'get_operations_job',
    'get_operations_overview',
    'get_operations_risks',
    'get_operations_signals',
    'get_operations_team',
    'get_creative_ops_workload',
    'get_da_capacity',
    'suggest_job_allocation',
    'suggest_creative_redistribution',
    'get_creative_ops_risk_report',
    'get_creative_ops_quality',
    'get_creative_ops_bottlenecks',
    'get_operations_lookups',
    'create_operations_job',
    'update_operations_job',
    'change_job_status',
    'assign_job_owner',
    'resolve_operations_signal',
    'snooze_operations_signal',
    'manage_job_allocation',
    'apply_job_allocation_recommendation',
    'apply_creative_redistribution',
  ], { systemPerm: 'admin:jobs' }),
};

function applyContextualConfirmation<T extends { explicitConfirmation?: boolean }>(
  args: Record<string, any>,
  ctx: T,
) {
  if (args.confirmed === true || args.confirmed === false) return args;
  if (ctx.explicitConfirmation === true) {
    return { ...args, confirmed: true };
  }
  return args;
}

function buildConfirmationRequiredResult(
  message: string,
  data: Record<string, any>,
): ToolResult {
  return {
    success: false,
    error: 'Confirmação obrigatória. Só execute esta ação quando o usuário confirmar explicitamente.',
    data: {
      ...data,
      confirmation_required: true,
      message,
    },
    metadata: {
      confirmation_required: true,
    },
  };
}

function contextualString(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function resolveContextJobId(args: Record<string, any>, ctx: ToolContext) {
  return contextualString(args.job_id)
    || contextualString(ctx.pageData?.currentJobId)
    || contextualString(ctx.pageData?.jobId)
    || null;
}

function resolveContextBriefingId(args: Record<string, any>, ctx: ToolContext) {
  return contextualString(args.briefing_id)
    || contextualString(ctx.pageData?.currentBriefingId)
    || contextualString(ctx.pageData?.briefingId)
    || null;
}

async function enforceToolAccess(
  toolName: string,
  ctx: ToolContext | OperationsToolContext,
  requirement?: ToolPermissionRequirement,
) {
  if (!requirement) return { metadata: undefined as Record<string, any> | undefined };

  const role = normalizeRole(ctx.role);

  if (requirement.systemPerm && !can(role, requirement.systemPerm)) {
    return {
      error: `Permissão obrigatória para ${toolName}: ${requirement.systemPerm}.`,
      metadata: {
        access: {
          systemPerm: requirement.systemPerm,
          clientPerm: requirement.clientPerm ?? null,
          role,
        },
      },
    };
  }

  if (requirement.clientPerm) {
    const planningCtx = ctx as ToolContext;
    if (!planningCtx.clientId || !planningCtx.userId) {
      return {
        error: `Escopo do cliente ausente para ${toolName}.`,
        metadata: {
          access: {
            systemPerm: requirement.systemPerm ?? null,
            clientPerm: requirement.clientPerm,
            role,
          },
        },
      };
    }

    const allowed = await hasClientPerm({
      tenantId: planningCtx.tenantId,
      userId: planningCtx.userId,
      role: planningCtx.role,
      clientId: planningCtx.clientId,
      perm: requirement.clientPerm,
    });

    if (!allowed) {
      return {
        error: `Permissão de cliente obrigatória para ${toolName}: ${requirement.clientPerm}.`,
        metadata: {
          access: {
            systemPerm: requirement.systemPerm ?? null,
            clientPerm: requirement.clientPerm,
            role,
            clientId: planningCtx.clientId,
          },
        },
      };
    }
  }

  return {
    metadata: {
      access: {
        systemPerm: requirement.systemPerm ?? null,
        clientPerm: requirement.clientPerm ?? null,
        role,
      },
    },
  };
}

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

function buildCreativeInventoryId(platform: string, format: string) {
  return `${platform}__${format}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildStudioEditorUrl(jobId: string, sessionId: string) {
  const params = new URLSearchParams({
    jobId,
    sessionId,
  });
  return `/studio/editor?${params.toString()}`;
}

function buildArtDirectionSessionContext(params: {
  briefingId: string;
  clientId: string;
  platform: string;
  format: string;
  visualStrategy?: Record<string, any> | null;
  layout?: Record<string, any> | null;
  imagePrompt?: Record<string, any> | null;
}) {
  const { briefingId, clientId, platform, format, visualStrategy, layout, imagePrompt } = params;
  return {
    briefing_id: briefingId,
    client_id: clientId,
    platform,
    format,
    visual_strategy: visualStrategy || null,
    layout: layout || null,
    img_prompt: imagePrompt || null,
    reference_examples: Array.isArray(visualStrategy?.referenceExamples) ? visualStrategy.referenceExamples : [],
    trend_signals: Array.isArray(visualStrategy?.trendSignals) ? visualStrategy.trendSignals : [],
    concept_slugs: Array.isArray(visualStrategy?.referenceMovements) ? visualStrategy.referenceMovements : [],
    strategy_summary: typeof visualStrategy?.strategySummary === 'string' ? visualStrategy.strategySummary : null,
    visual_intent: typeof visualStrategy?.intent === 'string' ? visualStrategy.intent : null,
  };
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
    case 'prepare_post_approval':
    case 'schedule_post_publication':
    case 'publish_studio_post':
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
  schedule_meeting: toolScheduleMeeting,
  reschedule_meeting: toolRescheduleMeeting,
  cancel_meeting: toolCancelMeeting,
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
  get_client_living_memory: toolGetClientLivingMemory,
  get_client_memory_facts: toolGetClientMemoryFacts,
  get_client_memory_governance: toolGetClientMemoryGovernance,
  get_client_state: toolGetClientState,
  record_client_memory_fact: toolRecordClientMemoryFact,
  apply_client_memory_governance: toolApplyClientMemoryGovernance,
  get_context_packet: toolGetContextPacket,
  get_client_reportei_summary: toolGetClientReporteiSummary,
  get_briefing_diagnostics: toolGetBriefingDiagnostics,
  get_intelligence_health: toolGetIntelligenceHealth,
  search_client_content: toolSearchClientContent,
  list_client_sources: toolListClientSources,
  get_client_insights: toolGetClientInsights,
  retrieve_client_evidence: toolRetrieveClientEvidence,
  create_post_pipeline: toolCreatePostPipeline,
  prepare_post_approval: toolPreparePostApproval,
  schedule_post_publication: toolSchedulePostPublication,
  publish_studio_post: toolPublishStudioPost,
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
    const effectiveArgs = applyContextualConfirmation(args, ctx);
    const access = await enforceToolAccess(toolName, ctx, TOOL_REQUIREMENTS[toolName]);
    if ('error' in access) {
      return {
        success: false,
        error: access.error,
        metadata: access.metadata,
      };
    }
    const governance = enforceJarvisToolGovernance(toolName, effectiveArgs);
    if ('error' in governance) {
      return {
        success: false,
        error: governance.error,
        metadata: { ...access.metadata, governance: governance.policy },
      };
    }
    const timeoutMs = getToolTimeoutMs(toolName);
    const result = await Promise.race([
      handler(effectiveArgs, ctx),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error(`TOOL_TIMEOUT_${Math.round(timeoutMs / 1000)}s`)), timeoutMs),
      ),
    ]);
    return truncateResult({
      ...result,
      metadata: { ...(result.metadata || {}), ...(access.metadata || {}), governance: governance.policy },
    });
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

  let googleCalendar: { synced: boolean; event_id?: string | null; html_link?: string | null; error?: string | null } = { synced: false };
  try {
    const { rows: clientRows } = await query<{ name: string }>(
      `SELECT name FROM clients WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [ctx.tenantId, ctx.clientId],
    ).catch(() => ({ rows: [] as { name: string }[] }));
    const external = await createCalendarEvent({
      tenantId: ctx.tenantId,
      title,
      eventDate: event_date,
      description: description || notes || null,
      clientId: ctx.clientId,
      clientName: clientRows[0]?.name || null,
    });
    googleCalendar = { synced: true, event_id: external.eventId, html_link: external.htmlLink };
  } catch (err: any) {
    googleCalendar = { synced: false, error: err?.message || 'google_calendar_sync_failed' };
  }

  return {
    success: true,
    data: {
      message: `"${title}" criado no calendário do cliente para ${event_date}.`,
      event: rows[0],
      type: 'custom',
      google_calendar: googleCalendar,
    },
  };
}

function normalizeAttendeeEmails(value: unknown) {
  const emails = Array.isArray(value) ? value : [];
  return Array.from(new Set(
    emails
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  ));
}

async function hasActiveMeetBotRun(tenantId: string, meetingId: string) {
  const { rows } = await query<{ id: string }>(
    `SELECT id
       FROM job_queue
      WHERE tenant_id = $1::uuid
        AND type = 'meet-bot'
        AND status = 'processing'
        AND (payload->>'meetingId' = $2 OR payload->>'meeting_id' = $2)
      LIMIT 1`,
    [tenantId, meetingId],
  ).catch(() => ({ rows: [] as { id: string }[] }));
  return Boolean(rows[0]);
}

async function patchQueuedMeetBotJobs(tenantId: string, meetingId: string, patch: Record<string, unknown>) {
  await query(
    `UPDATE job_queue
        SET payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
            updated_at = NOW()
      WHERE tenant_id = $1::uuid
        AND type = 'meet-bot'
        AND status = 'queued'
        AND (payload->>'meetingId' = $2 OR payload->>'meeting_id' = $2)`,
    [tenantId, meetingId, JSON.stringify(patch)],
  ).catch(() => null);
}

async function detectMeetingConflicts(params: {
  tenantId: string;
  startAt: Date;
  durationMinutes: number;
  excludeMeetingId?: string | null;
}) {
  const endAt = new Date(params.startAt.getTime() + params.durationMinutes * 60_000);
  const values: any[] = [params.tenantId, params.startAt, endAt];
  const excludeClause = params.excludeMeetingId
    ? `AND m.id <> $4`
    : '';
  if (params.excludeMeetingId) {
    values.push(params.excludeMeetingId);
  }

  const { rows } = await query<{
    id: string;
    title: string;
    recorded_at: string | null;
    status: string;
  }>(
    `SELECT m.id, m.title, m.recorded_at::text, m.status
       FROM meetings m
      WHERE m.tenant_id = $1
        AND m.status NOT IN ('archived', 'completed')
        AND m.recorded_at IS NOT NULL
        AND m.recorded_at < $3::timestamptz
        AND (m.recorded_at + make_interval(secs => GREATEST(COALESCE(m.duration_secs, 3600), 900)::int)) > $2::timestamptz
        ${excludeClause}
      ORDER BY m.recorded_at ASC
      LIMIT 5`,
    values,
  ).catch(() => ({ rows: [] as Array<{ id: string; title: string; recorded_at: string | null; status: string }> }));

  return rows;
}

async function toolScheduleMeeting(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.edroClientId) return { success: false, error: 'Client not found in edro_clients' };

  const title = String(args.title || '').trim();
  const scheduledAt = new Date(String(args.scheduled_at || '').trim());
  if (!title || Number.isNaN(scheduledAt.getTime())) {
    return { success: false, error: 'title e scheduled_at válidos são obrigatórios.' };
  }

  const client = await getClientById(ctx.tenantId, ctx.clientId);
  if (!client) return { success: false, error: 'Cliente não encontrado.' };

  const attendeeEmails = normalizeAttendeeEmails(args.attendee_emails);
  const durationMinutes = Math.min(Math.max(Number(args.duration_minutes || 60), 15), 480);
  const conflicts = await detectMeetingConflicts({
    tenantId: ctx.tenantId,
    startAt: scheduledAt,
    durationMinutes,
  });
  if (conflicts.length) {
    const labels = conflicts.map((item) => `${item.title} (${String(item.recorded_at || '').slice(0, 16)})`).join(', ');
    return { success: false, error: `Conflito de agenda detectado com: ${labels}.` };
  }
  const external = await createCalendarMeeting({
    tenantId: ctx.tenantId,
    title,
    startAt: scheduledAt,
    durationMinutes,
    attendeeEmails,
    description: args.description || null,
    clientId: ctx.clientId,
    clientName: client.name || null,
  });

  const meeting = await createMeeting({
    tenantId: ctx.tenantId,
    clientId: ctx.edroClientId,
    title,
    platform: 'meet',
    meetingUrl: external.meetUrl,
    createdBy: ctx.userEmail || 'jarvis',
    source: 'calendar',
    sourceRefId: external.eventId,
    status: 'scheduled',
    recordedAt: scheduledAt,
  });

  const { rows: autoJoinRows } = await query<{ id: string }>(
    `INSERT INTO calendar_auto_joins
       (tenant_id, calendar_event_id, event_title, video_url, video_platform, organizer_email, organizer_name, attendees, scheduled_at, meeting_id, client_id, status)
     VALUES ($1, $2, $3, $4, 'meet', $5, $6, $7::jsonb, $8, $9, $10, 'queued')
     ON CONFLICT (calendar_event_id) DO UPDATE
       SET event_title = EXCLUDED.event_title,
           video_url = EXCLUDED.video_url,
           attendees = EXCLUDED.attendees,
           scheduled_at = EXCLUDED.scheduled_at,
           meeting_id = EXCLUDED.meeting_id,
           client_id = EXCLUDED.client_id,
           status = EXCLUDED.status,
           job_enqueued_at = now(),
           updated_at = now()
     RETURNING id`,
    [
      ctx.tenantId,
      external.eventId,
      title,
      external.meetUrl,
      ctx.userEmail || null,
      ctx.userEmail || null,
      JSON.stringify(attendeeEmails.map((email) => ({ email }))),
      scheduledAt,
      meeting.id,
      ctx.edroClientId,
    ],
  ).catch(() => ({ rows: [] as { id: string }[] }));

  const autoJoinId = autoJoinRows[0]?.id ?? null;
  await enqueueJob(ctx.tenantId, 'meet-bot', {
    meetingId: meeting.id,
    videoUrl: external.meetUrl,
    scheduledAt: scheduledAt.toISOString(),
    autoJoinId,
    clientId: ctx.edroClientId,
    clientName: client.name,
    eventTitle: title,
    meeting_url: external.meetUrl,
    scheduled_at: scheduledAt.toISOString(),
    client_id: ctx.edroClientId,
    title,
    platform: 'meet',
    client_name: client.name,
    source: 'calendar',
  }).catch(() => null);

  return {
    success: true,
    data: {
      meeting_id: meeting.id,
      title,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: durationMinutes,
      meeting_url: external.meetUrl,
      calendar_event_id: external.eventId,
      html_link: external.htmlLink,
      attendee_emails: attendeeEmails,
    },
  };
}

async function toolRescheduleMeeting(args: any, ctx: ToolContext): Promise<ToolResult> {
  const meetingId = String(args.meeting_id || '').trim();
  const scheduledAt = new Date(String(args.scheduled_at || '').trim());
  if (!meetingId || Number.isNaN(scheduledAt.getTime())) {
    return { success: false, error: 'meeting_id e scheduled_at válidos são obrigatórios.' };
  }

  const meeting = await getMeeting(ctx.tenantId, meetingId);
  if (!meeting) return { success: false, error: 'Reunião não encontrada.' };
  if (ctx.edroClientId && meeting.client_id !== ctx.edroClientId) {
    return { success: false, error: 'Reunião não pertence ao cliente atual.' };
  }
  if (await hasActiveMeetBotRun(ctx.tenantId, meeting.id)) {
    return { success: false, error: 'Há um meet-bot em processamento para esta reunião. Remarcação segura indisponível agora.' };
  }

  const title = String(args.title || meeting.title || '').trim() || 'Reunião';
  const durationMinutes = Math.min(Math.max(Number(args.duration_minutes || 60), 15), 480);
  const conflicts = await detectMeetingConflicts({
    tenantId: ctx.tenantId,
    startAt: scheduledAt,
    durationMinutes,
    excludeMeetingId: meeting.id,
  });
  if (conflicts.length) {
    const labels = conflicts.map((item) => `${item.title} (${String(item.recorded_at || '').slice(0, 16)})`).join(', ');
    return { success: false, error: `Conflito de agenda detectado com: ${labels}.` };
  }
  const attendeeEmails = normalizeAttendeeEmails(args.attendee_emails);
  const external = meeting.source_ref_id
    ? await updateCalendarMeeting({
        tenantId: ctx.tenantId,
        eventId: String(meeting.source_ref_id),
        title,
        startAt: scheduledAt,
        durationMinutes,
        description: args.description || null,
        attendeeEmails: attendeeEmails.length ? attendeeEmails : undefined,
      })
    : null;

  const nextMeetingUrl = external?.meetUrl || meeting.meeting_url || null;
  await updateMeetingState({
    meetingId: meeting.id,
    tenantId: ctx.tenantId,
    changes: {
      title,
      recorded_at: scheduledAt,
      meeting_url: nextMeetingUrl,
      status: 'scheduled',
      failed_stage: null,
      failed_reason: null,
      completed_at: null,
    },
    event: {
      eventType: 'meeting.rescheduled',
      stage: 'meeting',
      status: 'scheduled',
      message: 'Reunião remarcada pelo Jarvis.',
      actorType: 'system',
      actorId: 'jarvis',
      payload: {
        previous_scheduled_at: meeting.recorded_at,
        scheduled_at: scheduledAt.toISOString(),
      },
    },
  });

  await query(
    `UPDATE calendar_auto_joins
        SET event_title = $1,
            video_url = COALESCE($2, video_url),
            attendees = CASE WHEN $3::jsonb IS NULL THEN attendees ELSE $3::jsonb END,
            scheduled_at = $4,
            updated_at = now()
      WHERE meeting_id = $5`,
    [
      title,
      nextMeetingUrl,
      attendeeEmails.length ? JSON.stringify(attendeeEmails.map((email) => ({ email }))) : null,
      scheduledAt,
      meeting.id,
    ],
  ).catch(() => null);

  await patchQueuedMeetBotJobs(ctx.tenantId, meeting.id, {
    videoUrl: nextMeetingUrl,
    meeting_url: nextMeetingUrl,
    scheduledAt: scheduledAt.toISOString(),
    scheduled_at: scheduledAt.toISOString(),
    eventTitle: title,
    title,
    attendee_emails: attendeeEmails,
  });

  return {
    success: true,
    data: {
      meeting_id: meeting.id,
      title,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: durationMinutes,
      meeting_url: nextMeetingUrl,
      calendar_event_id: meeting.source_ref_id || null,
      attendee_emails: attendeeEmails,
      google_calendar: external ? { synced: true, html_link: external.htmlLink } : { synced: false, reason: 'meeting_without_google_event' },
    },
  };
}

async function toolCancelMeeting(args: any, ctx: ToolContext): Promise<ToolResult> {
  const meetingId = String(args.meeting_id || '').trim();
  if (!meetingId) return { success: false, error: 'meeting_id é obrigatório.' };

  const meeting = await getMeeting(ctx.tenantId, meetingId);
  if (!meeting) return { success: false, error: 'Reunião não encontrada.' };
  if (ctx.edroClientId && meeting.client_id !== ctx.edroClientId) {
    return { success: false, error: 'Reunião não pertence ao cliente atual.' };
  }
  if (await hasActiveMeetBotRun(ctx.tenantId, meeting.id)) {
    return { success: false, error: 'Há um meet-bot em processamento para esta reunião. Cancelamento seguro indisponível agora.' };
  }

  const reason = String(args.reason || '').trim() || 'cancelled_by_jarvis';
  if (meeting.source_ref_id) {
    await deleteCalendarEvent({
      tenantId: ctx.tenantId,
      eventId: String(meeting.source_ref_id),
    });
  }

  await updateMeetingState({
    meetingId: meeting.id,
    tenantId: ctx.tenantId,
    changes: {
      status: 'archived',
      failed_stage: 'calendar_detect',
      failed_reason: reason,
      completed_at: new Date(),
      last_processed_at: new Date(),
    },
    event: {
      eventType: 'meeting.cancelled',
      stage: 'meeting',
      status: 'archived',
      message: 'Reunião cancelada pelo Jarvis.',
      actorType: 'system',
      actorId: 'jarvis',
      payload: { reason },
    },
  });

  await query(
    `UPDATE calendar_auto_joins
        SET status = 'cancelled',
            last_error = $1,
            updated_at = now()
      WHERE meeting_id = $2`,
    [reason, meeting.id],
  ).catch(() => null);

  await query(
    `UPDATE job_queue
        SET status = 'failed',
            error_message = 'meeting_cancelled',
            payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
            updated_at = NOW()
      WHERE tenant_id = $1::uuid
        AND type = 'meet-bot'
        AND status = 'queued'
        AND (payload->>'meetingId' = $2 OR payload->>'meeting_id' = $2)`,
    [ctx.tenantId, meeting.id, JSON.stringify({ cancelled_by_jarvis: true, cancelled_reason: reason })],
  ).catch(() => null);

  return {
    success: true,
    data: {
      meeting_id: meeting.id,
      status: 'archived',
      cancelled: true,
      reason,
      calendar_event_id: meeting.source_ref_id || null,
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
  const livingMemory = await buildClientLivingMemory({
    tenantId: ctx.tenantId,
    clientId: ctx.clientId,
    daysBack: 45,
    maxDirectives: 6,
    maxEvidence: 3,
    maxActions: 3,
  }).catch(() => null);

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
      living_memory_summary: livingMemory?.snapshot || {
        active_directives: 0,
        evidence_signals: 0,
        fresh_signals_7d: 0,
        pending_commitments: 0,
        evidence_by_source: {},
      },
      active_directives: livingMemory?.directives || [],
    },
  };
}

async function toolGetClientLivingMemory(args: any, ctx: ToolContext): Promise<ToolResult> {
  const question = String(args.question || '').trim();
  const daysBack = Math.min(args.days_back ?? 60, 120);
  const limitEvidence = Math.min(args.limit_evidence ?? 6, 10);
  const limitActions = Math.min(args.limit_actions ?? 4, 8);

  const livingMemory = await buildClientLivingMemory({
    tenantId: ctx.tenantId,
    clientId: ctx.clientId,
    briefing: question
      ? {
        title: question,
        objective: question,
        context: question,
        payload: { notes: question },
      }
      : null,
    daysBack,
    maxDirectives: 8,
    maxEvidence: limitEvidence,
    maxActions: limitActions,
  });

  return {
    success: true,
    data: {
      summary: livingMemory.snapshot,
      directives: livingMemory.directives,
      evidence: livingMemory.evidence,
      pending_actions: livingMemory.pendingActions,
      memory_block: livingMemory.block,
    },
    metadata: {
      row_count: livingMemory.directives.length + livingMemory.evidence.length + livingMemory.pendingActions.length,
    },
  };
}

async function toolGetClientMemoryFacts(args: any, ctx: ToolContext): Promise<ToolResult> {
  const facts = await listClientMemoryFacts({
    tenantId: ctx.tenantId,
    clientId: ctx.clientId,
    daysBack: Math.min(args.days_back ?? 60, 120),
    factTypes: Array.isArray(args.fact_types)
      ? args.fact_types.filter((item: unknown) => ['directive', 'evidence', 'commitment'].includes(String(item)))
      : undefined,
    limit: Math.min(args.limit ?? 20, 50),
  });

  const grouped = {
    directives: facts?.filter((item) => item.fact_type === 'directive') || [],
    commitments: facts?.filter((item) => item.fact_type === 'commitment') || [],
    evidence: facts?.filter((item) => item.fact_type === 'evidence') || [],
  };

  return {
    success: true,
    data: {
      facts: facts || [],
      grouped,
      summary: {
        directives: grouped.directives.length,
        commitments: grouped.commitments.length,
        evidence: grouped.evidence.length,
      },
    },
    metadata: {
      row_count: facts?.length || 0,
    },
  };
}

async function toolGetClientMemoryGovernance(args: any, ctx: ToolContext): Promise<ToolResult> {
  const governance = await analyzeClientMemoryGovernance({
    tenantId: ctx.tenantId,
    clientId: ctx.clientId,
    daysBack: Math.min(args.days_back ?? 365, 365),
    limit: Math.min(args.limit ?? 80, 100),
  });

  return {
    success: true,
    data: governance,
    metadata: {
      row_count: governance.suggestions.length,
    },
  };
}

async function toolRecordClientMemoryFact(args: any, ctx: ToolContext): Promise<ToolResult> {
  const factType = String(args.fact_type || '').trim();
  if (!['directive', 'evidence', 'commitment'].includes(factType)) {
    return { success: false, error: 'fact_type inválido. Use directive, evidence ou commitment.' };
  }
  if (factType === 'directive' && !['boost', 'avoid'].includes(String(args.directive_type || ''))) {
    return { success: false, error: 'directive_type é obrigatório para fact_type=directive.' };
  }

  const recorded = await recordClientMemoryFact({
    tenantId: ctx.tenantId,
    clientId: ctx.clientId,
    factType: factType as 'directive' | 'evidence' | 'commitment',
    title: String(args.title || '').trim(),
    factText: String(args.fact_text || '').trim(),
    summary: contextualString(args.summary),
    directiveType: contextualString(args.directive_type) as 'boost' | 'avoid' | null,
    relatedAt: contextualString(args.related_at),
    deadline: contextualString(args.deadline),
    priority: contextualString(args.priority),
    sourceType: 'jarvis_manual',
    sourceNote: contextualString(args.source_note) || 'registrado pelo Jarvis a pedido explícito do usuário',
    confirmedBy: ctx.userEmail || ctx.userId || null,
  });

  return {
    success: true,
    data: {
      recorded,
      message: 'Fato registrado na memória viva do cliente.',
    },
  };
}

async function toolApplyClientMemoryGovernance(args: any, ctx: ToolContext): Promise<ToolResult> {
  const action = String(args.action || '').trim();
  if (!['archive', 'replace'].includes(action)) {
    return { success: false, error: 'action inválida. Use archive ou replace.' };
  }
  const targetFingerprint = String(args.target_fingerprint || '').trim();
  if (!targetFingerprint) {
    return { success: false, error: 'target_fingerprint é obrigatório.' };
  }
  if (
    action === 'replace'
    && !contextualString(args.replacement_fingerprint)
    && !(args.fact_type && args.title && args.fact_text)
  ) {
    return { success: false, error: 'replace exige replacement_fingerprint ou um novo fato completo (fact_type, title, fact_text).' };
  }
  if (String(args.fact_type || '').trim() === 'directive' && !['boost', 'avoid'].includes(String(args.directive_type || ''))) {
    return { success: false, error: 'directive_type é obrigatório quando o replacement criado na hora for do tipo directive.' };
  }

  const result = await applyClientMemoryGovernanceAction({
    tenantId: ctx.tenantId,
    clientId: ctx.clientId,
    action: action as 'archive' | 'replace',
    targetFingerprint,
    replacementFingerprint: contextualString(args.replacement_fingerprint),
    replacementFact: action === 'replace' && !contextualString(args.replacement_fingerprint) && args.fact_type && args.title && args.fact_text
      ? {
          factType: String(args.fact_type || '').trim() as 'directive' | 'evidence' | 'commitment',
          title: String(args.title || '').trim(),
          factText: String(args.fact_text || '').trim(),
          summary: contextualString(args.summary),
          directiveType: contextualString(args.directive_type) as 'boost' | 'avoid' | null,
          relatedAt: contextualString(args.related_at),
          deadline: contextualString(args.deadline),
          priority: contextualString(args.priority),
        }
      : null,
    reason: contextualString(args.reason),
    confirmedBy: ctx.userEmail || ctx.userId || null,
  });

  return {
    success: true,
    data: {
      result,
      message: action === 'archive'
        ? 'Fato arquivado por governança da memória viva.'
        : 'Fato antigo substituído por governança da memória viva.',
    },
  };
}

async function toolGetClientState(args: any, ctx: ToolContext): Promise<ToolResult> {
  const state = await buildClientState(ctx.tenantId, ctx.clientId);
  return {
    success: true,
    data: state,
  };
}

async function toolGetContextPacket(args: any, ctx: ToolContext): Promise<ToolResult> {
  const briefingId = contextualString(args.briefing_id) || resolveContextBriefingId(args, ctx);
  const briefing = briefingId ? await getBriefingById(briefingId, ctx.tenantId) : null;
  const briefingPayload = (briefing?.payload || {}) as Record<string, any>;

  const [clientState, livingMemory, memoryGovernance, reporteiSummary] = await Promise.all([
    buildClientState(ctx.tenantId, ctx.clientId),
    buildClientLivingMemory({
      tenantId: ctx.tenantId,
      clientId: ctx.clientId,
      briefing: briefing
        ? {
          title: briefing.title,
          objective: briefingPayload.objective ?? briefingPayload.objetivo ?? '',
          context: briefingPayload.context ?? briefingPayload.notes ?? briefingPayload.additional_notes ?? null,
          payload: briefingPayload,
        }
        : null,
      maxEvidence: 5,
      maxActions: 4,
    }),
    analyzeClientMemoryGovernance({
      tenantId: ctx.tenantId,
      clientId: ctx.clientId,
      daysBack: 365,
      limit: 80,
    }),
    buildReporteiSemanticSummary({
      tenantId: ctx.tenantId,
      clientId: ctx.clientId,
      timeWindow: '30d',
    }).catch(() => null),
  ]);

  const diagnostics = briefing
    ? buildBriefingDiagnostics({
        briefing: {
          title: briefing.title,
          objective: briefingPayload.objective ?? briefingPayload.objetivo ?? '',
          context: briefingPayload.context ?? briefingPayload.notes ?? briefingPayload.additional_notes ?? null,
          platform: briefingPayload.platform ?? briefingPayload.plataforma ?? null,
          format: briefingPayload.format ?? briefingPayload.formato ?? briefingPayload.creative_format ?? null,
          payload: briefingPayload,
        },
        livingMemory,
        memoryGovernance,
        reporteiSummary,
      })
    : null;

  const packetSummary = [
    'CONTEXT PACKET:',
    `- Alertas abertos: ${clientState.open_alerts}`,
    `- Diretivas ativas: ${livingMemory.snapshot.active_directives}`,
    `- Sinais vivos 7d: ${livingMemory.snapshot.fresh_signals_7d}`,
    livingMemory.snapshot.decision_signals ? `- Decisões recentes: ${livingMemory.snapshot.decision_signals}` : null,
    livingMemory.snapshot.objection_signals ? `- Objeções recentes: ${livingMemory.snapshot.objection_signals}` : null,
    `- Compromissos pendentes: ${livingMemory.snapshot.pending_commitments}`,
    memoryGovernance.summary.stale_facts ? `- Fatos envelhecidos: ${memoryGovernance.summary.stale_facts}` : null,
    memoryGovernance.summary.active_conflicts ? `- Conflitos internos na memória: ${memoryGovernance.summary.active_conflicts}` : null,
    memoryGovernance.summary.governance_pressure !== 'low' ? `- Pressão de governança: ${memoryGovernance.summary.governance_pressure}` : null,
    reporteiSummary?.integrations ? `- Integrações Reportei com raw: ${reporteiSummary.integrations}` : null,
    reporteiSummary?.family_summary?.length ? `- Famílias quantitativas disponíveis: ${reporteiSummary.family_summary.map((item) => item.family).join(', ')}` : null,
    diagnostics?.severity && diagnostics.severity !== 'none' ? `- Severidade de conflito: ${diagnostics.severity}` : null,
    diagnostics?.requires_confirmation ? '- Gate ativo: confirmação explícita recomendada antes de criar' : null,
    diagnostics?.gaps?.length ? `- Lacunas de briefing: ${diagnostics.gaps.join(' | ')}` : null,
    diagnostics?.tensions?.length ? `- Tensões de briefing: ${diagnostics.tensions.join(' | ')}` : null,
  ].filter(Boolean).join('\n');

  return {
    success: true,
    data: {
      client_state: clientState,
      living_memory: {
        summary: livingMemory.snapshot,
        directives: livingMemory.directives,
        evidence: livingMemory.evidence,
        pending_actions: livingMemory.pendingActions,
      },
      memory_governance: memoryGovernance,
      reportei_summary: reporteiSummary,
      briefing_diagnostics: diagnostics,
      packet_summary: packetSummary,
    },
  };
}

async function toolGetClientReporteiSummary(args: any, ctx: ToolContext): Promise<ToolResult> {
  const timeWindow = contextualString(args.time_window) || '30d';
  const platform = contextualString(args.platform);
  const summary = await buildReporteiSemanticSummary({
    tenantId: ctx.tenantId,
    clientId: ctx.clientId,
    timeWindow,
    platform,
  });

  return {
    success: true,
    data: summary,
    metadata: {
      row_count: summary.top_metrics.length,
    },
  };
}

async function toolGetBriefingDiagnostics(args: any, ctx: ToolContext): Promise<ToolResult> {
  const briefingId = contextualString(args.briefing_id) || resolveContextBriefingId(args, ctx);
  if (!briefingId) return { success: false, error: 'briefing_id é obrigatório no contexto atual.' };

  const briefing = await getBriefingById(briefingId, ctx.tenantId);
  if (!briefing) return { success: false, error: 'Briefing não encontrado.' };

  const payload = (briefing.payload || {}) as Record<string, any>;
  const selectedClientId =
    ctx.clientId
    || contextualString(args.client_id)
    || contextualString((briefing as any).main_client_id)
    || contextualString(payload.client_id)
    || null;

  const livingMemory = selectedClientId
    ? await buildClientLivingMemory({
        tenantId: ctx.tenantId,
        clientId: selectedClientId,
        briefing: {
          title: briefing.title,
          objective: payload.objective ?? payload.objetivo ?? '',
          context: payload.context ?? payload.notes ?? payload.additional_notes ?? null,
          payload,
        },
        maxEvidence: 5,
        maxActions: 4,
      })
    : {
        block: '',
        directives: [],
        evidence: [],
        pendingActions: [],
        snapshot: {
          active_directives: 0,
          evidence_signals: 0,
          fresh_signals_7d: 0,
          pending_commitments: 0,
          evidence_by_source: {},
        },
      };

  const diagnostics = buildBriefingDiagnostics({
    briefing: {
      title: briefing.title,
      objective: payload.objective ?? payload.objetivo ?? '',
      context: payload.context ?? payload.notes ?? payload.additional_notes ?? null,
      platform: payload.platform ?? payload.plataforma ?? null,
      format: payload.format ?? payload.formato ?? payload.creative_format ?? null,
      payload,
    },
    livingMemory,
    memoryGovernance: selectedClientId
      ? await analyzeClientMemoryGovernance({
          tenantId: ctx.tenantId,
          clientId: selectedClientId,
          daysBack: 365,
          limit: 80,
        }).catch(() => null)
      : null,
    reporteiSummary: selectedClientId
      ? await buildReporteiSemanticSummary({
          tenantId: ctx.tenantId,
          clientId: selectedClientId,
          timeWindow: '30d',
          platform: payload.platform ?? payload.plataforma ?? null,
        }).catch(() => null)
      : null,
  });

  return {
    success: true,
    data: {
      briefing_id: briefing.id,
      title: briefing.title,
      diagnostics,
      living_memory_summary: livingMemory.snapshot,
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

  if (sourceSet.has('gmail_message')) {
    const docs = await listClientDocuments({ tenantId: ctx.tenantId, clientId: ctx.clientId, limit: 40 });
    for (const doc of docs) {
      if (String(doc.source_type || '') !== 'gmail_message') continue;
      const occurredAt = doc.published_at || doc.created_at || null;
      if (occurredAt) {
        const timestamp = new Date(occurredAt).getTime();
        if (!Number.isNaN(timestamp) && (Date.now() - timestamp) / 86400000 > daysBack) continue;
      }
      const haystack = [doc.title, doc.content_excerpt, doc.content_text].filter(Boolean).join(' \n ');
      const score = scoreEvidence(tokens, haystack, occurredAt);
      if (hasTokenFilter && score <= 0) continue;
      evidence.push({
        source_type: 'gmail_message',
        source_label: 'Email',
        source_id: doc.id,
        title: doc.title || 'Email do cliente',
        excerpt: buildEvidenceExcerpt(doc.content_excerpt || doc.content_text),
        occurred_at: occurredAt,
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

export async function runCreatePostPipelineNow(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.edroClientId) return { success: false, error: 'Client not found in edro_clients' };

  const requestText = String(args.request || '').trim();
  if (!requestText) return { success: false, error: 'request é obrigatória.' };

  const client = await getClientById(ctx.tenantId, ctx.clientId);
  if (!client) return { success: false, error: 'Cliente não encontrado.' };

  const platform = String(args.platform || 'instagram').trim().toLowerCase();
  const format = String(args.format || 'post').trim();
  const normalizedPlatform = normalizeCreativePlatform(platform);
  const normalizedFormat = normalizeCreativeFormat(format);
  const briefingTitle = deriveBriefingTitleFromRequest(requestText, args.title);
  const objective = String(args.objective || 'engajamento').trim();
  const language = String(args.language || 'pt').trim();

  const briefing = await createBriefing({
    clientId: ctx.edroClientId,
    mainClientId: ctx.clientId,
    title: briefingTitle,
    payload: {
      objective,
      platform,
      format,
      content_type: format,
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

  const tone =
    String(profile.tone_description || profile.tone_profile || profile.voice_profile || '').trim()
    || 'Claro, persuasivo e alinhado à marca';

  const daContext = buildArtDirectionSessionContext({
    briefingId: briefing.id,
    clientId: ctx.clientId,
    platform: normalizedPlatform,
    format: normalizedFormat,
    visualStrategy: orchestrated.visualStrategy,
    layout: orchestrated.layout,
    imagePrompt: orchestrated.imgPrompt,
  });

  const jobSeed = await autoCreateJobFromBriefing(ctx.tenantId, {
    id: briefing.id,
    title: briefing.title,
    main_client_id: ctx.clientId,
    due_at: briefing.due_at ? new Date(briefing.due_at).toISOString() : null,
    brief_context: requestText,
    summary: buildEvidenceExcerpt(copyResult.output, 260),
    content_type: format || 'post',
  });

  const jobId = jobSeed.jobId;
  if (!jobId) {
    return { success: false, error: 'Falha ao criar ou localizar o job operacional do pipeline.' };
  }

  const creativeSession = await openCreativeSession(ctx.tenantId, jobId, ctx.userId ?? null, {
    briefing_id: briefing.id,
  });

  await saveCreativeBrief(ctx.tenantId, creativeSession.session.id, ctx.userId ?? null, {
    briefing_id: briefing.id,
    title: briefing.title,
    objective,
    message: requestText,
    tone,
    event: null,
    date: null,
    notes: buildEvidenceExcerpt(copyResult.output, 400),
    platforms: [normalizedPlatform],
    metadata: {
      source: 'jarvis_create_post_pipeline',
      platform: normalizedPlatform,
      format: normalizedFormat,
      production_type: format || null,
    },
  });

  const inventoryId = buildCreativeInventoryId(normalizedPlatform, normalizedFormat);
  await updateCreativeSessionMetadata(
    ctx.tenantId,
    creativeSession.session.id,
    jobId,
    ctx.userId ?? null,
    {
      metadata: {
        platforms: {
          inventory: [
            {
              id: inventoryId,
              platform: normalizedPlatform,
              format: normalizedFormat,
              production_type: format || 'post',
              index: 0,
              total: 1,
              name: normalizedFormat,
            },
          ],
        },
        editor: {
          activeFormatId: inventoryId,
          pipeline: 'standard',
          taskType: 'social_post',
          tone,
          criarTab: 0,
          selectedOption: 0,
          selectedArteIndex: 0,
        },
        da_context: daContext,
      },
      reason: 'jarvis_post_pipeline_context_seeded',
    },
  );

  await updateCreativeStage(ctx.tenantId, creativeSession.session.id, ctx.userId ?? null, {
    current_stage: 'copy',
    reason: 'jarvis_post_pipeline_copy_ready',
  }).catch(() => null);

  await addCreativeVersion(ctx.tenantId, creativeSession.session.id, jobId, ctx.userId ?? null, {
    version_type: 'copy',
    source: 'ai',
    payload: {
      output: copyResult.output,
      text: copyResult.output,
      title: briefing.title,
      objective,
      platform: normalizedPlatform,
      format: normalizedFormat,
      source_copy_version_id: copyVersion.id,
      briefing_id: briefing.id,
      provider_model: copyResult.model,
      da_context: daContext,
    },
    select: true,
  });

  await addCreativeVersion(ctx.tenantId, creativeSession.session.id, jobId, ctx.userId ?? null, {
    version_type: 'layout',
    source: 'ai',
    payload: {
      layout: orchestrated.layout,
      visual_strategy: orchestrated.visualStrategy || null,
      da_context: daContext,
      briefing_id: briefing.id,
      platform: normalizedPlatform,
      format: normalizedFormat,
      source_copy_version_id: copyVersion.id,
    },
    select: false,
  }).catch(() => null);

  await addCreativeVersion(ctx.tenantId, creativeSession.session.id, jobId, ctx.userId ?? null, {
    version_type: 'image_prompt',
    source: 'ai',
    payload: {
      ...orchestrated.imgPrompt,
      visual_strategy: orchestrated.visualStrategy || null,
      da_context: daContext,
      briefing_id: briefing.id,
      platform: normalizedPlatform,
      format: normalizedFormat,
      source_copy_version_id: copyVersion.id,
    },
    select: false,
  }).catch(() => null);

  await updateCreativeStage(ctx.tenantId, creativeSession.session.id, ctx.userId ?? null, {
    current_stage: 'arte',
    reason: 'jarvis_post_pipeline_art_direction_ready',
  }).catch(() => null);

  const studioUrl = buildStudioEditorUrl(jobId, creativeSession.session.id);

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
      job_id: jobId,
      creative_session_id: creativeSession.session.id,
      copy_id: copyVersion.id,
      platform,
      format,
      studio_url: studioUrl,
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
        ? 'A sessão criativa foi aberta no Studio com copy, direção de arte e link de aprovação prontos.'
        : 'A sessão criativa foi aberta no Studio com copy e direção de arte prontos. Gere o link de aprovação quando quiser enviar ao cliente.',
    },
  };
}

async function toolCreatePostPipeline(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (!ctx.edroClientId) return { success: false, error: 'Client not found in edro_clients' };

  const requestText = String(args.request || '').trim();
  if (!requestText) return { success: false, error: 'request é obrigatória.' };

  const client = await getClientById(ctx.tenantId, ctx.clientId);
  if (!client) return { success: false, error: 'Cliente não encontrado.' };

  const job = await enqueueJob(ctx.tenantId, 'jarvis_background', {
    kind: 'create_post_pipeline',
    args: {
      request: requestText,
      title: args.title ?? null,
      objective: args.objective ?? null,
      platform: args.platform ?? 'instagram',
      format: args.format ?? 'post',
      deadline: args.deadline ?? null,
      language: args.language ?? 'pt',
      generate_approval_link: args.generate_approval_link !== false,
    },
    client_name: client.name,
    context: {
      tenantId: ctx.tenantId,
      clientId: ctx.clientId,
      edroClientId: ctx.edroClientId,
      userId: ctx.userId ?? null,
      userEmail: ctx.userEmail ?? null,
    },
    conversation: {
      route: ctx.conversationRoute ?? 'planning',
      conversationId: ctx.conversationId ?? null,
      edroClientId: ctx.edroClientId ?? null,
    },
  });

  const artifact = buildJarvisBackgroundArtifact({
    id: job.id,
    type: 'jarvis_background',
    status: 'queued',
    payload: {
      kind: 'create_post_pipeline',
      args: {
        request: requestText,
        title: args.title ?? null,
        platform: args.platform ?? 'instagram',
        format: args.format ?? 'post',
      },
      client_name: client.name,
    },
  });

  return {
    success: true,
    data: artifact || {
      type: 'create_post_pipeline',
      background_job_id: job.id,
      job_status: 'queued',
      message: `Pipeline criativo enfileirado para ${client.name}.`,
    },
  };
}

type ResolvedPostWorkflowContext = {
  clientId: string;
  clientName: string;
  briefingId: string;
  briefingTitle: string;
  creativeSessionId: string | null;
  jobId: string | null;
  platform: string;
  format: string | null;
  copyId: string | null;
  copyText: string;
  studioUrl: string | null;
  selectedAsset: { id: string; asset_type: string; file_url: string; thumb_url?: string | null } | null;
};

function inferPublishChannel(platform?: string | null) {
  const value = String(platform || '').trim().toLowerCase();
  if (!value) return 'instagram';
  if (value.includes('linkedin')) return 'linkedin';
  if (value.includes('tiktok')) return 'tiktok';
  if (value.includes('facebook')) return 'facebook';
  return 'instagram';
}

function computeDefaultScheduledForIso() {
  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setUTCHours(13, 0, 0, 0); // 10h BRT
  if (scheduled <= now) scheduled.setUTCDate(scheduled.getUTCDate() + 1);
  while (scheduled.getUTCDay() === 0 || scheduled.getUTCDay() === 6) {
    scheduled.setUTCDate(scheduled.getUTCDate() + 1);
  }
  return scheduled.toISOString();
}

async function resolvePrimaryClientEmail(tenantId: string, clientId: string) {
  const { rows } = await query<{ email: string | null }>(
    `SELECT email
       FROM client_contacts
      WHERE tenant_id = $1
        AND client_id = $2
        AND email IS NOT NULL
      ORDER BY is_primary DESC, created_at ASC
      LIMIT 1`,
    [tenantId, clientId],
  ).catch(() => ({ rows: [] as { email: string | null }[] }));
  return String(rows[0]?.email || '').trim() || null;
}

async function resolvePrimaryClientPhone(tenantId: string, clientId: string) {
  const { rows } = await query<{ whatsapp_phone: string | null }>(
    `SELECT whatsapp_phone
       FROM clients
      WHERE tenant_id = $1
        AND id = $2
      LIMIT 1`,
    [tenantId, clientId],
  ).catch(() => ({ rows: [] as { whatsapp_phone: string | null }[] }));
  return String(rows[0]?.whatsapp_phone || '').trim() || null;
}

async function resolveUserChannels(tenantId: string, userId: string) {
  const { rows } = await query<{ email: string | null; phone: string | null }>(
    `WITH base AS (
       SELECT eu.email,
              fp.whatsapp_jid,
              fp.person_id
         FROM edro_users eu
         LEFT JOIN freelancer_profiles fp ON fp.user_id = eu.id
        WHERE eu.id = $1
        LIMIT 1
     )
     SELECT (SELECT email FROM base) AS email,
            COALESCE(
              NULLIF((SELECT whatsapp_jid FROM base), ''),
              (
                SELECT pi.identity_value
                  FROM person_identities pi
                 WHERE pi.tenant_id = $2
                   AND pi.person_id = (SELECT person_id FROM base)
                   AND pi.identity_type IN ('whatsapp_jid', 'phone_e164')
                 ORDER BY CASE WHEN pi.identity_type = 'whatsapp_jid' THEN 0 ELSE 1 END,
                          pi.is_primary DESC,
                          pi.updated_at DESC
                 LIMIT 1
              )
            ) AS phone`,
    [userId, tenantId],
  ).catch(() => ({ rows: [] as { email: string | null; phone: string | null }[] }));
  return {
    email: String(rows[0]?.email || '').trim() || null,
    phone: String(rows[0]?.phone || '').trim() || null,
  };
}

function getAppBaseUrl() {
  return process.env.APP_URL || process.env.WEB_URL || 'https://app.edro.digital';
}

async function resolvePostWorkflowContext(args: any, ctx: ToolContext): Promise<ResolvedPostWorkflowContext> {
  const backgroundJobId = String(args.background_job_id || '').trim() || null;
  const providedBriefingId = resolveContextBriefingId(args, ctx);
  const providedSessionId = contextualString(args.creative_session_id)
    || contextualString(ctx.pageData?.creativeSessionId)
    || contextualString(ctx.pageData?.currentCreativeSessionId)
    || null;
  const providedJobId = resolveContextJobId(args, ctx);

  let briefingId = providedBriefingId;
  let creativeSessionId = providedSessionId;
  let jobId = providedJobId;

  if (backgroundJobId) {
    const backgroundJob = await getQueueJobById(backgroundJobId, ctx.tenantId);
    if (!backgroundJob || backgroundJob.type !== 'jarvis_background') {
      throw new Error('Artifact de background não encontrado.');
    }
    const result = backgroundJob.payload?.result || {};
    if (backgroundJob.status !== 'done' && !result?.briefing_id) {
      throw new Error('Esse pipeline ainda não terminou. Aguarde o artifact ficar pronto antes de seguir.');
    }
    briefingId ||= String(result.briefing_id || '').trim() || null;
    creativeSessionId ||= String(result.creative_session_id || '').trim() || null;
    jobId ||= String(result.job_id || '').trim() || null;
  }

  let creativeContext = null as Awaited<ReturnType<typeof getCreativeSessionContextBySessionId>> | null;

  if (creativeSessionId) {
    creativeContext = await getCreativeSessionContextBySessionId(ctx.tenantId, creativeSessionId);
  } else if (jobId) {
    creativeContext = await getCreativeSessionContext(ctx.tenantId, jobId);
  } else if (briefingId) {
    const { rows } = await query<{ id: string; job_id: string }>(
      `SELECT id, job_id
         FROM creative_sessions
        WHERE tenant_id = $1
          AND briefing_id = $2
        ORDER BY created_at DESC
        LIMIT 1`,
      [ctx.tenantId, briefingId],
    );
    if (rows[0]?.id) {
      creativeContext = await getCreativeSessionContextBySessionId(ctx.tenantId, rows[0].id);
    }
  }

  briefingId ||= creativeContext?.session.briefing_id || creativeContext?.briefing?.id || null;
  creativeSessionId ||= creativeContext?.session.id || null;
  jobId ||= creativeContext?.job.id || null;

  if (!briefingId) {
    throw new Error('Não consegui resolver o briefing deste workflow. Informe briefing_id ou use o artifact mais recente do Jarvis.');
  }

  const briefing = await getBriefingById(briefingId);
  if (!briefing) throw new Error('Briefing não encontrado.');

  const copies = await listCopyVersions(briefingId).catch(() => []);
  const selectedCopy = creativeContext?.selected_copy_version || copies[0] || null;
  const copyText = String(
    selectedCopy?.payload?.output
    || selectedCopy?.payload?.text
    || selectedCopy?.output
    || '',
  ).trim();

  const selectedAsset = creativeContext?.selected_asset
    ? {
        id: creativeContext.selected_asset.id,
        asset_type: creativeContext.selected_asset.asset_type,
        file_url: creativeContext.selected_asset.file_url,
        thumb_url: creativeContext.selected_asset.thumb_url,
      }
    : null;

  const platform = String(
    creativeContext?.briefing?.payload?.platform
    || creativeContext?.session.metadata?.platforms?.inventory?.[0]?.platform
    || briefing.payload?.platform
    || 'instagram',
  );
  const format = String(
    creativeContext?.briefing?.payload?.format
    || creativeContext?.session.metadata?.platforms?.inventory?.[0]?.format
    || briefing.payload?.format
    || '',
  ) || null;

  const resolvedClientId = String(
    creativeContext?.job.client_id
    || creativeContext?.briefing?.client_id
    || briefing.main_client_id
    || ctx.clientId,
  ).trim();
  const client = await getClientById(ctx.tenantId, resolvedClientId);
  if (!client) throw new Error('Cliente não encontrado para este workflow.');

  return {
    clientId: resolvedClientId,
    clientName: String(client.name || 'Cliente'),
    briefingId,
    briefingTitle: String(briefing.title || 'Post'),
    creativeSessionId,
    jobId,
    platform,
    format,
    copyId: selectedCopy?.id || null,
    copyText,
    studioUrl: creativeSessionId && jobId ? buildStudioEditorUrl(jobId, creativeSessionId) : null,
    selectedAsset,
  };
}

async function sendJarvisApprovalEmail(params: {
  tenantId: string;
  to: string;
  clientName: string;
  briefingTitle: string;
  approvalUrl: string;
  message?: string | null;
}) {
  const body = [
    `Olá,`,
    '',
    `A peça "${params.briefingTitle}" está pronta para sua revisão.`,
    params.message ? `Mensagem da equipe: ${params.message}` : null,
    '',
    `Aprovar ou revisar: ${params.approvalUrl}`,
    '',
    'Edro Studio',
  ].filter(Boolean).join('\n');

  await sendEmail({
    to: params.to,
    tenantId: params.tenantId,
    subject: `Aprovação pendente · ${params.clientName} · ${params.briefingTitle}`,
    text: body,
    html: body.replace(/\n/g, '<br>'),
  });
}

async function publishMetaAssetNow(params: {
  tenantId: string;
  clientId: string;
  imageUrl: string;
  caption: string;
  channel: 'instagram' | 'facebook';
}) {
  const { rows: connectorRows } = await query<any>(
    `SELECT payload, secrets_enc
       FROM connectors
      WHERE tenant_id = $1
        AND client_id = $2
        AND provider = 'meta'
      LIMIT 1`,
    [params.tenantId, params.clientId],
  );
  if (!connectorRows.length) {
    throw new Error('Meta connector não encontrado para este cliente.');
  }

  const connector = connectorRows[0];
  const payload = connector.payload as Record<string, any>;
  const secrets = connector.secrets_enc ? await decryptJSON(connector.secrets_enc) : {};
  const accessToken = secrets.access_token as string | undefined;
  if (!accessToken) throw new Error('Meta access token ausente para este cliente.');

  const version = 'v18.0';
  const igUserId = payload.instagram_business_id as string | undefined;
  const pageId = payload.page_id as string | undefined;

  if (params.channel === 'instagram') {
    if (!igUserId) throw new Error('Instagram Business não configurado neste conector.');
    const createRes = await fetch(`https://graph.facebook.com/${version}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: params.imageUrl,
        caption: params.caption,
        access_token: accessToken,
      }),
    });
    const createData = await createRes.json() as { id?: string; error?: any };
    if (!createData.id) throw new Error(`Instagram media create failed: ${JSON.stringify(createData.error || {})}`);

    const publishRes = await fetch(`https://graph.facebook.com/${version}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: accessToken,
      }),
    });
    const publishData = await publishRes.json() as { id?: string; error?: any };
    if (!publishData.id) throw new Error(`Instagram publish failed: ${JSON.stringify(publishData.error || {})}`);

    return {
      platform: 'Instagram',
      post_id: publishData.id,
      post_url: `https://www.instagram.com/p/${publishData.id}/`,
    };
  }

  if (!pageId) throw new Error('Facebook Page não configurada neste conector.');
  const res = await fetch(`https://graph.facebook.com/${version}/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: params.imageUrl,
      caption: params.caption,
      access_token: accessToken,
    }),
  });
  const data = await res.json() as { id?: string; post_id?: string; error?: any };
  if (!data.id && !data.post_id) {
    throw new Error(`Facebook post failed: ${JSON.stringify(data.error || {})}`);
  }

  const postId = data.post_id ?? data.id!;
  return {
    platform: 'Facebook',
    post_id: postId,
    post_url: `https://www.facebook.com/${postId}`,
  };
}

async function toolPreparePostApproval(args: any, ctx: ToolContext): Promise<ToolResult> {
  const workflow = await resolvePostWorkflowContext(args, ctx);
  const expiresInDays = Math.min(Number(args.expires_in_days || 7), 30);
  const approvalResult = await toolGenerateApprovalLink({
    briefing_id: workflow.briefingId,
    client_name: String(args.client_name || workflow.clientName),
    expires_in_days: expiresInDays,
  }, ctx);
  if (!approvalResult.success) return approvalResult;

  const approvalUrl = String(approvalResult.data?.approvalUrl || '').trim();
  const clientEmail = String(args.client_email || '').trim() || await resolvePrimaryClientEmail(ctx.tenantId, workflow.clientId);

  if (workflow.creativeSessionId && workflow.jobId) {
    await sendCreativeReview(ctx.tenantId, workflow.creativeSessionId, workflow.jobId, ctx.userId ?? null, {
      review_type: 'client_approval',
      payload: {
        briefing_id: workflow.briefingId,
        approval_url: approvalUrl,
        client_email: clientEmail || null,
        source: 'jarvis_prepare_post_approval',
      },
    }).catch(() => null);
  }

  let emailSent = false;
  if (args.send_email === true && clientEmail) {
    await sendJarvisApprovalEmail({
      tenantId: ctx.tenantId,
      to: clientEmail,
      clientName: workflow.clientName,
      briefingTitle: workflow.briefingTitle,
      approvalUrl,
      message: String(args.message || '').trim() || null,
    }).then(() => {
      emailSent = true;
    }).catch(() => {
      emailSent = false;
    });
  }

  return {
    success: true,
    data: {
      message: emailSent
        ? `Aprovação preparada e enviada para ${clientEmail}.`
        : 'Link de aprovação preparado para o workflow atual.',
      briefing_id: workflow.briefingId,
      creative_session_id: workflow.creativeSessionId,
      job_id: workflow.jobId,
      approvalUrl,
      client_email: clientEmail || null,
      studio_url: workflow.studioUrl,
      next_step: emailSent
        ? 'Acompanhe a resposta do cliente. Quando aprovar, o Jarvis pode agendar ou publicar.'
        : 'Envie o link ao cliente ou peça ao Jarvis para mandar a aprovação por e-mail.',
    },
  };
}

async function toolSchedulePostPublication(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (args.confirmed !== true) {
    return { success: false, error: 'Confirmação obrigatória. Só execute este agendamento quando o usuário confirmar explicitamente.' };
  }

  const workflow = await resolvePostWorkflowContext(args, ctx);
  if (!workflow.copyId) {
    return { success: false, error: 'Não encontrei uma copy selecionada para este post. Finalize a copy no Studio antes de agendar.' };
  }

  const scheduledFor = String(args.scheduled_for || '').trim() || computeDefaultScheduledForIso();
  const channel = String(args.channel || inferPublishChannel(workflow.platform)).trim().toLowerCase();

  if (workflow.creativeSessionId && workflow.jobId) {
    await markReadyToPublish(ctx.tenantId, workflow.creativeSessionId, workflow.jobId, ctx.userId ?? null, {
      channel,
      scheduled_for: scheduledFor,
      metadata: {
        source: 'jarvis_schedule_post_publication',
        notes: String(args.notes || '').trim() || null,
      },
    }).catch(() => null);
  }

  const scheduleResult = await toolScheduleBriefing({
    briefing_id: workflow.briefingId,
    copy_id: workflow.copyId,
    channel,
    scheduled_for: scheduledFor,
  }, ctx);
  if (!scheduleResult.success) return scheduleResult;

  return {
    success: true,
    data: {
      message: `Publicação agendada para ${channel}.`,
      briefing_id: workflow.briefingId,
      creative_session_id: workflow.creativeSessionId,
      job_id: workflow.jobId,
      channel,
      scheduled_for: scheduledFor,
      schedule_id: scheduleResult.data?.scheduleId || null,
      studio_url: workflow.studioUrl,
      next_step: 'O post está pronto para a fila de publicação. Se houver asset final, você também pode mandar publicar agora.',
    },
  };
}

async function toolPublishStudioPost(args: any, ctx: ToolContext): Promise<ToolResult> {
  if (args.confirmed !== true) {
    return { success: false, error: 'Confirmação obrigatória. Só execute esta publicação quando o usuário confirmar explicitamente.' };
  }

  const workflow = await resolvePostWorkflowContext(args, ctx);
  const assetUrl = String(workflow.selectedAsset?.file_url || '').trim();
  if (!assetUrl) {
    return { success: false, error: 'Não encontrei asset final selecionado no Studio. Gere ou selecione o asset antes de publicar.' };
  }
  if (!workflow.copyText) {
    return { success: false, error: 'Não encontrei a copy final deste post para publicar.' };
  }

  const channel = String(args.channel || inferPublishChannel(workflow.platform)).trim().toLowerCase();
  const assetType = String(workflow.selectedAsset?.asset_type || '').trim().toLowerCase();
  let published: Record<string, any>;

  if (channel === 'linkedin') {
    if (assetType && assetType !== 'image') {
      return { success: false, error: 'Publicação direta no LinkedIn pelo Jarvis exige um asset de imagem selecionado no Studio.' };
    }
    const { publishLinkedInPost } = await import('../integrations/linkedinService');
    const result = await publishLinkedInPost(ctx.tenantId, workflow.clientId, {
      imageUrl: assetUrl,
      caption: workflow.copyText,
      title: String(args.title || workflow.briefingTitle),
    });
    published = {
      platform: 'LinkedIn',
      post_id: result.postId,
      post_url: result.postUrl,
    };
  } else if (channel === 'tiktok') {
    if (assetType && assetType !== 'video') {
      return { success: false, error: 'Publicação direta no TikTok pelo Jarvis exige um asset de vídeo selecionado no Studio.' };
    }
    const { publishTikTokVideo } = await import('../integrations/tiktokService');
    const result = await publishTikTokVideo(ctx.tenantId, workflow.clientId, {
      videoUrl: assetUrl,
      caption: workflow.copyText,
    });
    published = {
      platform: 'TikTok',
      post_id: result.publishId,
      post_url: result.shareUrl,
    };
  } else if (channel === 'facebook' || channel === 'instagram') {
    if (assetType && assetType !== 'image') {
      return { success: false, error: 'Publicação direta em Instagram/Facebook pelo Jarvis exige um asset de imagem selecionado no Studio.' };
    }
    published = await publishMetaAssetNow({
      tenantId: ctx.tenantId,
      clientId: workflow.clientId,
      imageUrl: assetUrl,
      caption: workflow.copyText,
      channel: channel === 'facebook' ? 'facebook' : 'instagram',
    });
  } else {
    return { success: false, error: `Canal "${channel}" não suportado para publicação direta pelo Jarvis.` };
  }

  if (workflow.jobId) {
    await query(
      `UPDATE jobs
          SET status = 'published',
              completed_at = COALESCE(completed_at, NOW())
        WHERE tenant_id = $1
          AND id = $2`,
      [ctx.tenantId, workflow.jobId],
    ).catch(() => null);
  }

  if (workflow.creativeSessionId && workflow.jobId) {
    await query(
      `INSERT INTO creative_publication_intents (
         tenant_id, creative_session_id, job_id, channel, scheduled_for, status, metadata
       ) VALUES ($1, $2, $3, $4, NOW(), 'published', $5::jsonb)`,
      [
        ctx.tenantId,
        workflow.creativeSessionId,
        workflow.jobId,
        channel,
        JSON.stringify({
          source: 'jarvis_publish_studio_post',
          platform: published.platform,
          post_id: published.post_id || null,
          post_url: published.post_url || null,
          asset_id: workflow.selectedAsset?.id || null,
        }),
      ],
    ).catch(() => null);

    await syncOperationalRuntimeForJob(ctx.tenantId, workflow.jobId).catch(() => null);
  }

  return {
    success: true,
    data: {
      message: `Post publicado em ${published.platform}.`,
      briefing_id: workflow.briefingId,
      creative_session_id: workflow.creativeSessionId,
      job_id: workflow.jobId,
      channel,
      platform: published.platform,
      post_id: published.post_id || null,
      post_url: published.post_url || null,
      studio_url: workflow.studioUrl,
      next_step: 'A publicação foi concluída. Agora o Jarvis pode acompanhar performance, feedback e operação.',
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
    `INSERT INTO edro_publish_schedule (briefing_id, copy_id, channel, scheduled_for, tenant_id, status)
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
  buildPlannerSnapshot,
  buildRiskSnapshot,
  upsertJobAllocation,
  syncOperationalRuntimeForJob,
} from '../../services/jobs/operationsRuntimeService';
import { calculatePriority } from '../../services/jobs/priorityService';
import { estimateMinutes } from '../../services/jobs/estimationService';
import { proposeAllocations } from '../../services/allocationService';
import { getAvailableDAs, getWeeklyCapacity } from '../../services/daBillingService';

// View path map — keeps routing logic in one place
const VIEW_PATHS: Record<string, string> = {
  operacoes:           '/operacoes',
  'operacoes/kanban':  '/operacoes',
  clientes:            '/clientes',
  campanhas:           '/admin/campanhas',
  equipe:              '/admin/equipe',
  agenda:              '/agenda',
  'admin/health':      '/admin/health',
  'admin/trello':      '/admin/trello',
  'admin/campanhas':   '/admin/campanhas',
};

async function opsNavigateTo(args: any, _ctx: OperationsToolContext): Promise<ToolResult> {
  const path = VIEW_PATHS[args.view] ?? `/${args.view}`;
  return {
    success: true,
    data: {
      navigate: true,
      path,
      label: args.label ?? args.view,
    },
    metadata: {},
  };
}

const OPS_TOOL_MAP: Record<string, (args: any, ctx: OperationsToolContext) => Promise<ToolResult>> = {
  get_client_weekly_summary: opsGetClientWeeklySummary,
  get_operations_daily_brief: opsGetOperationsDailyBrief,
  get_system_health: opsGetSystemHealth,
  list_operations_jobs: opsListJobs,
  get_operations_job: opsGetJob,
  get_operations_overview: opsGetOverview,
  get_operations_risks: opsGetRisks,
  get_operations_signals: opsGetSignals,
  get_operations_team: opsGetTeam,
  get_creative_ops_workload: opsGetCreativeWorkload,
  get_da_capacity: opsGetDaCapacity,
  suggest_job_allocation: opsSuggestJobAllocation,
  suggest_creative_redistribution: opsSuggestCreativeRedistribution,
  get_creative_ops_risk_report: opsGetCreativeRiskReport,
  get_creative_ops_quality: opsGetCreativeQuality,
  get_creative_ops_bottlenecks: opsGetCreativeBottlenecks,
  apply_job_allocation_recommendation: opsApplyJobAllocationRecommendation,
  apply_creative_redistribution: opsApplyCreativeRedistribution,
  get_operations_lookups: opsGetLookups,
  send_whatsapp_message: opsSendWhatsAppMessage,
  send_email: opsSendEmail,
  create_trello_card: opsCreateTrelloCard,
  run_system_repair: opsRunSystemRepair,
  create_operations_job: opsCreateJob,
  update_operations_job: opsUpdateJob,
  change_job_status: opsChangeJobStatus,
  assign_job_owner: opsAssignOwner,
  resolve_operations_signal: opsResolveSignal,
  snooze_operations_signal: opsSnoozeSignal,
  manage_job_allocation: opsManageAllocation,
  execute_multi_step_workflow: opsExecuteMultiStepWorkflow,
  navigate_to_view: opsNavigateTo,
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
    const effectiveArgs = applyContextualConfirmation(args, ctx);
    const access = await enforceToolAccess(toolName, ctx, OPS_TOOL_REQUIREMENTS[toolName]);
    if ('error' in access) {
      return {
        success: false,
        error: access.error,
        metadata: access.metadata,
      };
    }
    const governance = enforceJarvisToolGovernance(toolName, effectiveArgs);
    if ('error' in governance) {
      return {
        success: false,
        error: governance.error,
        metadata: { ...(access.metadata || {}), governance: governance.policy },
      };
    }
    const timeoutMs =
      toolName === 'suggest_creative_redistribution' ? 20000 :
        toolName === 'apply_job_allocation_recommendation' || toolName === 'apply_creative_redistribution' ? 20000 :
        toolName === 'suggest_job_allocation' ? 15000 :
          toolName === 'get_creative_ops_workload' || toolName === 'get_da_capacity' ||
            toolName === 'get_creative_ops_risk_report' || toolName === 'get_creative_ops_quality' ||
            toolName === 'get_creative_ops_bottlenecks' ? 15000 :
            10000;
    const result = await Promise.race([
      handler(effectiveArgs, ctx),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error(`TOOL_TIMEOUT_${Math.round(timeoutMs / 1000)}s`)), timeoutMs),
      ),
    ]);
    return truncateResult({
      ...result,
      metadata: { ...(result.metadata || {}), ...(access.metadata || {}), governance: governance.policy },
    });
  } catch (err: any) {
    console.error(`[opsToolExecutor] ${toolName} failed:`, err.message);
    return { success: false, error: err.message || 'Tool execution failed' };
  }
}

// ── Operations Tool Implementations ──────────────────────────────

// Resolve a job-like object from project_cards (Trello source) when not found in jobs table.
async function getProjectCardAsJob(tenantId: string, cardId: string) {
  const { rows } = await query<any>(
    `SELECT
       pc.id, pc.title, pc.description AS summary, pc.due_date, pc.priority, pc.estimated_hours,
       pc.is_archived, pc.created_at, pc.board_id, pc.list_id,
       pl.name AS list_name,
       COALESCE(m.ops_status, pl.name) AS status,
       pb.client_id,
       cl.name AS client_name,
       (SELECT pcm.display_name FROM project_card_members pcm WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) AS owner_name,
       (SELECT eu.id FROM project_card_members pcm
          JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
         WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) AS owner_id
     FROM project_cards pc
     JOIN project_lists pl ON pl.id = pc.list_id
     JOIN project_boards pb ON pb.id = pc.board_id
     LEFT JOIN trello_list_status_map m ON m.list_id = pl.id AND m.tenant_id = $1
     LEFT JOIN clients cl ON cl.id::text = pb.client_id
     WHERE pc.id = $2 AND pc.tenant_id = $1 AND pc.is_archived = false
     LIMIT 1`,
    [tenantId, cardId],
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    ...r,
    title: stripTrelloTitle(r.title, r.client_name),
    _source: 'project_card',
    deadline_at: r.due_date ? `${r.due_date}T23:59:00` : null,
    estimated_minutes: r.estimated_hours ? Math.round(parseFloat(r.estimated_hours) * 60) : null,
    priority_band: r.priority === 'urgent' ? 'p0' : r.priority === 'high' ? 'p1' : 'p2',
    is_urgent: r.priority === 'urgent',
  };
}

/** Returns the Trello card ID for a project_card row, or null if not linked. */
async function getTrelloCardId(tenantId: string, cardId: string): Promise<string | null> {
  const res = await query<{ trello_card_id: string }>(
    `SELECT trello_card_id FROM project_cards WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
    [tenantId, cardId],
  );
  return res.rows[0]?.trello_card_id ?? null;
}

async function opsListJobs(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const values: any[] = [ctx.tenantId];
  // By default exclude archived; include_completed also adds done; deadline_month forces include_completed
  const hasDateFilter = !!(args.deadline_month);
  const includeCompleted = args.include_completed === true || hasDateFilter;
  const where = [`j.tenant_id = $1`];
  if (!includeCompleted) {
    where.push(`j.status NOT IN ('archived','done')`);
  }

  if (args.status) { values.push(args.status); where.push(`j.status = $${values.length}`); }
  if (args.priority_band) { values.push(args.priority_band); where.push(`j.priority_band = $${values.length}`); }
  if (args.owner_id) { values.push(args.owner_id); where.push(`j.owner_id = $${values.length}`); }
  if (args.client_id) { values.push(args.client_id); where.push(`j.client_id = $${values.length}`); }
  if (args.urgent === true) { where.push(`j.is_urgent = true`); }
  if (args.unassigned === true) { where.push(`j.owner_id IS NULL`); }

  // Date filters on deadline_at
  if (args.deadline_month) {
    const month = Number(args.deadline_month);
    const year = args.deadline_year ? Number(args.deadline_year) : new Date().getFullYear();
    values.push(month); where.push(`EXTRACT(MONTH FROM j.deadline_at) = $${values.length}`);
    values.push(year);  where.push(`EXTRACT(YEAR  FROM j.deadline_at) = $${values.length}`);
  }

  const limit = Math.min(args.limit || 20, 50);

  // Only add project_cards UNION when no jobs-specific filters are used
  const hasJobsOnlyFilter = !!(args.priority_band || args.owner_id || args.urgent);
  const cardStatusClause = args.status ? `AND COALESCE(m.ops_status, pl.name) = '${args.status.replace(/'/g, "''")}'` : '';
  const cardUnassignedClause = args.unassigned === true ? `AND (SELECT COUNT(*) FROM project_card_members pcm2 WHERE pcm2.card_id = pc.id) = 0` : '';

  const unionSql = hasJobsOnlyFilter ? '' : `
    UNION ALL
    SELECT
      pc.id, pc.title, COALESCE(m.ops_status, pl.name) AS status,
      CASE pc.priority WHEN 'urgent' THEN 'p0' WHEN 'high' THEN 'p1' ELSE 'p2' END AS priority_band,
      NULL AS job_type, pc.priority AS complexity,
      (pc.priority = 'urgent') AS is_urgent,
      pc.due_date::timestamptz AS deadline_at,
      ROUND(pc.estimated_hours * 60)::int AS estimated_minutes,
      pc.created_at,
      cl.name AS client_name,
      (SELECT pcm.display_name FROM project_card_members pcm WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) AS owner_name,
      'project_card' AS _source
    FROM project_cards pc
    JOIN project_lists pl ON pl.id = pc.list_id
    JOIN project_boards pb ON pb.id = pc.board_id
    LEFT JOIN trello_list_status_map m ON m.list_id = pl.id AND m.tenant_id = $1
    LEFT JOIN clients cl ON cl.id::text = pb.client_id
    WHERE pc.tenant_id = $1 AND pc.is_archived = false
      ${cardStatusClause}
      ${cardUnassignedClause}
  `;

  const { rows } = await query(
    `SELECT j.id, j.title, j.status, j.priority_band, j.job_type, j.complexity,
            j.is_urgent, j.deadline_at, j.estimated_minutes, j.created_at,
            c.name AS client_name,
            COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
            'jobs'::text AS _source
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN edro_users u ON u.id = j.owner_id
     WHERE ${where.join(' AND ')}
     ${unionSql}
     ORDER BY
       CASE priority_band WHEN 'p0' THEN 0 WHEN 'p1' THEN 1 WHEN 'p2' THEN 2 WHEN 'p3' THEN 3 ELSE 4 END,
       deadline_at ASC NULLS LAST,
       created_at DESC
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
  if (!rows.length) {
    // Fallback: check project_cards (Trello source)
    const card = await getProjectCardAsJob(ctx.tenantId, args.job_id);
    if (!card) return { success: false, error: 'Job não encontrado.' };
    const { rows: cardComments } = await query(
      `SELECT body, commented_at AS created_at, author_name FROM project_card_comments WHERE card_id = $1 ORDER BY commented_at DESC LIMIT 10`,
      [args.job_id],
    );
    return { success: true, data: { ...card, history: [], comments: cardComments } };
  }

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

function opsPriorityWeight(priorityBand?: string | null) {
  switch (String(priorityBand || '').toLowerCase()) {
    case 'p0': return 0;
    case 'p1': return 1;
    case 'p2': return 2;
    case 'p3': return 3;
    default: return 4;
  }
}

function opsUsageState(usage: number) {
  if (usage >= 1) return 'sobrecarregado';
  if (usage >= 0.85) return 'em_pressao';
  if (usage <= 0.35) return 'com_folga';
  return 'equilibrado';
}

function opsIsActiveJobStatus(status?: string | null) {
  return !['done', 'archived', 'published', 'cancelled'].includes(String(status || '').toLowerCase());
}

function opsIsMovableCreativeJob(job: any, riskBand?: string | null) {
  const jobType = String(job.job_type || '').toLowerCase();
  const status = String(job.status || '').toLowerCase();
  if (!opsIsActiveJobStatus(status)) return false;
  if (['meeting', 'approval', 'publication'].includes(jobType)) return false;
  if (['awaiting_approval', 'approved', 'scheduled'].includes(status)) return false;
  if (riskBand === 'critical' && opsPriorityWeight(job.priority_band) <= 1) return false;
  if (job.deadline_at) {
    const diffHours = (new Date(job.deadline_at).getTime() - Date.now()) / 3600000;
    if (Number.isFinite(diffHours) && diffHours <= 12) return false;
  }
  return true;
}

function opsRiskBandWeight(riskBand?: string | null) {
  switch (String(riskBand || '').toLowerCase()) {
    case 'critical': return 5;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function opsCreativeRiskState(params: {
  usage: number;
  criticalJobs: number;
  highRiskJobs: number;
  blockedJobs: number;
  nearDeadlineJobs: number;
  riskScore: number;
}) {
  if (params.criticalJobs > 0 || params.usage >= 1 || params.riskScore >= 10) return 'critico';
  if (params.highRiskJobs > 0 || params.blockedJobs > 0 || params.nearDeadlineJobs >= 2 || params.usage >= 0.85 || params.riskScore >= 6) return 'alto';
  if (params.nearDeadlineJobs > 0 || params.usage >= 0.7 || params.riskScore >= 3) return 'moderado';
  return 'estavel';
}

function opsCreativeQualityState(params: {
  approvalRate: number | null;
  avgRevisionCount: number;
  clientReworkCount: number;
  highReworkJobs: number;
}) {
  if ((params.approvalRate !== null && params.approvalRate < 60) || params.avgRevisionCount >= 2.5 || params.clientReworkCount >= 3 || params.highReworkJobs >= 3) {
    return 'critico';
  }
  if ((params.approvalRate !== null && params.approvalRate < 75) || params.avgRevisionCount >= 1.4 || params.clientReworkCount >= 1 || params.highReworkJobs >= 1) {
    return 'atencao';
  }
  return 'saudavel';
}

function opsCreativeBottleneckSeverity(score: number) {
  if (score >= 14) return 'critico';
  if (score >= 8) return 'alto';
  if (score >= 4) return 'moderado';
  return 'leve';
}

async function opsGetCreativeWorkload(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const [planner, teamRes] = await Promise.all([
    buildPlannerSnapshot(ctx.tenantId),
    query(
      `SELECT
         u.id,
         COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name,
         u.email,
         tu.role,
         fp.specialty,
         CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS person_type,
         (SELECT COUNT(*) FROM jobs j WHERE j.owner_id = u.id AND j.tenant_id = $1 AND j.status NOT IN ('done','archived','published','cancelled')) AS active_jobs,
         (SELECT COUNT(*) FROM jobs j WHERE j.owner_id = u.id AND j.tenant_id = $1 AND j.status = 'blocked') AS blocked_jobs,
         (SELECT COUNT(*) FROM jobs j WHERE j.owner_id = u.id AND j.tenant_id = $1 AND j.deadline_at IS NOT NULL AND j.status NOT IN ('done','archived','published','cancelled') AND j.deadline_at <= NOW() + INTERVAL '24 hours') AS near_deadline_jobs
       FROM tenant_users tu
       JOIN edro_users u ON u.id = tu.user_id
       LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
       WHERE tu.tenant_id = $1
       ORDER BY name ASC`,
      [ctx.tenantId],
    ),
  ]);

  const limit = Math.min(args.limit || 12, 25);
  const personType = args.person_type && args.person_type !== 'all' ? String(args.person_type) : null;
  const specialtyFilter = String(args.specialty || '').trim().toLowerCase();
  const includeJobs = args.include_jobs === true;
  const teamMap = new Map(teamRes.rows.map((row: any) => [row.id, row]));

  let owners = planner.owners
    .map((row) => {
      const teamRow = teamMap.get(row.owner.id);
      const usagePct = Math.round((row.usage || 0) * 100);
      const availableMinutes = Math.max(0, row.allocable_minutes - row.committed_minutes - row.tentative_minutes);
      const activeJobs = Number(teamRow?.active_jobs ?? row.jobs.length ?? 0);
      const blockedJobs = Number(teamRow?.blocked_jobs ?? row.jobs.filter((job) => job.status === 'blocked').length ?? 0);
      const nearDeadlineJobs = Number(teamRow?.near_deadline_jobs ?? 0);
      const state = opsUsageState(row.usage || 0);

      return {
        owner_id: row.owner.id,
        name: row.owner.name,
        email: row.owner.email,
        role: row.owner.role,
        specialty: row.owner.specialty,
        person_type: row.owner.person_type,
        state,
        usage_pct: usagePct,
        allocable_minutes: row.allocable_minutes,
        committed_minutes: row.committed_minutes,
        tentative_minutes: row.tentative_minutes,
        available_minutes: availableMinutes,
        active_jobs: activeJobs,
        blocked_jobs: blockedJobs,
        near_deadline_jobs: nearDeadlineJobs,
        recommendation:
          state === 'sobrecarregado' ? 'Redistribuir ou proteger a agenda imediatamente.' :
            state === 'em_pressao' ? 'Evitar nova entrada sem revisar prioridades.' :
              state === 'com_folga' ? 'Pode absorver demanda criativa nova.' :
                'Carga equilibrada no momento.',
        jobs: includeJobs ? row.jobs.slice(0, 6).map((job) => ({
          id: job.id,
          title: job.title,
          client_name: job.client_name,
          status: job.status,
          priority_band: job.priority_band,
          deadline_at: job.deadline_at,
        })) : undefined,
      };
    })
    .filter((row) => !personType || row.person_type === personType)
    .filter((row) => !specialtyFilter || String(row.specialty || '').toLowerCase().includes(specialtyFilter));

  if (args.only_overloaded === true) {
    owners = owners.filter((row) => row.state === 'sobrecarregado' || row.state === 'em_pressao');
  }

  owners = owners
    .sort((a, b) =>
      (b.usage_pct - a.usage_pct) ||
      (b.near_deadline_jobs - a.near_deadline_jobs) ||
      (b.blocked_jobs - a.blocked_jobs) ||
      a.name.localeCompare(b.name))
    .slice(0, limit);

  const summary = {
    total_people: owners.length,
    overloaded: owners.filter((row) => row.state === 'sobrecarregado').length,
    under_pressure: owners.filter((row) => row.state === 'em_pressao').length,
    with_capacity: owners.filter((row) => row.state === 'com_folga').length,
    unassigned_jobs: planner.unassigned_jobs.length,
  };

  return {
    success: true,
    data: {
      summary,
      owners,
      unassigned_jobs: planner.unassigned_jobs.slice(0, 8).map((job) => ({
        id: job.id,
        title: job.title,
        client_name: job.client_name,
        priority_band: job.priority_band,
        deadline_at: job.deadline_at,
        job_type: job.job_type,
      })),
    },
  };
}

async function opsGetDaCapacity(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 10, 20);
  const requiredSkill = String(args.required_skill || '').trim() || undefined;

  await getAvailableDAs(ctx.tenantId, requiredSkill).catch(() => []);

  const [capacity, planner, available] = await Promise.all([
    getWeeklyCapacity(ctx.tenantId),
    buildPlannerSnapshot(ctx.tenantId),
    getAvailableDAs(ctx.tenantId, requiredSkill),
  ]);

  const ownerMap = new Map(
    planner.owners
      .filter((row) => row.owner.person_type === 'freelancer')
      .map((row) => [row.owner.id, row]),
  );
  const availableMap = new Map(available.map((row) => [row.freelancer_id, row]));

  const rows = capacity
    .map((slot) => {
      const owner = ownerMap.get(slot.freelancer_id);
      const availableInfo = availableMap.get(slot.freelancer_id);
      const usagePct = owner ? Math.round((owner.usage || 0) * 100) : null;
      return {
        freelancer_id: slot.freelancer_id,
        name: owner?.owner.name || availableInfo?.name || slot.freelancer_id,
        specialty: owner?.owner.specialty || null,
        usage_pct: usagePct,
        slots_total: slot.slots_total,
        slots_used: slot.slots_used,
        slots_blocked: slot.slots_blocked,
        slots_available: slot.slots_available,
        allocation_score: availableInfo?.score ?? null,
        recommendation:
          slot.slots_available <= 0 ? 'Sem slots disponíveis nesta semana.' :
            slot.slots_available === 1 ? 'Pode receber uma demanda curta.' :
              'Tem capacidade para absorver novas demandas.',
      };
    })
    .sort((a, b) =>
      (b.slots_available - a.slots_available) ||
      ((a.usage_pct ?? 999) - (b.usage_pct ?? 999)) ||
      a.name.localeCompare(b.name))
    .slice(0, limit);

  return {
    success: true,
    data: {
      summary: {
        week_start: capacity[0]?.week_start ?? null,
        freelancers_total: capacity.length,
        available_now: rows.filter((row) => row.slots_available > 0).length,
        slots_available_total: capacity.reduce((sum, row) => sum + row.slots_available, 0),
        required_skill: requiredSkill ?? null,
      },
      ranking: rows,
    },
  };
}

async function opsSuggestJobAllocation(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 5, 8);
  const { rows } = await query(
    `SELECT j.id, j.title, j.client_id, j.job_type, j.channel, j.required_skill, j.priority_band, j.deadline_at,
            COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
            c.name AS client_name
       FROM jobs j
       LEFT JOIN edro_users u ON u.id = j.owner_id
       LEFT JOIN clients c ON c.id = j.client_id
      WHERE j.tenant_id = $1 AND j.id = $2
      LIMIT 1`,
    [ctx.tenantId, args.job_id],
  );
  // Fallback to project_cards for Trello-sourced jobs
  if (!rows.length) {
    const card = await getProjectCardAsJob(ctx.tenantId, args.job_id);
    if (!card) return { success: false, error: 'Job não encontrado.' };
    const proposals = (await proposeAllocations(ctx.tenantId, args.job_id)).slice(0, limit);
    return {
      success: true,
      data: {
        job: { id: card.id, title: card.title, client_name: card.client_name, deadline_at: card.deadline_at, _source: 'project_card' },
        recommended_owner_id: proposals[0]?.freelancerId ?? null,
        recommended_owner_name: proposals[0]?.name ?? null,
        recommendations: proposals.map((p, i) => ({ rank: i + 1, freelancer_id: p.freelancerId, name: p.name, specialty: (p as any).specialty })),
        note: proposals.length ? undefined : 'Nenhum DA elegível encontrado para este job no momento.',
      },
    };
  }

  const job = rows[0];
  const proposals = (await proposeAllocations(ctx.tenantId, args.job_id)).slice(0, limit);
  if (!proposals.length) {
    return {
      success: true,
      data: {
        job,
        recommendations: [],
        note: 'Nenhum DA elegível encontrado para este job no momento.',
      },
    };
  }

  return {
    success: true,
    data: {
      job,
      recommended_owner_id: proposals[0].freelancerId,
      recommended_owner_name: proposals[0].name,
      recommendations: proposals.map((proposal, index) => ({
        rank: index + 1,
        freelancer_id: proposal.freelancerId,
        name: proposal.name,
        specialty: proposal.specialty,
        experience_level: proposal.experienceLevel,
        score: proposal.score,
        estimated_available_at: proposal.estimatedAvailableAt,
        estimated_completion_at: proposal.estimatedCompletionAt,
        current_active_jobs: proposal.currentActiveJobs,
        max_concurrent_jobs: proposal.maxConcurrentJobs,
        punctuality_score: proposal.punctualityScore,
        approval_rate: proposal.approvalRate,
        rationale: proposal.rationale,
      })),
    },
  };
}

async function opsSuggestCreativeRedistribution(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const maxJobs = Math.min(args.max_jobs || 5, 8);
  const onlyHighRisk = args.only_high_risk === true;
  const ownerFilter = String(args.owner_id || '').trim() || null;

  const [planner, risks] = await Promise.all([
    buildPlannerSnapshot(ctx.tenantId),
    buildRiskSnapshot(ctx.tenantId),
  ]);

  const riskMap = new Map<string, { band: string; summary?: string | null; action?: string | null }>();
  for (const job of [...(risks.critical || []), ...(risks.high || [])]) {
    riskMap.set(job.id, {
      band: String(job.metadata?.risk_signal?.band || '').toLowerCase(),
      summary: job.metadata?.risk_signal?.summary || null,
      action: job.metadata?.risk_signal?.suggested_action || null,
    });
  }

  const overloadedOwners = planner.owners
    .filter((row) => !ownerFilter || row.owner.id === ownerFilter)
    .filter((row) => row.usage >= 0.85 || row.jobs.some((job) => String(riskMap.get(job.id)?.band || '') === 'critical'))
    .sort((a, b) => b.usage - a.usage);

  const suggestions: Array<Record<string, any>> = [];

  for (const owner of overloadedOwners) {
    const movableJobs = owner.jobs
      .filter((job) => {
        const riskBand = riskMap.get(job.id)?.band || null;
        if (onlyHighRisk && !riskBand && owner.usage < 1) return false;
        return opsIsMovableCreativeJob(job, riskBand);
      })
      .sort((a, b) =>
        (opsPriorityWeight(b.priority_band) - opsPriorityWeight(a.priority_band)) ||
        ((new Date(b.deadline_at || 0).getTime()) - (new Date(a.deadline_at || 0).getTime())));

    for (const job of movableJobs) {
      if (suggestions.length >= maxJobs) break;
      const alternatives = await proposeAllocations(ctx.tenantId, job.id);
      const bestAlternative = alternatives.find((proposal) => proposal.freelancerId !== owner.owner.id);
      if (!bestAlternative) continue;

      const risk = riskMap.get(job.id);
      suggestions.push({
        job_id: job.id,
        title: job.title,
        client_name: job.client_name,
        current_owner_id: owner.owner.id,
        current_owner_name: owner.owner.name,
        current_usage_pct: Math.round((owner.usage || 0) * 100),
        priority_band: job.priority_band,
        status: job.status,
        deadline_at: job.deadline_at,
        risk_band: risk?.band || null,
        risk_summary: risk?.summary || null,
        recommended_owner_id: bestAlternative.freelancerId,
        recommended_owner_name: bestAlternative.name,
        recommended_score: bestAlternative.score,
        estimated_available_at: bestAlternative.estimatedAvailableAt,
        rationale: `Mover de ${owner.owner.name} para ${bestAlternative.name}. ${bestAlternative.rationale}`,
      });
    }

    if (suggestions.length >= maxJobs) break;
  }

  return {
    success: true,
    data: {
      summary: {
        overloaded_owners: overloadedOwners.length,
        suggested_moves: suggestions.length,
        only_high_risk: onlyHighRisk,
      },
      suggestions,
      note: suggestions.length
        ? 'Use assign_job_owner e manage_job_allocation para executar uma redistribuição após confirmar o movimento.'
        : 'Nenhuma redistribuição segura encontrada com os filtros atuais.',
    },
  };
}

async function opsGetCreativeRiskReport(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 8, 20);
  const personType = args.person_type && args.person_type !== 'all' ? String(args.person_type) : null;
  const ownerFilter = String(args.owner_id || '').trim() || null;
  const onlyHighRisk = args.only_high_risk === true;

  const [planner, risks] = await Promise.all([
    buildPlannerSnapshot(ctx.tenantId),
    buildRiskSnapshot(ctx.tenantId),
  ]);

  const riskyJobs = [...(risks.critical || []), ...(risks.high || [])];
  const groupedByOwner = new Map<string, any[]>();
  const unassignedJobs = riskyJobs.filter((job) => !job.owner_id);

  for (const job of riskyJobs) {
    if (!job.owner_id) continue;
    const bucket = groupedByOwner.get(job.owner_id) || [];
    bucket.push(job);
    groupedByOwner.set(job.owner_id, bucket);
  }

  let owners = planner.owners
    .filter((row) => !personType || row.owner.person_type === personType)
    .filter((row) => !ownerFilter || row.owner.id === ownerFilter)
    .map((row) => {
      const ownerRiskJobs = groupedByOwner.get(row.owner.id) || [];
      const criticalJobs = ownerRiskJobs.filter((job) => String(job.metadata?.risk_signal?.band || '').toLowerCase() === 'critical').length;
      const highRiskJobs = ownerRiskJobs.filter((job) => ['critical', 'high', 'medium'].includes(String(job.metadata?.risk_signal?.band || '').toLowerCase())).length;
      const blockedJobs = row.jobs.filter((job) => String(job.status || '').toLowerCase() === 'blocked').length;
      const nearDeadlineJobs = row.jobs.filter((job) => {
        if (!job.deadline_at || !opsIsActiveJobStatus(job.status)) return false;
        const diffHours = (new Date(job.deadline_at).getTime() - Date.now()) / 3600000;
        return Number.isFinite(diffHours) && diffHours <= 24;
      }).length;
      const riskScore = ownerRiskJobs.reduce((sum, job) => sum + opsRiskBandWeight(job.metadata?.risk_signal?.band), 0)
        + (blockedJobs * 2)
        + (nearDeadlineJobs * 2)
        + (row.usage >= 1 ? 3 : row.usage >= 0.85 ? 2 : row.usage >= 0.7 ? 1 : 0);
      const state = opsCreativeRiskState({
        usage: row.usage || 0,
        criticalJobs,
        highRiskJobs,
        blockedJobs,
        nearDeadlineJobs,
        riskScore,
      });

      return {
        owner_id: row.owner.id,
        name: row.owner.name,
        email: row.owner.email,
        specialty: row.owner.specialty,
        person_type: row.owner.person_type,
        usage_pct: Math.round((row.usage || 0) * 100),
        state,
        risk_score: riskScore,
        critical_jobs: criticalJobs,
        high_risk_jobs: highRiskJobs,
        blocked_jobs: blockedJobs,
        near_deadline_jobs: nearDeadlineJobs,
        active_jobs: row.jobs.length,
        recommendation:
          state === 'critico' ? 'Proteger agenda, redistribuir jobs e atacar bloqueios imediatamente.' :
            state === 'alto' ? 'Evitar nova entrada e revisar redistribuição hoje.' :
              state === 'moderado' ? 'Monitorar prazos e priorizar saídas mais próximas.' :
                'Sem pressão relevante agora.',
        top_risk_jobs: ownerRiskJobs
          .sort((a, b) =>
            (opsRiskBandWeight(b.metadata?.risk_signal?.band) - opsRiskBandWeight(a.metadata?.risk_signal?.band)) ||
            (opsPriorityWeight(a.priority_band) - opsPriorityWeight(b.priority_band)) ||
            (new Date(a.deadline_at || 0).getTime() - new Date(b.deadline_at || 0).getTime()))
          .slice(0, 4)
          .map((job) => ({
            job_id: job.id,
            title: job.title,
            client_name: job.client_name,
            status: job.status,
            priority_band: job.priority_band,
            deadline_at: job.deadline_at,
            risk_band: job.metadata?.risk_signal?.band || null,
            risk_summary: job.metadata?.risk_signal?.summary || null,
          })),
      };
    });

  if (onlyHighRisk) {
    owners = owners.filter((owner) => owner.state === 'critico' || owner.state === 'alto');
  }

  owners = owners
    .sort((a, b) =>
      (b.risk_score - a.risk_score) ||
      (b.critical_jobs - a.critical_jobs) ||
      (b.high_risk_jobs - a.high_risk_jobs) ||
      (b.usage_pct - a.usage_pct) ||
      a.name.localeCompare(b.name))
    .slice(0, limit);

  return {
    success: true,
    data: {
      summary: {
        owners_evaluated: owners.length,
        critical_people: owners.filter((owner) => owner.state === 'critico').length,
        high_risk_people: owners.filter((owner) => owner.state === 'alto').length,
        risky_jobs_total: riskyJobs.length,
        critical_jobs_total: riskyJobs.filter((job) => String(job.metadata?.risk_signal?.band || '').toLowerCase() === 'critical').length,
        unassigned_high_risk_jobs: unassignedJobs.length,
      },
      owners,
      unassigned_jobs: unassignedJobs
        .sort((a, b) =>
          (opsRiskBandWeight(b.metadata?.risk_signal?.band) - opsRiskBandWeight(a.metadata?.risk_signal?.band)) ||
          (opsPriorityWeight(a.priority_band) - opsPriorityWeight(b.priority_band)))
        .slice(0, 6)
        .map((job) => ({
          job_id: job.id,
          title: job.title,
          client_name: job.client_name,
          status: job.status,
          priority_band: job.priority_band,
          deadline_at: job.deadline_at,
          risk_band: job.metadata?.risk_signal?.band || null,
          risk_summary: job.metadata?.risk_signal?.summary || null,
        })),
    },
  };
}

async function opsGetCreativeQuality(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 10, 20);
  const daysBack = Math.min(Math.max(Number(args.days_back || 120), 30), 365);
  const personType = args.person_type && args.person_type !== 'all' ? String(args.person_type) : null;
  const ownerFilter = String(args.owner_id || '').trim() || null;
  const specialtyFilter = String(args.specialty || '').trim().toLowerCase();

  const { rows } = await query(
    `WITH review_stats AS (
       SELECT
         cr.job_id,
         COUNT(*) FILTER (WHERE cr.review_type = 'internal')::int AS internal_reviews,
         COUNT(*) FILTER (WHERE cr.review_type = 'internal' AND cr.status = 'changes_requested')::int AS internal_changes,
         COUNT(*) FILTER (WHERE cr.review_type = 'client_approval')::int AS client_reviews,
         COUNT(*) FILTER (WHERE cr.review_type = 'client_approval' AND cr.status = 'approved')::int AS client_approved,
         COUNT(*) FILTER (WHERE cr.review_type = 'client_approval' AND cr.status IN ('changes_requested', 'rejected'))::int AS client_rework
       FROM creative_reviews cr
       WHERE cr.tenant_id = $1
       GROUP BY cr.job_id
     )
     SELECT
       j.owner_id,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
       u.email AS owner_email,
       tu.role AS owner_role,
       fp.specialty,
       CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS person_type,
       fp.approval_rate,
       COUNT(*)::int AS total_jobs,
       COUNT(*) FILTER (WHERE j.status IN ('approved', 'scheduled', 'published', 'done'))::int AS delivered_jobs,
       COALESCE(ROUND(AVG(COALESCE(j.revision_count, 0))::numeric, 2), 0)::float AS avg_revision_count,
       MAX(COALESCE(j.revision_count, 0))::int AS max_revision_count,
       COUNT(*) FILTER (WHERE COALESCE(j.revision_count, 0) >= 2)::int AS jobs_high_rework,
       COALESCE(SUM(COALESCE(rs.internal_reviews, 0)), 0)::int AS internal_reviews,
       COALESCE(SUM(COALESCE(rs.internal_changes, 0)), 0)::int AS internal_changes,
       COALESCE(SUM(COALESCE(rs.client_reviews, 0)), 0)::int AS client_reviews,
       COALESCE(SUM(COALESCE(rs.client_approved, 0)), 0)::int AS client_approved,
       COALESCE(SUM(COALESCE(rs.client_rework, 0)), 0)::int AS client_rework,
       MAX(j.updated_at) AS last_job_update
     FROM jobs j
     JOIN edro_users u ON u.id = j.owner_id
     LEFT JOIN tenant_users tu ON tu.user_id = j.owner_id AND tu.tenant_id = j.tenant_id
     LEFT JOIN freelancer_profiles fp ON fp.user_id = j.owner_id
     LEFT JOIN review_stats rs ON rs.job_id = j.id
     WHERE j.tenant_id = $1
       AND j.owner_id IS NOT NULL
       AND j.status <> 'archived'
       AND j.created_at >= NOW() - ($2 || ' days')::interval
     GROUP BY j.owner_id, owner_name, owner_email, owner_role, fp.specialty, person_type, fp.approval_rate
     ORDER BY total_jobs DESC, avg_revision_count DESC, owner_name ASC`,
    [ctx.tenantId, String(daysBack)],
  );

  const filteredOwners = rows
    .filter((row: any) => !personType || row.person_type === personType)
    .filter((row: any) => !ownerFilter || row.owner_id === ownerFilter)
    .filter((row: any) => !specialtyFilter || String(row.specialty || '').toLowerCase().includes(specialtyFilter))
    .map((row: any) => {
      const approvalRate = row.client_reviews > 0
        ? Math.round((Number(row.client_approved || 0) / Math.max(1, Number(row.client_reviews || 0))) * 100)
        : (row.approval_rate !== null && row.approval_rate !== undefined ? Math.round(Number(row.approval_rate)) : null);
      const state = opsCreativeQualityState({
        approvalRate,
        avgRevisionCount: Number(row.avg_revision_count || 0),
        clientReworkCount: Number(row.client_rework || 0),
        highReworkJobs: Number(row.jobs_high_rework || 0),
      });

      return {
        owner_id: row.owner_id,
        name: row.owner_name,
        email: row.owner_email,
        role: row.owner_role,
        specialty: row.specialty,
        person_type: row.person_type,
        state,
        total_jobs: Number(row.total_jobs || 0),
        delivered_jobs: Number(row.delivered_jobs || 0),
        avg_revision_count: Number(row.avg_revision_count || 0),
        max_revision_count: Number(row.max_revision_count || 0),
        jobs_high_rework: Number(row.jobs_high_rework || 0),
        internal_reviews: Number(row.internal_reviews || 0),
        internal_changes: Number(row.internal_changes || 0),
        client_reviews: Number(row.client_reviews || 0),
        client_approved: Number(row.client_approved || 0),
        client_rework: Number(row.client_rework || 0),
        client_approval_rate: approvalRate,
        approval_rate_profile: row.approval_rate !== null && row.approval_rate !== undefined ? Number(row.approval_rate) : null,
        last_job_update: row.last_job_update,
        recommendation:
          state === 'critico' ? 'Revisar qualidade de entrega, retrabalho e handoff antes de nova carga.' :
            state === 'atencao' ? 'Acompanhar rounds de revisão e calibrar briefing/critério visual.' :
              'Qualidade operacional saudável no recorte atual.',
      };
    })
    .sort((a: any, b: any) =>
      ((a.state === 'critico' ? 2 : a.state === 'atencao' ? 1 : 0) - (b.state === 'critico' ? 2 : b.state === 'atencao' ? 1 : 0)) * -1 ||
      (b.jobs_high_rework - a.jobs_high_rework) ||
      (b.avg_revision_count - a.avg_revision_count) ||
      ((a.client_approval_rate ?? 999) - (b.client_approval_rate ?? 999)) ||
      a.name.localeCompare(b.name))
    .slice(0, limit);

  const hotspotRes = await query(
    `WITH review_stats AS (
       SELECT
         cr.job_id,
         COUNT(*) FILTER (WHERE cr.review_type = 'internal' AND cr.status = 'changes_requested')::int AS internal_changes,
         COUNT(*) FILTER (WHERE cr.review_type = 'client_approval' AND cr.status IN ('changes_requested', 'rejected'))::int AS client_rework
       FROM creative_reviews cr
       WHERE cr.tenant_id = $1
       GROUP BY cr.job_id
     )
     SELECT
       j.id,
       j.title,
       j.status,
       j.job_type,
       j.channel,
       j.revision_count,
       j.updated_at,
       c.name AS client_name,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
       COALESCE(rs.internal_changes, 0)::int AS internal_changes,
       COALESCE(rs.client_rework, 0)::int AS client_rework
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN edro_users u ON u.id = j.owner_id
     LEFT JOIN review_stats rs ON rs.job_id = j.id
     WHERE j.tenant_id = $1
       AND j.status NOT IN ('done', 'archived', 'published', 'cancelled')
       AND j.created_at >= NOW() - ($2 || ' days')::interval
       AND (COALESCE(j.revision_count, 0) >= 2 OR COALESCE(rs.internal_changes, 0) > 0 OR COALESCE(rs.client_rework, 0) > 0)
     ORDER BY COALESCE(j.revision_count, 0) DESC, COALESCE(rs.client_rework, 0) DESC, j.updated_at DESC
     LIMIT 8`,
    [ctx.tenantId, String(daysBack)],
  );

  return {
    success: true,
    data: {
      summary: {
        owners_evaluated: filteredOwners.length,
        healthy_people: filteredOwners.filter((owner: any) => owner.state === 'saudavel').length,
        attention_people: filteredOwners.filter((owner: any) => owner.state === 'atencao').length,
        critical_people: filteredOwners.filter((owner: any) => owner.state === 'critico').length,
        avg_revision_count:
          filteredOwners.length
            ? Number((filteredOwners.reduce((sum: number, owner: any) => sum + owner.avg_revision_count, 0) / filteredOwners.length).toFixed(2))
            : 0,
        avg_client_approval_rate:
          filteredOwners.filter((owner: any) => owner.client_approval_rate !== null).length
            ? Math.round(
                filteredOwners
                  .filter((owner: any) => owner.client_approval_rate !== null)
                  .reduce((sum: number, owner: any) => sum + Number(owner.client_approval_rate || 0), 0) /
                filteredOwners.filter((owner: any) => owner.client_approval_rate !== null).length,
              )
            : null,
        days_back: daysBack,
      },
      owners: filteredOwners,
      hotspots: hotspotRes.rows.map((row: any) => ({
        job_id: row.id,
        title: row.title,
        client_name: row.client_name,
        owner_name: row.owner_name,
        status: row.status,
        job_type: row.job_type,
        channel: row.channel,
        revision_count: Number(row.revision_count || 0),
        internal_changes: Number(row.internal_changes || 0),
        client_rework: Number(row.client_rework || 0),
        updated_at: row.updated_at,
      })),
    },
  };
}

async function opsGetCreativeBottlenecks(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const limit = Math.min(args.limit || 6, 12);
  const stageFilter = String(args.stage || '').trim().toLowerCase();
  const onlyHighImpact = args.only_high_impact === true;

  const { rows } = await query(
    `SELECT
       j.id,
       j.title,
       j.status,
       j.job_type,
       COALESCE(NULLIF(j.channel, ''), 'sem_canal') AS channel,
       j.deadline_at,
       j.owner_id,
       COALESCE(j.revision_count, 0)::int AS revision_count,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
       c.name AS client_name,
       rs.risk_band,
       rs.summary AS risk_summary
     FROM jobs j
     LEFT JOIN edro_users u ON u.id = j.owner_id
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN LATERAL (
       SELECT risk_band, summary
       FROM risk_signals
       WHERE tenant_id = $1
         AND job_id = j.id
         AND resolved_at IS NULL
       ORDER BY risk_score DESC
       LIMIT 1
     ) rs ON true
     WHERE j.tenant_id = $1
       AND j.status NOT IN ('done', 'archived', 'published', 'cancelled')
       ${stageFilter ? `AND j.status = $2` : ''}
     ORDER BY j.updated_at DESC`,
    stageFilter ? [ctx.tenantId, stageFilter] : [ctx.tenantId],
  );

  const sourceRows = onlyHighImpact
    ? rows.filter((row: any) => String(row.risk_band || '').length || row.status === 'blocked' || Number(row.revision_count || 0) >= 2 || !row.owner_id)
    : rows;

  const stageMap = new Map<string, any>();
  const typeMap = new Map<string, any>();
  const channelMap = new Map<string, any>();

  for (const row of sourceRows) {
    const groups = [
      { map: stageMap, key: String(row.status || 'sem_status'), label: String(row.status || 'sem_status') },
      { map: typeMap, key: String(row.job_type || 'sem_tipo'), label: String(row.job_type || 'sem_tipo') },
      { map: channelMap, key: String(row.channel || 'sem_canal'), label: String(row.channel || 'sem_canal') },
    ];
    const riskWeight = opsRiskBandWeight(row.risk_band);
    const blocked = String(row.status || '').toLowerCase() === 'blocked' ? 1 : 0;
    const nearDeadline = row.deadline_at
      ? (((new Date(row.deadline_at).getTime() - Date.now()) / 3600000) <= 24 ? 1 : 0)
      : 0;
    const unassigned = row.owner_id ? 0 : 1;
    const revisionCount = Number(row.revision_count || 0);

    for (const group of groups) {
      const current = group.map.get(group.key) || {
        key: group.key,
        label: group.label,
        open_jobs: 0,
        blocked_jobs: 0,
        high_risk_jobs: 0,
        near_deadline_jobs: 0,
        unassigned_jobs: 0,
        total_revisions: 0,
        sample_jobs: [] as Array<Record<string, any>>,
      };
      current.open_jobs += 1;
      current.blocked_jobs += blocked;
      current.high_risk_jobs += riskWeight >= 3 ? 1 : 0;
      current.near_deadline_jobs += nearDeadline;
      current.unassigned_jobs += unassigned;
      current.total_revisions += revisionCount;
      if (current.sample_jobs.length < 3) {
        current.sample_jobs.push({
          job_id: row.id,
          title: row.title,
          client_name: row.client_name,
          owner_name: row.owner_name,
          status: row.status,
          risk_band: row.risk_band,
          revision_count: revisionCount,
        });
      }
      group.map.set(group.key, current);
    }
  }

  const toRankedRows = (map: Map<string, any>) =>
    Array.from(map.values())
      .map((item) => {
        const score = (item.high_risk_jobs * 4) + (item.blocked_jobs * 3) + (item.near_deadline_jobs * 2) + (item.unassigned_jobs * 2) + Math.min(item.total_revisions, 6);
        const avgRevisionCount = item.open_jobs ? Number((item.total_revisions / item.open_jobs).toFixed(2)) : 0;
        const severity = opsCreativeBottleneckSeverity(score);
        return {
          key: item.key,
          label: item.label,
          severity,
          score,
          open_jobs: item.open_jobs,
          blocked_jobs: item.blocked_jobs,
          high_risk_jobs: item.high_risk_jobs,
          near_deadline_jobs: item.near_deadline_jobs,
          unassigned_jobs: item.unassigned_jobs,
          avg_revision_count: avgRevisionCount,
          recommendation:
            severity === 'critico' ? 'Atacar esta fila primeiro: redistribuir, destravar ou reduzir entrada.' :
              severity === 'alto' ? 'Repriorizar e revisar ownership antes de adicionar nova demanda.' :
                'Monitorar evolução desta fila.',
          sample_jobs: item.sample_jobs,
        };
      })
      .filter((item) => !onlyHighImpact || item.score >= 4)
      .sort((a, b) =>
        (b.score - a.score) ||
        (b.high_risk_jobs - a.high_risk_jobs) ||
        (b.blocked_jobs - a.blocked_jobs) ||
        a.label.localeCompare(b.label))
      .slice(0, limit);

  return {
    success: true,
    data: {
      summary: {
        open_jobs: sourceRows.length,
        blocked_jobs: sourceRows.filter((row: any) => String(row.status || '').toLowerCase() === 'blocked').length,
        unassigned_jobs: sourceRows.filter((row: any) => !row.owner_id).length,
        near_deadline_jobs: sourceRows.filter((row: any) => row.deadline_at && ((new Date(row.deadline_at).getTime() - Date.now()) / 3600000) <= 24).length,
        high_risk_jobs: sourceRows.filter((row: any) => opsRiskBandWeight(row.risk_band) >= 3).length,
        stage_filter: stageFilter || null,
      },
      stage_bottlenecks: toRankedRows(stageMap),
      job_type_hotspots: toRankedRows(typeMap),
      channel_hotspots: toRankedRows(channelMap),
    },
  };
}

async function opsResolveTargetOwnerForJob(params: {
  tenantId: string;
  jobId: string;
  currentOwnerId?: string | null;
  requestedOwnerId?: string | null;
}) {
  const proposals = await proposeAllocations(params.tenantId, params.jobId);
  if (!proposals.length) {
    throw new Error('Nenhuma sugestão elegível encontrada para este job.');
  }

  const requestedOwnerId = String(params.requestedOwnerId || '').trim() || null;
  if (requestedOwnerId) {
    const requested = proposals.find((proposal) => proposal.freelancerId === requestedOwnerId);
    if (!requested) {
      throw new Error('O owner informado não apareceu entre as sugestões elegíveis para este job.');
    }
    return requested;
  }

  const alternative = proposals.find((proposal) => proposal.freelancerId !== params.currentOwnerId);
  return alternative || proposals[0];
}

async function opsApplyOwnerAndAllocation(params: {
  tenantId: string;
  userId?: string;
  jobId: string;
  ownerId: string;
  plannedMinutes?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  notes?: string | null;
}) {
  const currentJobRes = await query(
    `SELECT id, title, owner_id, estimated_minutes, status
       FROM jobs
      WHERE tenant_id = $1 AND id = $2
      LIMIT 1`,
    [params.tenantId, params.jobId],
  );
  if (!currentJobRes.rows.length) throw new Error('Job não encontrado.');

  const currentJob = currentJobRes.rows[0];
  await query(
    `UPDATE jobs
        SET owner_id = $3
      WHERE tenant_id = $1 AND id = $2`,
    [params.tenantId, params.jobId, params.ownerId],
  );

  const data = await upsertJobAllocation(params.tenantId, {
    jobId: params.jobId,
    ownerId: params.ownerId,
    status: 'committed',
    plannedMinutes: params.plannedMinutes ?? (Number(currentJob.estimated_minutes || 0) || null),
    startsAt: params.startsAt ?? null,
    endsAt: params.endsAt ?? null,
    notes: params.notes ?? null,
    changedBy: params.userId ?? null,
  });
  await syncOperationalRuntimeForJob(params.tenantId, params.jobId);

  return {
    job: currentJob,
    allocation: data,
  };
}

async function opsApplyJobAllocationRecommendation(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  if (args.confirmed !== true) {
    return { success: false, error: 'Confirmação obrigatória. Só execute esta ação quando o usuário confirmar explicitamente.' };
  }

  const { rows } = await query(
    `SELECT j.id, j.title, j.owner_id, j.client_id, c.name AS client_name
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
      WHERE j.tenant_id = $1 AND j.id = $2
      LIMIT 1`,
    [ctx.tenantId, args.job_id],
  );
  if (!rows.length) return { success: false, error: 'Job não encontrado.' };
  const job = rows[0];

  const proposal = await opsResolveTargetOwnerForJob({
    tenantId: ctx.tenantId,
    jobId: args.job_id,
    currentOwnerId: job.owner_id,
    requestedOwnerId: args.owner_id,
  });

  const applied = await opsApplyOwnerAndAllocation({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    jobId: args.job_id,
    ownerId: proposal.freelancerId,
    plannedMinutes: proposal.estimatedMinutes,
    startsAt: proposal.estimatedAvailableAt,
    endsAt: proposal.estimatedCompletionAt,
    notes: String(args.notes || '').trim() || `Alocação aplicada pelo Jarvis com base na recomendação automática.`,
  });

  return {
    success: true,
    data: {
      action: 'allocation_applied',
      job_id: args.job_id,
      title: job.title,
      client_name: job.client_name,
      previous_owner_id: job.owner_id || null,
      new_owner_id: proposal.freelancerId,
      new_owner_name: proposal.name,
      rationale: proposal.rationale,
      estimated_available_at: proposal.estimatedAvailableAt,
      estimated_completion_at: proposal.estimatedCompletionAt,
      allocation: applied.allocation,
      message: `Job "${job.title}" alocado para ${proposal.name}.`,
    },
  };
}

async function opsApplyCreativeRedistribution(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  if (args.confirmed !== true) {
    return { success: false, error: 'Confirmação obrigatória. Só execute esta ação quando o usuário confirmar explicitamente.' };
  }

  const { rows } = await query(
    `SELECT j.id, j.title, j.owner_id, j.status, j.priority_band, j.client_id, c.name AS client_name
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
      WHERE j.tenant_id = $1 AND j.id = $2
      LIMIT 1`,
    [ctx.tenantId, args.job_id],
  );
  if (!rows.length) return { success: false, error: 'Job não encontrado.' };
  const job = rows[0];

  const proposal = await opsResolveTargetOwnerForJob({
    tenantId: ctx.tenantId,
    jobId: args.job_id,
    currentOwnerId: job.owner_id,
    requestedOwnerId: args.to_owner_id,
  });

  if (proposal.freelancerId === job.owner_id) {
    return {
      success: true,
      data: {
        action: 'redistribution_skipped',
        job_id: job.id,
        title: job.title,
        owner_id: job.owner_id,
        message: `O job "${job.title}" já está com ${proposal.name}.`,
      },
    };
  }

  const applied = await opsApplyOwnerAndAllocation({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    jobId: args.job_id,
    ownerId: proposal.freelancerId,
    plannedMinutes: proposal.estimatedMinutes,
    startsAt: proposal.estimatedAvailableAt,
    endsAt: proposal.estimatedCompletionAt,
    notes: String(args.notes || '').trim() || `Redistribuição aplicada pelo Jarvis para aliviar carga operacional.`,
  });

  return {
    success: true,
    data: {
      action: 'redistribution_applied',
      job_id: job.id,
      title: job.title,
      client_name: job.client_name,
      previous_owner_id: job.owner_id || null,
      new_owner_id: proposal.freelancerId,
      new_owner_name: proposal.name,
      priority_band: job.priority_band,
      status: job.status,
      rationale: proposal.rationale,
      estimated_available_at: proposal.estimatedAvailableAt,
      estimated_completion_at: proposal.estimatedCompletionAt,
      allocation: applied.allocation,
      message: `Job "${job.title}" redistribuído de ${job.owner_id || 'sem responsável'} para ${proposal.name}.`,
    },
  };
}

async function opsGetClientWeeklySummary(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const clientId = contextualString(args.client_id) || contextualString((ctx as any).clientId);
  if (!clientId) return { success: false, error: 'client_id é obrigatório neste contexto.' };
  const daysBack = Math.min(Math.max(Number(args.days_back || 7), 1), 14);

  const [clientRes, digestRes, messageRes, meetingRes, jobsRes, alertsRes] = await Promise.all([
    query<{ name: string }>(`SELECT name FROM clients WHERE id = $1 AND tenant_id = $2 LIMIT 1`, [clientId, ctx.tenantId]),
    query<any>(
      `SELECT summary, key_decisions, pending_actions, created_at
         FROM whatsapp_group_digests
        WHERE tenant_id = $1 AND client_id = $2 AND created_at > NOW() - make_interval(days => $3)
        ORDER BY created_at DESC
        LIMIT 1`,
      [ctx.tenantId, clientId, daysBack],
    ).catch(() => ({ rows: [] as any[] })),
    query<any>(
      `SELECT COUNT(*)::int AS message_count, MAX(wgm.created_at) AS last_activity
         FROM whatsapp_groups wg
         JOIN whatsapp_group_messages wgm ON wgm.group_id = wg.id
        WHERE wg.tenant_id = $1 AND wg.client_id = $2
          AND wgm.created_at > NOW() - make_interval(days => $3)
          AND wgm.content IS NOT NULL`,
      [ctx.tenantId, clientId, daysBack],
    ).catch(() => ({ rows: [{ message_count: 0, last_activity: null }] as any[] })),
    query<any>(
      `SELECT title, summary, meeting_date, has_action_items
         FROM meeting_summaries
        WHERE tenant_id = $1 AND client_id = $2
          AND meeting_date > NOW() - make_interval(days => $3)
        ORDER BY meeting_date DESC
        LIMIT 5`,
      [ctx.tenantId, clientId, daysBack],
    ).catch(() => ({ rows: [] as any[] })),
    query<any>(
      `SELECT status, COUNT(*)::int AS total
         FROM jobs
        WHERE tenant_id = $1 AND client_id = $2 AND status NOT IN ('done', 'archived')
        GROUP BY status
        ORDER BY total DESC, status ASC`,
      [ctx.tenantId, clientId],
    ).catch(() => ({ rows: [] as any[] })),
    query<any>(
      `SELECT id, title, priority, created_at
         FROM jarvis_alerts
        WHERE tenant_id = $1 AND client_id = $2 AND status = 'open'
        ORDER BY created_at DESC
        LIMIT 8`,
      [ctx.tenantId, clientId],
    ).catch(() => ({ rows: [] as any[] })),
  ]);

  const digest = digestRes.rows[0] || null;
  const jobSummary = jobsRes.rows.reduce((acc: Record<string, number>, row: any) => {
    acc[row.status] = Number(row.total || 0);
    return acc;
  }, {});

  return {
    success: true,
    data: {
      client_id: clientId,
      client_name: clientRes.rows[0]?.name || 'Cliente',
      days_back: daysBack,
      whatsapp: {
        summary: digest?.summary || null,
        key_decisions: Array.isArray(digest?.key_decisions) ? digest.key_decisions.slice(0, 5) : [],
        pending_actions: Array.isArray(digest?.pending_actions) ? digest.pending_actions.slice(0, 5) : [],
        message_count: Number(messageRes.rows[0]?.message_count || 0),
        last_activity: messageRes.rows[0]?.last_activity || null,
      },
      meetings: meetingRes.rows.map((row: any) => ({
        title: row.title || 'Reunião',
        summary: buildEvidenceExcerpt(row.summary, 220),
        meeting_date: row.meeting_date,
        has_action_items: Boolean(row.has_action_items),
      })),
      jobs: {
        open_total: Object.values(jobSummary).reduce((sum, value) => Number(sum) + Number(value || 0), 0),
        by_status: jobSummary,
      },
      active_alerts: alertsRes.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        priority: row.priority,
        created_at: row.created_at,
      })),
    },
  };
}

async function opsGetOperationsDailyBrief(_args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const [digest, decisions] = await Promise.all([
    buildDailyDigest(ctx.tenantId),
    processAlerts(ctx.tenantId, 8).catch(() => []),
  ]);

  return {
    success: true,
    data: {
      ...digest,
      jarvis_focus: decisions
        .filter((item) => item.autonomy_level >= 1)
        .slice(0, 5)
        .map((item) => ({
          title: item.event.title,
          body: item.event.body,
          autonomy_level: item.autonomy_level,
          category: item.category,
          reasoning: item.reasoning,
      })),
    },
  };
}

async function opsGetSystemHealth(_args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  return {
    success: true,
    data: await buildSystemHealthSnapshot(ctx.tenantId),
  };
}

async function opsRunSystemRepair(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const repairType = String(args.repair_type || '').trim();
  if (!repairType) return { success: false, error: 'repair_type é obrigatório.' };

  const before = await buildSystemHealthSnapshot(ctx.tenantId);
  const repairPlan = resolveSystemRepairPlan(repairType as any, before);

  if (!repairPlan.length) {
    return {
      success: true,
      data: {
        repair_type: repairType,
        message: 'Nenhum reparo necessário no momento.',
        executed_repairs: [],
        before_summary: before.summary,
        after_summary: before.summary,
      },
    };
  }

  if (ctx.explicitConfirmation !== true) {
    return buildConfirmationRequiredResult('Confirmação pendente para executar reparo do sistema.', {
      repair_type: repairType,
      plan: repairPlan.map((item) => ({ repair_type: item, label: SYSTEM_REPAIR_LABELS[item] || item })),
      before_summary: before.summary,
      issues: before.issues,
      tool_name: 'run_system_repair',
      tool_args: { repair_type: repairType },
      confirmation_prompt: `Confirmo o reparo ${repairType === 'auto_repair' ? 'automático' : repairType} no sistema.`,
    });
  }

  return {
    success: true,
    data: await runSystemRepair(ctx.tenantId, repairType as any, before),
  };
}

async function opsSendWhatsAppMessage(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const clientId = contextualString(args.client_id) || contextualString((ctx as any).clientId);
  const resolvedUser = contextualString(args.user_id) ? await resolveUserChannels(ctx.tenantId, String(args.user_id)) : null;
  const phone = contextualString(args.phone) || resolvedUser?.phone || (clientId ? await resolvePrimaryClientPhone(ctx.tenantId, clientId) : null);
  if (!phone) return { success: false, error: 'Nenhum WhatsApp resolvido. Informe phone, user_id ou client_id válido.' };
  const message = String(args.message || '').trim();
  if (ctx.explicitConfirmation !== true) {
    return buildConfirmationRequiredResult('Confirmação pendente para enviar WhatsApp.', {
      recipient_phone: phone,
      client_id: clientId || null,
      user_id: args.user_id || null,
      preview_message: message,
      tool_name: 'send_whatsapp_message',
      tool_args: {
        message,
        client_id: clientId || null,
        user_id: args.user_id || null,
        phone: contextualString(args.phone) || null,
      },
      confirmation_prompt: `Confirmo o envio do WhatsApp para ${phone}.`,
    });
  }

  const result = await sendWhatsAppText(phone, message, {
    tenantId: ctx.tenantId,
    event: 'jarvis_tool_message_sent',
    meta: { channel: 'jarvis', client_id: clientId || null, user_id: args.user_id || null },
  });

  if (!result.ok) return { success: false, error: result.error || 'whatsapp_send_failed' };

  return {
    success: true,
    data: {
      message: 'WhatsApp enviado com sucesso.',
      recipient_phone: phone,
      client_id: clientId || null,
      user_id: args.user_id || null,
      message_id: result.messageId || null,
    },
  };
}

async function opsSendEmail(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const clientId = contextualString(args.client_id) || contextualString((ctx as any).clientId);
  const resolvedUser = contextualString(args.user_id) ? await resolveUserChannels(ctx.tenantId, String(args.user_id)) : null;
  const to = contextualString(args.to) || resolvedUser?.email || (clientId ? await resolvePrimaryClientEmail(ctx.tenantId, clientId) : null);
  if (!to) return { success: false, error: 'Nenhum email resolvido. Informe to, user_id ou client_id válido.' };
  const subject = String(args.subject || '').trim();
  const body = String(args.body || '').trim();
  if (ctx.explicitConfirmation !== true) {
    return buildConfirmationRequiredResult('Confirmação pendente para enviar e-mail.', {
      to,
      client_id: clientId || null,
      user_id: args.user_id || null,
      preview_subject: subject,
      preview_body: body,
      tool_name: 'send_email',
      tool_args: {
        subject,
        body,
        client_id: clientId || null,
        user_id: args.user_id || null,
        to: contextualString(args.to) || null,
      },
      confirmation_prompt: `Confirmo o envio do e-mail para ${to}.`,
    });
  }

  const result = await sendEmail({
    tenantId: ctx.tenantId,
    to,
    subject,
    text: body,
    html: `<div style="font-family:Inter,Arial,sans-serif;background:#fff7f2;padding:24px"><div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #ffe1d4;border-radius:16px;padding:24px"><div style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#f25c05;text-transform:uppercase">Edro Studio</div><h1 style="font-size:24px;line-height:1.2;color:#10131a;margin:12px 0 16px">${subject}</h1><div style="font-size:15px;line-height:1.7;color:#3b4354;white-space:pre-wrap">${body}</div></div></div>`,
  });

  if (!result.ok) return { success: false, error: result.error || 'email_send_failed' };
  return { success: true, data: { message: 'E-mail enviado com sucesso.', to, provider: result.provider || null } };
}

async function opsGetLookups(_args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const [jobTypesRes, skillsRes, channelsRes, clientsRes, ownersRes, boardsRes, listsRes] = await Promise.all([
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
    query(`SELECT id, name, client_id FROM project_boards WHERE tenant_id = $1 AND is_archived = false ORDER BY name ASC`, [ctx.tenantId]),
    query(`SELECT id, board_id, name FROM project_lists WHERE tenant_id = $1 AND is_archived = false ORDER BY position ASC, name ASC`, [ctx.tenantId]),
  ]);
  return {
    success: true,
    data: {
      job_types: jobTypesRes.rows,
      skills: skillsRes.rows,
      channels: channelsRes.rows,
      clients: clientsRes.rows,
      owners: ownersRes.rows,
      trello_boards: boardsRes.rows,
      trello_lists: listsRes.rows,
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

async function opsCreateTrelloCard(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const { rows: listRows } = await query<any>(
    `SELECT pl.id, pl.board_id, pl.name, pl.trello_list_id, pb.name AS board_name
       FROM project_lists pl
       JOIN project_boards pb ON pb.id = pl.board_id
      WHERE pl.id = $1 AND pl.board_id = $2 AND pb.tenant_id = $3 AND pl.is_archived = false`,
    [args.list_id, args.board_id, ctx.tenantId],
  );
  const list = listRows[0];
  if (!list) return { success: false, error: 'board_id/list_id inválidos para este tenant.' };

  let trelloCardId: string | null = null;
  let trelloUrl: string | null = null;
  const creds = await getTrelloCredentials(ctx.tenantId).catch(() => null);
  if (creds && list.trello_list_id) {
    const params = new URLSearchParams({
      key: creds.apiKey,
      token: creds.apiToken,
      idList: list.trello_list_id,
      name: String(args.title || '').trim(),
      desc: String(args.description || '').trim(),
      pos: 'bottom',
      ...(contextualString(args.due_date) ? { due: `${args.due_date}T23:59:00.000Z` } : {}),
    });
    const res = await fetch(`https://api.trello.com/1/cards?${params}`, { method: 'POST', signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      const created = await res.json() as { id: string; shortUrl: string };
      trelloCardId = created.id;
      trelloUrl = created.shortUrl;
    }
  }

  const { rows: positionRows } = await query<{ max_pos: string }>(
    `SELECT COALESCE(MAX(position), 0) + 65536 AS max_pos
       FROM project_cards
      WHERE list_id = $1 AND tenant_id = $2 AND is_archived = false`,
    [args.list_id, ctx.tenantId],
  );
  const position = Number(positionRows[0]?.max_pos ?? 65536);
  const { rows: inserted } = await query<any>(
    `INSERT INTO project_cards (board_id, list_id, tenant_id, title, description, position, due_date, start_date, trello_card_id, trello_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()::date, $8, $9)
     RETURNING id, title, due_date, trello_card_id, trello_url`,
    [args.board_id, args.list_id, ctx.tenantId, args.title, args.description || null, position, args.due_date || null, trelloCardId, trelloUrl],
  );
  return { success: true, data: { ...inserted[0], board_name: list.board_name, list_name: list.name } };
}

async function opsExecuteMultiStepWorkflow(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const WORKFLOW_STALE_MS = 15 * 60 * 1000;
  const TRANSIENT_RETRY_MAX_ATTEMPTS = 3;
  const TRANSIENT_RETRY_COOLDOWN_MS = 5 * 60 * 1000;
  const steps = JSON.parse(String(args.workflow_json || '[]'));
  if (!Array.isArray(steps) || !steps.length) return { success: false, error: 'workflow_json deve ser um array JSON de steps.' };
  if (steps.length > 6) return { success: false, error: 'Máximo de 6 steps por workflow.' };
  const resumeFromStep = Math.max(1, Number(args.resume_from_step || 1));
  if (!Number.isInteger(resumeFromStep) || resumeFromStep > steps.length) {
    return { success: false, error: 'resume_from_step inválido para este workflow.' };
  }
  const startIndex = resumeFromStep - 1;
  const workflowId = String(args.workflow_id || '').trim() || crypto.randomUUID();
  const workflowTriggerKey = `jarvis_workflow:${workflowId}`;
  const existingWorkflowRes = await query<{ metadata: any; fired_at: string | Date | null }>(
    `SELECT metadata, fired_at
       FROM agent_action_log
      WHERE tenant_id = $1::uuid
        AND trigger_key = $2
      ORDER BY fired_at DESC
      LIMIT 1`,
    [ctx.tenantId, workflowTriggerKey],
  ).catch(() => ({ rows: [] as Array<{ metadata: any; fired_at: string | Date | null }> }));
  const existingMetadata = existingWorkflowRes.rows[0]?.metadata && typeof existingWorkflowRes.rows[0].metadata === 'object'
    ? existingWorkflowRes.rows[0].metadata
    : null;
  const existingRow = existingWorkflowRes.rows[0];
  let existingStatus = String(existingMetadata?.status || '').trim();
  const attemptCount = Math.max(0, Number(existingMetadata?.attempt_count || 0));
  let currentWorkflowStateVersion = Math.max(0, Number(existingMetadata?.workflow_state_version || 0));
  const providedWorkflowStateVersion = Math.max(0, Number(args.workflow_state_version || 0));
  const manualRequeue = args.manual_requeue === true;
  const lastActivityRaw = String(
    existingMetadata?.last_activity_at
      || existingMetadata?.last_attempt_at
      || existingMetadata?.started_at
      || existingMetadata?.finished_at
      || existingRow?.fired_at
      || '',
  ).trim();
  const lastActivityAt = lastActivityRaw ? new Date(lastActivityRaw) : null;
  const isStaleRunningWorkflow = (existingStatus === 'running' || existingStatus === 'rolling_back')
    && !!lastActivityAt
    && !Number.isNaN(lastActivityAt.getTime())
    && (Date.now() - lastActivityAt.getTime()) > WORKFLOW_STALE_MS;

  if (ctx.explicitConfirmation === true) {
    if (existingMetadata && providedWorkflowStateVersion > 0 && providedWorkflowStateVersion !== currentWorkflowStateVersion) {
      return {
        success: false,
        error: 'Este workflow mudou de estado. Recarregue antes de confirmar ou retomar.',
        data: {
          workflow_id: workflowId,
          workflow_status: existingStatus || 'unknown',
          workflow_state_version: currentWorkflowStateVersion,
        },
      };
    }
    if (existingStatus === 'completed') {
      return { success: false, error: 'Este workflow já foi concluído. Gere um novo plano para rodar novamente.' };
    }
    if ((existingStatus === 'running' || existingStatus === 'rolling_back') && !isStaleRunningWorkflow) {
      return { success: false, error: 'Este workflow já está em execução. Aguarde a conclusão antes de tentar novamente.' };
    }
    if (existingMetadata?.requires_manual_followup === true && !manualRequeue) {
      return {
        success: false,
        error: 'Este workflow exige follow-up manual antes de qualquer nova tentativa.',
          data: {
            workflow_id: workflowId,
            workflow_status: existingStatus || 'failed',
            workflow_state_version: currentWorkflowStateVersion,
            manual_followup: Array.isArray(existingMetadata?.manual_followup) ? existingMetadata.manual_followup.slice(0, 4) : [],
          },
        };
    }
    if (existingStatus === 'failed') {
      const persistedResume = Math.max(1, Number(existingMetadata?.resume_from_step || 1));
      if (resumeFromStep !== persistedResume && !manualRequeue) {
        return { success: false, error: `resume_from_step inválido para retomada. O próximo passo seguro é ${persistedResume}.` };
      }
      const retryAfterRaw = String(existingMetadata?.retry_after_at || '').trim();
      const retryAfterAt = retryAfterRaw ? new Date(retryAfterRaw) : null;
      if (
        existingMetadata?.failure_class === 'transient'
        && retryAfterAt
        && !Number.isNaN(retryAfterAt.getTime())
        && retryAfterAt.getTime() > Date.now()
      ) {
        return {
          success: false,
          error: `Este workflow ainda está em cooldown. Tente novamente após ${retryAfterAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
          data: {
            workflow_id: workflowId,
            workflow_status: existingStatus || 'failed',
            workflow_state_version: currentWorkflowStateVersion,
            retry_after_at: retryAfterAt.toISOString(),
            retry_attempts_remaining: Number(existingMetadata?.retry_attempts_remaining || 0),
          },
        };
      }
    }
    if (isStaleRunningWorkflow) {
    const staleRecoveryRes = await query(
      `UPDATE agent_action_log
          SET fired_at = now(),
              metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE tenant_id = $1::uuid
          AND trigger_key = $2
          AND COALESCE(metadata->>'status', '') IN ('running', 'rolling_back')
          AND COALESCE((metadata->>'workflow_state_version')::int, 0) = $4
      RETURNING id`,
      [ctx.tenantId, workflowTriggerKey, JSON.stringify({
        workflow_id: workflowId,
        workflow_state_version: currentWorkflowStateVersion + 1,
        status: 'failed',
        last_error: 'Execução anterior ficou stale e foi liberada para nova tentativa.',
        stale_recovered_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      }), currentWorkflowStateVersion],
    ).catch(() => ({ rowCount: 0 }));
      if (!staleRecoveryRes.rowCount) {
        return { success: false, error: 'Este workflow mudou de estado e não pode ser retomado agora. Recarregue e tente novamente.' };
      }
      existingStatus = 'failed';
      currentWorkflowStateVersion += 1;
    }
  }

  if (ctx.explicitConfirmation !== true) {
    const pendingWorkflowStateVersion = currentWorkflowStateVersion + 1;
    await query(
      `INSERT INTO agent_action_log (tenant_id, trigger_key, metadata)
       VALUES ($1::uuid, $2, $3::jsonb)
       ON CONFLICT (trigger_key, fired_date)
       DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         fired_at = now(),
         metadata = COALESCE(agent_action_log.metadata, '{}'::jsonb) || EXCLUDED.metadata`,
      [ctx.tenantId, workflowTriggerKey, JSON.stringify({
        workflow_id: workflowId,
        workflow_state_version: pendingWorkflowStateVersion,
        workflow_json: String(args.workflow_json || '[]'),
        status: 'pending_confirmation',
        steps_total: steps.length,
        completed_steps: startIndex,
        attempt_count: attemptCount,
        resume_from_step: resumeFromStep,
        last_activity_at: new Date().toISOString(),
        steps_preview: steps.slice(startIndex, startIndex + 6).map((step: any, index: number) => ({
          index: startIndex + index + 1,
          tool: String(step?.tool || '').trim(),
          summary: JSON.stringify(step?.args || {}).slice(0, 180),
        })),
        confirmation_prompt: 'Confirmo a execução do workflow em lote.',
        requested_at: new Date().toISOString(),
      })],
    ).catch(() => null);
    return buildConfirmationRequiredResult('Confirmação pendente para executar workflow em lote.', {
      workflow_id: workflowId,
      workflow_state_version: pendingWorkflowStateVersion,
      workflow_status: 'pending_confirmation',
      workflow_json: String(args.workflow_json || '[]'),
      completed_steps: startIndex,
      attempt_count: attemptCount,
      resume_from_step: resumeFromStep,
      steps_preview: steps.slice(startIndex, startIndex + 6).map((step: any, index: number) => ({
        index: startIndex + index + 1,
        tool: String(step?.tool || '').trim(),
        summary: JSON.stringify(step?.args || {}).slice(0, 180),
      })),
      tool_name: 'execute_multi_step_workflow',
      tool_args: {
        workflow_json: String(args.workflow_json || '[]'),
        workflow_id: workflowId,
        workflow_state_version: pendingWorkflowStateVersion,
        resume_from_step: resumeFromStep,
      },
      confirmation_prompt: 'Confirmo a execução do workflow em lote.',
    });
  }

  const irreversible = new Set(['send_whatsapp_message', 'send_email']);
  let hitIrreversible = false;
  for (const step of steps) {
    if (irreversible.has(step?.tool)) hitIrreversible = true;
    else if (hitIrreversible) return { success: false, error: 'Passos irreversíveis de comunicação devem ficar no final do workflow.' };
  }

  if (ctx.explicitConfirmation === true && args.background_execution !== true) {
    const queuedWorkflowStateVersion = currentWorkflowStateVersion + 1;
    const queuedClient = await pool.connect();
    try {
      await queuedClient.query('BEGIN');

      const { rows: jobRows } = await queuedClient.query<any>(
        `INSERT INTO job_queue (tenant_id, type, payload, scheduled_for)
         VALUES ($1, 'jarvis_background', $2::jsonb, NOW())
         RETURNING *`,
        [ctx.tenantId, JSON.stringify({
          kind: 'execute_multi_step_workflow',
          args: {
            ...args,
            confirmed: true,
            background_execution: true,
            workflow_id: workflowId,
            workflow_state_version: queuedWorkflowStateVersion,
            resume_from_step: resumeFromStep,
          },
          context: {
            tenantId: ctx.tenantId,
            clientId: (ctx as any).clientId || '',
            edroClientId: (ctx as any).edroClientId || null,
            userId: ctx.userId ?? null,
            userEmail: ctx.userEmail ?? null,
            role: ctx.role ?? null,
            explicitConfirmation: true,
            conversationId: (ctx as any).conversationId || null,
            conversationRoute: (ctx as any).conversationRoute || 'operations',
            pageData: (ctx as any).pageData ?? null,
          },
          conversation: {
            route: (ctx as any).conversationRoute === 'planning' ? 'planning' : 'operations',
            conversationId: (ctx as any).conversationId || null,
            edroClientId: (ctx as any).edroClientId || null,
          },
        })],
      );
      const backgroundJob = jobRows[0];
      const queuedMetadata = {
        workflow_id: workflowId,
        workflow_state_version: queuedWorkflowStateVersion,
        workflow_json: String(args.workflow_json || '[]'),
        status: 'queued',
        background_job_id: backgroundJob.id,
        is_dead_letter: false,
        dead_lettered_at: null,
        dead_letter_reason: null,
        dead_letter_category: null,
        requires_manual_followup: false,
        manual_followup: [],
        steps_total: steps.length,
        completed_steps: startIndex,
        attempt_count: attemptCount,
        resume_from_step: resumeFromStep,
        last_activity_at: new Date().toISOString(),
        queued_at: new Date().toISOString(),
        steps_preview: steps.slice(startIndex, startIndex + 6).map((step: any, index: number) => ({
          index: startIndex + index + 1,
          tool: String(step?.tool || '').trim(),
          summary: JSON.stringify(step?.args || {}).slice(0, 180),
        })),
        retry_after_at: null,
        retry_cooldown_ms: null,
        retry_attempts_remaining: null,
      };

      if (existingMetadata) {
        const queueRes = await queuedClient.query<{ id: string }>(
          `UPDATE agent_action_log
              SET fired_at = now(),
                  metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
            WHERE tenant_id = $1::uuid
              AND trigger_key = $2
              AND COALESCE(metadata->>'status', '') NOT IN ('queued', 'running', 'rolling_back', 'completed')
              AND ($6::boolean = true OR COALESCE((metadata->>'requires_manual_followup')::boolean, false) = false)
              AND COALESCE((metadata->>'workflow_state_version')::int, 0) = $5
              AND (
                COALESCE(metadata->>'status', '') <> 'failed'
                OR COALESCE((metadata->>'resume_from_step')::int, 1) = $4
              )
            RETURNING id`,
          [ctx.tenantId, workflowTriggerKey, JSON.stringify(queuedMetadata), resumeFromStep, currentWorkflowStateVersion, manualRequeue],
        );
        if (!queueRes.rowCount) {
          await queuedClient.query('ROLLBACK');
          return { success: false, error: 'Este workflow mudou de estado e não pode ser enfileirado agora. Recarregue e tente novamente.' };
        }
      } else {
        await queuedClient.query(
          `INSERT INTO agent_action_log (tenant_id, trigger_key, metadata)
           VALUES ($1::uuid, $2, $3::jsonb)
           ON CONFLICT (trigger_key, fired_date)
           DO UPDATE SET
             tenant_id = EXCLUDED.tenant_id,
             fired_at = now(),
             metadata = COALESCE(agent_action_log.metadata, '{}'::jsonb) || EXCLUDED.metadata`,
          [ctx.tenantId, workflowTriggerKey, JSON.stringify(queuedMetadata)],
        );
      }

      await queuedClient.query('COMMIT');
      return {
        success: true,
        data: {
          background_job_id: backgroundJob.id,
          job_status: 'queued',
          workflow_id: workflowId,
          workflow_state_version: queuedWorkflowStateVersion,
          workflow_status: 'queued',
          workflow_json: String(args.workflow_json || '[]'),
          completed_steps: startIndex,
          steps_total: steps.length,
          attempt_count: attemptCount,
          resume_from_step: resumeFromStep,
          steps_preview: queuedMetadata.steps_preview,
          message: 'Workflow enfileirado para execução em background.',
          next_step: 'O Jarvis vai executar o fluxo em background e atualizar este card sozinho.',
        },
      };
    } catch (error: any) {
      await queuedClient.query('ROLLBACK').catch(() => {});
      return { success: false, error: error?.message || 'Falha ao enfileirar o workflow.' };
    } finally {
      queuedClient.release();
    }
  }

  const confirmedCtx = { ...ctx, explicitConfirmation: true };
  const nextAttemptCount = attemptCount + 1;
  const runningWorkflowStateVersion = currentWorkflowStateVersion + 1;
  const rollbackStack: Array<{ type: string; payload: any }> = [];
  const executed: any[] = [];
  const summarizeStepResult = (data: any): string | null => {
    if (!data || typeof data !== 'object') return null;
    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
    if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
    if (typeof data.to === 'string' && data.to.trim()) return `para ${data.to.trim()}`;
    if (typeof data.recipient_phone === 'string' && data.recipient_phone.trim()) return `para ${data.recipient_phone.trim()}`;
    if (typeof data.board_name === 'string' || typeof data.list_name === 'string') {
      const board = String(data.board_name || '').trim();
      const list = String(data.list_name || '').trim();
      return [board, list].filter(Boolean).join(' / ') || null;
    }
    if (typeof data.status === 'string' && data.status.trim()) return data.status.trim();
    return null;
  };
  const summarizeStepArgs = (stepArgs: any): string | null => {
    if (!stepArgs || typeof stepArgs !== 'object') return null;
    const entries = Object.entries(stepArgs).slice(0, 4);
    if (!entries.length) return null;
    const rendered = entries.map(([key, value]) => {
      const normalized = typeof value === 'string' ? value : JSON.stringify(value);
      return `${key}=${String(normalized || '').slice(0, 40)}`;
    }).join(', ');
    return rendered.slice(0, 180);
  };
  const buildExecutedPreview = () => executed.slice(0, 5).map((item) => ({
    tool: item.tool,
    success: item.success,
    error: item.error || null,
    summary: summarizeStepResult(item.data),
    args_preview: item.args_preview || null,
    duration_ms: item.duration_ms || null,
  }));
  const buildExecutedHistory = () => executed.map((item, index) => ({
    index: index + 1,
    tool: item.tool,
    success: item.success,
    error: item.error || null,
    summary: summarizeStepResult(item.data),
    args_preview: item.args_preview || null,
    duration_ms: item.duration_ms || null,
  }));
  const backgroundJobId = String(args.background_job_id || '').trim();
  const getCancelRequest = async () => {
    if (!backgroundJobId) return null;
    const { rows } = await query<{ payload: Record<string, any> | null }>(
      `SELECT payload
         FROM job_queue
        WHERE id = $1
          AND tenant_id = $2
          AND type = 'jarvis_background'
        LIMIT 1`,
      [backgroundJobId, ctx.tenantId],
    ).catch(() => ({ rows: [] as Array<{ payload: Record<string, any> | null }> }));
    const payload = rows[0]?.payload && typeof rows[0].payload === 'object' ? rows[0].payload : null;
    return payload?.cancel_requested === true
      ? {
          requested_at: String(payload?.cancel_requested_at || '').trim() || new Date().toISOString(),
          requested_by_email: String(payload?.cancelled_by_user_email || '').trim() || null,
        }
      : null;
  };
  const buildCancelledResult = async (reason: string) => {
    const cancelledAt = new Date().toISOString();
    const requiresManualFollowup = executed.length > 0;
    const manualFollowup = requiresManualFollowup
      ? ['Workflow cancelado entre etapas. Revise os efeitos já aplicados antes de repetir.']
      : [];
    const data = {
      workflow_id: workflowId,
      workflow_state_version: runningWorkflowStateVersion,
      workflow_status: 'cancelled',
      workflow_json: String(args.workflow_json || '[]'),
      background_job_id: backgroundJobId || null,
      completed_steps: startIndex + executed.length,
      attempt_count: nextAttemptCount,
      resume_from_step: null,
      cancel_requested: true,
      cancelled_at: cancelledAt,
      last_error: reason,
      steps_history: buildExecutedHistory(),
      steps_preview: buildExecutedPreview(),
      requires_manual_followup: requiresManualFollowup,
      manual_followup: manualFollowup,
      can_retry_now: false,
      retry_block_reason: 'Workflow cancelado manualmente durante a execução.',
      recommended_next_action: requiresManualFollowup ? 'manual_followup' : null,
      recommended_next_label: requiresManualFollowup ? 'Revisar efeitos parciais' : 'Cancelado',
      failure_class: requiresManualFollowup ? 'irreversible' : null,
    };
    await query(
      `UPDATE agent_action_log
          SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE tenant_id = $1::uuid AND trigger_key = $2`,
      [ctx.tenantId, workflowTriggerKey, JSON.stringify({
        ...data,
        status: 'cancelled',
        finished_at: cancelledAt,
        last_activity_at: cancelledAt,
      })],
    ).catch(() => null);
    return { success: false, error: reason, data };
  };
  const classifyWorkflowFailure = (errorMessage: string | null | undefined, rollbackSummary?: { requires_manual_followup?: boolean }) => {
    const text = String(errorMessage || '').toLowerCase();
    if (rollbackSummary?.requires_manual_followup) return 'irreversible';
    if (/(permission|permiss|forbidden|403|access denied|não autorizado)/i.test(text)) return 'permission';
    if (/(timeout|timed out|temporar|429|502|503|504|network|fetch|gateway|service unavailable|econnreset|etimedout)/i.test(text)) return 'transient';
    return 'business';
  };
  const buildFailurePolicy = (failureClass: string) => {
    if (failureClass === 'transient') {
      if (nextAttemptCount >= TRANSIENT_RETRY_MAX_ATTEMPTS) {
        return {
          recommended_next_action: 'manual_followup',
          recommended_next_label: 'Limite de tentativas atingido',
          retry_after_at: null,
          retry_cooldown_ms: null,
          retry_attempts_remaining: 0,
        };
      }
      return {
        recommended_next_action: 'retry',
        recommended_next_label: 'Tentar novamente após cooldown',
        retry_after_at: new Date(Date.now() + TRANSIENT_RETRY_COOLDOWN_MS).toISOString(),
        retry_cooldown_ms: TRANSIENT_RETRY_COOLDOWN_MS,
        retry_attempts_remaining: Math.max(0, TRANSIENT_RETRY_MAX_ATTEMPTS - nextAttemptCount),
      };
    }
    if (failureClass === 'permission') {
      return {
        recommended_next_action: 'fix_permissions',
        recommended_next_label: 'Ajustar permissões',
        retry_after_at: null,
        retry_cooldown_ms: null,
        retry_attempts_remaining: null,
      };
    }
    if (failureClass === 'irreversible') {
      return {
        recommended_next_action: 'manual_followup',
        recommended_next_label: 'Resolver manualmente',
        retry_after_at: null,
        retry_cooldown_ms: null,
        retry_attempts_remaining: null,
      };
    }
    return {
      recommended_next_action: 'fix_input',
      recommended_next_label: 'Corrigir dados do workflow',
      retry_after_at: null,
      retry_cooldown_ms: null,
      retry_attempts_remaining: null,
    };
  };
  const buildFailureResolutionHint = (params: {
    failureClass: string;
    toolName: string;
    argsPreview?: string | null;
    retryAfterAt?: string | null;
    retryAttemptsRemaining?: number | null;
  }) => {
    const stepRef = params.argsPreview ? `${params.toolName} (${params.argsPreview})` : params.toolName;
    if (params.failureClass === 'transient') {
      if ((params.retryAttemptsRemaining || 0) <= 0) {
        return `O step ${stepRef} atingiu o limite de tentativas automáticas. Faça follow-up manual antes de insistir.`;
      }
      return `O step ${stepRef} falhou por instabilidade transitória. Aguarde até ${params.retryAfterAt ? new Date(params.retryAfterAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'o fim do cooldown'} e tente novamente.`;
    }
    if (params.failureClass === 'permission') {
      return `O step ${stepRef} falhou por permissão. Ajuste acesso ou credenciais antes de repetir o workflow.`;
    }
    if (params.failureClass === 'irreversible') {
      return `O step ${stepRef} deixou pendência operacional. Resolva manualmente antes de qualquer nova execução.`;
    }
    return `O step ${stepRef} falhou por dado ou regra de negócio. Corrija a entrada do workflow antes de tentar novamente.`;
  };
  const buildRetryAvailability = (params: {
    recommendedNextAction?: string | null;
    recommendedNextLabel?: string | null;
    retryAfterAt?: string | null;
    requiresManualFollowup?: boolean;
  }) => {
    if (params.requiresManualFollowup) {
      return { can_retry_now: false, retry_block_reason: 'Workflow exige follow-up manual antes de qualquer retry.' };
    }
    if (params.recommendedNextAction !== 'retry') {
      return {
        can_retry_now: false,
        retry_block_reason: params.recommendedNextLabel ? `Retry indisponível: ${params.recommendedNextLabel}.` : 'Retry indisponível.',
      };
    }
    const retryAfterRaw = String(params.retryAfterAt || '').trim();
    const retryAfterAt = retryAfterRaw ? new Date(retryAfterRaw) : null;
    if (retryAfterAt && !Number.isNaN(retryAfterAt.getTime()) && retryAfterAt.getTime() > Date.now()) {
      return {
        can_retry_now: false,
        retry_block_reason: `Workflow em cooldown até ${retryAfterAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
      };
    }
    return { can_retry_now: true, retry_block_reason: null };
  };
  const buildFailureActionItems = (params: {
    failureClass: string;
    toolName: string;
    retryAfterAt?: string | null;
    retryAttemptsRemaining?: number | null;
    manualFollowup?: string[];
  }) => {
    if (params.failureClass === 'transient') {
      const items = [];
      if ((params.retryAttemptsRemaining || 0) > 0 && params.retryAfterAt) {
        items.push(`aguarde o cooldown até ${new Date(params.retryAfterAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
      }
      if ((params.retryAttemptsRemaining || 0) > 0) {
        items.push(`retome o workflow a partir de ${params.toolName}`);
      }
      if ((params.retryAttemptsRemaining || 0) <= 0) {
        items.push('pare de insistir no retry automático');
        items.push('faça follow-up manual do fluxo');
      }
      return items;
    }
    if (params.failureClass === 'permission') {
      return ['revise as permissões do usuário ou tenant', 'valide credenciais e integrações antes de repetir'];
    }
    if (params.failureClass === 'irreversible') {
      return Array.isArray(params.manualFollowup) && params.manualFollowup.length > 0
        ? params.manualFollowup.slice(0, 3)
        : ['resolva manualmente a pendência operacional antes de repetir'];
    }
    return ['corrija os dados de entrada do workflow', `revise os argumentos do step ${params.toolName}`];
  };
  const summarizeRollback = (items: any[]) => {
    const total = items.length;
    const failures = items.filter((item) => item?.success === false).length;
    const manualFollowup = items
      .filter((item) => item?.success === false)
      .map((item) => {
        if (item?.type === 'job_status') return 'Reverter status do job manualmente.';
        if (item?.type === 'briefing') return 'Revisar briefing criado e remover manualmente.';
        if (item?.type === 'job_created') return 'Revisar job criado e excluir manualmente.';
        if (item?.type === 'trello_card') return 'Revisar card no Trello e arquivar manualmente.';
        return 'Revisar a compensação manualmente.';
      })
      .slice(0, 4);
    return {
      rollback_total: total,
      rollback_completed: total,
      rollback_failures: failures,
      rollback_status: total === 0 ? 'not_needed' : failures > 0 ? 'partial_failure' : 'completed',
      requires_manual_followup: manualFollowup.length > 0,
      manual_followup: manualFollowup,
    };
  };
  const runningMetadata = {
    workflow_id: workflowId,
    workflow_state_version: runningWorkflowStateVersion,
    workflow_json: String(args.workflow_json || '[]'),
    status: 'running',
    steps_total: steps.length,
    attempt_count: nextAttemptCount,
    resume_from_step: resumeFromStep,
    last_activity_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    retry_after_at: null,
    retry_cooldown_ms: null,
    retry_attempts_remaining: null,
  };
  if (existingMetadata) {
    const claimRes = await query(
      `UPDATE agent_action_log
          SET fired_at = now(),
              metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE tenant_id = $1::uuid
          AND trigger_key = $2
          AND COALESCE(metadata->>'status', '') NOT IN ('running', 'rolling_back', 'completed')
          AND COALESCE((metadata->>'requires_manual_followup')::boolean, false) = false
          AND COALESCE((metadata->>'workflow_state_version')::int, 0) = $5
          AND (
            COALESCE(metadata->>'status', '') <> 'failed'
            OR COALESCE((metadata->>'resume_from_step')::int, 1) = $4
          )
        RETURNING id`,
      [ctx.tenantId, workflowTriggerKey, JSON.stringify(runningMetadata), resumeFromStep, currentWorkflowStateVersion],
    ).catch(() => ({ rowCount: 0 }));
    if (!claimRes.rowCount) {
      return { success: false, error: 'Este workflow mudou de estado e não pode ser executado agora. Recarregue e tente novamente.' };
    }
  } else {
    await query(
      `INSERT INTO agent_action_log (tenant_id, trigger_key, metadata)
       VALUES ($1::uuid, $2, $3::jsonb)
       ON CONFLICT (trigger_key, fired_date)
       DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         fired_at = now(),
         metadata = COALESCE(agent_action_log.metadata, '{}'::jsonb) || EXCLUDED.metadata`,
      [ctx.tenantId, workflowTriggerKey, JSON.stringify(runningMetadata)],
    ).catch(() => null);
  }

  for (let stepIndex = startIndex; stepIndex < steps.length; stepIndex += 1) {
    const cancelRequest = await getCancelRequest();
    if (cancelRequest) {
      const requestedBy = cancelRequest.requested_by_email ? ` por ${cancelRequest.requested_by_email}` : '';
      return buildCancelledResult(`Workflow cancelado manualmente${requestedBy}.`);
    }
    const step = steps[stepIndex];
    const toolName = String(step?.tool || '').trim();
    const stepArgs = step?.args && typeof step.args === 'object' ? step.args : {};
    const stepStartedAt = Date.now();
    let result: ToolResult;
    if (toolName === 'create_briefing' || toolName === 'add_calendar_event' || toolName === 'schedule_meeting') {
      const clientId = contextualString(stepArgs.client_id) || contextualString((ctx as any).clientId);
      if (!clientId) return { success: false, error: `${toolName} exige client_id no workflow.` };
      const { rows: edroRows } = await query<{ id: string }>(
        `SELECT id FROM edro_clients WHERE tenant_id = $1 AND client_id = $2 LIMIT 1`,
        [ctx.tenantId, clientId],
      ).catch(() => ({ rows: [] as { id: string }[] }));
      result = await executeTool(toolName, stepArgs, {
        ...(ctx as any),
        tenantId: ctx.tenantId,
        clientId,
        edroClientId: edroRows[0]?.id || null,
        explicitConfirmation: true,
      });
    } else {
      result = await executeOperationsTool(toolName, stepArgs, confirmedCtx);
    }
    const stepDurationMs = Date.now() - stepStartedAt;
    const stepArgsPreview = summarizeStepArgs(stepArgs);
    executed.push({
      tool: toolName,
      success: result.success,
      data: result.data,
      error: result.error,
      args_preview: stepArgsPreview,
      duration_ms: stepDurationMs,
    });

      if (!result.success) {
        const rollbackTotal = rollbackStack.length;
        await query(
          `UPDATE agent_action_log
              SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
            WHERE tenant_id = $1::uuid AND trigger_key = $2`,
          [ctx.tenantId, workflowTriggerKey, JSON.stringify({
            workflow_id: workflowId,
            workflow_state_version: runningWorkflowStateVersion,
            workflow_json: String(args.workflow_json || '[]'),
            status: 'rolling_back',
            failed_step: toolName,
            last_error: result.error || `Workflow falhou em ${toolName}.`,
            failed_step_args_preview: stepArgsPreview,
            failed_step_duration_ms: stepDurationMs,
            attempt_count: nextAttemptCount,
            completed_steps: startIndex + executed.filter((item) => item.success).length,
            resume_from_step: startIndex + executed.filter((item) => item.success).length + 1,
            last_activity_at: new Date().toISOString(),
            last_step: toolName,
            steps_preview: buildExecutedPreview(),
            steps_history: buildExecutedHistory(),
            rollback_status: rollbackTotal > 0 ? 'running' : 'not_needed',
            rollback_total: rollbackTotal,
            rollback_completed: 0,
            rollback_failures: 0,
            retry_after_at: null,
            retry_cooldown_ms: null,
            retry_attempts_remaining: null,
          })],
        ).catch(() => null);
        const rollback: any[] = [];
        for (const frame of rollbackStack.reverse()) {
        let rollbackEntry: any = { type: frame.type, success: true };
        try {
          if (frame.type === 'job_status') {
            const rb = await executeOperationsTool('change_job_status', { job_id: frame.payload.job_id, status: frame.payload.status, reason: 'rollback' }, confirmedCtx);
            rollbackEntry = { type: frame.type, success: rb?.success !== false, error: rb?.success === false ? rb.error || 'rollback_failed' : null };
          }
          if (frame.type === 'briefing') {
            const rb = await executeTool('delete_briefing', { briefing_id: frame.payload.briefing_id, confirmed: true }, { ...(ctx as any), clientId: frame.payload.client_id, edroClientId: frame.payload.edro_client_id, explicitConfirmation: true });
            rollbackEntry = { type: frame.type, success: rb?.success !== false, error: rb?.success === false ? rb.error || 'rollback_failed' : null };
          }
          if (frame.type === 'job_created') {
            await query(`DELETE FROM job_status_history WHERE job_id = $1`, [frame.payload.job_id]).catch(() => {});
            rollbackEntry = { type: frame.type, success: (await query(`DELETE FROM jobs WHERE id = $1 AND tenant_id = $2`, [frame.payload.job_id, ctx.tenantId])).rowCount > 0 };
          }
          if (frame.type === 'trello_card') {
            await query(`UPDATE project_cards SET is_archived = true, updated_at = now() WHERE id = $1 AND tenant_id = $2`, [frame.payload.card_id, ctx.tenantId]).catch(() => {});
            if (frame.payload.trello_card_id) {
              const creds = await getTrelloCredentials(ctx.tenantId).catch(() => null);
              if (creds) await fetch(`https://api.trello.com/1/cards/${frame.payload.trello_card_id}?key=${creds.apiKey}&token=${creds.apiToken}&closed=true`, { method: 'PUT', signal: AbortSignal.timeout(8_000) }).catch(() => null);
            }
            rollbackEntry = { type: frame.type, success: true };
          }
          } catch (rollbackErr: any) {
            rollbackEntry = { type: frame.type, success: false, error: rollbackErr?.message || 'rollback_failed' };
          }
          rollback.push(rollbackEntry);
          await query(
            `UPDATE agent_action_log
                SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
              WHERE tenant_id = $1::uuid AND trigger_key = $2`,
            [ctx.tenantId, workflowTriggerKey, JSON.stringify({
              workflow_id: workflowId,
              workflow_state_version: runningWorkflowStateVersion,
              workflow_json: String(args.workflow_json || '[]'),
              status: 'rolling_back',
              failed_step: toolName,
              last_error: result.error || `Workflow falhou em ${toolName}.`,
              failed_step_args_preview: stepArgsPreview,
              failed_step_duration_ms: stepDurationMs,
              attempt_count: nextAttemptCount,
              last_activity_at: new Date().toISOString(),
              steps_preview: buildExecutedPreview(),
              steps_history: buildExecutedHistory(),
              rollback_status: 'running',
              rollback_total: rollbackTotal,
              rollback_completed: rollback.length,
              rollback_failures: rollback.filter((item) => item?.success === false).length,
              retry_after_at: null,
              retry_cooldown_ms: null,
              retry_attempts_remaining: null,
            })],
          ).catch(() => null);
        }
        const completedSteps = startIndex + executed.filter((item) => item.success).length;
        const rollbackSummary = summarizeRollback(rollback);
        const failureClass = classifyWorkflowFailure(result.error || `Workflow falhou em ${toolName}.`, rollbackSummary);
        const failurePolicy = buildFailurePolicy(failureClass);
        const failureResolutionHint = buildFailureResolutionHint({
          failureClass,
          toolName,
          argsPreview: stepArgsPreview,
          retryAfterAt: failurePolicy.retry_after_at,
          retryAttemptsRemaining: failurePolicy.retry_attempts_remaining,
        });
        const retryAvailability = buildRetryAvailability({
          recommendedNextAction: failurePolicy.recommended_next_action,
          recommendedNextLabel: failurePolicy.recommended_next_label,
          retryAfterAt: failurePolicy.retry_after_at,
          requiresManualFollowup: rollbackSummary.requires_manual_followup,
        });
        const failureActionItems = buildFailureActionItems({
          failureClass,
          toolName,
          retryAfterAt: failurePolicy.retry_after_at,
          retryAttemptsRemaining: failurePolicy.retry_attempts_remaining,
          manualFollowup: rollbackSummary.manual_followup,
        });
        const data = {
          workflow_id: workflowId,
          workflow_state_version: runningWorkflowStateVersion,
          workflow_status: 'failed',
          workflow_json: String(args.workflow_json || '[]'),
          retry_tool_args: retryAvailability.can_retry_now
            ? {
                workflow_json: String(args.workflow_json || '[]'),
                workflow_id: workflowId,
                workflow_state_version: runningWorkflowStateVersion,
                resume_from_step: completedSteps + 1,
              }
            : null,
          failed_step: toolName,
          last_error: result.error || `Workflow falhou em ${toolName}.`,
          failed_step_args_preview: stepArgsPreview,
          failed_step_duration_ms: stepDurationMs,
          failure_class: failureClass,
          ...failurePolicy,
          completed_steps: completedSteps,
          attempt_count: nextAttemptCount,
          resume_from_step: completedSteps + 1,
          executed,
        steps_history: buildExecutedHistory(),
        rollback,
        ...rollbackSummary,
          retry_after_at: failurePolicy.retry_after_at,
          retry_cooldown_ms: failurePolicy.retry_cooldown_ms,
          retry_attempts_remaining: failurePolicy.retry_attempts_remaining,
          failure_resolution_hint: failureResolutionHint,
          failure_action_items: failureActionItems,
          can_retry_now: retryAvailability.can_retry_now,
          retry_block_reason: retryAvailability.retry_block_reason,
        };
        await query(
          `UPDATE agent_action_log
              SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
            WHERE tenant_id = $1::uuid AND trigger_key = $2`,
          [ctx.tenantId, workflowTriggerKey, JSON.stringify({
            workflow_id: workflowId,
            workflow_state_version: runningWorkflowStateVersion,
            workflow_json: String(args.workflow_json || '[]'),
            status: 'failed',
            failed_step: toolName,
            last_error: result.error || `Workflow falhou em ${toolName}.`,
            failed_step_args_preview: stepArgsPreview,
            failed_step_duration_ms: stepDurationMs,
            failure_class: failureClass,
            ...failurePolicy,
            completed_steps: completedSteps,
            attempt_count: nextAttemptCount,
            resume_from_step: completedSteps + 1,
            last_activity_at: new Date().toISOString(),
            steps_preview: buildExecutedPreview(),
            steps_history: buildExecutedHistory(),
            finished_at: new Date().toISOString(),
            rollback,
            ...rollbackSummary,
            retry_after_at: failurePolicy.retry_after_at,
            retry_cooldown_ms: failurePolicy.retry_cooldown_ms,
            retry_attempts_remaining: failurePolicy.retry_attempts_remaining,
            failure_resolution_hint: failureResolutionHint,
            failure_action_items: failureActionItems,
            can_retry_now: retryAvailability.can_retry_now,
            retry_block_reason: retryAvailability.retry_block_reason,
          })],
        ).catch(() => null);
        return { success: false, error: result.error || `Workflow falhou em ${toolName}.`, data };
      }

    if (toolName === 'change_job_status' && result.data?.from_status) rollbackStack.push({ type: 'job_status', payload: { job_id: stepArgs.job_id, status: result.data.from_status } });
    if (toolName === 'create_operations_job' && result.data?.id) rollbackStack.push({ type: 'job_created', payload: { job_id: result.data.id } });
    if (toolName === 'create_trello_card' && result.data?.id) rollbackStack.push({ type: 'trello_card', payload: { card_id: result.data.id, trello_card_id: result.data.trello_card_id || null } });
    if (toolName === 'create_briefing' && result.data?.id) rollbackStack.push({ type: 'briefing', payload: { briefing_id: result.data.id, client_id: contextualString(stepArgs.client_id) || contextualString((ctx as any).clientId), edro_client_id: null } });

    await query(
      `UPDATE agent_action_log
          SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE tenant_id = $1::uuid AND trigger_key = $2`,
      [ctx.tenantId, workflowTriggerKey, JSON.stringify({
        workflow_id: workflowId,
        workflow_state_version: runningWorkflowStateVersion,
        workflow_json: String(args.workflow_json || '[]'),
        status: 'running',
        completed_steps: startIndex + executed.length,
        attempt_count: nextAttemptCount,
        resume_from_step: stepIndex + 2,
        last_activity_at: new Date().toISOString(),
        last_step: toolName,
        steps_preview: buildExecutedPreview(),
        steps_history: buildExecutedHistory(),
        rollback_status: null,
        rollback_total: 0,
        rollback_completed: 0,
        rollback_failures: 0,
        retry_after_at: null,
        retry_cooldown_ms: null,
        retry_attempts_remaining: null,
      })],
    ).catch(() => null);
  }

  const data = {
    workflow_id: workflowId,
    workflow_state_version: runningWorkflowStateVersion,
    workflow_status: 'completed',
    completed_steps: startIndex + executed.length,
    attempt_count: nextAttemptCount,
    resume_from_step: null,
    steps: executed,
    steps_history: buildExecutedHistory(),
  };
  await query(
    `UPDATE agent_action_log
        SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
      WHERE tenant_id = $1::uuid AND trigger_key = $2`,
    [ctx.tenantId, workflowTriggerKey, JSON.stringify({
      workflow_id: workflowId,
      workflow_state_version: runningWorkflowStateVersion,
      workflow_json: String(args.workflow_json || '[]'),
      status: 'completed',
      completed_steps: startIndex + executed.length,
      attempt_count: nextAttemptCount,
      resume_from_step: null,
      last_activity_at: new Date().toISOString(),
      steps_preview: buildExecutedPreview(),
      steps_history: buildExecutedHistory(),
      rollback_status: null,
      rollback_total: 0,
      rollback_completed: 0,
      rollback_failures: 0,
      retry_after_at: null,
      retry_cooldown_ms: null,
      retry_attempts_remaining: null,
      finished_at: new Date().toISOString(),
    })],
  ).catch(() => null);
  return { success: true, data };
}

export async function runExecuteMultiStepWorkflowNow(args: any, ctx: ToolContext): Promise<ToolResult> {
  return opsExecuteMultiStepWorkflow(
    { ...args, confirmed: true, background_execution: true },
    {
      ...(ctx as any),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      role: ctx.role ?? null,
      explicitConfirmation: true,
    },
  );
}

async function opsUpdateJob(args: any, ctx: OperationsToolContext): Promise<ToolResult> {
  const existingRes = await query(`SELECT * FROM jobs WHERE tenant_id = $1 AND id = $2 LIMIT 1`, [ctx.tenantId, args.job_id]);
  if (!existingRes.rows.length) {
    // Fallback: update project_cards (Trello source)
    const card = await getProjectCardAsJob(ctx.tenantId, args.job_id);
    if (!card) return { success: false, error: 'Job não encontrado.' };
    const cardSets: string[] = [];
    const cardValues: any[] = [ctx.tenantId, args.job_id];
    if (args.deadline_at !== undefined) {
      const d = args.deadline_at ? args.deadline_at.split('T')[0] : null;
      cardValues.push(d); cardSets.push(`due_date = $${cardValues.length}`);
    }
    if (args.title !== undefined) { cardValues.push(args.title); cardSets.push(`title = $${cardValues.length}`); }
    if (args.summary !== undefined) { cardValues.push(args.summary); cardSets.push(`description = $${cardValues.length}`); }
    if (args.is_urgent !== undefined) { cardValues.push(args.is_urgent ? 'urgent' : 'normal'); cardSets.push(`priority = $${cardValues.length}`); }
    if (!cardSets.length) return { success: false, error: 'Nenhum campo para atualizar.' };
    const { rows: updated } = await query(
      `UPDATE project_cards SET ${cardSets.join(', ')}, updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING id, title, due_date`,
      cardValues,
    );

    // Propagate changes to Trello via outbox
    const trelloCardId = await getTrelloCardId(ctx.tenantId, args.job_id);
    if (trelloCardId) {
      const trelloFields: Record<string, string> = {};
      if (args.title !== undefined) trelloFields.name = args.title;
      if (args.summary !== undefined) trelloFields.desc = args.summary;
      if (args.deadline_at !== undefined) trelloFields.due = args.deadline_at ? args.deadline_at.split('T')[0] + 'T23:59:00.000Z' : 'null';
      if (Object.keys(trelloFields).length) {
        await enqueueOutbox(ctx.tenantId, 'card.update', { trelloCardId, fields: trelloFields }, `card.update.${trelloCardId}`).catch(() => undefined);
      }
    }

    return { success: true, data: { ...updated[0], _source: 'project_card', deadline_at: updated[0]?.due_date ? `${updated[0].due_date}T23:59:00` : null } };
  }

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
  if (!currentRes.rows.length) {
    // Fallback: change status on project_cards by moving to matching list
    const card = await getProjectCardAsJob(ctx.tenantId, args.job_id);
    if (!card) return { success: false, error: 'Job não encontrado.' };
    // Find a list in the same board that maps to the target ops_status
    const listRes = await query(
      `SELECT list_id FROM trello_list_status_map WHERE tenant_id = $1 AND board_id = $2 AND ops_status = $3 LIMIT 1`,
      [ctx.tenantId, card.board_id, args.status],
    );
    if (listRes.rows.length) {
      await query(
        `UPDATE project_cards SET list_id = $2, updated_at = now() WHERE id = $3 AND tenant_id = $1`,
        [ctx.tenantId, listRes.rows[0].list_id, args.job_id],
      );
    }
    // For 'done', mark due_complete as well
    if (args.status === 'done') {
      await query(`UPDATE project_cards SET due_complete = true, completed_at = now(), updated_at = now() WHERE id = $1 AND tenant_id = $2`, [args.job_id, ctx.tenantId]);
    }

    // Propagate to Trello via outbox
    const trelloCardId = await getTrelloCardId(ctx.tenantId, args.job_id);
    if (trelloCardId) {
      const trelloFields: Record<string, string> = {};
      if (listRes.rows.length) {
        // Resolve the Trello list ID for the target list
        const tlRes = await query<{ trello_list_id: string }>(
          `SELECT trello_list_id FROM project_lists WHERE id = $1 LIMIT 1`,
          [listRes.rows[0].list_id],
        );
        if (tlRes.rows[0]?.trello_list_id) trelloFields.idList = tlRes.rows[0].trello_list_id;
      }
      if (args.status === 'done') trelloFields.dueComplete = 'true';
      if (Object.keys(trelloFields).length) {
        await enqueueOutbox(ctx.tenantId, 'card.update', { trelloCardId, fields: trelloFields }, `card.update.${trelloCardId}`).catch(() => undefined);
      }
    }

    return { success: true, data: { id: args.job_id, title: card.title, status: args.status, _source: 'project_card', list_moved: listRes.rows.length > 0 } };
  }
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
  if (!rows.length) {
    // Fallback: assign on project_cards via project_card_members
    const card = await getProjectCardAsJob(ctx.tenantId, args.job_id);
    if (!card) return { success: false, error: 'Job não encontrado.' };
    const ownerRes = await query(
      `SELECT COALESCE(NULLIF(name, ''), split_part(email, '@', 1)) AS name, email FROM edro_users WHERE id = $1`,
      [args.owner_id],
    );
    if (!ownerRes.rows.length) return { success: false, error: 'Usuário não encontrado.' };
    const { name: ownerName, email: ownerEmail } = ownerRes.rows[0];
    await query(
      `INSERT INTO project_card_members (card_id, tenant_id, trello_member_id, display_name, email)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (card_id, trello_member_id) DO UPDATE SET display_name = $4, email = $5`,
      [args.job_id, ctx.tenantId, ownerEmail, ownerName, ownerEmail],
    );

    // Propagate to Trello via outbox — find the real trello_member_id by email
    const trelloCardId = await getTrelloCardId(ctx.tenantId, args.job_id);
    if (trelloCardId && ownerEmail) {
      const memberRes = await query<{ trello_member_id: string }>(
        `SELECT DISTINCT trello_member_id FROM project_card_members
         WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) AND trello_member_id IS NOT NULL LIMIT 1`,
        [ctx.tenantId, ownerEmail],
      );
      const trelloMemberId = memberRes.rows[0]?.trello_member_id;
      if (trelloMemberId) {
        await enqueueOutbox(
          ctx.tenantId,
          'member.sync',
          { trelloCardId, toRemove: [], toAdd: [trelloMemberId] },
          `member.sync.${trelloCardId}`,
        ).catch(() => undefined);
      }
    }

    return { success: true, data: { id: args.job_id, title: card.title, owner_name: ownerName, _source: 'project_card' } };
  }
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
  const job_id = resolveContextJobId(args, ctx);
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
  const job_id = resolveContextJobId(args, ctx);
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
  const job_id = resolveContextJobId(args, ctx);
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
  const job_id = resolveContextJobId(args, ctx);
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
  const job_id = resolveContextJobId(args, ctx);
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
  const { draft_id } = args;
  const job_id = resolveContextJobId(args, ctx);
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
  const job_id = resolveContextJobId(args, ctx);
  const { step } = args;
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
