'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import Chart from '@/components/charts/Chart';
import { apiGet } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  IconRefresh,
  IconList,
  IconRss,
  IconNews,
  IconCalendar,
  IconStarFilled,
  IconChartPie,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconFlame,
  IconClock,
  IconSettings,
} from '@tabler/icons-react';

type ClippingDashboard = {
  total_sources: number;
  active_sources: number;
  total_items: number;
  items_today: number;
  items_this_week: number;
  items_this_month: number;
  by_source: {
    source_id: string;
    source_name: string;
    source_url: string;
    item_count: number;
    last_item_date?: string;
  }[];
  by_score: {
    high: number;
    medium: number;
    low: number;
  };
  top_items: {
    id: string;
    title: string;
    source_name: string;
    score: number;
    published_at: string;
    url?: string;
  }[];
  trends: {
    keyword: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  recent_items: {
    id: string;
    title: string;
    source_name: string;
    score: number;
    published_at: string;
    url?: string;
  }[];
};

function formatNumber(value?: number | null) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

const STAT_CARDS = [
  { key: 'total_sources', label: 'Total fontes', icon: IconRss, color: '#5D87FF' },
  { key: 'total_items', label: 'Total itens', icon: IconNews, color: '#13DEB9' },
  { key: 'items_this_week', label: 'Esta semana', icon: IconCalendar, color: '#FFAE1F' },
  { key: 'by_score_high', label: 'Score alto', icon: IconStarFilled, color: '#FA896B' },
  { key: 'by_score_medium', label: 'Score medio', icon: IconChartPie, color: '#7C3AED' },
] as const;

export default function ClippingDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<ClippingDashboard | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    loadDashboard();
  }, [timeRange]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: ClippingDashboard }>(
        `/clipping/dashboard?range=${timeRange}`
      );
      const payload = (res as any)?.data ?? res;
      if (payload) {
        setDashboard(payload as ClippingDashboard);
      }
    } catch (error) {
      console.error('Failed to load clipping dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'error';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return { Icon: IconTrendingUp, color: '#13DEB9' };
    if (trend === 'down') return { Icon: IconTrendingDown, color: '#FA896B' };
    return { Icon: IconMinus, color: '#7C4DFF' };
  };

  const getStatValue = (key: string): number => {
    if (!dashboard) return 0;
    if (key === 'by_score_high') return dashboard.by_score?.high || 0;
    if (key === 'by_score_medium') return dashboard.by_score?.medium || 0;
    if (key === 'items_this_week') {
      if (timeRange === 'today') return dashboard.items_today || 0;
      if (timeRange === 'month') return dashboard.items_this_month || 0;
      return dashboard.items_this_week || 0;
    }
    return (dashboard as any)?.[key] || 0;
  };

  /* ---------- Chart data ---------- */
  const scoreDonutSeries = dashboard?.by_score
    ? [dashboard.by_score.high, dashboard.by_score.medium, dashboard.by_score.low]
    : [];
  const scoreDonutOptions: ApexCharts.ApexOptions = {
    labels: ['Alto (>= 70)', 'Medio (40-69)', 'Baixo (< 40)'],
    colors: ['#13DEB9', '#FFAE1F', '#FA896B'],
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '14px' } } } } },
    stroke: { width: 0 },
  };

  const sourceBarSeries = dashboard?.by_source?.length
    ? [{ name: 'Itens', data: dashboard.by_source.slice(0, 8).map((s) => s.item_count) }]
    : [];
  const sourceBarOptions: ApexCharts.ApexOptions = {
    chart: { toolbar: { show: false } },
    xaxis: { categories: (dashboard?.by_source || []).slice(0, 8).map((s) => s.source_name.length > 18 ? s.source_name.slice(0, 18) + '...' : s.source_name) },
    colors: ['#5D87FF'],
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: true },
    grid: { borderColor: '#f0f0f0' },
  };

  const trendBarSeries = dashboard?.trends?.length
    ? [{ name: 'Mencoes', data: dashboard.trends.slice(0, 10).map((t) => t.count) }]
    : [];
  const trendBarOptions: ApexCharts.ApexOptions = {
    chart: { toolbar: { show: false } },
    xaxis: { categories: (dashboard?.trends || []).slice(0, 10).map((t) => t.keyword) },
    colors: ['#7C3AED'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#f0f0f0' },
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando clipping dashboard...
        </Typography>
      </Stack>
    );
  }

  return (
    <AppShell
      title="Clipping Dashboard"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Radar</Typography>
          <Typography variant="body2" color="text.secondary">/</Typography>
          <Typography variant="body2" fontWeight={600}>Clipping Dashboard</Typography>
        </Stack>
      }
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Clipping Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Monitore conteudos capturados e tendencias.
          </Typography>
        </Box>

        {/* KPI stat cards */}
        <Grid container spacing={2}>
          {STAT_CARDS.map((metric) => (
            <Grid key={metric.key} size={{ xs: 6, sm: 4, md: 2.4 }}>
              <DashboardCard hoverable sx={{ height: '100%' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: `${metric.color}22`, color: metric.color, width: 44, height: 44 }}>
                    <metric.icon size={22} />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {metric.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {formatNumber(getStatValue(metric.key))}
                    </Typography>
                    {metric.key === 'total_sources' && (
                      <Typography variant="caption" color="text.secondary">
                        {formatNumber(dashboard?.active_sources || 0)} ativas
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </DashboardCard>
            </Grid>
          ))}
        </Grid>

        {/* Time range filters */}
        <DashboardCard title="Filtros" subtitle="Selecione o recorte para as metricas.">
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {(['today', 'week', 'month'] as const).map((range) => (
              <Button
                key={range}
                onClick={() => setTimeRange(range)}
                variant={timeRange === range ? 'contained' : 'outlined'}
                size="small"
              >
                {range === 'today' ? 'Hoje' : range === 'week' ? 'Esta Semana' : 'Este Mes'}
              </Button>
            ))}
            <Button variant="outlined" size="small" startIcon={<IconRefresh size={16} />} onClick={loadDashboard}>
              Atualizar
            </Button>
            <Button variant="contained" size="small" startIcon={<IconList size={16} />} onClick={() => router.push('/clipping')}>
              Ver itens
            </Button>
          </Stack>
        </DashboardCard>

        {/* Score distribution chart + sources chart */}
        {dashboard?.by_score && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 5 }}>
              <DashboardCard title="Distribuicao de score" subtitle="Ultimo periodo">
                {scoreDonutSeries.length > 0 ? (
                  <Chart type="donut" series={scoreDonutSeries} options={scoreDonutOptions} height={300} />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Sem dados de score.
                  </Typography>
                )}
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {[
                    { label: 'Score alto', range: '>= 70', value: dashboard.by_score.high, color: '#13DEB9' },
                    { label: 'Score medio', range: '40 - 69', value: dashboard.by_score.medium, color: '#FFAE1F' },
                    { label: 'Score baixo', range: '< 40', value: dashboard.by_score.low, color: '#FA896B' },
                  ].map((row) => {
                    const total = (dashboard.by_score.high + dashboard.by_score.medium + dashboard.by_score.low) || 1;
                    const pct = Math.round((row.value / total) * 100);
                    return (
                      <Box key={row.label}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: row.color }} />
                            <Typography variant="body2">{row.label}</Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight={600}>
                            {formatNumber(row.value)} ({pct}%)
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { bgcolor: row.color, borderRadius: 3 } }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </DashboardCard>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <DashboardCard title="Top fontes" subtitle={`${dashboard?.by_source?.length || 0} fontes`}>
                {sourceBarSeries.length > 0 && sourceBarSeries[0].data.length > 0 ? (
                  <Chart type="bar" series={sourceBarSeries} options={sourceBarOptions} height={340} />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Nenhuma fonte encontrada.
                  </Typography>
                )}
              </DashboardCard>
            </Grid>
          </Grid>
        )}

        {/* Trending keywords chart */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <DashboardCard title="Trending Keywords" subtitle={`${dashboard?.trends?.length || 0} termos`}>
              {trendBarSeries.length > 0 && trendBarSeries[0].data.length > 0 ? (
                <Chart type="bar" series={trendBarSeries} options={trendBarOptions} height={300} />
              ) : null}
              <Stack spacing={1} sx={{ mt: 2 }}>
                {dashboard?.trends && dashboard.trends.length > 0 ? (
                  dashboard.trends.slice(0, 10).map((trend, idx) => {
                    const { Icon, color } = getTrendIcon(trend.trend);
                    return (
                      <Stack
                        key={idx}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          transition: 'all 0.2s',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ bgcolor: `${color}22`, color, width: 32, height: 32 }}>
                            <Icon size={16} />
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>{trend.keyword}</Typography>
                        </Stack>
                        <Chip size="small" label={formatNumber(trend.count)} color="primary" variant="outlined" />
                      </Stack>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Sem tendencias disponiveis.
                  </Typography>
                )}
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={3}>
              {/* Top items by score */}
              {dashboard?.top_items && dashboard.top_items.length > 0 && (
                <DashboardCard title="Top itens por score" action={<Chip size="small" icon={<IconFlame size={14} />} label={`${dashboard.top_items.length} itens`} variant="outlined" />}>
                  <Stack spacing={1}>
                    {dashboard.top_items.map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          cursor: item.url ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                        }}
                        onClick={() => item.url && window.open(item.url, '_blank')}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" sx={{ maxWidth: '70%' }} noWrap>{item.title}</Typography>
                          <Chip size="small" label={item.score} color={getScoreColor(item.score) as any} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{item.source_name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(item.published_at).toLocaleString('pt-BR')}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </DashboardCard>
              )}

              {/* Recent items */}
              {dashboard?.recent_items && dashboard.recent_items.length > 0 && (
                <DashboardCard title="Itens recentes" action={<Chip size="small" icon={<IconClock size={14} />} label={`${dashboard.recent_items.length} itens`} variant="outlined" />}>
                  <Stack spacing={1}>
                    {dashboard.recent_items.map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          cursor: item.url ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                        }}
                        onClick={() => item.url && window.open(item.url, '_blank')}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" sx={{ maxWidth: '70%' }} noWrap>{item.title}</Typography>
                          <Chip size="small" label={item.score} color={getScoreColor(item.score) as any} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{item.source_name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(item.published_at).toLocaleString('pt-BR')}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </DashboardCard>
              )}
            </Stack>
          </Grid>
        </Grid>

        {!dashboard && (
          <DashboardCard>
            <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
              <Avatar sx={{ bgcolor: 'grey.100', width: 64, height: 64 }}>
                <IconSettings size={32} />
              </Avatar>
              <Typography variant="h6">Nenhum dado disponivel</Typography>
              <Typography variant="body2" color="text.secondary">
                Configure fontes para iniciar o clipping.
              </Typography>
              <Button variant="contained" onClick={() => router.push('/clipping')}>
                Configurar fontes
              </Button>
            </Stack>
          </DashboardCard>
        )}
      </Stack>
    </AppShell>
  );
}
