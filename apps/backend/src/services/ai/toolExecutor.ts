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
import { createLibraryItem } from '../../library/libraryRepo';
import { generatePautaSuggestions } from '../pautaSuggestionService';
import { recordPreferenceFeedback } from '../preferenceEngine';
import { analyzeCognitiveLoad } from '../cognitiveLoadService';
import { generateWithProvider } from './copyOrchestrator';
import crypto from 'crypto';

// ── Types ──────────────────────────────────────────────────────

export type ToolContext = {
  tenantId: string;
  clientId: string;         // TEXT id from clients table
  edroClientId: string | null; // UUID from edro_clients table
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

function truncateResult(result: ToolResult): ToolResult {
  const json = JSON.stringify(result.data);
  if (json && json.length > MAX_RESULT_CHARS) {
    return {
      ...result,
      data: JSON.parse(json.slice(0, MAX_RESULT_CHARS - 50) + '..."]}'),
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
};

export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const handler = TOOL_MAP[toolName];
  if (!handler) {
    return { success: false, error: `Tool '${toolName}' not found` };
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

  const approvalUrl = `${process.env.WEB_URL ?? 'https://app.edro.digital'}/edro/aprovacao-externa?token=${token}`;
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
