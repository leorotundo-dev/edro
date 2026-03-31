'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import DashboardCard from '@/components/shared/DashboardCard';
import Chart from '@/components/charts/Chart';
import { apiGet, apiPatch } from '@/lib/api';
import { baseChartOptions } from '@/utils/chartTheme';
import { useThemeMode } from '@/contexts/ThemeContext';
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
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import {
  IconRefresh,
  IconCoin,
  IconBrain,
  IconClock,
  IconChartBar,
  IconArrowUp,
  IconArrowDown,
  IconWorld,
  IconPhoto,
  IconRobot,
  IconVideo,
  IconCheck,
  IconAlertTriangle,
  IconExternalLink,
  IconEdit,
  IconDeviceFloppy,
  IconX,
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

type RecallData = {
  total_bots: number;
  completed: number;
  in_progress: number;
  total_minutes: number;
  cost_usd: number;
  cost_brl: number;
  active_days: number;
  last_meeting_at: string | null;
};

type CostsData = {
  totals: Totals;
  by_provider: ProviderRow[];
  by_day: DayRow[];
  by_feature: FeatureRow[];
  recent: RecentRow[];
  recall?: RecallData;
};

const PROVIDER_COLORS: Record<string, string> = {
  gemini: '#4285F4',
  openai: '#10A37F',
  claude: '#D97706',
  perplexity: '#20B2AA',
  tavily: '#0EA5E9',
  leonardo: '#C026D3',
  recall: '#7C3AED',
};

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  claude: 'Claude',
  perplexity: 'Perplexity',
  tavily: 'Tavily',
  leonardo: 'Leonardo.ai',
  recall: 'Recall.ai',
};

const TAVILY_FREE_TIER = 1000; // credits/month on free plan

type PlatformCostRow = {
  platform: string;
  name: string;
  category: string;
  model: 'subscription' | 'usage' | 'free' | 'freemium';
  color: string;
  url: string;
  cost_usd: number;
  cost_brl: number;
  source: 'tracked' | 'manual' | 'free';
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

export function AiCostsView({ embedded = false }: { embedded?: boolean }) {
  const { isDark } = useThemeMode();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<CostsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [platformCosts, setPlatformCosts] = useState<PlatformCostRow[]>([]);
  const [platformMonth, setPlatformMonth] = useState('');
  const [platformLoading, setPlatformLoading] = useState(true);
  const [editPlatform, setEditPlatform] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

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

  const loadPlatformCosts = useCallback(async () => {
    setPlatformLoading(true);
    try {
      const res = await apiGet<{ success: boolean; month: string; data: PlatformCostRow[] }>('/admin/platform-costs');
      setPlatformCosts(res.data ?? []);
      setPlatformMonth(res.month ?? '');
    } catch {
      // silent
    } finally {
      setPlatformLoading(false);
    }
  }, []);

  const savePlatformCost = async (platform: string) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    try {
      await apiPatch(`/admin/platform-costs/${platform}`, { monthly_cost_usd: val });
      await loadPlatformCosts();
      setEditPlatform(null);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadPlatformCosts();
  }, [loadPlatformCosts]);

  const totals = data?.totals;

  // Build daily chart data
  const dailyChart = buildDailyChart(data?.by_day || [], isDark);
  const donutChart = buildDonutChart(data?.by_provider || [], isDark);
  const featureChart = buildFeatureChart(data?.by_feature || [], isDark);

  // Tavily summary derived from by_provider data
  const tavilyRows = (data?.by_provider || []).filter((r) => r.provider === 'tavily');
  const tavilySearches = tavilyRows.filter((r) => r.model.startsWith('search')).reduce((s, r) => s + Number(r.calls), 0);
  const tavilyExtracts = tavilyRows.filter((r) => r.model === 'extract').reduce((s, r) => s + Number(r.calls), 0);
  const tavilyTotalCalls = tavilyRows.reduce((s, r) => s + Number(r.calls), 0);
  const tavilyCostUsd = tavilyRows.reduce((s, r) => s + Number(r.cost_usd), 0);
  const tavilyCostBrl = tavilyRows.reduce((s, r) => s + Number(r.cost_brl), 0);
  const tavilyFreeTierPct = Math.min(100, Math.round((tavilyTotalCalls / TAVILY_FREE_TIER) * 100));

  // Leonardo.ai summary derived from by_provider data
  const leonardoRows = (data?.by_provider || []).filter((r) => r.provider === 'leonardo');
  const leonardoTotalImages = leonardoRows.reduce((s, r) => s + Number(r.output_tokens), 0); // output_tokens = num_images
  const leonardoCostUsd = leonardoRows.reduce((s, r) => s + Number(r.cost_usd), 0);
  const leonardoCostBrl = leonardoRows.reduce((s, r) => s + Number(r.cost_brl), 0);

  // Recall.ai from dedicated recall field
  const recall = data?.recall;

  const statCards = [
    {
      label: 'Total Chamadas',
      value: formatNumber(totals?.total_calls || 0),
      icon: <IconChartBar size={22} />,
      color: '#E85219',
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

  const content = (
      <Box>
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

            {/* Tavily Web Search summary */}
            <DashboardCard title="Tavily — Uso de Busca Web" sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="stretch">
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Stack alignItems="center" spacing={0.5}>
                    <IconWorld size={24} color="#0EA5E9" />
                    <Typography variant="h5" fontWeight={700}>{tavilyTotalCalls}</Typography>
                    <Typography variant="caption" color="text.secondary">Total de chamadas</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="h6" fontWeight={700} color="#0EA5E9">{tavilySearches}</Typography>
                    <Typography variant="caption" color="text.secondary">Buscas</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="h6" fontWeight={700} color="#0EA5E9">{tavilyExtracts}</Typography>
                    <Typography variant="caption" color="text.secondary">Extrações</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="h6" fontWeight={700}>{formatBrl(tavilyCostBrl)}</Typography>
                    <Typography variant="caption" color="text.secondary">Custo BRL</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 3 }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">Free tier ({days}d)</Typography>
                      <Typography variant="caption" fontWeight={600}>{tavilyTotalCalls}/{TAVILY_FREE_TIER}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={tavilyFreeTierPct}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'rgba(14,165,233,0.12)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: tavilyFreeTierPct >= 90 ? '#FA896B' : tavilyFreeTierPct >= 70 ? '#FFAE1F' : '#0EA5E9',
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">{tavilyFreeTierPct}% do plano gratuito</Typography>
                  </Stack>
                </Grid>
              </Grid>
            </DashboardCard>

            {/* Leonardo.ai Image Generation summary */}
            {leonardoRows.length > 0 && (
              <DashboardCard title="Leonardo.ai — Geração de Imagens" sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <IconPhoto size={24} color="#C026D3" />
                      <Typography variant="h5" fontWeight={700}>{leonardoTotalImages}</Typography>
                      <Typography variant="caption" color="text.secondary">Imagens geradas</Typography>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3, md: 3 }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" fontWeight={700} color="#C026D3">{formatUsd(leonardoCostUsd)}</Typography>
                      <Typography variant="caption" color="text.secondary">Custo USD</Typography>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3, md: 3 }}>
                    <Stack alignItems="center" spacing={0.5}>
                      <Typography variant="h6" fontWeight={700}>{formatBrl(leonardoCostBrl)}</Typography>
                      <Typography variant="caption" color="text.secondary">Custo BRL</Typography>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Custo médio por imagem
                      </Typography>
                      <Typography variant="body1" fontWeight={700} color="#C026D3">
                        {leonardoTotalImages > 0 ? formatUsd(leonardoCostUsd / leonardoTotalImages) : '–'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Modelos: {leonardoRows.map((r) => r.model).join(', ')}
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </DashboardCard>
            )}

            {/* Recall.ai Meeting Bots summary */}
            <DashboardCard title="Recall.ai — Bots de Transcrição de Reuniões" sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Stack alignItems="center" spacing={0.5}>
                    <IconVideo size={24} color="#7C3AED" />
                    <Typography variant="h5" fontWeight={700}>{recall?.total_bots ?? 0}</Typography>
                    <Typography variant="caption" color="text.secondary">Bots agendados</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="h6" fontWeight={700} color="success.main">{recall?.completed ?? 0}</Typography>
                    <Typography variant="caption" color="text.secondary">Concluídos</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="h6" fontWeight={700} color="#7C3AED">{recall?.total_minutes ?? 0} min</Typography>
                    <Typography variant="caption" color="text.secondary">Minutos transcritos</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="h6" fontWeight={700}>{formatUsd(recall?.cost_usd ?? 0)}</Typography>
                    <Typography variant="caption" color="text.secondary">Custo USD</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: 3 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="h6" fontWeight={700}>{formatBrl(recall?.cost_brl ?? 0)}</Typography>
                    <Typography variant="caption" color="text.secondary">Custo BRL estimado</Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                      Estimativa Starter: $0,02/min gravado
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </DashboardCard>

            {/* All Platforms Monthly Cost Audit */}
            {(() => {
              const totalBrl = platformCosts.reduce((s, p) => s + Number(p.cost_brl), 0);
              const totalUsd = platformCosts.reduce((s, p) => s + Number(p.cost_usd), 0);
              const monthLabel = platformMonth
                ? new Date(platformMonth + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                : '';
              return (
                <DashboardCard
                  title={`Custo Mensal por Plataforma${monthLabel ? ` — ${monthLabel}` : ''}`}
                  noPadding
                  sx={{ mb: 3 }}
                  action={
                    <IconButton size="small" onClick={loadPlatformCosts} disabled={platformLoading}>
                      <IconRefresh size={16} />
                    </IconButton>
                  }
                >
                  {platformLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Plataforma</TableCell>
                            <TableCell>Categoria</TableCell>
                            <TableCell align="center">Modelo</TableCell>
                            <TableCell align="right">Custo USD</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Custo BRL / mês</TableCell>
                            <TableCell align="center">Fonte</TableCell>
                            <TableCell align="center" sx={{ width: 40 }} />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {platformCosts.map((p) => {
                            const isEditing = editPlatform === p.platform;
                            return (
                              <TableRow key={p.platform} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                {/* Platform name */}
                                <TableCell>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color, flexShrink: 0 }} />
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                                      {p.name}
                                    </Typography>
                                    <Box
                                      component="a"
                                      href={p.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center', lineHeight: 0, '&:hover': { color: 'primary.main' } }}
                                    >
                                      <IconExternalLink size={11} />
                                    </Box>
                                  </Stack>
                                </TableCell>
                                {/* Category */}
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">{p.category}</Typography>
                                </TableCell>
                                {/* Model chip */}
                                <TableCell align="center">
                                  <Chip
                                    label={p.model === 'subscription' ? 'Assinatura' : p.model === 'usage' ? 'Por uso' : p.model === 'freemium' ? 'Freemium' : 'Gratuito'}
                                    size="small"
                                    sx={{
                                      fontSize: '0.62rem', height: 17,
                                      bgcolor: p.model === 'subscription' ? '#7C3AED18' : p.model === 'usage' ? '#E8521918' : p.model === 'freemium' ? '#0EA5E918' : '#10A37F18',
                                      color: p.model === 'subscription' ? '#7C3AED' : p.model === 'usage' ? '#E85219' : p.model === 'freemium' ? '#0EA5E9' : '#10A37F',
                                    }}
                                  />
                                </TableCell>
                                {/* Cost USD */}
                                <TableCell align="right">
                                  {isEditing ? (
                                    <TextField
                                      size="small"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') savePlatformCost(p.platform); if (e.key === 'Escape') setEditPlatform(null); }}
                                      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                                      sx={{ width: 110 }}
                                      autoFocus
                                    />
                                  ) : (
                                    <Typography variant="body2" sx={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                                      {p.source === 'free' ? '—' : `$ ${Number(p.cost_usd).toFixed(2)}`}
                                    </Typography>
                                  )}
                                </TableCell>
                                {/* Cost BRL */}
                                <TableCell align="right">
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{
                                      fontSize: '0.85rem',
                                      color: p.source === 'free' ? 'text.disabled' : p.cost_brl > 500 ? 'error.main' : p.cost_brl > 200 ? 'warning.main' : 'text.primary',
                                    }}
                                  >
                                    {p.source === 'free' ? 'Gratuito' : formatBrl(p.cost_brl)}
                                  </Typography>
                                </TableCell>
                                {/* Source badge */}
                                <TableCell align="center">
                                  {p.source === 'tracked' ? (
                                    <Tooltip title="Custo real medido pelo sistema">
                                      <Chip label="Rastreado" size="small" sx={{ fontSize: '0.6rem', height: 16, bgcolor: '#10A37F18', color: '#10A37F' }} />
                                    </Tooltip>
                                  ) : p.source === 'manual' ? (
                                    <Tooltip title="Valor informado manualmente — clique no lápis para editar">
                                      <Chip label="Manual" size="small" sx={{ fontSize: '0.6rem', height: 16, bgcolor: '#FFAE1F18', color: '#FFAE1F' }} />
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title="API gratuita — sem custo direto">
                                      <Chip label="Grátis" size="small" sx={{ fontSize: '0.6rem', height: 16, bgcolor: '#4285F418', color: '#4285F4' }} />
                                    </Tooltip>
                                  )}
                                </TableCell>
                                {/* Edit actions */}
                                <TableCell align="center" sx={{ p: 0.5 }}>
                                  {p.source !== 'tracked' && p.source !== 'free' && (
                                    isEditing ? (
                                      <Stack direction="row" spacing={0.25}>
                                        <IconButton size="small" onClick={() => savePlatformCost(p.platform)} disabled={saving} color="success">
                                          <IconDeviceFloppy size={14} />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => setEditPlatform(null)}>
                                          <IconX size={14} />
                                        </IconButton>
                                      </Stack>
                                    ) : (
                                      <IconButton size="small" onClick={() => { setEditPlatform(p.platform); setEditValue(String(p.cost_usd)); }}>
                                        <IconEdit size={13} />
                                      </IconButton>
                                    )
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {/* TOTAL row */}
                          <TableRow sx={{ bgcolor: 'action.selected' }}>
                            <TableCell colSpan={3}>
                              <Typography variant="body2" fontWeight={700}>TOTAL MENSAL ESTIMADO</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                                $ {totalUsd.toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body1" fontWeight={800} color="error.main">
                                {formatBrl(totalBrl)}
                              </Typography>
                            </TableCell>
                            <TableCell colSpan={2} />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </DashboardCard>
              );
            })()}

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
                      <TableCell align="right">Duração</TableCell>
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
                            Nenhuma chamada registrada ainda. Os custos serão logados a partir de agora.
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
  );

  if (embedded) return content;

  return (
    <AppShell title="System Admin">
      <Box>
        <AdminSubmenu value="financeiro" />
        {content}
      </Box>
    </AppShell>
  );
}

export default function AiCostsPage() {
  return <AiCostsView />;
}

// ── Chart builders ─────────────────────────────────────────────

function buildDailyChart(byDay: DayRow[], isDark: boolean) {
  const providers = Array.from(new Set(byDay.map((r) => r.provider)));
  const days = Array.from(new Set(byDay.map((r) => r.day))).sort();
  const base = baseChartOptions(isDark);

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
      ...base,
      chart: { ...base.chart, type: 'area' as const, stacked: true },
      colors: providers.map((p) => PROVIDER_COLORS[p] || '#999'),
      xaxis: {
        ...base.xaxis,
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
      tooltip: { ...base.tooltip, y: { formatter: (v: number) => `R$ ${v.toFixed(4)}` } },
      legend: { ...base.legend, position: 'top' as const },
    },
  };
}

function buildDonutChart(byProvider: ProviderRow[], isDark: boolean) {
  const grouped: Record<string, number> = {};
  for (const row of byProvider) {
    grouped[row.provider] = (grouped[row.provider] || 0) + Number(row.cost_brl);
  }
  const base = baseChartOptions(isDark);

  const providers = Object.keys(grouped);
  const series = providers.map((p) => Number(grouped[p].toFixed(4)));

  return {
    series,
    options: {
      ...base,
      chart: { ...base.chart, type: 'donut' as const },
      labels: providers.map((p) => PROVIDER_LABELS[p] || p),
      colors: providers.map((p) => PROVIDER_COLORS[p] || '#999'),
      legend: { ...base.legend, position: 'bottom' as const },
      dataLabels: {
        ...base.dataLabels,
        formatter: (val: number) => `${val.toFixed(1)}%`,
      },
      tooltip: { ...base.tooltip, y: { formatter: (v: number) => `R$ ${v.toFixed(4)}` } },
    },
  };
}

function buildFeatureChart(byFeature: FeatureRow[], isDark: boolean) {
  const base = baseChartOptions(isDark);
  return {
    series: [
      {
        name: 'Custo R$',
        data: byFeature.map((r) => Number(Number(r.cost_brl).toFixed(4))),
      },
    ],
    options: {
      ...base,
      chart: { ...base.chart, type: 'bar' as const },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      colors: ['#E85219'],
      xaxis: {
        ...base.xaxis,
        categories: byFeature.map((r) => r.feature),
        labels: { formatter: (v: string) => `R$${Number(v).toFixed(2)}` },
      },
      dataLabels: { enabled: false },
      tooltip: { ...base.tooltip, y: { formatter: (v: number) => `R$ ${v.toFixed(4)}` } },
    },
  };
}
