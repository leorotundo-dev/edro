'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconChartBar,
  IconExternalLink,
  IconPlugConnected,
  IconRefresh,
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react';

/* ─── Types ──────────────────────────────────────────────────── */
type MetricValue = {
  value: number | null;
  comparison: number | null;
  delta_pct: number | null;
};

type Snapshot = Record<string, MetricValue>;

type TopBriefing = {
  briefing_id: string;
  title: string;
  delivered_at: string;
  platform: string;
  impressions?: number;
  engagement_rate?: number;
};

type BenchmarkRow = {
  metric: string;
  client: number | null;
  portfolio_avg: number | null;
  delta_pct: number | null;
  percentile: number | null;
};

type MetricsData = {
  snapshot: Snapshot;
  prev_snapshot: Snapshot | null;
  top_briefings: TopBriefing[];
  available_platforms: string[];
  synced_at: string | null;
};

type BenchmarkData = {
  benchmark: BenchmarkRow[];
  total_clients: number;
};

/* ─── Label maps ──────────────────────────────────────────────── */
const METRIC_LABELS: Record<string, string> = {
  'ig:impressions':      'Impressões',
  'ig:reach':            'Alcance',
  'ig:engagement_rate':  'Engajamento',
  'ig:followers_gained': 'Novos Seguidores',
  'ig:likes':            'Curtidas',
  'ig:comments':         'Comentários',
  'ig:saves':            'Salvamentos',
  'ig:shares':           'Compartilhamentos',
  'ig:profile_visits':   'Visitas ao Perfil',
  'li:impressions':      'Impressões',
  'li:engagement_rate':  'Engajamento',
  'li:followers_gained': 'Novos Seguidores',
  'li:clicks':           'Cliques',
  'ma:spend':            'Investimento',
  'ma:reach':            'Alcance',
  'ma:impressions':      'Impressões',
  'ma:ctr':              'CTR',
  'ma:cpc':              'CPC',
  'ma:roas':             'ROAS',
  'ga:sessions':         'Sessões',
  'ga:new_users':        'Novos Usuários',
  'ga:pageviews':        'Visualizações',
  'ga:bounce_rate':      'Taxa de Rejeição',
  'ga:avg_session':      'Duração Média',
};

const PLATFORM_LABELS: Record<string, string> = {
  Instagram:       'Instagram',
  LinkedIn:        'LinkedIn',
  MetaAds:         'Meta Ads',
  GoogleAnalytics: 'Google Analytics',
};

const WINDOW_LABELS: Record<string, string> = {
  '7d':  'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
};

/* ─── Helpers ─────────────────────────────────────────────────── */
function fmtNumber(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  const pos = delta >= 0;
  return (
    <Chip
      size="small"
      icon={pos ? <IconArrowUpRight size={12} /> : <IconArrowDownRight size={12} />}
      label={`${pos ? '+' : ''}${delta.toFixed(1)}%`}
      color={pos ? 'success' : 'error'}
      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, ml: 0.5 }}
    />
  );
}

function KpiCard({ metricKey, data }: { metricKey: string; data: MetricValue }) {
  const label = METRIC_LABELS[metricKey] ?? metricKey;
  const val = data.value;
  const delta = data.delta_pct;
  const isPositiveTrend = delta != null && delta >= 0;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: delta != null
          ? delta >= 20 ? 'success.light' : delta <= -20 ? 'error.light' : 'divider'
          : 'divider',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Stack direction="row" alignItems="baseline" spacing={0.5} mt={0.5}>
          <Typography variant="h5" fontWeight={700}>
            {fmtNumber(val)}
          </Typography>
          <DeltaBadge delta={delta} />
        </Stack>
        {data.comparison != null && (
          <Typography variant="caption" color="text.secondary">
            vs {fmtNumber(data.comparison)} período anterior
          </Typography>
        )}
        {delta != null && (
          <Box mt={0.5}>
            {isPositiveTrend ? (
              <IconTrendingUp size={14} color="#22c55e" />
            ) : (
              <IconTrendingDown size={14} color="#ef4444" />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Main component ──────────────────────────────────────────── */
type Props = { clientId: string };

export default function ReporteiMetricsClient({ clientId }: Props) {
  const [window, setWindow]         = useState<string>('30d');
  const [platform, setPlatform]     = useState<string>('Instagram');
  const [data, setData]             = useState<MetricsData | null>(null);
  const [benchmark, setBenchmark]   = useState<BenchmarkData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [noConnector, setNoConnector] = useState(false);

  const load = useCallback(async (win: string, plat: string) => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, benchRes] = await Promise.all([
        apiGet<MetricsData>(`/clients/${clientId}/metrics/reportei?window=${win}&platform=${plat}`),
        apiGet<BenchmarkData>(`/clients/${clientId}/metrics/benchmark?window=${win}&platform=${plat}`),
      ]);
      setData(metricsRes);
      setBenchmark(benchRes);
      // Update available platform if list changed
      if (metricsRes.available_platforms?.length && !metricsRes.available_platforms.includes(plat)) {
        setPlatform(metricsRes.available_platforms[0]);
      }
    } catch (e: any) {
      if (e?.status === 404 || e?.message?.includes('no_connector') || e?.message?.includes('not_found')) {
        setNoConnector(true);
      } else {
        setError(e?.message ?? 'Erro ao carregar métricas');
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(window, platform); }, [load, window, platform]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiPost(`/clients/${clientId}/metrics/reportei/sync`, {});
      await load(window, platform);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  if (noConnector) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
            <IconPlugConnected size={40} stroke={1.5} color="#94a3b8" />
            <Typography variant="h6">Reportei não configurado</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 380 }}>
              Configure a integração com o Reportei em{' '}
              <strong>Admin → Reportei</strong> para visualizar métricas reais de performance.
            </Typography>
            <Button
              variant="contained"
              startIcon={<IconExternalLink size={16} />}
              href="/admin/reportei"
            >
              Configurar Reportei
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const snapshotKeys = data ? Object.keys(data.snapshot) : [];
  const kpiEntries = snapshotKeys
    .filter((k) => data!.snapshot[k].value != null)
    .slice(0, 12);

  return (
    <Box>
      {/* Header toolbar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2} mb={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconChartBar size={20} />
          <Typography variant="h6" fontWeight={700}>Métricas Reportei</Typography>
          {data?.synced_at && (
            <Typography variant="caption" color="text.secondary">
              Sincronizado {new Date(data.synced_at).toLocaleDateString('pt-BR')}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Período</InputLabel>
            <Select value={window} label="Período" onChange={(e) => setWindow(e.target.value)}>
              {Object.entries(WINDOW_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>{l}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Plataforma</InputLabel>
            <Select value={platform} label="Plataforma" onChange={(e) => setPlatform(e.target.value)}>
              {(data?.available_platforms ?? ['Instagram', 'LinkedIn', 'MetaAds', 'GoogleAnalytics']).map((p) => (
                <MenuItem key={p} value={p}>{PLATFORM_LABELS[p] ?? p}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
            onClick={handleSync}
            disabled={syncing || loading}
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" py={8}><CircularProgress /></Stack>
      ) : (
        <>
          {/* KPI Grid */}
          {kpiEntries.length > 0 ? (
            <Grid container spacing={2} mb={4}>
              {kpiEntries.map((key) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={key}>
                  <KpiCard metricKey={key} data={data!.snapshot[key]} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              Nenhum dado disponível para {PLATFORM_LABELS[platform] ?? platform} neste período.
              Clique em "Sincronizar" para buscar dados do Reportei.
            </Alert>
          )}

          {/* Top Briefings */}
          {(data?.top_briefings?.length ?? 0) > 0 && (
            <>
              <Divider sx={{ mb: 3 }} />
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Top Conteúdos do Período
              </Typography>
              <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mb: 4 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell><Typography variant="caption" fontWeight={700}>Briefing</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight={700}>Plataforma</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700}>Impressões</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700}>Engajamento</Typography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data!.top_briefings.map((b, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 300 }}>
                            {b.title || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {b.delivered_at ? new Date(b.delivered_at).toLocaleDateString('pt-BR') : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={b.platform || '—'} />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{fmtNumber(b.impressions ?? null)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {b.engagement_rate != null ? `${b.engagement_rate.toFixed(2)}%` : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Benchmark */}
          {(benchmark?.benchmark?.length ?? 0) > 0 && (
            <>
              <Divider sx={{ mb: 3 }} />
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Benchmark do Portfólio
                </Typography>
                <Chip
                  size="small"
                  label={`${benchmark!.total_clients} clientes`}
                  color="default"
                />
              </Stack>
              <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell><Typography variant="caption" fontWeight={700}>Métrica</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700}>Este cliente</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700}>Média portfólio</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700}>Delta</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700}>Percentil</Typography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {benchmark!.benchmark.map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography variant="body2">{METRIC_LABELS[row.metric] ?? row.metric}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>{fmtNumber(row.client)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">{fmtNumber(row.portfolio_avg)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <DeltaBadge delta={row.delta_pct} />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={`Top ${100 - (row.percentile ?? 50)}% do portfólio`}>
                            <Chip
                              size="small"
                              label={row.percentile != null ? `P${row.percentile}` : '—'}
                              color={
                                row.percentile != null
                                  ? row.percentile >= 75 ? 'success' : row.percentile >= 50 ? 'warning' : 'error'
                                  : 'default'
                              }
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      )}
    </Box>
  );
}
