'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import WorkspaceHero from '@/components/shared/WorkspaceHero';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import DashboardCard from '@/components/shared/DashboardCard';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import {
  IconShield,
  IconAlertTriangle,
  IconLock,
  IconClock,
  IconEye,
  IconStethoscope,
  IconFlag,
  IconBrandWhatsapp,
  IconCheck,
} from '@tabler/icons-react';

type SecurityDashboard = {
  immutable_audit?: {
    total?: number;
    high_risk?: number;
    blocked?: number;
    last_7d?: number;
  };
  access_log?: {
    total?: number;
    suspicious?: number;
    reads?: number;
    updates?: number;
    deletes?: number;
  };
  access_timeline?: Array<{ day?: string; reads?: number; updates?: number; deletes?: number; total?: number }>;
};

type FlagRow = {
  key: string;
  enabled: boolean;
  rules?: Record<string, any> | null;
  updated_at?: string | null;
};

type DiagnosticResult = {
  name: string;
  status: 'ok' | 'error';
  message?: string;
};

function formatNumber(value?: number | null) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

type MeProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  whatsapp_jid: string | null;
};

/** Strip non-digits, ensure Brazil country code, add @s.whatsapp.net */
function phoneToJid(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  const normalized = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  return `${normalized}@s.whatsapp.net`;
}

/** Display-friendly: "5511999999999@s.whatsapp.net" → "+55 (11) 9 9999-9999" */
function jidToDisplay(jid: string | null): string {
  if (!jid) return '';
  const digits = jid.split('@')[0];
  if (!digits || digits.length < 12) return jid;
  // 55 11 9 9999-9999
  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 5)} ${digits.slice(5, 9)}-${digits.slice(9)}`;
}

export default function SettingsClient() {
  const [security, setSecurity] = useState<SecurityDashboard | null>(null);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [error, setError] = useState('');
  const [flagError, setFlagError] = useState('');
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);

  // ── Perfil / WhatsApp ──
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [whatsappInput, setWhatsappInput] = useState('');
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');

  useEffect(() => {
    apiGet<MeProfile>('/me').then((data) => {
      setProfile(data);
      setWhatsappInput(jidToDisplay(data?.whatsapp_jid ?? null));
    }).catch(() => {});
  }, []);

  const handleSaveWhatsapp = async () => {
    setWhatsappSaving(true);
    setWhatsappError('');
    setWhatsappSaved(false);
    try {
      const jid = whatsappInput.trim() ? phoneToJid(whatsappInput.trim()) : null;
      await apiPatch('/me', { whatsapp_jid: jid });
      setProfile((prev) => prev ? { ...prev, whatsapp_jid: jid } : prev);
      setWhatsappInput(jidToDisplay(jid));
      setWhatsappSaved(true);
      setTimeout(() => setWhatsappSaved(false), 3000);
    } catch (err: any) {
      setWhatsappError(err?.message || 'Falha ao salvar.');
    } finally {
      setWhatsappSaving(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      setFlagError('');
      try {
        const response = await apiGet<{ success: boolean; data: SecurityDashboard }>('/security/dashboard');
        setSecurity(response?.data || {});
      } catch (err: any) {
        setError(err?.message || 'Falha ao carregar dados de segurança.');
      }

      try {
        const response = await apiGet<FlagRow[]>('/flags');
        setFlags(response || []);
      } catch (err: any) {
        setFlagError(err?.message || 'Sem permissão para flags ou flags indisponíveis.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const runDiagnostics = async () => {
    setDiagnosticRunning(true);
    const results: DiagnosticResult[] = [];

    const runTest = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn();
        results.push({ name, status: 'ok' });
      } catch (err: any) {
        results.push({
          name,
          status: 'error',
          message: err?.message || 'Erro desconhecido',
        });
      }
    };

    const month = new Date().toISOString().slice(0, 7);

    await runTest('Clientes', async () => {
      await apiGet('/clients');
    });

    await runTest('Calendario (mes atual)', async () => {
      await apiGet(`/calendar/events/${month}`);
    });

    await runTest('Recomendações (enxoval)', async () => {
      await apiPost('/recommendations/enxoval', {
        briefing_text: 'Diagnóstico rápido do sistema',
        objective: 'awareness',
      });
    });

    await runTest('Orquestrador IA', async () => {
      await apiGet('/edro/orchestrator');
    });

    setDiagnostics(results);
    setDiagnosticRunning(false);
  };

  const toggleFlag = async (flag: FlagRow) => {
    setFlagError('');
    try {
      await apiPost(`/flags/${flag.key}`, { enabled: !flag.enabled, rules: flag.rules || {} });
      const next = flags.map((item) => (item.key === flag.key ? { ...item, enabled: !item.enabled } : item));
      setFlags(next);
    } catch (err: any) {
      setFlagError(err?.message || 'Falha ao atualizar flag.');
    }
  };

  if (loading && !security) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando configurações...
        </Typography>
      </Stack>
    );
  }

  return (
    <AppShell title="Configurações do Sistema">
      <Box>
        <Box sx={{ mb: 3 }}>
          <WorkspaceHero
            eyebrow="Settings"
            title="Configurações do sistema"
            description="O workspace para segurança, auditoria, diagnósticos e flags operacionais da plataforma."
            leftChips={[
              { label: 'Segurança' },
              { label: 'Feature Flags' },
            ]}
          />
        </Box>

        <AdminSubmenu value="configuracoes" />

        {/* ── Meu Perfil ───────────────────────────────────────────────── */}
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'success.50', display: 'grid', placeItems: 'center', color: 'success.main' }}>
                <IconBrandWhatsapp size={20} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>Meu perfil</Typography>
                <Typography variant="caption" color="text.secondary">
                  {profile?.email ?? '—'} · {profile?.role ?? ''}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <TextField
                label="WhatsApp / Celular"
                placeholder="+55 (11) 9 9999-9999"
                helperText="Usado pelo Bedel para notificações de jobs e alertas de atraso"
                value={whatsappInput}
                onChange={(e) => setWhatsappInput(e.target.value)}
                disabled={whatsappSaving}
                size="small"
                sx={{ minWidth: 260 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconBrandWhatsapp size={16} color="#25D366" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveWhatsapp}
                disabled={whatsappSaving}
                startIcon={whatsappSaved ? <IconCheck size={15} /> : undefined}
                color={whatsappSaved ? 'success' : 'primary'}
                sx={{ mt: { xs: 0, sm: 0.5 }, whiteSpace: 'nowrap' }}
              >
                {whatsappSaving ? 'Salvando...' : whatsappSaved ? 'Salvo!' : 'Salvar'}
              </Button>
            </Stack>

            {whatsappError && (
              <Alert severity="error" sx={{ mt: 1.5 }}>{whatsappError}</Alert>
            )}

            {profile?.whatsapp_jid && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                JID atual: <code style={{ fontSize: 11 }}>{profile.whatsapp_jid}</code>
              </Typography>
            )}
          </CardContent>
        </Card>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Auditorias', value: formatNumber(security?.immutable_audit?.total), helper: 'eventos imutáveis', icon: <IconShield size={18} />, color: '#5D87FF' },
            { label: 'Risco alto', value: formatNumber(security?.immutable_audit?.high_risk), helper: 'itens para olhar agora', icon: <IconAlertTriangle size={18} />, color: '#FA896B' },
            { label: 'Bloqueadas', value: formatNumber(security?.immutable_audit?.blocked), helper: 'ações travadas', icon: <IconLock size={18} />, color: '#FFAE1F' },
            { label: 'Suspeitos', value: formatNumber(security?.access_log?.suspicious), helper: 'acessos fora do padrão', icon: <IconEye size={18} />, color: '#E85219' },
          ].map((item) => (
            <Grid key={item.label} size={{ xs: 6, md: 3 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: '18px !important' }}>
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        {item.label}
                      </Typography>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: alpha(item.color, 0.1),
                          color: item.color,
                        }}
                      >
                        {item.icon}
                      </Box>
                    </Stack>
                    <Typography variant="h4" fontWeight={800}>{item.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.helper}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Stats row */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <DashboardCard title="Auditorias">
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconShield size={18} />
                <Typography variant="h5">{formatNumber(security?.immutable_audit?.total)}</Typography>
              </Stack>
            </DashboardCard>
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <DashboardCard title="Risco alto">
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconAlertTriangle size={18} />
                <Typography variant="h5">{formatNumber(security?.immutable_audit?.high_risk)}</Typography>
              </Stack>
            </DashboardCard>
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <DashboardCard title="Bloqueadas">
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconLock size={18} />
                <Typography variant="h5">{formatNumber(security?.immutable_audit?.blocked)}</Typography>
              </Stack>
            </DashboardCard>
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <DashboardCard title="Ultimos 7 dias">
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconClock size={18} />
                <Typography variant="h5">{formatNumber(security?.immutable_audit?.last_7d)}</Typography>
              </Stack>
            </DashboardCard>
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <DashboardCard title="Acessos suspeitos">
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconEye size={18} />
                <Typography variant="h5" color="error.main">
                  {formatNumber(security?.access_log?.suspicious)}
                </Typography>
              </Stack>
            </DashboardCard>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              <DashboardCard title="Acessos catalogo">
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Total</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatNumber(security?.access_log?.total)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Leituras</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatNumber(security?.access_log?.reads)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Atualizações</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatNumber(security?.access_log?.updates)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Exclusoes</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatNumber(security?.access_log?.deletes)}</Typography>
                  </Stack>
                </Stack>
              </DashboardCard>

              <DashboardCard title="Timeline (30 dias)">
                {(security?.access_timeline || []).length ? (
                  <Stack spacing={1}>
                    {security?.access_timeline?.slice(0, 10).map((row, index) => (
                      <Stack key={index} direction="row" justifyContent="space-between">
                        <Typography variant="body2">{row.day || 'Dia'}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatNumber(row.total || row.reads || 0)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sem timeline registrada.
                  </Typography>
                )}
              </DashboardCard>
            </Stack>
          </Grid>

          {/* Main */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              <DashboardCard
                title="Diagnóstico de integrações"
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={runDiagnostics}
                    disabled={diagnosticRunning}
                    startIcon={<IconStethoscope size={16} />}
                  >
                    {diagnosticRunning ? 'Testando...' : 'Testar conexoes'}
                  </Button>
                }
              >
                {diagnostics.length ? (
                  <Stack spacing={1.5}>
                    {diagnostics.map((item) => (
                      <Box key={item.name}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">{item.name}</Typography>
                          <Chip
                            size="small"
                            color={item.status === 'ok' ? 'success' : 'error'}
                            label={item.status === 'ok' ? 'OK' : 'Erro'}
                          />
                        </Stack>
                        {item.status === 'error' ? (
                          <Typography variant="caption" color="error.main">{item.message}</Typography>
                        ) : null}
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Execute o diagnóstico para ver os resultados.
                  </Typography>
                )}
              </DashboardCard>

              <DashboardCard title="Feature Flags">
                {flagError ? <Alert severity="error" sx={{ mb: 2 }}>{flagError}</Alert> : null}
                {flags.length ? (
                  <Stack spacing={1.5}>
                    {flags.map((flag) => (
                      <Stack key={flag.key} direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2">{flag.key}</Typography>
                          <Chip
                            size="small"
                            color={flag.enabled ? 'success' : 'default'}
                            label={flag.enabled ? 'On' : 'Off'}
                            variant="outlined"
                          />
                        </Box>
                        <Switch
                          checked={flag.enabled}
                          onChange={() => toggleFlag(flag)}
                          size="small"
                        />
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma flag encontrada.
                  </Typography>
                )}
              </DashboardCard>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </AppShell>
  );
}
