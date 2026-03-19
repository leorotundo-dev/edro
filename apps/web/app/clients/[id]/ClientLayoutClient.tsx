'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { IconBrain, IconCheck, IconChevronLeft, IconDeviceFloppy, IconMail, IconPlus, IconRefresh, IconSparkles, IconUser, IconWorld, IconX } from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';

type ClientBasic = {
  id: string;
  name: string;
  segment_primary?: string | null;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  profile?: {
    knowledge_base?: { description?: string };
    brand_colors?: string[];
  } | null;
};

function darkenHex(hex: string, factor = 0.28): string {
  try {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    if (full.length !== 6) return hex;
    const r = Math.max(0, Math.round(parseInt(full.slice(0, 2), 16) * (1 - factor)));
    const g = Math.max(0, Math.round(parseInt(full.slice(2, 4), 16) * (1 - factor)));
    const b = Math.max(0, Math.round(parseInt(full.slice(4, 6), 16) * (1 - factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch { return hex; }
}

function hexToRgba(hex: string, alpha: number): string {
  try {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  } catch { return `rgba(0,0,0,${alpha})`; }
}

type ClientLayoutClientProps = {
  children: React.ReactNode;
  clientId: string;
};

type AnalysisResult = {
  analysis: string;
  stages?: { provider: string; role: string; duration_ms: number }[];
  sources_used?: Record<string, number>;
  total_duration_ms?: number;
};

const CLIENT_TABS = [
  { label: 'Overview',       path: '' },
  { label: 'Conteúdo',      path: '/conteudo' },
  { label: 'Monitoramento',  path: '/monitoramento' },
  { label: 'Inteligência',  path: '/inteligencia' },
  { label: 'Concorrentes', path: '/concorrentes' },
  { label: 'Métricas',      path: '/metricas' },
  { label: 'Reuniões',      path: '/meetings' },
  { label: 'Demandas',      path: '/demandas' },
  { label: 'Financeiro',    path: '/financeiro' },
  { label: 'WhatsApp',      path: '/whatsapp' },
  { label: 'Perfil',        path: '/perfil' },
];

function formatMarkdown(text: string): string {
  let html = text
    // headers
    .replace(/^### (.+)$/gm, '<h4 style="margin:20px 0 8px;font-size:1rem">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:24px 0 10px;font-size:1.15rem">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:28px 0 12px;font-size:1.3rem">$1</h2>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // unordered lists
    .replace(/^- (.+)$/gm, '<li style="margin-left:16px">$1</li>')
    // ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left:16px">$1</li>')
    // line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  // simple table support: | col | col |
  html = html.replace(
    /(<br\/?>)?\|(.+?)\|(<br\/?>)?/g,
    (_, _pre, content, _post) => {
      const cells = content.split('|').map((c: string) => c.trim());
      if (cells.every((c: string) => /^[-:]+$/.test(c))) return ''; // separator row
      const row = cells.map((c: string) => `<td style="padding:4px 10px;border:1px solid #e0e0e0">${c}</td>`).join('');
      return `<tr>${row}</tr>`;
    }
  );
  if (html.includes('<tr>')) {
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table style="border-collapse:collapse;width:100%;margin:8px 0">$1</table>');
  }

  return html;
}

export default function ClientLayoutClient({ children, clientId }: ClientLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { open: openJarvis } = useJarvis();

  const [client, setClient] = useState<ClientBasic | null>(null);
  const [loading, setLoading] = useState(true);

  // Analysis state
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collabStep, setCollabStep] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Portal invite state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const loadClient = useCallback(async () => {
    try {
      const res = await apiGet(`/clients/${clientId}`);
      const payload =
        (res as { client?: ClientBasic })?.client ??
        (res as { data?: { client?: ClientBasic } })?.data?.client ??
        (res as { data?: ClientBasic })?.data ??
        (res as ClientBasic);
      setClient(payload || null);
    } catch (err) {
      console.error('Failed to load client:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  // Collab stepper simulation
  useEffect(() => {
    if (!analyzing) { setCollabStep(0); return; }
    setCollabStep(0);
    const t1 = setTimeout(() => setCollabStep(1), 5000);
    const t2 = setTimeout(() => setCollabStep(2), 14000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [analyzing]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);
    setSaved(false);
    setAnalysisOpen(true);

    try {
      const res = await apiPost<{ success: boolean; data: AnalysisResult }>(
        `/clients/${clientId}/analyze`,
        {}
      );
      if (res?.data) {
        setAnalysisResult(res.data);
        setTimeout(() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
      } else {
        setAnalysisError('Resposta inesperada da API.');
      }
    } catch (err: any) {
      setAnalysisError(err?.message || 'Falha ao gerar análise.');
    } finally {
      setAnalyzing(false);
    }
  };

  const saveToLibrary = async () => {
    if (!analysisResult?.analysis) return;
    setSaving(true);
    try {
      const today = new Date().toLocaleDateString('pt-BR');
      await apiPost(`/clients/${clientId}/library`, {
        type: 'note',
        title: `Análise Estratégica — ${clientName} (${today})`,
        description: analysisResult.analysis,
        category: 'estrategia',
        tags: ['analise-estrategica', 'ai-generated'],
        weight: 'high',
        use_in_ai: true,
      });
      setSaved(true);
    } catch {
      // silently fail — user can retry
    } finally {
      setSaving(false);
    }
  };

  const sendPortalInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteError('');
    try {
      await apiPost(`/clients/${clientId}/portal/invite`, { email: inviteEmail });
      setInviteDone(true);
    } catch (err: any) {
      setInviteError(err?.message || 'Falha ao enviar convite.');
    } finally {
      setInviting(false);
    }
  };

  const basePath = `/clients/${clientId}`;

  const getActiveTab = () => {
    const currentPath = pathname.replace(basePath, '');
    if (!currentPath || currentPath === '/') return '';
    return currentPath;
  };

  const activeTab = getActiveTab();
  const tabValue = activeTab || 'overview';

  const clientName = client?.name || 'Cliente';
  const location = [client?.city, client?.uf, client?.country].filter(Boolean).join(', ');

  const brandColors = client?.profile?.brand_colors || [];
  const c0 = brandColors[0];
  const c1 = brandColors[1] || (c0 ? darkenHex(c0) : undefined);
  const headerBg = c0
    ? `linear-gradient(135deg, ${c0} 0%, ${c1} 100%)`
    : 'linear-gradient(135deg, #E85219 0%, #c43e10 50%, #cc5200 100%)';
  const headerShadow = c0
    ? `0 8px 32px ${hexToRgba(c0, 0.35)}`
    : '0 8px 32px rgba(232, 82, 25, 0.3)';

  const sourcesLabel = analysisResult?.sources_used
    ? Object.entries(analysisResult.sources_used)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(', ')
    : null;

  return (
    <AppShell title={clientName}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <Card sx={{
          background: headerBg,
          borderRadius: '12px',
          boxShadow: headerShadow,
          border: 'none',
          p: { xs: 2, sm: 3 },
          pb: 0,
        }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton
                onClick={() => router.push('/clients')}
                aria-label="Voltar para Clientes"
                sx={{ border: '1px solid rgba(255,255,255,0.3)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                <IconChevronLeft size={18} />
              </IconButton>
              <Box>
                {loading ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} sx={{ color: 'white' }} />
                    <Typography variant="h4" sx={{ color: 'rgba(255,255,255,0.7)' }}>Carregando...</Typography>
                  </Stack>
                ) : (
                  <>
                    <Typography variant="h4" fontWeight={700} sx={{ color: 'white', lineHeight: 1.2 }}>
                      {clientName}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                      {client?.segment_primary && (
                        <Chip size="small" label={client.segment_primary}
                          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, backdropFilter: 'blur(4px)' }} />
                      )}
                      <Chip size="small" label="Ativo"
                        sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white', fontWeight: 600 }} />
                      {location && (
                        <Chip size="small" icon={<IconWorld size={14} color="white" />} label={location}
                          sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
                      )}
                    </Stack>
                  </>
                )}
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<IconMail size={16} />}
                onClick={() => { setInviteOpen(true); setInviteDone(false); setInviteError(''); }}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }, textTransform: 'none' }}
              >
                Convidar para Portal
              </Button>
              <Button
                variant="contained"
                startIcon={<IconBrain size={16} />}
                onClick={() => openJarvis(clientId)}
                sx={{
                  textTransform: 'none',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  backdropFilter: 'blur(4px)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                Jarvis
              </Button>
              <Button
                variant="contained"
                startIcon={<IconPlus size={16} />}
                component={Link}
                href={`/studio/brief?clientId=${clientId}`}
                sx={{
                  textTransform: 'none',
                  bgcolor: '#E85219',
                  color: 'white',
                  '&:hover': { bgcolor: '#c43e10' },
                }}
              >
                Criar Pauta
              </Button>
              <Button
                variant="contained"
                startIcon={<IconSparkles size={16} />}
                onClick={runAnalysis}
                disabled={analyzing || loading}
                sx={{
                  textTransform: 'none',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  backdropFilter: 'blur(4px)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                Analisar
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconUser size={16} />}
                component={Link}
                href={`/clients/${clientId}`}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                Editar
              </Button>
            </Stack>
          </Stack>

          <Tabs
            value={tabValue}
            onChange={(_, value) => {
              const target = value === 'overview' ? '' : value;
              router.push(`${basePath}${target}`);
            }}
            sx={{
              mt: 2,
              '& .MuiTab-root': { color: 'rgba(255,255,255,0.7)', fontWeight: 600, '&.Mui-selected': { color: 'white' } },
              '& .MuiTabs-indicator': { bgcolor: 'white' },
            }}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {CLIENT_TABS.map((tab) => (
              <Tab
                key={tab.label}
                label={tab.label}
                value={tab.path || 'overview'}
              />
            ))}
          </Tabs>
        </Card>

        {children}
      </Box>

      {/* Portal Invite Dialog */}
      <Dialog open={inviteOpen} onClose={() => !inviting && setInviteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconMail size={20} />
            <Typography variant="h6" component="span">Convidar para o Portal</Typography>
          </Stack>
          <IconButton onClick={() => setInviteOpen(false)} disabled={inviting}><IconX size={18} /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {inviteDone ? (
            <Stack spacing={2} alignItems="center" py={2}>
              <IconCheck size={40} color="#16a34a" />
              <Typography variant="body1" fontWeight={600} color="success.main">Convite enviado!</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                O cliente receberá um e-mail com o código de acesso ao portal.
              </Typography>
              <Button variant="outlined" onClick={() => setInviteOpen(false)}>Fechar</Button>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Digite o e-mail do contato do cliente. Ele receberá um código de acesso ao Portal do Cliente da Edro.
              </Typography>
              <TextField
                label="E-mail do cliente"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                fullWidth
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && sendPortalInvite()}
                error={!!inviteError}
                helperText={inviteError}
              />
              <Button
                variant="contained"
                onClick={sendPortalInvite}
                disabled={inviting || !inviteEmail}
                startIcon={inviting ? <CircularProgress size={14} /> : <IconMail size={16} />}
                sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}
              >
                {inviting ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Analysis Dialog */}
      <Dialog
        open={analysisOpen}
        onClose={() => !analyzing && setAnalysisOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { height: '90vh', display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconSparkles size={20} />
            <Typography variant="h6" component="span">
              Análise Estratégica — {clientName}
            </Typography>
          </Stack>
          <IconButton onClick={() => !analyzing && setAnalysisOpen(false)} disabled={analyzing}>
            <IconX size={18} />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent ref={contentRef} sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {analyzing && (
            <Box sx={{ py: 4 }}>
              <Stepper activeStep={collabStep} sx={{ mb: 3, '& .MuiStepLabel-label': { fontSize: '0.85rem' } }}>
                <Step>
                  <StepLabel>Gemini — Analisando dados</StepLabel>
                </Step>
                <Step>
                  <StepLabel>OpenAI — Elaborando estrategia</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Claude — Compilando relatório</StepLabel>
                </Step>
              </Stepper>
              <LinearProgress
                variant="indeterminate"
                color={collabStep === 0 ? 'primary' : collabStep === 1 ? 'warning' : 'secondary'}
                sx={{ height: 4, borderRadius: 2 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                Analisando Calendar, Planning, Clipping, Library, Insights e Performance...
              </Typography>
            </Box>
          )}

          {analysisError && !analyzing && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="error" gutterBottom>{analysisError}</Typography>
              <Button variant="outlined" onClick={runAnalysis} startIcon={<IconRefresh size={16} />} sx={{ mt: 1 }}>
                Tentar novamente
              </Button>
            </Box>
          )}

          {analysisResult && !analyzing && (
            <>
              <Box
                sx={{
                  '& h2': { color: 'primary.main', borderBottom: '2px solid', borderColor: 'primary.main', pb: 0.5 },
                  '& h3': { color: 'text.primary' },
                  '& li': { lineHeight: 1.8 },
                  '& table': { fontSize: '0.85rem' },
                  '& td': { fontSize: '0.85rem' },
                  '& strong': { color: 'text.primary' },
                  lineHeight: 1.7,
                  fontSize: '0.9rem',
                  color: 'text.secondary',
                }}
                dangerouslySetInnerHTML={{ __html: formatMarkdown(analysisResult.analysis) }}
              />

              <Divider sx={{ my: 3 }} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {sourcesLabel && (
                    <Chip label={`Fontes: ${sourcesLabel}`} size="small" variant="outlined" />
                  )}
                  {analysisResult.total_duration_ms && (
                    <Chip label={`${(analysisResult.total_duration_ms / 1000).toFixed(1)}s`} size="small" variant="outlined" />
                  )}
                  {analysisResult.stages?.map((s, i) => (
                    <Chip key={i} label={`${s.role}: ${s.provider}`} size="small" variant="outlined" color={s.provider === 'claude' ? 'secondary' : s.provider === 'openai' ? 'warning' : 'primary'} />
                  ))}
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={saved ? 'contained' : 'outlined'}
                    color={saved ? 'success' : 'primary'}
                    onClick={saveToLibrary}
                    disabled={saving || saved}
                    startIcon={saved ? <IconCheck size={16} /> : <IconDeviceFloppy size={16} />}
                    size="small"
                  >
                    {saving ? 'Salvando...' : saved ? 'Salvo na Library' : 'Salvar na Library'}
                  </Button>
                  <Button variant="outlined" onClick={runAnalysis} startIcon={<IconRefresh size={16} />} size="small">
                    Gerar novamente
                  </Button>
                </Stack>
              </Stack>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
