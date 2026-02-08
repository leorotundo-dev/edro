'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Chart from '@/components/charts/Chart';
import {
  IconAntenna,
  IconBook2,
  IconBolt,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandX,
  IconBrandYoutube,
  IconBriefcase,
  IconBulb,
  IconCalendar,
  IconChartBar,
  IconChartPie,
  IconDotsVertical,
  IconExternalLink,
  IconFileText,
  IconHash,
  IconHeartbeat,
  IconMoodHappy,
  IconNews,
  IconRefresh,
  IconRocket,
  IconSettings2,
  IconSparkles,
  IconTarget,
  IconTrendingUp,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';

type KnowledgeBase = {
  description?: string;
  website?: string;
  audience?: string;
  brand_promise?: string;
  differentiators?: string;
  must_mentions?: string[];
  approved_terms?: string[];
  forbidden_claims?: string[];
  hashtags?: string[];
  notes?: string;
  social_profiles?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
    x?: string;
    other?: string;
  };
};

type ClientData = {
  id: string;
  name: string;
  segment_primary?: string | null;
  segment_secondary?: string[] | null;
  tone_profile?: string | null;
  risk_tolerance?: string | null;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  keywords?: string[] | null;
  content_pillars?: string[] | null;
  profile?: {
    knowledge_base?: KnowledgeBase;
  } | null;
};

type ConnectorRow = {
  provider: string;
  payload?: Record<string, any> | null;
  secrets_meta?: Record<string, any> | null;
  updated_at?: string | null;
};

type CalendarUpcomingItem = {
  id: string;
  name: string;
  date: string;
  score?: number;
  tier?: string;
};

type ClippingStats = {
  total_items?: number;
  new_items?: number;
  triaged_items?: number;
  items_last_7_days?: number;
  avg_score?: number | null;
};

type ClippingItem = {
  id: string;
  title: string;
  snippet?: string | null;
  url?: string | null;
  score?: number | null;
  client_score?: number | null;
  status?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  published_at?: string | null;
};

type ClippingMatch = {
  id?: string;
  clipping_item_id?: string;
  title?: string;
  score?: number;
  url?: string | null;
  snippet?: string | null;
};

type ClippingSource = {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  status?: string | null;
  last_error?: string | null;
  updated_at?: string | null;
  last_fetched_at?: string | null;
};

type SocialStatsResponse = {
  summary?: {
    total?: number;
    positive?: number;
    negative?: number;
    neutral?: number;
    avg_score?: number;
  };
  platforms?: { platform: string; total: number }[];
  top_keywords?: { keyword: string; total: number }[];
};

type SocialTrendRow = {
  keyword: string;
  platform: string;
  mention_count: number;
  total_engagement: number;
  average_sentiment: number;
  created_at?: string;
};

type SocialMentionRow = {
  id: string;
  platform: string;
  keyword: string;
  content: string;
  author?: string | null;
  url?: string | null;
  sentiment?: string | null;
  published_at?: string | null;
};

type SocialKeywordRow = {
  id: string;
  keyword: string;
  category?: string | null;
  client_id?: string | null;
  is_active: boolean;
};

type AIOpportunity = {
  id: string;
  title: string;
  description?: string;
  source?: string;
  confidence?: number;
  suggested_action?: string;
  priority?: string;
  status?: string;
  created_at?: string;
};

type ReporteiPayload = {
  editorial_insights?: string[];
};

type ReporteiInsight = {
  platform?: string;
  time_window?: string;
  created_at?: string;
  payload?: ReporteiPayload;
};

type ReporteiResponse = {
  items?: ReporteiInsight[];
  updated_at?: string | null;
};

type PlanningContextStats = {
  library?: { totalItems?: number };
  opportunities?: { active?: number; urgent?: number; highConfidence?: number };
  briefings?: { recent?: number; pending?: number };
  copies?: { recentHashes?: number; usedAngles?: number };
  clipping?: { totalMatches?: number; topKeywords?: string[] };
  social?: { totalMentions?: number; sentimentAvg?: number };
  calendar?: { next14Days?: number; highRelevance?: number };
};

type PlanningHealthStatus = 'healthy' | 'warning' | 'error';

type PlanningHealthSource = {
  status: PlanningHealthStatus;
  message: string;
  lastCheck?: string;
  data?: any;
};

type PlanningHealth = {
  overall: PlanningHealthStatus;
  sources: Record<string, PlanningHealthSource>;
};

type LibraryItem = {
  id: string;
  type?: string | null;
  title: string;
  category?: string | null;
  status?: string | null;
  use_in_ai?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BriefingRow = {
  id: string;
  title: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CopyRow = {
  id: string;
  briefing_id?: string | null;
  output?: string | null;
  model?: string | null;
  language?: string | null;
  created_at?: string | null;
};

type OverviewClientProps = {
  clientId: string;
};

const SOCIAL_ICONS: Record<string, { icon: typeof IconBrandInstagram; color: string; label: string }> = {
  instagram: { icon: IconBrandInstagram, color: '#E4405F', label: 'Instagram' },
  facebook: { icon: IconBrandFacebook, color: '#1877F2', label: 'Facebook' },
  linkedin: { icon: IconBrandLinkedin, color: '#0A66C2', label: 'LinkedIn' },
  tiktok: { icon: IconBrandTiktok, color: '#000000', label: 'TikTok' },
  youtube: { icon: IconBrandYoutube, color: '#FF0000', label: 'YouTube' },
  x: { icon: IconBrandX, color: '#000000', label: 'X (Twitter)' },
};

// ── Visual constants ─────────────────────────────────────────────
const SECTION_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  clipping:     { bg: '#eff6ff', fg: '#2563eb', border: '#2563eb' },
  social:       { bg: '#f5f3ff', fg: '#7c3aed', border: '#7c3aed' },
  radar:        { bg: '#fff7ed', fg: '#ea580c', border: '#ea580c' },
  calendar:     { bg: '#ecfdf5', fg: '#059669', border: '#059669' },
  opportunities:{ bg: '#fffbeb', fg: '#d97706', border: '#d97706' },
  performance:  { bg: '#f0fdfa', fg: '#0d9488', border: '#0d9488' },
  library:      { bg: '#eef2ff', fg: '#4f46e5', border: '#4f46e5' },
  creative:     { bg: '#fdf2f8', fg: '#db2777', border: '#db2777' },
  insights:     { bg: '#fff1e6', fg: '#ff6600', border: '#ff6600' },
  planning:     { bg: '#f8fafc', fg: '#475569', border: '#475569' },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#dc2626',
  high: '#f59e0b',
  medium: '#2563eb',
  low: '#94a3b8',
};

function ensureUrl(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('@')) {
    return `https://instagram.com/${value.replace('@', '')}`;
  }
  return `https://${value}`;
}

function isUuid(value?: string | null) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export default function OverviewClient({ clientId }: OverviewClientProps) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarUpcomingItem[]>([]);
  const [clippingStats, setClippingStats] = useState<ClippingStats | null>(null);
  const [clippingItems, setClippingItems] = useState<ClippingItem[]>([]);
  const [clippingSources, setClippingSources] = useState<ClippingSource[]>([]);
  const [socialStats, setSocialStats] = useState<SocialStatsResponse | null>(null);
  const [socialTrends, setSocialTrends] = useState<SocialTrendRow[]>([]);
  const [socialMentions, setSocialMentions] = useState<SocialMentionRow[]>([]);
  const [commentMentions, setCommentMentions] = useState<SocialMentionRow[]>([]);
  const [socialKeywords, setSocialKeywords] = useState<SocialKeywordRow[]>([]);
  const [radarMatch, setRadarMatch] = useState<ClippingMatch | null>(null);
  const [opportunities, setOpportunities] = useState<AIOpportunity[]>([]);
  const [reportei, setReportei] = useState<ReporteiResponse | null>(null);
  const [planningStats, setPlanningStats] = useState<PlanningContextStats | null>(null);
  const [planningHealth, setPlanningHealth] = useState<PlanningHealth | null>(null);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [briefings, setBriefings] = useState<BriefingRow[]>([]);
  const [copies, setCopies] = useState<CopyRow[]>([]);

  const [coreLoading, setCoreLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coreError, setCoreError] = useState('');

  const reqRef = useRef(0);

  const parseClientPayload = (clientRes: any): ClientData | null => {
    return (
      (clientRes as { client?: ClientData })?.client ??
      (clientRes as { data?: { client?: ClientData } })?.data?.client ??
      (clientRes as { data?: ClientData })?.data ??
      (clientRes as ClientData) ??
      null
    );
  };

  const loadOverview = useCallback(async (options?: { keepClient?: boolean }) => {
    const reqId = ++reqRef.current;
    const isInitial = !options?.keepClient;

    if (isInitial) {
      setCoreLoading(true);
      setCoreError('');
      setClient(null);
      setConnectors([]);
      setCalendarItems([]);
      setClippingStats(null);
      setClippingItems([]);
      setClippingSources([]);
      setSocialStats(null);
      setSocialTrends([]);
      setSocialMentions([]);
      setCommentMentions([]);
      setSocialKeywords([]);
      setRadarMatch(null);
      setOpportunities([]);
      setReportei(null);
      setPlanningStats(null);
      setPlanningHealth(null);
      setLibraryItems([]);
      setBriefings([]);
      setCopies([]);
    }

    setRefreshing(true);

    const groupA = Promise.allSettled([
      apiGet(`/clients/${clientId}`),
      apiGet<ConnectorRow[]>(`/clients/${clientId}/connectors`).catch(() => [] as ConnectorRow[]),
      apiGet<{ items: CalendarUpcomingItem[] }>(`/clients/${clientId}/calendar/upcoming?days=14`).catch(() => ({ items: [] })),
    ]).then((results) => {
      if (reqRef.current !== reqId) return;

      const [clientRes, connectorsRes, calendarRes] = results;

      if (clientRes.status === 'fulfilled') {
        setClient(parseClientPayload(clientRes.value));
      } else {
        console.error('Failed to load client:', clientRes.reason);
        setCoreError('Falha ao carregar cliente.');
      }

      if (connectorsRes.status === 'fulfilled') {
        setConnectors(Array.isArray(connectorsRes.value) ? connectorsRes.value : []);
      }

      if (calendarRes.status === 'fulfilled') {
        setCalendarItems(calendarRes.value?.items || []);
      }
    });

    const groupB = Promise.allSettled([
      apiGet<any>(`/clipping/dashboard?clientId=${encodeURIComponent(clientId)}`),
      apiGet<ClippingItem[]>(`/clipping/items?clientId=${encodeURIComponent(clientId)}&limit=5&recency=7d`).catch(() => [] as ClippingItem[]),
      apiGet<ClippingSource[]>(`/clipping/sources?scope=CLIENT&clientId=${encodeURIComponent(clientId)}`).catch(() => [] as ClippingSource[]),
    ]).then((results) => {
      if (reqRef.current !== reqId) return;
      const [dashRes, itemsRes, sourcesRes] = results;

      if (dashRes.status === 'fulfilled') {
        const payload = dashRes.value?.stats ?? dashRes.value?.data ?? dashRes.value ?? {};
        setClippingStats({
          total_items: payload.total_items ?? 0,
          new_items: payload.new_items ?? 0,
          triaged_items: payload.triaged_items ?? 0,
          items_last_7_days: payload.items_last_7_days ?? payload.items_this_week ?? 0,
          avg_score: payload.avg_score ?? 0,
        });
      }

      if (itemsRes.status === 'fulfilled') {
        setClippingItems(Array.isArray(itemsRes.value) ? itemsRes.value : []);
      }

      if (sourcesRes.status === 'fulfilled') {
        setClippingSources(Array.isArray(sourcesRes.value) ? sourcesRes.value : []);
      }
    });

    const groupC = Promise.allSettled([
      apiGet<SocialStatsResponse>(`/social-listening/stats?clientId=${encodeURIComponent(clientId)}`).catch(() => ({} as SocialStatsResponse)),
      apiGet<{ trends: SocialTrendRow[] }>(`/social-listening/trends?clientId=${encodeURIComponent(clientId)}&limit=20`).catch(() => ({ trends: [] })),
      apiGet<{ mentions: SocialMentionRow[] }>(`/social-listening/mentions?clientId=${encodeURIComponent(clientId)}&limit=5`).catch(() => ({ mentions: [] })),
      apiGet<SocialKeywordRow[]>(`/social-listening/keywords?clientId=${encodeURIComponent(clientId)}`).catch(() => [] as SocialKeywordRow[]),
      apiGet<{ mentions: SocialMentionRow[] }>(`/social-listening/mentions?clientId=${encodeURIComponent(clientId)}&keyword=comentarios&limit=3`).catch(() => ({ mentions: [] })),
    ]).then((results) => {
      if (reqRef.current !== reqId) return;
      const [statsRes, trendsRes, mentionsRes, keywordsRes, commentsRes] = results;

      if (statsRes.status === 'fulfilled') setSocialStats(statsRes.value || {});
      if (trendsRes.status === 'fulfilled') setSocialTrends(trendsRes.value?.trends || []);
      if (mentionsRes.status === 'fulfilled') setSocialMentions(mentionsRes.value?.mentions || []);
      if (keywordsRes.status === 'fulfilled') setSocialKeywords(Array.isArray(keywordsRes.value) ? keywordsRes.value : []);
      if (commentsRes.status === 'fulfilled') setCommentMentions(commentsRes.value?.mentions || []);
    });

    const groupD = Promise.allSettled([
      apiGet<{ matches: ClippingMatch[] }>(`/clipping/matches/${encodeURIComponent(clientId)}?limit=1`).catch(() => ({ matches: [] })),
      apiGet<{ data?: { opportunities?: AIOpportunity[] } }>(`/clients/${clientId}/insights/opportunities`).catch(() => ({ data: { opportunities: [] } })),
      apiGet<ReporteiResponse>(`/clients/${clientId}/insights/reportei`).catch(() => ({ items: [], updated_at: null })),
      apiPost<{ data?: { stats?: PlanningContextStats } }>(`/clients/${clientId}/planning/context`, {}).catch(() => ({ data: { stats: {} } })),
      apiPost<{ data?: PlanningHealth }>(`/clients/${clientId}/planning/health`, {}).catch(() => ({ data: undefined })),
      apiGet<any>(`/clients/${clientId}/library`).catch(() => []),
      apiGet<{ briefings?: BriefingRow[] }>(`/clients/${clientId}/briefings`).catch(() => ({ briefings: [] })),
      apiGet<{ copies?: CopyRow[] }>(`/clients/${clientId}/copies`).catch(() => ({ copies: [] })),
    ]).then((results) => {
      if (reqRef.current !== reqId) return;
      const [matchesRes, oppRes, reporteiRes, planningRes, healthRes, libraryRes, briefingsRes, copiesRes] = results;

      if (matchesRes.status === 'fulfilled') {
        setRadarMatch(matchesRes.value?.matches?.[0] || null);
      }

      if (oppRes.status === 'fulfilled') {
        setOpportunities(oppRes.value?.data?.opportunities || []);
      }

      if (reporteiRes.status === 'fulfilled') {
        setReportei(reporteiRes.value || null);
      }

      if (planningRes.status === 'fulfilled') {
        setPlanningStats(planningRes.value?.data?.stats || null);
      }

      if (healthRes.status === 'fulfilled') {
        setPlanningHealth(healthRes.value?.data || null);
      }

      if (libraryRes.status === 'fulfilled') {
        const value = libraryRes.value as any;
        const list = Array.isArray(value) ? value : value?.items || value?.data?.items || [];
        setLibraryItems(Array.isArray(list) ? list : []);
      }

      if (briefingsRes.status === 'fulfilled') {
        const list = (briefingsRes.value as any)?.briefings || (briefingsRes.value as any)?.data?.briefings || [];
        setBriefings(Array.isArray(list) ? list : []);
      }

      if (copiesRes.status === 'fulfilled') {
        const list = (copiesRes.value as any)?.copies || (copiesRes.value as any)?.data?.copies || [];
        setCopies(Array.isArray(list) ? list : []);
      }
    });

    await groupA;
    if (reqRef.current === reqId) setCoreLoading(false);

    await Promise.all([groupB, groupC, groupD]);
    if (reqRef.current === reqId) setRefreshing(false);
  }, [clientId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const kb = client?.profile?.knowledge_base || {};
  const socials = kb.social_profiles || {};
  const hasSocials = Object.entries(socials).some(([k, v]) => k !== 'other' && v);

  const formatDayMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
      day: date.getDate().toString().padStart(2, '0'),
    };
  };

  const formatNumber = (value?: number | null) => {
    if (!Number.isFinite(value)) return '--';
    return new Intl.NumberFormat('pt-BR').format(Number(value));
  };

  const formatPercent = (value?: number | null) => {
    if (!Number.isFinite(value)) return '--';
    return `${Number(value).toFixed(0)}%`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('pt-BR');
  };

  const location = [client?.city, client?.uf, client?.country].filter(Boolean).join(', ');

  const reporteiConnector = connectors.find((c) => c.provider === 'reportei') || null;
  const reporteiPayload = (reporteiConnector?.payload as any) || {};
  const reporteiEmbedUrl = reporteiPayload?.embed_url || reporteiPayload?.dashboard_url || null;
  const reporteiConfigured = Boolean(reporteiEmbedUrl);

  const metaConnector = connectors.find((c) => c.provider === 'meta') || null;
  const metaPayload = (metaConnector?.payload as any) || {};
  const metaHasIds = Boolean(metaPayload?.page_id || metaPayload?.instagram_business_id);
  const metaHasSecrets = Boolean(metaConnector?.secrets_meta && Object.keys(metaConnector.secrets_meta).length > 0);
  const metaConfigured = metaHasIds && metaHasSecrets;

  const sourcesConnector = connectors.find((c) => c.provider === 'social_listening_sources') || null;
  const sourcesPlatformsRaw = (sourcesConnector?.payload as any)?.platforms;
  const sourcesPlatforms: string[] = Array.isArray(sourcesPlatformsRaw)
    ? sourcesPlatformsRaw.filter((p: any) => typeof p === 'string')
    : [];
  const sourcesConfigured = sourcesPlatforms.length > 0;

  const clippingActiveSourcesCount = clippingSources.filter((s) => s.is_active).length;
  const clippingErrorSourcesCount = clippingSources.filter(
    (s) => Boolean(s.last_error) || String(s.status || '').toLowerCase().includes('error')
  ).length;

  const socialActiveKeywordsCount = socialKeywords.filter((k) => k.is_active).length;
  const opportunitiesUrgentCount = opportunities.filter((o) => o.priority === 'urgent').length;

  const calendarHighRelevanceCount = calendarItems.filter((i) => Number(i.score || 0) >= 80).length;
  const nextCalendarItem = calendarItems[0] || null;
  const radarItemId = radarMatch?.clipping_item_id;
  const radarDetailHref = radarItemId && isUuid(radarItemId) ? `/clipping/${radarItemId}` : null;

  const topTrends = useMemo(() => {
    return [...(socialTrends || [])]
      .sort((a, b) => Number(b.mention_count || 0) - Number(a.mention_count || 0))
      .slice(0, 5);
  }, [socialTrends]);

  const topOpportunities = useMemo(() => {
    const prioWeight = (value?: string) => {
      if (value === 'urgent') return 0;
      if (value === 'high') return 1;
      if (value === 'medium') return 2;
      return 3;
    };
    return [...(opportunities || [])]
      .sort((a, b) => {
        const byPriority = prioWeight(a.priority) - prioWeight(b.priority);
        if (byPriority !== 0) return byPriority;
        return Number(b.confidence || 0) - Number(a.confidence || 0);
      })
      .slice(0, 3);
  }, [opportunities]);

  const reporteiEditorialInsights = useMemo(() => {
    const items = reportei?.items || [];
    const candidate = items.find((item) => Array.isArray(item?.payload?.editorial_insights) && item.payload!.editorial_insights!.length);
    const list = candidate?.payload?.editorial_insights || [];
    return list.filter(Boolean).slice(0, 3);
  }, [reportei]);

  const planningAlerts = useMemo(() => {
    const labels: Record<string, string> = {
      library: 'Biblioteca',
      clipping: 'Clipping',
      social: 'Social',
      calendar: 'Calendario',
      opportunities: 'Oportunidades',
      antiRepetition: 'Anti-repeticao',
      briefings: 'Briefings',
    };

    const sources = planningHealth?.sources || {};
    return Object.entries(sources)
      .map(([key, value]) => ({
        key,
        label: labels[key] || key,
        status: value.status,
        message: value.message,
      }))
      .filter((row) => row.status === 'warning' || row.status === 'error')
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'error' ? -1 : 1))
      .slice(0, 4);
  }, [planningHealth]);

  const recentLibrary = useMemo(() => (Array.isArray(libraryItems) ? libraryItems.slice(0, 5) : []), [libraryItems]);
  const recentBriefings = useMemo(() => (Array.isArray(briefings) ? briefings.slice(0, 3) : []), [briefings]);
  const recentCopies = useMemo(() => (Array.isArray(copies) ? copies.slice(0, 3) : []), [copies]);

  // ── Chart data (must be before early returns) ──────────────────
  const sentimentChartOptions = useMemo(() => ({
    chart: { type: 'donut' as const, sparkline: { enabled: true } },
    labels: ['Positivo', 'Neutro', 'Negativo'],
    colors: ['#059669', '#94a3b8', '#dc2626'],
    legend: { show: false },
    plotOptions: { pie: { donut: { size: '70%' } } },
    tooltip: { enabled: true, y: { formatter: (v: number) => `${v}` } },
    stroke: { width: 0 },
  }), []);

  const sentimentSeries = useMemo(() => {
    const pos = Number(socialStats?.summary?.positive || 0);
    const neg = Number(socialStats?.summary?.negative || 0);
    const neu = Number(socialStats?.summary?.neutral || 0);
    return pos + neg + neu > 0 ? [pos, neu, neg] : [1, 1, 1];
  }, [socialStats]);

  const clippingSparkOptions = useMemo(() => ({
    chart: { type: 'area' as const, sparkline: { enabled: true } },
    stroke: { curve: 'smooth' as const, width: 2 },
    colors: ['#2563eb'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
    tooltip: { enabled: false },
  }), []);

  const clippingSparkSeries = useMemo(() => {
    const total = Number(clippingStats?.items_last_7_days || 0);
    const newI = Number(clippingStats?.new_items || 0);
    const triaged = Number(clippingStats?.triaged_items || 0);
    return [{ name: 'Itens', data: [Math.max(1, total - newI - triaged), triaged, newI, total] }];
  }, [clippingStats]);

  const strategicSummaryLines = (() => {
    const lines: string[] = [];
    const total = Number(socialStats?.summary?.total || 0);
    const avg = Number(socialStats?.summary?.avg_score ?? 0);

    if (socialStats) {
      if (total > 0) lines.push(`Social (7d): ${formatNumber(total)} mencoes; sentimento medio ${formatPercent(avg)}.`);
      else lines.push('Social (7d): sem mencoes coletadas ainda.');
    }

    if (topTrends.length) {
      const formatted = topTrends
        .map((t) => `${t.keyword} (${t.platform})`)
        .filter(Boolean)
        .join(', ');
      if (formatted) lines.push(`Tendencias: ${formatted}.`);
    }

    if (radarMatch?.title) {
      const score = typeof radarMatch.score === 'number' ? ` (score ${formatNumber(radarMatch.score)})` : '';
      lines.push(`Radar: ${radarMatch.title}${score}.`);
    }

    if (nextCalendarItem?.name) {
      lines.push(`Calendario: ${nextCalendarItem.name} em ${formatDate(nextCalendarItem.date)}.`);
    }

    if (topOpportunities.length) {
      const first = topOpportunities[0];
      if (first?.title) lines.push(`Oportunidade: ${first.title}.`);
    }

    return lines.slice(0, 6);
  })();

  if (coreLoading && !client) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando...
        </Typography>
      </Stack>
    );
  }

  if (!client) {
    return (
      <Stack spacing={2} sx={{ minHeight: 200 }}>
        <Typography color="error">{coreError || 'Falha ao carregar cliente.'}</Typography>
        <Button variant="outlined" startIcon={<IconRefresh size={16} />} onClick={() => void loadOverview()}>
          Tentar novamente
        </Button>
      </Stack>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Hero Header ──────────────────────────────────────── */}
      <Card sx={{
        background: 'linear-gradient(135deg, #ff6600 0%, #e65c00 50%, #cc5200 100%)',
        borderRadius: 4,
        boxShadow: '0 8px 32px rgba(255, 102, 0, 0.3)',
        border: 'none',
      }}>
        <CardContent sx={{ py: 3, px: 3 }}>
          <Stack direction="row" alignItems="center" spacing={3}>
            <Avatar sx={{
              width: 72, height: 72,
              bgcolor: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              fontSize: 32, fontWeight: 700, color: 'white',
            }}>
              {client.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h4" fontWeight={700} sx={{ color: 'white', lineHeight: 1.2 }}>
                {client.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {client.segment_primary && (
                  <Chip size="small" label={client.segment_primary}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, backdropFilter: 'blur(4px)' }} />
                )}
                <Chip size="small" label="Ativo"
                  sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white', fontWeight: 600 }} />
                {location && (
                  <Chip size="small" icon={<IconWorld size={14} color="white" />} label={location}
                    sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
                )}
              </Stack>
            </Box>
            <Button
              variant="outlined" size="small"
              startIcon={<IconRefresh size={16} />}
              onClick={() => void loadOverview({ keepClient: true })}
              disabled={refreshing}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Stat Cards ───────────────────────────────────────── */}
      <Grid container spacing={2}>
        {[
          { label: 'Clipping (7d)', value: formatNumber(clippingStats?.items_last_7_days), sub: `Novos: ${formatNumber(clippingStats?.new_items)}`, sub2: `Score: ${formatNumber(clippingStats?.avg_score)}`, icon: IconNews, color: SECTION_COLORS.clipping },
          { label: 'Social (7d)', value: formatNumber(socialStats?.summary?.total), sub: `Sentimento: ${formatPercent(socialStats?.summary?.avg_score ?? null)}`, icon: IconAntenna, color: SECTION_COLORS.social },
          { label: 'Radar', value: formatNumber(radarMatch?.score), sub: radarMatch?.title || 'Sem radar', icon: IconTarget, color: SECTION_COLORS.radar, href: radarDetailHref || undefined },
          { label: 'Calendario', value: formatNumber(calendarItems.length), sub: `Alta relev.: ${formatNumber(calendarHighRelevanceCount)}`, icon: IconCalendar, color: SECTION_COLORS.calendar },
          { label: 'Oportunidades', value: formatNumber(opportunities.length), sub: `Urgentes: ${formatNumber(opportunitiesUrgentCount)}`, icon: IconBulb, color: SECTION_COLORS.opportunities, alert: opportunitiesUrgentCount > 0 },
          { label: 'Performance', value: reporteiConfigured ? 'OK' : '--', sub: reporteiConfigured ? `Atualizado: ${formatDate(reportei?.updated_at || null)}` : 'Reportei nao configurado', icon: IconChartBar, color: SECTION_COLORS.performance },
          { label: 'Biblioteca', value: formatNumber(planningStats?.library?.totalItems), sub: 'Itens prontos para IA', icon: IconBook2, color: SECTION_COLORS.library },
          { label: 'Creative', value: formatNumber(planningStats?.briefings?.pending), sub: `Copies (90d): ${formatNumber(planningStats?.copies?.recentHashes)}`, icon: IconSparkles, color: SECTION_COLORS.creative },
        ].map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
            <Card
              {...(stat.href ? ({ component: Link, href: stat.href, role: 'link' } as any) : {})}
              sx={{
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: 'none',
              transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
              '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' },
              position: 'relative',
              overflow: 'hidden',
              cursor: stat.href ? 'pointer' : 'default',
              textDecoration: stat.href ? 'none' : undefined,
            }}>
              {stat.alert && (
                <Box sx={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', bgcolor: '#dc2626', animation: 'pulse 1.4s infinite' }} />
              )}
              <CardContent sx={{ py: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{
                    bgcolor: stat.color.bg,
                    width: 48, height: 48,
                    boxShadow: `0 4px 12px ${stat.color.fg}20`,
                  }}>
                    <stat.icon size={24} color={stat.color.fg} />
                  </Avatar>
                  <Box flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.1, color: stat.color.fg }}>
                      {stat.value}
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 1, display: 'block' }}>
                  {stat.sub}{stat.sub2 ? ` · ${stat.sub2}` : ''}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Charts Row ───────────────────────────────────────── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: SECTION_COLORS.social.bg, width: 32, height: 32 }}>
                  <IconMoodHappy size={18} color={SECTION_COLORS.social.fg} />
                </Avatar>
                <Typography variant="subtitle1" fontWeight={600}>Sentimento Social</Typography>
              </Stack>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Chart options={sentimentChartOptions} series={sentimentSeries} type="donut" width={180} height={180} />
              </Box>
              <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 1.5 }}>
                {[
                  { label: 'Positivo', color: '#059669', value: socialStats?.summary?.positive },
                  { label: 'Neutro', color: '#94a3b8', value: socialStats?.summary?.neutral },
                  { label: 'Negativo', color: '#dc2626', value: socialStats?.summary?.negative },
                ].map((item) => (
                  <Stack key={item.label} alignItems="center" spacing={0.25}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                    <Typography variant="caption" color="text.secondary" fontSize="0.65rem">{item.label}</Typography>
                    <Typography variant="caption" fontWeight={700}>{formatNumber(item.value ?? 0)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: SECTION_COLORS.clipping.bg, width: 32, height: 32 }}>
                  <IconTrendingUp size={18} color={SECTION_COLORS.clipping.fg} />
                </Avatar>
                <Typography variant="subtitle1" fontWeight={600}>Clipping Trend</Typography>
              </Stack>
              <Chart options={clippingSparkOptions} series={clippingSparkSeries} type="area" height={120} />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Total: {formatNumber(clippingStats?.items_last_7_days)}</Typography>
                <Typography variant="caption" color="text.secondary">Novos: {formatNumber(clippingStats?.new_items)}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: SECTION_COLORS.insights.bg, width: 32, height: 32 }}>
                  <IconHeartbeat size={18} color={SECTION_COLORS.insights.fg} />
                </Avatar>
                <Typography variant="subtitle1" fontWeight={600}>Saude do Sistema</Typography>
              </Stack>
              <Stack spacing={1.5}>
                {[
                  { label: 'Biblioteca', value: planningStats?.library?.totalItems ?? 0, max: 50, color: SECTION_COLORS.library.fg },
                  { label: 'Clipping', value: planningStats?.clipping?.totalMatches ?? 0, max: 100, color: SECTION_COLORS.clipping.fg },
                  { label: 'Social', value: planningStats?.social?.totalMentions ?? 0, max: 200, color: SECTION_COLORS.social.fg },
                  { label: 'Calendario', value: planningStats?.calendar?.next14Days ?? 0, max: 20, color: SECTION_COLORS.calendar.fg },
                  { label: 'Oportunidades', value: planningStats?.opportunities?.active ?? 0, max: 10, color: SECTION_COLORS.opportunities.fg },
                ].map((row) => (
                  <Box key={row.label}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                      <Typography variant="caption" fontWeight={700}>{formatNumber(row.value)}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (Number(row.value) / row.max) * 100)}
                      sx={{
                        height: 6, borderRadius: 3,
                        bgcolor: `${row.color}15`,
                        '& .MuiLinearProgress-bar': { bgcolor: row.color, borderRadius: 3 },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} alignItems="flex-start">
        {/* Left column */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            <Grid container spacing={2}>
              {/* Calendario */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3, borderLeft: `4px solid ${SECTION_COLORS.calendar.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none', borderLeftStyle: 'solid', borderLeftWidth: 4, borderLeftColor: SECTION_COLORS.calendar.border }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: SECTION_COLORS.calendar.bg, width: 32, height: 32 }}>
                        <IconCalendar size={18} color={SECTION_COLORS.calendar.fg} />
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600}>Calendario (14d)</Typography>
                      <Box flex={1} />
                      <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/calendar`} sx={{ color: SECTION_COLORS.calendar.fg }}>
                        Ver mais
                      </Button>
                    </Stack>
                    <Stack spacing={1.5}>
                      {calendarItems.slice(0, 5).map((item, idx) => {
                        const d = formatDayMonth(item.date);
                        const score = Number(item.score || 0);
                        return (
                          <Stack key={`${item.id}-${item.date}`} direction="row" spacing={2} alignItems="center"
                            sx={{ p: 1, borderRadius: 2, bgcolor: idx === 0 ? SECTION_COLORS.calendar.bg : 'transparent', transition: 'background 0.2s' }}>
                            <Box textAlign="center" sx={{
                              minWidth: 48, py: 0.5, px: 1, borderRadius: 2,
                              bgcolor: idx === 0 ? SECTION_COLORS.calendar.fg : '#f1f5f9',
                              color: idx === 0 ? 'white' : 'text.primary',
                            }}>
                              <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', fontWeight: 700, color: idx === 0 ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                                {d.month}
                              </Typography>
                              <Typography variant="h6" fontWeight={700}>{d.day}</Typography>
                            </Box>
                            <Box flex={1} sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" noWrap fontWeight={600}>{item.name}</Typography>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <LinearProgress variant="determinate" value={Math.min(100, score)}
                                  sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: score >= 80 ? '#059669' : score >= 50 ? '#f59e0b' : '#94a3b8' } }} />
                                <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                                  {formatNumber(score)}{item.tier ? ` · ${item.tier}` : ''}
                                </Typography>
                              </Stack>
                            </Box>
                          </Stack>
                        );
                      })}
                      {!calendarItems.length && (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Sem datas proximas.</Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Clipping */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none', borderLeftStyle: 'solid', borderLeftWidth: 4, borderLeftColor: SECTION_COLORS.clipping.border }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: SECTION_COLORS.clipping.bg, width: 32, height: 32 }}>
                        <IconNews size={18} color={SECTION_COLORS.clipping.fg} />
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600}>Clipping</Typography>
                      <Box flex={1} />
                      <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/clipping`} sx={{ color: SECTION_COLORS.clipping.fg }}>
                        Ver mais
                      </Button>
                    </Stack>
                    <Stack spacing={1.5}>
                      {clippingItems.length ? (
                        clippingItems.slice(0, 5).map((item) => {
                          const score = Number(item.client_score ?? item.score ?? 0);
                          return (
                            <Box key={item.id} sx={{ p: 1, borderRadius: 2, '&:hover': { bgcolor: '#f8fafc' }, transition: 'background 0.2s' }}>
                              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={600}
                                  component={Link}
                                  href={`/clipping/${item.id}`}
                                  sx={{
                                    color: 'text.primary',
                                    textDecoration: 'none',
                                    minWidth: 0,
                                    flex: 1,
                                    '&:hover': { color: SECTION_COLORS.clipping.fg },
                                  }}
                                  noWrap
                                >
                                  {item.title}
                                </Typography>
                                {item.url && (
                                  <Tooltip title="Abrir fonte">
                                    <IconButton
                                      component="a"
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      size="small"
                                      sx={{ color: 'text.secondary' }}
                                    >
                                      <IconExternalLink size={16} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                <Chip size="small" label={item.source_name || '--'} variant="outlined" sx={{ fontSize: '0.6rem', height: 20 }} />
                                <Typography variant="caption" color="text.secondary" fontSize="0.65rem">{formatDate(item.published_at)}</Typography>
                                <Chip size="small" label={`${score}`}
                                  sx={{ fontSize: '0.6rem', height: 20, bgcolor: score >= 80 ? '#ecfdf5' : score >= 50 ? '#fffbeb' : '#f8fafc', color: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#94a3b8', fontWeight: 700 }} />
                              </Stack>
                            </Box>
                          );
                        })
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Sem itens recentes.</Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Social Listening */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none', borderLeftStyle: 'solid', borderLeftWidth: 4, borderLeftColor: SECTION_COLORS.social.border }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: SECTION_COLORS.social.bg, width: 32, height: 32 }}>
                        <IconAntenna size={18} color={SECTION_COLORS.social.fg} />
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600}>Social Listening</Typography>
                      <Box flex={1} />
                      <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/clipping?tab=social`} sx={{ color: SECTION_COLORS.social.fg }}>
                        Ver mais
                      </Button>
                    </Stack>

                    {topTrends.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>Top tendencias</Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {topTrends.map((t) => (
                            <Chip key={`${t.keyword}-${t.platform}`} size="small"
                              label={`${t.keyword} · ${formatNumber(t.mention_count)}`}
                              sx={{ bgcolor: SECTION_COLORS.social.bg, color: SECTION_COLORS.social.fg, fontWeight: 600, fontSize: '0.65rem' }} />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    <Stack spacing={1}>
                      {socialMentions.length ? (
                        socialMentions.slice(0, 4).map((m) => (
                          <Box key={m.id} sx={{ p: 1, borderRadius: 2, bgcolor: '#fafafa' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip size="small" label={m.platform} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                              {m.author && <Typography variant="caption" fontWeight={600}>{m.author}</Typography>}
                              {m.sentiment && (
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: m.sentiment === 'positive' ? '#059669' : m.sentiment === 'negative' ? '#dc2626' : '#94a3b8' }} />
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {String(m.content || '').slice(0, 100)}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Sem mencoes recentes.</Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Insights + Oportunidades */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none', borderLeftStyle: 'solid', borderLeftWidth: 4, borderLeftColor: SECTION_COLORS.insights.border }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: SECTION_COLORS.insights.bg, width: 32, height: 32 }}>
                        <IconBolt size={18} color={SECTION_COLORS.insights.fg} />
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600}>Insights</Typography>
                      <Box flex={1} />
                      <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/insights`} sx={{ color: SECTION_COLORS.insights.fg }}>
                        Ver mais
                      </Button>
                    </Stack>

                    <Stack spacing={0.75}>
                      {strategicSummaryLines.length ? (
                        strategicSummaryLines.map((line, idx) => (
                          <Stack key={`${idx}-${line}`} direction="row" spacing={1} alignItems="flex-start">
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: SECTION_COLORS.insights.fg, mt: 0.75, flexShrink: 0 }} />
                            <Typography variant="body2" color="text.secondary">{line}</Typography>
                          </Stack>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">Sem dados suficientes para resumo.</Typography>
                      )}
                    </Stack>

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Top oportunidades
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                      {topOpportunities.length ? (
                        topOpportunities.map((opp) => (
                          <Box key={opp.id} sx={{ p: 1, borderRadius: 2, bgcolor: '#fafafa' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip size="small" label={opp.priority || 'medium'}
                                sx={{
                                  height: 20, fontSize: '0.6rem', fontWeight: 700, color: 'white',
                                  bgcolor: PRIORITY_COLORS[opp.priority || 'medium'] || PRIORITY_COLORS.medium,
                                }} />
                              <Typography variant="subtitle2" noWrap fontWeight={600}>{opp.title}</Typography>
                            </Stack>
                            {typeof opp.confidence === 'number' && (
                              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
                                <LinearProgress variant="determinate" value={opp.confidence}
                                  sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: '#e2e8f0',
                                    '& .MuiLinearProgress-bar': { bgcolor: opp.confidence >= 80 ? '#059669' : '#f59e0b' } }} />
                                <Typography variant="caption" fontWeight={600} fontSize="0.65rem">{opp.confidence}%</Typography>
                              </Stack>
                            )}
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">Sem oportunidades no momento.</Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Planning */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none', borderLeftStyle: 'solid', borderLeftWidth: 4, borderLeftColor: SECTION_COLORS.planning.border }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: SECTION_COLORS.planning.bg, width: 32, height: 32 }}>
                        <IconSettings2 size={18} color={SECTION_COLORS.planning.fg} />
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600}>Planning</Typography>
                      <Chip size="small" label={planningHealth?.overall === 'healthy' ? 'OK' : planningHealth?.overall === 'warning' ? 'Atencao' : 'Sem dados'}
                        sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700,
                          bgcolor: planningHealth?.overall === 'healthy' ? '#ecfdf5' : planningHealth?.overall === 'warning' ? '#fffbeb' : '#f8fafc',
                          color: planningHealth?.overall === 'healthy' ? '#059669' : planningHealth?.overall === 'warning' ? '#d97706' : '#94a3b8' }} />
                      <Box flex={1} />
                      <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/planning`} sx={{ color: SECTION_COLORS.planning.fg }}>
                        Ver mais
                      </Button>
                    </Stack>

                    <Stack spacing={1}>
                      {planningAlerts.length ? (
                        planningAlerts.map((row) => (
                          <Stack key={`${row.key}-${row.status}`} direction="row" spacing={1} alignItems="center"
                            sx={{ p: 1, borderRadius: 2, bgcolor: row.status === 'error' ? '#fef2f2' : '#fffbeb' }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.status === 'error' ? '#dc2626' : '#f59e0b' }} />
                            <Typography variant="caption" fontWeight={600}>{row.label}</Typography>
                            <Typography variant="caption" color="text.secondary">{row.message}</Typography>
                          </Stack>
                        ))
                      ) : (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ecfdf5' }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#059669' }} />
                          <Typography variant="caption" color="#059669" fontWeight={600}>Tudo funcionando normalmente</Typography>
                        </Stack>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Library */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none', borderLeftStyle: 'solid', borderLeftWidth: 4, borderLeftColor: SECTION_COLORS.library.border }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: SECTION_COLORS.library.bg, width: 32, height: 32 }}>
                        <IconBook2 size={18} color={SECTION_COLORS.library.fg} />
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600}>Biblioteca</Typography>
                      <Box flex={1} />
                      <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/library`} sx={{ color: SECTION_COLORS.library.fg }}>
                        Ver mais
                      </Button>
                    </Stack>
                    <Stack spacing={1}>
                      {recentLibrary.length ? (
                        recentLibrary.map((item) => (
                          <Stack key={item.id} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1, borderRadius: 2, '&:hover': { bgcolor: '#f8fafc' } }}>
                            <Avatar sx={{ bgcolor: SECTION_COLORS.library.bg, width: 28, height: 28 }}>
                              <IconFileText size={14} color={SECTION_COLORS.library.fg} />
                            </Avatar>
                            <Box flex={1} sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" noWrap fontWeight={600}>{item.title}</Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {item.category || item.type || '--'} · {formatDate(item.updated_at || item.created_at)}
                                {item.status && <Chip size="small" label={item.status} sx={{ ml: 0.5, height: 16, fontSize: '0.55rem' }} />}
                              </Typography>
                            </Box>
                          </Stack>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Sem itens na biblioteca.</Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Creative */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none', borderLeftStyle: 'solid', borderLeftWidth: 4, borderLeftColor: SECTION_COLORS.creative.border }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: SECTION_COLORS.creative.bg, width: 32, height: 32 }}>
                        <IconSparkles size={18} color={SECTION_COLORS.creative.fg} />
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600}>Creative</Typography>
                      <Box flex={1} />
                      <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/creative`} sx={{ color: SECTION_COLORS.creative.fg }}>
                        Ver mais
                      </Button>
                    </Stack>

                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Briefings recentes
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {recentBriefings.length ? (
                        recentBriefings.map((b) => (
                          <Stack key={b.id} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1, borderRadius: 2, bgcolor: '#fafafa' }}>
                            <Avatar sx={{ bgcolor: SECTION_COLORS.creative.bg, width: 28, height: 28 }}>
                              <IconFileText size={14} color={SECTION_COLORS.creative.fg} />
                            </Avatar>
                            <Box flex={1} sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" noWrap fontWeight={600}>{b.title}</Typography>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                {b.status && <Chip size="small" label={b.status} sx={{ height: 18, fontSize: '0.55rem' }} />}
                                <Typography variant="caption" color="text.secondary">{formatDate(b.updated_at || b.created_at)}</Typography>
                              </Stack>
                            </Box>
                          </Stack>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">Sem briefings recentes.</Typography>
                      )}
                    </Stack>

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Copies recentes
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {recentCopies.length ? (
                        recentCopies.map((c) => (
                          <Box key={c.id} sx={{ p: 1, borderRadius: 2, bgcolor: '#fafafa' }}>
                            <Typography variant="caption" fontWeight={600}>{formatDateTime(c.created_at || null)}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {String(c.output || '').slice(0, 100)}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">Sem copies recentes.</Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Performance */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none', borderLeftStyle: 'solid', borderLeftWidth: 4, borderLeftColor: SECTION_COLORS.performance.border }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: SECTION_COLORS.performance.bg, width: 32, height: 32 }}>
                        <IconChartBar size={18} color={SECTION_COLORS.performance.fg} />
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600}>Performance</Typography>
                      <Chip size="small" label={reporteiConfigured ? 'Reportei OK' : 'Nao configurado'}
                        sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700,
                          bgcolor: reporteiConfigured ? '#ecfdf5' : '#fef2f2',
                          color: reporteiConfigured ? '#059669' : '#dc2626' }} />
                      <Box flex={1} />
                      <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/performance`} sx={{ color: SECTION_COLORS.performance.fg }}>
                        Ver mais
                      </Button>
                    </Stack>
                    {reporteiEditorialInsights.length ? (
                      <Stack spacing={0.75}>
                        {reporteiEditorialInsights.map((insight, idx) => (
                          <Stack key={`${idx}-${insight}`} direction="row" spacing={1} alignItems="flex-start">
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: SECTION_COLORS.performance.fg, mt: 0.75, flexShrink: 0 }} />
                            <Typography variant="body2" color="text.secondary">{insight}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Sem destaques editoriais.</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Summary card */}
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' }}>
              <CardContent>
                {kb.description && (
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {kb.description}
                  </Typography>
                )}

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconBriefcase size={16} color={SECTION_COLORS.insights.fg} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Segmento</Typography>
                    </Stack>
                    <Typography variant="subtitle2" sx={{ mt: 0.5 }}>{client?.segment_primary || 'Nao definido'}</Typography>
                  </Grid>
                  {client?.tone_profile && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <IconMoodHappy size={16} color={SECTION_COLORS.social.fg} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Tom de voz</Typography>
                      </Stack>
                      <Typography variant="subtitle2" sx={{ mt: 0.5, textTransform: 'capitalize' }}>{client.tone_profile}</Typography>
                    </Grid>
                  )}
                  {location && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <IconWorld size={16} color={SECTION_COLORS.calendar.fg} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Localizacao</Typography>
                      </Stack>
                      <Typography variant="subtitle2" sx={{ mt: 0.5 }}>{location}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Website & Social Profiles */}
            {(kb.website || hasSocials) && (
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Presença digital
                  </Typography>

                  {kb.website && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <IconWorld size={18} color="#666" />
                      <Typography
                        variant="body2"
                        component="a"
                        href={ensureUrl(kb.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {kb.website}
                      </Typography>
                      <IconExternalLink size={14} color="#999" />
                    </Stack>
                  )}

                  {hasSocials && (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {Object.entries(SOCIAL_ICONS).map(([key, cfg]) => {
                        const value = socials[key as keyof typeof socials];
                        if (!value) return null;
                        const Icon = cfg.icon;
                        return (
                          <Tooltip key={key} title={`${cfg.label}: ${value}`}>
                            <IconButton
                              size="small"
                              component="a"
                              href={ensureUrl(value)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                bgcolor: `${cfg.color}14`,
                                '&:hover': { bgcolor: `${cfg.color}28` },
                              }}
                            >
                              <Icon size={20} color={cfg.color} />
                            </IconButton>
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  )}

                  {socials.other && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Outras: {socials.other}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Audience & Brand */}
            {(kb.audience || kb.brand_promise || kb.differentiators) && (
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Marca & Posicionamento
                  </Typography>

                  <Stack spacing={2.5}>
                    {kb.audience && (
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <IconUsers size={16} color="#666" />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Público-alvo
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {kb.audience}
                        </Typography>
                      </Box>
                    )}
                    {kb.brand_promise && (
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <IconTarget size={16} color="#666" />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Promessa da marca
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {kb.brand_promise}
                        </Typography>
                      </Box>
                    )}
                    {kb.differentiators && (
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <IconSparkles size={16} color="#666" />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Diferenciais
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {kb.differentiators}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Content pillars & keywords */}
            {((client?.content_pillars && client.content_pillars.length > 0) ||
              (client?.keywords && client.keywords.length > 0) ||
              (kb.hashtags && kb.hashtags.length > 0)) && (
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Conteúdo
                  </Typography>

                  <Stack spacing={2}>
                    {client?.content_pillars && client.content_pillars.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                          Pilares de conteúdo
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {client.content_pillars.map((p, i) => (
                            <Chip key={i} size="small" label={p} sx={{ bgcolor: 'primary.lighter', color: 'primary.main', fontWeight: 500 }} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {client?.keywords && client.keywords.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                          Palavras-chave
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {client.keywords.map((k, i) => (
                            <Chip key={i} size="small" variant="outlined" label={k} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {kb.hashtags && kb.hashtags.length > 0 && (
                      <Box>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                          <IconHash size={14} color="#666" />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Hashtags
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {kb.hashtags.map((h, i) => (
                            <Chip key={i} size="small" label={h.startsWith('#') ? h : `#${h}`} sx={{ bgcolor: 'grey.100' }} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Guidelines */}
            {((kb.must_mentions && kb.must_mentions.length > 0) ||
              (kb.approved_terms && kb.approved_terms.length > 0) ||
              (kb.forbidden_claims && kb.forbidden_claims.length > 0) ||
              kb.notes) && (
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Diretrizes
                  </Typography>

                  <Stack spacing={2}>
                    {kb.must_mentions && kb.must_mentions.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                          Menções obrigatórias
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {kb.must_mentions.map((m, i) => (
                            <Chip key={i} size="small" label={m} color="success" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {kb.approved_terms && kb.approved_terms.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                          Termos aprovados
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {kb.approved_terms.map((t, i) => (
                            <Chip key={i} size="small" label={t} color="info" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {kb.forbidden_claims && kb.forbidden_claims.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                          Termos proibidos
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {kb.forbidden_claims.map((f, i) => (
                            <Chip key={i} size="small" label={f} color="error" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {kb.notes && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                          Observações
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {kb.notes}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        {/* Right column — Actions & Events */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            {/* Setup & Integracoes */}
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#f8fafc', width: 32, height: 32 }}>
                    <IconSettings2 size={18} color="#475569" />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={600}>Setup & Integracoes</Typography>
                </Stack>

                <Stack spacing={1}>
                  {[
                    { label: 'Reportei', ok: reporteiConfigured },
                    { label: 'Meta', ok: metaConfigured },
                    { label: `Fontes social (${sourcesPlatforms.length})`, ok: sourcesConfigured },
                    { label: `Clipping (${clippingActiveSourcesCount})`, ok: clippingActiveSourcesCount > 0, warn: clippingErrorSourcesCount > 0 },
                    { label: `Keywords (${socialActiveKeywordsCount})`, ok: socialActiveKeywordsCount > 0 },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.75 }}>
                      <Box sx={{
                        width: 10, height: 10, borderRadius: '50%',
                        bgcolor: item.ok ? '#059669' : (item as any).warn ? '#f59e0b' : '#e2e8f0',
                        boxShadow: item.ok ? '0 0 6px rgba(5,150,105,0.4)' : 'none',
                      }} />
                      <Typography variant="body2" flex={1}>{item.label}</Typography>
                      <Typography variant="caption" color={item.ok ? 'success.main' : 'text.secondary'} fontWeight={600}>
                        {item.ok ? 'OK' : 'Configurar'}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  <Button fullWidth variant="outlined" size="small" startIcon={<IconExternalLink size={14} />}
                    component={Link} href={`/clients/${clientId}/connectors`} sx={{ borderRadius: 2 }}>
                    Conectores
                  </Button>
                  <Button fullWidth variant="outlined" size="small" startIcon={<IconAntenna size={14} />}
                    component={Link} href={`/clients/${clientId}/clipping?tab=social`} sx={{ borderRadius: 2 }}>
                    Social Listening
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Acoes rapidas */}
            <Card sx={{
              borderRadius: 3, border: 'none',
              background: 'linear-gradient(135deg, #ff6600 0%, #e65c00 100%)',
              boxShadow: '0 8px 24px rgba(255,102,0,0.25)',
            }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'white', mb: 2 }}>
                  Acoes rapidas
                </Typography>
                <Stack spacing={1.5}>
                  <Button fullWidth variant="contained" startIcon={<IconSparkles size={16} />}
                    component={Link} href={`/studio?clientId=${clientId}`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 2, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
                    Criar post
                  </Button>
                  <Button fullWidth variant="outlined" startIcon={<IconCalendar size={16} />}
                    component={Link} href={`/clients/${clientId}/calendar`}
                    sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', borderRadius: 2, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    Calendario
                  </Button>
                </Stack>
                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
                <Grid container spacing={1}>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth size="small" startIcon={<IconBook2 size={14} />}
                      component={Link} href={`/clients/${clientId}/library`}
                      sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', '&:hover': { color: 'white' } }}>
                      Biblioteca
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth size="small" startIcon={<IconChartPie size={14} />}
                      component={Link} href={`/clients/${clientId}/insights`}
                      sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', '&:hover': { color: 'white' } }}>
                      Insights
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth size="small" startIcon={<IconRocket size={14} />}
                      component={Link} href={`/clients/${clientId}/planning`}
                      sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', '&:hover': { color: 'white' } }}>
                      Planning
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth size="small" startIcon={<IconNews size={14} />}
                      component={Link} href={`/clients/${clientId}/clipping`}
                      sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', '&:hover': { color: 'white' } }}>
                      Clipping
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Proximas datas */}
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                  <Avatar sx={{ bgcolor: SECTION_COLORS.calendar.bg, width: 32, height: 32 }}>
                    <IconCalendar size={18} color={SECTION_COLORS.calendar.fg} />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={600}>Proximas datas</Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {calendarItems.length > 0 ? (
                    calendarItems.slice(0, 5).map((item, idx) => {
                      const { month, day } = formatDayMonth(item.date);
                      const score = Number(item.score || 0);
                      return (
                        <Stack key={`${item.id}-${item.date}`} direction="row" spacing={2} alignItems="center"
                          sx={{ p: 1, borderRadius: 2, bgcolor: idx === 0 ? SECTION_COLORS.calendar.bg : 'transparent' }}>
                          <Box textAlign="center" sx={{
                            minWidth: 44, py: 0.5, px: 0.75, borderRadius: 2,
                            bgcolor: idx === 0 ? SECTION_COLORS.calendar.fg : '#f1f5f9',
                            color: idx === 0 ? 'white' : 'text.primary',
                          }}>
                            <Typography variant="caption" display="block" sx={{ fontSize: '0.55rem', fontWeight: 700, color: idx === 0 ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                              {month}
                            </Typography>
                            <Typography variant="h6" fontWeight={700}>{day}</Typography>
                          </Box>
                          <Box flex={1} sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap fontWeight={600}>{item.name}</Typography>
                            <Chip size="small" label={`${score}${item.tier ? ` · ${item.tier}` : ''}`}
                              sx={{
                                height: 18, fontSize: '0.6rem', fontWeight: 700, mt: 0.25,
                                bgcolor: score >= 80 ? '#ecfdf5' : '#f8fafc',
                                color: score >= 80 ? '#059669' : '#94a3b8',
                              }} />
                          </Box>
                        </Stack>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                      Sem eventos previstos
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
