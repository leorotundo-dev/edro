'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import { apiGet, apiPost } from '@/lib/api';
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
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
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
  const [sourceScope, setSourceScope] = useState('GLOBAL');
  const [ingestUrl, setIngestUrl] = useState('');
  const [savingSource, setSavingSource] = useState(false);
  const [ingesting, setIngesting] = useState(false);

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
      const response = await apiGet<any>('/clipping/dashboard');
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
  }, []);

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

      const merged = [...(clientSources || []), ...(globalSources || [])];
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
    const qs = new URLSearchParams();
    if (statusFilter) qs.set('status', statusFilter);
    if (typeFilter) qs.set('type', typeFilter);
    if (recencyFilter) qs.set('recency', recencyFilter);
    if (minScore) qs.set('minScore', minScore);
    if (query) qs.set('q', query);
    if (selectedClient?.id) qs.set('clientId', selectedClient.id);

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
      await apiPost('/clipping/sources', {
        scope: sourceScope,
        client_id: sourceScope === 'CLIENT' ? selectedClient?.id : undefined,
        name: sourceName.trim(),
        url: sourceUrl.trim(),
        type: sourceType,
      });
      setSourceName('');
      setSourceUrl('');
      setSuccess('Fonte adicionada.');
      await loadSources();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar fonte.');
    } finally {
      setSavingSource(false);
    }
  };

  const handleIngestUrl = async () => {
    if (!ingestUrl.trim()) return;
    setIngesting(true);
    setError('');
    setSuccess('');
    try {
      await apiPost('/clipping/items/ingest-url', { url: ingestUrl.trim() });
      setSuccess('URL ingerida com sucesso.');
      setIngestUrl('');
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Falha ao ingerir URL.');
    } finally {
      setIngesting(false);
    }
  };

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
              disabled={isLocked}
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
          <Grid size={{ xs: 12, md: 2 }}>
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
                      onClick={() => router.push(`/clipping/${item.id}`)}
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
                            <Chip size="small" label={`Score ${formatNumber(item.score)}`} color="primary" variant="outlined" />
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
            <DashboardCard title="Fontes" action={<Chip size="small" label={`${sources.length} cadastradas`} color="info" variant="outlined" />}>
              <Stack spacing={1}>
                {sources.length ? (
                  sources.map((source) => (
                    <Box key={source.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, transition: 'all 0.2s', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconRss size={16} />
                          <Typography variant="subtitle2">{source.name}</Typography>
                        </Stack>
                        <Chip size="small" label={source.type} variant="outlined" />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{source.url}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip size="small" label={source.scope} variant="outlined" />
                        <Chip size="small" label={source.is_active ? 'Ativa' : 'Pausada'} color={source.is_active ? 'success' : 'default'} />
                      </Stack>
                    </Box>
                  ))
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
