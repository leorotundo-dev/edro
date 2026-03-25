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
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Chart from '@/components/charts/Chart';
import { getReporteiEmbedUrl, isReporteiConfigured } from '@/lib/reportei';
import {
  IconAlertTriangle,
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
  IconPlus,
  IconRefresh,
  IconRocket,
  IconSettings2,
  IconSparkles,
  IconTarget,
  IconTrendingUp,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';
import PautaFromClippingModal from '@/app/clipping/PautaFromClippingModal';
import type { PautaSuggestion } from '@/app/edro/PautaComparisonCard';
import AccountManagerPanel from './AccountManagerPanel';
import WhatsAppPulseCard from './WhatsAppPulseCard';

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
  insights:     { bg: '#fdeee8', fg: '#E85219', border: '#E85219' },
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
  const [pautaLoadingId, setPautaLoadingId] = useState<string | null>(null);
  const [pautaModal, setPautaModal] = useState<{ open: boolean; suggestion: PautaSuggestion | null }>({ open: false, suggestion: null });
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

  const [healthScore, setHealthScore] = useState<{ score: number; status: string; statusColor: string } | null>(null);

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
      setHealthScore(null);
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
      apiGet<ClippingItem[]>(`/clipping/items?clientId=${encodeURIComponent(clientId)}&limit=3&recency=7d`).catch(() => [] as ClippingItem[]),
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

    // Load health score (fire-and-forget, no blocking)
    apiGet<{ score: number; status: string; statusColor: string }>(`/clients/${clientId}/health-score`)
      .then((hs) => { if (reqRef.current === reqId) setHealthScore(hs); })
      .catch(() => {});

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
  const reporteiEmbedUrl = getReporteiEmbedUrl(reporteiPayload) || null;
  const reporteiConfigured = isReporteiConfigured(reporteiPayload);

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
  const radarDetailHref =
    radarItemId && isUuid(radarItemId)
      ? `/clients/${encodeURIComponent(clientId)}/clipping?item=${encodeURIComponent(radarItemId)}`
      : null;

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
      calendar: 'Calendário',
      opportunities: 'Oportunidades',
      antiRepetition: 'Anti-repetição',
      briefings: 'Briefings',
    };

    const hrefs: Record<string, string> = {
      social: `/clients/${clientId}/inteligencia?sub=social`,
      clipping: `/clients/${clientId}/inteligencia`,
      library: `/clients/${clientId}/inteligencia?sub=insights`,
      calendar: `/clients/${clientId}/calendar`,
      opportunities: `/clients/${clientId}/planning`,
      antiRepetition: `/clients/${clientId}/planning`,
      briefings: `/clients/${clientId}/briefings`,
    };

    const sources = planningHealth?.sources || {};
    return Object.entries(sources)
      .map(([key, value]) => ({
        key,
        label: labels[key] || key,
        status: value.status,
        message: value.message,
        href: hrefs[key] || `/clients/${clientId}/planning`,
      }))
      .filter((row) => row.status === 'warning' || row.status === 'error')
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'error' ? -1 : 1))
      .slice(0, 4);
  }, [planningHealth, clientId]);

  const recentLibrary = useMemo(() => (Array.isArray(libraryItems) ? libraryItems.slice(0, 3) : []), [libraryItems]);
  const recentBriefings = useMemo(() => (Array.isArray(briefings) ? briefings.slice(0, 3) : []), [briefings]);
  const recentCopies = useMemo(() => (Array.isArray(copies) ? copies.slice(0, 3) : []), [copies]);

  const pipelineByStage = useMemo(() => {
    const counters = {
      briefing: 0,
      copyIa: 0,
      aprovacao: 0,
      producao: 0,
      revisao: 0,
      entregue: 0,
    };
    const norm = (value?: string | null) => String(value || '').trim().toLowerCase();

    for (const b of briefings || []) {
      const status = norm(b.status);
      if (!status || status === 'new' || status === 'novo' || status === 'briefing' || status === 'draft') {
        counters.briefing += 1;
      } else if (status.includes('copy') || status.includes('ia')) {
        counters.copyIa += 1;
      } else if (status.includes('aprov')) {
        counters.aprovacao += 1;
      } else if (status.includes('produc')) {
        counters.producao += 1;
      } else if (status.includes('revis')) {
        counters.revisao += 1;
      } else if (
        status === 'done' ||
        status === 'completed' ||
        status === 'concluido' ||
        status === 'concluído' ||
        status.includes('entreg')
      ) {
        counters.entregue += 1;
      } else {
        counters.briefing += 1;
      }
    }

    return [
      { key: 'briefing', label: 'Briefing', count: counters.briefing, color: '#E85219' },
      { key: 'copy-ia', label: 'Copy IA', count: counters.copyIa, color: '#64748b' },
      { key: 'aprovacao', label: 'Aprovação', count: counters.aprovacao, color: '#FFAE1F' },
      { key: 'producao', label: 'Produção', count: counters.producao, color: '#FA896B' },
      { key: 'revisao', label: 'Revisão', count: counters.revisao, color: '#E85219' },
      { key: 'entregue', label: 'Entregue', count: counters.entregue, color: '#13DEB9' },
    ];
  }, [briefings]);

  const recommendation = useMemo(() => {
    if (topOpportunities[0]) {
      const first = topOpportunities[0];
      return {
        title: 'Oportunidade prioritária',
        text: first.description || first.title,
        href: `/studio/brief?clientId=${encodeURIComponent(clientId)}&title=${encodeURIComponent(first.title || 'Nova pauta')}`,
        action: 'Criar pauta',
      };
    }
    if (nextCalendarItem?.name) {
      return {
        title: 'Data estratégica próxima',
        text: `${nextCalendarItem.name} em ${formatDate(nextCalendarItem.date)}.`,
        href: `/clients/${clientId}/calendar`,
        action: 'Abrir calendário',
      };
    }
    if (clippingItems[0]?.title) {
      const first = clippingItems[0];
      return {
        title: 'Radar ativo',
        text: first.title,
        href: `/clients/${clientId}/inteligencia`,
        action: 'Abrir Inteligência',
      };
    }
    return null;
  }, [topOpportunities, nextCalendarItem, clippingItems, clientId]);

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
      if (total > 0) lines.push(`Social (7d): ${formatNumber(total)} menções; sentimento médio ${formatPercent(avg)}.`);
      else lines.push('Social (7d): sem menções coletadas ainda.');
    }

    if (topTrends.length) {
      const formatted = topTrends
        .map((t) => `${t.keyword} (${t.platform})`)
        .filter(Boolean)
        .join(', ');
      if (formatted) lines.push(`Tendências: ${formatted}.`);
    }

    if (radarMatch?.title) {
      const score = typeof radarMatch.score === 'number' ? ` (score ${formatNumber(radarMatch.score)})` : '';
      lines.push(`Radar: ${radarMatch.title}${score}.`);
    }

    if (nextCalendarItem?.name) {
      lines.push(`Calendário: ${nextCalendarItem.name} em ${formatDate(nextCalendarItem.date)}.`);
    }

    if (topOpportunities.length) {
      const first = topOpportunities[0];
      if (first?.title) lines.push(`Oportunidade: ${first.title}.`);
    }

    return lines.slice(0, 6);
  })();

  if (coreLoading && !client) {
    return (
      <Stack spacing={3}>
        {/* Header skeleton */}
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <Skeleton variant="circular" width={64} height={64} />
              <Stack flex={1} spacing={1}>
                <Skeleton variant="text" width={200} height={28} />
                <Skeleton variant="text" width={140} height={18} />
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Skeleton variant="rounded" width={72} height={24} sx={{ borderRadius: '99px' }} />
                  <Skeleton variant="rounded" width={60} height={24} sx={{ borderRadius: '99px' }} />
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Skeleton variant="rounded" width={100} height={36} />
                <Skeleton variant="rounded" width={100} height={36} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Stat row */}
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Skeleton variant="text" width={60} height={36} sx={{ mx: 'auto' }} />
                  <Skeleton variant="text" width={80} height={16} sx={{ mx: 'auto' }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Two-col body */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={200} />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
                {[1, 2, 3, 4].map((i) => (
                  <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Stack flex={1}>
                      <Skeleton variant="text" width="60%" height={16} />
                      <Skeleton variant="text" width="40%" height={14} />
                    </Stack>
                  </Stack>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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

  const sectionCardSx = { borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: 'none' };
  const sectionContentSx = { p: { xs: 2, sm: 3 } };

  return (
    <>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ══ WhatsApp Pulse — AI summary of group conversations ════════ */}
      <WhatsAppPulseCard clientId={clientId} />

      {/* ══ Setup Checklist (novos clientes / perfil incompleto) ══════ */}
      {(() => {
        const hasCalendar = calendarItems.length > 0;
        const hasIntegration = metaConfigured || reporteiConfigured;
        const hasIntelligence = Boolean(client?.profile?.knowledge_base?.description) || clippingItems.length > 0;
        const hasKnowledge = Boolean(client?.keywords?.length) && Boolean(client?.content_pillars?.length);
        const incomplete = [hasCalendar, hasIntegration, hasIntelligence, hasKnowledge].filter((v) => !v).length;
        if (incomplete < 2) return null;
        const steps = [
          { done: hasCalendar, label: 'Calendário gerado', href: `/calendar?clientId=${clientId}` },
          { done: hasIntegration, label: 'Integração configurada (Meta ou Reportei)', href: `/clients/${clientId}/integrations` },
          { done: hasIntelligence, label: 'Inteligência de mercado', href: `/clients/${clientId}/inteligencia` },
          { done: hasKnowledge, label: 'Palavras-chave e pilares definidos', href: `/clients/${clientId}/perfil` },
        ];
        return (
          <Card variant="outlined" sx={{ borderColor: '#FFAE1F50', bgcolor: '#fffbeb' }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                <IconRocket size={20} color="#ca8a04" />
                <Typography variant="subtitle2" fontWeight={700} color="#92400e">
                  Configure o cliente para começar a trabalhar
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {steps.map((step) => (
                  <Stack key={step.label} direction="row" spacing={1} alignItems="center">
                    <Box sx={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      bgcolor: step.done ? '#16a34a' : '#e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {step.done && <Box component="span" sx={{ width: 8, height: 8, bgcolor: '#fff', borderRadius: '50%' }} />}
                    </Box>
                    {step.done ? (
                      <Typography variant="body2" sx={{ color: '#6b7280', textDecoration: 'line-through' }}>{step.label}</Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        component={Link}
                        href={step.href}
                        sx={{ color: '#92400e', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {step.label} →
                      </Typography>
                    )}
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        );
      })()}

      {/* ══ Health Score Banner ══════════════════════════════════════ */}
      {healthScore && (
        <Box
          component={Link}
          href={`/clients/${clientId}/metricas?sub=operacional`}
          sx={{
            display: 'flex', alignItems: 'center', gap: 2, px: 3, py: 1.5,
            borderRadius: 2, textDecoration: 'none',
            bgcolor: `${healthScore.statusColor}12`,
            border: `1px solid ${healthScore.statusColor}40`,
            transition: 'all 0.15s',
            '&:hover': { bgcolor: `${healthScore.statusColor}20` },
          }}
        >
          <IconHeartbeat size={22} color={healthScore.statusColor} />
          <Box flex={1}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
              Health Score
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" fontWeight={800} sx={{ color: healthScore.statusColor, lineHeight: 1 }}>
                {healthScore.score}
              </Typography>
              <Typography variant="body2" sx={{ color: healthScore.statusColor, fontWeight: 600 }}>
                / 100
              </Typography>
              <Chip
                label={healthScore.status.toUpperCase()}
                size="small"
                sx={{ bgcolor: healthScore.statusColor, color: '#fff', fontWeight: 700, fontSize: '0.65rem', height: 20 }}
              />
            </Stack>
          </Box>
          <LinearProgress
            variant="determinate"
            value={healthScore.score}
            sx={{
              width: 120, height: 6, borderRadius: 3,
              bgcolor: `${healthScore.statusColor}25`,
              '& .MuiLinearProgress-bar': { bgcolor: healthScore.statusColor, borderRadius: 3 },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Ver detalhes →</Typography>
        </Box>
      )}

      {/* AI Account Manager */}
      <AccountManagerPanel clientId={clientId} />

      {/* Alertas críticos */}
      {(planningAlerts.length > 0 || opportunitiesUrgentCount > 0) && (
        <Card
          sx={{
            borderRadius: 2, border: '1px solid', borderColor: 'error.light', bgcolor: 'error.light',
          }}
        >
          <CardContent sx={{ py: 1.5, px: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <IconAlertTriangle size={18} color="#dc2626" />
              <Typography variant="subtitle2" fontWeight={700} color="error.main">
                Atenção necessária:
              </Typography>
              {planningAlerts.map((alert) => (
                <Chip
                  key={alert.key}
                  size="small"
                  component={Link}
                  href={alert.href}
                  clickable
                  label={`${alert.label}: ${alert.message}`}
                  sx={{
                    bgcolor: alert.status === 'error' ? 'error.light' : 'warning.light',
                    color: alert.status === 'error' ? 'error.main' : 'warning.main',
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': { opacity: 0.85, boxShadow: 1 },
                  }}
                />
              ))}
              {opportunitiesUrgentCount > 0 && (
                <Chip
                  size="small"
                  component={Link}
                  href={`/clients/${clientId}/planning`}
                  clickable
                  label={`${opportunitiesUrgentCount} oportunidade(s) urgente(s)`}
                  sx={{
                    bgcolor: 'error.light', color: 'error.main', fontWeight: 700,
                    textDecoration: 'none',
                    '&:hover': { opacity: 0.85, boxShadow: 1 },
                  }}
                />
              )}
              <Button
                size="small"
                component={Link}
                href={`/clients/${clientId}/planning`}
                sx={{ ml: 'auto', color: 'error.main', fontWeight: 600, minWidth: 0 }}
              >
                Ver planning →
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Recomendação + Pipeline */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'rgba(232,82,25,0.03)', borderColor: 'rgba(232,82,25,0.2)', height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <IconSparkles size={18} color="#E85219" />
                <Typography variant="subtitle2" fontWeight={700}>Recomendação do Dia</Typography>
              </Stack>
              {recommendation ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 42 }}>
                    {recommendation.text}
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    component={Link}
                    href={recommendation.href}
                    sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}
                  >
                    {recommendation.action}
                  </Button>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sem recomendações no momento. Rode uma atualização para gerar novos sinais.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>Pipeline de Produção</Typography>
                <Typography
                  component={Link}
                  href={`/clients/${clientId}/demandas`}
                  variant="caption"
                  sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, fontSize: '0.7rem' }}
                >
                  Ver demandas →
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {pipelineByStage.map((stage) => (
                  <Stack key={stage.key} direction="row" alignItems="center" spacing={1.2}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stage.color, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>{stage.label}</Typography>
                    <Chip
                      size="small"
                      label={formatNumber(stage.count)}
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'action.hover' }}
                    />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 — KPIs & Visão Geral
          ══════════════════════════════════════════════════════════════ */}
      <Card sx={sectionCardSx}>
        <CardContent sx={sectionContentSx}>
          {/* KPI Grid — 4 columns */}
          <Grid container spacing={2}>
            {[
              { label: 'Clipping (7d)', value: formatNumber(clippingStats?.items_last_7_days), sub: `Novos: ${formatNumber(clippingStats?.new_items)}`, sub2: `Score: ${formatNumber(clippingStats?.avg_score)}`, icon: IconNews, color: SECTION_COLORS.clipping },
              { label: 'Social (7d)', value: formatNumber(socialStats?.summary?.total), sub: `Sentimento: ${formatPercent(socialStats?.summary?.avg_score ?? null)}`, icon: IconAntenna, color: SECTION_COLORS.social },
              { label: 'Radar', value: formatNumber(radarMatch?.score), sub: radarMatch?.title || 'Sem radar', icon: IconTarget, color: SECTION_COLORS.radar, href: radarDetailHref || undefined },
              { label: 'Calendário', value: formatNumber(calendarItems.length), sub: `Alta relev.: ${formatNumber(calendarHighRelevanceCount)}`, icon: IconCalendar, color: SECTION_COLORS.calendar },
              { label: 'Oportunidades', value: formatNumber(opportunities.length), sub: `Urgentes: ${formatNumber(opportunitiesUrgentCount)}`, icon: IconBulb, color: SECTION_COLORS.opportunities, alert: opportunitiesUrgentCount > 0, href: `/clients/${clientId}/planning` },
              { label: 'Performance', value: reporteiConfigured ? 'OK' : '--', sub: reporteiConfigured ? `Atualizado: ${formatDate(reportei?.updated_at || null)}` : 'Reportei não configurado', icon: IconChartBar, color: SECTION_COLORS.performance },
              { label: 'Biblioteca', value: formatNumber(planningStats?.library?.totalItems), sub: 'Itens prontos para IA', icon: IconBook2, color: SECTION_COLORS.library },
              { label: 'Creative', value: formatNumber(planningStats?.briefings?.pending), sub: `Copies (90d): ${formatNumber(planningStats?.copies?.recentHashes)}`, icon: IconSparkles, color: SECTION_COLORS.creative },
            ].map((stat) => (
              <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
                <Box
                  {...(stat.href ? ({ component: Link, href: stat.href } as any) : {})}
                  sx={{
                    p: 2, borderRadius: 2, position: 'relative', overflow: 'hidden',
                    cursor: stat.href ? 'pointer' : 'default',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    '&:hover': stat.href ? { bgcolor: 'action.hover' } : {},
                  }}
                >
                  {stat.alert && (
                    <Box sx={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', animation: 'pulse 1.4s infinite' }} />
                  )}
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: stat.color.bg, width: 48, height: 48, boxShadow: `0 4px 12px ${stat.color.fg}20` }}>
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
                </Box>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Charts — 3 columns */}
          <Grid container spacing={3}>
            {/* Sentiment donut */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <IconMoodHappy size={18} color={SECTION_COLORS.social.fg} />
                <Typography variant="subtitle2" fontWeight={600}>Sentimento Social</Typography>
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
            </Grid>

            {/* Clipping trend */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <IconTrendingUp size={18} color={SECTION_COLORS.clipping.fg} />
                <Typography variant="subtitle2" fontWeight={600}>Clipping Trend</Typography>
              </Stack>
              <Chart options={clippingSparkOptions} series={clippingSparkSeries} type="area" height={120} />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Total: {formatNumber(clippingStats?.items_last_7_days)}</Typography>
                <Typography variant="caption" color="text.secondary">Novos: {formatNumber(clippingStats?.new_items)}</Typography>
              </Stack>
            </Grid>

            {/* System health bars */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <IconHeartbeat size={18} color={SECTION_COLORS.insights.fg} />
                <Typography variant="subtitle2" fontWeight={600}>Saúde do Sistema</Typography>
              </Stack>
              <Stack spacing={1.5}>
                {[
                  { label: 'Biblioteca', value: planningStats?.library?.totalItems ?? 0, max: 50, color: SECTION_COLORS.library.fg },
                  { label: 'Clipping', value: planningStats?.clipping?.totalMatches ?? 0, max: 100, color: SECTION_COLORS.clipping.fg },
                  { label: 'Social', value: planningStats?.social?.totalMentions ?? 0, max: 200, color: SECTION_COLORS.social.fg },
                  { label: 'Calendário', value: planningStats?.calendar?.next14Days ?? 0, max: 20, color: SECTION_COLORS.calendar.fg },
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
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 — Monitoramento
          ══════════════════════════════════════════════════════════════ */}
      <Card sx={sectionCardSx}>
        <CardContent sx={sectionContentSx}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Avatar sx={{ bgcolor: SECTION_COLORS.clipping.bg, width: 36, height: 36 }}>
              <IconNews size={20} color={SECTION_COLORS.clipping.fg} />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>Monitoramento</Typography>
            <Box flex={1} />
            <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/inteligencia`} sx={{ color: SECTION_COLORS.clipping.fg }}>
              Clipping
            </Button>
            <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/inteligencia?sub=social`} sx={{ color: SECTION_COLORS.social.fg }}>
              Social
            </Button>
          </Stack>

          <Grid container spacing={3}>
            {/* Left — Clipping recente */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Clipping recente
              </Typography>
              <Stack spacing={1.5}>
                {clippingItems.length ? (
                  clippingItems.slice(0, 3).map((item) => {
                    const score = Number(item.client_score ?? item.score ?? 0);
                    return (
                      <Box key={item.id} sx={{ p: 1, borderRadius: 2, '&:hover': { bgcolor: '#f8fafc' }, transition: 'background 0.2s' }}>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            fontWeight={600}
                            component="a"
                            href={`/clients/${encodeURIComponent(clientId)}/clipping?item=${encodeURIComponent(item.id)}`}
                            sx={{ color: 'text.primary', textDecoration: 'none', minWidth: 0, flex: 1, '&:hover': { color: SECTION_COLORS.clipping.fg } }}
                            noWrap
                          >
                            {item.title}
                          </Typography>
                          {item.url && (
                            <Tooltip title="Abrir fonte">
                              <IconButton component="a" href={item.url} target="_blank" rel="noopener noreferrer" size="small" sx={{ color: 'text.secondary' }}>
                                <IconExternalLink size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                          <Chip size="small" label={item.source_name || '--'} variant="outlined" sx={{ fontSize: '0.6rem', height: 20 }} />
                          <Typography variant="caption" color="text.secondary" fontSize="0.65rem">{formatDate(item.published_at)}</Typography>
                          <Chip size="small" label={`${score}`}
                            sx={{ fontSize: '0.6rem', height: 20, bgcolor: score >= 80 ? 'success.light' : score >= 50 ? 'warning.light' : 'grey.100', color: score >= 80 ? 'success.main' : score >= 50 ? 'warning.main' : 'text.secondary', fontWeight: 700 }} />
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={pautaLoadingId === item.id}
                            startIcon={pautaLoadingId === item.id ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : <IconPlus size={14} />}
                            onClick={async () => {
                              setPautaLoadingId(item.id);
                              try {
                                const res = await apiPost<{ ok: boolean; suggestion: PautaSuggestion }>(
                                  '/pauta-inbox/from-clipping',
                                  {
                                    client_id: clientId,
                                    clipping_id: item.id,
                                    title: item.title || 'Pauta',
                                    snippet: item.snippet || undefined,
                                    url: item.url || undefined,
                                    score: item.client_score ?? item.score ?? undefined,
                                  }
                                );
                                if (res?.suggestion) {
                                  setPautaModal({ open: true, suggestion: { ...res.suggestion, client_id: clientId } });
                                }
                              } finally {
                                setPautaLoadingId(null);
                              }
                            }}
                            sx={{ fontSize: '0.65rem', py: 0.15, px: 0.8, minWidth: 0, textTransform: 'none', borderColor: '#E85219', color: '#E85219' }}
                          >
                            Criar pauta
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Sem itens recentes.</Typography>
                )}
              </Stack>
            </Grid>

            {/* Right — Social Listening */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Social Listening
              </Typography>

              {topTrends.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>Top tendências</Typography>
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
                  socialMentions.slice(0, 4).map((m) => {
                    const socialTitle = (m.keyword && m.keyword.trim()) ? `Social: ${m.keyword}` : 'Oportunidade social';
                    const socialDraft = String(m.content || '').slice(0, 180);
                    const createHref = `/studio/brief?clientId=${encodeURIComponent(clientId)}&title=${encodeURIComponent(socialTitle)}&source=social&sourceId=${encodeURIComponent(m.id)}&draft=${encodeURIComponent(socialDraft)}`;
                    return (
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
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          component={Link}
                          href={createHref}
                          startIcon={<IconPlus size={14} />}
                          sx={{ fontSize: '0.65rem', py: 0.15, px: 0.8, minWidth: 0, textTransform: 'none', borderColor: '#E85219', color: '#E85219' }}
                        >
                          Criar pauta
                        </Button>
                      </Stack>
                    </Box>
                  );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Sem menções recentes.</Typography>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3 — Estrategia
          ══════════════════════════════════════════════════════════════ */}
      <Card sx={sectionCardSx}>
        <CardContent sx={sectionContentSx}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Avatar sx={{ bgcolor: SECTION_COLORS.calendar.bg, width: 36, height: 36 }}>
              <IconCalendar size={20} color={SECTION_COLORS.calendar.fg} />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>Estratégia</Typography>
            <Box flex={1} />
            <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/calendar`} sx={{ color: SECTION_COLORS.calendar.fg }}>
              Calendário
            </Button>
            <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/inteligencia?sub=insights`} sx={{ color: SECTION_COLORS.insights.fg }}>
              Insights
            </Button>
            <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/metricas`} sx={{ color: SECTION_COLORS.performance.fg }}>
              Performance
            </Button>
          </Stack>

          <Grid container spacing={3}>
            {/* Left — Calendario (14d) */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Calendário (14d)
              </Typography>
              <Stack spacing={1.5}>
                {calendarItems.slice(0, 4).map((item, idx) => {
                  const d = formatDayMonth(item.date);
                  const score = Number(item.score || 0);
                  return (
                    <Stack key={`${item.id}-${item.date}`} direction="row" spacing={2} alignItems="center"
                      sx={{ p: 1, borderRadius: 2, bgcolor: idx === 0 ? SECTION_COLORS.calendar.bg : 'transparent', transition: 'background 0.2s' }}>
                      <Box textAlign="center" sx={{
                        minWidth: 48, py: 0.5, px: 1, borderRadius: 2,
                        bgcolor: idx === 0 ? SECTION_COLORS.calendar.fg : 'grey.100',
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
                            sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: score >= 80 ? 'success.main' : score >= 50 ? 'warning.main' : 'text.disabled' } }} />
                          <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                            {formatNumber(score)}{item.tier ? ` · ${item.tier}` : ''}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  );
                })}
                {!calendarItems.length && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Sem datas próximas.</Typography>
                )}
              </Stack>
            </Grid>

            {/* Center — Insights + Oportunidades */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Insights
              </Typography>
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

              <Typography variant="overline" color="text.secondary" sx={{ mt: 2.5, mb: 1.5, display: 'block' }}>
                Top oportunidades
              </Typography>
              <Stack spacing={1}>
                {topOpportunities.length ? (
                  topOpportunities.map((opp) => {
                    const createHref = `/studio/brief?clientId=${encodeURIComponent(clientId)}&title=${encodeURIComponent(opp.title || 'Nova pauta')}&source=opportunity&sourceId=${encodeURIComponent(opp.id)}`;
                    return (
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
                            sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: 'divider',
                              '& .MuiLinearProgress-bar': { bgcolor: opp.confidence >= 80 ? 'success.main' : 'warning.main' } }} />
                          <Typography variant="caption" fontWeight={600} fontSize="0.65rem">{opp.confidence}%</Typography>
                        </Stack>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        component={Link}
                        href={createHref}
                        startIcon={<IconPlus size={14} />}
                        sx={{ mt: 0.75, fontSize: '0.65rem', py: 0.15, px: 0.8, minWidth: 0, textTransform: 'none', borderColor: '#E85219', color: '#E85219' }}
                      >
                        Criar pauta
                      </Button>
                    </Box>
                  );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary">Sem oportunidades no momento.</Typography>
                )}
              </Stack>
            </Grid>

            {/* Right — Performance */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Performance
              </Typography>
              <Chip size="small" label={reporteiConfigured ? 'Reportei OK' : 'Não configurado'}
                sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, mb: 2,
                  bgcolor: reporteiConfigured ? 'success.light' : 'error.light',
                  color: reporteiConfigured ? 'success.main' : 'error.main' }} />
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
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4 — Producao
          ══════════════════════════════════════════════════════════════ */}
      <Card sx={sectionCardSx}>
        <CardContent sx={sectionContentSx}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Avatar sx={{ bgcolor: SECTION_COLORS.creative.bg, width: 36, height: 36 }}>
              <IconSparkles size={20} color={SECTION_COLORS.creative.fg} />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>Produção</Typography>
            <Chip size="small" label={planningHealth?.overall === 'healthy' ? 'OK' : planningHealth?.overall === 'warning' ? 'Atenção' : 'Sem dados'}
              sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700,
                bgcolor: planningHealth?.overall === 'healthy' ? 'success.light' : planningHealth?.overall === 'warning' ? 'warning.light' : 'grey.100',
                color: planningHealth?.overall === 'healthy' ? 'success.main' : planningHealth?.overall === 'warning' ? 'warning.main' : 'text.secondary' }} />
            <Box flex={1} />
            <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/perfil`} sx={{ color: SECTION_COLORS.creative.fg }}>
              Perfil
            </Button>
            <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/planning`} sx={{ color: SECTION_COLORS.planning.fg }}>
              Planning
            </Button>
            <Button size="small" variant="text" component={Link} href={`/clients/${clientId}/planning`} sx={{ color: SECTION_COLORS.library.fg }}>
              Biblioteca
            </Button>
          </Stack>

          {/* Planning alerts */}
          {planningAlerts.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {planningAlerts.map((row) => (
                <Chip key={`${row.key}-${row.status}`} size="small"
                  label={`${row.label}: ${row.message}`}
                  sx={{
                    height: 24, fontSize: '0.65rem', fontWeight: 600,
                    bgcolor: row.status === 'error' ? 'error.light' : 'warning.light',
                    color: row.status === 'error' ? 'error.main' : 'warning.main',
                  }} />
              ))}
            </Stack>
          )}

          <Grid container spacing={3}>
            {/* Left — Briefings recentes */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Briefings recentes
              </Typography>
              <Stack spacing={1}>
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
            </Grid>

            {/* Center — Cópias recentes */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Cópias recentes
              </Typography>
              <Stack spacing={1}>
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
                  <Typography variant="body2" color="text.secondary">Sem cópias recentes.</Typography>
                )}
              </Stack>
            </Grid>

            {/* Right — Biblioteca */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Biblioteca
              </Typography>
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
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5 — Acoes Rápidas
          ══════════════════════════════════════════════════════════════ */}
      <Card sx={sectionCardSx}>
        <CardContent sx={sectionContentSx}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Avatar sx={{ bgcolor: SECTION_COLORS.insights.bg, width: 36, height: 36 }}>
              <IconRocket size={20} color={SECTION_COLORS.insights.fg} />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>Ações Rápidas</Typography>
          </Stack>

          <Grid container spacing={3}>
            {/* Left — Acoes rapidas */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{
                borderRadius: '12px', p: 2.5,
                background: 'linear-gradient(135deg, #E85219 0%, #c43e10 100%)',
                boxShadow: '0 8px 24px rgba(232,82,25,0.25)',
              }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'white', mb: 2 }}>
                  Ações rápidas
                </Typography>
                <Stack spacing={1.5}>
                  <Button fullWidth variant="contained" startIcon={<IconSparkles size={16} />}
                    component={Link} href={`/studio/brief?clientId=${clientId}`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 2, backdropFilter: 'blur(4px)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
                    Criar pauta
                  </Button>
                  <Button fullWidth variant="outlined" startIcon={<IconCalendar size={16} />}
                    component={Link} href={`/clients/${clientId}/calendar`}
                    sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', borderRadius: 2, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    Calendário
                  </Button>
                </Stack>
                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
                <Grid container spacing={1}>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth size="small" startIcon={<IconBook2 size={14} />}
                      component={Link} href={`/clients/${clientId}/planning`}
                      sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', '&:hover': { color: 'white' } }}>
                      Biblioteca
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth size="small" startIcon={<IconChartPie size={14} />}
                      component={Link} href={`/clients/${clientId}/inteligencia?sub=insights`}
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
                      component={Link} href={`/clients/${clientId}/inteligencia`}
                      sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', '&:hover': { color: 'white' } }}>
                      Clipping
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* Right — Proximas datas */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Próximas datas
              </Typography>
              <Stack spacing={1.5}>
                {calendarItems.length > 0 ? (
                  calendarItems.slice(0, 4).map((item, idx) => {
                    const { month, day } = formatDayMonth(item.date);
                    const score = Number(item.score || 0);
                    return (
                      <Stack key={`${item.id}-${item.date}`} direction="row" spacing={2} alignItems="center"
                        sx={{ p: 1, borderRadius: 2, bgcolor: idx === 0 ? SECTION_COLORS.calendar.bg : 'transparent' }}>
                        <Box textAlign="center" sx={{
                          minWidth: 44, py: 0.5, px: 0.75, borderRadius: 2,
                          bgcolor: idx === 0 ? SECTION_COLORS.calendar.fg : 'grey.100',
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
                              bgcolor: score >= 80 ? 'success.light' : 'grey.100',
                              color: score >= 80 ? 'success.main' : 'text.secondary',
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
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
    <PautaFromClippingModal
      open={pautaModal.open}
      suggestion={pautaModal.suggestion}
      onClose={() => setPautaModal({ open: false, suggestion: null })}
    />
    </>
  );
}
