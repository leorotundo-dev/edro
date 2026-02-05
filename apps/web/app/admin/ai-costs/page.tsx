'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import Chart from '@/components/charts/Chart';
import { apiGet } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import {
  IconRefresh,
  IconCoin,
  IconBrain,
  IconClock,
  IconChartBar,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react';

type Totals = {
  total_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_cost_brl: number;
  avg_duration_ms: number;
};

type ProviderRow = {
  provider: string;
  model: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cost_brl: number;
  avg_duration_ms: number;
};

type DayRow = {
  day: string;
  provider: string;
  cost_brl: number;
  calls: number;
};

type FeatureRow = {
  feature: string;
  calls: number;
  cost_brl: number;
};

type RecentRow = {
  id: string;
  provider: string;
  model: string;
  feature: string;
  input_tokens: number;
  output_tokens: number;
  cost_brl: number;
  duration_ms: number;
  metadata: Record<string, any> | null;
  created_at: string;
};

type CostsData = {
  totals: Totals;
  by_provider: ProviderRow[];
  by_day: DayRow[];
  by_feature: FeatureRow[];
  recent: RecentRow[];
};

const PROVIDER_COLORS: Record<string, string> = {
  gemini: '#4285F4',
  openai: '#10A37F',
  claude: '#D97706',
};

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  claude: 'Claude',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatBrl(v: number): string {
  return `R$ ${Number(v).toFixed(2)}`;
}

function formatUsd(v: number): string {
  return `$ ${Number(v).toFixed(2)}`;
}

function formatDuration(ms: number): string {
  if (!ms) return '-';
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AiCostsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<CostsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<CostsData>(`/admin/ai-costs?days=${days}`);
      setData(res);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals;

  // Build daily chart data
  const dailyChart = buildDailyChart(data?.by_day || []);
  const donutChart = buildDonutChart(data?.by_provider || []);
  const featureChart = buildFeatureChart(data?.by_feature || []);

  const statCards = [
    {
      label: 'Total Chamadas',
      value: formatNumber(totals?.total_calls || 0),
      icon: <IconChartBar size={22} />,
      color: '#5D87FF',
    },
    {
      label: 'Custo BRL',
      value: formatBrl(totals?.total_cost_brl || 0),
      icon: <IconCoin size={22} />,
      color: '#FA896B',
    },
    {
      label: 'Custo USD',
      value: formatUsd(totals?.total_cost_usd || 0),
      icon: <IconCoin size={22} />,
      color: '#10A37F',
    },
    {
      label: 'Input Tokens',
      value: formatNumber(Number(totals?.total_input_tokens || 0)),
      icon: <IconArrowUp size={22} />,
      color: '#4285F4',
    },
    {
      label: 'Output Tokens',
      value: formatNumber(Number(totals?.total_output_tokens || 0)),
      icon: <IconArrowDown size={22} />,
      color: '#D97706',
    },
    {
      label: 'Media / Chamada',
      value: formatDuration(totals?.avg_duration_ms || 0),
      icon: <IconClock size={22} />,
      color: '#7C3AED',
    },
  ];

  return (
    <AppShell title="Custos de IA">
      <Box sx={{ p: 3 }}>
        {/* Header row */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <ToggleButtonGroup
            value={days}
            exclusive
            onChange={(_, v) => v && setDays(v)}
            size="small"
          >
            <ToggleButton value={7}>7d</ToggleButton>
            <ToggleButton value={14}>14d</ToggleButton>
            <ToggleButton value={30}>30d</ToggleButton>
            <ToggleButton value={90}>90d</ToggleButton>
          </ToggleButtonGroup>
          <IconButton onClick={load} disabled={loading}>
            <IconRefresh size={20} />
          </IconButton>
        </Stack>

        {loading && !data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* KPI cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {statCards.map((card) => (
                <Grid key={card.label} size={{ xs: 6, sm: 4, md: 2 }}>
                  <DashboardCard>
                    <Stack alignItems="center" spacing={1}>
                      <Avatar sx={{ bgcolor: card.color + '20', color: card.color, width: 40, height: 40 }}>
                        {card.icon}
                      </Avatar>
                      <Typography variant="h5" fontWeight={700}>
                        {card.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {card.label}
                      </Typography>
                    </Stack>
                  </DashboardCard>
                </Grid>
              ))}
            </Grid>

            {/* Charts row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 8 }}>
                <DashboardCard title="Custo Diario (R$)">
                  <Chart
                    type="area"
                    height={300}
                    options={dailyChart.options}
                    series={dailyChart.series}
                  />
                </DashboardCard>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <DashboardCard title="Por Provider">
                  <Chart
                    type="donut"
                    height={300}
                    options={donutChart.options}
                    series={donutChart.series}
                  />
                </DashboardCard>
              </Grid>
            </Grid>

            {/* Feature + Provider detail */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <DashboardCard title="Custo por Feature">
                  <Chart
                    type="bar"
                    height={280}
                    options={featureChart.options}
                    series={featureChart.series}
                  />
                </DashboardCard>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <DashboardCard title="Providers Detalhado" noPadding>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Provider</TableCell>
                          <TableCell>Modelo</TableCell>
                          <TableCell align="right">Chamadas</TableCell>
                          <TableCell align="right">Tokens</TableCell>
                          <TableCell align="right">Custo R$</TableCell>
                          <TableCell align="right">Media</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(data?.by_provider || []).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Chip
                                label={PROVIDER_LABELS[row.provider] || row.provider}
                                size="small"
                                sx={{
                                  bgcolor: (PROVIDER_COLORS[row.provider] || '#666') + '20',
                                  color: PROVIDER_COLORS[row.provider] || '#666',
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{row.model}</Typography>
                            </TableCell>
                            <TableCell align="right">{row.calls}</TableCell>
                            <TableCell align="right">
                              {formatNumber(Number(row.input_tokens) + Number(row.output_tokens))}
                            </TableCell>
                            <TableCell align="right">{formatBrl(row.cost_brl)}</TableCell>
                            <TableCell align="right">{formatDuration(row.avg_duration_ms)}</TableCell>
                          </TableRow>
                        ))}
                        {(!data?.by_provider || data.by_provider.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                Nenhum dado ainda
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </DashboardCard>
              </Grid>
            </Grid>

            {/* Recent calls */}
            <DashboardCard title="Chamadas Recentes" noPadding>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Modelo</TableCell>
                      <TableCell>Feature</TableCell>
                      <TableCell align="right">Input</TableCell>
                      <TableCell align="right">Output</TableCell>
                      <TableCell align="right">Custo R$</TableCell>
                      <TableCell align="right">Duracao</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.recent || []).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Typography variant="caption">{formatDate(row.created_at)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={PROVIDER_LABELS[row.provider] || row.provider}
                            size="small"
                            sx={{
                              bgcolor: (PROVIDER_COLORS[row.provider] || '#666') + '20',
                              color: PROVIDER_COLORS[row.provider] || '#666',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{row.model}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={row.feature} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell align="right">{formatNumber(row.input_tokens)}</TableCell>
                        <TableCell align="right">{formatNumber(row.output_tokens)}</TableCell>
                        <TableCell align="right">{formatBrl(row.cost_brl)}</TableCell>
                        <TableCell align="right">{formatDuration(row.duration_ms)}</TableCell>
                      </TableRow>
                    ))}
                    {(!data?.recent || data.recent.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                            Nenhuma chamada registrada ainda. Os custos serao logados a partir de agora.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </DashboardCard>
          </>
        )}
      </Box>
    </AppShell>
  );
}

// ── Chart builders ─────────────────────────────────────────────

function buildDailyChart(byDay: DayRow[]) {
  const providers = Array.from(new Set(byDay.map((r) => r.provider)));
  const days = Array.from(new Set(byDay.map((r) => r.day))).sort();

  const series = providers.map((p) => ({
    name: PROVIDER_LABELS[p] || p,
    data: days.map((d) => {
      const row = byDay.find((r) => r.day === d && r.provider === p);
      return Number(row?.cost_brl || 0);
    }),
  }));

  return {
    series,
    options: {
      chart: { type: 'area' as const, toolbar: { show: false }, stacked: true },
      colors: providers.map((p) => PROVIDER_COLORS[p] || '#999'),
      xaxis: {
        categories: days.map((d) => {
          const dt = new Date(d + 'T12:00:00');
          return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }),
      },
      yaxis: {
        labels: { formatter: (v: number) => `R$${v.toFixed(2)}` },
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth' as const, width: 2 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
      tooltip: {
        y: { formatter: (v: number) => `R$ ${v.toFixed(4)}` },
      },
      legend: { position: 'top' as const },
    },
  };
}

function buildDonutChart(byProvider: ProviderRow[]) {
  const grouped: Record<string, number> = {};
  for (const row of byProvider) {
    grouped[row.provider] = (grouped[row.provider] || 0) + Number(row.cost_brl);
  }

  const providers = Object.keys(grouped);
  const series = providers.map((p) => Number(grouped[p].toFixed(4)));

  return {
    series,
    options: {
      chart: { type: 'donut' as const },
      labels: providers.map((p) => PROVIDER_LABELS[p] || p),
      colors: providers.map((p) => PROVIDER_COLORS[p] || '#999'),
      legend: { position: 'bottom' as const },
      dataLabels: {
        formatter: (val: number) => `${val.toFixed(1)}%`,
      },
      tooltip: {
        y: { formatter: (v: number) => `R$ ${v.toFixed(4)}` },
      },
    },
  };
}

function buildFeatureChart(byFeature: FeatureRow[]) {
  return {
    series: [
      {
        name: 'Custo R$',
        data: byFeature.map((r) => Number(Number(r.cost_brl).toFixed(4))),
      },
    ],
    options: {
      chart: { type: 'bar' as const, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      colors: ['#5D87FF'],
      xaxis: {
        categories: byFeature.map((r) => r.feature),
        labels: { formatter: (v: string) => `R$${Number(v).toFixed(2)}` },
      },
      dataLabels: { enabled: false },
      tooltip: {
        y: { formatter: (v: number) => `R$ ${v.toFixed(4)}` },
      },
    },
  };
}
