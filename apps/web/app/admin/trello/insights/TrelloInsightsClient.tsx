'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import dynamic from 'next/dynamic';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconArrowLeft,
  IconBrandTrello,
  IconChartBar,
  IconClock,
  IconRefresh,
  IconTarget,
  IconTrendingUp,
  IconAlertTriangle,
  IconCheck,
  IconLayoutKanban,
  IconRotate,
} from '@tabler/icons-react';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type BoardSummary = {
  board_id: string;
  board_name: string;
  client_id: string | null;
  total_cards: number;
  cards_done: number;
  cards_in_progress: number;
  median_cycle_time_hours: number | null;
  pct_on_time: number | null;
  pct_approved_first_try: number | null;
  avg_revision_count: number | null;
  cards_per_week_avg: number | null;
  bottleneck_list: string | null;
  bottleneck_avg_hours: number | null;
};

type BoardInsights = {
  board: { id: string; name: string; client_id: string | null };
  summary: {
    total_cards: number; cards_done: number; cards_in_progress: number;
    cards_cancelled: number; pct_completion: number;
    pct_on_time: number | null; avg_days_overdue: number | null;
  };
  cycle_times: {
    median_hours: number | null;
    median_in_progress_hours: number | null;
    median_revision_hours: number | null;
    median_client_response_hours: number | null;
  };
  quality: { pct_approved_first_try: number | null; avg_revision_count: number | null };
  throughput: { cards_per_week_avg: number | null; cards_per_week_last_4w: number | null; wip_count: number };
  bottleneck: { stage: string | null; avg_hours: number | null };
  forecast: { p50_weeks: number; p75_weeks: number; p85_weeks: number } | null;
  by_format: { format: string; count: number; median_cycle_hours: number | null; avg_revision: number }[];
  weekly_throughput: { week: string; count: number }[];
};

type Overview = {
  boards: BoardSummary[];
  aggregate: {
    total_boards: number; total_cards_done: number;
    total_cards_in_flight: number; overall_median_cycle_hours: number | null;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtHours(h: number | null | undefined): string {
  if (!h) return '—';
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)} dias`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${Math.round(v)}%`;
}

function stageLabel(s: string | null): string {
  const map: Record<string, string> = {
    in_progress: 'Produção (Andamento)',
    revision: 'Revisão (Alteração)',
    approval: 'Aprovação pelo cliente',
    approval_internal: 'Aprovação interna',
    intake: 'Briefing / Entrada',
  };
  return s ? (map[s] ?? s) : '—';
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatBox({
  label, value, sub, color = 'text.primary', icon,
}: {
  label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode;
}) {
  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, flex: 1, minWidth: 140 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
        {icon && <Box sx={{ color: 'text.secondary' }}>{icon}</Box>}
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Stack>
      <Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Box>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TrelloInsightsClient({ boardId: initialBoardId }: { boardId?: string }) {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(initialBoardId ?? '');
  const [insights, setInsights] = useState<BoardInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const data = await apiGet('/trello/insights/overview');
      setOverview(data);
      // Auto-select first board if none selected
      if (!selectedBoardId && data.boards?.[0]) {
        setSelectedBoardId(data.boards[0].board_id);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBoardId]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (!selectedBoardId) return;
    setLoadingInsights(true);
    apiGet(`/trello/project-boards/${selectedBoardId}/insights`)
      .then((data) => setInsights(data.insights ?? null))
      .catch(() => setInsights(null))
      .finally(() => setLoadingInsights(false));
  }, [selectedBoardId]);

  async function handleAnalyzeAll() {
    setAnalyzing(true);
    try {
      await apiPost('/trello/analyze-all', {});
      setTimeout(() => { loadOverview(); setAnalyzing(false); }, 3000);
    } catch {
      setAnalyzing(false);
    }
  }

  if (loading) return (
    <AppShell title="Insights Trello">
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
    </AppShell>
  );

  if (!overview?.boards.length) return (
    <AppShell title="Insights Trello">
      <Box sx={{ p: 4 }}>
        <Alert severity="info">
          Nenhum board analisado ainda. Sincronize e analise os boards em{' '}
          <a href="/admin/trello">Configurar Trello</a>.
        </Alert>
      </Box>
    </AppShell>
  );

  const { aggregate } = overview;
  const ins = insights;

  return (
    <AppShell title="Insights Trello">
      {/* Header */}
      <Stack
        direction="row" alignItems="center" spacing={1.5}
        sx={{ px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Button size="small" variant="text" startIcon={<IconArrowLeft size={16} />} href="/admin/trello">
          Voltar
        </Button>
        <IconBrandTrello size={20} color="#0052cc" />
        <Typography variant="h6" fontWeight={700} flex={1}>Insights Trello</Typography>
        <Tooltip title="Re-analisar todos os boards">
          <Button
            size="small" variant="outlined"
            startIcon={analyzing ? <CircularProgress size={14} /> : <IconRotate size={16} />}
            onClick={handleAnalyzeAll} disabled={analyzing}
          >
            Analisar
          </Button>
        </Tooltip>
      </Stack>

      <Box sx={{ p: 3 }}>

        {/* ── Cross-board aggregate ─── */}
        <Typography variant="subtitle2" color="text.secondary" mb={1.5} fontWeight={600} textTransform="uppercase" letterSpacing={1}>
          Visão Geral — Todos os Boards
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={2} mb={4}>
          <StatBox label="Boards ativos" value={String(aggregate.total_boards)} icon={<IconLayoutKanban size={16} />} />
          <StatBox label="Cards finalizados" value={String(aggregate.total_cards_done)} color="success.main" icon={<IconCheck size={16} />} />
          <StatBox label="Em andamento" value={String(aggregate.total_cards_in_flight)} icon={<IconClock size={16} />} />
          <StatBox
            label="Cycle time mediano"
            value={fmtHours(aggregate.overall_median_cycle_hours)}
            sub="da criação até o finalizado"
            icon={<IconTarget size={16} />}
          />
        </Stack>

        {/* ── Board cards grid ─── */}
        <Typography variant="subtitle2" color="text.secondary" mb={1.5} fontWeight={600} textTransform="uppercase" letterSpacing={1}>
          Performance por Board
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          {overview.boards.map((b) => (
            <Card
              key={b.board_id}
              sx={{
                cursor: 'pointer',
                border: '2px solid',
                borderColor: selectedBoardId === b.board_id ? 'primary.main' : 'divider',
                '&:hover': { borderColor: 'primary.light' },
              }}
              onClick={() => setSelectedBoardId(b.board_id)}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>{b.board_name}</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} mt={1}>
                  <Chip label={`${b.cards_done} done`} size="small" color="success" />
                  <Chip label={`${b.cards_in_progress} em andamento`} size="small" />
                  {b.pct_on_time != null && (
                    <Chip
                      label={`${Math.round(b.pct_on_time)}% no prazo`}
                      size="small"
                      color={b.pct_on_time >= 70 ? 'success' : b.pct_on_time >= 50 ? 'warning' : 'error'}
                    />
                  )}
                </Stack>
                <Stack direction="row" spacing={2} mt={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Cycle mediano</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmtHours(b.median_cycle_time_hours)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Aprovação 1ª tent.</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmtPct(b.pct_approved_first_try)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Gargalo</Typography>
                    <Typography variant="body2" fontWeight={600} color="warning.main">
                      {stageLabel(b.bottleneck_list)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* ── Selected board deep-dive ─── */}
        {loadingInsights && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        )}

        {ins && !loadingInsights && (
          <>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" fontWeight={700} mb={2.5}>
              {ins.board.name} — Análise detalhada
            </Typography>

            {/* Stat row */}
            <Stack direction="row" flexWrap="wrap" gap={2} mb={3}>
              <StatBox
                label="Lead time mediano" value={fmtHours(ins.cycle_times.median_hours)}
                sub="do briefing ao finalizado" icon={<IconClock size={16} />}
              />
              <StatBox
                label="Produção (mediano)" value={fmtHours(ins.cycle_times.median_in_progress_hours)}
                sub="tempo no andamento" icon={<IconChartBar size={16} />}
              />
              <StatBox
                label="Revisão (mediano)" value={fmtHours(ins.cycle_times.median_revision_hours)}
                sub="tempo em alteração" icon={<IconRotate size={16} />}
                color={
                  (ins.cycle_times.median_revision_hours ?? 0) > 48
                    ? 'warning.main' : 'text.primary'
                }
              />
              <StatBox
                label="Resposta do cliente" value={fmtHours(ins.cycle_times.median_client_response_hours)}
                sub="da aprovação interna ao ok" icon={<IconClock size={16} />}
              />
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={2} mb={4}>
              <StatBox
                label="Entregue no prazo" value={fmtPct(ins.summary.pct_on_time)}
                icon={<IconTarget size={16} />}
                color={(ins.summary.pct_on_time ?? 0) >= 75 ? 'success.main' : 'error.main'}
              />
              <StatBox
                label="Aprovado na 1ª tentativa" value={fmtPct(ins.quality.pct_approved_first_try)}
                sub="sem passar por alteração" icon={<IconCheck size={16} />}
                color={(ins.quality.pct_approved_first_try ?? 0) >= 60 ? 'success.main' : 'warning.main'}
              />
              <StatBox
                label="Média de revisões" value={ins.quality.avg_revision_count?.toFixed(1) ?? '—'}
                sub="por card finalizado" icon={<IconRotate size={16} />}
              />
              <StatBox
                label="Throughput médio" value={ins.throughput.cards_per_week_avg ? `${ins.throughput.cards_per_week_avg.toFixed(1)}/sem` : '—'}
                sub={`últimas 4 sem: ${ins.throughput.cards_per_week_last_4w?.toFixed(1) ?? '—'}/sem`}
                icon={<IconTrendingUp size={16} />}
              />
            </Stack>

            {/* Bottleneck alert */}
            {ins.bottleneck.stage && (
              <Alert
                severity="warning"
                icon={<IconAlertTriangle size={18} />}
                sx={{ mb: 3 }}
              >
                <strong>Gargalo identificado:</strong> a etapa <em>{stageLabel(ins.bottleneck.stage)}</em> retém
                em média <strong>{fmtHours(ins.bottleneck.avg_hours)}</strong> por card.
                {ins.bottleneck.stage === 'approval' && ' Isso é tempo de espera do cliente — considere follow-up automático.'}
                {ins.bottleneck.stage === 'revision' && ' Muitos ciclos de revisão — vale revisar o alinhamento de briefing.'}
                {ins.bottleneck.stage === 'in_progress' && ' A produção em si é o gargalo — pode ser falta de capacidade.'}
              </Alert>
            )}

            {/* Monte Carlo forecast */}
            {ins.forecast && ins.throughput.wip_count > 0 && (
              <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <IconTrendingUp size={18} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Forecast Monte Carlo — {ins.throughput.wip_count} cards em aberto
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mb={1.5}>
                    Baseado no histórico de throughput das últimas semanas:
                  </Typography>
                  <Stack direction="row" gap={2} flexWrap="wrap">
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="success.main">
                        {ins.forecast.p50_weeks}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">semanas (50% conf.)</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="warning.main">
                        {ins.forecast.p75_weeks}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">semanas (75% conf.)</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="error.main">
                        {ins.forecast.p85_weeks}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">semanas (85% conf.)</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Throughput chart */}
            {ins.weekly_throughput.length > 3 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={600} mb={2}>
                    Throughput Semanal — Cards Finalizados
                  </Typography>
                  <ApexChart
                    type="area"
                    height={180}
                    options={{
                      chart: { toolbar: { show: false }, sparkline: { enabled: false } },
                      stroke: { curve: 'smooth', width: 2 },
                      fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0 } },
                      xaxis: {
                        categories: ins.weekly_throughput.map((w) => w.week),
                        labels: { style: { fontSize: '11px' } },
                      },
                      yaxis: { labels: { style: { fontSize: '11px' } } },
                      tooltip: { x: { format: 'Semana WW' } },
                      colors: ['#2563eb'],
                      dataLabels: { enabled: false },
                    }}
                    series={[{ name: 'Cards concluídos', data: ins.weekly_throughput.map((w) => w.count) }]}
                  />
                </CardContent>
              </Card>
            )}

            {/* By-format breakdown */}
            {ins.by_format.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={600} mb={2}>
                    Cycle Time por Tipo / Formato
                  </Typography>
                  <Stack spacing={1}>
                    {ins.by_format
                      .sort((a, b) => (b.median_cycle_hours ?? 0) - (a.median_cycle_hours ?? 0))
                      .map((f) => {
                        const maxHours = Math.max(...ins.by_format.map((x) => x.median_cycle_hours ?? 0));
                        const pct = maxHours > 0 ? ((f.median_cycle_hours ?? 0) / maxHours) * 100 : 0;
                        return (
                          <Box key={f.format}>
                            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                              <Typography variant="body2" fontWeight={500}>{f.format}</Typography>
                              <Stack direction="row" spacing={2}>
                                <Typography variant="caption" color="text.secondary">
                                  {f.count} cards
                                </Typography>
                                <Typography variant="caption" fontWeight={600}>
                                  {fmtHours(f.median_cycle_hours)}
                                </Typography>
                                <Chip
                                  label={`${f.avg_revision.toFixed(1)} rev`}
                                  size="small"
                                  sx={{ height: 18, fontSize: 10 }}
                                  color={f.avg_revision >= 1.5 ? 'warning' : 'default'}
                                />
                              </Stack>
                            </Stack>
                            <Box sx={{ height: 6, bgcolor: 'action.hover', borderRadius: 3 }}>
                              <Box
                                sx={{
                                  height: 6, borderRadius: 3,
                                  width: `${pct}%`,
                                  bgcolor: f.avg_revision >= 2 ? 'warning.main' : 'primary.main',
                                }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" mt={1.5} display="block">
                    Barras laranjas = média de revisões ≥ 2×. Esses formatos merecem revisão de briefing.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Box>
    </AppShell>
  );
}
