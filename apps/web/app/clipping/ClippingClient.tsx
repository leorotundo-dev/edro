'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useConfirm } from '@/hooks/useConfirm';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconRefresh,
  IconPlus,
  IconExternalLink,
  IconNews,
  IconStar,
  IconChecks,
  IconCalendarWeek,
  IconChartBar,
  IconRss,
  IconThumbDown,
  IconPencil,
  IconDeviceFloppy,
  IconTrash,
  IconPlayerPause,
  IconPlayerPlay,
  IconX,
  IconAlertTriangle,
  IconSparkles,
} from '@tabler/icons-react';
import PlatformIcon from '@/components/shared/PlatformIcon';
import PautaFromClippingModal from './PautaFromClippingModal';
import type { PautaSuggestion } from '@/app/edro/PautaComparisonCard';

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
  city?: string | null;
};

type ClippingItem = {
  id: string;
  title: string;
  snippet?: string | null;
  url?: string | null;
  image_url?: string | null;
  score?: number | null;
  client_score?: number | null;
  client_matched_keywords?: string[] | null;
  status?: string | null;
  type?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  published_at?: string | null;
};

type ClippingStats = {
  total_items?: number;
  new_items?: number;
  triaged_items?: number;
  items_last_7_days?: number;
  avg_score?: number | null;
};

type SourceRow = {
  id: string;
  name: string;
  url: string;
  type: string;
  scope: string;
  client_id?: string | null;
  is_active: boolean;
  updated_at?: string | null;
  last_fetched_at?: string | null;
  fetch_interval_minutes?: number;
  status?: string | null;
  last_error?: string | null;
};

type ClippingClientProps = {
  clientId?: string;
  noShell?: boolean;
  embedded?: boolean;
};

type CompetitiveIntelResponse = {
  strategic_brief?: string;
  draft?: string;
  assets_used?: number;
};

type ClippingViewTab = 'feed' | 'manage';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos status' },
  { value: 'NEW', label: 'Novos' },
  { value: 'TRIAGED', label: 'Triados' },
  { value: 'PINNED', label: 'Fixados' },
  { value: 'ARCHIVED', label: 'Arquivados' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Todos tipos' },
  { value: 'NEWS', label: 'Notícias' },
  { value: 'TREND', label: 'Tendências' },
];

const RECENCY_OPTIONS = [
  { value: '', label: 'Período' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

const TYPE_GRADIENTS: Record<string, string> = {
  NEWS:   'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
  TREND:  'linear-gradient(135deg, #431407 0%, #c2410c 100%)',
  SOCIAL: 'linear-gradient(135deg, #3b0764 0%, #7c3aed 100%)',
};

const STAT_CARDS = [
  { key: 'total_items', label: 'Total', icon: IconNews, color: '#E85219' },
  { key: 'new_items', label: 'Novos', icon: IconStar, color: '#FFAE1F' },
  { key: 'triaged_items', label: 'Triados', icon: IconChecks, color: '#13DEB9' },
  { key: 'items_last_7_days', label: 'Ultimos 7 dias', icon: IconCalendarWeek, color: '#FA896B' },
  { key: 'avg_score', label: 'Score medio', icon: IconChartBar, color: '#7C3AED' },
] as const;

function formatNumber(value?: number | null) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR');
}

function formatSource(value?: string | null, url?: string | null) {
  if (value) return value;
  if (!url) return '--';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function detectPlatform(item: ClippingItem): string {
  if (item.type === 'TREND') return 'trend';
  if (item.type === 'SOCIAL') {
    const src = (item.source_name ?? '').toLowerCase();
    if (src.includes('instagram')) return 'instagram';
    if (src.includes('linkedin')) return 'linkedin';
    if (src.includes('tiktok')) return 'tiktok';
    if (src.includes('youtube')) return 'youtube';
    if (src.includes('twitter') || src.includes(' x ')) return 'twitter';
    if (src.includes('facebook')) return 'facebook';
    if (src.includes('whatsapp')) return 'whatsapp';
    return 'instagram';
  }
  return 'news';
}

function timeAgo(value?: string | null) {
  if (!value) return 'Nunca';
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 0) return 'Agora';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function statusChip(status?: string | null) {
  if (!status || status === 'NEW') return { label: 'Novo', color: 'warning' } as const;
  if (status === 'TRIAGED') return { label: 'Triado', color: 'success' } as const;
  if (status === 'PINNED') return { label: 'Fixado', color: 'info' } as const;
  if (status === 'ARCHIVED') return { label: 'Arquivado', color: 'default' } as const;
  return { label: status, color: 'default' } as const;
}

// ── Source diagnosis ─────────────────────────────────────────────────────────

function getSocialPlatform(url: string): string | null {
  if (/instagram\.com/i.test(url)) return 'Instagram';
  if (/linkedin\.com\/(company|in)\//i.test(url)) return 'LinkedIn';
  if (/facebook\.com/i.test(url)) return 'Facebook';
  if (/tiktok\.com/i.test(url)) return 'TikTok';
  if (/(?:twitter|x)\.com/i.test(url)) return 'Twitter/X';
  return null;
}

type SourceDiagnosis = {
  readable: string;
  hint: string;
  severity: 'error' | 'warning';
  fixType?: 'try-http';
  isSocial?: boolean;
};

function diagnoseSource(source: SourceRow): SourceDiagnosis | null {
  const social = getSocialPlatform(source.url);
  if (social) {
    return {
      readable: `Perfil ${social} não é scrapiável`,
      hint: 'Redes sociais bloqueiam scrapers. Conecte via OAuth em Integrações.',
      severity: 'error',
      isSocial: true,
    };
  }
  const err = (source.last_error || '').toLowerCase();
  if (err === 'tavily_fallback') {
    return { readable: 'Feed direto indisponível', hint: 'Conteúdo sendo recuperado via busca web (Tavily).', severity: 'warning' };
  }
  if (!err || source.status !== 'ERROR') return null;
  if (err.includes('invalid character') || err.includes('not well-formed') || err.includes('entity name') || err.includes('unclosed token')) {
    return { readable: 'Feed RSS inválido', hint: 'A URL retornou HTML em vez de XML/RSS. Tente adicionar /feed/ ou /rss ao final.', severity: 'error' };
  }
  if (err === 'url_no_links_found') {
    return { readable: 'Nenhum link encontrado', hint: 'A página não tem links extraíveis. Tente adicionar /feed ou /rss ao final da URL.', severity: 'error' };
  }
  if (err.includes('certificate') || err.includes('ssl') || err.includes('unable to verify')) {
    return { readable: 'Erro de certificado SSL', hint: 'Certificado inválido.', severity: 'error', fixType: 'try-http' };
  }
  if (err.includes('404') || err.includes('not found')) {
    return { readable: 'Página não encontrada (404)', hint: 'A URL pode ter mudado. Atualize o endereço.', severity: 'error' };
  }
  if (err.includes('403') || err.includes('forbidden') || err.includes('blocked')) {
    return { readable: 'Acesso bloqueado (403)', hint: 'O site bloqueou o scraper.', severity: 'error' };
  }
  if (err.includes('econnrefused') || err.includes('econnreset') || err.includes('etimedout') || err.includes('timeout')) {
    return { readable: 'Site não responde', hint: 'Servidor instável ou fora do ar.', severity: 'error' };
  }
  if (err.includes('enotfound') || err.includes('getaddrinfo')) {
    return { readable: 'Domínio não encontrado', hint: 'O site pode estar fora do ar ou o domínio mudou.', severity: 'error' };
  }
  return { readable: 'Erro ao buscar', hint: source.last_error || 'Erro desconhecido.', severity: 'error' };
}

type SuggestedSource = { name: string; url: string; type: string; reason: string };

export default function ClippingClient({ clientId, noShell, embedded }: ClippingClientProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const lockedClientId = clientId || searchParams.get('clientId') || '';
  const isLocked = Boolean(lockedClientId);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [stats, setStats] = useState<ClippingStats>({});
  const [items, setItems] = useState<ClippingItem[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [recencyFilter, setRecencyFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [query, setQuery] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState('RSS');
  const [sourceScope, setSourceScope] = useState('CLIENT');
  const [sourceIncludeKw, setSourceIncludeKw] = useState('');
  const [sourceExcludeKw, setSourceExcludeKw] = useState('');
  const [ingestUrl, setIngestUrl] = useState('');
  const [savingSource, setSavingSource] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState('');
  const [savingSourceUrl, setSavingSourceUrl] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [competitiveLoading, setCompetitiveLoading] = useState(false);
  const [competitiveOpen, setCompetitiveOpen] = useState(false);
  const [competitiveBrief, setCompetitiveBrief] = useState('');
  const [pautaLoadingId, setPautaLoadingId] = useState<string | null>(null);
  const [pautaModal, setPautaModal] = useState<{ open: boolean; suggestion: PautaSuggestion | null }>({ open: false, suggestion: null });
  const [viewTab, setViewTab] = useState<ClippingViewTab>('feed');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestSources, setSuggestSources] = useState<SuggestedSource[]>([]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClientRow[]>('/clients');
      setClients(response || []);
      if (response?.length) {
        const desired = lockedClientId;
        const match = desired ? response.find((client) => client.id === desired) : response[0];
        setSelectedClient(match || response[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, [lockedClientId]);

  const loadClientDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClientRow>(`/clients/${id}`);
      if (response?.id) {
        setSelectedClient(response);
        setClients([response]);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar cliente.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const qs = selectedClient?.id ? `?clientId=${encodeURIComponent(selectedClient.id)}` : '';
      const response = await apiGet<any>(`/clipping/dashboard${qs}`);
      const payload = response?.stats ?? response?.data ?? response ?? {};
      setStats({
        total_items: payload.total_items ?? 0,
        new_items: payload.new_items ?? 0,
        triaged_items: payload.triaged_items ?? 0,
        items_last_7_days: payload.items_last_7_days ?? payload.items_this_week ?? 0,
        avg_score: payload.avg_score ?? 0,
      });
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dashboard.');
    }
  }, [selectedClient]);

  const loadSources = useCallback(async () => {
    try {
      if (!selectedClient) {
        const response = await apiGet<SourceRow[]>('/clipping/sources?scope=GLOBAL');
        setSources(response || []);
        return;
      }

      const [globalSources, clientSources] = await Promise.all([
        apiGet<SourceRow[]>('/clipping/sources?scope=GLOBAL'),
        apiGet<SourceRow[]>(
          `/clipping/sources?scope=CLIENT&clientId=${encodeURIComponent(selectedClient.id)}`
        ),
      ]);

      // Hide the tenant-global manual source (url='manual') inside client views to avoid confusion.
      const filteredGlobal = (globalSources || []).filter((source) => source.url !== 'manual');

      const merged = [...(clientSources || []), ...filteredGlobal];
      const seen = new Set<string>();
      const deduped = merged.filter((source) => {
        if (seen.has(source.id)) return false;
        seen.add(source.id);
        return true;
      });
      setSources(deduped);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar fontes.');
    }
  }, [selectedClient]);

  const loadItems = useCallback(async () => {
    // Items must be scoped to a client — don't load without one
    if (!selectedClient?.id) {
      setItems([]);
      return;
    }

    const qs = new URLSearchParams();
    if (statusFilter) qs.set('status', statusFilter);
    if (typeFilter) qs.set('type', typeFilter);
    if (recencyFilter) qs.set('recency', recencyFilter);
    if (minScore) qs.set('minScore', minScore);
    if (query) qs.set('q', query);
    qs.set('clientId', selectedClient.id);

    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClippingItem[]>(`/clipping/items?${qs.toString()}`);
      setItems(response || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar itens do radar.');
    } finally {
      setLoading(false);
    }
  }, [minScore, query, recencyFilter, selectedClient, statusFilter, typeFilter]);

  useEffect(() => {
    if (isLocked && lockedClientId) {
      loadClientDetail(lockedClientId);
    } else {
      loadClients();
    }
  }, [isLocked, lockedClientId, loadClientDetail, loadClients]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!selectedClient) return;
    loadItems();
    loadSources();
  }, [selectedClient, loadItems, loadSources]);

  useEffect(() => {
    setSelectedItemIds((prev) => prev.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  const handleSaveSource = async () => {
    if (!sourceName.trim() || !sourceUrl.trim()) return;
    setSavingSource(true);
    setError('');
    setSuccess('');
    try {
      const includeKw = sourceIncludeKw.split(',').map((s) => s.trim()).filter(Boolean);
      const excludeKw = sourceExcludeKw.split(',').map((s) => s.trim()).filter(Boolean);
      const effectiveClientId = (selectedClient?.id || lockedClientId || '').trim();
      const effectiveScope = isLocked ? 'CLIENT' : sourceScope;
      if (effectiveScope === 'CLIENT' && !effectiveClientId) {
        setError('Cliente inválido para criar fonte.');
        return;
      }
      await apiPost('/clipping/sources', {
        scope: effectiveScope,
        client_id: effectiveScope === 'CLIENT' ? effectiveClientId : undefined,
        name: sourceName.trim(),
        url: sourceUrl.trim(),
        type: sourceType,
        include_keywords: includeKw.length ? includeKw : undefined,
        exclude_keywords: excludeKw.length ? excludeKw : undefined,
      });
      setSourceName('');
      setSourceUrl('');
      setSourceIncludeKw('');
      setSourceExcludeKw('');
      setSuccess('Fonte adicionada.');
      await loadSources();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar fonte.');
    } finally {
      setSavingSource(false);
    }
  };

  const handleRejectItem = async (itemId: string) => {
    setError('');
    setSuccess('');
    try {
      if (!selectedClient?.id) return;
      await apiPost(`/clipping/items/${itemId}/feedback`, {
        feedback: 'irrelevant',
        clientId: selectedClient.id,
      });
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setSuccess('Item marcado como irrelevante.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao rejeitar item.');
    }
  };

  const handleIngestUrl = async () => {
    if (!ingestUrl.trim()) return;
    setIngesting(true);
    setError('');
    setSuccess('');
    try {
      const effectiveClientId = (selectedClient?.id || lockedClientId || '').trim();
      await apiPost('/clipping/items/ingest-url', {
        url: ingestUrl.trim(),
        clientId: effectiveClientId || undefined,
      });
      setSuccess('URL ingerida com sucesso.');
      setIngestUrl('');
      await Promise.all([loadItems(), loadSources(), loadStats()]);
    } catch (err: any) {
      setError(err?.message || 'Falha ao ingerir URL.');
    } finally {
      setIngesting(false);
    }
  };

  const handlePauseSource = async (id: string) => {
    setError('');
    try {
      await apiPost(`/clipping/sources/${id}/pause`, {});
      setSuccess('Fonte pausada.');
      await loadSources();
    } catch (err: any) {
      setError(err?.message || 'Falha ao pausar fonte.');
    }
  };

  const handleResumeSource = async (id: string) => {
    setError('');
    try {
      await apiPost(`/clipping/sources/${id}/resume`, {});
      setSuccess('Fonte reativada.');
      await loadSources();
    } catch (err: any) {
      setError(err?.message || 'Falha ao reativar fonte.');
    }
  };

  const handleDeleteSource = async (id: string, name: string) => {
    if (!await confirm(`Excluir fonte "${name}"?`)) return;
    setError('');
    try {
      await apiDelete(`/clipping/sources/${id}`);
      setSuccess('Fonte excluida.');
      await loadSources();
    } catch (err: any) {
      setError(err?.message || 'Falha ao excluir fonte.');
    }
  };

  const handleEditSource = (id: string, url: string) => {
    setEditingSourceId(id);
    setEditingUrl(url);
  };

  const handleCancelEdit = () => {
    setEditingSourceId(null);
    setEditingUrl('');
  };

  const handleSaveSourceUrl = async (id: string) => {
    if (!editingUrl.trim()) return;
    setSavingSourceUrl(true);
    setError('');
    try {
      await apiPatch(`/clipping/sources/${id}`, { url: editingUrl.trim() });
      setSuccess('URL atualizada.');
      setEditingSourceId(null);
      setEditingUrl('');
      await loadSources();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar URL.');
    } finally {
      setSavingSourceUrl(false);
    }
  };

  const handleQuickFixSsl = async (source: SourceRow) => {
    const newUrl = source.url.replace(/^https:\/\//i, 'http://');
    if (newUrl === source.url) return;
    try {
      await apiPatch(`/clipping/sources/${source.id}`, { url: newUrl });
      await loadSources();
      setSuccess('URL atualizada para HTTP.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar URL.');
    }
  };

  const handleSuggestSources = async () => {
    setSuggestLoading(true);
    setSuggestSources([]);
    setSuggestOpen(true);
    try {
      const effectiveClientId = (selectedClient?.id || lockedClientId || '').trim();
      const res = await apiPost<{ suggestions: SuggestedSource[] }>('/clipping/sources/suggest', {
        clientId: effectiveClientId || undefined,
      });
      setSuggestSources(res?.suggestions || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao sugerir fontes.');
      setSuggestOpen(false);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleAddSuggestedSource = async (s: SuggestedSource) => {
    const effectiveClientId = (selectedClient?.id || lockedClientId || '').trim();
    try {
      await apiPost('/clipping/sources', {
        name: s.name,
        url: s.url,
        type: s.type,
        scope: effectiveClientId ? 'CLIENT' : 'GLOBAL',
        clientId: effectiveClientId || undefined,
      });
      setSuggestSources((prev) => prev.filter((x) => x.url !== s.url));
      void loadSources();
      setSuccess(`"${s.name}" adicionada.`);
    } catch (err: any) {
      setError(err?.message || 'Falha ao adicionar.');
    }
  };

  const handleFetchAll = async () => {
    setFetchingAll(true);
    setError('');
    try {
      const effectiveClientId = (selectedClient?.id || lockedClientId || '').trim();
      const res = await apiPost<{ enqueued?: number; sources_enqueued?: number }>('/clipping/admin/fetch-all', {
        clientId: effectiveClientId || undefined,
      });
      const enqueued = res?.enqueued ?? res?.sources_enqueued ?? 0;
      setSuccess(`Busca enfileirada para ${enqueued} fontes.`);

      // Refresh "Fetch: ..." timestamps. Jobs run async, so re-check twice.
      await loadSources();
      window.setTimeout(() => {
        void loadSources();
      }, 6000);
      window.setTimeout(() => {
        void loadSources();
      }, 20000);
    } catch (err: any) {
      setError(err?.message || 'Falha ao enfileirar busca.');
    } finally {
      setFetchingAll(false);
    }
  };

  const toggleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItemIds((prev) => {
      if (checked) {
        if (prev.includes(itemId)) return prev;
        return [...prev, itemId];
      }
      return prev.filter((id) => id !== itemId);
    });
  };

  const handleSelectTopTen = () => {
    setSelectedItemIds(items.slice(0, 10).map((item) => item.id));
  };

  const handleRunCompetitiveIntel = async () => {
    const clientIdForAnalysis = selectedClient?.id || lockedClientId;
    if (!clientIdForAnalysis) {
      setError('Selecione um cliente para análise.');
      return;
    }

    const selectedAssets = items
      .filter((item) => selectedItemIds.includes(item.id))
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        title: item.title,
        snippet: item.snippet || '',
        url: item.url || '',
        source: formatSource(item.source_name, item.source_url),
        published_at: item.published_at || '',
        score: item.client_score ?? item.score ?? null,
      }));

    if (!selectedAssets.length) {
      setError('Selecione até 10 matérias para análise.');
      return;
    }

    setCompetitiveLoading(true);
    setError('');
    try {
      const response = await apiPost<CompetitiveIntelResponse>(
        `/clients/${encodeURIComponent(clientIdForAnalysis)}/reports/competitive-intelligence`,
        { assets: selectedAssets }
      );
      setCompetitiveBrief(
        response?.strategic_brief || response?.draft || 'Análise concluída sem conteúdo retornado.'
      );
      setCompetitiveOpen(true);
      setSuccess(`Análise de concorrência gerada com ${selectedAssets.length} ativo(s).`);
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar análise de concorrência.');
    } finally {
      setCompetitiveLoading(false);
    }
  };

  const errorSourceCount = useMemo(
    () => sources.filter((s) => (s.status === 'ERROR' || s.last_error) && s.last_error !== 'tavily_fallback').length,
    [sources]
  );

  const totalLabel = useMemo(() => `${items.length} itens`, [items.length]);
  const sourceAlerts = useMemo(
    () => sources.filter((source) => {
      const diagnosis = diagnoseSource(source);
      return Boolean(diagnosis) || source.status === 'ERROR' || !source.is_active;
    }).slice(0, 4),
    [sources]
  );
  const featuredItem = items[0] || null;
  const highlightedItems = items.slice(1, 5);
  const feedListItems = items.slice(5);

  const goDetail = (item: ClippingItem) => {
    if (!item?.id) return;
    const href = embedded && lockedClientId
      ? `/clients/${encodeURIComponent(lockedClientId)}/clipping?item=${encodeURIComponent(item.id)}`
      : `/clipping/${item.id}`;
    router.push(href);
  };

  const renderItemActions = (item: ClippingItem, light = false) => (
    <Stack direction="row" spacing={0.5} alignItems="center" onClick={(e) => e.stopPropagation()}>
      {(selectedClient?.id || lockedClientId) && (
        <Button
          size="small"
          variant={light ? 'contained' : 'outlined'}
          disabled={pautaLoadingId === item.id}
          onClick={async (e) => {
            e.stopPropagation();
            const cid = selectedClient?.id || lockedClientId;
            if (!cid) return;
            setPautaLoadingId(item.id);
            try {
              const res = await apiPost<{ ok: boolean; suggestion: PautaSuggestion }>(
                '/pauta-inbox/from-clipping',
                {
                  client_id: cid,
                  clipping_id: item.id,
                  title: item.title || 'Pauta',
                  snippet: item.snippet || undefined,
                  url: item.url || undefined,
                  score: item.client_score ?? item.score ?? undefined,
                }
              );
              if (res?.suggestion) {
                setPautaModal({ open: true, suggestion: { ...res.suggestion, client_id: cid } });
              }
            } finally {
              setPautaLoadingId(null);
            }
          }}
          sx={light
            ? { fontSize: '0.72rem', py: 0.3, px: 1.1, bgcolor: '#E85219', '&:hover': { bgcolor: '#c94315' } }
            : { fontSize: '0.72rem', py: 0.3, px: 1.1, borderColor: '#E85219', color: '#E85219', textTransform: 'none' }}
        >
          {pautaLoadingId === item.id ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : 'Criar pauta'}
        </Button>
      )}
      {item.url && (
        <Tooltip title="Abrir original">
          <IconButton size="small" sx={light ? { color: 'rgba(255,255,255,0.8)' } : {}} onClick={(e) => { e.stopPropagation(); window.open(item.url!, '_blank', 'noopener'); }}>
            <IconExternalLink size={15} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Rejeitar">
        <IconButton size="small" sx={light ? { color: 'rgba(255,100,100,0.85)' } : { color: 'error.main' }} onClick={(e) => { e.stopPropagation(); handleRejectItem(item.id); }}>
          <IconThumbDown size={15} />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  if (loading && clients.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando Radar...
        </Typography>
      </Stack>
    );
  }

  const content = (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Box>
        <Typography variant="h4" fontWeight={700}>Clipping</Typography>
        <Typography variant="body2" color="text.secondary">
          Feed editorial do radar, com leitura primeiro e gestão de fontes separada.
        </Typography>
      </Box>

      {error ? (
        <Card sx={{ bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light' }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography color="error.main" variant="body2">{error}</Typography>
          </CardContent>
        </Card>
      ) : null}
      {success ? (
        <Card sx={{ bgcolor: 'success.lighter', border: '1px solid', borderColor: 'success.light' }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography color="success.main" variant="body2">{success}</Typography>
          </CardContent>
        </Card>
      ) : null}

      <DashboardCard
        title="Radar editorial"
        subtitle={`${selectedClient?.name || 'Global'} · ${selectedClient?.segment_primary || 'Radar global'}`}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={totalLabel} color="primary" variant="outlined" />
            <Chip size="small" label={`${sources.length} fontes`} variant="outlined" />
          </Stack>
        }
      >
        <Grid container spacing={2}>
          {STAT_CARDS.map((metric) => (
            <Grid key={metric.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
              <DashboardCard hoverable sx={{ height: '100%' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: `${metric.color}22`, color: metric.color, width: 44, height: 44 }}>
                    <metric.icon size={22} />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {metric.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {formatNumber(stats[metric.key])}
                    </Typography>
                  </Box>
                </Stack>
              </DashboardCard>
            </Grid>
          ))}
        </Grid>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          sx={{ mt: 2 }}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <Button variant="contained" startIcon={<IconRefresh size={16} />} onClick={loadItems}>
            Atualizar feed
          </Button>
          <Button size="small" variant="outlined" onClick={handleSelectTopTen}>
            Selecionar top 10
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconSparkles size={14} />}
            onClick={handleRunCompetitiveIntel}
            disabled={competitiveLoading || selectedItemIds.length === 0}
          >
            {competitiveLoading ? 'Analisando...' : 'Analisar concorrência'}
          </Button>
        </Stack>
      </DashboardCard>

      <DashboardCard
        title="Filtros do feed"
        subtitle="Escolha o recorte e atualize o feed editorial."
        action={<Chip size="small" label={`${selectedItemIds.length} selecionados`} variant="outlined" />}
      >
        <Grid container spacing={2}>
          {!isLocked && (
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                label="Cliente"
                value={selectedClient?.id || ''}
                onChange={(event) => {
                  const match = clients.find((client) => client.id === event.target.value) || null;
                  setSelectedClient(match);
                  if (match) router.replace(`/clipping?clientId=${match.id}`);
                }}
                fullWidth
                size="small"
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid size={{ xs: 12, md: isLocked ? 3 : 2 }}>
            <TextField select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} fullWidth size="small">
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField select label="Tipo" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} fullWidth size="small">
              {TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField select label="Período" value={recencyFilter} onChange={(e) => setRecencyFilter(e.target.value)} fullWidth size="small">
              {RECENCY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField label="Score" value={minScore} onChange={(event) => setMinScore(event.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField label="Busca" value={query} onChange={(event) => setQuery(event.target.value)} fullWidth size="small" />
          </Grid>
        </Grid>
      </DashboardCard>

      <Tabs
        value={viewTab}
        onChange={(_, value) => setViewTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
      >
        <Tab value="feed" label="Feed" icon={<IconNews size={16} />} iconPosition="start" />
        <Tab value="manage" label="Gestão" icon={<IconRss size={16} />} iconPosition="start" />
      </Tabs>

      <Grid container spacing={2}>
        {viewTab === 'feed' ? (
          <>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Stack spacing={2}>
                {featuredItem ? (
                  <Card
                    variant="outlined"
                    sx={{
                      overflow: 'hidden',
                      borderRadius: 4,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                      '&:hover': { borderColor: 'primary.main', boxShadow: '0 20px 40px rgba(15,23,42,0.08)', transform: 'translateY(-1px)' },
                    }}
                    onClick={() => goDetail(featuredItem)}
                  >
                    <Grid container>
                      <Grid size={{ xs: 12, md: 5 }}>
                        <Box
                          sx={{
                            minHeight: { xs: 220, md: '100%' },
                            height: '100%',
                            backgroundImage: featuredItem.image_url
                              ? `linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.24)), url(${featuredItem.image_url})`
                              : TYPE_GRADIENTS[featuredItem.type || 'NEWS'] ?? TYPE_GRADIENTS.NEWS,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 7 }}>
                        <CardContent sx={{ p: 3 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Chip size="small" label="Destaque do radar" color="primary" />
                              <PlatformIcon platform={detectPlatform(featuredItem)} variant="chip" size={12} />
                              <Chip
                                size="small"
                                color={statusChip(featuredItem.status).color}
                                label={statusChip(featuredItem.status).label}
                                variant="outlined"
                              />
                            </Stack>
                            <Checkbox
                              size="small"
                              checked={selectedItemIds.includes(featuredItem.id)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => toggleItemSelection(featuredItem.id, e.target.checked)}
                            />
                          </Stack>
                          <Typography variant="overline" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                            {formatSource(featuredItem.source_name, featuredItem.source_url)} · {formatDate(featuredItem.published_at)}
                          </Typography>
                          <Typography variant="h4" fontWeight={700} sx={{ mt: 1, mb: 1.5, lineHeight: 1.2 }}>
                            {featuredItem.title}
                          </Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                            {featuredItem.snippet || 'Sem resumo disponível para este item.'}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                            <Chip
                              size="small"
                              label={`Score ${formatNumber(featuredItem.client_score != null ? featuredItem.client_score : featuredItem.score)}`}
                              variant="outlined"
                            />
                            {featuredItem.client_matched_keywords?.slice(0, 3).map((keyword) => (
                              <Chip key={keyword} size="small" label={keyword} sx={{ bgcolor: '#fff7ed', color: '#c2410c' }} />
                            ))}
                          </Stack>
                          {renderItemActions(featuredItem)}
                        </CardContent>
                      </Grid>
                    </Grid>
                  </Card>
                ) : null}

                <DashboardCard title="Mais relevantes" subtitle="Leitura contínua do radar para triagem e ativação.">
                  {highlightedItems.length ? (
                    <Stack spacing={2}>
                      {highlightedItems.map((item) => {
                        const badge = statusChip(item.status);
                        const gradient = TYPE_GRADIENTS[item.type || 'NEWS'] ?? TYPE_GRADIENTS.NEWS;
                        return (
                          <Card
                            key={item.id}
                            variant="outlined"
                            sx={{
                              cursor: 'pointer',
                              borderRadius: 3,
                              transition: 'border-color 0.2s, box-shadow 0.2s',
                              '&:hover': { borderColor: 'primary.main', boxShadow: '0 14px 30px rgba(15,23,42,0.08)' },
                            }}
                            onClick={() => goDetail(item)}
                          >
                            <Grid container>
                              <Grid size={{ xs: 12, sm: 4 }}>
                                <Box
                                  sx={{
                                    minHeight: 180,
                                    height: '100%',
                                    backgroundImage: item.image_url ? `url(${item.image_url})` : gradient,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                  }}
                                />
                              </Grid>
                              <Grid size={{ xs: 12, sm: 8 }}>
                                <CardContent sx={{ p: 2.5 }}>
                                  <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                      <PlatformIcon platform={detectPlatform(item)} variant="chip" size={12} />
                                      <Chip size="small" color={badge.color} label={badge.label} variant="outlined" />
                                    </Stack>
                                    <Checkbox
                                      size="small"
                                      checked={selectedItemIds.includes(item.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => toggleItemSelection(item.id, e.target.checked)}
                                    />
                                  </Stack>
                                  <Typography variant="overline" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                                    {formatSource(item.source_name, item.source_url)} · {formatDate(item.published_at)}
                                  </Typography>
                                  <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5, mb: 1 }}>
                                    {item.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                                    {item.snippet || 'Sem resumo disponível.'}
                                  </Typography>
                                  {renderItemActions(item)}
                                </CardContent>
                              </Grid>
                            </Grid>
                          </Card>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      O feed ainda não trouxe destaques suficientes para este recorte.
                    </Typography>
                  )}
                </DashboardCard>

                <DashboardCard title="Arquivo recente" subtitle="Itens mais antigos do recorte atual.">
                  {feedListItems.length ? (
                    <Grid container spacing={2}>
                      {feedListItems.map((item) => {
                        const badge = statusChip(item.status);
                        return (
                          <Grid key={item.id} size={{ xs: 12, md: 6 }}>
                            <Card
                              variant="outlined"
                              sx={{
                                height: '100%',
                                cursor: 'pointer',
                                borderRadius: 3,
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                '&:hover': { borderColor: 'primary.main', boxShadow: '0 12px 26px rgba(15,23,42,0.07)' },
                              }}
                              onClick={() => goDetail(item)}
                            >
                              <CardContent sx={{ p: 2.25 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                  <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                                    <Typography variant="overline" color="text.secondary">
                                      {formatSource(item.source_name, item.source_url)} · {formatDate(item.published_at)}
                                    </Typography>
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.35 }}>
                                      {item.title}
                                    </Typography>
                                  </Stack>
                                  <Checkbox
                                    size="small"
                                    checked={selectedItemIds.includes(item.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => toggleItemSelection(item.id, e.target.checked)}
                                  />
                                </Stack>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, mb: 1.5, lineHeight: 1.7 }}>
                                  {item.snippet || 'Sem resumo disponível.'}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                                  <PlatformIcon platform={detectPlatform(item)} variant="chip" size={12} />
                                  <Chip size="small" color={badge.color} label={badge.label} variant="outlined" />
                                  <Chip
                                    size="small"
                                    label={`Score ${formatNumber(item.client_score != null ? item.client_score : item.score)}`}
                                    variant="outlined"
                                  />
                                </Stack>
                                {renderItemActions(item)}
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <Box sx={{ py: 5, textAlign: 'center' }}>
                      <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto', color: '#64748b' }}>
                        <IconNews size={28} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" fontWeight={600} mb={0.5}>
                        Nenhum item encontrado
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 320, mx: 'auto', mb: 2 }}>
                        Tente ajustar os filtros ou adicione novas fontes para começar a capturar conteúdo.
                      </Typography>
                      <Button size="small" variant="outlined" startIcon={<IconRefresh size={14} />} onClick={() => loadItems()}>
                        Recarregar
                      </Button>
                    </Box>
                  )}
                </DashboardCard>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack spacing={2}>
                <DashboardCard
                  title="Sala de edição"
                  subtitle="O que transformar em ação a partir do feed."
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Selecionados</Typography>
                      <Chip size="small" label={`${selectedItemIds.length}`} color="primary" />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Fontes com atenção</Typography>
                      <Chip size="small" label={`${errorSourceCount}`} color={errorSourceCount ? 'error' : 'default'} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Últimos 7 dias</Typography>
                      <Chip size="small" label={formatNumber(stats.items_last_7_days)} variant="outlined" />
                    </Stack>
                    <Divider />
                    <Button
                      variant="contained"
                      startIcon={<IconSparkles size={16} />}
                      onClick={handleRunCompetitiveIntel}
                      disabled={competitiveLoading || selectedItemIds.length === 0}
                      fullWidth
                    >
                      {competitiveLoading ? 'Analisando...' : 'Briefing estratégico'}
                    </Button>
                    <Button variant="outlined" startIcon={<IconRefresh size={16} />} onClick={loadItems} fullWidth>
                      Recarregar feed
                    </Button>
                  </Stack>
                </DashboardCard>

                <DashboardCard
                  title="Fontes em atenção"
                  subtitle="Erros, pausas e fontes que merecem revisão."
                  action={<Chip size="small" label={`${sourceAlerts.length}`} variant="outlined" />}
                >
                  <Stack spacing={1}>
                    {sourceAlerts.length ? (
                      sourceAlerts.map((source) => {
                        const diagnosis = diagnoseSource(source);
                        return (
                          <Box key={source.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" noWrap>{source.name}</Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {diagnosis?.readable || (source.is_active ? 'Ativa' : 'Pausada')}
                                </Typography>
                              </Box>
                              <Chip
                                size="small"
                                label={source.is_active ? (diagnosis ? 'Atenção' : 'OK') : 'Pausada'}
                                color={source.is_active ? (diagnosis ? 'warning' : 'success') : 'default'}
                              />
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                              {diagnosis?.hint || `Último fetch: ${timeAgo(source.last_fetched_at)}`}
                            </Typography>
                          </Box>
                        );
                      })
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Todas as fontes do recorte atual estão saudáveis.
                      </Typography>
                    )}
                  </Stack>
                </DashboardCard>
              </Stack>
            </Grid>
          </>
        ) : null}

        {viewTab === 'manage' ? (
          <>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Stack spacing={2}>
                <DashboardCard
                  title="Gestão de fontes"
                  subtitle="Catálogo de ingestão, diagnóstico e manutenção do radar."
                  action={
                    <Stack direction="row" spacing={1} alignItems="center">
                      {errorSourceCount > 0 && (
                        <Chip size="small" icon={<IconAlertTriangle size={14} />} label={`${errorSourceCount} com erro`} color="error" variant="outlined" />
                      )}
                      <Chip size="small" label={`${sources.length} fontes`} color="info" variant="outlined" />
                      {(selectedClient?.id || lockedClientId) && (
                        <Button size="small" variant="outlined" startIcon={<IconSparkles size={14} />} onClick={handleSuggestSources} disabled={suggestLoading}>
                          {suggestLoading ? 'Buscando...' : 'Sugerir fontes'}
                        </Button>
                      )}
                      <Button size="small" variant="outlined" startIcon={<IconRefresh size={14} />} onClick={handleFetchAll} disabled={fetchingAll}>
                        {fetchingAll ? 'Buscando...' : 'Buscar todas'}
                      </Button>
                    </Stack>
                  }
                >
                  <Stack spacing={1}>
                    {sources.length ? (
                      sources.map((source) => {
                        const isEditing = editingSourceId === source.id;
                        const diagnosis = diagnoseSource(source);
                        const isWarning = diagnosis?.severity === 'warning';
                        const hasError = !isWarning && (source.status === 'ERROR' || !!source.last_error);
                        const isPaused = !source.is_active;
                        const statusColor = isPaused ? 'default' : hasError ? 'error' : isWarning ? 'warning' : 'success';
                        const statusLabel = isPaused ? 'Pausada' : hasError ? 'Erro' : isWarning ? 'Atenção' : 'OK';

                        return (
                          <Box
                            key={source.id}
                            sx={{
                              p: 1.5,
                              border: '1px solid',
                              borderColor: hasError ? 'error.light' : 'divider',
                              borderRadius: 2,
                              transition: 'all 0.2s',
                              '&:hover': { bgcolor: 'action.hover' },
                              opacity: isPaused ? 0.6 : 1,
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                <IconRss size={16} />
                                <Typography variant="subtitle2" noWrap>{source.name}</Typography>
                                <Chip size="small" label={source.type} variant="outlined" />
                                <Chip size="small" label={statusLabel} color={statusColor} />
                              </Stack>
                              <Stack direction="row" spacing={0} alignItems="center">
                                {source.is_active ? (
                                  <Tooltip title="Pausar">
                                    <IconButton size="small" onClick={() => handlePauseSource(source.id)}>
                                      <IconPlayerPause size={16} />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="Reativar">
                                    <IconButton size="small" color="success" onClick={() => handleResumeSource(source.id)}>
                                      <IconPlayerPlay size={16} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Excluir">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteSource(source.id, source.name)}>
                                    <IconTrash size={16} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Stack>

                            {isEditing ? (
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                <TextField
                                  value={editingUrl}
                                  onChange={(e) => setEditingUrl(e.target.value)}
                                  size="small"
                                  fullWidth
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveSourceUrl(source.id);
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  autoFocus
                                />
                                <IconButton size="small" color="primary" onClick={() => handleSaveSourceUrl(source.id)} disabled={savingSourceUrl}>
                                  <IconDeviceFloppy size={16} />
                                </IconButton>
                                <IconButton size="small" onClick={handleCancelEdit}>
                                  <IconX size={16} />
                                </IconButton>
                              </Stack>
                            ) : (
                              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>{source.url}</Typography>
                                <Tooltip title="Editar URL">
                                  <IconButton size="small" onClick={() => handleEditSource(source.id, source.url)}>
                                    <IconPencil size={14} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            )}

                            {diagnosis && (
                              <Box sx={{ mt: 0.75, p: 1, borderRadius: 1, bgcolor: diagnosis.severity === 'warning' ? 'warning.lighter' : 'error.lighter' }}>
                                <Typography variant="caption" fontWeight={600} color={diagnosis.severity === 'warning' ? 'warning.dark' : 'error.dark'} sx={{ display: 'block' }}>
                                  {diagnosis.readable}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {diagnosis.hint}
                                </Typography>
                                {diagnosis.fixType === 'try-http' && source.url.startsWith('https://') && (
                                  <Button size="small" variant="outlined" color="warning" sx={{ mt: 0.5, py: 0, fontSize: '0.7rem' }}
                                    onClick={() => handleQuickFixSsl(source)}>
                                    Tentar HTTP
                                  </Button>
                                )}
                              </Box>
                            )}

                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} alignItems="center">
                              <Chip size="small" label={source.scope} variant="outlined" />
                              <Typography variant="caption" color="text.secondary">
                                Último fetch: {timeAgo(source.last_fetched_at)}
                              </Typography>
                            </Stack>
                          </Box>
                        );
                      })
                    ) : (
                      <Stack alignItems="center" spacing={1} sx={{ py: 3 }}>
                        <IconRss size={28} color="#bdbdbd" />
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          Nenhuma fonte cadastrada
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                          Adicione uma fonte ao lado para começar a monitorar conteúdo.
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </DashboardCard>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack spacing={2}>
                <DashboardCard title="Nova fonte" subtitle="Cadastre um novo canal para o radar.">
                  <Stack spacing={2}>
                    <TextField label="Nome" value={sourceName} onChange={(event) => setSourceName(event.target.value)} size="small" />
                    <TextField label="URL" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} size="small" />
                    <TextField select label="Tipo" value={sourceType} onChange={(event) => setSourceType(event.target.value)} size="small">
                      {['RSS', 'URL', 'YOUTUBE', 'OTHER'].map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField select label="Escopo" value={sourceScope} onChange={(event) => setSourceScope(event.target.value)} size="small">
                      {['GLOBAL', 'CLIENT'].map((scope) => (
                        <MenuItem key={scope} value={scope}>
                          {scope}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Incluir keywords (vírgula)"
                      value={sourceIncludeKw}
                      onChange={(event) => setSourceIncludeKw(event.target.value)}
                      size="small"
                      helperText="Só ingerir itens com estas palavras."
                    />
                    <TextField
                      label="Excluir keywords (vírgula)"
                      value={sourceExcludeKw}
                      onChange={(event) => setSourceExcludeKw(event.target.value)}
                      size="small"
                      helperText="Ignorar itens com estas palavras."
                    />
                    <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={handleSaveSource} disabled={savingSource}>
                      {savingSource ? 'Salvando...' : 'Adicionar fonte'}
                    </Button>
                  </Stack>
                </DashboardCard>

                <DashboardCard title="Ingestão manual" subtitle="Empurre uma URL específica para dentro do radar.">
                  <Stack spacing={2}>
                    <TextField label="URL" value={ingestUrl} onChange={(event) => setIngestUrl(event.target.value)} size="small" />
                    <Button variant="contained" onClick={handleIngestUrl} disabled={ingesting}>
                      {ingesting ? 'Ingerindo...' : 'Ingerir URL'}
                    </Button>
                  </Stack>
                </DashboardCard>
              </Stack>
            </Grid>
          </>
        ) : null}
      </Grid>

      {/* ── Suggest sources dialog ── */}
      <Dialog open={suggestOpen} onClose={() => setSuggestOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconSparkles size={20} />
            <Typography variant="h6">Sugestão de fontes com IA</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {suggestLoading ? (
            <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">Buscando fontes relevantes...</Typography>
            </Stack>
          ) : suggestSources.length === 0 ? (
            <Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Nenhuma sugestão encontrada. Adicione palavras-chave no perfil do cliente para melhorar os resultados.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="caption" color="text.secondary">
                {suggestSources.length} fontes encontradas. Clique em "Adicionar" para incluir nas fontes do cliente.
              </Typography>
              {suggestSources.map((s) => (
                <Box key={s.url} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip size="small" label={s.type} variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                        <Typography variant="body2" fontWeight={600} noWrap>{s.name}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }} noWrap>
                        {s.url}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">{s.reason}</Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} flexShrink={0}>
                      <Tooltip title="Abrir URL">
                        <IconButton size="small" component="a" href={s.url} target="_blank" rel="noopener">
                          <IconExternalLink size={14} />
                        </IconButton>
                      </Tooltip>
                      <Button size="small" variant="contained" startIcon={<IconPlus size={14} />}
                        onClick={() => handleAddSuggestedSource(s)}>
                        Adicionar
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuggestOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={competitiveOpen} onClose={() => setCompetitiveOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Briefing estratégico de concorrência</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {competitiveBrief || 'Sem conteúdo.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompetitiveOpen(false)}>Fechar</Button>
          {selectedClient?.id ? (
            <Button
              variant="contained"
              onClick={() => {
                setCompetitiveOpen(false);
                router.push(`/clients/${selectedClient.id}/reports`);
              }}
            >
              Ir para Reports
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Stack>
  );

  if (noShell) {
    return content;
  }

  return (
    <>
      <AppShell
        title="Radar"
        topbarLeft={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">Radar</Typography>
            <Typography variant="body2" color="text.secondary">/</Typography>
            <Typography variant="body2" fontWeight={600}>Clipping & Notícias</Typography>
          </Stack>
        }
      >
        {content}
      </AppShell>
      <PautaFromClippingModal
        open={pautaModal.open}
        suggestion={pautaModal.suggestion}
        onClose={() => setPautaModal({ open: false, suggestion: null })}
      />
    </>
  );
}
