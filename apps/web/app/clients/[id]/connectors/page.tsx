'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import Alert from '@mui/material/Alert';
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
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconArrowLeft, IconX } from '@tabler/icons-react';

type Connector = {
  provider: string;
  payload?: Record<string, any> | null;
  secrets_meta?: Record<string, any> | null;
  updated_at?: string | null;
};

type AvailableProvider = {
  id: string;
  name: string;
  description: string;
  icon: string;
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
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Integração com Facebook/Instagram Ads Manager',
    icon: '\uD83D\uDCD8',
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
    id: 'webhook',
    name: 'Custom Webhook',
    description: 'Webhook personalizado para receber dados externos',
    icon: '\uD83D\uDD17',
    configFields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true },
      { key: 'secret_key', label: 'Secret Key', type: 'password', required: false },
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

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">Loading connectors...</Typography>
        </Stack>
      </Box>
    );
  }

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
        <Typography variant="h5">Integracoes &amp; Connectors</Typography>
        <Typography variant="body2" color="text.secondary">
          Configure integrações com plataformas externas.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {AVAILABLE_PROVIDERS.map((provider) => {
          const status = getConnectorStatus(provider.id);
          const isConnected = Boolean(status);

          return (
            <Grid key={provider.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="h6">{provider.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {provider.description}
                        </Typography>
                      </Box>
                      {isConnected ? (
                        <Chip size="small" color="success" label="Conectado" />
                      ) : (
                        <Chip size="small" variant="outlined" label="Novo" />
                      )}
                    </Stack>

                    <Typography variant="h4">{provider.icon}</Typography>

                    {status?.updated_at ? (
                      <Typography variant="caption" color="text.secondary">
                        Atualizado em {new Date(status.updated_at).toLocaleString('pt-BR')}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Sem sincronizacao recente.
                      </Typography>
                    )}

                    <Button
                      variant={isConnected ? 'outlined' : 'contained'}
                      onClick={() => openConfigModal(provider.id)}
                    >
                      {isConnected ? 'Gerenciar' : 'Configurar'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

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
