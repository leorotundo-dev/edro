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
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
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

const STATUS_OPTIONS = [
  { value: '', label: 'Todos status' },
  { value: 'NEW', label: 'Novos' },
  { value: 'TRIAGED', label: 'Triados' },
  { value: 'PINNED', label: 'Fixados' },
  { value: 'ARCHIVED', label: 'Arquivados' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Todos tipos' },
  { value: 'NEWS', label: 'Noticias' },
  { value: 'TREND', label: 'Tendencias' },
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
      setError('Selecione um cliente para analise.');
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
      setError('Selecione ate 10 materias para analise.');
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
      setSuccess(`Analise de concorrencia gerada com ${selectedAssets.length} ativo(s).`);
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar analise de concorrencia.');
    } finally {
      setCompetitiveLoading(false);
    }
  };

  const errorSourceCount = useMemo(
    () => sources.filter((s) => s.status === 'ERROR' || s.last_error).length,
    [sources]
  );

  const totalLabel = useMemo(() => `${items.length} itens`, [items.length]);

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
        <Typography variant="h4" fontWeight={700}>Radar & Clipping</Typography>
        <Typography variant="body2" color="text.secondary">
          Fontes configuradas, triagem inteligente e acionamento de posts.
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

      <DashboardCard title="Filtros" subtitle={`${selectedClient?.name || 'Global'} -- ${selectedClient?.segment_primary || 'Radar global'}`} action={<Chip size="small" label={totalLabel} color="primary" variant="outlined" />}>
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

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" startIcon={<IconRefresh size={16} />} onClick={loadItems}>
            Atualizar
          </Button>
        </Stack>
      </DashboardCard>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <DashboardCard
            title="Itens"
            action={
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={totalLabel} color="primary" variant="outlined" />
                <Chip size="small" label={`${selectedItemIds.length} selecionados`} variant="outlined" />
                <Button size="small" variant="outlined" onClick={handleSelectTopTen}>
                  Selecionar top 10
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<IconSparkles size={14} />}
                  onClick={handleRunCompetitiveIntel}
                  disabled={competitiveLoading || selectedItemIds.length === 0}
                >
                  {competitiveLoading ? 'Analisando...' : 'Analisar concorrencia'}
                </Button>
              </Stack>
            }
          >
            {items.length ? (() => {
              const goDetail = (item: ClippingItem) => {
                if (!item?.id) return;
                const href = embedded && lockedClientId
                  ? `/clients/${encodeURIComponent(lockedClientId)}/clipping?item=${encodeURIComponent(item.id)}`
                  : `/clipping/${item.id}`;
                router.push(href);
              };
              const itemActions = (item: ClippingItem, light = false) => (
                <Stack direction="row" spacing={0.5} alignItems="center" onClick={(e) => e.stopPropagation()}>
                  {(selectedClient?.id || lockedClientId) && (
                    <Button
                      size="small"
                      variant={light ? 'contained' : 'outlined'}
                      onClick={(e) => {
                        e.stopPropagation();
                        const cid = selectedClient?.id || lockedClientId;
                        if (!cid) return;
                        router.push(`/studio/brief?clientId=${encodeURIComponent(cid)}&title=${encodeURIComponent(item.title || 'Pauta')}&source=clipping&sourceId=${encodeURIComponent(item.id)}`);
                      }}
                      sx={light ? { fontSize: '0.7rem', py: 0.25, px: 1, bgcolor: '#E85219', '&:hover': { bgcolor: '#c94315' } } : { fontSize: '0.7rem', py: 0.25, px: 1, borderColor: '#E85219', color: '#E85219', textTransform: 'none' }}
                    >
                      Criar Pauta
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

              const featured = items.slice(0, 2);
              const rest = items.slice(2);

              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* ── Featured cards (first 2) ── */}
                  <Grid container spacing={2}>
                    {featured.map((item) => {
                      const badge = statusChip(item.status);
                      const bg = TYPE_GRADIENTS[item.type || 'NEWS'] ?? TYPE_GRADIENTS.NEWS;
                      return (
                        <Grid key={item.id} size={{ xs: 12, sm: 6 }}>
                          <Card
                            sx={{
                              position: 'relative',
                              height: 260,
                              cursor: 'pointer',
                              overflow: 'hidden',
                              borderRadius: 3,
                              ...(item.image_url
                                ? { backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                                : { background: bg }),
                              '&:hover .card-overlay': { opacity: 1 },
                            }}
                            onClick={() => goDetail(item)}
                          >
                            {/* dark overlay */}
                            <Box sx={{ position: 'absolute', inset: 0, background: item.image_url ? 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.1) 100%)' : 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
                            {/* hover tint */}
                            <Box className="card-overlay" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(232,82,25,0.1)', opacity: 0, transition: 'opacity 0.2s' }} />

                            {/* top row */}
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ position: 'absolute', top: 12, left: 12, right: 12 }} onClick={(e) => e.stopPropagation()}>
                              <Checkbox size="small" checked={selectedItemIds.includes(item.id)} onChange={(e) => toggleItemSelection(item.id, e.target.checked)} sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' }, p: 0.5 }} />
                              <Stack direction="row" spacing={0.5}>
                                <Chip size="small" label={item.type || 'NEWS'} sx={{ bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '0.6rem', height: 20, backdropFilter: 'blur(4px)' }} />
                                <Chip size="small" color={badge.color} label={badge.label} sx={{ fontSize: '0.6rem', height: 20 }} />
                              </Stack>
                            </Stack>

                            {/* bottom content */}
                            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2 }}>
                              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#fff', mb: 0.75, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                                {item.title}
                              </Typography>
                              <Stack direction="row" alignItems="center">
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.source_name || 'Fonte'} · {item.published_at ? new Date(item.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '--'}
                                </Typography>
                                <Chip size="small" label={item.client_score != null ? formatNumber(item.client_score) : formatNumber(item.score)} sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.6rem', height: 20, ml: 1 }} />
                              </Stack>
                              <Box sx={{ mt: 1 }}>{itemActions(item, true)}</Box>
                            </Box>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>

                  {/* ── Regular grid (remaining items) ── */}
                  {rest.length > 0 && (
                    <Grid container spacing={2}>
                      {rest.map((item) => {
                        const badge = statusChip(item.status);
                        const bg = TYPE_GRADIENTS[item.type || 'NEWS'] ?? TYPE_GRADIENTS.NEWS;
                        return (
                          <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card
                              variant="outlined"
                              sx={{ cursor: 'pointer', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s, box-shadow 0.2s', '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 16px rgba(232,82,25,0.12)' } }}
                              onClick={() => goDetail(item)}
                            >
                              {/* thumbnail */}
                              <Box sx={{ height: 130, position: 'relative', flexShrink: 0, ...(item.image_url ? { backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: bg }) }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ position: 'absolute', top: 8, left: 8, right: 8 }} onClick={(e) => e.stopPropagation()}>
                                  <Checkbox size="small" checked={selectedItemIds.includes(item.id)} onChange={(e) => toggleItemSelection(item.id, e.target.checked)} sx={{ color: 'rgba(255,255,255,0.75)', '&.Mui-checked': { color: '#fff' }, p: 0.5 }} />
                                  <Chip size="small" label={item.type || 'NEWS'} sx={{ bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '0.6rem', height: 20, backdropFilter: 'blur(4px)' }} />
                                </Stack>
                              </Box>

                              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: 1.5, pb: '12px !important' }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>
                                  {item.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5, mb: 1 }}>
                                  {item.snippet || ''}
                                </Typography>
                                <Stack direction="row" alignItems="center">
                                  <Typography variant="caption" color="text.disabled" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.source_name || 'Fonte'} · {item.published_at ? new Date(item.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '--'}
                                  </Typography>
                                  <Chip size="small" color={badge.color} label={badge.label} sx={{ fontSize: '0.6rem', height: 20 }} />
                                </Stack>
                                <Box sx={{ mt: 1 }}>{itemActions(item)}</Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </Box>
              );
            })() : (
                <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
                  <IconNews size={36} color="#bdbdbd" />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Nenhum item encontrado
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 280 }}>
                    Tente ajustar os filtros ou adicione novas fontes para começar a capturar conteúdo.
                  </Typography>
                  <Button size="small" variant="outlined" startIcon={<IconRefresh size={14} />} onClick={() => loadItems()}>
                    Recarregar
                  </Button>
                </Stack>
            )}
          </DashboardCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            <DashboardCard
              title="Fontes"
              action={
                <Stack direction="row" spacing={1} alignItems="center">
                  {errorSourceCount > 0 && (
                    <Chip size="small" icon={<IconAlertTriangle size={14} />} label={`${errorSourceCount} com erro`} color="error" variant="outlined" />
                  )}
                  <Chip size="small" label={`${sources.length} fontes`} color="info" variant="outlined" />
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
                    const hasError = source.status === 'ERROR' || !!source.last_error;
                    const isPaused = !source.is_active;
                    const statusColor = isPaused ? 'default' : hasError ? 'error' : 'success';
                    const statusLabel = isPaused ? 'Pausada' : hasError ? 'Erro' : 'OK';

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

                        {hasError && source.last_error && (
                          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                            {source.last_error}
                          </Typography>
                        )}

                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} alignItems="center">
                          <Chip size="small" label={source.scope} variant="outlined" />
                          <Typography variant="caption" color="text.secondary">
                            Fetch: {timeAgo(source.last_fetched_at)}
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
                      Adicione uma fonte abaixo para começar a monitorar conteúdo.
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </DashboardCard>

            <DashboardCard title="Nova fonte">
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
                  label="Incluir keywords (virgula)"
                  value={sourceIncludeKw}
                  onChange={(event) => setSourceIncludeKw(event.target.value)}
                  size="small"
                  helperText="So ingerir itens com estas palavras"
                />
                <TextField
                  label="Excluir keywords (virgula)"
                  value={sourceExcludeKw}
                  onChange={(event) => setSourceExcludeKw(event.target.value)}
                  size="small"
                  helperText="Ignorar itens com estas palavras"
                />
                <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={handleSaveSource} disabled={savingSource}>
                  {savingSource ? 'Salvando...' : 'Adicionar fonte'}
                </Button>
              </Stack>
            </DashboardCard>

            <DashboardCard title="Ingerir URL">
              <Stack spacing={2}>
                <TextField label="URL" value={ingestUrl} onChange={(event) => setIngestUrl(event.target.value)} size="small" />
                <Button variant="contained" onClick={handleIngestUrl} disabled={ingesting}>
                  {ingesting ? 'Ingerindo...' : 'Ingerir'}
                </Button>
              </Stack>
            </DashboardCard>
          </Stack>
        </Grid>
      </Grid>

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
    <AppShell
      title="Radar"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Radar</Typography>
          <Typography variant="body2" color="text.secondary">/</Typography>
          <Typography variant="body2" fontWeight={600}>Clipping & Noticias</Typography>
        </Stack>
      }
    >
      {content}
    </AppShell>
  );
}
