'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import AdminShell from '@/components/admin/AdminShell';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useJarvisPage } from '@/hooks/useJarvisPage';
import AskJarvisButton from '@/components/jarvis/AskJarvisButton';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBrandGoogle,
  IconBrandGmail,
  IconBrandInstagram,
  IconBrandTrello,
  IconBrandWhatsapp,
  IconBuildingBroadcastTower,
  IconCalendar,
  IconCircleCheck,
  IconClockHour4,
  IconDatabaseImport,
  IconExternalLink,
  IconInfoCircle,
  IconPlugOff,
  IconRefresh,
  IconRobot,
  IconShieldCheck,
  IconVideo,
} from '@tabler/icons-react';

// ── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus = 'ok' | 'stale' | 'expiring' | 'error' | 'disconnected';

type Integration = {
  key: string;
  label: string;
  icon: string;
  configured: boolean;
  status: IntegrationStatus;
  last_activity: string | null;
  details: string;
  action_url: string;
  warning?: string | null;
};

type DataDomain = {
  key: string;
  label: string;
  source: string;
  last_write: string | null;
  threshold_h: number;
  freshness: 'ok' | 'stale' | 'critical' | 'no_data';
};

type ControleAlert = {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action_label?: string;
  action_url?: string;
};

type ControleSummary = {
  ok: number;
  warnings: number;
  errors: number;
  total: number;
  alerts_critical: number;
  alerts_warning: number;
  generated_at: string;
};

type ControleData = {
  integrations: Integration[];
  domains: DataDomain[];
  alerts: ControleAlert[];
  summary: ControleSummary;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtAgo(ts: string | null) {
  if (!ts) return '—';
  const h = Math.round((Date.now() - new Date(ts).getTime()) / 3_600_000);
  if (h < 1) return 'Agora';
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)}d`;
}

function fmtTs(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const STATUS_COLOR: Record<IntegrationStatus, string> = {
  ok: '#2e7d32',
  stale: '#ed6c02',
  expiring: '#ed6c02',
  error: '#d32f2f',
  disconnected: '#9e9e9e',
};

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  ok: 'OK',
  stale: 'Desatualizado',
  expiring: 'Expirando',
  error: 'Erro',
  disconnected: 'Desconectado',
};

const FRESHNESS_COLOR = { ok: '#2e7d32', stale: '#ed6c02', critical: '#d32f2f', no_data: '#9e9e9e' };
const FRESHNESS_LABEL = { ok: 'OK', stale: 'Desatualizado', critical: 'Crítico', no_data: 'Sem dados' };

function IntegrationIcon({ iconKey, size = 20 }: { iconKey: string; size?: number }) {
  const props = { size };
  switch (iconKey) {
    case 'trello': return <IconBrandTrello {...props} />;
    case 'meta': return <IconBrandInstagram {...props} />;
    case 'google': return <IconBrandGoogle {...props} />;
    case 'gmail': return <IconBrandGmail {...props} />;
    case 'whatsapp': return <IconBrandWhatsapp {...props} />;
    case 'reportei': return <IconBuildingBroadcastTower {...props} />;
    case 'recall': return <IconVideo {...props} />;
    default: return <IconDatabaseImport {...props} />;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CentralDeControleClient() {
  const [data, setData] = useState<ControleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<ControleData>('/admin/controle');
      setData(res);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await apiPost('/trello/sync-all', {});
      setTimeout(() => { load(); setSyncing(false); }, 4000);
    } catch {
      setSyncing(false);
    }
  };

  useJarvisPage({
    screen: 'admin_controle',
    ok: data?.summary.ok ?? null,
    warnings: data?.summary.warnings ?? null,
    errors: data?.summary.errors ?? null,
    criticalAlerts: data?.summary.alerts_critical ?? null,
  }, [data?.summary.ok, data?.summary.warnings, data?.summary.errors, data?.summary.alerts_critical]);

  // ── Summary bar ──────────────────────────────────────────────────────────
  const healthColor = !data ? '#9e9e9e'
    : data.summary.errors > 0 || data.summary.alerts_critical > 0 ? '#d32f2f'
    : data.summary.warnings > 0 || data.summary.alerts_warning > 0 ? '#ed6c02'
    : '#2e7d32';

  const healthLabel = !data ? '—'
    : data.summary.errors > 0 || data.summary.alerts_critical > 0 ? 'Atenção necessária'
    : data.summary.warnings > 0 || data.summary.alerts_warning > 0 ? 'Avisos pendentes'
    : 'Tudo operacional';

  return (
    <AdminShell section="controle">
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>

        {/* ── Header ── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(healthColor, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: healthColor }}>
              <IconShieldCheck size={20} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>Central de Controle</Typography>
              <Typography variant="caption" color="text.secondary">
                {data ? `Atualizado ${fmtTs(data.summary.generated_at)}` : 'Carregando...'}
              </Typography>
            </Box>
            {data && (
              <Chip
                label={healthLabel}
                size="small"
                sx={{ bgcolor: alpha(healthColor, 0.12), color: healthColor, fontWeight: 700 }}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            {data && (
              <AskJarvisButton
                message={`Status do sistema: ${data.summary.ok} OK, ${data.summary.warnings} avisos, ${data.summary.errors} erros, ${data.summary.alerts_critical} alertas críticos. O que precisa de atenção imediata?`}
                label="Diagnosticar"
                size="small"
              />
            )}
            <Button size="small" variant="outlined" startIcon={syncing ? <CircularProgress size={14} /> : <IconBrandTrello size={16} />} onClick={handleSyncAll} disabled={syncing}>
              Sincronizar Trello
            </Button>
            <Button size="small" variant="outlined" startIcon={loading ? <CircularProgress size={14} /> : <IconRefresh size={16} />} onClick={load} disabled={loading}>
              Atualizar
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading && !data && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        )}

        {data && (
          <>
            {/* ── Summary KPIs — Modernize pastel cards ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: 1.5, mb: 3 }}>
              {[
                { label: 'Operacionais', value: data.summary.ok,              color: '#13DEB9', light: '#E6FFFA', icon: <IconCircleCheck size={22} /> },
                { label: 'Avisos',       value: data.summary.warnings,         color: '#FFAE1F', light: '#FEF5E5', icon: <IconAlertTriangle size={22} /> },
                { label: 'Erros',        value: data.summary.errors,           color: '#FA4D56', light: '#fdeee8', icon: <IconAlertCircle size={22} /> },
                { label: 'Críticos',     value: data.summary.alerts_critical,  color: '#E85219', light: '#fdeee8', icon: <IconAlertCircle size={22} /> },
              ].map((k) => (
                <Paper key={k.label} elevation={0} sx={(theme) => ({
                  p: 3, textAlign: 'center', borderRadius: '8px',
                  bgcolor: theme.palette.mode === 'dark' ? alpha(k.color, 0.1) : k.light,
                  border: `1px solid ${alpha(k.color, 0.18)}`,
                  boxShadow: 'none',
                })}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: alpha(k.color, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, mx: 'auto', mb: 1 }}>
                    {k.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 900, fontSize: '2rem', lineHeight: 1, color: k.color, fontVariantNumeric: 'tabular-nums', mb: 0.5 }}>
                    {k.value}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: `${k.color}bb`, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                    {k.label}
                  </Typography>
                </Paper>
              ))}
            </Box>

            {/* ── Alerts ── */}
            {data.alerts.length > 0 && (
              <Stack spacing={1} mb={3}>
                {data.alerts.map((alert, i) => (
                  <Alert
                    key={i}
                    severity={alert.severity === 'critical' ? 'error' : alert.severity}
                    action={alert.action_url && alert.action_label ? (
                      <Button size="small" color="inherit" variant="outlined" href={alert.action_url} component="a">
                        {alert.action_label}
                      </Button>
                    ) : undefined}
                  >
                    <AlertTitle>{alert.title}</AlertTitle>
                    {alert.message}
                  </Alert>
                ))}
              </Stack>
            )}

            {/* ── Integrations ── */}
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
              Integrações ({data.integrations.length})
            </Typography>
            <Grid container spacing={2} mb={4}>
              {data.integrations.map((integ) => {
                const color = STATUS_COLOR[integ.status];
                return (
                  <Grid key={integ.key} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper elevation={0} sx={(theme) => ({
                      p: 2.5, height: '100%', borderRadius: '8px',
                      border: `1px solid ${integ.status !== 'ok' ? alpha(color, 0.35) : alpha(theme.palette.divider, 1)}`,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      transition: 'box-shadow 0.15s, transform 0.15s',
                      '&:hover': { boxShadow: '0 4px 18px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' },
                    })}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ color, opacity: integ.status === 'disconnected' ? 0.4 : 1 }}>
                            <IntegrationIcon iconKey={integ.icon} />
                          </Box>
                          <Typography variant="body2" fontWeight={700}>{integ.label}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip
                            label={STATUS_LABEL[integ.status]}
                            size="small"
                            sx={{ bgcolor: alpha(color, 0.1), color, fontWeight: 600, fontSize: '0.68rem' }}
                          />
                          <Tooltip title="Abrir configurações">
                            <Box component="a" href={integ.action_url} sx={{ color: 'text.disabled', display: 'flex', '&:hover': { color: 'text.primary' } }}>
                              <IconExternalLink size={14} />
                            </Box>
                          </Tooltip>
                        </Stack>
                      </Stack>

                      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        {integ.details}
                      </Typography>

                      {integ.last_activity && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconClockHour4 size={12} color="#9e9e9e" />
                          <Typography variant="caption" color="text.disabled">
                            {fmtAgo(integ.last_activity)}
                          </Typography>
                        </Stack>
                      )}

                      {integ.warning && (
                        <Alert severity="warning" sx={{ mt: 1, py: 0, px: 1, '& .MuiAlert-message': { fontSize: '0.7rem' } }}>
                          {integ.warning}
                        </Alert>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

            {/* ── Data Freshness ── */}
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
              Frescor dos Dados por Domínio
            </Typography>
            <Paper elevation={0} sx={{ borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              {data.domains.map((domain, i) => {
                const color = FRESHNESS_COLOR[domain.freshness];
                return (
                  <Box key={domain.key}>
                    {i > 0 && <Divider />}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      alignItems={{ sm: 'center' }}
                      sx={{ px: 2.5, py: 1.75 }}
                    >
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={600}>{domain.label}</Typography>
                        <Typography variant="caption" color="text.secondary">Fonte: {domain.source}</Typography>
                      </Box>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ minWidth: 100, textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary" display="block">Última escrita</Typography>
                          <Typography variant="body2" fontWeight={600}>{fmtAgo(domain.last_write)}</Typography>
                        </Box>
                        <Box sx={{ minWidth: 60, textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary" display="block">Limite</Typography>
                          <Typography variant="caption">{domain.threshold_h}h</Typography>
                        </Box>
                        <Chip
                          label={FRESHNESS_LABEL[domain.freshness]}
                          size="small"
                          sx={{ bgcolor: alpha(color, 0.1), color, fontWeight: 600, minWidth: 90, fontSize: '0.7rem' }}
                        />
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Paper>

            {data.alerts.length === 0 && (
              <Alert severity="success" sx={{ mt: 3 }} icon={<IconShieldCheck size={20} />}>
                Todas as integrações estão operacionais e os dados estão dentro dos limites de frescor.
              </Alert>
            )}
          </>
        )}
      </Box>
    </AdminShell>
  );
}
