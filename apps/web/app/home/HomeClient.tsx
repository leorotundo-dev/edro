'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconRefresh } from '@tabler/icons-react';

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
};

type CalendarEvent = {
  id: string;
  name: string;
  date?: string;
  score?: number;
  tier?: 'A' | 'B' | 'C';
  why?: string;
  source?: string;
};

type TodayResponse = {
  date: string;
  items: CalendarEvent[];
};

type UpcomingResponse = {
  from: string;
  to: string;
  items: CalendarEvent[];
};

type ClippingStats = {
  total_items?: number;
  new_items?: number;
  triaged_items?: number;
  items_last_7_days?: number;
  avg_score?: number;
};

type SocialStats = {
  summary?: {
    total?: number;
    positive?: number;
    neutral?: number;
    negative?: number;
    avg_score?: number;
  };
};

type PostAsset = {
  id: string;
  updated_at?: string | null;
  payload?: Record<string, any> | null;
};

const LAST_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

const formatDate = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR');
};

const formatNumber = (value?: number | null) => {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
};

const formatRelevance = (value?: string) => {
  if (!value) return '';
  const match = value.match(/base_relevance[:=]\s*(\d+)/i);
  if (!match) return value;
  return `Relevância: ${match[1]}%`;
};

export default function HomeClient() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [weekPosts, setWeekPosts] = useState<PostAsset[]>([]);
  const [clippingStats, setClippingStats] = useState<ClippingStats | null>(null);
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [softWarning, setSoftWarning] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClientRow[]>('/clients');
      const list = response || [];
      setClients(list);
      if (list.length) {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') : '';
        const match = stored ? list.find((client) => client.id === stored) : null;
        setSelectedClient(match || list[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async (client: ClientRow | null) => {
    if (!client) return;
    setLoading(true);
    setError('');
    setSoftWarning('');

    const safe = async <T,>(fn: () => Promise<T>) => {
      try {
        return { ok: true as const, data: await fn(), error: '' };
      } catch (err: any) {
        return { ok: false as const, data: null as any, error: err?.message || 'erro' };
      }
    };

    try {
      const [todayResp, upcomingResp, clippingResp, socialResp, postsResp] = await Promise.all([
        safe(() => apiGet<TodayResponse>(`/clients/${client.id}/calendar/today`)),
        safe(() => apiGet<UpcomingResponse>(`/clients/${client.id}/calendar/upcoming?days=14`)),
        safe(() => apiGet<{ stats: ClippingStats }>('/clipping/dashboard')),
        safe(() => apiGet<SocialStats>(`/social-listening/stats?clientId=${client.id}`)),
        safe(() => apiPost<PostAsset[]>('/search/posts', { client_id: client.id, limit: 100 })),
      ]);

      if (!todayResp.ok || !upcomingResp.ok) {
        setError('Falha ao carregar calendario do cliente.');
      } else {
        setError('');
      }

      setTodayEvents(todayResp.ok ? todayResp.data?.items || [] : []);
      setUpcomingEvents(upcomingResp.ok ? upcomingResp.data?.items || [] : []);

      if (clippingResp.ok) {
        const payload =
          (clippingResp.data as any)?.stats ??
          (clippingResp.data as any)?.data ??
          (clippingResp.data as any) ??
          null;
        setClippingStats(payload || null);
      } else if (String(clippingResp.error || '').includes('404')) {
        const fallback = await safe(() => apiGet<any[]>(`/clipping/items?recency=7d&limit=200`));
        if (fallback.ok && Array.isArray(fallback.data)) {
          const items = fallback.data;
          const total = items.length;
          const newItems = items.filter((item) => item.status === 'NEW').length;
          const triaged = items.filter((item) => item.status === 'TRIAGED').length;
          const avgScore =
            items.length > 0
              ? items.reduce((acc, item) => acc + Number(item.score || 0), 0) / items.length
              : 0;
          setClippingStats({
            total_items: total,
            new_items: newItems,
            triaged_items: triaged,
            items_last_7_days: total,
            avg_score: Number.isFinite(avgScore) ? Number(avgScore.toFixed(1)) : 0,
          });
        }
      } else {
        setClippingStats(null);
      }

      if (socialResp.ok) {
        setSocialStats(socialResp.data || null);
      } else {
        setSocialStats(null);
      }

      if (postsResp.ok) {
        const now = Date.now();
        const recent = (postsResp.data || []).filter((post) => {
          if (!post.updated_at) return false;
          const date = new Date(post.updated_at);
          if (Number.isNaN(date.getTime())) return false;
          return now - date.getTime() <= LAST_WEEK_MS;
        });
        recent.sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || '')).reverse();
        setWeekPosts(recent.slice(0, 8));
      } else {
        setWeekPosts([]);
      }

      if (
        clippingResp.error ||
        socialResp.error ||
        postsResp.error
      ) {
        setSoftWarning('Alguns indicadores nao puderam ser atualizados.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar resumo da home.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!selectedClient) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('edro_active_client_id', selectedClient.id);
    }
    loadDashboard(selectedClient);
  }, [selectedClient, loadDashboard]);

  const todayCount = todayEvents.length;
  const upcomingCount = upcomingEvents.length;
  const weekPostsCount = weekPosts.length;
  const clippingWeek = clippingStats?.items_last_7_days || 0;
  const socialSummary = socialStats?.summary || {};
  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const todayList = useMemo(() => todayEvents.slice(0, 6), [todayEvents]);
  const upcomingList = useMemo(() => upcomingEvents.slice(0, 8), [upcomingEvents]);

  if (loading && clients.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando home...
        </Typography>
      </Stack>
    );
  }

  return (
    <AppShell title="Home">
      <Stack spacing={3}>
        {/* Hero section */}
        <Card
          variant="outlined"
          sx={{
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: 'url(/modernize/images/backgrounds/welcome-bg2.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              spacing={3}
            >
              <Box>
                <Chip label={todayLabel} variant="outlined" size="small" sx={{ mb: 1 }} />
                <Typography variant="h4">Visao geral do dia</Typography>
                <Typography variant="body2" color="text.secondary">
                  Fotografia do que acontece hoje, o que vem a seguir e como foi a semana.
                </Typography>
              </Box>
              <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                <Typography variant="caption" color="text.secondary">
                  Cliente
                </Typography>
                <TextField
                  select
                  size="small"
                  value={selectedClient?.id || ''}
                  onChange={(event) => {
                    const match = clients.find((client) => client.id === event.target.value) || null;
                    setSelectedClient(match);
                  }}
                  sx={{ minWidth: 200 }}
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography variant="caption" color="text.secondary">
                  {selectedClient?.segment_primary || 'Resumo operacional'}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<IconRefresh size={16} />}
                  onClick={() => loadDashboard(selectedClient)}
                >
                  Atualizar
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {!error && softWarning ? <Alert severity="warning">{softWarning}</Alert> : null}

        {/* Metric cards */}
        <Grid container spacing={2}>
          {[
            { label: 'Eventos hoje', value: formatNumber(todayCount) },
            { label: 'Proximos 14 dias', value: formatNumber(upcomingCount) },
            { label: 'Criações 7 dias', value: formatNumber(weekPostsCount) },
            { label: 'Radar 7 dias', value: formatNumber(clippingWeek), accent: true },
          ].map((metric) => (
            <Grid key={metric.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card variant="outlined" sx={metric.accent ? { bgcolor: 'warning.light' } : {}}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    {metric.label}
                  </Typography>
                  <Typography variant="h5">{metric.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Main grid */}
        <Grid container spacing={2}>
          {/* Today events */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Chip label="Hoje" size="small" />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(new Date().toISOString())}
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  {todayList.length ? (
                    todayList.map((event) => (
                      <Box
                        key={`${event.id}-${event.name}`}
                        sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2">{event.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {event.tier ? `Tier ${event.tier}` : 'Evento'} · {formatRelevance(event.why)}
                            </Typography>
                          </Box>
                          <Chip size="small" label={event.score ?? 0} />
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sem eventos relevantes hoje.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Upcoming events */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Chip label="Em breve" size="small" />
                  <Typography variant="caption" color="text.secondary">
                    Proximos 14 dias
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  {upcomingList.length ? (
                    upcomingList.map((event) => (
                      <Box
                        key={`${event.id}-${event.date}`}
                        sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2">{event.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(event.date)} · {formatRelevance(event.why)}
                            </Typography>
                          </Box>
                          <Chip size="small" label={event.score ?? 0} />
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum evento previsto.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Week posts */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Chip label="Performance da semana" size="small" />
                </Stack>
                <Stack spacing={1}>
                  {weekPosts.length ? (
                    weekPosts.map((post) => {
                      const payload = post.payload || {};
                      const title =
                        payload.theme ||
                        payload.title ||
                        payload.event ||
                        payload.format ||
                        'Criacao recente';
                      const subtitle =
                        payload.platform ||
                        payload.format ||
                        payload.objective ||
                        payload.status ||
                        'Atualizado recentemente';
                      return (
                        <Box
                          key={post.id}
                          sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="subtitle2">{title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {subtitle} · {formatDate(post.updated_at)}
                              </Typography>
                            </Box>
                            <Chip size="small" label="Ok" color="success" />
                          </Stack>
                        </Box>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma criacao na ultima semana.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Radar and social */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Chip label="Radar e Social" size="small" />
                </Stack>
                <Stack spacing={1}>
                  <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2">Clipping (7 dias)</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Novos: {formatNumber(clippingStats?.new_items)}
                        </Typography>
                      </Box>
                      <Chip size="small" label={formatNumber(clippingWeek)} />
                    </Stack>
                  </Box>
                  <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2">Sentimento medio</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Positivas: {formatNumber(socialSummary.positive)} · Negativas:{' '}
                          {formatNumber(socialSummary.negative)}
                        </Typography>
                      </Box>
                      <Chip size="small" label={`${formatNumber(socialSummary.avg_score)}%`} />
                    </Stack>
                  </Box>
                  <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2">Volume social</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total de mencoes
                        </Typography>
                      </Box>
                      <Chip size="small" label={formatNumber(socialSummary.total)} />
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </AppShell>
  );
}
