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
} from '../../repositories/edroBriefingRepository';
import { getClientById } from '../../repos/clientsRepo';
import { generateCopy } from './copyService';

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
    args.instructions ? `Instrucoes: ${args.instructions}` : null,
    `Gere ${count} opcoes completas de copy.`,
    `Cada opcao deve conter: Headline, Corpo e CTA.`,
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
