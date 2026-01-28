import {
  CalendarEvent,
  ClientProfile,
  Platform,
  Objective,
  YearMonth,
  CalendarPost,
} from '../types';
import { expandEventsForMonth, matchesLocality, scoreEvent, DEFAULT_SCORING } from '../engine';
import { getPlatformProfile } from '../platformProfiles';
import {
  Locality,
  TimeWindow,
  TrendAggregate,
  PerformanceBreakdown,
  ClientKnowledge,
} from '../providers/contracts';
import {
  localEventsProvider,
  trendAggregator,
  performanceProvider,
  knowledgeBaseProvider,
  liveBoostEngine,
} from '../providers';
import { copyGenerator, copyValidator } from '../providers/ai';
import { buildContextPack } from '../library/contextPack';

// -------------------- Helpers --------------------
function estimatePostCount(postsPerWeek: number) {
  return Math.max(4, Math.min(31, Math.round(postsPerWeek * 4.3)));
}
function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toISODate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}` as any;
}
function parseYear(ym: YearMonth) {
  return Number(ym.split('-')[0]);
}
function parseMonth(ym: YearMonth) {
  return Number(ym.split('-')[1]);
}
function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function listDatesInMonth(ym: YearMonth) {
  const y = parseYear(ym);
  const m = parseMonth(ym);
  const dim = daysInMonth(y, m);
  return Array.from({ length: dim }, (_, i) => toISODate(y, m, i + 1));
}
function spreadDates(ym: YearMonth, count: number) {
  const all = listDatesInMonth(ym);
  const step = Math.max(1, Math.floor(all.length / count));
  const picked: string[] = [];
  for (let i = 0; i < all.length && picked.length < count; i += step) {
    picked.push(all[i]);
  }
  while (picked.length < count) {
    picked.push(all[Math.min(all.length - 1, picked.length)]);
  }
  return Array.from(new Set(picked)).slice(0, count);
}

function chooseFormatMix(platform: Platform, client: ClientProfile): string[] {
  const profile = getPlatformProfile(platform);
  const pref = client.platform_preferences?.[platform];
  const preferred = pref?.preferredFormats?.filter((f) => profile.supportedFormats.includes(f)) ?? [];
  const blocked = new Set(pref?.blockedFormats ?? []);

  const formats = profile.supportedFormats.filter((f) => !blocked.has(f));
  const weights = profile.defaultMix;

  const weighted: string[] = [];
  for (const f of formats) {
    const w = Math.max(1, Math.round((weights[f] ?? 10) / 5));
    for (let i = 0; i < w; i += 1) weighted.push(f);
  }
  if (preferred.length) {
    for (const pf of preferred) {
      for (let i = 0; i < 10; i += 1) weighted.push(pf);
    }
  }

  return weighted.length ? weighted : formats.length ? formats : ['Post'];
}
function pickFormat(weightedFormats: string[], idx: number) {
  return weightedFormats[idx % weightedFormats.length];
}

function pickTheme(ev: CalendarEvent | null, platform: Platform): string {
  if (!ev) return 'Editorial (sem evento) - conteudo de valor';
  const core = ev.categories.includes('comercial')
    ? 'Oferta/Condicao'
    : ev.categories.includes('sazonalidade')
      ? 'Dica de temporada'
      : ev.categories.includes('causa_social')
        ? 'Mensagem institucional'
        : 'Conteudo leve';
  const twist =
    platform === 'LinkedIn' ? 'com insight' : platform === 'TikTok' ? 'no ritmo da trend' : 'com gancho forte';
  return `${core} ${twist} - ${ev.name}`;
}

// Fallback de copy para nao travar o flow.
function makeCopy(theme: string) {
  return { headline: theme, body: `Texto base: ${theme}`, cta: 'Saiba mais' };
}

// -------------------- Flow Orchestrator --------------------
export type MonthlyFlowRequest = {
  month: YearMonth;
  platform: Platform;
  objective: Objective;
  postsPerWeek: number;

  client: ClientProfile;

  toggles?: {
    use_calendar_total?: boolean;
    use_local_events?: boolean;
    use_trends?: boolean;
    use_performance?: boolean;
    use_client_knowledge?: boolean;
  };

  trend?: {
    window?: TimeWindow;
    sources?: string[];
    topics?: string[];
  };

  performance?: {
    window?: TimeWindow;
  };
};

export type MonthlyFlowResponse = {
  month: YearMonth;
  platform: Platform;
  objective: Objective;

  locality: Locality;
  toggles: Required<NonNullable<MonthlyFlowRequest['toggles']>>;

  used: {
    base_events: number;
    local_events: number;
    total_candidate_events: number;
    trend_signals: number;
  };

  top_events: Array<{
    id: string;
    name: string;
    score: number;
    tier: 'A' | 'B' | 'C';
    why: string;
    boosts: Array<{ kind: string; boost: number; reason: string }>;
  }>;

  posts: CalendarPost[];

  debug?: {
    trendAggregate?: TrendAggregate | null;
    performance?: PerformanceBreakdown | null;
    clientKnowledge?: ClientKnowledge | null;
  };
};

export async function runMonthlyFlow(
  seedEvents: CalendarEvent[],
  req: MonthlyFlowRequest
): Promise<MonthlyFlowResponse> {
  const toggles = {
    use_calendar_total: req.toggles?.use_calendar_total ?? true,
    use_local_events: req.toggles?.use_local_events ?? true,
    use_trends: req.toggles?.use_trends ?? false,
    use_performance: req.toggles?.use_performance ?? false,
    use_client_knowledge: req.toggles?.use_client_knowledge ?? true,
  };

  const year = parseYear(req.month);

  const locality: Locality = {
    country: req.client.country,
    uf: req.client.uf,
    city: req.client.city,
  };

  // (A) Base events
  const baseEvents = toggles.use_calendar_total ? seedEvents : [];

  // (B) Local events
  const localEvents = toggles.use_local_events
    ? await localEventsProvider.getLocalEvents({ year, locality, tenant_id: req.client.tenant_id ?? null })
    : [];

  // (C) Merge + expand for month
  const merged = [...baseEvents, ...localEvents];

  const expanded = expandEventsForMonth(merged, req.month)
    .map((item) => item.event)
    .filter((ev) => matchesLocality(ev, req.client));

  // (D) Knowledge (repertorio por cliente)
  const clientKnowledge = toggles.use_client_knowledge
    ? await knowledgeBaseProvider.getClientKnowledge({
        client_id: req.client.id,
        tenant_id: req.client.tenant_id ?? null,
      })
    : null;

  // (E) Trends (liga/desliga fontes)
  let trendAggregate: TrendAggregate | null = null;
  if (toggles.use_trends && req.client.trend_profile.enable_trends) {
    const window = req.trend?.window ?? '30d';
    const sources = req.trend?.sources ?? req.client.trend_profile.sources ?? [];
    const topics = (req.trend?.topics?.length ? req.trend.topics : []).concat(
      expanded.flatMap((event) => event.tags).slice(0, 40)
    );

    const uniqueTopics = Array.from(new Set(topics.map((topic) => topic.toLowerCase()))).slice(0, 30);

    trendAggregate = await trendAggregator.aggregate({
      topics: uniqueTopics,
      locality,
      window,
      sources,
    });
  }

  // (F) Performance (Reportei/stub)
  let performance: PerformanceBreakdown | null = null;
  if (toggles.use_performance) {
    performance = await performanceProvider.getPerformance({
      client: req.client,
      platform: req.platform,
      window: req.performance?.window ?? '30d',
    });
  }

  // (G) Score + live boosts
  const saturationState = { tagCounts: {} as Record<string, number> };

  const scored = [];
  for (const ev of expanded) {
    const base = scoreEvent(ev, req.client, req.platform, DEFAULT_SCORING, saturationState);

    const boosts = await liveBoostEngine.computeBoosts({
      client: req.client,
      platform: req.platform,
      event: ev,
      trendAggregate,
      performance,
    });

    const boostSum = boosts.reduce((acc, b) => acc + b.boost, 0);

    const finalScore = Math.max(0, Math.min(100, base.score + boostSum));
    const tier =
      finalScore >= DEFAULT_SCORING.tier_a_min
        ? 'A'
        : finalScore >= DEFAULT_SCORING.tier_b_min
          ? 'B'
          : 'C';

    scored.push({
      ev,
      score: finalScore,
      tier,
      why: `${base.why}${boostSum ? ` | live:+${boostSum}` : ''}`,
      boosts: boosts.map((b) => ({ kind: b.kind, boost: b.boost, reason: b.reason })),
    });

    for (const t of ev.tags) {
      saturationState.tagCounts[t] = (saturationState.tagCounts[t] ?? 0) + 1;
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // (H) Gera o calendario mensal (posts)
  const postCount = estimatePostCount(req.postsPerWeek);
  const dates = spreadDates(req.month, postCount);
  const weightedFormats = chooseFormatMix(req.platform, req.client);
  const profile = getPlatformProfile(req.platform);

  const posts: CalendarPost[] = [];

  for (let i = 0; i < dates.length; i += 1) {
    const chosen = scored[i % Math.max(1, scored.length)];
    const ev = chosen?.ev ?? null;
    const boostedFormats =
      chosen?.boosts
        ?.flatMap((boost) => boost.formats_affected ?? [])
        .filter((fmt) => profile.supportedFormats.includes(fmt)) ?? [];
    const format = boostedFormats.length ? boostedFormats[i % boostedFormats.length] : pickFormat(weightedFormats, i);

    const theme = pickTheme(ev, req.platform);
    let librarySources: Array<{ library_item_id: string; chunk_ids: string[]; score?: number | null }> = [];
    let libraryContext = '';

    if (req.client.tenant_id) {
      const query = [
        theme,
        req.objective,
        req.platform,
        format,
        req.client.name,
        ev?.name,
      ]
        .filter(Boolean)
        .join(' | ');

      try {
        const pack = await buildContextPack({
          tenant_id: req.client.tenant_id,
          client_id: req.client.id,
          query,
          k: 12,
        });
        libraryContext = pack.packedText || '';
        librarySources = pack.sources.map((source: any) => ({
          library_item_id: source.library_item_id,
          chunk_ids: source.chunks.map((chunk: any) => chunk.id),
          score: Math.max(...source.chunks.map((chunk: any) => chunk.score ?? 0)),
        }));
      } catch {
        libraryContext = '';
        librarySources = [];
      }
    }

    let bestCopy = makeCopy(theme);
    let alternatives: Array<{
      format: string;
      copy: { headline: string; body: string; cta: string };
      score: number;
      why: string;
    }> = [];
    let copyScore = chosen?.score ?? 60;

    try {
      const gen = await copyGenerator.generateCopies({
        client: req.client,
        knowledge: clientKnowledge,
        platform: req.platform,
        format,
        objective: req.objective,
        theme,
        max_variations: 8,
        context_pack: libraryContext,
      });

      const val = await copyValidator.validate({
        client: req.client,
        knowledge: clientKnowledge,
        platform: req.platform,
        format,
        candidates: gen.candidates,
      });

      if (val?.best) {
        bestCopy = {
          headline: val.best.headline ?? theme,
          body: val.best.body ?? '',
          cta: val.best.cta ?? '',
        };
      }

      if (typeof val?.score === 'number') {
        copyScore = val.score;
      }

      alternatives = (val?.normalized_payload?.alternatives ?? [])
        .slice(0, 3)
        .map((candidate: any) => ({
          format: candidate.format ?? format,
          copy: {
            headline: candidate.headline ?? theme,
            body: candidate.body ?? '',
            cta: candidate.cta ?? '',
          },
          score: copyScore,
          why: 'Alternativa validada pelo validador.',
        }));
    } catch {
      bestCopy = makeCopy(theme);
    }

    if (!alternatives.length) {
      const altFormats = profile.supportedFormats.filter((f) => f !== format).slice(0, 2);
      alternatives = altFormats.map((altFormat) => ({
        format: altFormat,
        copy: makeCopy(`${theme} (variacao ${altFormat})`),
        score: copyScore,
        why: `Variacao de formato dentro de ${req.platform}.`,
      }));
    }

    posts.push({
      id: `post_${req.month}_${req.platform}_${i}`,
      date: dates[i] as any,
      platform: req.platform,
      format,
      objective: req.objective,
      theme,
      event_ids: ev ? [ev.id] : [],
      score: copyScore,
      tier: (chosen?.tier ?? 'B') as any,
      why_this_exists: chosen?.why ?? 'Sem eventos relevantes; editorial padrao.',
      copy: bestCopy,
      alternatives,
      library_sources: librarySources.length ? librarySources : undefined,
    });
  }

  return {
    month: req.month,
    platform: req.platform,
    objective: req.objective,
    locality,
    toggles,
    used: {
      base_events: baseEvents.length,
      local_events: localEvents.length,
      total_candidate_events: expanded.length,
      trend_signals: trendAggregate?.signals?.length ?? 0,
    },
    top_events: scored.slice(0, 10).map((item) => ({
      id: item.ev.id,
      name: item.ev.name,
      score: item.score,
      tier: item.tier as any,
      why: item.why,
      boosts: item.boosts,
    })),
    posts,
    debug: {
      trendAggregate,
      performance,
      clientKnowledge,
    },
  };
}
