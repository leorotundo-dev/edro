'use client';
/**
 * Admin Integrations — Agency-level capture channels
 * Gmail, Google Calendar, Instagram DMs
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppShell from '@/components/AppShell';
import {
  IconBrandGmail,
  IconBrandGoogle,
  IconBrandInstagram,
  IconCalendar,
  IconRobot,
  IconPlugConnected,
  IconRefresh,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';

type GmailStatus = {
  configured: boolean;
  email?: string;
  watchExpiry?: string;
  lastSyncAt?: string;
  connectedAt?: string;
  stats?: { totalThreads: number; processedThreads: number };
};

type CalendarStatus = {
  configured: boolean;
  email?: string;
  expiresAt?: string;
  calendarId?: string;
  watchStatus?: string;
  expiresSoon?: boolean;
  expired?: boolean;
  lastWatchRenewedAt?: string;
  lastWatchError?: string;
  lastNotificationAt?: string;
  lastNotificationState?: string;
  stats?: { totalMeetings: number; enqueuedMeetings: number };
};

type AutoJoin = {
  id: string;
  event_title: string | null;
  video_url: string | null;
  video_platform: string | null;
  organizer_email: string | null;
  scheduled_at: string | null;
  job_enqueued_at: string | null;
  meeting_id: string | null;
  client_id: string | null;
  client_match_source: string | null;
  bot_id: string | null;
  status: string;
  last_error: string | null;
  attempt_count: number | null;
  processed_at: string | null;
  created_at: string;
};

type OAuthStartResponse = {
  url: string;
};

type AutoJoinFilter = 'all' | 'attention' | 'active' | 'done';

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

function shortValue(value?: string | null, limit = 28) {
  if (!value) return '—';
  return value.length > limit ? `${value.slice(0, limit - 10)}...${value.slice(-7)}` : value;
}

function watchChip(calendar: CalendarStatus | null) {
  if (!calendar?.configured) return <Chip label="Desconectado" size="small" color="default" />;
  if (calendar.expired) return <Chip label="Watch expirado" size="small" color="error" />;
  if (calendar.watchStatus === 'error') return <Chip label="Watch com erro" size="small" color="error" />;
  if (calendar.expiresSoon) return <Chip label="Expira em breve" size="small" color="warning" />;
  return <Chip label="Watch ativo" size="small" color="success" />;
}

function autoJoinStatusChip(status: string) {
  const color =
    status === 'done' ? 'success'
      : status === 'failed' ? 'error'
        : status === 'processing' || status === 'waiting' || status === 'queued' || status === 'bot_created' ? 'warning'
          : 'default';
  return <Chip label={status} size="small" color={color} variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />;
}

function isAutoJoinCritical(item: AutoJoin) {
  return item.status === 'failed' || Boolean(item.last_error);
}

function matchesAutoJoinFilter(item: AutoJoin, filter: AutoJoinFilter) {
  if (filter === 'all') return true;
  if (filter === 'attention') return item.status === 'failed' || Boolean(item.last_error);
  if (filter === 'active') {
    return ['detected', 'queued', 'meeting_created', 'bot_created', 'waiting', 'processing'].includes(item.status);
  }
  if (filter === 'done') return item.status === 'done';
  return true;
}

function autoJoinSortScore(item: AutoJoin) {
  if (item.status === 'failed' || item.last_error) return 0;
  if (['detected', 'queued', 'meeting_created', 'bot_created', 'waiting', 'processing'].includes(item.status)) return 1;
  if (item.status === 'done') return 3;
  return 2;
}

function autoJoinSortDate(item: AutoJoin) {
  if (item.status === 'done') {
    return -(new Date(item.processed_at ?? item.scheduled_at ?? item.created_at).getTime() || 0);
  }
  return new Date(item.scheduled_at ?? item.created_at).getTime() || 0;
}

export default function IntegrationsClient() {
  const searchParams = useSearchParams();
  const requestedAutoJoinId = searchParams.get('autoJoinId');
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [autoJoins, setAutoJoins] = useState<AutoJoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewingCalendar, setRenewingCalendar] = useState(false);
  const [requeueingAutoJoinId, setRequeueingAutoJoinId] = useState<string | null>(null);
  const [autoJoinFilter, setAutoJoinFilter] = useState<AutoJoinFilter>('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gmailRes, calRes, autoJoinRes] = await Promise.all([
        apiGet<GmailStatus>('/gmail/status').catch(() => ({ configured: false } as GmailStatus)),
        apiGet<CalendarStatus>('/calendar/watch-status').catch(() => ({ configured: false } as CalendarStatus)),
        apiGet<{ data: AutoJoin[] }>('/calendar/auto-joins').catch(() => ({ data: [] as AutoJoin[] })),
      ]);
      setGmail(gmailRes ?? { configured: false });
      setCalendar(calRes ?? { configured: false });
      setAutoJoins(autoJoinRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const redirectToOAuth = async (path: string) => {
    try {
      const response = await apiGet<OAuthStartResponse>(`${path}?mode=json`);
      if (!response?.url) {
        throw new Error('URL de autenticação não disponível.');
      }
      window.location.assign(response.url);
    } catch (e: any) {
      setError(e.message || 'Falha ao iniciar autenticação Google.');
    }
  };

  const handleGmailConnect = async () => {
    await redirectToOAuth('/auth/google/start');
  };

  const handleGmailDisconnect = async () => {
    if (!confirm('Desconectar o Gmail? Os emails não serão mais monitorados.')) return;
    await apiDelete('/gmail/disconnect');
    load();
  };

  const handleCalendarConnect = async () => {
    await redirectToOAuth('/auth/google/calendar/start');
  };

  const handleCalendarDisconnect = async () => {
    if (!confirm('Desconectar o Google Calendar?')) return;
    await apiDelete('/calendar/disconnect');
    load();
  };

  const handleCalendarRenew = async () => {
    setRenewingCalendar(true);
    try {
      await apiPost('/calendar/watch/renew');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRenewingCalendar(false);
    }
  };

  const handleAutoJoinRequeue = async (autoJoinId: string) => {
    setRequeueingAutoJoinId(autoJoinId);
    setError('');
    try {
      await apiPost(`/calendar/auto-joins/${autoJoinId}/requeue`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Falha ao reenfileirar auto-join.');
    } finally {
      setRequeueingAutoJoinId(null);
    }
  };

  const gmailConnected = searchParams.get('gmail_connected');
  const gmailError = searchParams.get('gmail_error');
  const calendarConnected = searchParams.get('calendar_connected');
  const calendarError = searchParams.get('calendar_error');
  const autoJoinCounts = {
    all: autoJoins.length,
    attention: autoJoins.filter((item) => matchesAutoJoinFilter(item, 'attention')).length,
    active: autoJoins.filter((item) => matchesAutoJoinFilter(item, 'active')).length,
    done: autoJoins.filter((item) => matchesAutoJoinFilter(item, 'done')).length,
  };
  const visibleAutoJoins = [...autoJoins]
    .filter((item) => matchesAutoJoinFilter(item, autoJoinFilter))
    .sort((left, right) => {
      if (requestedAutoJoinId) {
        if (left.id === requestedAutoJoinId) return -1;
        if (right.id === requestedAutoJoinId) return 1;
      }
      const scoreDelta = autoJoinSortScore(left) - autoJoinSortScore(right);
      if (scoreDelta !== 0) return scoreDelta;
      return autoJoinSortDate(left) - autoJoinSortDate(right);
    });

  return (
    <AppShell title="Integrações">
      <Box sx={{ maxWidth: 900, mx: 'auto', py: 3, px: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            <IconPlugConnected size={22} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>Integrações da Agência</Typography>
            <Typography variant="body2" color="text.secondary">
              Canais de captura de informação dos clientes — Gmail, Google Calendar, Instagram DMs.
            </Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {gmailConnected && <Alert severity="success" sx={{ mb: 2 }}>Gmail conectado: {gmailConnected}</Alert>}
        {gmailError && <Alert severity="error" sx={{ mb: 2 }}>Falha ao conectar Gmail: {gmailError}</Alert>}
        {calendarConnected && <Alert severity="success" sx={{ mb: 2 }}>Google Calendar conectado: {calendarConnected}</Alert>}
        {calendarError && <Alert severity="error" sx={{ mb: 2 }}>Falha ao conectar Google Calendar: {calendarError}</Alert>}

        {loading ? (
          <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
        ) : (
          <Stack spacing={2}>

            {/* ── Gmail ── */}
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: '#EA4335', width: 40, height: 40 }}>
                      <IconBrandGmail size={22} />
                    </Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle1" fontWeight={700}>Gmail</Typography>
                        {gmail?.configured ? (
                          <Chip label="Conectado" size="small" color="success" />
                        ) : (
                          <Chip label="Desconectado" size="small" color="default" />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {gmail?.configured
                          ? `${gmail.email} · ${gmail.stats?.totalThreads ?? 0} emails · ${gmail.stats?.processedThreads ?? 0} briefings gerados`
                          : 'Monitora a inbox do Gmail para capturar pedidos dos clientes'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    {gmail?.configured ? (
                      <>
                        <Button size="small" startIcon={<IconRefresh size={14} />} onClick={load}>
                          Atualizar
                        </Button>
                        <Button size="small" color="error" startIcon={<IconTrash size={14} />} onClick={handleGmailDisconnect}>
                          Desconectar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<IconBrandGoogle size={16} />}
                        onClick={handleGmailConnect}
                        sx={{ bgcolor: '#EA4335', '&:hover': { bgcolor: '#c0392b' } }}
                      >
                        Conectar Gmail
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {gmail?.configured && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Conectado em {gmail.connectedAt ? new Date(gmail.connectedAt).toLocaleDateString('pt-BR') : '—'}
                      {' · '}
                      Watch expira em {gmail.watchExpiry ? new Date(gmail.watchExpiry).toLocaleDateString('pt-BR') : '—'}
                      {gmail.lastSyncAt && ` · Último sync ${new Date(gmail.lastSyncAt).toLocaleString('pt-BR')}`}
                    </Typography>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                  Emails de clientes chegam ao Jarvis automaticamente. O Jarvis identifica pedidos de conteúdo e cria briefings.
                  Configure o Pub/Sub no Google Cloud e defina a variável <code>GOOGLE_PUBSUB_TOPIC</code>.
                </Typography>
              </CardContent>
            </Card>

            {/* ── Google Calendar ── */}
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: '#F9AB00', width: 40, height: 40 }}>
                      <IconCalendar size={22} />
                    </Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle1" fontWeight={700}>Google Calendar</Typography>
                        {watchChip(calendar)}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {calendar?.configured
                          ? `${calendar.email} · ${calendar.stats?.totalMeetings ?? 0} reuniões detectadas · ${calendar.stats?.enqueuedMeetings ?? 0} bots enfileirados`
                          : 'Detecta eventos com Meet/Zoom/Teams e enfileira o bot automaticamente'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    {calendar?.configured ? (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          color={calendar?.expired || calendar?.expiresSoon ? 'warning' : 'primary'}
                          onClick={handleCalendarRenew}
                          disabled={renewingCalendar}
                          startIcon={renewingCalendar ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={14} />}
                        >
                          {renewingCalendar ? 'Renovando...' : 'Renovar Watch'}
                        </Button>
                        <Button size="small" startIcon={<IconRefresh size={14} />} onClick={load}>
                          Atualizar
                        </Button>
                        <Button size="small" color="error" startIcon={<IconTrash size={14} />} onClick={handleCalendarDisconnect}>
                          Desconectar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<IconCalendar size={16} />}
                        onClick={handleCalendarConnect}
                        sx={{ bgcolor: '#F9AB00', color: '#000', '&:hover': { bgcolor: '#f59e0b' } }}
                      >
                        Conectar Calendar
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {calendar?.configured && (
                  <>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                      <Chip label={`Status: ${calendar.watchStatus ?? 'unknown'}`} size="small" variant="outlined" />
                      <Chip label={`Expira: ${fmtDateTime(calendar.expiresAt)}`} size="small" variant="outlined" />
                      <Chip label={`Ultima renovacao: ${fmtDateTime(calendar.lastWatchRenewedAt)}`} size="small" variant="outlined" />
                      <Chip label={`Ultima notificacao: ${fmtDateTime(calendar.lastNotificationAt)}`} size="small" variant="outlined" />
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      <Chip label={`Calendar ID: ${shortValue(calendar.calendarId)}`} size="small" variant="outlined" />
                      <Chip label={`Notification state: ${calendar.lastNotificationState ?? '—'}`} size="small" variant="outlined" />
                      <Chip label={`${calendar.stats?.totalMeetings ?? 0} eventos detectados`} size="small" color="info" variant="outlined" />
                      <Chip label={`${calendar.stats?.enqueuedMeetings ?? 0} bots enfileirados`} size="small" color="success" variant="outlined" />
                    </Stack>

                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        O watch precisa ser renovado semanalmente. O estado correto aqui é: notificações recentes, sem erro e sem expiração iminente.
                      </Typography>
                    </Box>

                    {calendar.lastWatchError && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        Último erro do watch: {calendar.lastWatchError}
                      </Alert>
                    )}

                    <Box sx={{ mt: 2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          Últimos auto-joins detectados
                        </Typography>
                        <Button size="small" variant="text" href="/admin/reunioes">
                          Abrir Meeting Ops
                        </Button>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                        {([
                          ['all', 'Todos'],
                          ['attention', 'Atenção'],
                          ['active', 'Em fila'],
                          ['done', 'Concluídos'],
                        ] as Array<[AutoJoinFilter, string]>).map(([value, label]) => (
                          <Chip
                            key={value}
                            label={`${label} (${autoJoinCounts[value]})`}
                            clickable
                            color={autoJoinFilter === value ? 'primary' : 'default'}
                            variant={autoJoinFilter === value ? 'filled' : 'outlined'}
                            onClick={() => setAutoJoinFilter(value)}
                          />
                        ))}
                      </Stack>

                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Falhas e itens com erro sobem para o topo. Depois, a fila operacional vem antes dos concluídos.
                      </Typography>

                      {requestedAutoJoinId && (
                        <Alert severity="info" sx={{ mb: 1.5 }}>
                          Auto-join aberto a partir do Meeting Ops. O item vinculado foi priorizado na lista.
                        </Alert>
                      )}

                      {visibleAutoJoins.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          {autoJoins.length === 0
                            ? 'Nenhum evento detectado ainda pelo Google Calendar.'
                            : 'Nenhum auto-join encontrado para esse filtro.'}
                        </Typography>
                      ) : (
                        <Stack spacing={1}>
                          {visibleAutoJoins.slice(0, 5).map((item) => (
                            <Box
                              key={item.id}
                              sx={{
                                p: 1.25,
                                border: 1,
                                borderColor:
                                  item.id === requestedAutoJoinId ? 'primary.main'
                                    : isAutoJoinCritical(item) ? 'error.main'
                                      : item.status === 'done' ? 'success.main'
                                        : 'divider',
                                borderRadius: 1.5,
                                bgcolor:
                                  item.id === requestedAutoJoinId ? 'action.selected'
                                    : isAutoJoinCritical(item) ? 'rgba(211, 47, 47, 0.06)'
                                      : item.status === 'queued' || item.status === 'processing' || item.status === 'waiting' || item.status === 'bot_created'
                                        ? 'rgba(249, 171, 0, 0.06)'
                                        : 'background.paper',
                                boxShadow: isAutoJoinCritical(item) ? '0 0 0 1px rgba(211, 47, 47, 0.08)' : 'none',
                              }}
                            >
                              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap" useFlexGap>
                                <Box>
                                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                                    {item.event_title || 'Evento sem título'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.video_platform || 'video'} · {fmtDateTime(item.scheduled_at)} · {item.organizer_email || 'sem organizer'}
                                  </Typography>
                                </Box>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                  {isAutoJoinCritical(item) && (
                                    <Chip
                                      label="Atenção operacional"
                                      size="small"
                                      color="error"
                                      sx={{ fontSize: '0.68rem', height: 20, fontWeight: 700 }}
                                    />
                                  )}
                                  {item.id === requestedAutoJoinId && (
                                    <Chip
                                      label="Vindo da reunião"
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                      sx={{ fontSize: '0.68rem', height: 20 }}
                                    />
                                  )}
                                  {autoJoinStatusChip(item.status)}
                                  {item.meeting_id && (
                                    <Button
                                      size="small"
                                      variant="text"
                                      href={`/admin/reunioes?meetingId=${encodeURIComponent(item.meeting_id)}`}
                                      sx={{ minWidth: 0, py: 0.4, px: 1 }}
                                    >
                                      Abrir reunião
                                    </Button>
                                  )}
                                  {item.status !== 'done' && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => void handleAutoJoinRequeue(item.id)}
                                      disabled={requeueingAutoJoinId !== null}
                                      startIcon={requeueingAutoJoinId === item.id ? <CircularProgress size={12} color="inherit" /> : <IconRefresh size={13} />}
                                      sx={{ minWidth: 0, py: 0.4, px: 1 }}
                                    >
                                      {requeueingAutoJoinId === item.id ? 'Reenfileirando...' : 'Requeue'}
                                    </Button>
                                  )}
                                </Stack>
                              </Stack>

                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                <Chip label={`Match: ${item.client_match_source ?? '—'}`} size="small" variant="outlined" sx={{ fontSize: '0.66rem', height: 20 }} />
                                <Chip label={`Tentativas: ${item.attempt_count ?? 0}`} size="small" variant="outlined" sx={{ fontSize: '0.66rem', height: 20 }} />
                                <Chip label={`Job: ${item.job_enqueued_at ? fmtDateTime(item.job_enqueued_at) : 'não enfileirado'}`} size="small" variant="outlined" sx={{ fontSize: '0.66rem', height: 20 }} />
                                <Chip label={`Processado: ${fmtDateTime(item.processed_at)}`} size="small" variant="outlined" sx={{ fontSize: '0.66rem', height: 20 }} />
                              </Stack>

                              {item.last_error && (
                                <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1, lineHeight: 1.5 }}>
                                  {item.last_error}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                  Quando um evento com Google Meet, Zoom ou Teams é criado no calendário, o bot de reunião é enfileirado
                  automaticamente 5 minutos antes. Requer <code>GOOGLE_CALENDAR_WEBHOOK_URL</code>.
                </Typography>
              </CardContent>
            </Card>

            {/* ── Recall Meeting Bot ── */}
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: '#111827', width: 40, height: 40 }}>
                      <IconRobot size={22} />
                    </Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle1" fontWeight={700}>Recall.ai</Typography>
                        <Chip label="Bot de reunião" size="small" color="info" />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Entrada ao vivo nas calls + transcrição + análise automática no módulo de reuniões.
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" href="/clients">
                      Abrir clientes
                    </Button>
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2 }} />
                <Stack spacing={0.75}>
                  <Typography variant="caption" color="text.secondary">
                    1. Para uso manual imediato, vá em um cliente → <strong>Reuniões</strong> → <strong>Agendar bot ao vivo</strong>.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    2. Para automação completa, conecte o Google Calendar nesta tela.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    3. Se o Google Meet exigir usuário autenticado, configure também <code>RECALL_GOOGLE_LOGIN_GROUP_ID</code>.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* ── Instagram DMs ── */}
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: '#E1306C', width: 40, height: 40 }}>
                      <IconBrandInstagram size={22} />
                    </Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle1" fontWeight={700}>Instagram DMs</Typography>
                        <Chip label="Via Meta Webhook" size="small" color="info" />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Mensagens diretas no Instagram chegam ao Jarvis. Conectado ao Meta OAuth.
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Configuração necessária:</Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    <ol style={{ margin: 0, paddingLeft: 16, lineHeight: 2 }}>
                      <li>No painel Meta Developers → Seu App → Webhooks → Instagram → Subscribe: <code>messages</code></li>
                      <li>URL do callback: <code>https://api.edro.digital/webhook/instagram</code></li>
                      <li>Verify Token: valor da variável <code>META_VERIFY_TOKEN</code> no servidor</li>
                      <li>Conecte a conta Instagram via OAuth em cada cliente (já disponível)</li>
                    </ol>
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* ── Setup notes ── */}
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <IconSettings size={18} />
                  <Typography variant="subtitle2" fontWeight={700}>Variáveis de Ambiente</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" component="div">
                  <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.8, overflow: 'auto' }}>
{`GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://api.edro.digital/auth/google/callback
GOOGLE_PUBSUB_TOPIC=projects/PROJECT_ID/topics/gmail-watch
GOOGLE_CALENDAR_REDIRECT_URI=https://api.edro.digital/auth/google/calendar/callback
GOOGLE_CALENDAR_WEBHOOK_URL=https://api.edro.digital/webhook/google-calendar
RECALL_API_KEY=...
RECALL_REGION=us-west-2
RECALL_WEBHOOK_SECRET=...
RECALL_GOOGLE_LOGIN_GROUP_ID=...
META_VERIFY_TOKEN=seu-token-secreto`}
                  </Box>
                </Typography>
              </CardContent>
            </Card>

          </Stack>
        )}
      </Box>
    </AppShell>
  );
}
