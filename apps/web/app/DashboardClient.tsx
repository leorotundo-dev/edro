'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useBriefingDrawer } from '@/contexts/BriefingDrawerContext';
import EdroAvatar from '@/components/shared/EdroAvatar';
import StatusChip from '@/components/shared/StatusChip';
import { apiGet } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClipboardList,
  IconFileText,
  IconFlame,
  IconLayoutKanban,
  IconPlus,
  IconTrendingUp,
  IconChartBar,
  IconCurrencyReal,
  IconInbox,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────

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

type PendingByClient = {
  client_key: string;
  client_name: string;
  client_id: string | null;
  client_logo_url?: string | null;
  client_brand_color?: string | null;
  aprovacao: number;
  em_producao: number;
  atrasados: number;
  total_active: number;
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

type Metrics = {
  total: number;
  byStatus: Record<string, number>;
  overdue: number;
  totalCopies: number;
};

type PLRow = {
  id: string;
  name: string;
  receita_brl: string;
  margem_brl: string;
  margem_pct: string | null;
};

type ClientHealth = {
  id: string;
  name: string;
  score: number | null;
  status: string;
  statusColor: string;
};

type RoiDistribution = {
  excellent: number;
  good: number;
  average: number;
  poor: number;
  no_data: number;
};

type TrelloBoard = {
  id: string;
  name: string;
  card_count: number;
  in_progress_count: number;
  trello_board_id: string | null;
};

type PendingBriefingRequest = {
  id: string;
  client_name: string;
  form_data: { type?: string; objective?: string; platform?: string };
  created_at: string;
};

// ── Constants ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovação',
  producao: 'Produção',
  revisao: 'Revisão',
  entrega: 'Entrega',
  iclips_out: 'iClips',
};

// ── Sub-components ────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, light, href }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  light: string;
  href?: string;
}) {
  const router = useRouter();
  return (
    <Card
      sx={{
        flex: 1,
        cursor: href ? 'pointer' : 'default',
        bgcolor: light,
        boxShadow: 'none',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': href ? {
          transform: 'translateY(-3px)',
          boxShadow: `0 8px 24px ${color}28`,
        } : {},
      }}
      onClick={() => href && router.push(href)}
    >
      <CardContent sx={{ textAlign: 'center', py: 3.5, px: 2 }}>
        <Box
          sx={{
            width: 60, height: 60, borderRadius: '50%', mx: 'auto', mb: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: `${color}1a`, color,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="h3"
          fontWeight={800}
          sx={{ lineHeight: 1, mb: 0.75, fontSize: { xs: '2rem', sm: '2.25rem' } }}
        >
          {value}
        </Typography>
        <Typography variant="body2" fontWeight={500} sx={{ color: `${color}cc` }} noWrap>
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export default function DashboardClient() {
  const router = useRouter();
  const { open: openBriefing } = useBriefingDrawer();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentBriefings, setRecentBriefings] = useState<Briefing[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventWithDate[]>([]);
  const [pendingByClient, setPendingByClient] = useState<PendingByClient[]>([]);
  const [opsCritical, setOpsCritical] = useState(0);
  const [plRows, setPlRows] = useState<PLRow[]>([]);
  const [clientsHealth, setClientsHealth] = useState<ClientHealth[]>([]);
  const [roiDist, setRoiDist] = useState<RoiDistribution | null>(null);
  const [trelloBoards, setTrelloBoards] = useState<TrelloBoard[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingBriefingRequest[]>([]);
  const [requestsPopupOpen, setRequestsPopupOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const [metricsRes, briefingsRes, tasksRes, calendarRes, pendingRes, opsJobsRes, healthRes, roiRes, trelloRes, briefingRequestsRes] = await Promise.all([
        apiGet<{ success: boolean; data: Metrics }>('/edro/metrics').catch(() => null),
        apiGet<{ success: boolean; data: Briefing[] }>('/edro/briefings?limit=10').catch(() => null),
        apiGet<{ success: boolean; data: Task[] }>('/edro/tasks?status=pending').catch(() => null),
        apiGet<{ success?: boolean; month: string; days: Record<string, CalendarEvent[]> }>(
          `/calendar/events/${currentMonth}`
        ).catch(() => null),
        apiGet<{ success: boolean; data: PendingByClient[] }>('/edro/briefings/pending-by-client').catch(() => null),
        apiGet<{ data: { id: string; status: string; is_urgent: boolean; priority_band: string; owner_id: string | null }[] }>('/jobs?active=true').catch(() => null),
        apiGet<{ clients: ClientHealth[] }>('/admin/clients-health').catch(() => null),
        apiGet<{ distribution: RoiDistribution }>('/admin/roi-distribution').catch(() => null),
        apiGet<{ boards: TrelloBoard[] }>('/trello/project-boards').catch(() => null),
        apiGet<{ requests: PendingBriefingRequest[] }>('/admin/briefing-requests?status=submitted&limit=20').catch(() => null),
      ]);

      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (briefingsRes?.data) setRecentBriefings(briefingsRes.data);
      if (tasksRes?.data) setTodayTasks(tasksRes.data);
      if (pendingRes?.data) setPendingByClient(pendingRes.data);
      if (opsJobsRes?.data) {
        const closed = new Set(['published', 'done', 'archived']);
        const criticalIds = new Set(
          opsJobsRes.data
            .filter((j) => !closed.has(j.status) && (j.status === 'blocked' || j.is_urgent || (j.priority_band === 'p0' && !j.owner_id)))
            .map((j) => j.id)
        );
        setOpsCritical(criticalIds.size);
      }
      if (healthRes?.clients) setClientsHealth(healthRes.clients);
      if (roiRes?.distribution) setRoiDist(roiRes.distribution);
      if (trelloRes?.boards) setTrelloBoards(trelloRes.boards);
      if (briefingRequestsRes?.requests?.length) {
        setPendingRequests(briefingRequestsRes.requests);
        setRequestsPopupOpen(true);
      }

      if (calendarRes?.days) {
        const todaysList = calendarRes.days[today] || [];
        setTodayEvents(todaysList.filter((e: any) => e.is_relevant !== false).slice(0, 8));

        const upcoming = Object.entries(calendarRes.days)
          .filter(([date]) => date > today)
          .flatMap(([date, events]) => (events as any[]).map((ev: any) => ({ ...ev, date })))
          .filter((ev) => (ev.score ?? 0) >= 75)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);
        setUpcomingEvents(upcoming);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <Stack spacing={3}>
          <Skeleton variant="rounded" height={120} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rounded" height={88} sx={{ flex: 1 }} />
            ))}
          </Stack>
          <Skeleton variant="rounded" height={300} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rounded" height={260} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rounded" height={260} /></Grid>
          </Grid>
        </Stack>
      </AppShell>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sem prazo';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const active = (metrics?.byStatus?.active ?? 0) + (metrics?.byStatus?.in_progress ?? 0);
  const pendingApprovals = metrics?.byStatus?.['aprovacao'] || 0;

  const totalReceita = plRows.reduce((s, r) => s + parseFloat(r.receita_brl || '0'), 0);
  const totalMargem = plRows.reduce((s, r) => s + parseFloat(r.margem_brl || '0'), 0);
  const margemPct = totalReceita > 0 ? Math.round((totalMargem / totalReceita) * 100) : null;
  const briefingsDone = metrics?.byStatus?.done ?? 0;

  const roiTotal = roiDist ? Object.values(roiDist).reduce((s, v) => s + v, 0) : 0;

  const sortedPending = [...pendingByClient].sort((a, b) => {
    if (b.atrasados !== a.atrasados) return b.atrasados - a.atrasados;
    if (b.aprovacao !== a.aprovacao) return b.aprovacao - a.aprovacao;
    return b.total_active - a.total_active;
  });

  return (
    <AppShell title="Dashboard">

      {/* ── Popup: Solicitações pendentes do portal ──────────────────── */}
      <Dialog
        open={requestsPopupOpen}
        onClose={() => setRequestsPopupOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ p: 1, bgcolor: 'warning.light', borderRadius: 1.5, display: 'flex' }}>
              <IconInbox size={20} color="#b45309" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {pendingRequests.length === 1
                  ? '1 nova solicitação de job'
                  : `${pendingRequests.length} novas solicitações de job`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Enviadas pelo portal do cliente — aguardando seu retorno
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Stack spacing={1} divider={<Divider />}>
            {pendingRequests.map((req) => (
              <Box key={req.id} sx={{ py: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={700}>{req.client_name}</Typography>
                      {req.form_data.type && (
                        <Chip label={req.form_data.type} size="small" variant="outlined" />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {req.form_data.objective}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {new Date(req.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="text" color="inherit" onClick={() => setRequestsPopupOpen(false)}>
            Fechar
          </Button>
          <Button
            variant="contained"
            endIcon={<IconArrowRight size={16} />}
            onClick={() => { setRequestsPopupOpen(false); router.push('/admin/solicitacoes'); }}
          >
            Ver fila de solicitações
          </Button>
        </DialogActions>
      </Dialog>

      <Stack spacing={3.5}>
        {/* ── Quick Stats ───────────────────────────────────────── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
          <StatCard
            label="Jobs ativos"
            value={active || (metrics?.total ?? 0)}
            icon={<IconTrendingUp size={28} />}
            color="#FFAE1F"
            light="#FEF5E5"
            href="/admin/operacoes?filter=in_progress"
          />
          <StatCard
            label="Aguardando aprovação"
            value={pendingApprovals}
            icon={<IconClipboardList size={28} />}
            color="#E85219"
            light="#fdeee8"
            href="/admin/operacoes"
          />
          <StatCard
            label="Atrasados"
            value={metrics?.overdue ?? 0}
            icon={<IconAlertTriangle size={28} />}
            color="#FA896B"
            light="#FDEDE8"
            href="/admin/operacoes"
          />
          <StatCard
            label="Peças criadas"
            value={metrics?.totalCopies ?? 0}
            icon={<IconCheck size={28} />}
            color="#13DEB9"
            light="#E6FFFA"
            href="/studio"
          />
          <StatCard
            label="Ops críticas"
            value={opsCritical}
            icon={<IconFlame size={28} />}
            color="#dc2626"
            light="#fee2e2"
            href="/admin/operacoes/jobs?group=risk"
          />
        </Stack>

        {/* ── Pipeline por Cliente ──────────────────────────────── */}
        {sortedPending.length > 0 && (
          <Card>
            <CardContent sx={{ pb: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Pipeline por Cliente</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ordenado por urgência · clique para ir ao cliente
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconFileText size={14} />}
                  onClick={() => router.push('/edro/novo')}
                >
                  Novo Briefing
                </Button>
              </Stack>
            </CardContent>
            <Stack divider={<Divider flexItem />} spacing={0}>
              {sortedPending.map((item) => (
                <Box
                  key={item.client_key}
                  sx={{
                    px: 3, py: 2,
                    cursor: item.client_id ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                    '&:hover': item.client_id ? { bgcolor: 'action.hover' } : {},
                  }}
                  onClick={() => item.client_id && router.push(`/clients/${item.client_id}`)}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                      <EdroAvatar
                        src={item.client_logo_url}
                        name={item.client_name}
                        size={36}
                        sx={item.client_brand_color ? { bgcolor: `${item.client_brand_color}33` } : undefined}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>{item.client_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.total_active} ativo{item.total_active !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} flexShrink={0} alignItems="center" flexWrap="wrap">
                      {item.atrasados > 0 && (
                        <Chip
                          icon={<IconAlertTriangle size={13} />}
                          label={`${item.atrasados} atrasado${item.atrasados > 1 ? 's' : ''}`}
                          size="small"
                          color="error"
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                      {item.aprovacao > 0 && (
                        <Chip
                          label={`${item.aprovacao} aprovação`}
                          size="small"
                          sx={{ bgcolor: '#fff7ed', color: '#E85219', fontWeight: 700, border: '1px solid #E8521940' }}
                        />
                      )}
                      {item.em_producao > 0 && (
                        <Chip
                          label={`${item.em_producao} produção`}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                      {item.client_id && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/clients/${item.client_id}/planning`);
                          }}
                          sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                        >
                          Planning
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Card>
        )}

        {/* ── Saúde dos Clientes + ROI de Copy ─────────────────── */}
        <Grid container spacing={2}>
          {/* Saúde dos Clientes */}
          {clientsHealth.length > 0 && (
            <Grid size={{ xs: 12, md: roiDist && roiTotal > 0 ? 7 : 12 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>Saúde dos Clientes</Typography>
                      <Typography variant="caption" color="text.secondary">Score 0–100 · últimos 30 dias</Typography>
                    </Box>
                    <Button size="small" onClick={() => router.push('/clientes')}>Ver todos</Button>
                  </Stack>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {clientsHealth.map((c) => (
                      <Tooltip key={c.id} title={c.score !== null ? `Score: ${c.score}` : 'Sem dados'} arrow>
                        <Chip
                          label={c.name}
                          size="small"
                          onClick={() => router.push(`/clients/${c.id}`)}
                          sx={{
                            cursor: 'pointer',
                            fontWeight: 600,
                            bgcolor: c.score === null ? '#f1f5f9'
                              : c.score >= 70 ? '#dcfce7'
                              : c.score >= 40 ? '#fef9c3'
                              : '#fee2e2',
                            color: c.score === null ? '#64748b'
                              : c.score >= 70 ? '#16a34a'
                              : c.score >= 40 ? '#ca8a04'
                              : '#dc2626',
                            border: '1px solid',
                            borderColor: c.score === null ? '#e2e8f0'
                              : c.score >= 70 ? '#bbf7d0'
                              : c.score >= 40 ? '#fde68a'
                              : '#fecaca',
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                  <Stack direction="row" spacing={2} mt={2}>
                    {[
                      { label: 'Saudável', color: '#16a34a', bg: '#dcfce7', count: clientsHealth.filter(c => (c.score ?? 0) >= 70).length },
                      { label: 'Atenção', color: '#ca8a04', bg: '#fef9c3', count: clientsHealth.filter(c => (c.score ?? 0) >= 40 && (c.score ?? 0) < 70).length },
                      { label: 'Crítico', color: '#dc2626', bg: '#fee2e2', count: clientsHealth.filter(c => c.score !== null && (c.score ?? 0) < 40).length },
                    ].map(({ label, color, bg, count }) => (
                      <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                        <Typography variant="caption" color="text.secondary">{count} {label}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* ROI de Copy */}
          {roiDist && roiTotal > 0 && (
            <Grid size={{ xs: 12, md: clientsHealth.length > 0 ? 5 : 12 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>ROI de Copy</Typography>
                      <Typography variant="caption" color="text.secondary">{roiTotal} peças · últimos 90 dias</Typography>
                    </Box>
                    <Button size="small" onClick={() => router.push('/admin/intelligence')}>Detalhes</Button>
                  </Stack>
                  <Stack spacing={1.5}>
                    {([
                      { key: 'excellent', label: 'Excelente', color: '#16a34a' },
                      { key: 'good', label: 'Bom', color: '#2563eb' },
                      { key: 'average', label: 'Médio', color: '#ca8a04' },
                      { key: 'poor', label: 'Fraco', color: '#dc2626' },
                    ] as const).map(({ key, label, color }) => {
                      const count = roiDist[key] ?? 0;
                      const pct = roiTotal > 0 ? Math.round((count / roiTotal) * 100) : 0;
                      return (
                        <Box key={key}>
                          <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" fontWeight={600} sx={{ color }}>{label}</Typography>
                            <Typography variant="caption" color="text.secondary">{count} ({pct}%)</Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 6, borderRadius: 99, bgcolor: 'grey.100',
                              '& .MuiLinearProgress-bar': { bgcolor: color },
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* ── Produção Trello ───────────────────────────────────── */}
        {trelloBoards.length > 0 && (
          <Card>
            <CardContent sx={{ pb: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Produção em andamento</Typography>
                  <Typography variant="caption" color="text.secondary">Boards Trello · cards em andamento por cliente</Typography>
                </Box>
                <Button size="small" startIcon={<IconLayoutKanban size={14} />} onClick={() => router.push('/projetos')}>
                  Ver kanban
                </Button>
              </Stack>
            </CardContent>
            <Grid container spacing={0} sx={{ px: 2, pb: 2 }}>
              {trelloBoards.map((board) => (
                <Grid key={board.id} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Box
                    onClick={() => router.push(`/projetos/${board.id}`)}
                    sx={{
                      p: 1.5, m: 0.5, borderRadius: 2, cursor: 'pointer',
                      border: '1px solid', borderColor: 'divider',
                      transition: 'all 0.15s', '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconLayoutKanban size={16} color="#E85219" />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={700} noWrap display="block">{board.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{board.in_progress_count ?? 0} em andamento</Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Card>
        )}

        {/* ── Calendário hoje + Próximas datas ─────────────────── */}
        <Grid container spacing={2}>

          {/* Hoje */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={700}>
                    Hoje — {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </Typography>
                  <Button size="small" onClick={() => router.push('/calendar')}>Ver calendário</Button>
                </Stack>

                {todayEvents.length > 0 ? (
                  <Stack spacing={0}>
                    {todayEvents.map((event, idx) => {
                      const name = String((event as any)?.name || (event as any)?.slug || '').trim() || `Evento ${idx + 1}`;
                      const scoreValue = Number((event as any)?.score ?? 0);
                      const safeScore = Number.isFinite(scoreValue) ? Math.max(0, Math.min(100, Math.round(scoreValue))) : 0;
                      const tierValue = String((event as any)?.tier || (safeScore >= 80 ? 'A' : safeScore >= 55 ? 'B' : 'C'));
                      const todayStr = new Date().toISOString().slice(0, 10);
                      return (
                        <Box
                          key={String((event as any)?.id || `${name}-${idx}`)}
                          onClick={() => router.push('/calendar')}
                          sx={{
                            py: 1, display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', gap: 1.5,
                            borderBottom: '1px solid', borderColor: 'divider',
                            cursor: 'pointer', transition: 'background 0.15s',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                            <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main', width: 30, height: 30 }}>
                              <IconCalendar size={16} />
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>{name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Tier {tierValue} · {safeScore}%
                              </Typography>
                            </Box>
                          </Stack>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<IconPlus size={12} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/studio/brief?event=${encodeURIComponent(name)}&date=${todayStr}&score=${safeScore}&source=calendar`);
                            }}
                            sx={{ fontSize: '0.65rem', py: 0.2, px: 0.75, whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'none' }}
                          >
                            Briefing
                          </Button>
                        </Box>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sem eventos relevantes para hoje.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Próximas datas */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={700}>Próximas datas relevantes</Typography>
                  <Button size="small" onClick={() => router.push('/calendar')}>Ver mais</Button>
                </Stack>

                {upcomingEvents.length > 0 ? (
                  <Stack spacing={1.5}>
                    {upcomingEvents.map((event) => (
                      <Box
                        key={`${event.id}-${event.date}`}
                        onClick={() => router.push(`/studio/brief?event=${encodeURIComponent(event.name)}&date=${event.date}&score=${event.score}&source=calendar`)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          cursor: 'pointer', borderRadius: 2, px: 1, py: 0.5, mx: -1,
                          transition: 'background 0.15s', '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Box sx={{ textAlign: 'center', minWidth: 38, flexShrink: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                            {new Date(event.date).toLocaleDateString('pt-BR', { month: 'short' })}
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit' })}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{event.name}</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(event.score, 100)}
                            sx={{
                              mt: 0.5, height: 4, borderRadius: 99, bgcolor: 'grey.100',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: event.score >= 80 ? '#16a34a' : event.score >= 55 ? '#ca8a04' : '#94a3b8',
                              },
                            }}
                          />
                        </Box>
                        <Chip
                          label={`${event.score}%`}
                          size="small"
                          sx={{
                            flexShrink: 0, fontWeight: 700,
                            bgcolor: event.score >= 80 ? '#dcfce7' : event.score >= 55 ? '#fef9c3' : '#f1f5f9',
                            color: event.score >= 80 ? '#16a34a' : event.score >= 55 ? '#ca8a04' : '#64748b',
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma data relevante nos próximos dias.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Deadlines + Tasks ─────────────────────────────────── */}
        {(recentBriefings.length > 0 || todayTasks.length > 0) && (
          <Grid container spacing={2}>

            {recentBriefings.length > 0 && (
              <Grid size={{ xs: 12, md: todayTasks.length > 0 ? 7 : 12 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ pb: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                      <Typography variant="h6" fontWeight={700}>Próximos Deadlines</Typography>
                      <Button size="small" onClick={() => router.push('/edro')}>Ver todos</Button>
                    </Stack>
                  </CardContent>
                  <Stack divider={<Divider flexItem />} spacing={0}>
                    {recentBriefings.slice(0, 5).map((briefing) => (
                      <Box
                        key={briefing.id}
                        sx={{
                          px: 2.5, py: 1.5, cursor: 'pointer',
                          transition: 'background 0.2s', '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => openBriefing(briefing.id)}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                            <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main', width: 32, height: 32 }}>
                              <IconFileText size={16} />
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>{briefing.title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {briefing.client_name || 'Sem cliente'}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                            <StatusChip status={briefing.status} label={STATUS_LABELS[briefing.status] || briefing.status} />
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {formatDate(briefing.due_at)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Card>
              </Grid>
            )}

            {todayTasks.length > 0 && (
              <Grid size={{ xs: 12, md: recentBriefings.length > 0 ? 5 : 12 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ pb: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                      <Typography variant="h6" fontWeight={700}>Minhas Tasks</Typography>
                      <Button size="small" onClick={() => router.push('/edro')}>Ver tarefas</Button>
                    </Stack>
                  </CardContent>
                  <Stack divider={<Divider flexItem />} spacing={0}>
                    {todayTasks.slice(0, 5).map((task) => (
                      <Box
                        key={task.id}
                        sx={{
                          px: 2.5, py: 1.5, cursor: 'pointer',
                          transition: 'background 0.2s', '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => openBriefing(task.briefing_id)}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                            <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main', width: 32, height: 32 }}>
                              <IconClipboardList size={16} />
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }} noWrap>
                                {task.type.replace(/_/g, ' ')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {task.assigned_to}
                              </Typography>
                            </Box>
                          </Stack>
                          <Button size="small" sx={{ flexShrink: 0, fontSize: '0.7rem' }}>
                            Ver
                          </Button>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Card>
              </Grid>
            )}

          </Grid>
        )}

      </Stack>
    </AppShell>
  );
}
