'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import AppShell from '@/components/AppShell';
import TopCards from '@/components/dashboards/TopCards';
import StatusChip from '@/components/shared/StatusChip';
import { apiGet } from '@/lib/api';
import {
  IconCalendar,
  IconClipboardList,
  IconFileText,
  IconChartLine,
  IconUsers,
} from '@tabler/icons-react';

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
  created_at: string;
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

type CalendarEventWithDate = CalendarEvent & {
  date: string;
};

type DashboardStats = {
  today: {
    activeBriefings: number;
    pendingApprovals: number;
    dueTodayCount: number;
    tasksToday: number;
  };
  upcoming: Briefing[];
  lastWeek: {
    briefingsCreated: number;
    briefingsCompleted: number;
    avgTimePerStage: Record<string, number>;
    approvalRate: number;
    totalCopiesGenerated: number;
  };
};

export default function DashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBriefings, setRecentBriefings] = useState<Briefing[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventWithDate[]>([]);
  const [priorityTags, setPriorityTags] = useState<string[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const metricsRes = await apiGet<{ success: boolean; data: any }>('/edro/metrics');
      const briefingsRes = await apiGet<{ success: boolean; data: Briefing[] }>('/edro/briefings?limit=10');
      const tasksRes = await apiGet<{ success: boolean; data: Task[] }>('/edro/tasks?status=pending');

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0];

      const calendarRes = await apiGet<{
        success?: boolean;
        month: string;
        days: Record<string, CalendarEvent[]>;
      }>(`/calendar/events/${currentMonth}`);

      if (calendarRes?.days) {
        const todaysList = calendarRes.days[today] || [];
        setTodayEvents(todaysList.slice(0, 8));

        const upcoming = Object.entries(calendarRes.days)
          .filter(([date]) => date > today)
          .flatMap(([date, events]) => events.map((event) => ({ ...event, date })))
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
        const sortedTags = Array.from(tagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([tag]) => tag)
          .slice(0, 6);
        setPriorityTags(sortedTags);
      }

      if (metricsRes?.data) {
        const metrics = metricsRes.data;
        const dueTodayCount = (briefingsRes?.data || []).filter((briefing) =>
          briefing.due_at?.startsWith(today)
        ).length;

        setStats({
          today: {
            activeBriefings: (metrics.byStatus?.['copy_ia'] || 0) + (metrics.byStatus?.['aprovacao'] || 0),
            pendingApprovals: metrics.byStatus?.['aprovacao'] || 0,
            dueTodayCount,
            tasksToday: tasksRes?.data?.length || 0,
          },
          upcoming: [],
          lastWeek: {
            briefingsCreated: metrics.recentBriefings || 0,
            briefingsCompleted: metrics.byStatus?.['iclips_out'] || 0,
            avgTimePerStage: metrics.avgTimePerStage || {},
            approvalRate: 0.85,
            totalCopiesGenerated: metrics.totalCopies || 0,
          },
        });
      }

      if (briefingsRes?.data) {
        setRecentBriefings(briefingsRes.data);
      }

      if (tasksRes?.data) {
        setTodayTasks(tasksRes.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Carregando dashboard...
          </Typography>
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
  const todayLong = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const statusLabels: Record<string, string> = {
    briefing: 'Briefing',
    copy_ia: 'Copy IA',
    aprovacao: 'Aprovação',
    producao: 'Produção',
    revisao: 'Revisão',
    entrega: 'Entrega',
    iclips_out: 'iClips',
  };

  const topStats = {
    briefings: stats?.today.activeBriefings ?? 0,
    completed: stats?.lastWeek.briefingsCompleted ?? 0,
    approvalRate: stats?.lastWeek.approvalRate
      ? Math.round(stats.lastWeek.approvalRate * 100)
      : undefined,
    copies: stats?.lastWeek.totalCopiesGenerated ?? 0,
    clients: undefined,
    events: todayEvents.length,
  };

  return (
    <AppShell title="Dashboard">
      <Stack spacing={4}>
        <Card sx={{ position: 'relative', overflow: 'hidden' }}>
          <Box
            component="img"
            src="/modernize/images/backgrounds/welcome-bg2.png"
            alt=""
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              height: '100%',
              width: 'auto',
              opacity: 0.3,
              pointerEvents: 'none',
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
                  <Typography variant="h3" fontWeight={700}>
                    {todayNumber}
                  </Typography>
                  <Chip label={todayLong} size="small" variant="outlined" />
                </Stack>
                <Typography variant="body1" color="text.secondary">
                  Resumo operacional e principais datas do dia.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<IconFileText size={18} />}
                  onClick={() => router.push('/edro/novo')}
                >
                  Criar briefing
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<IconCalendar size={18} />}
                  onClick={() => router.push('/calendar')}
                >
                  Ver calendário
                </Button>
              </Stack>
            </Stack>
          </CardContent>
          <Divider />
          <CardContent sx={{ position: 'relative' }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    Celebrações de hoje
                  </Typography>
                  <Button size="small" onClick={() => router.push('/calendar')}>
                    Abrir dia
                  </Button>
                </Stack>
                <Stack spacing={2} sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
                  {todayEvents.length > 0 ? (
                    todayEvents.map((event) => (
                      <Card key={event.id} variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            py: 2,
                          }}
                        >
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar
                              variant="rounded"
                              sx={{
                                bgcolor: 'grey.100',
                                color: 'primary.main',
                                width: 48,
                                height: 48,
                              }}
                            >
                              <IconCalendar size={22} />
                            </Avatar>
                            <Box>
                              <Typography fontWeight={600}>{event.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Relevância: {event.score}%
                              </Typography>
                            </Box>
                          </Stack>
                          <Chip
                            label={`Tier ${event.tier}`}
                            size="small"
                            variant="outlined"
                            color={getTierColor(event.tier)}
                          />
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sem eventos relevantes para hoje.
                    </Typography>
                  )}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <Stack spacing={2}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="overline" color="text.secondary">
                        No resumo
                      </Typography>
                      <Stack spacing={1.5} mt={2}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Total de eventos
                          </Typography>
                          <Typography fontWeight={600}>{todayEvents.length}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Briefings ativos
                          </Typography>
                          <Typography fontWeight={600}>{stats?.today.activeBriefings || 0}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Vencem hoje
                          </Typography>
                          <Typography fontWeight={600}>{stats?.today.dueTodayCount || 0}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Aprovações pendentes
                          </Typography>
                          <Typography fontWeight={600} color="primary.main">
                            {stats?.today.pendingApprovals || 0}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Tasks hoje
                          </Typography>
                          <Typography fontWeight={600}>{stats?.today.tasksToday || 0}</Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="overline" color="text.secondary">
                        Segmentos prioritários
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
                        {priorityTags.length > 0 ? (
                          priorityTags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Sem tags prioritárias hoje.
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <TopCards stats={topStats} />

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">Próximas datas relevantes</Typography>
            <Button size="small" onClick={() => router.push('/calendar')}>
              Ver calendário
            </Button>
          </Stack>
          <Grid container spacing={2}>
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <Grid size={{ xs: 12, md: 6, lg: 3 }} key={`${event.id}-${event.date}`}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Box>
                          <Typography variant="overline" color="text.secondary">
                            {formatShortDate(event.date)}
                          </Typography>
                          <Typography fontWeight={600}>{event.name}</Typography>
                        </Box>
                        <Chip label={`Relevância ${event.score}%`} size="small" />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(event.score, 100)}
                        sx={{
                          mt: 2,
                          height: 6,
                          borderRadius: 99,
                          bgcolor: 'grey.100',
                          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Score base {event.score}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  Sem datas relevantes para os próximos dias.
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">Próximos Deadlines</Typography>
            <Button size="small" onClick={() => router.push('/edro')}>
              Ver briefings
            </Button>
          </Stack>
          <Card variant="outlined">
            <CardContent sx={{ p: 0 }}>
              {recentBriefings.length > 0 ? (
                <Stack divider={<Divider flexItem />} spacing={0}>
                  {recentBriefings.slice(0, 5).map((briefing) => (
                    <Box
                      key={briefing.id}
                      sx={{
                        px: 3,
                        py: 2,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
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
                            <Typography variant="body2" color="text.secondary">
                              {briefing.client_name || 'Sem cliente'}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <StatusChip
                            status={briefing.status}
                            label={statusLabels[briefing.status] || briefing.status}
                          />
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <IconCalendar size={16} />
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(briefing.due_at)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum briefing com deadline próximo.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Typography variant="h5" mb={2}>
            Performance - Última Semana
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="overline" color="text.secondary">
                      Briefings criados
                    </Typography>
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main', width: 36, height: 36 }}>
                      <IconFileText size={18} />
                    </Avatar>
                  </Stack>
                  <Typography variant="h4" color="success.main">
                    {stats?.lastWeek.briefingsCreated || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Últimos 7 dias
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="overline" color="text.secondary">
                      Briefings completados
                    </Typography>
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main', width: 36, height: 36 }}>
                      <IconClipboardList size={18} />
                    </Avatar>
                  </Stack>
                  <Typography variant="h4" color="primary.main">
                    {stats?.lastWeek.briefingsCompleted || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Entregues
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="overline" color="text.secondary">
                      Taxa de aprovação
                    </Typography>
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main', width: 36, height: 36 }}>
                      <IconChartLine size={18} />
                    </Avatar>
                  </Stack>
                  <Typography variant="h4" color="info.main">
                    {Math.round((stats?.lastWeek.approvalRate || 0) * 100)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Copies aprovadas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="overline" color="text.secondary">
                      Copies geradas
                    </Typography>
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main', width: 36, height: 36 }}>
                      <IconUsers size={18} />
                    </Avatar>
                  </Stack>
                  <Typography variant="h4" color="warning.main">
                    {stats?.lastWeek.totalCopiesGenerated || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total com IA
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {todayTasks.length > 0 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5">Minhas Tasks</Typography>
              <Button size="small" onClick={() => router.push('/edro')}>
                Ver tarefas
              </Button>
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
                              Atribuída para: {task.assigned_to}
                            </Typography>
                          </Box>
                        </Stack>
                        <Button size="small" onClick={() => router.push(`/edro/${task.briefing_id}`)}>
                          Ver Briefing
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}

        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<IconFileText size={18} />}
            onClick={() => router.push('/edro/novo')}
          >
            Novo Briefing
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconClipboardList size={18} />}
            onClick={() => router.push('/edro')}
          >
            Ver Todos os Briefings
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconCalendar size={18} />}
            onClick={() => router.push('/calendar')}
          >
            Calendário
          </Button>
        </Stack>
      </Stack>
    </AppShell>
  );
}
