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
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AppShell from '@/components/AppShell';
import WorkspaceHero from '@/components/shared/WorkspaceHero';
import IntegrationSetupDialog, { type IntegrationType } from './IntegrationSetupDialog';
import {
  IconBrandGmail,
  IconBrandGoogle,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandMeta,
  IconBrandTiktok,
  IconBrandWhatsapp,
  IconCalendar,
  IconChartBar,
  IconExternalLink,
  IconRobot,
  IconPlugConnected,
  IconRefresh,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';

type GmailStatus = {
  configured: boolean;
  healthy?: boolean;
  receiving?: boolean;
  needsAttention?: boolean;
  email?: string;
  watchExpiry?: string;
  expired?: boolean;
  expiresSoon?: boolean;
  lastSyncAt?: string;
  connectedAt?: string;
  lastError?: string;
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


type WhatsAppStatus = {
  connected: boolean;
  state?: string;
  profileName?: string;
  instanceName?: string;
};

type ServiceMonitorStatus = {
  service: string;
  label: string;
  configured: boolean;
  status: 'ok' | 'error' | 'degraded' | 'unknown';
  last_event?: string;
  last_activity?: string;
  records?: number | null;
  error_msg?: string | null;
  meta?: Record<string, any> | null;
};

type MonitorQuickAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

type MonitorHistoryItem = {
  event: string;
  status: 'ok' | 'error' | 'degraded';
  records?: number | null;
  error_msg?: string | null;
  meta?: Record<string, any> | null;
  created_at: string;
};

type IntegrationHealth = {
  google:             { client_id: boolean; client_secret: boolean; pubsub_topic: boolean; calendar_webhook: boolean };
  ai:                 { gemini: boolean; openai: boolean };
  search:             { serper: boolean; tavily: boolean; google_trends: boolean };
  meta:               { app_id: boolean; app_secret: boolean; redirect_uri: boolean; verify_token: boolean };
  whatsapp_evolution: { api_key: boolean; api_url: boolean };
  whatsapp_meta:      { token: boolean; phone_id: boolean; verify_token: boolean; agency_phones: boolean };
  recall:             { api_key: boolean; webhook_secret: boolean; google_login_group: boolean };
  reportei:           { token: boolean; base_url: boolean };
  omie:               { app_key: boolean; app_secret: boolean };
  analytics:          { youtube: boolean };
  auth:               { oidc_issuer: boolean; oidc_client_id: boolean };
};

type OAuthStartResponse = {
  url: string;
};


function monitorStatusColor(status: ServiceMonitorStatus['status']) {
  if (status === 'ok') return '#16a34a';
  if (status === 'error') return '#dc2626';
  if (status === 'degraded') return '#d97706';
  return '#9ca3af';
}

function monitorStatusChipColor(status: ServiceMonitorStatus['status']): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'ok') return 'success';
  if (status === 'error') return 'error';
  if (status === 'degraded') return 'warning';
  return 'default';
}

function monitorSortRank(service: ServiceMonitorStatus) {
  if (service.status === 'error') return 0;
  if (service.status === 'degraded') return 1;
  if (service.status === 'ok') return 2;
  if (service.configured) return 3;
  return 4;
}

function monitorEventLabel(service: string, event?: string | null) {
  if (!event) return null;
  const generic: Record<string, string> = {
    sync: 'sync',
    configured: 'configurado',
    connected: 'conectado',
    watch_renewed: 'watch renovado',
    watch_error: 'erro no watch',
    briefing_created: 'briefing criado',
    message_received: 'mensagem recebida',
    messages_upsert: 'mensagens',
    connection_update: 'conexão',
    contract_sent: 'contrato enviado',
    contract_signed: 'contrato assinado',
    contract_cancelled: 'contrato cancelado',
    email_sent: 'email enviado',
    email_sent_fallback: 'email fallback',
    history_cursor_initialized: 'cursor iniciado',
    test_send: 'teste de envio',
  };

  if (event.startsWith('notification_')) {
    return event.replace('notification_', 'notificação ');
  }

  if (service === 'openai' && event === 'generation') return 'geração';
  if (service === 'openai' && event === 'speech') return 'áudio';

  return generic[event] ?? event;
}

function timeAgo(iso?: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

function shortValue(value?: string | null, limit = 28) {
  if (!value) return '—';
  return value.length > limit ? `${value.slice(0, limit - 10)}...${value.slice(-7)}` : value;
}

function humanizeMonitorMetaKey(key: string) {
  const labels: Record<string, string> = {
    provider: 'Provider',
    email: 'Email',
    watch_expiry: 'Watch expira em',
    expires_at: 'Expira em',
    watch_status: 'Status do watch',
    member_id: 'Member ID',
    client_id: 'Client ID',
    page_id: 'Page ID',
    instagram_business_id: 'Instagram Business ID',
    stale_age_hours: 'Sem atividade há',
    stale_window_hours: 'Janela de alerta',
  };
  return labels[key] ?? key.replace(/_/g, ' ');
}

function formatMonitorMetaValue(key: string, value: unknown) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    if ((key.includes('expiry') || key.includes('expires') || key.endsWith('_at')) && !Number.isNaN(Date.parse(value))) {
      return fmtDateTime(value);
    }
    return value;
  }
  if (typeof value === 'number' && key.endsWith('_hours')) {
    return `${value}h`;
  }
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  return JSON.stringify(value);
}

function monitorMetaEntries(meta?: Record<string, any> | null) {
  return Object.entries(meta ?? {})
    .map(([key, value]) => {
      const formattedValue = formatMonitorMetaValue(key, value);
      if (!formattedValue) return null;
      return { key, label: humanizeMonitorMetaKey(key), value: formattedValue };
    })
    .filter((entry): entry is { key: string; label: string; value: string } => Boolean(entry));
}

function watchChip(calendar: CalendarStatus | null) {
  if (!calendar?.configured) return <Chip label="Desconectado" size="small" color="default" />;
  if (calendar.expired) return <Chip label="Watch expirado" size="small" color="error" />;
  if (calendar.watchStatus === 'error') return <Chip label="Watch com erro" size="small" color="error" />;
  if (calendar.expiresSoon) return <Chip label="Expira em breve" size="small" color="warning" />;
  return <Chip label="Watch ativo" size="small" color="success" />;
}


export default function IntegrationsClient() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'catalog' | 'monitor'>('catalog');
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [whatsapp, setWhatsapp] = useState<WhatsAppStatus | null>(null);
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewingCalendar, setRenewingCalendar] = useState(false);
  const [error, setError] = useState('');
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestSending, setWaTestSending] = useState(false);
  const [waTestResult, setWaTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [emailTestTo, setEmailTestTo] = useState('');
  const [emailTestSending, setEmailTestSending] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [setupDialog, setSetupDialog] = useState<IntegrationType | null>(null);
  const [monitor, setMonitor] = useState<ServiceMonitorStatus[] | null>(null);
  const [monitorDetail, setMonitorDetail] = useState<ServiceMonitorStatus | null>(null);
  const [monitorHistory, setMonitorHistory] = useState<MonitorHistoryItem[]>([]);
  const [monitorHistoryLoading, setMonitorHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gmailRes, calRes, waRes, healthRes, monitorRes] = await Promise.all([
        apiGet<GmailStatus>('/gmail/status').catch(() => ({ configured: false } as GmailStatus)),
        apiGet<CalendarStatus>('/calendar/watch-status').catch(() => ({ configured: false } as CalendarStatus)),
        apiGet<WhatsAppStatus>('/whatsapp-groups/status').catch(() => ({ connected: false } as WhatsAppStatus)),
        apiGet<IntegrationHealth>('/admin/integrations/health').catch(() => null),
        apiGet<{ services: ServiceMonitorStatus[] }>('/admin/integrations/monitor').catch(() => null),
      ]);
      setGmail(gmailRes ?? { configured: false });
      setCalendar(calRes ?? { configured: false });
      setWhatsapp(waRes ?? { connected: false });
      setHealth(healthRes ?? null);
      setMonitor(monitorRes?.services ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!monitorDetail) {
      setMonitorHistory([]);
      setMonitorHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setMonitorHistoryLoading(true);
    apiGet<{ events: MonitorHistoryItem[] }>(`/admin/integrations/monitor/${monitorDetail.service}/history?limit=8`)
      .then((res) => {
        if (!cancelled) setMonitorHistory(res?.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setMonitorHistory([]);
      })
      .finally(() => {
        if (!cancelled) setMonitorHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [monitorDetail]);

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

  const handleWaTestSend = async () => {
    if (!waTestPhone.trim()) return;
    setWaTestSending(true);
    setWaTestResult(null);
    try {
      await apiPost('/admin/integrations/whatsapp/test-send', { phone: waTestPhone.trim() });
      setWaTestResult({ ok: true, msg: 'Mensagem enviada! Verifique o WhatsApp.' });
    } catch (e: any) {
      setWaTestResult({ ok: false, msg: e.message || 'Falha ao enviar.' });
    } finally {
      setWaTestSending(false);
    }
  };


  const handleEmailTestSend = async () => {
    if (!emailTestTo.trim()) return;
    setEmailTestSending(true);
    setEmailTestResult(null);
    try {
      const res = await apiPost<{ ok: boolean; provider: string }>('/admin/integrations/email/test-send', { to: emailTestTo.trim() });
      setEmailTestResult({ ok: true, msg: `Email enviado via ${res.provider ?? 'email'}! Verifique a caixa de entrada.` });
      load(); // refresh monitor to clear the error state
    } catch (e: any) {
      setEmailTestResult({ ok: false, msg: e.message || 'Falha ao enviar.' });
    } finally {
      setEmailTestSending(false);
    }
  };

  const gmailConnected = searchParams.get('gmail_connected');
  const gmailError = searchParams.get('gmail_error');
  const gmailWarn = searchParams.get('gmail_warn');
  const calendarConnected = searchParams.get('calendar_connected');
  const calendarError = searchParams.get('calendar_error');
  const sortedMonitor = monitor
    ? [...monitor].sort((a, b) => (
        monitorSortRank(a) - monitorSortRank(b)
        || a.label.localeCompare(b.label, 'pt-BR')
      ))
    : null;
  const attentionMonitor = sortedMonitor?.filter((svc) => svc.configured && (svc.status === 'error' || svc.status === 'degraded')) ?? [];

  const monitorQuickAction = (svc: ServiceMonitorStatus): MonitorQuickAction | null => {
    switch (svc.service) {
      case 'gmail':
        return {
          label: gmail?.configured ? 'Setup' : 'Configurar',
          onClick: () => setSetupDialog('google-oauth'),
        };
      case 'google_calendar':
        if (calendar?.configured) {
          return {
            label: renewingCalendar ? 'Renovando...' : 'Renovar watch',
            onClick: handleCalendarRenew,
            disabled: renewingCalendar,
          };
        }
        return {
          label: 'Configurar',
          onClick: () => setSetupDialog('google-oauth'),
        };
      case 'whatsapp':
        return {
          label: 'Configurar',
          onClick: () => setSetupDialog('whatsapp-meta'),
        };
      case 'evolution':
        return whatsapp?.connected
          ? { label: 'Gerenciar', href: '/admin/whatsapp-groups' }
          : { label: 'Conectar', onClick: () => setSetupDialog('evolution-whatsapp') };
      case 'recall':
        return {
          label: 'Configurar',
          onClick: () => setSetupDialog('recall'),
        };
      case 'instagram':
        return {
          label: 'Configurar',
          onClick: () => setSetupDialog('instagram'),
        };
      case 'trello':
        return { label: 'Gerenciar Boards', href: '/admin/trello' };
      default:
        return null;
    }
  };

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
              Todas as integrações do sistema — Google, WhatsApp, Meta, social media, analytics e APIs de IA.
            </Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {gmailConnected && !gmailWarn && <Alert severity="success" sx={{ mb: 2 }}>Gmail conectado: {gmailConnected}</Alert>}
        {gmailConnected && gmailWarn && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Gmail conectado ({gmailConnected})</strong> — mas o Pub/Sub watch falhou: {gmailWarn}
            <br /><small>Emails em tempo real não funcionarão até corrigir GOOGLE_PUBSUB_TOPIC no Railway.</small>
          </Alert>
        )}
        {gmailError && <Alert severity="error" sx={{ mb: 2 }}>Falha ao conectar Gmail: {gmailError}</Alert>}
        {calendarConnected && <Alert severity="success" sx={{ mb: 2 }}>Google Calendar conectado: {calendarConnected}</Alert>}
        {calendarError && <Alert severity="error" sx={{ mb: 2 }}>Falha ao conectar Google Calendar: {calendarError}</Alert>}
        {attentionMonitor.length > 0 && (
          <Alert severity={attentionMonitor.some((svc) => svc.status === 'error') ? 'error' : 'warning'} sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
              {attentionMonitor.filter((svc) => svc.status === 'error').length > 0
                ? `${attentionMonitor.filter((svc) => svc.status === 'error').length} integração(ões) com erro e ${attentionMonitor.filter((svc) => svc.status === 'degraded').length} degradada(s)`
                : `${attentionMonitor.length} integração(ões) degradada(s) exigem atenção`}
            </Typography>
            <Typography variant="caption" color="inherit" sx={{ display: 'block', mb: 1 }}>
              {attentionMonitor.slice(0, 4).map((svc) => svc.label).join(' • ')}
              {attentionMonitor.length > 4 ? ` • +${attentionMonitor.length - 4}` : ''}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {attentionMonitor.slice(0, 3).map((svc) => {
                const action = monitorQuickAction(svc);
                if (!action) return null;
                return (
                  <Button
                    key={`attention-${svc.service}`}
                    size="small"
                    variant="outlined"
                    color="inherit"
                    href={action.href}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    endIcon={action.href ? <IconExternalLink size={12} /> : <IconSettings size={12} />}
                    sx={{ minWidth: 0 }}
                  >
                    {svc.label}: {action.label}
                  </Button>
                );
              })}
            </Stack>
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <WorkspaceHero
            eyebrow="Integration"
            title="Integrações"
            description="Catálogo primeiro, monitor depois. Aqui você vê os providers ativos da agência e o monitor ao vivo só como apoio operacional."
            leftChips={[
              {
                label: `${sortedMonitor?.filter((svc) => svc.configured).length ?? 0} integrações configuradas`,
                color: 'primary',
                variant: 'outlined',
              },
              {
                label: `${attentionMonitor.length} exigem atenção`,
                color: attentionMonitor.some((svc) => svc.status === 'error') ? 'error' : attentionMonitor.length ? 'warning' : 'success',
                variant: attentionMonitor.length ? 'filled' : 'outlined',
              },
            ]}
          />
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={view}
            onChange={(_, value) => setView(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ '& .MuiTab-root': { minHeight: 44 } }}
          >
            <Tab value="catalog" label="Integrações" icon={<IconPlugConnected size={16} />} iconPosition="start" />
            <Tab value="monitor" label="Monitor" icon={<IconRefresh size={16} />} iconPosition="start" />
          </Tabs>
        </Box>

        <IntegrationSetupDialog
          open={Boolean(setupDialog)}
          type={setupDialog}
          health={health}
          onClose={() => setSetupDialog(null)}
          onRefresh={load}
        />
        <Dialog open={Boolean(monitorDetail)} onClose={() => setMonitorDetail(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{monitorDetail?.label ?? 'Detalhes da integração'}</DialogTitle>
          <DialogContent dividers>
            {monitorDetail && (
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={monitorDetail.configured ? 'Configurado' : 'Não configurado'} size="small" color={monitorDetail.configured ? 'success' : 'default'} />
                  <Chip label={monitorDetail.status} size="small" color={monitorStatusChipColor(monitorDetail.status)} />
                  {monitorDetail.last_event && (
                    <Chip label={monitorEventLabel(monitorDetail.service, monitorDetail.last_event) ?? monitorDetail.last_event} size="small" variant="outlined" />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Última atividade: {monitorDetail.last_activity ? fmtDateTime(monitorDetail.last_activity) : 'Sem atividade registrada'}
                </Typography>
                {monitorDetail.records != null && (
                  <Typography variant="body2" color="text.secondary">
                    Registros: {monitorDetail.records}
                  </Typography>
                )}
                {monitorDetail.error_msg && (
                  <Alert severity="error">{monitorDetail.error_msg}</Alert>
                )}
                {monitorMetaEntries(monitorDetail.meta).length > 0 && (
                  <>
                    <Divider />
                    <Stack spacing={1}>
                      {monitorMetaEntries(monitorDetail.meta).map((entry) => (
                        <Stack key={entry.key} direction="row" justifyContent="space-between" gap={2}>
                          <Typography variant="caption" color="text.secondary">{entry.label}</Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', textAlign: 'right' }}>
                            {entry.value}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}
                <Divider />
                <Box>
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                    Histórico recente
                  </Typography>
                  {monitorHistoryLoading ? (
                    <Stack alignItems="center" py={2}>
                      <CircularProgress size={20} />
                    </Stack>
                  ) : monitorHistory.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      Sem eventos recentes registrados para este serviço.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {monitorHistory.map((item, index) => (
                        <Box key={`${item.created_at}-${item.event}-${index}`} sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Chip label={monitorEventLabel(monitorDetail.service, item.event) ?? item.event} size="small" variant="outlined" />
                              <Chip label={item.status} size="small" color={monitorStatusChipColor(item.status)} />
                              {item.records != null && (
                                <Chip label={`${item.records} registros`} size="small" variant="outlined" />
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {fmtDateTime(item.created_at)}
                            </Typography>
                          </Stack>
                          {item.error_msg && (
                            <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.75 }}>
                              {item.error_msg}
                            </Typography>
                          )}
                          {monitorMetaEntries(item.meta).length > 0 && (
                            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                              {monitorMetaEntries(item.meta).slice(0, 4).map((entry) => (
                                <Stack key={`${item.created_at}-${entry.key}`} direction="row" justifyContent="space-between" gap={2}>
                                  <Typography variant="caption" color="text.secondary">{entry.label}</Typography>
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace', textAlign: 'right' }}>
                                    {entry.value}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
                {monitorDetail.service === 'resend' && (
                  <Box>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      Testar envio de email
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1 }}>
                      <TextField
                        size="small"
                        type="email"
                        placeholder="email@destino.com"
                        value={emailTestTo}
                        onChange={(e) => { setEmailTestTo(e.target.value); setEmailTestResult(null); }}
                        disabled={emailTestSending}
                        sx={{ flex: 1 }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleEmailTestSend}
                        disabled={!emailTestTo.trim() || emailTestSending}
                      >
                        {emailTestSending ? 'Enviando...' : 'Testar'}
                      </Button>
                    </Stack>
                    {emailTestResult && (
                      <Alert severity={emailTestResult.ok ? 'success' : 'error'} sx={{ mt: 1, fontSize: '0.8rem' }}>
                        {emailTestResult.msg}
                      </Alert>
                    )}
                  </Box>
                )}
                <Stack direction="row" justifyContent="flex-end">
                  <Button size="small" onClick={() => setMonitorDetail(null)}>Fechar</Button>
                </Stack>
              </Stack>
            )}
          </DialogContent>
        </Dialog>

        {loading ? (
          <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
        ) : (
          <Stack spacing={2}>

            {/* ── Monitor ao vivo ── */}
            {view === 'monitor' && sortedMonitor && (
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconPlugConnected size={18} />
                      <Typography variant="subtitle2" fontWeight={700}>Monitor ao vivo</Typography>
                      <Chip
                        label={`${sortedMonitor.filter(s => s.status === 'ok').length} ok`}
                        size="small" color="success" variant="outlined"
                      />
                      {sortedMonitor.filter(s => s.status === 'error').length > 0 && (
                        <Chip
                          label={`${sortedMonitor.filter(s => s.status === 'error').length} com erro`}
                          size="small" color="error"
                        />
                      )}
                      {sortedMonitor.filter(s => s.status === 'degraded').length > 0 && (
                        <Chip
                          label={`${sortedMonitor.filter(s => s.status === 'degraded').length} degradado`}
                          size="small" color="warning"
                        />
                      )}
                    </Stack>
                    <Button size="small" startIcon={<IconRefresh size={14} />} onClick={load}>
                      Atualizar
                    </Button>
                  </Stack>

                  <Stack spacing={0.75}>
                    {sortedMonitor.map((svc) => {
                      const action = monitorQuickAction(svc);
                      return (
                      <Stack key={svc.service} direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{
                            width: 8, height: 8, borderRadius: '50%',
                            bgcolor: monitorStatusColor(svc.status),
                            flexShrink: 0,
                          }} />
                          <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>
                            {svc.label}
                          </Typography>
                          {!svc.configured && (
                            <Chip label="não configurado" size="small" color="default" sx={{ height: 16, fontSize: '0.6rem' }} />
                          )}
                          {svc.error_msg && (
                            <Tooltip title={svc.error_msg}>
                              <Chip label="erro" size="small" color="error" sx={{ height: 16, fontSize: '0.6rem', cursor: 'help' }} />
                            </Tooltip>
                          )}
                          {svc.status === 'degraded' && svc.meta?.stale && (
                            <Chip label="sem atividade recente" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />
                          )}
                        </Stack>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          {svc.last_event && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                              {monitorEventLabel(svc.service, svc.last_event)}
                            </Typography>
                          )}
                          {svc.service === 'resend' && typeof svc.meta?.provider === 'string' && (
                            <Typography variant="caption" color="text.secondary">
                              via {svc.meta.provider}
                            </Typography>
                          )}
                          {svc.records != null && (
                            <Typography variant="caption" color="text.secondary">
                              {svc.records} registros
                            </Typography>
                          )}
                          <Typography variant="caption" color={svc.last_activity ? 'text.secondary' : 'text.disabled'}>
                            {timeAgo(svc.last_activity) ?? 'Sem atividade'}
                          </Typography>
                          {action && (
                            <Button
                              size="small"
                              variant="text"
                              color="inherit"
                              href={action.href}
                              onClick={action.onClick}
                              disabled={action.disabled}
                              endIcon={action.href ? <IconExternalLink size={12} /> : <IconSettings size={12} />}
                              sx={{ minWidth: 0, px: 0.5, fontSize: '0.72rem' }}
                            >
                              {action.label}
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="text"
                            color="inherit"
                            onClick={() => setMonitorDetail(svc)}
                            sx={{ minWidth: 0, px: 0.5, fontSize: '0.72rem' }}
                          >
                            Detalhes
                          </Button>
                        </Stack>
                      </Stack>
                    )})}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {view === 'catalog' && (
              <>
            {/* ── Gmail ── */}
            <Card variant="outlined" sx={{ cursor: !gmail?.configured ? 'pointer' : 'default', '&:hover': !gmail?.configured ? { boxShadow: 2 } : {} }}
              onClick={!gmail?.configured ? () => setSetupDialog('google-oauth') : undefined}>
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
                          <>
                            <Chip label={gmail.healthy === false ? 'Atenção' : 'Conectado'} size="small" color={gmail.healthy === false ? 'warning' : 'success'} />
                            {gmail.expiresSoon && <Chip label="Expira em breve" size="small" color="warning" variant="outlined" />}
                          </>
                        ) : (
                          <>
                            <Chip label="Desconectado" size="small" color="default" />
                            <Chip label="Configurar →" size="small" color="primary" variant="outlined"
                              onClick={(e) => { e.stopPropagation(); setSetupDialog('google-oauth'); }}
                              sx={{ cursor: 'pointer', fontSize: '0.65rem' }} />
                          </>
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {gmail?.configured
                          ? gmail.healthy === false
                            ? `${gmail.email} · conectado, mas sem leitura confiável em tempo real`
                            : `${gmail.email} · ${gmail.stats?.totalThreads ?? 0} emails · ${gmail.stats?.processedThreads ?? 0} briefings gerados`
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
                      <Tooltip title={!health?.google.client_id ? 'Configure GOOGLE_CLIENT_ID e GOOGLE_REDIRECT_URI nas variáveis de ambiente' : ''}>
                        <span>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<IconBrandGoogle size={16} />}
                            onClick={handleGmailConnect}
                            disabled={health !== null && !health.google.client_id}
                            sx={{ bgcolor: '#EA4335', '&:hover': { bgcolor: '#c0392b' } }}
                          >
                            Conectar Gmail
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>

                {health !== null && !health.google.client_id && !gmail?.configured && (
                  <Alert severity="warning" sx={{ mt: 2, fontSize: '0.8rem' }}>
                    Variáveis <code>GOOGLE_CLIENT_ID</code> e <code>GOOGLE_REDIRECT_URI</code> não configuradas no ambiente. Configure-as para habilitar Gmail e Calendar.
                  </Alert>
                )}

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

                {gmail?.configured && gmail.healthy === false && !gmail.expired && (
                  <Alert severity="warning" sx={{ mt: 1.5 }}
                    action={<Button size="small" color="inherit" variant="outlined" onClick={handleGmailConnect}>Reconectar</Button>}>
                    {gmail.lastError || 'A conexão existe, mas o Gmail não está lendo emails com segurança no momento.'}
                  </Alert>
                )}

                {gmail?.expired && (
                  <Alert severity="error" sx={{ mt: 1.5 }}
                    action={<Button size="small" color="inherit" variant="outlined" onClick={handleGmailConnect}>Reconectar</Button>}>
                    Watch token do Gmail expirou — e-mails não estão sendo sincronizados.
                  </Alert>
                )}
                {!gmail?.expired && gmail?.expiresSoon && (
                  <Alert severity="warning" sx={{ mt: 1.5 }}
                    action={<Button size="small" color="inherit" variant="outlined" onClick={handleGmailConnect}>Renovar</Button>}>
                    Watch token do Gmail expira em menos de 48h. Reconecte para evitar interrupção.
                  </Alert>
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
                      <Tooltip title={!health?.google.client_id ? 'Configure GOOGLE_CLIENT_ID e GOOGLE_REDIRECT_URI nas variáveis de ambiente' : ''}>
                        <span>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<IconCalendar size={16} />}
                            onClick={handleCalendarConnect}
                            disabled={health !== null && !health.google.client_id}
                            sx={{ bgcolor: '#F9AB00', color: '#000', '&:hover': { bgcolor: '#f59e0b' } }}
                          >
                            Conectar Calendar
                          </Button>
                        </span>
                      </Tooltip>
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

                    {calendar.expired && !calendar.lastWatchError && (
                      <Alert severity="error" sx={{ mt: 2 }}
                        action={<Button size="small" color="inherit" variant="outlined" onClick={handleCalendarRenew} disabled={renewingCalendar}>Renovar</Button>}>
                        Watch token do Calendar expirou — eventos não estão sendo recebidos em tempo real.
                      </Alert>
                    )}
                    {!calendar.expired && calendar.expiresSoon && (
                      <Alert severity="warning" sx={{ mt: 2 }}
                        action={<Button size="small" color="inherit" variant="outlined" onClick={handleCalendarRenew} disabled={renewingCalendar}>Renovar agora</Button>}>
                        Watch token expira em menos de 48h. Renove para não perder detecção de reuniões.
                      </Alert>
                    )}

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
            <Card variant="outlined" sx={{ cursor: !health?.recall.api_key ? 'pointer' : 'default', '&:hover': !health?.recall.api_key ? { boxShadow: 2 } : {} }}
              onClick={!health?.recall.api_key ? () => setSetupDialog('recall') : undefined}>
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
                        {!health?.recall.api_key && (
                          <Chip label="Configurar →" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                        )}
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
            <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }}
              onClick={() => setSetupDialog('instagram')}>
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
                        <Chip label="Configurar →" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem' }} />
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
                  <Box component="ol" sx={{ m: 0, pl: 2, lineHeight: 2 }}>
                    {[
                      <>No painel Meta Developers → Seu App → Webhooks → Instagram → Subscribe: <code>messages</code></>,
                      <>URL do callback: <code>https://api.edro.digital/webhook/instagram</code></>,
                      <>Verify Token: valor da variável <code>META_VERIFY_TOKEN</code> no servidor</>,
                      <>Conecte a conta Instagram via OAuth em cada cliente (já disponível)</>,
                    ].map((item, i) => (
                      <Box key={i} component="li" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{item}</Box>
                    ))}
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* ── WhatsApp (Evolution API) ── */}
            <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }}
              onClick={() => setSetupDialog('evolution-whatsapp')}>
              <CardContent>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: '#25D366', width: 40, height: 40 }}>
                      <IconBrandWhatsapp size={22} />
                    </Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle1" fontWeight={700}>WhatsApp (Evolution API)</Typography>
                        {whatsapp?.connected
                          ? <Chip label="Conectado" size="small" color="success" />
                          : <>
                              <Chip label="Desconectado" size="small" color="default" />
                              <Chip label="Conectar →" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                            </>}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {whatsapp?.connected
                          ? `${whatsapp.profileName ?? whatsapp.instanceName ?? 'Instância ativa'} · Grupos de clientes monitorados`
                          : 'Clique para conectar via QR code'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button size="small" variant="outlined" href="/admin/whatsapp-groups" endIcon={<IconExternalLink size={13} />}>
                    Gerenciar grupos
                  </Button>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`EVOLUTION_API_URL: ${health?.whatsapp_evolution.api_url ? '✓' : '✗'}`} size="small"
                    color={health?.whatsapp_evolution.api_url ? 'success' : 'error'} variant="outlined" />
                  <Chip label={`EVOLUTION_API_KEY: ${health?.whatsapp_evolution.api_key ? '✓' : '✗'}`} size="small"
                    color={health?.whatsapp_evolution.api_key ? 'success' : 'error'} variant="outlined" />
                  <Chip label={`WHATSAPP_TOKEN (Meta): ${health?.whatsapp_meta.token ? '✓' : '✗'}`} size="small"
                    color={health?.whatsapp_meta.token ? 'success' : 'error'} variant="outlined" />
                  <Chip label={`WHATSAPP_PHONE_ID: ${health?.whatsapp_meta.phone_id ? '✓' : '✗'}`} size="small"
                    color={health?.whatsapp_meta.phone_id ? 'success' : 'error'} variant="outlined" />
                </Stack>

                <Divider sx={{ my: 2 }} />
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    Notificações WhatsApp (Meta Cloud API)
                  </Typography>
                  {!health?.whatsapp_meta.token && (
                    <Chip label="Configurar →" size="small" color="primary" variant="outlined"
                      sx={{ fontSize: '0.65rem', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); setSetupDialog('whatsapp-meta'); }} />
                  )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <TextField
                    size="small"
                    placeholder="Ex: 5511999990000 ou +55 11 99999-0000"
                    value={waTestPhone}
                    onChange={(e) => { setWaTestPhone(e.target.value); setWaTestResult(null); }}
                    disabled={waTestSending || !health?.whatsapp_meta.token}
                    sx={{ flex: 1, maxWidth: 320 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleWaTestSend}
                    disabled={!waTestPhone.trim() || waTestSending || !health?.whatsapp_meta.token}
                  >
                    {waTestSending ? 'Enviando...' : 'Testar envio'}
                  </Button>
                </Stack>
                {waTestResult && (
                  <Alert severity={waTestResult.ok ? 'success' : 'error'} sx={{ mt: 1, fontSize: '0.8rem' }}>
                    {waTestResult.msg}
                  </Alert>
                )}
                {!health?.whatsapp_meta.token && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Configure <code>WHATSAPP_TOKEN</code> e <code>WHATSAPP_PHONE_ID</code> para habilitar.
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* ── Section: IAs & LLMs ── */}
            <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ pt: 1, display: 'block' }}>
              IAs & LLMs
            </Typography>

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  {[
                    {
                      icon: <Avatar sx={{ bgcolor: '#4285F4', width: 36, height: 36 }}><IconBrandGoogle size={20} /></Avatar>,
                      name: 'Google Gemini',
                      desc: 'Modelo principal para geração de copy, análise de reuniões e briefings',
                      configured: health?.ai.gemini,
                      keys: ['GEMINI_API_KEY', 'GEMINI_MODEL'],
                      status: health?.ai.gemini,
                    },
                    {
                      icon: <Avatar sx={{ bgcolor: '#10a37f', width: 36, height: 36 }}><IconRobot size={20} /></Avatar>,
                      name: 'OpenAI',
                      desc: 'Fallback para geração de copy e orquestração multi-provider',
                      configured: health?.ai.openai,
                      keys: ['OPENAI_API_KEY', 'OPENAI_MODEL'],
                      status: health?.ai.openai,
                    },
                  ].map((item) => (
                    <Stack key={item.name} direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {item.icon}
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" fontWeight={700}>{item.name}</Typography>
                            <Chip label={item.configured ? 'Configurado' : 'Não configurado'} size="small"
                              color={item.configured ? 'success' : 'default'} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {item.keys.map((k) => (
                          <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18, fontFamily: 'monospace' }} />
                        ))}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* ── Section: Pesquisa & Web ── */}
            <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ pt: 1, display: 'block' }}>
              Pesquisa & Inteligência Web
            </Typography>

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  {[
                    {
                      name: 'Serper',
                      desc: 'Google Search API — clipping, social listening, tendências',
                      configured: health?.search.serper,
                      key: 'SERPER_API_KEY',
                    },
                    {
                      name: 'Tavily',
                      desc: 'Web scraping inteligente para enriquecimento de clientes',
                      configured: health?.search.tavily,
                      key: 'TAVILY_API_KEY',
                    },
                    {
                      name: 'Google Trends',
                      desc: 'Microservice de tendências de busca para inspiração de pauta',
                      configured: health?.search.google_trends,
                      key: 'GOOGLE_TRENDS_SERVICE_URL',
                    },
                  ].map((item) => (
                    <Stack key={item.name} direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" fontWeight={700}>{item.name}</Typography>
                          <Chip label={item.configured ? 'Configurado' : 'Não configurado'} size="small"
                            color={item.configured ? 'success' : 'default'} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                      </Box>
                      <Chip label={item.key} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18, fontFamily: 'monospace' }} />
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* ── Section: Analytics ── */}
            <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ pt: 1, display: 'block' }}>
              Analytics & Reportes
            </Typography>

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  {[
                    {
                      icon: <Avatar sx={{ bgcolor: '#E85219', width: 36, height: 36 }}><IconChartBar size={20} /></Avatar>,
                      name: 'Reportei',
                      desc: 'Métricas de posts do Instagram, Facebook, LinkedIn. Sync automático diário.',
                      configured: health?.reportei.token,
                      href: '/admin/reportei',
                      keys: ['REPORTEI_TOKEN', 'REPORTEI_BASE_URL'],
                    },
                    {
                      icon: <Avatar sx={{ bgcolor: '#FF0000', width: 36, height: 36 }}><IconChartBar size={20} /></Avatar>,
                      name: 'YouTube Data API',
                      desc: 'Métricas de vídeos publicados pelos clientes',
                      configured: health?.analytics.youtube,
                      keys: ['YOUTUBE_API_KEY'],
                    },
                  ].map((item) => (
                    <Stack key={item.name} direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {item.icon}
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" fontWeight={700}>{item.name}</Typography>
                            <Chip label={item.configured ? 'Configurado' : 'Não configurado'} size="small"
                              color={item.configured ? 'success' : 'default'} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
                        {item.keys.map((k) => (
                          <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18, fontFamily: 'monospace' }} />
                        ))}
                        {item.href && (
                          <Button size="small" href={item.href} endIcon={<IconExternalLink size={13} />}>Gerenciar</Button>
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* ── Section: Social Media ── */}
            <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ pt: 1, display: 'block' }}>
              Social Media (por cliente)
            </Typography>

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  {[
                    {
                      icon: <Avatar sx={{ bgcolor: '#E1306C', width: 36, height: 36 }}><IconBrandInstagram size={20} /></Avatar>,
                      name: 'Meta / Instagram',
                      desc: 'OAuth por cliente — DMs, métricas de posts, Meta Ads',
                      configured: health?.whatsapp_meta.token,
                      keys: ['META_VERIFY_TOKEN', 'META_GRAPH_VERSION'],
                    },
                    {
                      icon: <Avatar sx={{ bgcolor: '#0A66C2', width: 36, height: 36 }}><IconBrandLinkedin size={20} /></Avatar>,
                      name: 'LinkedIn',
                      desc: 'Métricas de posts e analytics por cliente via OAuth',
                      configured: false,
                      keys: ['Configurável por cliente'],
                    },
                    {
                      icon: <Avatar sx={{ bgcolor: '#010101', width: 36, height: 36 }}><IconBrandTiktok size={20} /></Avatar>,
                      name: 'TikTok',
                      desc: 'Métricas de vídeos e analytics por cliente',
                      configured: false,
                      keys: ['Configurável por cliente'],
                    },
                    {
                      icon: <Avatar sx={{ bgcolor: '#1877F2', width: 36, height: 36 }}><IconBrandMeta size={20} /></Avatar>,
                      name: 'Meta Ads',
                      desc: 'Dados de campanhas pagas por cliente via Meta API',
                      configured: health?.whatsapp_meta.token,
                      keys: ['META_VERIFY_TOKEN'],
                    },
                  ].map((item) => (
                    <Stack key={item.name} direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {item.icon}
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" fontWeight={700}>{item.name}</Typography>
                            <Chip label={item.configured ? 'Configurado' : 'Não configurado'} size="small"
                              color={item.configured ? 'success' : 'default'} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {item.keys.map((k) => (
                          <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18, fontFamily: 'monospace' }} />
                        ))}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* ── Section: Financeiro ── */}
            <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ pt: 1, display: 'block' }}>
              Financeiro & ERP
            </Typography>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: '#FF6B00', width: 36, height: 36 }}><IconChartBar size={20} /></Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontWeight={700}>Omie ERP</Typography>
                        <Chip label={health?.omie.app_key ? 'Configurado' : 'Não configurado'} size="small"
                          color={health?.omie.app_key ? 'success' : 'default'} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Emissão de NF, boletos e integração financeira
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {['OMIE_APP_KEY', 'OMIE_APP_SECRET', 'OMIE_BASE_URL'].map((k) => (
                      <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18, fontFamily: 'monospace' }} />
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* ── Section: Auth / SSO ── */}
            <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ pt: 1, display: 'block' }}>
              Auth & SSO
            </Typography>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: '#7C3AED', width: 36, height: 36 }}><IconPlugConnected size={20} /></Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontWeight={700}>OIDC / SSO</Typography>
                        <Chip label={health?.auth.oidc_issuer ? 'Configurado' : 'Não configurado'} size="small"
                          color={health?.auth.oidc_issuer ? 'success' : 'default'} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Login federado via OpenID Connect (Google, Auth0, etc.)
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {['OIDC_ISSUER_URL', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET'].map((k) => (
                      <Chip key={k} label={k} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18, fontFamily: 'monospace' }} />
                    ))}
                  </Stack>
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
              </>
            )}

          </Stack>
        )}
      </Box>
    </AppShell>
  );
}
