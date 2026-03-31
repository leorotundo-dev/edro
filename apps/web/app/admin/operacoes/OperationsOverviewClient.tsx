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
  IconBell,
  IconUsers,
  IconPlus,
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

const FLOW_COLUMNS = [
  { key: 'entrada', label: 'Entrada', color: '#5D87FF', stages: ['intake', 'planned', 'ready'] },
  { key: 'producao', label: 'Produção', color: '#E85219', stages: ['allocated', 'in_progress', 'in_review'] },
  { key: 'esperando', label: 'Esperando', color: '#FFAE1F', stages: ['awaiting_approval', 'approved', 'scheduled', 'blocked'] },
  { key: 'entregue', label: 'Entregue', color: '#13DEB9', stages: ['published', 'done'] },
] as const;

export default function OperationsOverviewClient() {
  const { jobs, lookups, loading, error, refresh, syncHealth, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [syncing, setSyncing] = useState(false);
  const [signalStats, setSignalStats] = useState({ total: 0, critical: 0, attention: 0 });
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('edit');
  const [createComposerPath, setCreateComposerPath] = useState<'briefing' | 'job' | 'adjustment' | 'client_request'>('client_request');

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

  const handleAssign = useCallback(async (jobId: string, ownerId: string) => {
    await updateJob(jobId, { owner_id: ownerId, assignee_ids: [ownerId] });
    await handleRefreshOverview();
  }, [handleRefreshOverview, updateJob]);

  const openCommands = useCallback((job: OperationsJob) => {
    setSelectedJob(job);
    setDrawerMode('edit');
    setDrawerOpen(true);
  }, []);

  const openCreate = useCallback((path: 'briefing' | 'job' | 'adjustment' | 'client_request' = 'client_request') => {
    setSelectedJob(null);
    setCreateComposerPath(path);
    setDrawerMode('create');
    setDrawerOpen(true);
  }, []);

  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;
  const flowColumns = useMemo(() => {
    return FLOW_COLUMNS.map((column) => {
      const items = jobs
        .filter((job) => job.status !== 'archived' && column.stages.some((stage) => stage === job.status))
        .sort(sortByOperationalPriority);
      return { ...column, items };
    });
  }, [jobs]);

  return (
    <OperationsShell
      section="overview"
      onNewDemand={() => openCreate('client_request')}
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

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3.5}>
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
                          <Box sx={{ width: 28, height: 28, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(item.color, 0.14), color: item.color }}>
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
                  <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => openCreate('client_request')}>Nova demanda</Button>
                  <Button variant="outlined" onClick={() => openCreate('briefing')}>Novo briefing</Button>
                  <Button variant="outlined" onClick={() => openCreate('adjustment')}>Novo ajuste</Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/jobs?unassigned=true">Organizar fila</Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/semana?view=distribution">Replanejar semana</Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/radar">Abrir riscos</Button>
                </Stack>
              </Stack>
            </OpsPanel>
          </Grid>

          <Grid size={{ xs: 12, lg: 3 }}>
            <Stack spacing={2.5}>
              {/* Card: Sem responsável */}
              <OpsPanel
                eyebrow="O QUE ENTROU"
                title="Demandas para organizar"
                subtitle="Itens que ainda precisam de responsável, prazo ou decisão."
              >
                {[
                  {
                    key: 'unassigned',
                    icon: <IconInbox size={16} />,
                    color: '#E85219',
                    label: 'Sem responsável',
                    count: unassignedJobs.length,
                    countColor: 'warning' as const,
                  },
                  {
                    key: 'today',
                    icon: <IconCalendarClock size={16} />,
                    color: '#FFAE1F',
                    label: 'Vence hoje',
                    count: todayJobs.length,
                    countColor: 'default' as const,
                  },
                  {
                    key: 'approvals',
                    icon: <IconCircleCheckFilled size={16} />,
                    color: '#13DEB9',
                    label: 'Aprovações do cliente',
                    count: overviewRuntime.summary.approvals_pending_total + overviewRuntime.summary.approvals_blocked_total,
                    countColor: overviewRuntime.summary.approvals_blocked_total ? 'error' as const : 'default' as const,
                  },
                ].map((section) => (
                  <Box key={section.label}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{
                          width: 28, height: 28, borderRadius: 1.5,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          bgcolor: alpha(section.color, 0.12), color: section.color,
                        }}>
                          {section.icon}
                        </Box>
                        <Typography variant="body2" fontWeight={700}>{section.label}</Typography>
                      </Stack>
                      <Chip size="small" color={section.countColor} label={`${section.count}`} />
                    </Stack>
                    <Stack spacing={0}>
                      {section.key === 'unassigned' && unassignedJobs.slice(0, 4).map((job) => (
                        <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} onAssign={handleAssign} owners={lookups.owners} />
                      ))}
                      {section.key === 'today' && todayJobs.slice(0, 4).map((job) => (
                        <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} onAdvance={handleAdvance} onAssign={handleAssign} owners={lookups.owners} />
                      ))}
                      {section.key === 'approvals' && overviewRuntime.approvals.slice(0, 4).map((job) => (
                        <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} showStage onAdvance={handleAdvance} onAssign={handleAssign} owners={lookups.owners} />
                      ))}
                      {(section.key === 'unassigned' && !unassignedJobs.length) && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{OPS_COPY.overview.emptyUnassigned}</Typography>}
                      {(section.key === 'today' && !todayJobs.length) && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{OPS_COPY.overview.emptyToday}</Typography>}
                      {(section.key === 'approvals' && !overviewRuntime.approvals.length) && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{OPS_COPY.overview.emptyApprovals}</Typography>}
                    </Stack>
                  </Box>
                ))}
              </OpsPanel>
            </Stack>
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

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                    gap: 1.5,
                  }}
                >
                  {flowColumns.map((column) => (
                    <Box
                      key={column.key}
                      sx={(theme) => ({
                        minWidth: 0,
                        borderRadius: 2.5,
                        border: `1px solid ${alpha(column.color, 0.16)}`,
                        bgcolor: theme.palette.mode === 'dark' ? alpha(column.color, 0.06) : alpha(column.color, 0.035),
                        boxShadow: `0 2px 14px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.2 : 0.035)}`,
                        overflow: 'hidden',
                      })}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          px: 1.6,
                          py: 1.15,
                          bgcolor: alpha(column.color, 0.08),
                          borderBottom: `1px solid ${alpha(column.color, 0.14)}`,
                        }}
                      >
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: column.color, flexShrink: 0 }} />
                          <Typography variant="subtitle2" fontWeight={800} sx={{ color: column.color }}>
                            {column.label}
                          </Typography>
                        </Stack>
                        <Chip
                          size="small"
                          label={column.items.length}
                          sx={{
                            height: 22,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            bgcolor: alpha(column.color, 0.14),
                            color: column.color,
                          }}
                        />
                      </Stack>

                      <Stack spacing={1.2} sx={{ p: 1.3 }}>
                        {column.items.length ? (
                          <>
                            {column.items.slice(0, 3).map((job) => (
                              <Box
                                key={job.id}
                                onClick={() => setSelectedJob(job)}
                                sx={(theme) => ({
                                  p: 1.35,
                                  borderRadius: 2,
                                  border: selectedJob?.id === job.id
                                    ? `1.5px solid ${alpha(theme.palette.primary.main, 0.4)}`
                                    : `1px solid ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.08 : 0.08)}`,
                                  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.92) : '#fff',
                                  cursor: 'pointer',
                                  transition: 'all 140ms ease',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 10px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.26 : 0.08)}`,
                                  },
                                })}
                              >
                                <Stack spacing={1}>
                                  <Stack direction="row" spacing={0.9} alignItems="flex-start">
                                    <ClientThumb
                                      name={job.client_name}
                                      logoUrl={job.client_logo_url}
                                      accent={job.client_brand_color || column.color}
                                      size={28}
                                    />
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                      <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.35 }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary' }}>
                                          {job.client_name || 'Sem cliente'}
                                        </Typography>
                                        {!job.owner_name ? (
                                          <Chip
                                            size="small"
                                            label="Sem dono"
                                            sx={{
                                              height: 20,
                                              fontSize: '0.62rem',
                                              fontWeight: 800,
                                              bgcolor: alpha('#FFAE1F', 0.12),
                                              color: '#d97706',
                                              border: `1px solid ${alpha('#FFAE1F', 0.3)}`,
                                              '& .MuiChip-label': { px: 0.7 },
                                            }}
                                          />
                                        ) : null}
                                      </Stack>
                                      <Typography
                                        variant="body2"
                                        fontWeight={700}
                                        sx={{
                                          fontSize: '0.97rem',
                                          lineHeight: 1.35,
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        {job.title}
                                      </Typography>
                                    </Box>
                                  </Stack>

                                  <Stack direction="row" spacing={0.7} alignItems="center" flexWrap="wrap" useFlexGap>
                                    {job.owner_name ? (
                                      <Chip
                                        size="small"
                                        avatar={<PersonThumb name={job.owner_name} accent="#5D87FF" size={18} />}
                                        label={job.owner_name}
                                        sx={{
                                          height: 24,
                                          maxWidth: 148,
                                          '& .MuiChip-label': {
                                            px: 0.7,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          },
                                        }}
                                      />
                                    ) : null}
                                    <Chip
                                      size="small"
                                      label={getNextAction(job).label}
                                      sx={{
                                        height: 24,
                                        fontSize: '0.64rem',
                                        fontWeight: 800,
                                        bgcolor: alpha(column.color, 0.1),
                                        color: column.color,
                                        border: `1px solid ${alpha(column.color, 0.2)}`,
                                        '& .MuiChip-label': { px: 0.75 },
                                      }}
                                    />
                                  </Stack>
                                </Stack>
                              </Box>
                            ))}

                            {column.items.length > 3 ? (
                              <Button
                                size="small"
                                component={Link}
                                href="/admin/operacoes/jobs?view=board"
                                sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700, color: column.color }}
                              >
                                +{column.items.length - 3} mais no quadro
                              </Button>
                            ) : null}
                          </>
                        ) : (
                          <Box
                            sx={{
                              border: `2px dashed ${alpha(column.color, 0.24)}`,
                              borderRadius: 2,
                              p: 2.5,
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              Nada aqui agora.
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Box>

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
              onPrimaryAction={() => {
                if (!selectedJob) return;
                openCommands(selectedJob);
              }}
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
        open={drawerOpen}
        mode={drawerMode}
        job={selectedJob}
        initialComposerPath={createComposerPath}
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
