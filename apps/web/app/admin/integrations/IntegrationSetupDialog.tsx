'use client';

/**
 * IntegrationSetupDialog
 * Self-contained setup wizard for each integration type.
 * Opens as a modal — user never needs to leave the integrations page.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconBrandGmail,
  IconBrandGoogle,
  IconBrandInstagram,
  IconBrandMeta,
  IconBrandWhatsapp,
  IconCheck,
  IconCircleCheck,
  IconCopy,
  IconExternalLink,
  IconPlayerPlay,
  IconRefresh,
  IconRobot,
  IconX,
} from '@tabler/icons-react';

// ── Types ────────────────────────────────────────────────────────────────────

export type IntegrationType =
  | 'evolution-whatsapp'
  | 'google-oauth'
  | 'whatsapp-meta'
  | 'recall'
  | 'instagram';

type ConfigHints = {
  google_redirect_uri_gmail: string;
  google_redirect_uri_calendar: string;
  webhook_base_url: string;
  meta_verify_token_set: boolean;
};

type IntegrationHealth = {
  google: { client_id: boolean; client_secret: boolean; pubsub_topic: boolean; calendar_webhook: boolean };
  ai: { gemini: boolean; openai: boolean };
  search: { serper: boolean; tavily: boolean; google_trends: boolean };
  meta: { app_id: boolean; app_secret: boolean; redirect_uri: boolean; verify_token: boolean };
  whatsapp_evolution: { api_key: boolean; api_url: boolean };
  whatsapp_meta: { token: boolean; phone_id: boolean; verify_token: boolean };
  recall: { api_key: boolean; webhook_secret: boolean; google_login_group: boolean };
  reportei: { token: boolean; base_url: boolean };
  omie: { app_key: boolean; app_secret: boolean };
  analytics: { youtube: boolean };
  auth: { oidc_issuer: boolean; oidc_client_id: boolean };
};

type Props = {
  open: boolean;
  type: IntegrationType | null;
  health: IntegrationHealth | null;
  onClose: () => void;
  onRefresh: () => void;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField
        size="small"
        label={label}
        value={value}
        fullWidth
        InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.78rem' } }}
      />
      <Tooltip title={copied ? 'Copiado!' : 'Copiar'}>
        <IconButton size="small" onClick={copy} color={copied ? 'success' : 'default'}>
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function RailwayCommand({ vars }: { vars: Record<string, string> }) {
  const [copied, setCopied] = useState(false);
  const cmd = Object.entries(vars)
    .map(([k, v]) => `railway variables set ${k}="${v}"`)
    .join('\n');
  const copy = () => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.common.black, 0.05), fontFamily: 'monospace', fontSize: '0.72rem', position: 'relative' }}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{cmd}</pre>
      <Tooltip title={copied ? 'Copiado!' : 'Copiar comando'}>
        <IconButton size="small" onClick={copy} color={copied ? 'success' : 'default'}
          sx={{ position: 'absolute', top: 6, right: 6 }}>
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function Step({ n, label, done, children }: { n: number; label: string; done?: boolean; children?: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: done ? 'success.main' : 'primary.main',
        color: '#fff', fontSize: '0.7rem', fontWeight: 900,
      }}>
        {done ? <IconCheck size={14} /> : n}
      </Box>
      <Box sx={{ flex: 1, pt: 0.25 }}>
        <Typography variant="body2" fontWeight={700} sx={{ mb: children ? 1 : 0 }}>{label}</Typography>
        {children}
      </Box>
    </Stack>
  );
}

// ── Evolution WhatsApp dialog ────────────────────────────────────────────────

function EvolutionSetup({ health, onRefresh }: { health: IntegrationHealth | null; onRefresh: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'connecting' | 'qr' | 'connected' | 'error'>('idle');
  const [qrBase64, setQrBase64] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configured = health?.whatsapp_evolution.api_url && health?.whatsapp_evolution.api_key;

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  useEffect(() => () => stopPoll(), []);

  const pollStatus = useCallback(async () => {
    try {
      const res = await apiGet<{ configured: boolean; live?: { state: string; profileName?: string } }>('/whatsapp-groups/status');
      if (res.live?.state === 'open') {
        stopPoll();
        setPhase('connected');
        setStatusMsg(res.live.profileName ? `Conectado como ${res.live.profileName}` : 'WhatsApp conectado!');
        onRefresh();
      }
    } catch { /* ignore */ }
  }, [onRefresh]);

  const handleConnect = async () => {
    setPhase('connecting');
    setErrorMsg('');
    setQrBase64('');
    try {
      const res = await apiPost<{ success: boolean; qr: { base64: string; code: string } }>('/whatsapp-groups/connect', {});
      if (res.qr?.base64) {
        setQrBase64(res.qr.base64);
        setPhase('qr');
        pollRef.current = setInterval(pollStatus, 3000);
      } else {
        setPhase('error');
        setErrorMsg('QR code não disponível. Tente novamente.');
      }
    } catch (e: any) {
      setPhase('error');
      setErrorMsg(e.message || 'Falha ao conectar.');
    }
  };

  const handleRefreshQr = async () => {
    setQrBase64('');
    try {
      const res = await apiGet<{ success: boolean; qr: { base64: string } }>('/whatsapp-groups/qrcode');
      if (res.qr?.base64) setQrBase64(res.qr.base64);
    } catch { /* ignore */ }
  };

  const handleReconfigure = async () => {
    try {
      await apiPost('/whatsapp-groups/reconfigure-webhook', {});
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleForceReset = async () => {
    setPhase('connecting');
    setErrorMsg('');
    setQrBase64('');
    try {
      const res = await apiPost<{ success: boolean; qr: { base64: string; code: string } }>('/whatsapp-groups/restart', { force_recreate: true });
      if (res.qr?.base64) {
        setQrBase64(res.qr.base64);
        setPhase('qr');
        pollRef.current = setInterval(pollStatus, 3000);
      } else {
        setPhase('error');
        setErrorMsg('Sessão reiniciada mas QR não disponível. Clique em Atualizar QR.');
      }
    } catch (e: any) {
      setPhase('error');
      setErrorMsg(e.message || 'Falha ao reiniciar sessão.');
    }
  };

  if (!configured) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">
          Evolution API não configurada. Configure as variáveis de ambiente abaixo no Railway.
        </Alert>
        <RailwayCommand vars={{
          EVOLUTION_API_URL: 'https://sua-instancia-evolution.com',
          EVOLUTION_API_KEY: 'sua-api-key-global',
        }} />
        <Typography variant="caption" color="text.secondary">
          Hospede o Evolution API v2 no Railway ou em qualquer servidor. O projeto open-source está em{' '}
          <a href="https://github.com/EvolutionAPI/evolution-api" target="_blank" rel="noreferrer">github.com/EvolutionAPI/evolution-api</a>.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
        A Evolution API está configurada (URL + KEY ✓). Conecte um número de WhatsApp escaneando o QR code abaixo com o app no celular.
      </Alert>

      {phase === 'idle' && (
        <Button variant="contained" startIcon={<IconPlayerPlay size={16} />} onClick={handleConnect} fullWidth>
          Iniciar conexão
        </Button>
      )}

      {phase === 'connecting' && (
        <Stack alignItems="center" spacing={1.5} sx={{ py: 3 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">Aguardando QR code da Evolution API...</Typography>
        </Stack>
      )}

      {phase === 'qr' && (
        <Stack alignItems="center" spacing={1.5}>
          {qrBase64 ? (
            <Box component="img" src={qrBase64} alt="QR Code WhatsApp"
              sx={{ width: 220, height: 220, borderRadius: 2, border: '4px solid', borderColor: 'divider' }} />
          ) : (
            <Box sx={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" textAlign="center">
            Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo → escaneie o código
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={<IconRefresh size={14} />} onClick={handleRefreshQr} variant="outlined">
              Atualizar QR
            </Button>
            <Button size="small" onClick={handleConnect} variant="outlined">
              Reiniciar
            </Button>
          </Stack>
        </Stack>
      )}

      {phase === 'connected' && (
        <Stack spacing={1.5}>
          <Alert severity="success" icon={<IconCircleCheck size={20} />}>
            {statusMsg}
          </Alert>
          <Button variant="outlined" size="small" onClick={handleReconfigure}>
            Reconfigurar webhook automaticamente
          </Button>
        </Stack>
      )}

      {phase === 'error' && (
        <Stack spacing={1}>
          <Alert severity="error">{errorMsg}</Alert>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleConnect} sx={{ flex: 1 }}>Tentar novamente</Button>
            <Button variant="contained" color="warning" onClick={handleForceReset} sx={{ flex: 1 }}>
              Forçar reconexão
            </Button>
          </Stack>
        </Stack>
      )}

      <Divider />
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button size="small" variant="outlined" startIcon={<IconRefresh size={13} />} onClick={handleReconfigure}>
          Reconfigurar webhook
        </Button>
        <Button size="small" variant="outlined" color="warning" startIcon={<IconRefresh size={13} />} onClick={handleForceReset}>
          Resetar sessão
        </Button>
        <Button size="small" href="/admin/whatsapp-groups" endIcon={<IconExternalLink size={13} />}>
          Gerenciar grupos
        </Button>
      </Stack>
    </Stack>
  );
}

// ── Google OAuth dialog ──────────────────────────────────────────────────────

function GoogleOAuthSetup({
  health,
  hints,
  onGmailConnect,
  onCalendarConnect,
}: {
  health: IntegrationHealth | null;
  hints: ConfigHints | null;
  onGmailConnect: () => void;
  onCalendarConnect: () => void;
}) {
  const clientIdOk = health?.google.client_id;
  const clientSecretOk = health?.google.client_secret;
  const bothOk = clientIdOk && clientSecretOk;

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1.5}>
        <Step n={1} label="Criar projeto no Google Cloud Console" done={!!bothOk}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              Acesse console.cloud.google.com → APIs &amp; Services → Credentials → Create OAuth 2.0 Client ID.
            </Typography>
            <Button size="small" variant="outlined" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
              endIcon={<IconExternalLink size={13} />}>
              Abrir Google Cloud Console
            </Button>
          </Stack>
        </Step>

        <Step n={2} label="Adicionar URIs de redirecionamento autorizados" done={!!bothOk}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              No OAuth Client ID, adicione estas URLs em &quot;Authorized redirect URIs&quot;:
            </Typography>
            {hints?.google_redirect_uri_gmail && (
              <CopyField label="Redirect URI — Gmail" value={hints.google_redirect_uri_gmail} />
            )}
            {hints?.google_redirect_uri_calendar && (
              <CopyField label="Redirect URI — Calendar" value={hints.google_redirect_uri_calendar} />
            )}
          </Stack>
        </Step>

        <Step n={3} label="Configurar variáveis de ambiente no Railway" done={!!bothOk}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              Copie o Client ID e Client Secret gerados e adicione no Railway:
            </Typography>
            <RailwayCommand vars={{
              GOOGLE_CLIENT_ID: 'cole-seu-client-id-aqui',
              GOOGLE_CLIENT_SECRET: 'cole-seu-client-secret-aqui',
              GOOGLE_REDIRECT_URI: hints?.google_redirect_uri_gmail ?? 'https://api.edro.digital/auth/google/callback',
            }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`CLIENT_ID: ${clientIdOk ? '✓ Configurado' : '✗ Faltando'}`} size="small"
                color={clientIdOk ? 'success' : 'error'} variant="outlined" />
              <Chip label={`CLIENT_SECRET: ${clientSecretOk ? '✓ Configurado' : '✗ Faltando'}`} size="small"
                color={clientSecretOk ? 'success' : 'error'} variant="outlined" />
            </Stack>
          </Stack>
        </Step>

        <Step n={4} label="Pub/Sub — notificações em tempo real (recomendado)" done={!!health?.google.pubsub_topic}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              Sem isso o Gmail conecta, mas o sistema não recebe emails automaticamente — só sob demanda.
              Para ativar: Google Cloud Console → Pub/Sub → Topics → Create Topic.
            </Typography>
            <Button size="small" variant="outlined"
              href="https://console.cloud.google.com/cloudpubsub/topic/list" target="_blank" rel="noopener noreferrer"
              endIcon={<IconExternalLink size={13} />}>
              Abrir Pub/Sub no Cloud Console
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              Após criar o tópico, adicione o email <code>serviceAccount:gmail-api-push@system.gserviceaccount.com</code> como <strong>Pub/Sub Publisher</strong> nas permissões do tópico.
              Depois configure no Railway:
            </Typography>
            <RailwayCommand vars={{ GOOGLE_PUBSUB_TOPIC: 'projects/SEU-PROJECT-ID/topics/SEU-TOPICO' }} />
            <Chip
              label={`GOOGLE_PUBSUB_TOPIC: ${health?.google.pubsub_topic ? '✓ Configurado' : '✗ Faltando (opcional)'}`}
              size="small"
              color={health?.google.pubsub_topic ? 'success' : 'warning'}
              variant="outlined"
            />
          </Stack>
        </Step>

        <Step n={5} label="Conectar Gmail e Google Calendar" done={false}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              size="small"
              startIcon={<IconBrandGmail size={14} />}
              onClick={onGmailConnect}
              disabled={!bothOk}
              sx={{ bgcolor: '#EA4335', '&:hover': { bgcolor: '#c0392b' }, '&:disabled': { bgcolor: 'action.disabledBackground' } }}
            >
              Conectar Gmail
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<IconBrandGoogle size={14} />}
              onClick={onCalendarConnect}
              disabled={!bothOk}
              sx={{ bgcolor: '#F9AB00', color: '#000', '&:hover': { bgcolor: '#f59e0b' }, '&:disabled': { bgcolor: 'action.disabledBackground' } }}
            >
              Conectar Calendar
            </Button>
          </Stack>
          {!bothOk && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Complete os passos 1–3 e atualize o deploy antes de conectar.
            </Typography>
          )}
        </Step>
      </Stack>

      <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
        Após configurar as variáveis, faça redeploy no Railway para que entrem em vigor.
        Depois volte aqui e clique em &quot;Conectar Gmail&quot;.
      </Alert>
    </Stack>
  );
}

// ── WhatsApp Meta (Cloud API) dialog ─────────────────────────────────────────

function WhatsAppMetaSetup({ health }: { health: IntegrationHealth | null }) {
  const tokenOk = health?.whatsapp_meta.token;
  const phoneOk = health?.whatsapp_meta.phone_id;
  const bothOk = tokenOk && phoneOk;
  const [testPhone, setTestPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleTest = async () => {
    if (!testPhone.trim()) return;
    setSending(true);
    setTestResult(null);
    try {
      await apiPost('/admin/integrations/whatsapp/test-send', { phone: testPhone.trim() });
      setTestResult({ ok: true, msg: 'Mensagem enviada! Verifique o WhatsApp.' });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message || 'Falha ao enviar.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1.5}>
        <Step n={1} label="Criar app no Meta for Developers" done={!!bothOk}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              Acesse developers.facebook.com → My Apps → Create App → Business → WhatsApp.
            </Typography>
            <Button size="small" variant="outlined" href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer"
              endIcon={<IconExternalLink size={13} />}>
              Abrir Meta for Developers
            </Button>
          </Stack>
        </Step>

        <Step n={2} label="Obter Phone Number ID e Access Token permanente" done={!!bothOk}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
            No app criado: WhatsApp → Getting Started. Copie o <strong>Phone Number ID</strong>.
            Para o token permanente: System Users → gerar token com permissão <code>whatsapp_business_messaging</code>.
          </Typography>
        </Step>

        <Step n={3} label="Configurar no Railway" done={!!bothOk}>
          <Stack spacing={1}>
            <RailwayCommand vars={{
              WHATSAPP_TOKEN: 'seu-access-token-permanente',
              WHATSAPP_PHONE_ID: 'seu-phone-number-id',
            }} />
            <Stack direction="row" spacing={1}>
              <Chip label={`WHATSAPP_TOKEN: ${tokenOk ? '✓' : '✗'}`} size="small"
                color={tokenOk ? 'success' : 'error'} variant="outlined" />
              <Chip label={`WHATSAPP_PHONE_ID: ${phoneOk ? '✓' : '✗'}`} size="small"
                color={phoneOk ? 'success' : 'error'} variant="outlined" />
            </Stack>
          </Stack>
        </Step>

        <Step n={4} label="Testar envio" done={false}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                size="small"
                placeholder="Ex: 5511999990000"
                value={testPhone}
                onChange={(e) => { setTestPhone(e.target.value); setTestResult(null); }}
                disabled={sending || !bothOk}
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleTest}
                disabled={!testPhone.trim() || sending || !bothOk}
              >
                {sending ? 'Enviando...' : 'Testar'}
              </Button>
            </Stack>
            {testResult && (
              <Alert severity={testResult.ok ? 'success' : 'error'} sx={{ fontSize: '0.78rem' }}>
                {testResult.msg}
              </Alert>
            )}
          </Stack>
        </Step>
      </Stack>
    </Stack>
  );
}

// ── Recall.ai dialog ─────────────────────────────────────────────────────────

function RecallSetup({ health }: { health: IntegrationHealth | null }) {
  const apiKeyOk = health?.recall.api_key;
  const webhookOk = health?.recall.webhook_secret;
  const loginGroupOk = health?.recall.google_login_group;

  return (
    <Stack spacing={2.5}>
      <Alert severity={apiKeyOk ? 'success' : 'info'} sx={{ fontSize: '0.8rem' }}>
        {apiKeyOk
          ? 'Recall.ai configurado. O bot entra automaticamente nas reuniões detectadas pelo Calendar.'
          : 'Configure a RECALL_API_KEY para ativar o bot de reuniões.'}
      </Alert>

      <Stack spacing={1.5}>
        <Step n={1} label="Criar conta no Recall.ai" done={!!apiKeyOk}>
          <Button size="small" variant="outlined" href="https://recall.ai" target="_blank" rel="noopener noreferrer" endIcon={<IconExternalLink size={13} />}>
            Acessar Recall.ai
          </Button>
        </Step>

        <Step n={2} label="Configurar variáveis de ambiente" done={!!apiKeyOk && !!webhookOk}>
          <Stack spacing={1}>
            <RailwayCommand vars={{
              RECALL_API_KEY: 'seu-recall-api-key',
              RECALL_WEBHOOK_SECRET: 'seu-webhook-secret',
            }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`RECALL_API_KEY: ${apiKeyOk ? '✓' : '✗'}`} size="small" color={apiKeyOk ? 'success' : 'error'} variant="outlined" />
              <Chip label={`RECALL_WEBHOOK_SECRET: ${webhookOk ? '✓' : '✗'}`} size="small" color={webhookOk ? 'success' : 'error'} variant="outlined" />
              <Chip label={`RECALL_GOOGLE_LOGIN_GROUP_ID: ${loginGroupOk ? '✓' : 'Opcional'}`} size="small" color={loginGroupOk ? 'success' : 'default'} variant="outlined" />
            </Stack>
          </Stack>
        </Step>

        <Step n={3} label="Conectar Google Calendar" done={false}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
            Com o Calendar conectado, o bot é enfileirado automaticamente para cada reunião detectada.
            Configure o Google OAuth (card acima) e o bot funciona sem mais configuração.
          </Typography>
        </Step>
      </Stack>
    </Stack>
  );
}

// ── Instagram dialog ─────────────────────────────────────────────────────────

function InstagramSetup({ health, hints }: { health: IntegrationHealth | null; hints: ConfigHints | null }) {
  const verifyTokenOk = health?.meta.verify_token;
  const webhookUrl = hints ? `${hints.webhook_base_url}/webhook/instagram` : 'https://api.edro.digital/webhook/instagram';

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1.5}>
        <Step n={1} label="Configurar META_VERIFY_TOKEN no Railway" done={!!verifyTokenOk}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              Defina uma string aleatória como Verify Token — ela vai ser usada no Meta e no Railway.
            </Typography>
            <RailwayCommand vars={{ META_VERIFY_TOKEN: 'gere-uma-string-aleatoria-segura' }} />
            <Chip label={`META_VERIFY_TOKEN: ${verifyTokenOk ? '✓ Configurado' : '✗ Faltando'}`} size="small"
              color={verifyTokenOk ? 'success' : 'error'} variant="outlined" />
          </Stack>
        </Step>

        <Step n={2} label="Configurar webhook no Meta for Developers" done={false}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              Vá em: App → Webhooks → Instagram. Adicione:
            </Typography>
            <CopyField label="Callback URL" value={webhookUrl} />
            <Typography variant="caption" color="text.secondary">
              Verify Token: o mesmo valor que você definiu em <code>META_VERIFY_TOKEN</code> acima.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Subscribe: <strong>messages</strong> e, se disponível, <strong>messaging_postbacks</strong>
            </Typography>
          </Stack>
        </Step>

        <Step n={3} label="Conectar conta Instagram no painel de cada cliente" done={false}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              Após o webhook estar ativo, vá em cada cliente → Instagram → Conectar conta via OAuth.
            </Typography>
            <Button size="small" variant="outlined" href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer"
              endIcon={<IconExternalLink size={13} />}>
              Abrir Meta for Developers
            </Button>
          </Stack>
        </Step>
      </Stack>
    </Stack>
  );
}

// ── Main dialog ──────────────────────────────────────────────────────────────

const DIALOG_META: Record<IntegrationType, { title: string; icon: React.ReactNode; color: string }> = {
  'evolution-whatsapp': {
    title: 'WhatsApp — Evolution API',
    icon: <IconBrandWhatsapp size={22} />,
    color: '#25D366',
  },
  'google-oauth': {
    title: 'Google — Gmail & Calendar',
    icon: <IconBrandGoogle size={22} />,
    color: '#4285F4',
  },
  'whatsapp-meta': {
    title: 'WhatsApp — Meta Cloud API (notificações)',
    icon: <IconBrandMeta size={22} />,
    color: '#0A66C2',
  },
  recall: {
    title: 'Recall.ai — Bot de reuniões',
    icon: <IconRobot size={22} />,
    color: '#6366F1',
  },
  instagram: {
    title: 'Instagram DMs',
    icon: <IconBrandInstagram size={22} />,
    color: '#E1306C',
  },
};

export default function IntegrationSetupDialog({ open, type, health, onClose, onRefresh }: Props) {
  const [hints, setHints] = useState<ConfigHints | null>(null);

  useEffect(() => {
    if (!open) return;
    apiGet<ConfigHints>('/admin/integrations/config-hints').then(setHints).catch(() => {});
  }, [open]);

  if (!type) return null;
  const meta = DIALOG_META[type];

  const renderContent = () => {
    switch (type) {
      case 'evolution-whatsapp':
        return <EvolutionSetup health={health} onRefresh={() => { onRefresh(); }} />;
      case 'google-oauth':
        return (
          <GoogleOAuthSetup
            health={health}
            hints={hints}
            onGmailConnect={async () => {
              try {
                const r = await apiGet<{ url: string }>('/auth/google/start?mode=json');
                if (r.url) window.location.assign(r.url);
              } catch (e: any) { alert(e.message); }
            }}
            onCalendarConnect={async () => {
              try {
                const r = await apiGet<{ url: string }>('/auth/google/calendar/start?mode=json');
                if (r.url) window.location.assign(r.url);
              } catch (e: any) { alert(e.message); }
            }}
          />
        );
      case 'whatsapp-meta':
        return <WhatsAppMetaSetup health={health} />;
      case 'recall':
        return <RecallSetup health={health} />;
      case 'instagram':
        return <InstagramSetup health={health} hints={hints} />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: meta.color, width: 36, height: 36 }}>
            {meta.icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>{meta.title}</Typography>
            <Typography variant="caption" color="text.secondary">Configuração guiada</Typography>
          </Box>
          <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
