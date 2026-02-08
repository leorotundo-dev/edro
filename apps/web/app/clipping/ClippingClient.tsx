'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
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
  IconWorld,
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
  { value: '', label: 'Periodo' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

const STAT_CARDS = [
  { key: 'total_items', label: 'Total', icon: IconNews, color: '#5D87FF' },
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
        setError('Cliente invalido para criar fonte.');
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
    if (!window.confirm(`Excluir fonte "${name}"?`)) return;
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
            <TextField select label="Periodo" value={recencyFilter} onChange={(e) => setRecencyFilter(e.target.value)} fullWidth size="small">
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
          <DashboardCard title="Itens" action={<Chip size="small" label={totalLabel} color="primary" variant="outlined" />}>
            <Stack spacing={1}>
              {items.length ? (
                items.map((item) => {
                  const badge = statusChip(item.status);
                  return (
                    <Card
                      key={item.id}
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.main', boxShadow: '0 2px 12px rgba(93,135,255,0.15)' },
                      }}
                      onClick={() => {
                        if (!item?.id) return;
                        router.push(`/clipping/${item.id}`);
                      }}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                            <Avatar variant="rounded" src={item.image_url || undefined} sx={{ bgcolor: 'grey.100', width: 56, height: 56 }}>
                              <IconWorld size={20} />
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" noWrap>{item.title}</Typography>
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                {item.snippet || 'Sem resumo.'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {formatSource(item.source_name, item.source_url)} -- {formatDate(item.published_at)}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                            <Chip size="small" label={item.type || 'NEWS'} variant="outlined" />
                            <Chip
                              size="small"
                              label={item.client_score != null ? `Relevância ${formatNumber(item.client_score)}` : `Score ${formatNumber(item.score)}`}
                              color={item.client_score != null && item.client_score >= 0.7 ? 'success' : 'primary'}
                              variant="outlined"
                            />
                            <Chip size="small" color={badge.color} label={badge.label} />
                            {item.url ? (
                              <Button
                                size="small"
                                variant="text"
                                startIcon={<IconExternalLink size={14} />}
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Abrir
                              </Button>
                            ) : null}
                            <Button
                              size="small"
                              variant="text"
                              color="error"
                              startIcon={<IconThumbDown size={14} />}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRejectItem(item.id);
                              }}
                              sx={{ minWidth: 'auto', px: 1 }}
                            >
                              Rejeitar
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Nenhum item encontrado.
                </Typography>
              )}
            </Stack>
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
                  <Typography variant="body2" color="text.secondary">Nenhuma fonte cadastrada.</Typography>
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
