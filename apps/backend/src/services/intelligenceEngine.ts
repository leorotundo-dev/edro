import { query } from '../db';
import { buildContextPack } from '../library/contextPack';

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
  const maxTokens = params.maxTokens || 8000;

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
  ] = await Promise.allSettled([
    // Client profile
    query(`
      SELECT name, segment_primary, profile
      FROM clients
      WHERE id = $1 AND tenant_id = $2
    `, [params.client_id, params.tenant_id]),

    // Library (semantic search)
    buildContextPack({
      tenant_id: params.tenant_id,
      client_id: params.client_id,
      query: params.query || 'contexto geral do cliente',
      k: 10,
    }),

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

function estimateContextTokens(context: IntelligenceContext): number {
  // Rough estimate: 1 token ≈ 4 characters
  const serialized = JSON.stringify(context);
  return Math.ceil(serialized.length / 4);
}

function truncateContext(context: IntelligenceContext, maxTokens: number): IntelligenceContext {
  const truncated = { ...context };

  // Truncate library packed text if too large (max 30% of budget)
  const libraryTokens = Math.ceil(context.library.packedText.length / 4);
  if (libraryTokens > maxTokens * 0.3) {
    truncated.library = {
      ...context.library,
      packedText: context.library.packedText.slice(0, Math.floor(maxTokens * 0.3 * 4)),
      sources: context.library.sources.slice(0, 5),
    };
  }

  // Truncate clipping to top 5
  truncated.clipping = {
    ...context.clipping,
    recent: context.clipping.recent.slice(0, 5),
  };

  // Truncate social to top 5
  truncated.social = {
    ...context.social,
    trends: context.social.trends.slice(0, 5),
  };

  // Keep opportunities and briefings intact (high priority)
  return truncated;
}
