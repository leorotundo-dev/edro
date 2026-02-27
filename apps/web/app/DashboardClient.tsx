'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import StatusChip from '@/components/shared/StatusChip';
import { apiGet } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  IconCalendar,
  IconFileText,
  IconClipboardList,
  IconTrendingUp,
  IconAlertTriangle,
  IconRobot,
  IconBrandInstagram,
  IconBrandFacebook,
  IconBrandLinkedin,
  IconChartBar,
  IconChartLine,
  IconBrain,
  IconArrowUp,
  IconArrowDown,
  IconClock,
} from '@tabler/icons-react';

// ── Types ────────────────────────────────────────────────────────────

type Briefing = {
  id: string;
  title: string;
  client_name: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
};

type Task = {
  id: string;
  briefing_id: string;
  type: string;
  assigned_to: string;
  status: string;
};

type CalendarEvent = {
  id: string;
  name: string;
  slug: string;
  categories: string[];
  tags?: string[];
  score: number;
  tier: string;
};

type CalendarEventWithDate = CalendarEvent & { date: string };

type ReporteiFormat = {
  format: string;
  score: number;
  kpis: { metric: string; value: number }[];
};

type ReporteiPlatform = {
  platform: string;
  updatedAt: string;
  topFormats: ReporteiFormat[];
  insights: string[];
};

type Metrics = {
  total: number;
  byStatus: Record<string, number>;
  avgTimePerStage: Record<string, number>;
  totalCopies: number;
  tasksByType: Record<string, number>;
  recentBriefings: number;
  overdue: number;
  bottlenecks: { stage: string; count: number }[];
  weeklyVelocity: { week: string; count: number }[];
  stageFunnel: { stage: string; count: number }[];
  copiesWeekly: { week: string; count: number }[];
  reporteiPlatforms: ReporteiPlatform[];
  predictiveTimes: {
    platform: string;
    day_of_week: number;
    hour: number;
    avg_engagement: number;
    sample_size: number;
  }[];
  learningInsights: {
    client_id: string;
    rebuilt_at: string;
    total_scored_copies: number;
    overall_avg_score: number;
    boost: string[];
    avoid: string[];
    preferred_formats: { format: string; avg_score: number; count: number }[];
  }[];
};

// ── Constants ────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  iclips_in: 'iClips Entrada',
  alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovação',
  producao: 'Produção',
  revisao: 'Revisão',
  entrega: 'Entrega',
  iclips_out: 'iClips Saída',
  done: 'Concluído',
};

const STAGE_COLORS: Record<string, string> = {
  briefing: '#3b82f6',
  iclips_in: '#8b5cf6',
  alinhamento: '#eab308',
  copy_ia: '#06b6d4',
  aprovacao: '#f97316',
  producao: '#ec4899',
  revisao: '#6366f1',
  entrega: '#22c55e',
  iclips_out: '#a855f7',
  done: '#10b981',
};

const STAGE_ORDER = [
  'briefing', 'iclips_in', 'alinhamento', 'copy_ia',
  'aprovacao', 'producao', 'revisao', 'entrega', 'iclips_out', 'done',
];

const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovação',
  producao: 'Produção',
  revisao: 'Revisão',
  entrega: 'Entrega',
  iclips_out: 'iClips',
};

// ── Sub-components ───────────────────────────────────────────────────

function StatBox({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <DashboardCard sx={{ flex: 1, minWidth: 140 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: `${color}18`, color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </Stack>
    </DashboardCard>
  );
}

function FunnelBar({ stage, count, maxCount }: { stage: string; count: number; maxCount: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const color = STAGE_COLORS[stage] || '#6366f1';
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
      <Typography variant="body2" sx={{ width: 120, flexShrink: 0, textAlign: 'right' }}>
        {STAGE_LABELS[stage] || stage}
      </Typography>
      <Box sx={{ flex: 1, position: 'relative', height: 24 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 24, borderRadius: 1, bgcolor: 'grey.100',
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 1 },
          }}
        />
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            position: 'absolute', top: '50%', left: 8,
            transform: 'translateY(-50%)', color: pct > 15 ? '#fff' : 'text.primary',
          }}
        >
          {count}
        </Typography>
      </Box>
    </Stack>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function DashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentBriefings, setRecentBriefings] = useState<Briefing[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventWithDate[]>([]);
  const [priorityTags, setPriorityTags] = useState<string[]>([]);
  const [showNonRelevant, setShowNonRelevant] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const [metricsRes, briefingsRes, tasksRes, calendarRes] = await Promise.all([
        apiGet<{ success: boolean; data: Metrics }>('/edro/metrics').catch(() => null),
        apiGet<{ success: boolean; data: Briefing[] }>('/edro/briefings?limit=10').catch(() => null),
        apiGet<{ success: boolean; data: Task[] }>('/edro/tasks?status=pending').catch(() => null),
        apiGet<{ success?: boolean; month: string; days: Record<string, CalendarEvent[]> }>(
          `/calendar/events/${currentMonth}${showNonRelevant ? '?include_non_relevant=true' : ''}`
        ).catch(() => null),
      ]);

      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (briefingsRes?.data) setRecentBriefings(briefingsRes.data);
      if (tasksRes?.data) setTodayTasks(tasksRes.data);

      if (calendarRes?.days) {
        const todaysList = calendarRes.days[today] || [];
        setTodayEvents(todaysList.slice(0, 8));

        const upcoming = Object.entries(calendarRes.days)
          .filter(([date]) => date > today)
          .flatMap(([date, events]) => (events as any[]).map((event: any) => ({ ...event, date })))
          .filter((event) => (event.score ?? 0) >= 75)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        setUpcomingEvents(upcoming);

        const tagCounts = new Map<string, number>();
        todaysList.forEach((event) => {
          [...(event.tags || []), ...(event.categories || [])].forEach((tag) => {
            const normalized = String(tag || '').trim().toLowerCase();
            if (!normalized) return;
            tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
          });
        });
        setPriorityTags(
          Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([tag]) => tag)
            .slice(0, 6),
        );
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [showNonRelevant]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">Carregando dashboard...</Typography>
        </Stack>
      </Box>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sem prazo';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getTierColor = (tier: string) => {
    if (tier === 'A') return 'success';
    if (tier === 'B') return 'warning';
    return 'default';
  };

  const todayNumber = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const todayLong = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const active = (metrics?.byStatus?.active ?? 0) + (metrics?.byStatus?.in_progress ?? 0);
  const done = metrics?.byStatus?.done ?? 0;
  const funnelMax = Math.max(...(metrics?.stageFunnel?.map((s) => s.count) ?? [1]), 1);
  const sortedFunnel = [...(metrics?.stageFunnel ?? [])].sort(
    (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage),
  );
  const sortedAvgTime = Object.entries(metrics?.avgTimePerStage ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const dueTodayCount = recentBriefings.filter((b) => {
    const today = new Date().toISOString().split('T')[0];
    return b.due_at?.startsWith(today);
  }).length;

  const pendingApprovals = metrics?.byStatus?.['aprovacao'] || 0;

  return (
    <AppShell title="Dashboard">
      <Stack spacing={3}>
        {/* ── Hero ────────────────────────────────────────────── */}
        <Card sx={{ position: 'relative', overflow: 'hidden' }}>
          <Box
            sx={{
              position: 'absolute', right: -80, top: -80,
              width: 400, height: 400, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232,82,25,0.10) 0%, transparent 70%)',
              pointerEvents: 'none', zIndex: 0,
            }}
          />
          <CardContent sx={{ position: 'relative', pb: 3 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'flex-end' }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <Typography variant="h3" fontWeight={700}>{todayNumber}</Typography>
                  <Chip label={todayLong} size="small" variant="outlined" />
                </Stack>
                <Typography variant="body1" color="text.secondary">
                  Resumo operacional, pipeline e inteligencia.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button variant="contained" startIcon={<IconFileText size={18} />} onClick={() => router.push('/edro/novo')}>
                  Criar briefing
                </Button>
                <Button variant="outlined" startIcon={<IconCalendar size={18} />} onClick={() => router.push('/calendar')}>
                  Calendario
                </Button>
              </Stack>
            </Stack>
          </CardContent>

          <Divider />

          {/* Today's events + summary sidebar */}
          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">Celebracoes de hoje</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => setShowNonRelevant((prev) => !prev)}>
                      {showNonRelevant ? 'Somente relevantes' : 'Mostrar nao relevantes'}
                    </Button>
                    <Button size="small" onClick={() => router.push('/calendar')}>Abrir dia</Button>
                  </Stack>
                </Stack>
                <Stack spacing={2} sx={{ maxHeight: 280, overflowY: 'auto', pr: 1 }}>
                  {todayEvents.length > 0 ? (
                    todayEvents.map((event, idx) => {
                      const name = String((event as any)?.name || (event as any)?.title || (event as any)?.slug || '').trim() || `Evento ${idx + 1}`;
                      const scoreValue = Number((event as any)?.score ?? (event as any)?.base_relevance ?? 0);
                      const safeScore = Number.isFinite(scoreValue) ? Math.max(0, Math.min(100, Math.round(scoreValue))) : 0;
                      const tierValue = String((event as any)?.tier || (safeScore >= 80 ? 'A' : safeScore >= 55 ? 'B' : 'C')) as 'A' | 'B' | 'C';
                      const isRelevant = (event as any)?.is_relevant !== false;
                      return (
                        <Box
                          key={String((event as any)?.id || `${name}-${idx}`)}
                          sx={{
                            py: 0.85,
                            px: 0.35,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1.5,
                            width: '100%',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            opacity: isRelevant ? 1 : 0.7,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}
                          >
                            <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main', width: 32, height: 32 }}>
                              <IconCalendar size={18} />
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ display: 'block', fontWeight: 600, color: '#24324b', lineHeight: 1.2 }} noWrap>
                                {name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#5f6f8d', lineHeight: 1.2 }}>
                                {safeScore}%{!isRelevant ? ' • nao relevante' : ''}
                              </Typography>
                            </Box>
                          </Stack>
                          <Chip
                            label={`Tier ${tierValue}`}
                            size="small"
                            variant={isRelevant ? 'filled' : 'outlined'}
                            color={getTierColor(tierValue)}
                            sx={{
                              flexShrink: 0,
                              minWidth: 74,
                              justifyContent: 'center',
                              fontWeight: 600,
                              bgcolor: isRelevant ? undefined : 'transparent',
                            }}
                          />
                        </Box>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {showNonRelevant ? 'Sem eventos para hoje.' : 'Sem eventos relevantes para hoje.'}
                    </Typography>
                  )}
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, lg: 4 }}>
                <Stack spacing={2}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="overline" color="text.secondary">No resumo</Typography>
                      <Stack spacing={1.5} mt={2}>
                        {[
                          { label: 'Total de eventos', value: todayEvents.length },
                          { label: 'Briefings ativos', value: active || (metrics?.total ?? 0) },
                          { label: 'Vencem hoje', value: dueTodayCount },
                          { label: 'Aprovacoes pendentes', value: pendingApprovals, highlight: true },
                          { label: 'Tasks pendentes', value: todayTasks.length },
                        ].map((row) => (
                          <Stack key={row.label} direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                            <Typography fontWeight={600} color={row.highlight ? 'primary.main' : undefined}>
                              {row.value}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                  {priorityTags.length > 0 && (
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="overline" color="text.secondary">Segmentos prioritarios</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
                          {priorityTags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* ── KPI Stats ──────────────────────────────────────── */}
        {metrics && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
            <StatBox label="Total Briefings" value={metrics.total} icon={<IconClipboardList size={22} />} color="#3b82f6" />
            <StatBox label="Em Andamento" value={active} icon={<IconTrendingUp size={22} />} color="#f59e0b" />
            <StatBox label="Concluidos" value={done} icon={<IconClipboardList size={22} />} color="#22c55e" />
            <StatBox label="Atrasados" value={metrics.overdue} icon={<IconAlertTriangle size={22} />} color="#ef4444" />
            <StatBox label="Copies Geradas" value={metrics.totalCopies} icon={<IconRobot size={22} />} color="#8b5cf6" />
          </Stack>
        )}

        {/* ── Funnel + Avg Time ───────────────────────────────── */}
        {metrics && sortedFunnel.length > 0 && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <DashboardCard title="Funil por Etapa" sx={{ flex: 2 }}>
              {sortedFunnel.map((item) => (
                <FunnelBar key={item.stage} stage={item.stage} count={item.count} maxCount={funnelMax} />
              ))}
            </DashboardCard>
            <DashboardCard title="Tempo Medio por Etapa" subtitle="Horas (etapas concluidas)" sx={{ flex: 1 }}>
              {sortedAvgTime.length > 0 ? (
                <Stack spacing={1}>
                  {sortedAvgTime.map(([stage, hours]) => (
                    <Stack key={stage} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">{STAGE_LABELS[stage] || stage}</Typography>
                      <Chip
                        label={`${hours}h`}
                        size="small"
                        sx={{
                          bgcolor: hours > 48 ? '#fef2f2' : hours > 24 ? '#fefce8' : '#f0fdf4',
                          color: hours > 48 ? '#dc2626' : hours > 24 ? '#ca8a04' : '#16a34a',
                          fontWeight: 600,
                        }}
                      />
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">Sem dados de tempo.</Typography>
              )}
            </DashboardCard>
          </Stack>
        )}

        {/* ── Bottlenecks + Velocity ─────────────────────────── */}
        {metrics && (metrics.bottlenecks.length > 0 || metrics.weeklyVelocity.length > 0) && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {metrics.bottlenecks.length > 0 && (
              <DashboardCard title="Gargalos Atuais" subtitle="Etapas com mais briefings parados" sx={{ flex: 1 }}>
                <Stack spacing={1}>
                  {metrics.bottlenecks.map((item) => (
                    <Stack key={item.stage} direction="row" justifyContent="space-between" alignItems="center">
                      <Chip
                        label={STAGE_LABELS[item.stage] || item.stage}
                        size="small"
                        sx={{ bgcolor: STAGE_COLORS[item.stage] + '20', color: STAGE_COLORS[item.stage], fontWeight: 600 }}
                      />
                      <Typography variant="h6" fontWeight={700}>{item.count}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </DashboardCard>
            )}
            {metrics.weeklyVelocity.length > 0 && (
              <DashboardCard title="Velocidade Semanal" subtitle="Briefings concluidos por semana" sx={{ flex: 2 }}>
                <Stack spacing={0.5}>
                  {metrics.weeklyVelocity.map((item) => {
                    const weekLabel = new Date(item.week).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                    const max = Math.max(...metrics.weeklyVelocity.map((v) => v.count), 1);
                    return (
                      <Stack key={item.week} direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" sx={{ width: 60, flexShrink: 0, textAlign: 'right' }}>{weekLabel}</Typography>
                        <Box sx={{ flex: 1, height: 20, position: 'relative' }}>
                          <LinearProgress
                            variant="determinate"
                            value={(item.count / max) * 100}
                            sx={{
                              height: 20, borderRadius: 1, bgcolor: 'grey.100',
                              '& .MuiLinearProgress-bar': { bgcolor: '#6366f1', borderRadius: 1 },
                            }}
                          />
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            sx={{
                              position: 'absolute', top: '50%', left: 8,
                              transform: 'translateY(-50%)', color: item.count > 0 ? '#fff' : 'text.secondary',
                            }}
                          >
                            {item.count}
                          </Typography>
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              </DashboardCard>
            )}
          </Stack>
        )}

        {/* ── Upcoming Events ─────────────────────────────────── */}
        {upcomingEvents.length > 0 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5">Proximas datas relevantes</Typography>
              <Button size="small" onClick={() => router.push('/calendar')}>Ver calendario</Button>
            </Stack>
            <Grid container spacing={2}>
              {upcomingEvents.map((event) => (
                <Grid size={{ xs: 12, md: 6, lg: 3 }} key={`${event.id}-${event.date}`}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Box>
                          <Typography variant="overline" color="text.secondary">{formatShortDate(event.date)}</Typography>
                          <Typography fontWeight={600}>{event.name}</Typography>
                        </Box>
                        <Chip label={`${event.score}%`} size="small" />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(event.score, 100)}
                        sx={{
                          mt: 2, height: 6, borderRadius: 99, bgcolor: 'grey.100',
                          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* ── Próximos Deadlines ──────────────────────────────── */}
        {recentBriefings.length > 0 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5">Proximos Deadlines</Typography>
              <Button size="small" onClick={() => router.push('/edro')}>Ver briefings</Button>
            </Stack>
            <Card variant="outlined">
              <CardContent sx={{ p: 0 }}>
                <Stack divider={<Divider flexItem />} spacing={0}>
                  {recentBriefings.slice(0, 5).map((briefing) => (
                    <Box
                      key={briefing.id}
                      sx={{
                        px: 3, py: 2, cursor: 'pointer', transition: 'background 0.2s',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => router.push(`/edro/${briefing.id}`)}
                    >
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        justifyContent="space-between"
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                            <IconFileText size={18} />
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600}>{briefing.title}</Typography>
                            <Typography variant="body2" color="text.secondary">{briefing.client_name || 'Sem cliente'}</Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <StatusChip status={briefing.status} label={STATUS_LABELS[briefing.status] || briefing.status} />
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <IconCalendar size={16} />
                            <Typography variant="body2" color="text.secondary">{formatDate(briefing.due_at)}</Typography>
                          </Stack>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ── Performance Semanal ─────────────────────────────── */}
        {metrics && (
          <Box>
            <Typography variant="h5" mb={2}>Performance — Ultima Semana</Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Briefings criados', value: metrics.recentBriefings, icon: <IconFileText size={18} />, color: 'success.main' },
                { label: 'Briefings completados', value: done, icon: <IconClipboardList size={18} />, color: 'primary.main' },
                { label: 'Taxa de aprovacao', value: '85%', icon: <IconChartLine size={18} />, color: 'info.main' },
                { label: 'Copies geradas', value: metrics.totalCopies, icon: <IconRobot size={18} />, color: 'warning.main' },
              ].map((card) => (
                <Grid key={card.label} size={{ xs: 12, md: 6, lg: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="overline" color="text.secondary">{card.label}</Typography>
                        <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main', width: 36, height: 36 }}>
                          {card.icon}
                        </Avatar>
                      </Stack>
                      <Typography variant="h4" color={card.color}>{card.value}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* ── Reportei Performance ────────────────────────────── */}
        {metrics?.reporteiPlatforms && metrics.reporteiPlatforms.length > 0 && (
          <>
            <Typography variant="h6" fontWeight={700}>Performance Reportei</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {metrics.reporteiPlatforms.map((plat) => {
                const platformIcon = plat.platform.toLowerCase().includes('instagram')
                  ? <IconBrandInstagram size={20} />
                  : plat.platform.toLowerCase().includes('facebook') || plat.platform.toLowerCase().includes('meta')
                  ? <IconBrandFacebook size={20} />
                  : plat.platform.toLowerCase().includes('linkedin')
                  ? <IconBrandLinkedin size={20} />
                  : <IconChartBar size={20} />;

                return (
                  <DashboardCard key={plat.platform} sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <Box sx={{ color: '#6366f1' }}>{platformIcon}</Box>
                      <Typography variant="subtitle1" fontWeight={700}>{plat.platform}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(plat.updatedAt).toLocaleDateString('pt-BR')}
                      </Typography>
                    </Stack>
                    {plat.topFormats.length > 0 && (
                      <Stack spacing={1} sx={{ mb: 1.5 }}>
                        {plat.topFormats.map((fmt) => (
                          <Box key={fmt.format}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2">{fmt.format}</Typography>
                              <Chip
                                label={`${fmt.score}/100`}
                                size="small"
                                sx={{
                                  bgcolor: fmt.score >= 70 ? '#f0fdf4' : fmt.score >= 40 ? '#fefce8' : '#fef2f2',
                                  color: fmt.score >= 70 ? '#16a34a' : fmt.score >= 40 ? '#ca8a04' : '#dc2626',
                                  fontWeight: 600,
                                }}
                              />
                            </Stack>
                            {fmt.kpis.length > 0 && (
                              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                                {fmt.kpis.map((kpi) => (
                                  <Typography key={kpi.metric} variant="caption" color="text.secondary">
                                    {kpi.metric}: {typeof kpi.value === 'number' && kpi.value > 1000
                                      ? `${(kpi.value / 1000).toFixed(1)}k`
                                      : typeof kpi.value === 'number' && kpi.value < 1
                                      ? `${(kpi.value * 100).toFixed(1)}%`
                                      : kpi.value}
                                  </Typography>
                                ))}
                              </Stack>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    )}
                    {plat.insights.length > 0 && (
                      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                        {plat.insights.map((insight, idx) => (
                          <Typography key={idx} variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            {insight}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </DashboardCard>
                );
              })}
            </Stack>
          </>
        )}

        {/* ── Predictive Intelligence ─────────────────────────── */}
        {metrics?.predictiveTimes && metrics.predictiveTimes.length > 0 && (
          <>
            <Typography variant="h6" fontWeight={700}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconClock size={22} />
                <span>Inteligencia Preditiva — Melhores Horarios</span>
              </Stack>
            </Typography>
            <DashboardCard>
              <Stack spacing={1}>
                {(() => {
                  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
                  const maxEng = Math.max(...metrics.predictiveTimes.map((t) => t.avg_engagement), 1);
                  return metrics.predictiveTimes.slice(0, 10).map((slot, idx) => (
                    <Stack key={idx} direction="row" alignItems="center" spacing={1.5}>
                      <Chip label={slot.platform} size="small" sx={{ minWidth: 80, bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 600 }} />
                      <Typography variant="body2" sx={{ minWidth: 80, fontWeight: 600 }}>
                        {dayNames[slot.day_of_week]} {String(slot.hour).padStart(2, '0')}:00
                      </Typography>
                      <Box sx={{ flex: 1, position: 'relative', height: 20 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(slot.avg_engagement / maxEng) * 100}
                          sx={{
                            height: 20, borderRadius: 1, bgcolor: 'grey.100',
                            '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 1 },
                          }}
                        />
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{
                            position: 'absolute', top: '50%', left: 8,
                            transform: 'translateY(-50%)',
                            color: slot.avg_engagement > maxEng * 0.15 ? '#fff' : 'text.secondary',
                          }}
                        >
                          {slot.avg_engagement.toFixed(0)}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>n={slot.sample_size}</Typography>
                    </Stack>
                  ));
                })()}
              </Stack>
            </DashboardCard>
          </>
        )}

        {/* ── Learning Loop ───────────────────────────────────── */}
        {metrics?.learningInsights && metrics.learningInsights.length > 0 && (
          <>
            <Typography variant="h6" fontWeight={700}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconBrain size={22} />
                <span>Learning Loop — Preferencias Aprendidas</span>
              </Stack>
            </Typography>
            {metrics.learningInsights.map((li) => (
              <DashboardCard key={li.client_id}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" fontWeight={700}>Score medio: {li.overall_avg_score}/5</Typography>
                    <Chip label={`${li.total_scored_copies} copies avaliadas`} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Atualizado: {new Date(li.rebuilt_at).toLocaleDateString('pt-BR')}
                  </Typography>
                </Stack>
                {li.boost.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} color="success.main" sx={{ mb: 0.5, display: 'block' }}>PRIORIZAR</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {li.boost.map((b, idx) => (
                        <Chip key={idx} label={b} size="small" icon={<IconArrowUp size={14} />}
                          sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 500, mb: 0.5 }} />
                      ))}
                    </Stack>
                  </Box>
                )}
                {li.avoid.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" fontWeight={700} color="error.main" sx={{ mb: 0.5, display: 'block' }}>EVITAR</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {li.avoid.map((a, idx) => (
                        <Chip key={idx} label={a} size="small" icon={<IconArrowDown size={14} />}
                          sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 500, mb: 0.5 }} />
                      ))}
                    </Stack>
                  </Box>
                )}
                {li.preferred_formats.length > 0 && (
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>FORMATOS PREFERIDOS</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {li.preferred_formats.map((f) => (
                        <Chip key={f.format} label={`${f.format} (${f.avg_score}/5)`} size="small"
                          sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 600 }} />
                      ))}
                    </Stack>
                  </Box>
                )}
              </DashboardCard>
            ))}
          </>
        )}

        {/* ── Tasks Pendentes ─────────────────────────────────── */}
        {todayTasks.length > 0 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5">Minhas Tasks</Typography>
              <Button size="small" onClick={() => router.push('/edro')}>Ver tarefas</Button>
            </Stack>
            <Card variant="outlined">
              <CardContent sx={{ p: 0 }}>
                <Stack divider={<Divider flexItem />} spacing={0}>
                  {todayTasks.slice(0, 5).map((task) => (
                    <Box key={task.id} sx={{ px: 3, py: 2 }}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        justifyContent="space-between"
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                            <IconClipboardList size={18} />
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                              {task.type.replace('_', ' ')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Atribuida para: {task.assigned_to}
                            </Typography>
                          </Box>
                        </Stack>
                        <Button size="small" onClick={() => router.push(`/edro/${task.briefing_id}`)}>Ver Briefing</Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* ── Quick Actions ───────────────────────────────────── */}
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button variant="contained" startIcon={<IconFileText size={18} />} onClick={() => router.push('/edro/novo')}>
            Novo Briefing
          </Button>
          <Button variant="outlined" startIcon={<IconClipboardList size={18} />} onClick={() => router.push('/edro')}>
            Ver Todos os Briefings
          </Button>
          <Button variant="outlined" startIcon={<IconCalendar size={18} />} onClick={() => router.push('/calendar')}>
            Calendario
          </Button>
        </Stack>
      </Stack>
    </AppShell>
  );
}
