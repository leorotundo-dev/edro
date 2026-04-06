import { query } from '../db';
import { buildContextPack } from '../library/contextPack';
import { listClientDocuments, getLatestClientInsight } from '../repos/clientIntelligenceRepo';
import { getClientPreferences, type LearnedPreferences } from './learningLoopService';
import { formatTimeSlot } from './predictiveService';
import { tavilySearch, isTavilyConfigured } from './tavilyService';
import { buildKbContext } from './jarvisKbService';

export type IntelligenceContext = {
  client: {
    name: string;
    segment: string;
    profile: any;
    keywords: string[];
    pillars: string[];
    negative_keywords: string[];
  };
  library: {
    sources: any[];
    packedText: string;
    totalItems: number;
  };
  clipping: {
    recent: any[];
    totalMatches: number;
    topKeywords: string[];
  };
  social: {
    trends: any[];
    totalMentions: number;
    sentimentAvg: number;
  };
  calendar: {
    upcoming: any[];
    next14Days: any[];
    highRelevance: any[];
  };
  performance: {
    platforms: Record<string, any>;
    topFormats: any[];
    bestTimes: any[];
  };
  opportunities: {
    active: any[];
    urgent: any[];
    highConfidence: any[];
  };
  briefings: {
    recent: any[];
    pending: any[];
  };
  copies: {
    recentHashes: string[];
    usedAngles: string[];
    topPerformers: any[];
  };
  clientContent: {
    recentPosts: { platform: string; title: string; excerpt: string; published_at: string; url: string }[];
    websitePages: { title: string; excerpt: string; url: string }[];
    conversationMemories: { kind: string; title: string; excerpt: string; published_at: string }[];
    totalDocuments: number;
    latestInsight: Record<string, any> | null;
  };
  learned_preferences: {
    top_angles: { angle: string; avg_score: number }[];
    preferred_formats: { format: string; avg_score: number }[];
    anti_patterns: { pattern: string; avg_score: number }[];
    boost_directives: string[];
    avoid_directives: string[];
    reportei_top_formats: { platform: string; format: string; score: number }[];
  } | null;
  predictive: {
    best_times: { platform: string; day_of_week: number; hour: number; engagement: number }[];
    content_mix: { format: string; recommended_pct: number; current_pct: number }[];
  } | null;
  web_trends: {
    content: string;
    citations: string[];
  } | null;
  group_intelligence: {
    recent_insights: { type: string; summary: string; sentiment: string; urgency: string; date: string }[];
    unactioned_count: number;
    latest_digest: string | null;
    top_topics: string[];
    client_sentiment_trend: string; // improving | stable | declining
  } | null;
  meeting_intelligence: {
    recent_meetings: {
      title: string;
      summary: string;
      platform: string;
      recorded_at: string;
      action_count: number;
      attention_level?: string;
      meeting_kind?: string;
      account_pulse?: string;
      production_directives?: string[];
    }[];
    pending_actions: { type: string; title: string; description: string; responsible: string; deadline: string | null; priority: string; excerpt: string }[];
    total_meetings: number;
    total_pending_actions: number;
  } | null;
  jarvis_kb: {
    summary: string;
    client_pattern_count: number;
    agency_pattern_count: number;
  } | null;
};

/**
 * Builds complete client intelligence context from all data sources
 * Token-aware: validates and truncates to fit model limits
 */
export async function buildIntelligenceContext(params: {
  tenant_id: string;
  client_id: string;
  query?: string;
  maxTokens?: number;
}): Promise<IntelligenceContext> {
  // Default raised from 8000 → 60000: modern models (Sonnet/Opus) support 200K context.
  // Karpathy's insight: at ~400K words, no RAG needed — long context + flat files wins.
  // 60K leaves ample room for system prompt + output while feeding the full KB.
  const maxTokens = params.maxTokens || 60_000;

  // Parallel fetch all data sources for performance
  const [
    clientResult,
    libraryContext,
    clippingData,
    socialData,
    calendarData,
    performanceData,
    opportunitiesData,
    briefingsData,
    copiesData,
    clientDocumentsData,
    clientInsightData,
    learnedPrefsData,
    predictiveTimesData,
    groupInsightsData,
    clientDirectivesData,
    meetingSummariesData,
    meetingActionsData,
  ] = await Promise.allSettled([
    // Client profile
    query(`
      SELECT name, segment_primary, profile
      FROM clients
      WHERE id = $1 AND tenant_id = $2
    `, [params.client_id, params.tenant_id]),

    // Library (semantic search) — with 10s timeout to avoid hanging on embedding API
    Promise.race([
      buildContextPack({
        tenant_id: params.tenant_id,
        client_id: params.client_id,
        query: params.query || 'contexto geral do cliente',
        k: 10,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Context pack timed out')), 10000)
      ),
    ]),

    // Clipping matches (últimos 30 dias, score > 70)
    query(`
      SELECT cm.*, ci.title, ci.excerpt, ci.published_at
      FROM clipping_matches cm
      JOIN clipping_items ci ON ci.id = cm.clipping_item_id
      WHERE cm.client_id = $1
        AND cm.tenant_id = $2
        AND cm.created_at > NOW() - INTERVAL '30 days'
        AND cm.score > 70
      ORDER BY cm.score DESC, cm.created_at DESC
      LIMIT 15
    `, [params.client_id, params.tenant_id]),

    // Social listening trends
    query(`
      SELECT keyword, platform, mention_count, average_sentiment,
             total_engagement, created_at
      FROM social_listening_trends
      WHERE client_id = $1
        AND tenant_id = $2
        AND created_at > NOW() - INTERVAL '7 days'
      ORDER BY mention_count DESC
      LIMIT 10
    `, [params.client_id, params.tenant_id]),

    // Calendar events (próximos 30 dias, relevance > 60)
    query(`
      SELECT name, date, categories, tags, base_relevance, description
      FROM events
      WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND base_relevance > 60
      ORDER BY base_relevance DESC, date
      LIMIT 20
    `, []),

    // Performance data (learned_insights)
    query(`
      SELECT platform, time_window, payload, created_at
      FROM learned_insights
      WHERE client_id = $1
        AND tenant_id = $2
        AND created_at > NOW() - INTERVAL '60 days'
      ORDER BY created_at DESC
      LIMIT 10
    `, [params.client_id, params.tenant_id]),

    // AI Opportunities
    query(`
      SELECT id, title, description, source, confidence,
             priority, suggested_action, created_at
      FROM ai_opportunities
      WHERE client_id = $1
        AND tenant_id = $2
        AND status != 'dismissed'
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        confidence DESC
      LIMIT 20
    `, [params.client_id, params.tenant_id]),

    // Recent briefings
    query(`
      SELECT id, title, status, payload, created_at, due_at
      FROM edro_briefings
      WHERE client_id = $1
        AND created_at > NOW() - INTERVAL '90 days'
      ORDER BY created_at DESC
      LIMIT 10
    `, [params.client_id]),

    // Copy versions (últimos 90 dias) para anti-repetição
    query(`
      SELECT ecv.id, ecv.output, ecv.created_at, ecv.model, ecv.payload
      FROM edro_copy_versions ecv
      JOIN edro_briefings eb ON eb.id = ecv.briefing_id
      WHERE eb.client_id = $1
        AND ecv.created_at > NOW() - INTERVAL '90 days'
      ORDER BY ecv.created_at DESC
      LIMIT 50
    `, [params.client_id]),

    // Client documents (posts + website pages, últimos 90 dias)
    listClientDocuments({
      tenantId: params.tenant_id,
      clientId: params.client_id,
      limit: 30,
    }),

    // Latest client insight (AI-generated summary)
    getLatestClientInsight({
      tenantId: params.tenant_id,
      clientId: params.client_id,
    }),

    // Learned preferences (learning loop)
    getClientPreferences({
      tenant_id: params.tenant_id,
      client_id: params.client_id,
    }),

    // Predictive intelligence (best posting times)
    query(`
      SELECT platform, day_of_week, hour, avg_engagement, sample_size
      FROM posting_time_analytics
      WHERE tenant_id = $1 AND client_id = $2
      ORDER BY avg_engagement DESC
      LIMIT 10
    `, [params.tenant_id, params.client_id]),

    // WhatsApp group intelligence insights (últimos 30 dias, excluindo descartados)
    query(`
      SELECT insight_type, summary, sentiment, urgency, actioned, created_at,
             confidence, COALESCE(confirmation_status, 'pending') AS confirmation_status
      FROM whatsapp_message_insights
      WHERE client_id = $1 AND tenant_id = $2
        AND created_at > NOW() - INTERVAL '30 days'
        AND COALESCE(confirmation_status, 'pending') != 'discarded'
      ORDER BY created_at DESC
      LIMIT 20
    `, [params.client_id, params.tenant_id]),

    // Permanent client directives (human-confirmed from WhatsApp/meetings)
    query(`
      SELECT directive_type, directive
      FROM client_directives
      WHERE client_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
    `, [params.client_id, params.tenant_id]),

    // Meeting summaries (últimos 90 dias)
    query(`
      SELECT m.title, m.summary, m.platform, m.recorded_at, m.status,
        m.analysis_payload->'intelligence'->>'attention_level' AS attention_level,
        m.analysis_payload->'intelligence'->>'meeting_kind' AS meeting_kind,
        m.analysis_payload->'intelligence'->>'account_pulse' AS account_pulse,
        m.analysis_payload->'intelligence'->'production_directives' AS production_directives,
        (SELECT COUNT(*) FROM meeting_actions ma WHERE ma.meeting_id = m.id) AS action_count
      FROM meetings m
      WHERE m.client_id = $1 AND m.tenant_id = $2
        AND m.status IN ('analyzed', 'approval_pending', 'partially_approved', 'approved', 'completed', 'archived')
        AND m.recorded_at > NOW() - INTERVAL '90 days'
      ORDER BY m.recorded_at DESC
      LIMIT 10
    `, [params.client_id, params.tenant_id]),

    // Pending meeting actions
    query(`
      SELECT ma.type, ma.title, ma.description, ma.responsible, ma.deadline,
             ma.priority, ma.raw_excerpt, ma.status, mt.title AS meeting_title
      FROM meeting_actions ma
      JOIN meetings mt ON mt.id = ma.meeting_id
      WHERE ma.client_id = $1 AND ma.tenant_id = $2
        AND ma.created_at > NOW() - INTERVAL '90 days'
      ORDER BY
        CASE ma.status WHEN 'pending' THEN 0 ELSE 1 END,
        CASE ma.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        ma.created_at DESC
      LIMIT 20
    `, [params.client_id, params.tenant_id]),

  ]);

  // Extract data from settled promises (graceful degradation)
  const client = clientResult.status === 'fulfilled' && clientResult.value.rows[0]
    ? clientResult.value.rows[0]
    : null;

  const library = libraryContext.status === 'fulfilled'
    ? libraryContext.value
    : { sources: [], packedText: '', totalItems: 0 };

  const clipping = clippingData.status === 'fulfilled' ? clippingData.value.rows : [];
  const social = socialData.status === 'fulfilled' ? socialData.value.rows : [];
  const calendar = calendarData.status === 'fulfilled' ? calendarData.value.rows : [];
  const performance = performanceData.status === 'fulfilled' ? performanceData.value.rows : [];
  const opportunities = opportunitiesData.status === 'fulfilled' ? opportunitiesData.value.rows : [];
  const briefings = briefingsData.status === 'fulfilled' ? briefingsData.value.rows : [];
  const copies = copiesData.status === 'fulfilled' ? copiesData.value.rows : [];
  const clientDocuments = clientDocumentsData.status === 'fulfilled' ? clientDocumentsData.value : [];
  const latestInsight = clientInsightData.status === 'fulfilled' ? clientInsightData.value : null;
  const learnedPrefs: LearnedPreferences | null = learnedPrefsData.status === 'fulfilled' ? learnedPrefsData.value : null;
  const predictiveTimes = predictiveTimesData.status === 'fulfilled' ? predictiveTimesData.value.rows : [];
  const groupInsights = groupInsightsData.status === 'fulfilled' ? groupInsightsData.value.rows : [];
  const clientDirectives = clientDirectivesData.status === 'fulfilled' ? clientDirectivesData.value.rows : [];
  const meetingSummaries = meetingSummariesData.status === 'fulfilled' ? meetingSummariesData.value.rows : [];
  const meetingActions = meetingActionsData.status === 'fulfilled' ? meetingActionsData.value.rows : [];

  // Jarvis KB — accumulated knowledge for this client + agency patterns
  let jarvisKb: { summary: string; client_pattern_count: number; agency_pattern_count: number } | null = null;
  try {
    const kb = await buildKbContext(params.tenant_id, params.client_id);
    if (kb.client_patterns.length > 0 || kb.agency_patterns.length > 0) {
      jarvisKb = {
        summary: kb.summary,
        client_pattern_count: kb.client_patterns.length,
        agency_pattern_count: kb.agency_patterns.length,
      };
    }
  } catch {
    // KB not yet populated — graceful degradation
  }

  // Tavily trending: fetch now that we have client keywords (fire-and-forget with timeout)
  let webTrends: { content: string; citations: string[] } | null = null;
  if (isTavilyConfigured() && client) {
    const profile = typeof client.profile === 'string' ? JSON.parse(client.profile) : client.profile || {};
    const keywords: string[] = Array.isArray(profile.keywords) ? profile.keywords : [];
    try {
      const kwList = (keywords.length ? keywords : [client.name || 'marketing digital']).slice(0, 4).join(' ');
      const segment = client.segment_primary || profile.segment || '';
      const trendQuery = `${kwList} ${segment} tendências notícias marketing ${new Date().getFullYear()} Brasil`.trim();
      const tvRes = await Promise.race([
        tavilySearch(trendQuery, { maxResults: 4, searchDepth: 'basic' }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
      if (tvRes) {
        webTrends = {
          content: tvRes.results.slice(0, 3).map((r: any) => `${r.title}: ${r.snippet?.slice(0, 300)}`).join('\n\n'),
          citations: tvRes.results.map((r: any) => r.url).filter(Boolean),
        };
      }
    } catch {
      // Tavily failed — graceful degradation
    }
  }

  // Build structured context
  const context: IntelligenceContext = {
    client: {
      name: client?.name || 'Cliente',
      segment: client?.segment_primary || '',
      profile: client?.profile || {},
      keywords: client?.profile?.keywords || [],
      pillars: client?.profile?.pillars || [],
      negative_keywords: client?.profile?.negative_keywords || [],
    },
    library: {
      sources: library.sources || [],
      packedText: library.packedText || '',
      totalItems: library.sources?.length || 0,
    },
    clipping: {
      recent: clipping.slice(0, 10),
      totalMatches: clipping.length,
      topKeywords: extractTopKeywords(clipping),
    },
    social: {
      trends: social,
      totalMentions: social.reduce((sum: number, t: any) => sum + (t.mention_count || 0), 0),
      sentimentAvg: calculateAvgSentiment(social),
    },
    calendar: {
      upcoming: calendar,
      next14Days: calendar.filter((e: any) => {
        const date = new Date(e.date);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        return diff >= 0 && diff <= 14 * 24 * 60 * 60 * 1000;
      }),
      highRelevance: calendar.filter((e: any) => e.base_relevance > 80),
    },
    performance: {
      platforms: groupPerformanceByPlatform(performance),
      topFormats: extractTopFormats(performance),
      bestTimes: extractBestTimes(performance),
    },
    opportunities: {
      active: opportunities,
      urgent: opportunities.filter((o: any) => o.priority === 'urgent'),
      highConfidence: opportunities.filter((o: any) => o.confidence >= 80),
    },
    briefings: {
      recent: briefings,
      pending: briefings.filter((b: any) => b.status !== 'done' && b.status !== 'cancelled'),
    },
    copies: {
      recentHashes: copies.map((c: any) => hashCopy(c.output)),
      usedAngles: extractAnglesFromCopies(copies),
      topPerformers: [],
    },
    clientContent: {
      recentPosts: clientDocuments
        .filter((d: any) => d.source_type === 'social')
        .slice(0, 15)
        .map((d: any) => ({
          platform: d.platform || '',
          title: d.title || '',
          excerpt: (d.content_excerpt || d.content_text || '').slice(0, 200),
          published_at: d.published_at || d.created_at || '',
          url: d.url || '',
        })),
      websitePages: clientDocuments
        .filter((d: any) => d.source_type === 'website' || d.source_type === 'sitemap' || d.source_type === 'rss')
        .slice(0, 10)
        .map((d: any) => ({
          title: d.title || '',
          excerpt: (d.content_excerpt || d.content_text || '').slice(0, 200),
          url: d.url || '',
        })),
      conversationMemories: clientDocuments
        .filter((d: any) => ['whatsapp_message', 'whatsapp_insight', 'whatsapp_digest', 'meeting', 'meeting_chat'].includes(d.source_type))
        .slice(0, 12)
        .map((d: any) => ({
          kind: d.source_type || 'memory',
          title: d.title || '',
          excerpt: (d.content_excerpt || d.content_text || '').slice(0, 220),
          published_at: d.published_at || d.created_at || '',
        })),
      totalDocuments: clientDocuments.length,
      latestInsight: latestInsight?.summary || null,
    },
    learned_preferences: (() => {
      // Human-confirmed WhatsApp/meeting directives — always included, highest priority
      const humanBoost = clientDirectives.filter((d: any) => d.directive_type === 'boost').map((d: any) => d.directive);
      const humanAvoid = clientDirectives.filter((d: any) => d.directive_type === 'avoid').map((d: any) => d.directive);
      if (!learnedPrefs && (humanBoost.length || humanAvoid.length)) {
        return {
          top_angles: [], preferred_formats: [], anti_patterns: [],
          boost_directives: humanBoost,
          avoid_directives: humanAvoid,
          reportei_top_formats: [],
        };
      }
      if (!learnedPrefs) return null;
      return {
        top_angles: learnedPrefs.copy_feedback.top_angles.slice(0, 5).map((a) => ({ angle: a.angle, avg_score: a.avg_score })),
        preferred_formats: learnedPrefs.copy_feedback.preferred_formats.slice(0, 5).map((f) => ({ format: f.format, avg_score: f.avg_score })),
        anti_patterns: learnedPrefs.copy_feedback.anti_patterns.slice(0, 3).map((p) => ({ pattern: p.pattern, avg_score: p.avg_score })),
        // Human-confirmed directives prepended — they override learned patterns
        boost_directives: [...humanBoost, ...learnedPrefs.directives.boost],
        avoid_directives: [...humanAvoid, ...learnedPrefs.directives.avoid],
        reportei_top_formats: learnedPrefs.reportei_performance.top_formats.slice(0, 5),
      };
    })(),
    predictive: predictiveTimes.length > 0 ? {
      best_times: predictiveTimes.slice(0, 5).map((t: any) => ({
        platform: t.platform,
        day_of_week: Number(t.day_of_week),
        hour: Number(t.hour),
        engagement: Number(t.avg_engagement),
      })),
      content_mix: [],
    } : null,
    web_trends: webTrends,
    group_intelligence: groupInsights.length > 0 ? buildGroupIntelligence(groupInsights) : null,
    meeting_intelligence: (meetingSummaries.length > 0 || meetingActions.length > 0)
      ? buildMeetingIntelligence(meetingSummaries, meetingActions)
      : null,
    jarvis_kb: jarvisKb,
  };

  // Token validation: estimate tokens and truncate if needed
  const estimatedTokens = estimateContextTokens(context);
  if (estimatedTokens > maxTokens) {
    return truncateContext(context, maxTokens);
  }

  return context;
}

/**
 * Formats intelligence context into a readable prompt for AI
 */
export function formatIntelligencePrompt(context: IntelligenceContext): string {
  const sections: string[] = [];

  // Client profile
  sections.push(`# PERFIL DO CLIENTE`);
  sections.push(`Nome: ${context.client.name}`);
  sections.push(`Segmento: ${context.client.segment}`);
  if (context.client.keywords.length) {
    sections.push(`Keywords: ${context.client.keywords.join(', ')}`);
  }
  if (context.client.pillars.length) {
    sections.push(`Pilares: ${context.client.pillars.join(', ')}`);
  }
  if (context.client.negative_keywords.length) {
    sections.push(`Evitar: ${context.client.negative_keywords.join(', ')}`);
  }

  // Library
  if (context.library.totalItems > 0) {
    sections.push(`\n# BASE DE CONHECIMENTO (${context.library.totalItems} fontes)`);
    sections.push(context.library.packedText);
  }

  // Clipping
  if (context.clipping.recent.length > 0) {
    sections.push(`\n# CLIPPING RECENTE (${context.clipping.totalMatches} matches)`);
    sections.push(`Top Keywords: ${context.clipping.topKeywords.join(', ')}`);
    context.clipping.recent.forEach((item: any, idx: number) => {
      sections.push(`${idx + 1}. [${item.score}] ${item.title}`);
      if (item.excerpt) sections.push(`   ${item.excerpt.slice(0, 200)}...`);
    });
  }

  // Social trends
  if (context.social.trends.length > 0) {
    sections.push(`\n# TENDÊNCIAS SOCIAIS (${context.social.totalMentions} menções, sentimento: ${context.social.sentimentAvg})`);
    context.social.trends.forEach((trend: any, idx: number) => {
      sections.push(`${idx + 1}. ${trend.keyword} (${trend.platform}): ${trend.mention_count} menções`);
    });
  }

  // Calendar
  if (context.calendar.next14Days.length > 0) {
    sections.push(`\n# CALENDÁRIO (próximos 14 dias)`);
    context.calendar.next14Days.forEach((event: any, idx: number) => {
      sections.push(`${idx + 1}. ${event.date}: ${event.name} [relevância: ${event.base_relevance}]`);
    });
  }

  // Opportunities
  if (context.opportunities.urgent.length > 0) {
    sections.push(`\n# OPORTUNIDADES URGENTES`);
    context.opportunities.urgent.forEach((opp: any, idx: number) => {
      sections.push(`${idx + 1}. ${opp.title} [confiança: ${opp.confidence}%]`);
      sections.push(`   ${opp.description}`);
      if (opp.suggested_action) sections.push(`   Ação: ${opp.suggested_action}`);
    });
  }

  // Client content (posts + website)
  if (context.clientContent.recentPosts.length > 0) {
    sections.push(`\n# CONTEUDO RECENTE DO CLIENTE (posts em redes sociais)`);
    context.clientContent.recentPosts.forEach((post, idx) => {
      const date = post.published_at ? new Date(post.published_at).toLocaleDateString('pt-BR') : '';
      sections.push(`${idx + 1}. [${post.platform}] ${date}: ${post.excerpt}`);
    });
  }
  if (context.clientContent.websitePages.length > 0) {
    sections.push(`\n# PAGINAS DO SITE DO CLIENTE`);
    context.clientContent.websitePages.forEach((page, idx) => {
      sections.push(`${idx + 1}. ${page.title} — ${page.excerpt}`);
    });
  }
  if (context.clientContent.conversationMemories.length > 0) {
    sections.push(`\n# MEMORIA DE CONVERSAS DO CLIENTE`);
    context.clientContent.conversationMemories.forEach((memory, idx) => {
      const date = memory.published_at ? new Date(memory.published_at).toLocaleDateString('pt-BR') : '';
      const label = memory.kind ? `[${memory.kind}] ` : '';
      sections.push(`${idx + 1}. ${label}${date} ${memory.title}`.trim());
      if (memory.excerpt) sections.push(`   ${memory.excerpt}`);
    });
  }
  if (context.clientContent.latestInsight) {
    const insight = context.clientContent.latestInsight;
    sections.push(`\n# RESUMO DE INTELIGENCIA DO CLIENTE`);
    if (insight.summary_text) sections.push(insight.summary_text);
    if (insight.positioning) sections.push(`Posicionamento: ${insight.positioning}`);
    if (insight.tone) sections.push(`Tom de voz: ${insight.tone}`);
    if (insight.industry) sections.push(`Industria: ${insight.industry}`);
  }

  // Learned Preferences (learning loop)
  if (context.learned_preferences) {
    const lp = context.learned_preferences;
    sections.push(`\n# PREFERENCIAS APRENDIDAS`);
    if (lp.boost_directives.length) {
      sections.push(`## PRIORIZAR:`);
      lp.boost_directives.forEach((d, i) => sections.push(`${i + 1}. ${d}`));
    }
    if (lp.avoid_directives.length) {
      sections.push(`## EVITAR:`);
      lp.avoid_directives.forEach((d, i) => sections.push(`${i + 1}. ${d}`));
    }
    if (lp.preferred_formats.length) {
      sections.push(`Formatos preferidos: ${lp.preferred_formats.map((f) => `${f.format} (${f.avg_score})`).join(', ')}`);
    }
    if (lp.top_angles.length) {
      sections.push(`Angulos top: ${lp.top_angles.map((a) => `${a.angle} (${a.avg_score})`).join(', ')}`);
    }
  }

  // Predictive Intelligence
  if (context.predictive?.best_times.length) {
    sections.push(`\n# INTELIGENCIA PREDITIVA`);
    sections.push(`## Melhores Horarios:`);
    context.predictive.best_times.forEach((t) => {
      sections.push(`- ${t.platform}: ${formatTimeSlot(t as any)} (engagement: ${t.engagement.toFixed(0)})`);
    });
  }

  // Jarvis KB — padrões aprendidos (cliente + agência)
  if (context.jarvis_kb) {
    sections.push(`\n# PADRÕES APRENDIDOS (JARVIS KB)`);
    sections.push(context.jarvis_kb.summary);
  }

  // Tavily — Real-time Trends
  if (context.web_trends) {
    sections.push(`\n# TENDENCIAS EM TEMPO REAL (via Tavily)`);
    sections.push(context.web_trends.content);
    if (context.web_trends.citations.length) {
      sections.push(`Fontes: ${context.web_trends.citations.slice(0, 5).join(', ')}`);
    }
  }

  // WhatsApp Group Intelligence
  if (context.group_intelligence) {
    const gi = context.group_intelligence;
    sections.push(`\n# INTELIGENCIA DE GRUPO WHATSAPP`);
    sections.push(`Sentimento geral: ${gi.client_sentiment_trend} | ${gi.unactioned_count} itens pendentes de ação`);
    if (gi.top_topics.length) {
      sections.push(`Tópicos recorrentes: ${gi.top_topics.join(', ')}`);
    }
    if (gi.recent_insights.length) {
      sections.push(`## Insights Recentes:`);
      gi.recent_insights.forEach((insight) => {
        const urgencyTag = insight.urgency === 'urgent' ? ' [URGENTE]' : '';
        sections.push(`- [${insight.type}] ${insight.summary} (${insight.sentiment})${urgencyTag}`);
      });
    }
    if (gi.latest_digest) {
      sections.push(`## Resumo Semanal:\n${gi.latest_digest}`);
    }
  }

  // Meeting Intelligence
  if (context.meeting_intelligence) {
    const mi = context.meeting_intelligence;
    sections.push(`\n# INTELIGÊNCIA DE REUNIÕES (${mi.total_meetings} reuniões recentes)`);
    if (mi.recent_meetings.length) {
      sections.push(`## Reuniões Recentes:`);
      mi.recent_meetings.forEach((m) => {
        const date = m.recorded_at ? new Date(m.recorded_at).toLocaleDateString('pt-BR') : '';
        const qualifiers = [m.meeting_kind, m.attention_level].filter(Boolean).join(' | ');
        sections.push(`- ${date} [${m.platform}] "${m.title}" (${m.action_count} ações${qualifiers ? ` | ${qualifiers}` : ''})`);
        if (m.summary) sections.push(`  Resumo: ${m.summary}`);
        if (m.account_pulse) sections.push(`  Pulso: ${m.account_pulse}`);
        if (m.production_directives?.length) sections.push(`  Regras de produção: ${m.production_directives.join(' | ')}`);
      });
    }
    if (mi.pending_actions.length) {
      sections.push(`## Ações Pendentes de Reuniões (${mi.total_pending_actions}):`);
      mi.pending_actions.forEach((a) => {
        const deadlineStr = a.deadline ? ` — prazo: ${new Date(a.deadline).toLocaleDateString('pt-BR')}` : '';
        const responsibleStr = a.responsible ? ` (resp: ${a.responsible})` : '';
        sections.push(`- [${a.type}] ${a.title}${responsibleStr}${deadlineStr} [${a.priority}]`);
        if (a.description) sections.push(`  ${a.description}`);
        if (a.excerpt) sections.push(`  Trecho: "${a.excerpt}"`);
      });
    }
  }

  // Performance insights
  if (Object.keys(context.performance.platforms).length > 0) {
    sections.push(`\n# PERFORMANCE (últimos 60 dias)`);
    Object.values(context.performance.platforms).forEach((platform: any) => {
      sections.push(`- ${platform.platform}: ${platform.data.length} insights registrados`);
    });
    if (context.performance.topFormats.length > 0) {
      sections.push(`Top Formatos: ${context.performance.topFormats.map((f: any) => f.format).join(', ')}`);
    }
  }

  return sections.join('\n');
}

// Helper functions
function extractTopKeywords(clipping: any[]): string[] {
  const keywordCount: Record<string, number> = {};
  clipping.forEach((item) => {
    (item.matched_keywords || []).forEach((kw: string) => {
      keywordCount[kw] = (keywordCount[kw] || 0) + 1;
    });
  });
  return Object.entries(keywordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([kw]) => kw);
}

function calculateAvgSentiment(social: any[]): number {
  if (!social.length) return 50;
  const sum = social.reduce((acc, t) => acc + (t.average_sentiment || 50), 0);
  return Math.round(sum / social.length);
}

function groupPerformanceByPlatform(performance: any[]): Record<string, any> {
  const grouped: Record<string, any> = {};
  performance.forEach((p) => {
    if (!grouped[p.platform]) {
      grouped[p.platform] = {
        platform: p.platform,
        data: [],
        summary: {},
      };
    }
    grouped[p.platform].data.push(p);
  });
  return grouped;
}

function extractTopFormats(performance: any[]): any[] {
  const formats: Record<string, number> = {};
  performance.forEach((p) => {
    const byFormat = p.payload?.by_format || {};
    Object.entries(byFormat).forEach(([format, data]: [string, any]) => {
      if (!formats[format]) formats[format] = 0;
      formats[format] += data.engagement || data.impressions || 0;
    });
  });
  return Object.entries(formats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([format, score]) => ({ format, score }));
}

function extractBestTimes(performance: any[]): any[] {
  // Placeholder: extract from payload if available
  return [];
}

function hashCopy(text: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

function extractAnglesFromCopies(copies: any[]): string[] {
  return copies
    .map((c) => c.output.slice(0, 50).trim())
    .filter((angle, idx, arr) => arr.indexOf(angle) === idx)
    .slice(0, 20);
}

function buildGroupIntelligence(insights: any[]): IntelligenceContext['group_intelligence'] {
  const recent = insights.slice(0, 15).map((i: any) => ({
    type: i.insight_type,
    summary: i.summary,
    sentiment: i.sentiment || 'neutral',
    urgency: i.urgency || 'normal',
    date: i.created_at ? new Date(i.created_at).toISOString() : '',
  }));

  const unactioned = insights.filter((i: any) => !i.actioned).length;

  // Extract top topics from all insights
  const topicCount: Record<string, number> = {};
  for (const i of insights) {
    const entities = typeof i.entities === 'string' ? JSON.parse(i.entities) : i.entities;
    const topics: string[] = entities?.topics || [];
    for (const t of topics) {
      topicCount[t] = (topicCount[t] || 0) + 1;
    }
  }
  const topTopics = Object.entries(topicCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([topic]) => topic);

  // Sentiment trend: compare first half vs second half
  const mid = Math.floor(insights.length / 2);
  const sentimentScore = (s: string) => s === 'positive' ? 1 : s === 'negative' ? -1 : 0;
  const recentAvg = insights.slice(0, mid).reduce((sum: number, i: any) => sum + sentimentScore(i.sentiment), 0) / (mid || 1);
  const olderAvg = insights.slice(mid).reduce((sum: number, i: any) => sum + sentimentScore(i.sentiment), 0) / ((insights.length - mid) || 1);
  const trend = recentAvg > olderAvg + 0.2 ? 'improving' : recentAvg < olderAvg - 0.2 ? 'declining' : 'stable';

  return {
    recent_insights: recent,
    unactioned_count: unactioned,
    latest_digest: null, // populated by Phase 2 digest worker
    top_topics: topTopics,
    client_sentiment_trend: trend,
  };
}

function buildMeetingIntelligence(
  meetings: any[],
  actions: any[],
): IntelligenceContext['meeting_intelligence'] {
  const pendingActions = actions.filter((a: any) => a.status === 'pending');
  return {
    recent_meetings: meetings.slice(0, 8).map((m: any) => ({
      title: m.title,
      summary: (m.summary || '').slice(0, 500),
      platform: m.platform || 'upload',
      recorded_at: m.recorded_at ? new Date(m.recorded_at).toISOString() : '',
      action_count: Number(m.action_count) || 0,
      attention_level: m.attention_level || undefined,
      meeting_kind: m.meeting_kind || undefined,
      account_pulse: m.account_pulse || undefined,
      production_directives: Array.isArray(m.production_directives) ? m.production_directives : [],
    })),
    pending_actions: pendingActions.slice(0, 10).map((a: any) => ({
      type: a.type,
      title: a.title,
      description: (a.description || '').slice(0, 300),
      responsible: a.responsible || '',
      deadline: a.deadline || null,
      priority: a.priority || 'medium',
      excerpt: (a.raw_excerpt || '').slice(0, 200),
    })),
    total_meetings: meetings.length,
    total_pending_actions: pendingActions.length,
  };
}

function estimateContextTokens(context: IntelligenceContext): number {
  // Rough estimate: 1 token ≈ 4 characters
  const serialized = JSON.stringify(context);
  return Math.ceil(serialized.length / 4);
}

function truncateContext(context: IntelligenceContext, maxTokens: number): IntelligenceContext {
  const truncated = { ...context };

  // Truncate library packed text if too large (max 40% of budget — more room with 60K default)
  const libraryTokens = Math.ceil(context.library.packedText.length / 4);
  if (libraryTokens > maxTokens * 0.4) {
    truncated.library = {
      ...context.library,
      packedText: context.library.packedText.slice(0, Math.floor(maxTokens * 0.4 * 4)),
      sources: context.library.sources.slice(0, 20),
    };
  }

  // Truncate clipping to top 20 (was 5)
  truncated.clipping = {
    ...context.clipping,
    recent: context.clipping.recent.slice(0, 20),
  };

  // Truncate social to top 20 (was 5)
  truncated.social = {
    ...context.social,
    trends: context.social.trends.slice(0, 20),
  };

  // Truncate client content to top items (expanded limits)
  truncated.clientContent = {
    ...context.clientContent,
    recentPosts: context.clientContent.recentPosts.slice(0, 20),
    websitePages: context.clientContent.websitePages.slice(0, 10),
    conversationMemories: context.clientContent.conversationMemories.slice(0, 20),
  };

  // Keep opportunities and briefings intact (high priority)
  return truncated;
}
