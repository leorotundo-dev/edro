'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, apiDelete, buildApiUrl } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconArrowLeft,
  IconBrandMeta,
  IconBrandFacebook,
  IconBrandGoogle,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandWhatsapp,
  IconChartBar,
  IconChartLine,
  IconCopy,
  IconDotsVertical,
  IconPlugConnected,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconTrash,
  IconWebhook,
  IconX,
} from '@tabler/icons-react';

const PROVIDER_VISUALS: Record<string, { Icon: React.ComponentType<{ size?: number; color?: string }>; color: string }> = {
  reportei:          { Icon: IconChartBar,      color: '#E85219' },
  meta:              { Icon: IconBrandMeta,      color: '#1877F2' },
  linkedin:          { Icon: IconBrandLinkedin,  color: '#0A66C2' },
  tiktok:            { Icon: IconBrandTiktok,    color: '#69C9D0' },
  whatsapp:          { Icon: IconBrandWhatsapp,  color: '#25D366' },
  meta_ads:          { Icon: IconBrandFacebook,  color: '#1877F2' },
  google_ads:        { Icon: IconBrandGoogle,    color: '#EA4335' },
  google_analytics:  { Icon: IconChartLine,      color: '#F9AB00' },
  perplexity:        { Icon: IconSearch,         color: '#20B2AA' },
  webhook:           { Icon: IconWebhook,        color: '#6366F1' },
};

type Connector = {
  provider: string;
  payload?: Record<string, any> | null;
  secrets_meta?: Record<string, any> | null;
  updated_at?: string | null;
  last_sync_ok?: boolean | null;
  last_sync_at?: string | null;
  last_error?: string | null;
  last_error_at?: string | null;
};

type AvailableProvider = {
  id: string;
  name: string;
  description: string;
  icon: string;
  oauthProvider?: boolean;
  configFields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'select';
    required: boolean;
    options?: string[];
  }[];
};

const AVAILABLE_PROVIDERS: AvailableProvider[] = [
  {
    id: 'reportei',
    name: 'Reportei',
    description: 'Integração com Reportei para métricas de redes sociais',
    icon: '\uD83D\uDCCA',
    configFields: [
      { key: 'reportei_account_id', label: 'Reportei Account ID', type: 'text', required: true },
      { key: 'reportei_company_id', label: 'Reportei Company ID (opcional)', type: 'text', required: false },
      { key: 'dashboard_url', label: 'Reportei Dashboard URL (opcional)', type: 'url', required: false },
      { key: 'embed_url', label: 'Reportei Embed URL (opcional)', type: 'url', required: false },
      { key: 'base_url', label: 'Reportei Base URL (opcional)', type: 'url', required: false },
      { key: 'sync_frequency', label: 'Frequência de Sync', type: 'select', required: false, options: ['daily', 'weekly', 'monthly'] },
    ],
  },
  {
    id: 'meta',
    name: 'Meta (Instagram & Facebook)',
    description: 'Social Listening — posts, comentários e menções das páginas do cliente',
    icon: '\uD83D\uDCD8',
    oauthProvider: true,
    configFields: [],
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Integração com Facebook/Instagram Ads Manager',
    icon: '\uD83D\uDCB0',
    configFields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', required: true },
    ],
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Integração com Google Ads para performance de campanhas',
    icon: '\uD83D\uDD0D',
    configFields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true },
      { key: 'customer_id', label: 'Customer ID', type: 'text', required: true },
    ],
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    description: 'Dados de tráfego e conversões do Google Analytics',
    icon: '\uD83D\uDCC8',
    configFields: [
      { key: 'view_id', label: 'View ID', type: 'text', required: true },
      { key: 'service_account_json', label: 'Service Account JSON', type: 'password', required: true },
    ],
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    description: 'Pesquisa em tempo real com IA para enriquecer clipping e inteligencia',
    icon: '\uD83D\uDD0E',
    configFields: [
      { key: 'api_key', label: 'Perplexity API Key', type: 'password', required: true },
      { key: 'model', label: 'Modelo', type: 'select', required: false, options: ['sonar', 'sonar-pro', 'sonar-reasoning-pro'] },
    ],
  },
  {
    id: 'webhook',
    name: 'Custom Webhook',
    description: 'Webhook personalizado para receber dados externos',
    icon: '\uD83D\uDD17',
    configFields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true },
      { key: 'secret_key', label: 'Secret Key', type: 'password', required: false },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Publica posts e imagens diretamente no LinkedIn da empresa ou perfil pessoal',
    icon: '💼',
    configFields: [
      { key: 'access_token', label: 'Access Token (LinkedIn OAuth)', type: 'password', required: true },
      { key: 'person_id', label: 'Person ID (urn:li:person:XXX)', type: 'text', required: false },
      { key: 'organization_id', label: 'Organization ID — empresa (preferido)', type: 'text', required: false },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Publica vídeos gerados pela IA (Kling) diretamente no TikTok',
    icon: '🎵',
    configFields: [
      { key: 'access_token', label: 'Access Token (TikTok for Business)', type: 'password', required: true },
      { key: 'open_id', label: 'Open ID (user identifier)', type: 'text', required: true },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Briefing',
    description: 'Cliente envia áudio/texto no WhatsApp → Edro cria briefing automaticamente via IA',
    icon: '💬',
    configFields: [
      { key: 'access_token', label: 'Access Token (Meta Cloud API)', type: 'password', required: true },
      { key: 'phone_number_id', label: 'Phone Number ID (Meta Business Suite)', type: 'text', required: true },
      { key: 'waba_id', label: 'WhatsApp Business Account ID', type: 'text', required: true },
      { key: 'client_phone', label: 'Telefone do cliente (E.164, ex: +5511...)', type: 'text', required: true },
      { key: 'verify_token', label: 'Verify Token (para validação do webhook)', type: 'text', required: true },
    ],
  },
];

export default function ClientConnectorsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [testing, setTesting] = useState<string | null>(null); // provider being tested
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [dotMenuAnchor, setDotMenuAnchor] = useState<{ el: HTMLElement; provider: string } | null>(null);

  useEffect(() => {
    loadConnectors();
  }, [clientId]);

  const loadConnectors = async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/clients/${clientId}/connectors`);
      const list = Array.isArray(res) ? res : res?.connectors || [];
      setConnectors(list);
    } catch (error) {
      console.error('Failed to load connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnector = async (provider: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTesting(provider);
    try {
      const res = await apiPost<any>(`/clients/${clientId}/connectors/${provider}/test`, {});
      if (res?.testable === false) {
        // Provider doesn't support automated testing — don't show as error or success
        setTestResult((prev) => ({ ...prev, [provider]: { ok: true, message: 'Sem validação automática para este provider' } }));
        return;
      }
      const ok = res?.ok === true;
      const message = ok
        ? `Conexão OK${res?.account?.name ? ` · ${res.account.name}` : ''}`
        : (res?.error || 'Falha na conexão');
      setTestResult((prev) => ({ ...prev, [provider]: { ok, message } }));
      // Reload to get updated last_sync_ok from backend
      await loadConnectors();
    } catch (err: any) {
      setTestResult((prev) => ({ ...prev, [provider]: { ok: false, message: err?.message || 'Erro ao testar' } }));
    } finally {
      setTesting(null);
    }
  };

  const handleMetaOAuth = (providerId: string) => {
    const popup = window.open(
      buildApiUrl(`/auth/meta/start?clientId=${encodeURIComponent(clientId)}`),
      'meta_oauth',
      'width=600,height=700,left=200,top=100'
    );
    if (!popup) return; // blocked by browser
    setOauthLoading(providerId);

    let pollClosed: ReturnType<typeof setInterval> | null = null;
    const cleanup = () => {
      if (pollClosed) clearInterval(pollClosed);
      window.removeEventListener('message', onMessage);
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== popup) return;
      if (e.data?.type === 'meta_connected') {
        cleanup();
        setOauthLoading(null);
        loadConnectors();
      }
    };
    window.addEventListener('message', onMessage);

    // Cleanup if popup is closed without completing
    pollClosed = setInterval(() => {
      if (popup.closed) {
        cleanup();
        setOauthLoading(null);
      }
    }, 500);
  };

  const openConfigModal = async (provider: string) => {
    setSelectedProvider(provider);
    setSaveStatus('');

    // Load existing config if available
    try {
      const res = await apiGet<any>(`/clients/${clientId}/connectors/${provider}`);
      const connector = res?.connector ?? res ?? null;
      if (connector?.payload) {
        setConfigForm(connector.payload);
      } else {
        setConfigForm({});
      }
    } catch (error) {
      setConfigForm({});
    }
  };

  const closeConfigModal = () => {
    setSelectedProvider(null);
    setConfigForm({});
    setSaveStatus('');
  };

  const saveConnector = async () => {
    if (!selectedProvider) return;

    setSaving(true);
    setSaveStatus('');
    try {
      const provider = AVAILABLE_PROVIDERS.find((item) => item.id === selectedProvider);
      const payload: Record<string, any> = {};
      const secrets: Record<string, any> = {};

      if (provider?.configFields?.length) {
        provider.configFields.forEach((field) => {
          const value = configForm[field.key];
          if (value === undefined || value === null || value === '') return;
          if (field.type === 'password') {
            secrets[field.key] = value;
          } else {
            payload[field.key] = value;
          }
        });
      } else {
        Object.assign(payload, configForm);
      }

      await apiPost(`/clients/${clientId}/connectors/${selectedProvider}`, {
        payload,
        secrets: Object.keys(secrets).length ? secrets : undefined,
      });
      setSaveStatus('Connector saved successfully!');
      await loadConnectors();
      setTimeout(() => {
        closeConfigModal();
      }, 1500);
    } catch (error: any) {
      setSaveStatus(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const disconnectConnector = async () => {
    if (!selectedProvider) return;
    setSaving(true);
    setSaveStatus('');
    try {
      await apiDelete(`/clients/${clientId}/connectors/${selectedProvider}`);
      setSaveStatus('Connector desconectado!');
      await loadConnectors();
      setTimeout(() => {
        closeConfigModal();
      }, 1000);
    } catch (error: any) {
      setSaveStatus(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getConnectorStatus = (provider: string): Connector | null => {
    return connectors.find((c) => c.provider === provider) || null;
  };

  const providerInfo = selectedProvider
    ? AVAILABLE_PROVIDERS.find((p) => p.id === selectedProvider)
    : null;

  const handleDotMenuOpen = (e: React.MouseEvent<HTMLElement>, providerId: string) => {
    e.stopPropagation();
    setDotMenuAnchor({ el: e.currentTarget, provider: providerId });
  };

  const handleDotMenuClose = () => setDotMenuAnchor(null);

  return (
    <Stack spacing={3}>
      <Box>
        <Button
          size="small"
          variant="text"
          startIcon={<IconArrowLeft size={14} />}
          onClick={() => router.push(`/clients/${clientId}`)}
          sx={{ mb: 1, textTransform: 'none' }}
        >
          Voltar para Cliente
        </Button>
        <Typography variant="h5">Integrações &amp; Connectors</Typography>
        <Typography variant="body2" color="text.secondary">
          Configure integrações com plataformas externas.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card variant="outlined" sx={{ height: 220 }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between">
                        <Skeleton variant="rounded" width={52} height={52} />
                        <Skeleton variant="circular" width={28} height={28} />
                      </Stack>
                      <Skeleton width="60%" height={22} />
                      <Skeleton width="90%" height={16} />
                      <Skeleton width="70%" height={16} />
                      <Divider />
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton width={80} height={30} sx={{ borderRadius: 1 }} />
                        <Box sx={{ flex: 1 }} />
                        <Skeleton width={44} height={28} sx={{ borderRadius: 2 }} />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))
          : AVAILABLE_PROVIDERS.map((provider) => {
              const status = getConnectorStatus(provider.id);
              const isConnected = Boolean(status);
              const visual = PROVIDER_VISUALS[provider.id] ?? { Icon: IconPlugConnected, color: '#94a3b8' };
              const ProviderIcon = visual.Icon;

              const statusLine = (() => {
                if (testResult[provider.id] && !testing) return testResult[provider.id].message;
                if (isConnected && status?.last_sync_ok === true && status?.last_sync_at)
                  return `Testado em ${new Date(status.last_sync_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
                if (isConnected && status?.last_sync_ok === false && status?.last_error)
                  return `Erro: ${status.last_error.slice(0, 60)}`;
                if (isConnected && status?.updated_at)
                  return `Configurado em ${new Date(status.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}`;
                if (isConnected && provider.oauthProvider && status?.payload?.page_name)
                  return `Página: ${status.payload.page_name as string}`;
                return 'Sem sincronização recente.';
              })();

              const statusColor = (() => {
                if (testResult[provider.id] && !testing)
                  return testResult[provider.id].ok ? 'success.main' : 'error.main';
                if (isConnected && status?.last_sync_ok === true) return 'success.main';
                if (isConnected && status?.last_sync_ok === false) return 'error.main';
                return 'text.secondary';
              })();

              const handleSwitch = () => {
                if (provider.oauthProvider) {
                  handleMetaOAuth(provider.id);
                } else {
                  openConfigModal(provider.id);
                }
              };

              return (
                <Grid key={provider.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      '&:hover': { borderColor: `${visual.color}60`, boxShadow: `0 4px 16px ${visual.color}18` },
                    }}
                  >
                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Header: logo + 3-dot */}
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Avatar
                          variant="rounded"
                          sx={{ width: 52, height: 52, bgcolor: `${visual.color}14`, borderRadius: 2 }}
                        >
                          <ProviderIcon size={26} color={visual.color} />
                        </Avatar>
                        <IconButton size="small" onClick={(e) => handleDotMenuOpen(e, provider.id)}>
                          <IconDotsVertical size={18} />
                        </IconButton>
                      </Stack>

                      {/* Name + description */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700}>{provider.name}</Typography>
                        <Typography variant="body2" color={statusColor} sx={{ mt: 0.5, lineHeight: 1.4 }}>
                          {statusLine}
                        </Typography>
                      </Box>

                      <Divider />

                      {/* Footer: settings + button + switch */}
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Tooltip title="Configurar">
                          <IconButton size="small" onClick={() => openConfigModal(provider.id)}>
                            <IconSettings size={18} />
                          </IconButton>
                        </Tooltip>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => provider.oauthProvider ? handleMetaOAuth(provider.id) : openConfigModal(provider.id)}
                          disabled={oauthLoading === provider.id}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          {oauthLoading === provider.id
                            ? 'Aguardando...'
                            : isConnected ? 'Gerenciar' : 'Configurar'}
                        </Button>
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title={isConnected ? 'Conectado' : 'Desconectado'}>
                          <Switch
                            checked={isConnected}
                            size="small"
                            onChange={handleSwitch}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: visual.color },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: visual.color },
                            }}
                          />
                        </Tooltip>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
      </Grid>

      {/* 3-dot context menu */}
      <Menu
        anchorEl={dotMenuAnchor?.el}
        open={Boolean(dotMenuAnchor)}
        onClose={handleDotMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            if (dotMenuAnchor) openConfigModal(dotMenuAnchor.provider);
            handleDotMenuClose();
          }}
        >
          <IconSettings size={16} style={{ marginRight: 8 }} /> Configurar
        </MenuItem>
        {dotMenuAnchor && getConnectorStatus(dotMenuAnchor.provider) && (
          <MenuItem
            onClick={(e) => {
              if (dotMenuAnchor) testConnector(dotMenuAnchor.provider, e as any);
              handleDotMenuClose();
            }}
          >
            <IconPlugConnected size={16} style={{ marginRight: 8 }} /> Testar conexão
          </MenuItem>
        )}
        {dotMenuAnchor && getConnectorStatus(dotMenuAnchor.provider) && (
          <MenuItem
            sx={{ color: 'error.main' }}
            onClick={() => {
              if (dotMenuAnchor) {
                setSelectedProvider(dotMenuAnchor.provider);
                handleDotMenuClose();
                // Open config modal so user can disconnect from there
                openConfigModal(dotMenuAnchor.provider);
              }
            }}
          >
            <IconTrash size={16} style={{ marginRight: 8 }} /> Desconectar
          </MenuItem>
        )}
      </Menu>

      {/* ── Universal Webhook section ─────────────────────────────────── */}
      <UniversalWebhookSection clientId={clientId} />

      {/* Config Modal */}
      <Dialog
        open={Boolean(selectedProvider && providerInfo)}
        onClose={closeConfigModal}
        maxWidth="sm"
        fullWidth
      >
        {providerInfo && (
          <>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{providerInfo.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {providerInfo.description}
                  </Typography>
                </Box>
                <IconButton onClick={closeConfigModal} size="small">
                  <IconX size={18} />
                </IconButton>
              </Stack>
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={2} sx={{ pt: 1 }}>
                {providerInfo.configFields.map((field) => (
                  field.type === 'select' ? (
                    <TextField
                      key={field.key}
                      fullWidth
                      size="small"
                      select
                      label={field.label}
                      value={configForm[field.key] || ''}
                      onChange={(e) => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                      required={field.required}
                    >
                      <MenuItem value="">Selecione...</MenuItem>
                      {field.options?.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      key={field.key}
                      fullWidth
                      size="small"
                      label={field.label}
                      type={field.type}
                      value={configForm[field.key] || ''}
                      onChange={(e) => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                      required={field.required}
                      placeholder={`Informe ${field.label.toLowerCase()}`}
                    />
                  )
                ))}
              </Stack>

              {saveStatus && (
                <Alert
                  severity={saveStatus.startsWith('Error') ? 'error' : 'success'}
                  sx={{ mt: 2 }}
                >
                  {saveStatus}
                </Alert>
              )}
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'space-between' }}>
              <Box>
                {getConnectorStatus(selectedProvider!) && (
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    onClick={disconnectConnector}
                    disabled={saving}
                  >
                    Desconectar
                  </Button>
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={closeConfigModal}>
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  onClick={saveConnector}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {saving ? 'Salvando...' : 'Salvar connector'}
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  );
}

// ── Universal Webhook Section ─────────────────────────────────────────────

function UniversalWebhookSection({ clientId }: { clientId: string }) {
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const apiBase = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BACKEND_URL ?? window.location.origin.replace(':3000', ':3001'))
    : 'https://api.edro.digital';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const clientRes = await apiGet<{ client: { webhook_secret?: string } }>(`/clients/${clientId}`);
      setWebhookSecret(clientRes?.client?.webhook_secret ?? null);

      const eventsRes = await apiGet<{ data: any[] }>(`/clients/${clientId}/webhook-events`).catch(() => null);
      setRecentEvents(eventsRes?.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const webhookUrl = webhookSecret
    ? `${apiBase}/webhook/inbound/${webhookSecret}`
    : null;

  const copy = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    if (!confirm('Regenerar o webhook secret? O URL antigo deixará de funcionar.')) return;
    setRegenerating(true);
    try {
      await apiPost(`/clients/${clientId}/webhook-secret/regenerate`, {});
      load();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Avatar sx={{ bgcolor: '#6366F1', width: 36, height: 36 }}>
            <IconWebhook size={20} />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>Webhook Universal</Typography>
            <Typography variant="caption" color="text.secondary">
              Receba eventos de Zapier, Make, n8n ou qualquer ferramenta externa.
            </Typography>
          </Box>
        </Stack>

        {loading ? (
          <CircularProgress size={20} />
        ) : webhookUrl ? (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              URL do Webhook (POST):
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Box
                sx={{
                  flex: 1,
                  p: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {webhookUrl}
              </Box>
              <IconButton size="small" onClick={copy} title={copied ? 'Copiado!' : 'Copiar URL'} sx={{ color: copied ? 'success.main' : 'text.secondary' }}>
                <IconCopy size={16} />
              </IconButton>
              <IconButton size="small" onClick={load} title="Atualizar" sx={{ color: 'text.secondary' }}>
                <IconRefresh size={16} />
              </IconButton>
            </Stack>

            {recentEvents.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Últimos eventos ({recentEvents.length}):
                </Typography>
                <Stack spacing={0.5}>
                  {recentEvents.slice(0, 5).map((ev: any) => (
                    <Stack key={ev.id} direction="row" alignItems="center" spacing={1}
                      sx={{ p: 0.75, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Chip label={ev.source ?? 'custom'} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                      <Typography variant="caption" noWrap sx={{ flex: 1 }}>
                        {ev.extracted_message ?? JSON.stringify(ev.raw_payload).slice(0, 80)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(ev.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
              <Button
                size="small"
                color="error"
                variant="text"
                disabled={regenerating}
                onClick={regenerate}
                startIcon={regenerating ? <CircularProgress size={12} /> : undefined}
              >
                Regenerar secret
              </Button>
            </Stack>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Webhook secret não encontrado. Salve o cliente para gerar automaticamente.
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary" component="div">
          <strong>Payload suportado:</strong> JSON com campo <code>message</code>, <code>text</code>, <code>content</code> ou <code>body</code>.
          Mensagens relevantes viram briefings automáticos via Jarvis.
        </Typography>
      </CardContent>
    </Card>
  );
}
