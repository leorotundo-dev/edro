'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconPlugConnected,
  IconRefresh,
  IconShieldCheck,
  IconTrendingDown,
  IconUsers,
  IconZap,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Gap = { type: string; label: string; priority: string; action_url: string };

type ClientGap = { client_id: string; client_name: string; gaps: Gap[] };

type ConnectorError = {
  client_id: string; client_name: string; provider: string;
  last_error: string | null; last_sync_at: string | null;
  label: string; priority: string; action_url: string;
};

type JarvisAlert = {
  id: string; client_id: string | null; client_name: string | null;
  alert_type: string; title: string; priority: string;
  created_at: string; action_url: string | null;
};

type OpSignal = {
  id: string; client_id: string | null; client_name: string | null;
  domain: string; signal_type: string; title: string;
  severity: number; summary: string | null; action_url: string | null; created_at: string;
};

type PerfAlert = {
  id: string; client_id: string | null; client_name: string | null;
  type: string; title: string; body: string | null; severity: string;
  action_url: string | null; created_at: string;
};

type HealthCritical = {
  client_id: string; client_name: string; score: number; trend: string; action_url: string;
};

type HealthData = {
  summary: { urgent: number; high: number; medium: number; total: number; client_gap_count: number };
  client_gaps: ClientGap[];
  connector_errors: ConnectorError[];
  jarvis_alerts: JarvisAlert[];
  op_signals: OpSignal[];
  perf_alerts: PerfAlert[];
  health_critical: HealthCritical[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  urgent: 'error', high: 'warning', medium: 'info', low: 'default',
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgente', high: 'Alto', medium: 'Médio', low: 'Baixo',
};

const GAP_TYPE_LABEL: Record<string, string> = {
  no_connector_meta:       'Instagram / Meta',
  no_connector_reportei:   'Reportei',
  no_keywords:             'Keywords',
};

const ALERT_TYPE_LABEL: Record<string, string> = {
  card_stalled:         'Card parado',
  job_no_briefing:      'Job sem briefing',
  whatsapp_no_reply:    'WhatsApp sem resposta',
  meeting_no_card:      'Reunião sem card',
  contract_expiring:    'Contrato expirando',
  market_opportunity:   'Oportunidade de mercado',
};

function fmtDate(s?: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  value, label, color, icon,
}: {
  value: number; label: string; color: string; icon: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: value > 0 ? color : 'divider' }}>
      <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={700} color={value > 0 ? color : 'text.disabled'}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
          <Box sx={{ color: value > 0 ? color : 'text.disabled', opacity: 0.7 }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ActionChip({ url, label = 'Ver' }: { url: string | null; label?: string }) {
  const router = useRouter();
  if (!url) return null;
  return (
    <Button
      size="small" variant="outlined" endIcon={<IconArrowRight size={13} />}
      onClick={() => router.push(url)}
      sx={{ borderRadius: 6, fontSize: 11, py: 0.25, px: 1.5, minWidth: 0 }}
    >
      {label}
    </Button>
  );
}

function IssueRow({
  priority, title, subtitle, meta, actionUrl, actionLabel,
}: {
  priority: string; title: string; subtitle?: string | null;
  meta?: string | null; actionUrl?: string | null; actionLabel?: string;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} py={1.25}
      sx={{ borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
      <Chip
        label={PRIORITY_LABEL[priority] ?? priority}
        color={PRIORITY_COLOR[priority] ?? 'default'}
        size="small"
        sx={{ minWidth: 68, justifyContent: 'center' }}
      />
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={500} noWrap>{title}</Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" display="block">{subtitle}</Typography>
        )}
      </Box>
      {meta && (
        <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>{meta}</Typography>
      )}
      <ActionChip url={actionUrl ?? null} label={actionLabel ?? 'Resolver'} />
    </Stack>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SystemHealthClient() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('gaps');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<HealthData>('/admin/system-health');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar saúde do sistema');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Stack alignItems="center" py={8}><CircularProgress /></Stack>;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!data) return null;

  const { summary } = data;
  const isHealthy = summary.total === 0 && summary.client_gap_count === 0;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconShieldCheck size={28} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Central de Saúde</Typography>
            <Typography variant="caption" color="text.secondary">
              Todos os problemas e gaps do sistema em um lugar
            </Typography>
          </Box>
        </Stack>
        <Button size="small" variant="outlined" startIcon={<IconRefresh size={16} />} onClick={load}>
          Atualizar
        </Button>
      </Stack>

      {/* Summary row */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryCard value={summary.urgent} label="Urgente" color="#f44336"
            icon={<IconAlertTriangle size={28} />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryCard value={summary.high} label="Alto" color="#ff9800"
            icon={<IconZap size={28} />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryCard value={summary.medium} label="Médio" color="#2196f3"
            icon={<IconAlertTriangle size={28} />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryCard value={summary.client_gap_count} label="Clientes c/ gaps" color="#9c27b0"
            icon={<IconUsers size={28} />} />
        </Grid>
      </Grid>

      {/* All clear */}
      {isHealthy && (
        <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'success.main', textAlign: 'center', py: 6 }}>
          <IconCheck size={48} color="green" />
          <Typography variant="h6" mt={2} color="success.main">Sistema saudável</Typography>
          <Typography variant="body2" color="text.secondary">Nenhum gap ou alerta aberto.</Typography>
        </Card>
      )}

      {!isHealthy && (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab value="gaps" label={`Gaps de config (${summary.client_gap_count})`} />
            <Tab value="conectores" label={`Conectores (${data.connector_errors.length})`} />
            <Tab value="alertas" label={`Alertas Jarvis (${data.jarvis_alerts.length})`} />
            <Tab value="operacional" label={`Operacional (${data.op_signals.length})`} />
            <Tab value="performance" label={`Performance (${data.perf_alerts.length + data.health_critical.length})`} />
          </Tabs>

          {/* ── GAPS DE CONFIGURAÇÃO ─────────────────────────────────────── */}
          {tab === 'gaps' && (
            <Box>
              {data.client_gaps.length === 0
                ? <Typography color="text.secondary" py={3} textAlign="center">Nenhum gap de configuração.</Typography>
                : data.client_gaps.map(cg => (
                  <Card key={cg.client_id} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        <Typography variant="subtitle2" fontWeight={700}>{cg.client_name}</Typography>
                        <Chip label={`${cg.gaps.length} gap${cg.gaps.length > 1 ? 's' : ''}`}
                          size="small" color="warning" variant="outlined" />
                      </Stack>
                      {cg.gaps.map(g => (
                        <IssueRow
                          key={g.type}
                          priority={g.priority}
                          title={g.label}
                          subtitle={GAP_TYPE_LABEL[g.type] ?? g.type}
                          actionUrl={g.action_url}
                          actionLabel="Configurar"
                        />
                      ))}
                    </CardContent>
                  </Card>
                ))
              }
            </Box>
          )}

          {/* ── CONECTORES COM ERRO ──────────────────────────────────────── */}
          {tab === 'conectores' && (
            <Box>
              {data.connector_errors.length === 0
                ? <Typography color="text.secondary" py={3} textAlign="center">Todos os conectores saudáveis.</Typography>
                : (
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                      {data.connector_errors.map((ce, i) => (
                        <IssueRow
                          key={i}
                          priority={ce.priority}
                          title={`${ce.client_name} — ${ce.provider}`}
                          subtitle={ce.last_error ?? 'Sem sync há +72h'}
                          meta={ce.last_sync_at ? fmtDate(ce.last_sync_at) : undefined}
                          actionUrl={ce.action_url}
                          actionLabel="Reconectar"
                        />
                      ))}
                    </CardContent>
                  </Card>
                )
              }
            </Box>
          )}

          {/* ── ALERTAS JARVIS ───────────────────────────────────────────── */}
          {tab === 'alertas' && (
            <Box>
              {data.jarvis_alerts.length === 0
                ? <Typography color="text.secondary" py={3} textAlign="center">Nenhum alerta Jarvis aberto.</Typography>
                : (
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                      {data.jarvis_alerts.map(a => (
                        <IssueRow
                          key={a.id}
                          priority={a.priority}
                          title={a.title}
                          subtitle={`${a.client_name ?? 'Geral'} · ${ALERT_TYPE_LABEL[a.alert_type] ?? a.alert_type}`}
                          meta={fmtDate(a.created_at)}
                          actionUrl={a.action_url}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )
              }
            </Box>
          )}

          {/* ── SINAIS OPERACIONAIS ──────────────────────────────────────── */}
          {tab === 'operacional' && (
            <Box>
              {data.op_signals.length === 0
                ? <Typography color="text.secondary" py={3} textAlign="center">Nenhum sinal operacional aberto.</Typography>
                : (
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                      {data.op_signals.map(s => (
                        <IssueRow
                          key={s.id}
                          priority={s.severity >= 80 ? 'urgent' : s.severity >= 60 ? 'high' : 'medium'}
                          title={s.title}
                          subtitle={s.client_name ?? s.domain}
                          meta={fmtDate(s.created_at)}
                          actionUrl={s.action_url}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )
              }
            </Box>
          )}

          {/* ── PERFORMANCE ─────────────────────────────────────────────── */}
          {tab === 'performance' && (
            <Box>
              {data.health_critical.length === 0 && data.perf_alerts.length === 0
                ? <Typography color="text.secondary" py={3} textAlign="center">Nenhum alerta de performance.</Typography>
                : (
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                      {data.health_critical.map(h => (
                        <IssueRow
                          key={h.client_id}
                          priority="high"
                          title={`${h.client_name} — Saúde crítica`}
                          subtitle={`Score ${h.score}/100 · Tendência: ${h.trend}`}
                          actionUrl={h.action_url}
                          actionLabel="Ver cliente"
                        />
                      ))}
                      {data.health_critical.length > 0 && data.perf_alerts.length > 0 && (
                        <Divider sx={{ my: 1 }} />
                      )}
                      {data.perf_alerts.map(p => (
                        <IssueRow
                          key={p.id}
                          priority={p.severity === 'error' ? 'urgent' : p.severity === 'warning' ? 'high' : 'medium'}
                          title={p.title}
                          subtitle={`${p.client_name ?? ''} · ${p.body ?? ''}`}
                          meta={fmtDate(p.created_at)}
                          actionUrl={p.action_url}
                          actionLabel="Ver métricas"
                        />
                      ))}
                    </CardContent>
                  </Card>
                )
              }
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
