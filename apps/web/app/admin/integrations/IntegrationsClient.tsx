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
  IconCircleCheck,
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
  stats?: { totalMeetings: number; enqueuedMeetings: number };
};

type OAuthStartResponse = {
  url: string;
};

export default function IntegrationsClient() {
  const searchParams = useSearchParams();
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gmailRes, calRes] = await Promise.all([
        apiGet<GmailStatus>('/gmail/status').catch(() => ({ configured: false } as GmailStatus)),
        apiGet<CalendarStatus>('/calendar/watch-status').catch(() => ({ configured: false } as CalendarStatus)),
      ]);
      setGmail(gmailRes ?? { configured: false });
      setCalendar(calRes ?? { configured: false });
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
    try {
      await apiPost('/calendar/watch/renew');
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const isWatchExpired = (expiresAt?: string) =>
    expiresAt ? new Date(expiresAt) < new Date() : false;

  const gmailConnected = searchParams.get('gmail_connected');
  const gmailError = searchParams.get('gmail_error');
  const calendarConnected = searchParams.get('calendar_connected');
  const calendarError = searchParams.get('calendar_error');

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
                        {calendar?.configured ? (
                          <Chip
                            label={isWatchExpired(calendar.expiresAt) ? 'Expirado' : 'Conectado'}
                            size="small"
                            color={isWatchExpired(calendar.expiresAt) ? 'warning' : 'success'}
                          />
                        ) : (
                          <Chip label="Desconectado" size="small" color="default" />
                        )}
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
                        {isWatchExpired(calendar.expiresAt) && (
                          <Button size="small" variant="outlined" color="warning" onClick={handleCalendarRenew}>
                            Renovar Watch
                          </Button>
                        )}
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
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Watch expira em {calendar.expiresAt ? new Date(calendar.expiresAt).toLocaleDateString('pt-BR') : '—'}.
                      {' '}O watch precisa ser renovado semanalmente (ou configure um cron).
                    </Typography>
                  </Box>
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
