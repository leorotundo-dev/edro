'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconCircleCheckFilled,
  IconInbox,
  IconCalendarClock,
  IconFlame,
  IconClock,
  IconUserOff,
  IconChecklist,
  IconBell,
  IconUsers,
  IconUsersGroup,
  IconPlus,
  IconLayoutKanban,
  IconCalendarTime,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { apiGet } from '@/lib/api';
import JarvisHomeSection from '@/components/jarvis/JarvisHomeSection';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import {
  ActionStrip,
  CapacityBar,
  ClientThumb,
  EntityLinkCard,
  OperationsContextRail,
  OpsDivider,
  OpsJobRow,
  OpsPanel,
  PipelineBoard,
  PersonThumb,
  SourceThumb,
} from '@/components/operations/primitives';
import {
  criticalAlerts,
  jobsByAttentionClient,
  jobsForToday,
  ownerActiveJobs,
  ownerAllocableMinutes,
  ownerCommittedMinutes,
  ownerTentativeMinutes,
  sortByOperationalPriority,
} from '@/components/operations/derived';
import { formatSkillLabel, formatSourceLabel, getNextAction, getRisk, type OperationsJob } from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { apiPost } from '@/lib/api';
import { OPS_COPY } from '@/components/operations/copy';

export default function OperationsOverviewClient() {
  const { jobs, lookups, loading, error, refresh, syncHealth, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [syncing, setSyncing] = useState(false);
  const [signalStats, setSignalStats] = useState({ total: 0, critical: 0, attention: 0 });

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await apiPost('/trello/sync-all', {});
      setTimeout(() => { refresh(); setSyncing(false); }, 4000);
    } catch {
      setSyncing(false);
    }
  };
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [overviewRuntime, setOverviewRuntime] = useState<{
    checkpoints: OperationsJob[];
    approvals: OperationsJob[];
    summary: {
      checkpoints_total: number;
      approvals_pending_total: number;
      approvals_blocked_total: number;
      near_deadline_total: number;
    };
  }>({
    checkpoints: [],
    approvals: [],
    summary: {
      checkpoints_total: 0,
      approvals_pending_total: 0,
      approvals_blocked_total: 0,
      near_deadline_total: 0,
    },
  });
  const clientsById = useMemo(() => new Map(lookups.clients.map((client) => [client.id, client])), [lookups.clients]);

  const criticalJobs = useMemo(
    () => [...jobs].filter((job) => ['critical', 'high'].includes(getRisk(job).level)).sort(sortByOperationalPriority),
    [jobs]
  );
  const unassignedJobs = useMemo(
    () => [...jobs].filter((job) => !job.owner_id && job.status !== 'archived').sort(sortByOperationalPriority),
    [jobs]
  );
  const todayJobs = useMemo(() => jobsForToday(jobs).sort(sortByOperationalPriority), [jobs]);
  const attentionClients = useMemo(() => jobsByAttentionClient(jobs).slice(0, 5), [jobs]);
  const alerts = useMemo(() => criticalAlerts(jobs), [jobs]);
  const ownerLoads = useMemo(
    () =>
      lookups.owners
        .map((owner) => ({
          owner,
          allocableMinutes: ownerAllocableMinutes(owner),
          committedMinutes: ownerCommittedMinutes(jobs, owner.id),
          tentativeMinutes: ownerTentativeMinutes(jobs, owner.id),
        }))
        .filter((item) => item.committedMinutes > 0 || item.tentativeMinutes > 0)
        .sort((a, b) => b.committedMinutes + b.tentativeMinutes - (a.committedMinutes + a.tentativeMinutes))
        .slice(0, 4),
    [jobs, lookups.owners]
  );
  const overloadedOwners = useMemo(
    () => ownerLoads.filter((item) => item.committedMinutes + item.tentativeMinutes > item.allocableMinutes).length,
    [ownerLoads]
  );

  const capacidadePressionada = useMemo(
    () =>
      lookups.owners.filter((owner) => {
        const committed = ownerCommittedMinutes(jobs, owner.id);
        const tentative = ownerTentativeMinutes(jobs, owner.id);
        return committed + tentative > ownerAllocableMinutes(owner);
      }).length,
    [jobs, lookups.owners]
  );

  const esperandoClienteJobs = useMemo(
    () => jobs.filter((j) => j.status === 'awaiting_approval'),
    [jobs]
  );

  const loadOverviewRuntime = useCallback(async () => {
    try {
      const response = await apiGet<{ data?: typeof overviewRuntime }>('/operations/overview');
      if (response?.data) setOverviewRuntime(response.data);
    } catch {
      setOverviewRuntime((current) => current);
    }
  }, []);

  const loadSignalStats = useCallback(async () => {
    try {
      const response = await apiGet<{ data?: Array<{ severity: number }> }>('/operations/signals?limit=50');
      const signals = response?.data || [];
      setSignalStats({
        total: signals.length,
        critical: signals.filter((signal) => signal.severity >= 90).length,
        attention: signals.filter((signal) => signal.severity >= 70 && signal.severity < 90).length,
      });
    } catch {
      setSignalStats({ total: 0, critical: 0, attention: 0 });
    }
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    const fresh = jobs.find((job) => job.id === selectedJob.id);
    if (fresh) {
      setSelectedJob(fresh);
      return;
    }
    const runtimeJob = [...overviewRuntime.checkpoints, ...overviewRuntime.approvals].find((job) => job.id === selectedJob.id);
    if (runtimeJob) {
      setSelectedJob(runtimeJob);
      return;
    }
    setSelectedJob(null);
  }, [criticalJobs, jobs, overviewRuntime.approvals, overviewRuntime.checkpoints, selectedJob, todayJobs, unassignedJobs]);

  useEffect(() => {
    if (loading) return;
    void loadOverviewRuntime();
    void loadSignalStats();
  }, [loadOverviewRuntime, loadSignalStats, loading]);

  const handleRefreshOverview = useCallback(async () => {
    await refresh();
    await loadOverviewRuntime();
    await loadSignalStats();
  }, [loadOverviewRuntime, loadSignalStats, refresh]);

  const handleAdvance = useCallback(async (jobId: string, nextStatus: string) => {
    await changeStatus(jobId, nextStatus);
    await handleRefreshOverview();
  }, [changeStatus, handleRefreshOverview]);

  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;

  return (
    <OperationsShell
      section="overview"
      summary={
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          {[
            { value: criticalJobs.length, label: OPS_COPY.overview.summaryExceptions, color: criticalJobs.length ? '#FA896B' : undefined },
            { value: unassignedJobs.length, label: OPS_COPY.overview.summaryUnassigned, color: unassignedJobs.length ? '#FFAE1F' : undefined },
            { value: todayJobs.length, label: OPS_COPY.overview.summaryToday, color: todayJobs.length ? '#FFAE1F' : undefined },
            { value: overviewRuntime.summary.checkpoints_total, label: OPS_COPY.overview.summaryCheckpoints, color: overviewRuntime.summary.checkpoints_total ? '#FFAE1F' : undefined },
          ].map((kpi) => (
            <Stack key={kpi.label} direction="row" spacing={0.5} alignItems="baseline">
              <Typography variant="body1" sx={{ fontWeight: 900, lineHeight: 1, ...(kpi.color ? { color: kpi.color } : {}) }}>
                {kpi.value}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.68rem' }}>
                {kpi.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      }
    >
      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && syncHealth?.needs_attention && (
        <Alert
          severity={syncHealth.stale_boards > 0 || (syncHealth.unmapped_lists ?? 0) > 0 ? 'warning' : 'info'}
          sx={{ mb: 2 }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                color="inherit"
                variant="outlined"
                disabled={syncing}
                onClick={handleSyncNow}
              >
                {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
              </Button>
              <Button size="small" color="inherit" href="/admin/trello" component="a">
                Configurar
              </Button>
            </Stack>
          }
        >
          {syncHealth.stale_boards > 0 && (
            <span>{syncHealth.stale_boards} board(s) com dados desatualizados{syncHealth.oldest_sync_hours != null ? ` (há ${syncHealth.oldest_sync_hours}h)` : ''}. </span>
          )}
          {syncHealth.unlinked_boards > 0 && (
            <span>{syncHealth.unlinked_boards} board(s) sem cliente vinculado — cards aparecem sem contexto. </span>
          )}
          {(syncHealth.unmapped_lists ?? 0) > 0 && (
            <span>{syncHealth.unmapped_lists} lista(s) sem status mapeado — cards aparecem como Intake incorretamente. <a href="/admin/trello?tab=mapping" style={{ color: 'inherit', fontWeight: 600 }}>Mapear →</a></span>
          )}
        </Alert>
      )}

      {/* ── Mesa de Comando ── */}
      <Box sx={(theme) => ({
        mb: 3,
        borderRadius: 3,
        border: `1px solid ${theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.08) : alpha(theme.palette.common.black, 0.07)}`,
        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.02) : '#fff',
        overflow: 'hidden',
      })}>
        {/* Header */}
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="overline" sx={{ fontWeight: 800, color: 'warning.main', letterSpacing: '0.12em', lineHeight: 1, display: 'block', fontSize: '0.65rem' }}>
                MESA DE COMANDO
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mt: 0.25 }}>
                O que decidir agora
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                Combina Trello ao vivo, leitura operacional e estimativas da Edro para você agir sem interpretar a tela.
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {[
                { label: 'Ao vivo do Trello', active: false },
                { label: 'Calculado pela Edro', active: true },
                { label: 'Estimado pela Edro', active: false },
              ].map((tag) => (
                <Chip
                  key={tag.label}
                  label={tag.label}
                  size="small"
                  variant={tag.active ? 'filled' : 'outlined'}
                  sx={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    height: 22,
                    ...(tag.active ? { bgcolor: 'warning.main', color: '#fff' } : {}),
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </Box>

        {/* KPI Grid */}
        <Box sx={{ px: 2, pb: 2 }}>
          {loading ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1.5 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Box key={i} sx={{ height: 80, borderRadius: 2, bgcolor: 'action.hover' }} />
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5 }}>
              {[
                {
                  icon: <IconFlame size={18} />,
                  value: criticalJobs.length + signalStats.critical,
                  label: 'PEGANDO FOGO',
                  sub: `${criticalJobs.length} demandas · ${signalStats.critical} sinais`,
                  color: '#FA896B',
                  hot: criticalJobs.length + signalStats.critical > 0,
                },
                {
                  icon: <IconClock size={18} />,
                  value: todayJobs.length,
                  label: 'VENCE HOJE',
                  sub: 'Demandas com prazo imediato',
                  color: '#FFAE1F',
                  hot: todayJobs.length > 0,
                },
                {
                  icon: <IconUserOff size={18} />,
                  value: unassignedJobs.length,
                  label: 'SEM DONO',
                  sub: 'Demandas que precisam de responsável',
                  color: '#FFAE1F',
                  hot: unassignedJobs.length > 0,
                },
                {
                  icon: <IconChecklist size={18} />,
                  value: esperandoClienteJobs.length,
                  label: 'ESPERANDO CLIENTE',
                  sub: 'Aprovações e retornos',
                  color: '#5D87FF',
                  hot: esperandoClienteJobs.length > 0,
                },
                {
                  icon: <IconBell size={18} />,
                  value: signalStats.total,
                  label: 'SINAIS ATIVOS',
                  sub: `${signalStats.attention} em atenção`,
                  color: '#13DEB9',
                  hot: signalStats.total > 0,
                },
                {
                  icon: <IconUsersGroup size={18} />,
                  value: capacidadePressionada,
                  label: 'CAPACIDADE PRESSIONADA',
                  sub: 'Pessoas acima da folga',
                  color: '#FA896B',
                  hot: capacidadePressionada > 0,
                },
              ].map((kpi) => (
                <Box
                  key={kpi.label}
                  sx={(theme) => ({
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${kpi.hot ? alpha(kpi.color, 0.22) : alpha(theme.palette.divider, 0.8)}`,
                    bgcolor: kpi.hot
                      ? alpha(kpi.color, theme.palette.mode === 'dark' ? 0.06 : 0.04)
                      : theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.common.black, 0.015),
                    transition: 'all 150ms ease',
                  })}
                >
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
                    <Box sx={{ color: kpi.hot ? kpi.color : 'text.disabled' }}>{kpi.icon}</Box>
                  </Stack>
                  <Typography sx={{
                    fontWeight: 900,
                    fontSize: '1.75rem',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    color: kpi.hot ? kpi.color : 'text.disabled',
                  }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" sx={{
                    fontWeight: 800,
                    fontSize: '0.58rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'text.secondary',
                    display: 'block',
                    mt: 0.5,
                  }}>
                    {kpi.label}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', display: 'block', mt: 0.25, lineHeight: 1.3 }}>
                    {kpi.sub}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Action buttons */}
        <Box sx={(theme) => ({
          px: 3, py: 1.75,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.01) : alpha(theme.palette.common.black, 0.01),
        })}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              size="small"
              startIcon={<IconPlus size={15} />}
              href="/admin/operacoes/jobs?new=1"
              component="a"
              sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' }, fontWeight: 700, fontSize: '0.78rem' }}
            >
              Nova demanda
            </Button>
            {[
              { label: 'Organizar fila', href: '/admin/operacoes/jobs', icon: <IconLayoutKanban size={14} /> },
              { label: 'Replanejar semana', href: '/admin/operacoes/planner', icon: <IconCalendarTime size={14} /> },
              { label: 'Abrir riscos', href: '/admin/operacoes/radar', icon: <IconAlertTriangle size={14} /> },
            ].map((btn) => (
              <Button
                key={btn.label}
                variant="outlined"
                size="small"
                startIcon={btn.icon}
                href={btn.href}
                component="a"
                sx={{ fontWeight: 600, fontSize: '0.78rem', color: 'text.secondary', borderColor: 'divider', '&:hover': { borderColor: 'warning.main', color: 'warning.main' } }}
              >
                {btn.label}
              </Button>
            ))}
          </Stack>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <OpsPanel
              eyebrow="Mesa de comando"
              title="O que decidir agora"
              subtitle="Tudo abaixo combina Trello ao vivo, leitura operacional e estimativas da Edro para você agir sem interpretar a tela."
              action={
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" variant="outlined" label="Ao vivo do Trello" />
                  <Chip size="small" variant="outlined" color="warning" label="Calculado pela Edro" />
                  <Chip size="small" variant="outlined" color="info" label="Estimado pela Edro" />
                </Stack>
              }
            >
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(6, minmax(0, 1fr))' },
                    gap: 1.25,
                  }}
                >
                  {[
                    { label: 'Pegando fogo', value: criticalJobs.length + signalStats.critical, subtitle: `${criticalJobs.length} demandas · ${signalStats.critical} sinais`, href: '/admin/operacoes/radar', icon: <IconAlertTriangle size={16} />, color: '#FA896B' },
                    { label: 'Vence hoje', value: todayJobs.length, subtitle: 'Demandas com prazo imediato', href: '/admin/operacoes/jobs?group=status', icon: <IconCalendarClock size={16} />, color: '#5D87FF' },
                    { label: 'Sem dono', value: unassignedJobs.length, subtitle: 'Demandas que precisam de responsável', href: '/admin/operacoes/jobs?unassigned=true', icon: <IconInbox size={16} />, color: '#FFAE1F' },
                    { label: 'Esperando cliente', value: overviewRuntime.summary.approvals_pending_total + overviewRuntime.summary.approvals_blocked_total, subtitle: 'Aprovações e retornos', href: '/admin/operacoes/jobs', icon: <IconCircleCheckFilled size={16} />, color: '#FFAE1F' },
                    { label: 'Sinais ativos', value: signalStats.total, subtitle: `${signalStats.attention} em atenção`, href: '/admin/operacoes/radar', icon: <IconBell size={16} />, color: '#E85219' },
                    { label: 'Capacidade pressionada', value: overloadedOwners, subtitle: 'Pessoas acima da folga', href: '/admin/operacoes/semana?view=distribution', icon: <IconUsers size={16} />, color: '#13DEB9' },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      component={Link}
                      href={item.href}
                      sx={(theme) => ({
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit',
                        p: 1.75,
                        borderRadius: 2,
                        border: `1px solid ${alpha(item.color, 0.22)}`,
                        bgcolor: theme.palette.mode === 'dark' ? alpha(item.color, 0.08) : alpha(item.color, 0.04),
                        transition: 'all 180ms ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          borderColor: alpha(item.color, 0.35),
                          bgcolor: theme.palette.mode === 'dark' ? alpha(item.color, 0.12) : alpha(item.color, 0.08),
                        },
                      })}
                    >
                      <Stack spacing={0.8}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: alpha(item.color, 0.14),
                              color: item.color,
                            }}
                          >
                            {item.icon}
                          </Box>
                          <Typography sx={{ fontWeight: 900, color: item.color, fontSize: '1.5rem', lineHeight: 1 }}>
                            {item.value}
                          </Typography>
                        </Stack>
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.primary', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {item.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {item.subtitle}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" startIcon={<IconPlus size={16} />} component={Link} href="/admin/operacoes/jobs?new=1">
                    Nova demanda
                  </Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/jobs?unassigned=true">
                    Organizar fila
                  </Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/semana?view=distribution">
                    Replanejar semana
                  </Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/radar">
                    Abrir riscos
                  </Button>
                </Stack>
              </Stack>
            </OpsPanel>
          </Grid>

          <Grid size={{ xs: 12, lg: 3 }}>
            <OpsPanel eyebrow={OPS_COPY.overview.pulseEyebrow} title={OPS_COPY.overview.pulseTitle} subtitle={OPS_COPY.overview.pulseSubtitle}>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha('#E85219', 0.12),
                          color: '#E85219',
                        }}
                      >
                        <IconInbox size={14} />
                      </Box>
                      <Typography variant="body2" fontWeight={900}>Sem responsável</Typography>
                    </Stack>
                    <Chip size="small" color="warning" label={`${unassignedJobs.length}`} />
                  </Stack>
                  <Stack spacing={0.35}>
                    {unassignedJobs.slice(0, 4).map((job) => (
                      <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} />
                    ))}
                    {!unassignedJobs.length ? <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyUnassigned}</Typography> : null}
                  </Stack>
                </Box>

                <OpsDivider />

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha('#5D87FF', 0.12),
                          color: '#5D87FF',
                        }}
                      >
                        <IconCalendarClock size={14} />
                      </Box>
                      <Typography variant="body2" fontWeight={900}>Vence hoje</Typography>
                    </Stack>
                    <Chip size="small" label={`${todayJobs.length}`} />
                  </Stack>
                  <Stack spacing={0.35}>
                    {todayJobs.slice(0, 4).map((job) => (
                      <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} />
                    ))}
                    {!todayJobs.length ? <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyToday}</Typography> : null}
                  </Stack>
                </Box>

                <OpsDivider />

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha('#FFAE1F', 0.12),
                          color: '#FFAE1F',
                        }}
                      >
                        <IconCircleCheckFilled size={14} />
                      </Box>
                      <Typography variant="body2" fontWeight={900}>Aprovações do cliente</Typography>
                    </Stack>
                    <Chip size="small" color={overviewRuntime.summary.approvals_blocked_total ? 'error' : 'default'} label={`${overviewRuntime.summary.approvals_pending_total + overviewRuntime.summary.approvals_blocked_total}`} />
                  </Stack>
                  <Stack spacing={0.35}>
                    {overviewRuntime.approvals.slice(0, 4).map((job) => (
                      <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} showStage />
                    ))}
                    {!overviewRuntime.approvals.length ? <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyApprovals}</Typography> : null}
                  </Stack>
                </Box>
              </Stack>
            </OpsPanel>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <OpsPanel
              eyebrow="Mapa visual da operação"
              title="Como a agência está andando"
              subtitle="Use o fluxo e o semáforo abaixo para decidir sem ler relatório. Tudo parte do Trello e só ganha leitura operacional por cima."
              action={
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" variant="outlined" label={`${jobs.length} demandas ativas`} />
                  <Button variant="outlined" size="small" onClick={handleRefreshOverview}>
                    {OPS_COPY.overview.flowRefresh}
                  </Button>
                </Stack>
              }
            >
              <Stack spacing={2}>
                <ActionStrip
                  alerts={alerts}
                  owners={lookups.owners}
                  jobs={jobs}
                  onSelectJob={(job) => setSelectedJob(job)}
                  allocableMinutesFn={ownerAllocableMinutes}
                  committedMinutesFn={ownerCommittedMinutes}
                />

                <PipelineBoard
                  jobs={jobs.filter((job) => job.status !== 'archived')}
                  selectedJob={selectedJob}
                  onSelectJob={setSelectedJob}
                  onAdvance={handleAdvance}
                />

                <OpsDivider />

                <Grid container spacing={1.25}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <EntityLinkCard
                      label="Checkpoints"
                      value={overviewRuntime.summary.checkpoints_total ? `${overviewRuntime.summary.checkpoints_total} pontos ativos` : OPS_COPY.overview.emptyCheckpoints}
                      subtitle="Itens que pedem conferência operacional agora"
                      href="/admin/operacoes/jobs?group=status"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <EntityLinkCard
                      label="Esperando cliente"
                      value={
                        overviewRuntime.summary.approvals_pending_total + overviewRuntime.summary.approvals_blocked_total
                          ? `${overviewRuntime.summary.approvals_pending_total + overviewRuntime.summary.approvals_blocked_total} pendências`
                          : OPS_COPY.overview.emptyApprovals
                      }
                      subtitle="Aprovações e retornos que seguram a fila"
                      href="/admin/operacoes/jobs"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <EntityLinkCard
                      label="Radar"
                      value={criticalJobs.length ? `${criticalJobs.length} exceções abertas` : OPS_COPY.overview.emptyExceptions}
                      subtitle="O que pode estourar se ninguém agir"
                      href="/admin/operacoes/radar"
                    />
                  </Grid>
                </Grid>
              </Stack>
            </OpsPanel>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <OperationsContextRail
              lead={<JarvisHomeSection />}
              job={selectedJob}
              eyebrow={OPS_COPY.common.contextEyebrow}
              title={OPS_COPY.overview.supportTitle}
              subtitle={OPS_COPY.overview.supportSubtitle}
              primaryLabel={focusedAction?.label}
              onPrimaryAction={() => setDrawerOpen(true)}
              emptyTitle="Selecione um item"
              emptyDescription={OPS_COPY.jobs.emptyFocus}
              links={
                selectedJob ? (
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Cliente"
                        value={selectedJob.client_name || 'Sem cliente'}
                        href={selectedJob.client_id ? `/clients/${selectedJob.client_id}` : undefined}
                        subtitle={OPS_COPY.common.clientSubtitle}
                        accent={selectedJob.client_brand_color || '#E85219'}
                        thumbnail={<ClientThumb name={selectedJob.client_name} logoUrl={selectedJob.client_logo_url} accent={selectedJob.client_brand_color || '#E85219'} size={26} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Responsável"
                        value={selectedJob.owner_name || 'Sem responsável'}
                        href={(() => {
                          const owner = lookups.owners.find((o) => o.id === selectedJob.owner_id);
                          return owner?.freelancer_profile_id
                            ? `/admin/equipe/${owner.freelancer_profile_id}`
                            : '/admin/operacoes/semana?view=distribution';
                        })()}
                        subtitle={formatSkillLabel(selectedJob.required_skill)}
                        thumbnail={<PersonThumb name={selectedJob.owner_name} accent="#5D87FF" size={26} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Studio criativo"
                        value="Abrir produção"
                        href="/edro"
                        subtitle="Entrar na execução criativa"
                        thumbnail={<SourceThumb source="creative_studio" jobType="design_static" accent="#5D87FF" />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Agenda"
                        value={selectedJob.deadline_at ? 'Já está na agenda' : 'Sem prazo'}
                        href="/admin/operacoes/semana?view=calendar"
                        subtitle={selectedJob.deadline_at ? 'A demanda já mexe na agenda da semana' : 'Defina um prazo para ela entrar na agenda'}
                        thumbnail={<SourceThumb source="agenda" jobType="meeting" accent="#13DEB9" />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Origem"
                        value={formatSourceLabel(selectedJob.source)}
                        subtitle={selectedJob.job_type || 'Demanda operacional'}
                        thumbnail={<SourceThumb source={selectedJob.source} jobType={selectedJob.job_type} accent="#E85219" />}
                      />
                    </Grid>
                  </Grid>
                ) : null
              }
              sections={[
                {
                  title: 'Capacidade da semana',
                  content: (
                    <Stack spacing={1.25}>
                      {ownerLoads.length ? ownerLoads.map(({ owner, allocableMinutes, committedMinutes, tentativeMinutes }) => (
                        <Box key={owner.id} sx={(theme) => ({ py: 1.15, borderTop: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.1)}` })}>
                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <PersonThumb name={owner.name} accent={owner.person_type === 'freelancer' ? '#E85219' : '#5D87FF'} />
                                <Box>
                                  <Typography variant="body2" fontWeight={800}>{owner.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {owner.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'} · {owner.specialty || owner.role}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Chip size="small" label={`${ownerActiveJobs(jobs, owner.id).length} demandas`} />
                            </Stack>
                            <CapacityBar allocableMinutes={allocableMinutes} committedMinutes={committedMinutes} tentativeMinutes={tentativeMinutes} />
                          </Stack>
                        </Box>
                      )) : <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyCapacity}</Typography>}
                    </Stack>
                  ),
                },
                {
                  title: 'Clientes em atenção',
                  action: <Chip size="small" label={`${attentionClients.filter((item) => item.critical > 0).length} vermelhos`} color="error" />,
                  content: (
                    <Stack spacing={0.35}>
                      {attentionClients.length ? attentionClients.map((item) => (
                        <Box key={item.clientId} sx={(theme) => ({ py: 1.15, borderTop: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.1)}` })}>
                          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <ClientThumb
                                name={item.clientName}
                                logoUrl={clientsById.get(item.clientId)?.logo_url}
                                accent={clientsById.get(item.clientId)?.brand_color || '#E85219'}
                              />
                              <Box>
                                <Typography
                                  variant="body2"
                                  fontWeight={800}
                                  component={Link}
                                  href={`/clients/${item.clientId}/demandas`}
                                  sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { color: 'primary.main' } }}
                                >
                                  {item.clientName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.open} demandas ativas · {item.total} min previstos
                                </Typography>
                              </Box>
                            </Stack>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                              {item.critical > 0 ? <Chip size="small" color="error" label={`${item.critical} risco`} /> : null}
                              <Chip size="small" variant="outlined" label={`${item.open} ativos`} />
                            </Stack>
                          </Stack>
                        </Box>
                      )) : <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyAttentionClients}</Typography>}
                    </Stack>
                  ),
                },
              ]}
            />
          </Grid>
        </Grid>
      )}

      <JobWorkbenchDrawer
        open={drawerOpen && Boolean(selectedJob)}
        mode="edit"
        job={selectedJob}
        jobTypes={lookups.jobTypes}
        skills={lookups.skills}
        channels={lookups.channels}
        clients={lookups.clients}
        owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setDrawerOpen(false)}
        onCreate={createJob}
        onUpdate={updateJob}
        onStatusChange={changeStatus}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}
