'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAlertTriangle,
  IconCalendarDue,
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconInbox,
  IconLayoutKanban,
  IconLayoutList,
  IconLoader2,
  IconPlayerPlay,
  IconSearch,
  IconTable,
  IconTagOff,
  IconTruck,
  IconUserOff,
  IconUsers,
  IconUrgent,
} from '@tabler/icons-react';
import { IconX } from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import JobDetailClient from './[id]/JobDetailClient';
import { useJarvisPage } from '@/hooks/useJarvisPage';
import {
  ActionStrip,
  ClientThumb,
  EmptyOperationState,
  EntityLinkCard,
  InlineOwnerAssign,
  OpsJobRow,
  OpsPanel,
  PersonThumb,
  PipelineBoard,
  SourceThumb,
  STATUS_VISUALS,
} from '@/components/operations/primitives';
import Avatar from '@mui/material/Avatar';
import {
  criticalAlerts,
  groupJobsByClient,
  groupJobsByOwner,
  groupJobsByRisk,
  ownerAllocableMinutes,
  ownerCommittedMinutes,
  sortByOperationalPriority,
  type GroupedSection,
} from '@/components/operations/derived';
import {
  formatSkillLabel,
  formatSourceLabel,
  getDeliveryStatus,
  getNextAction,
  getRisk,
  groupBy,
  matchesOperationalFocus,
  type OperationalFocusKey,
  cleanJobTitle,
  type OperationsJob,
  type OperationsOwner,
} from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OPS_COPY } from '@/components/operations/copy';
import InlineDateChip from '@/components/operations/InlineDateChip';

const STAGE_ORDER = ['intake', 'planned', 'ready', 'allocated', 'in_progress', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'done', 'blocked'];

function stageColor(status: string) { return (STATUS_VISUALS[status] || STATUS_VISUALS.intake).color; }

const BUCKETS = [
  { key: 'entrou', label: 'Entrou', icon: <IconInbox size={16} />, color: 'info' as const, stages: ['intake', 'planned', 'ready'] },
  { key: 'producao', label: 'Em produção', icon: <IconPlayerPlay size={16} />, color: 'success' as const, stages: ['allocated', 'in_progress', 'in_review'] },
  { key: 'esperando', label: 'Esperando', icon: <IconLoader2 size={16} />, color: 'warning' as const, stages: ['awaiting_approval', 'approved', 'scheduled', 'blocked'] },
  { key: 'entregue', label: 'Entregue', icon: <IconTruck size={16} />, color: 'default' as const, stages: ['published', 'done'] },
] as const;

export default function OperationsJobsClient() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenComposer = searchParams.get('new') === '1';
  const shouldFilterUnassigned = searchParams.get('unassigned') === 'true';
  const ownerIdParam = searchParams.get('owner_id') || '';
  const highlightJobId = searchParams.get('highlight') || '';
  const rawView = searchParams.get('view');
  const validView = rawView === 'board' ? 'board' : rawView === 'table' ? 'table' : 'list';
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob, deleteJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<OperationalFocusKey | null>(null);
  const [deadlineFilter, setDeadlineFilter] = useState<string | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [viewMode, setViewModeState] = useState<'list' | 'board' | 'table'>(validView);

  const rawGroup = searchParams.get('group');
  const validGroup = rawGroup === 'client' || rawGroup === 'owner' || rawGroup === 'risk' ? rawGroup : 'status';
  const [groupMode, setGroupModeState] = useState<'status' | 'client' | 'owner' | 'risk'>(validGroup);
  const setGroupMode = useCallback((v: 'status' | 'client' | 'owner' | 'risk') => {
    setGroupModeState(v);
    const params = new URLSearchParams(searchParams.toString());
    if (v === 'status') params.delete('group'); else params.set('group', v);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);
  const setViewMode = useCallback((v: 'list' | 'board' | 'table') => {
    setViewModeState(v);
    const params = new URLSearchParams(searchParams.toString());
    if (v === 'list') params.delete('view'); else params.set('view', v);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);
  const openJobDetail = useCallback((job: OperationsJob) => {
    setSelectedJob(job);
    setDetailOpen(true);
  }, []);

  useJarvisPage(
    {
      screen: 'operations_jobs',
      operationsView: viewMode,
      operationsGroup: groupMode,
      clientId: selectedJob?.client_id ?? null,
      currentJobId: selectedJob?.id ?? null,
      currentJobTitle: selectedJob?.title ?? null,
      currentJobStatus: selectedJob?.status ?? null,
      currentJobOwner: selectedJob?.owner_name ?? null,
      currentJobType: selectedJob?.job_type ?? null,
      currentJobChannel: selectedJob?.channel ?? null,
    },
    [
      viewMode,
      groupMode,
      selectedJob?.id,
      selectedJob?.client_id,
      selectedJob?.title,
      selectedJob?.status,
      selectedJob?.owner_name,
      selectedJob?.job_type,
      selectedJob?.channel,
    ]
  );

  useEffect(() => { if (shouldOpenComposer) setComposerOpen(true); }, [shouldOpenComposer]);
  useEffect(() => { if (shouldFilterUnassigned) setQuickFilter('unassigned'); }, [shouldFilterUnassigned]);
  useEffect(() => { if (ownerIdParam) setOwnerFilter(ownerIdParam); }, [ownerIdParam]);
  useEffect(() => { setViewModeState(validView); }, [validView]);

  // Auto-open job detail when ?highlight=<jobId> is in the URL (e.g. from Bedel notifications)
  useEffect(() => {
    if (!highlightJobId || !jobs.length) return;
    const target = jobs.find((j) => j.id === highlightJobId);
    if (target) openJobDetail(target);
  }, [highlightJobId, jobs, openJobDetail]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const weekEnd = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    return [...jobs]
      .filter((job) => !statusFilter || job.status === statusFilter)
      .filter((job) => !priorityFilter || job.priority_band === priorityFilter)
      .filter((job) => !clientFilter || job.client_id === clientFilter)
      .filter((job) => !ownerFilter || job.owner_id === ownerFilter || job.assignees?.some((a) => a.user_id === ownerFilter))
      .filter((job) => {
        if (quickFilter) return matchesOperationalFocus(job, quickFilter, currentUserId);
        return true;
      })
      .filter((job) => {
        if (!deadlineFilter) return true;
        const dl = job.deadline_at ? new Date(job.deadline_at) : null;
        if (deadlineFilter === 'overdue') return dl !== null && dl < now && !['published', 'done', 'archived'].includes(job.status);
        if (deadlineFilter === 'today') return dl !== null && dl >= now && dl <= todayEnd;
        if (deadlineFilter === 'week') return dl !== null && dl > now && dl <= weekEnd;
        return true;
      })
      .filter((job) => {
        if (!q) return true;
        return [job.title, job.summary, job.client_name, job.owner_name, job.required_skill]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      })
      .filter((job) => {
        if (!deliveryFilter) return true;
        return getDeliveryStatus(job).label === deliveryFilter;
      })
      .sort(sortByOperationalPriority);
  }, [jobs, statusFilter, priorityFilter, clientFilter, ownerFilter, quickFilter, deadlineFilter, deliveryFilter, query]);

  const deliveryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      const label = getDeliveryStatus(job).label;
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return counts;
  }, [jobs]);

  const grouped = useMemo(() => groupBy(filteredJobs, (job) => job.status), [filteredJobs]);

  useEffect(() => {
    if (!selectedJob) return;
    const fresh = filteredJobs.find((j) => j.id === selectedJob.id) || jobs.find((j) => j.id === selectedJob.id);
    if (fresh) {
      setSelectedJob(fresh);
      return;
    }
    setSelectedJob(null);
  }, [filteredJobs, jobs, selectedJob]);

  const alerts = useMemo(() => criticalAlerts(jobs), [jobs]);
  const overdueJobs = useMemo(
    () =>
      jobs.filter((job) => {
        if (!job.deadline_at || ['published', 'done', 'archived'].includes(job.status)) return false;
        return new Date(job.deadline_at) < new Date();
      }).sort(sortByOperationalPriority),
    [jobs]
  );
  const waitingClientJobs = useMemo(
    () => jobs.filter((job) => job.status === 'awaiting_approval').sort(sortByOperationalPriority),
    [jobs]
  );
  const urgentJobs = useMemo(
    () => jobs.filter((job) => job.is_urgent || job.priority_band === 'p0').sort(sortByOperationalPriority),
    [jobs]
  );
  const inProgressCount = useMemo(
    () => BUCKETS.find((bucket) => bucket.key === 'producao')?.stages.flatMap((stage) => grouped[stage] || []).length || 0,
    [grouped]
  );
  const intakeCount = useMemo(
    () => BUCKETS.find((bucket) => bucket.key === 'entrou')?.stages.flatMap((stage) => grouped[stage] || []).length || 0,
    [grouped]
  );

  const groupedSections = useMemo((): GroupedSection[] | null => {
    if (groupMode === 'status') return null; // use BUCKETS layout
    if (groupMode === 'client') return groupJobsByClient(filteredJobs);
    if (groupMode === 'owner') return groupJobsByOwner(filteredJobs);
    if (groupMode === 'risk') return groupJobsByRisk(filteredJobs);
    return null;
  }, [groupMode, filteredJobs]);

  const teamPulse = useMemo(() => {
    return lookups.owners.map((o) => {
      const cap = ownerAllocableMinutes(o);
      const committed = ownerCommittedMinutes(jobs, o.id);
      const pct = cap > 0 ? Math.round((committed / cap) * 100) : 0;
      return { ...o, cap, committed, pct };
    }).filter((o) => o.committed > 0 || jobs.some((j) => j.owner_id === o.id))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);
  }, [lookups.owners, jobs]);

  const handleAdvance = async (jobId: string, nextStatus: string) => {
    await changeStatus(jobId, nextStatus);
    await refresh();
  };

  const handleAssign = async (jobId: string, ownerId: string) => {
    await updateJob(jobId, { owner_id: ownerId });
    await refresh();
  };

  const handleDeleteJob = async (jobId: string) => {
    const nextSelection =
      filteredJobs.find((job) => job.id !== jobId) ||
      jobs.find((job) => job.id !== jobId) ||
      null;

    await deleteJob(jobId);
    setDetailOpen(false);
    setSelectedJob(nextSelection);
    await refresh();
  };

  const handleDeleteSelectedJob = async () => {
    if (!selectedJob) return;

    setDeleting(true);
    setDeleteError('');

    try {
      await handleDeleteJob(selectedJob.id);
      setDeleteDialogOpen(false);
    } catch (err: any) {
      setDeleteError(err?.message || 'Falha ao excluir demanda.');
    } finally {
      setDeleting(false);
    }
  };

  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;
  const hasActiveFilters = Boolean(statusFilter || priorityFilter || clientFilter || ownerFilter || quickFilter || deadlineFilter || deliveryFilter);
  const activeFilterCount = [statusFilter, priorityFilter, clientFilter, ownerFilter, quickFilter, deadlineFilter, deliveryFilter].filter(Boolean).length;
  const compactBoard = viewMode === 'board';
  const queueOverviewItems = [
    { label: 'Entrou', value: intakeCount, subtitle: 'Ainda precisa organizar', href: '/admin/operacoes/jobs?group=status', icon: <IconInbox size={16} />, color: '#5D87FF' },
    { label: 'Produção', value: inProgressCount, subtitle: 'Já está rodando', href: '/admin/operacoes/jobs?group=status', icon: <IconPlayerPlay size={16} />, color: '#13DEB9' },
    { label: 'Sem dono', value: unassignedCount(filteredJobs), subtitle: 'Precisa de responsável', href: '/admin/operacoes/jobs?unassigned=true', icon: <IconUserOff size={16} />, color: '#FFAE1F' },
    { label: 'Atrasadas', value: overdueJobs.length, subtitle: 'Já passaram do prazo', href: '/admin/operacoes/jobs', icon: <IconCalendarDue size={16} />, color: '#FA896B' },
    { label: 'Esperando cliente', value: waitingClientJobs.length, subtitle: 'Aprovação ou retorno', href: '/admin/operacoes/jobs', icon: <IconLoader2 size={16} />, color: '#FFAE1F' },
    { label: 'Urgentes', value: urgentJobs.length, subtitle: 'P0 ou marcadas como urgente', href: '/admin/operacoes/radar', icon: <IconUrgent size={16} />, color: '#E85219' },
  ];
  const semanticFilters: Array<{ key: OperationalFocusKey; label: string; icon: ReactElement }> = [
    { key: 'missing_deadline', label: 'Sem prazo', icon: <IconCalendarDue size={13} /> },
    { key: 'waiting_briefing', label: 'Aguardando briefing', icon: <IconInbox size={13} /> },
    { key: 'waiting_info', label: 'Aguardando infos', icon: <IconAlertTriangle size={13} /> },
    { key: 'unlabeled', label: 'Sem etiqueta', icon: <IconTagOff size={13} /> },
    { key: 'copy_ready', label: 'Fazer redação', icon: <IconPlayerPlay size={13} /> },
    { key: 'approval', label: 'Para aprovar', icon: <IconLoader2 size={13} /> },
    { key: 'standby', label: 'Stand-by', icon: <IconChevronDown size={13} /> },
  ];
  const semanticCounts = useMemo(
    () =>
      semanticFilters.reduce<Record<string, number>>((acc, filter) => {
        acc[filter.key] = jobs.filter((job) => matchesOperationalFocus(job, filter.key, currentUserId)).length;
        return acc;
      }, {}),
    [jobs, currentUserId]
  );
  const shellTitle = groupMode === 'client'
    ? 'Pauta Geral'
    : groupMode === 'owner'
      ? 'Pauta por pessoa'
      : groupMode === 'risk'
        ? 'Exceções da fila'
        : viewMode === 'table'
          ? 'Banco de Dados'
          : viewMode === 'board'
            ? 'Quadro da fila'
            : 'Fila';
  const shellSubtitle = groupMode === 'client'
    ? 'A carteira operacional da agência agrupada por cliente para leitura rápida da conta.'
    : groupMode === 'owner'
      ? 'A pauta agrupada por responsável para distribuição e acompanhamento.'
      : groupMode === 'risk'
        ? 'A fila agrupada por criticidade para agir nas exceções primeiro.'
        : viewMode === 'table'
          ? 'A leitura crua e auditável da operação inteira.'
          : viewMode === 'board'
            ? 'A visão por colunas da fila operacional.'
            : 'Todas as demandas organizadas para triagem e ação.';

  return (
    <OperationsShell
      section="jobs"
      titleOverride={shellTitle}
      subtitleOverride={shellSubtitle}
      onNewDemand={() => setComposerOpen(true)}
      summary={
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
          {BUCKETS.map((b) => {
            const cnt = b.stages.flatMap((s) => grouped[s] || []).length;
            const bColor = b.color !== 'default' ? theme.palette[b.color].main : alpha(theme.palette.text.primary, 0.5);
            return (
              <Stack key={b.key} direction="row" spacing={0.5} alignItems="center"
                sx={{ px: 1, py: 0.4, borderRadius: 1.5, bgcolor: cnt > 0 ? alpha(bColor, 0.08) : 'transparent' }}>
                <Box sx={{ color: bColor, display: 'flex' }}>{b.icon}</Box>
                <Typography variant="caption" sx={{ fontWeight: 900, color: cnt > 0 ? bColor : 'text.disabled', fontSize: '0.85rem' }}>
                  {cnt}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.68rem' }}>
                  {b.label}
                </Typography>
              </Stack>
            );
          })}
          <Box sx={{ width: 1, height: 16, bgcolor: 'divider', borderRadius: 1 }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
            {filteredJobs.length} total
          </Typography>
        </Stack>
      }
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2.5}>
          {/* Main column */}
          <Grid size={{ xs: 12, lg: 12 }}>
            <Stack spacing={2}>
              {groupMode === 'client' ? (
                <OpsPanel
                  eyebrow="Carteira da agência"
                  title="Pauta Geral"
                  subtitle="A leitura por cliente é o coração da operação. Use esta vista para entender a conta inteira antes de cair na urgência."
                  action={
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" variant="outlined" label={`${groupedSections?.length ?? 0} cliente(s)`} />
                      <Chip size="small" variant="outlined" label={`${filteredJobs.length} demanda(s)`} />
                    </Stack>
                  }
                >
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                        gap: 1.25,
                      }}
                    >
                      {[
                        {
                          label: 'Clientes ativos',
                          value: groupedSections?.length ?? 0,
                          subtitle: 'Contas com demanda na carteira',
                          href: '/admin/operacoes/jobs?view=table&group=client',
                          color: '#5D87FF',
                          icon: <IconUsers size={16} />,
                        },
                        {
                          label: 'Esperando cliente',
                          value: waitingClientJobs.length,
                          subtitle: 'Aprovação ou retorno pendente',
                          href: '/admin/operacoes/jobs',
                          color: '#FFAE1F',
                          icon: <IconLoader2 size={16} />,
                        },
                        {
                          label: 'Prontas para copy',
                          value: semanticCounts.copy_ready ?? 0,
                          subtitle: 'Demandas com handoff criativo',
                          href: '/admin/operacoes/ia',
                          color: '#13DEB9',
                          icon: <IconPlayerPlay size={16} />,
                        },
                        {
                          label: 'Sem dono',
                          value: unassignedCount(filteredJobs),
                          subtitle: 'Itens sem responsável definido',
                          href: '/admin/operacoes/jobs?unassigned=true',
                          color: '#FA896B',
                          icon: <IconUserOff size={16} />,
                        },
                      ].map((item) => (
                        <Box
                          key={item.label}
                          component={Link}
                          href={item.href}
                          sx={(theme) => ({
                            display: 'block',
                            textDecoration: 'none',
                            color: 'inherit',
                            p: 1.5,
                            borderRadius: 2,
                            border: `1px solid ${alpha(item.color, 0.22)}`,
                            bgcolor: theme.palette.mode === 'dark' ? alpha(item.color, 0.08) : alpha(item.color, 0.04),
                            transition: 'all 180ms ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              borderColor: alpha(item.color, 0.34),
                              bgcolor: theme.palette.mode === 'dark' ? alpha(item.color, 0.12) : alpha(item.color, 0.08),
                            },
                          })}
                        >
                          <Stack spacing={0.7}>
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
                              <Typography sx={{ fontWeight: 900, color: item.color, fontSize: '1.4rem', lineHeight: 1 }}>
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
                      <Button variant="contained" component={Link} href="/admin/operacoes/ia">
                        Abrir handoff criativo
                      </Button>
                      <Button variant="outlined" component={Link} href="/admin/operacoes/jobs?unassigned=true">
                        Resolver sem dono
                      </Button>
                      <Button variant="outlined" component={Link} href="/admin/operacoes/semana?view=distribution">
                        Distribuir semana
                      </Button>
                      <Button variant="outlined" component={Link} href="/admin/operacoes/radar">
                        Ver riscos
                      </Button>
                    </Stack>
                  </Stack>
                </OpsPanel>
              ) : null}

              {groupMode === 'client' ? null : compactBoard ? (
                <Paper
                  elevation={0}
                  sx={{
                    px: { xs: 1.5, md: 2 },
                    py: 1.1,
                    borderRadius: 3,
                    boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.24)' : '0 2px 12px rgba(0,0,0,0.06)',
                  }}
                >
                  <Stack spacing={0.9}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ md: 'center' }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.14em', fontSize: '0.64rem' }}>
                          Semáforo da fila
                        </Typography>
                        <Chip size="small" variant="outlined" label="Ao vivo do Trello" />
                        <Chip size="small" variant="outlined" color="warning" label="Calculado pela Edro" />
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button size="small" variant="contained" onClick={() => setComposerOpen(true)}>
                          Nova demanda
                        </Button>
                        <Button size="small" variant="text" component={Link} href="/admin/operacoes/jobs?unassigned=true" sx={{ minWidth: 0, px: 0.5 }}>
                          Sem dono
                        </Button>
                        <Button size="small" variant="text" component={Link} href="/admin/operacoes/radar" sx={{ minWidth: 0, px: 0.5 }}>
                          Riscos
                        </Button>
                      </Stack>
                    </Stack>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {queueOverviewItems.map((item) => (
                        <Box
                          key={item.label}
                          component={Link}
                          href={item.href}
                          sx={(theme) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            textDecoration: 'none',
                            color: 'inherit',
                            px: 1,
                            py: 0.65,
                            borderRadius: 1.5,
                            border: `1px solid ${alpha(item.color, 0.18)}`,
                            bgcolor: theme.palette.mode === 'dark' ? alpha(item.color, 0.08) : alpha(item.color, 0.035),
                            transition: 'all 160ms ease',
                            '&:hover': {
                              borderColor: alpha(item.color, 0.3),
                              bgcolor: theme.palette.mode === 'dark' ? alpha(item.color, 0.11) : alpha(item.color, 0.06),
                            },
                          })}
                        >
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: 1.1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: alpha(item.color, 0.14),
                              color: item.color,
                              flexShrink: 0,
                            }}
                          >
                            {item.icon}
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.62rem' }}>
                            {item.label}
                          </Typography>
                          <Typography sx={{ fontWeight: 900, color: item.color, fontSize: '0.96rem', lineHeight: 1, flexShrink: 0 }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </Paper>
              ) : (
                <OpsPanel
                  eyebrow="Semáforo da fila"
                  title="O que organizar agora"
                  subtitle="A fila junta tudo que entrou do Trello e deixa claro o que precisa de dono, prazo ou cobrança antes de virar gargalo."
                  action={
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" variant="outlined" label="Ao vivo do Trello" />
                      <Chip size="small" variant="outlined" color="warning" label="Calculado pela Edro" />
                    </Stack>
                  }
                >
                  <Stack spacing={2.25}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
                        gap: 1.25,
                      }}
                    >
                      {queueOverviewItems.map((item) => (
                        <Box
                          key={item.label}
                          component={Link}
                          href={item.href}
                          sx={(theme) => ({
                            display: 'block',
                            textDecoration: 'none',
                            color: 'inherit',
                            p: 1.5,
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
                          <Stack spacing={0.7}>
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
                              <Typography sx={{ fontWeight: 900, color: item.color, fontSize: '1.4rem', lineHeight: 1 }}>
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
                      <Button variant="contained" onClick={() => setComposerOpen(true)}>
                        Nova demanda
                      </Button>
                      <Button variant="outlined" component={Link} href="/admin/operacoes/jobs?unassigned=true">
                        Resolver sem dono
                      </Button>
                      <Button variant="outlined" component={Link} href="/admin/operacoes/semana?view=distribution">
                        Distribuir semana
                      </Button>
                      <Button variant="outlined" component={Link} href="/admin/operacoes/radar">
                        Abrir riscos
                      </Button>
                    </Stack>
                  </Stack>
                </OpsPanel>
              )}

              {/* Search + filter bar */}
              <Box sx={{
                borderRadius: 2, overflow: 'hidden',
                border: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06)}`,
                bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : '#fff',
                boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, dark ? 0.1 : 0.04)}`,
              }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: compactBoard ? 0.85 : 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por cliente, demanda, responsável..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><IconSearch size={16} style={{ opacity: 0.4 }} /></InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <IconButton onClick={() => setFiltersOpen(!filtersOpen)} color={hasActiveFilters ? 'primary' : 'default'}>
                    <IconFilter size={18} />
                    {activeFilterCount > 0 && (
                      <Box sx={{
                        position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%',
                        bgcolor: 'primary.main', color: '#fff', fontSize: '0.55rem', fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {activeFilterCount}
                      </Box>
                    )}
                  </IconButton>
                </Stack>

                {/* Delivery status summary strip */}
                {!compactBoard ? (
                <Stack direction="row" spacing={0.5} sx={{ px: 2, pb: 1, flexWrap: 'wrap' }} useFlexGap>
                  {[
                    { label: 'Atrasado', emoji: '🔴' },
                    { label: 'Máxima', emoji: '🔥' },
                    { label: 'Stand-by', emoji: '🟡' },
                    { label: 'No prazo', emoji: '🟢' },
                    { label: 'Entregue', emoji: '✅' },
                  ].map(({ label, emoji }) => {
                    const count = deliveryCounts[label] ?? 0;
                    if (!count) return null;
                    const active = deliveryFilter === label;
                    return (
                      <Box
                        key={label}
                        onClick={() => setDeliveryFilter(active ? null : label)}
                        sx={{
                          cursor: 'pointer',
                          px: 1, py: 0.35,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: active ? 'primary.main' : 'divider',
                          bgcolor: active ? 'primary.main' : 'action.hover',
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          '&:hover': { borderColor: 'primary.main' },
                          transition: 'all 0.15s',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.75rem', lineHeight: 1 }}>{emoji}</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: active ? '#fff' : 'text.primary', fontSize: '0.7rem' }}>
                          {label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: active ? 'rgba(255,255,255,0.8)' : 'text.secondary', fontSize: '0.7rem' }}>
                          {count}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
                ) : null}

                {/* Quick filters */}
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ px: 2, pb: compactBoard ? 0.7 : 1.25 }}>
                  <ToggleButtonGroup value={quickFilter} exclusive onChange={(_e, v) => setQuickFilter(v)} size="small">
                    <ToggleButton value="mine" sx={{ px: 1.25, py: 0.25, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important', '&.Mui-selected': { color: '#4f46e5', borderColor: '#4f46e540' } }}>
                      <IconUsers size={14} style={{ marginRight: 4 }} /> Minha pauta
                    </ToggleButton>
                    <ToggleButton value="urgent" sx={{ px: 1.25, py: 0.25, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                      <IconUrgent size={14} style={{ marginRight: 4 }} /> Urgentes
                    </ToggleButton>
                    <ToggleButton value="unassigned" sx={{ px: 1.25, py: 0.25, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                      <IconUserOff size={14} style={{ marginRight: 4 }} /> Sem dono
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {!compactBoard ? (
                    <ToggleButtonGroup value={deadlineFilter} exclusive onChange={(_e, v) => setDeadlineFilter(v)} size="small">
                      <ToggleButton value="overdue" sx={{ px: 1.25, py: 0.25, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important', '&.Mui-selected': { color: '#dc2626', borderColor: '#dc262640' } }}>
                        <IconCalendarDue size={14} style={{ marginRight: 4 }} /> Atrasados
                      </ToggleButton>
                      <ToggleButton value="today" sx={{ px: 1.25, py: 0.25, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important', '&.Mui-selected': { color: '#FFAE1F', borderColor: '#FFAE1F40' } }}>
                        <IconCalendarDue size={14} style={{ marginRight: 4 }} /> Hoje
                      </ToggleButton>
                      <ToggleButton value="week" sx={{ px: 1.25, py: 0.25, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                        <IconCalendarDue size={14} style={{ marginRight: 4 }} /> Essa semana
                      </ToggleButton>
                    </ToggleButtonGroup>
                  ) : null}
                  {compactBoard && deadlineFilter ? (
                    <Chip
                      size="small"
                      label={deadlineFilter === 'overdue' ? 'Atrasados' : deadlineFilter === 'today' ? 'Hoje' : 'Essa semana'}
                      onDelete={() => setDeadlineFilter(null)}
                      sx={{ height: 28 }}
                    />
                  ) : null}
                  {hasActiveFilters && (
                    <Button size="small" onClick={() => { setStatusFilter(''); setPriorityFilter(''); setClientFilter(''); setOwnerFilter(''); setQuickFilter(null); setDeadlineFilter(null); setDeliveryFilter(null); }}
                      sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'none' }}>
                      Limpar filtros
                    </Button>
                  )}
                </Stack>

                <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ px: 2, pb: compactBoard ? 0.9 : 1.4 }}>
                  {semanticFilters.map((filter) => {
                    const count = semanticCounts[filter.key] ?? 0;
                    if (!count) return null;
                    const active = quickFilter === filter.key;
                    return (
                      <Chip
                        key={filter.key}
                        icon={filter.icon}
                        label={`${filter.label} ${count}`}
                        clickable
                        color={active ? 'primary' : 'default'}
                        onClick={() => setQuickFilter(active ? null : filter.key)}
                        variant={active ? 'filled' : 'outlined'}
                        sx={{ height: 28, '& .MuiChip-label': { fontWeight: 700 } }}
                      />
                    );
                  })}
                </Stack>

                {/* Advanced filters */}
                <Collapse in={filtersOpen}>
                  <Box sx={{ px: 2, pb: 1.5, borderTop: `1px solid ${theme.palette.divider}`, pt: 1.5 }}>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField select fullWidth size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                          <MenuItem value="">Todos</MenuItem>
                          {STAGE_ORDER.map((s) => <MenuItem key={s} value={s}>{(STATUS_VISUALS[s] || STATUS_VISUALS.intake).label}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField select fullWidth size="small" label="Prioridade" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                          <MenuItem value="">Todas</MenuItem>
                          {['p0','p1','p2','p3','p4'].map((p) => <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField select fullWidth size="small" label="Cliente" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                          <MenuItem value="">Todos</MenuItem>
                          {lookups.clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField select fullWidth size="small" label="Responsável" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                          <MenuItem value="">Todos</MenuItem>
                          {lookups.owners.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                        </TextField>
                      </Grid>
                    </Grid>
                  </Box>
                </Collapse>
              </Box>

              {/* Zone 1: Action strip — alerts + team pulse */}
              <ActionStrip
                alerts={alerts}
                owners={teamPulse}
                jobs={jobs}
                compact={compactBoard}
                onSelectJob={openJobDetail}
                onFilterOwner={(id) => setOwnerFilter(ownerFilter === id ? '' : id)}
                allocableMinutesFn={ownerAllocableMinutes}
                committedMinutesFn={ownerCommittedMinutes}
              />

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                alignItems={{ md: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>
                    Visualização:
                  </Typography>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_e, v) => { if (v) setViewMode(v); }}
                    size="small"
                  >
                    <ToggleButton value="list" sx={{ px: 1.25, py: 0.25, fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                      <IconLayoutList size={13} style={{ marginRight: 4 }} /> Lista
                    </ToggleButton>
                    <ToggleButton value="table" sx={{ px: 1.25, py: 0.25, fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                      <IconTable size={13} style={{ marginRight: 4 }} /> Tabela
                    </ToggleButton>
                    <ToggleButton value="board" sx={{ px: 1.25, py: 0.25, fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                      <IconLayoutKanban size={13} style={{ marginRight: 4 }} /> Quadro
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                {viewMode === 'list' ? (
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>
                      Agrupar:
                    </Typography>
                    <ToggleButtonGroup
                      value={groupMode}
                      exclusive
                      onChange={(_e, v) => { if (v) setGroupMode(v); }}
                      size="small"
                    >
                      <ToggleButton value="status" sx={{ px: 1.25, py: 0.25, fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                        <IconInbox size={13} style={{ marginRight: 4 }} /> Status
                      </ToggleButton>
                      <ToggleButton value="client" sx={{ px: 1.25, py: 0.25, fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                        <IconUsers size={13} style={{ marginRight: 4 }} /> Cliente
                      </ToggleButton>
                      <ToggleButton value="owner" sx={{ px: 1.25, py: 0.25, fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                        <IconUserOff size={13} style={{ marginRight: 4 }} /> Responsável
                      </ToggleButton>
                      <ToggleButton value="risk" sx={{ px: 1.25, py: 0.25, fontSize: '0.7rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                        <IconAlertTriangle size={13} style={{ marginRight: 4 }} /> Risco
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                ) : viewMode === 'table' ? (
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                      Banco mestre com {filteredJobs.length} demanda(s)
                    </Typography>
                    <Button size="small" variant="text" onClick={() => setViewMode('list')} sx={{ minWidth: 0, px: 0.5 }}>
                      Voltar para lista
                    </Button>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                      {filteredJobs.length} demandas no quadro
                    </Typography>
                    <Button size="small" variant="text" onClick={() => setViewMode('list')} sx={{ minWidth: 0, px: 0.5 }}>
                      Voltar para lista
                    </Button>
                  </Stack>
                )}
              </Stack>

              {/* Job list / board */}
              {filteredJobs.length === 0 ? (
                <EmptyOperationState title="Nenhuma demanda encontrada" description="Mude os filtros ou crie uma nova demanda." actionLabel={OPS_COPY.shell.newDemand} onAction={() => setComposerOpen(true)} />
              ) : viewMode === 'board' ? (
                <Stack spacing={1.5}>
                  <PipelineBoard
                    jobs={filteredJobs}
                    selectedJob={selectedJob}
                    onSelectJob={openJobDetail}
                    onAdvance={handleAdvance}
                    onAssign={handleAssign}
                    owners={lookups.owners}
                    onShowAll={() => {
                      setViewMode('list');
                      setGroupMode('status');
                    }}
                  />
                </Stack>
              ) : viewMode === 'table' ? (
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2.5,
                    overflow: 'hidden',
                    border: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06)}`,
                    bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : '#fff',
                    boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, dark ? 0.1 : 0.04)}`,
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1.8fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) minmax(92px, 0.6fr) minmax(120px, 0.8fr) minmax(100px, 0.7fr) minmax(110px, 0.6fr)',
                      gap: 1,
                      px: 2,
                      py: 1.1,
                      borderBottom: `1px solid ${alpha(theme.palette.text.primary, dark ? 0.12 : 0.08)}`,
                      bgcolor: dark ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.common.black, 0.02),
                      alignItems: 'center',
                    }}
                  >
                    {['Demanda', 'Cliente', 'Etapa', 'Prazo', 'Responsável', 'Entrega', 'Origem'].map((label) => (
                      <Typography key={label} variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {label}
                      </Typography>
                    ))}
                  </Box>

                  <Stack divider={<Divider flexItem />}>
                    {filteredJobs.map((job) => {
                      const delivery = getDeliveryStatus(job);
                      const risk = getRisk(job);
                      const riskColor = risk.level === 'critical' ? '#FA896B' : risk.level === 'high' ? '#FFAE1F' : '#5D87FF';
                      const riskTextColor = risk.level === 'critical' ? '#d9485f' : risk.level === 'high' ? '#d97706' : '#2563eb';
                      return (
                        <Box
                          key={job.id}
                          onClick={() => openJobDetail(job)}
                          sx={(theme) => ({
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr) minmax(92px, 0.6fr) minmax(120px, 0.8fr) minmax(100px, 0.7fr) minmax(110px, 0.6fr)',
                            gap: 1,
                            px: 2,
                            py: 1.15,
                            alignItems: 'center',
                            cursor: 'pointer',
                            bgcolor: selectedJob?.id === job.id
                              ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06)
                              : 'transparent',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.035),
                            },
                          })}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                              <Box sx={{ pt: 0.2 }}>
                                <SourceThumb source={job.source} jobType={job.job_type} accent="#E85219" />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.35 }}>
                                  {job.priority_band ? (
                                    <Chip
                                      size="small"
                                      label={job.priority_band.toUpperCase()}
                                      sx={{
                                        height: 18,
                                        fontSize: '0.58rem',
                                        fontWeight: 900,
                                        bgcolor: alpha(riskColor, 0.14),
                                        color: riskTextColor,
                                        '& .MuiChip-label': { px: 0.55 },
                                      }}
                                    />
                                  ) : null}
                                  {!job.owner_name ? (
                                    <Chip
                                      size="small"
                                      label="Sem dono"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.58rem',
                                        fontWeight: 900,
                                        bgcolor: alpha('#FFAE1F', 0.12),
                                        color: '#d97706',
                                        '& .MuiChip-label': { px: 0.55 },
                                      }}
                                    />
                                  ) : null}
                                </Stack>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 800,
                                    lineHeight: 1.35,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {cleanJobTitle(job.title, job.client_name)}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {job.summary || getNextAction(job).label}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>

                          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                            <ClientThumb
                              name={job.client_name}
                              logoUrl={job.client_logo_url}
                              accent={job.client_brand_color || '#5D87FF'}
                              size={24}
                            />
                            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {job.client_name || 'Sem cliente'}
                            </Typography>
                          </Stack>

                          <Chip
                            size="small"
                            label={(STATUS_VISUALS[job.status] || STATUS_VISUALS.intake).label}
                            sx={{
                              justifySelf: 'start',
                              height: 22,
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              bgcolor: alpha(stageColor(job.status), 0.12),
                              color: stageColor(job.status),
                              border: 'none',
                            }}
                          />

                          <Box onClick={(e) => e.stopPropagation()}>
                            <InlineDateChip
                              value={job.deadline_at ?? null}
                              color={delivery.color}
                              onChange={async (date) => {
                                await updateJob(job.id, { deadline_at: date });
                                await refresh();
                              }}
                            />
                          </Box>

                          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                            {job.owner_name ? (
                              <>
                                <PersonThumb name={job.owner_name} src={job.owner_avatar_url} accent="#5D87FF" size={22} />
                                <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {job.owner_name.split(' ')[0]}
                                </Typography>
                              </>
                            ) : (
                              <Box onClick={(e) => e.stopPropagation()}>
                                <InlineOwnerAssign owners={lookups.owners} onAssign={(ownerId) => handleAssign(job.id, ownerId)} />
                              </Box>
                            )}
                          </Stack>

                          <Chip
                            size="small"
                            label={delivery.label}
                            sx={{
                              justifySelf: 'start',
                              height: 22,
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              bgcolor: alpha(delivery.color, 0.12),
                              color: delivery.color,
                            }}
                          />

                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            {formatSourceLabel(job.source)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              ) : groupMode === 'status' ? (
                <Stack spacing={1.5}>
                  {BUCKETS.map((bucket) => {
                    const bucketJobs = bucket.stages.flatMap((s) => grouped[s] || []);
                    if (!bucketJobs.length) return null;
                    return (
                      <BucketGroup
                        key={bucket.key}
                        bucket={bucket}
                        jobs={bucketJobs}
                        selectedJob={selectedJob}
                        onSelectJob={openJobDetail}
                        onAdvance={handleAdvance}
                        onAssign={handleAssign}
                        owners={lookups.owners}
                      />
                    );
                  })}
                </Stack>
              ) : groupedSections ? (
                <Stack spacing={1.5}>
                  {groupedSections.map((section) => (
                    <GenericGroup
                      key={section.key}
                      section={section}
                      selectedJob={selectedJob}
                      onSelectJob={openJobDetail}
                      onAdvance={handleAdvance}
                      onAssign={handleAssign}
                      owners={lookups.owners}
                    />
                  ))}
                </Stack>
              ) : null}
            </Stack>
          </Grid>

        </Grid>
      )}

      <JobWorkbenchDrawer
        open={composerOpen && !selectedJob}
        mode="create"
        job={null}
        jobTypes={lookups.jobTypes} skills={lookups.skills} channels={lookups.channels} clients={lookups.clients} owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setComposerOpen(false)}
        onCreate={async (payload) => {
          const c = await createJob(payload);
          setComposerOpen(false);
          openJobDetail(c);
          return c;
        }}
        onUpdate={updateJob} onStatusChange={changeStatus}
      />

      {/* Job detail — Trello-style modal */}
      <Dialog
        open={detailOpen && Boolean(selectedJob)}
        onClose={() => { setDetailOpen(false); setSelectedJob(null); }}
        fullWidth
        maxWidth="lg"
        scroll="paper"
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '92vh' } }}
      >
        <DialogTitle sx={{ p: 0, position: 'relative', minHeight: 0 }}>
          <IconButton
            onClick={() => { setDetailOpen(false); setSelectedJob(null); }}
            size="small"
            sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10, opacity: 0.6, '&:hover': { opacity: 1 } }}
          >
            <IconX size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {detailOpen && selectedJob && (
            <JobDetailClient
              id={selectedJob.id}
              onClose={() => { setDetailOpen(false); setSelectedJob(null); }}
              onStatusChange={async (status) => {
                const updated = await changeStatus(selectedJob.id, status);
                await refresh();
                setSelectedJob(updated as OperationsJob);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Tem certeza que deseja excluir esta demanda?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedJob
                ? `A demanda "${selectedJob.title}" será removida da Central de Operações.`
                : 'A demanda selecionada será removida da Central de Operações.'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Essa ação é permanente e também remove alocação, agenda, riscos e histórico vinculados à demanda.
            </Typography>
            <TextField
              fullWidth
              size="small"
              label='Digite EXCLUIR para confirmar'
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              autoFocus
            />
            {deleteError ? <Alert severity="error">{deleteError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteSelectedJob}
            disabled={!selectedJob || deleting || deleteConfirmation.trim().toUpperCase() !== 'EXCLUIR'}
          >
            {deleting ? 'Excluindo...' : 'Excluir demanda'}
          </Button>
        </DialogActions>
      </Dialog>
    </OperationsShell>
  );
}

function unassignedCount(jobs: OperationsJob[]) {
  return jobs.filter((job) => !job.owner_id && !job.assignees?.length).length;
}

function formatJobDate(value?: string | null) {
  if (!value) return 'Sem prazo';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem prazo';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/* ─── Bucket Group ─── */

function BucketGroup({
  bucket,
  jobs,
  selectedJob,
  onSelectJob,
  onAdvance,
  onAssign,
  owners,
}: {
  bucket: { key: string; label: string; icon: React.ReactNode; color: 'info' | 'success' | 'warning' | 'default' };
  jobs: OperationsJob[];
  selectedJob: OperationsJob | null;
  onSelectJob: (job: OperationsJob) => void;
  onAdvance?: (jobId: string, nextStatus: string) => void;
  onAssign?: (jobId: string, ownerId: string) => void;
  owners?: OperationsOwner[];
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [expanded, setExpanded] = useState(true);
  const color = bucket.color !== 'default' ? theme.palette[bucket.color].main : alpha(theme.palette.text.primary, 0.5);

  return (
    <Box sx={{
      borderRadius: 2,
      overflow: 'hidden',
      border: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06)}`,
      bgcolor: dark ? alpha(theme.palette.common.white, 0.01) : alpha(theme.palette.background.paper, 0.5),
    }}>
      {/* Bucket header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          px: 2, py: 1.1,
          display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
          bgcolor: alpha(color, dark ? 0.06 : 0.04),
          borderBottom: expanded ? `1px solid ${alpha(color, 0.1)}` : undefined,
          transition: 'all 150ms ease',
          '&:hover': { bgcolor: alpha(color, dark ? 0.1 : 0.07) },
        }}
      >
        <Box sx={{
          width: 28, height: 28, borderRadius: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(color, 0.15),
          color,
        }}>
          {bucket.icon}
        </Box>
        <Typography variant="body2" fontWeight={800}>{bucket.label}</Typography>
        <Box sx={{
          px: 0.75, py: 0.15, borderRadius: 1.5,
          bgcolor: alpha(color, 0.12), color,
          fontSize: '0.82rem', fontWeight: 900, minWidth: 22, textAlign: 'center',
        }}>
          {jobs.length}
        </Box>
        <Box sx={{ flex: 1 }} />
        {expanded ? <IconChevronUp size={16} style={{ opacity: 0.4 }} /> : <IconChevronDown size={16} style={{ opacity: 0.4 }} />}
      </Box>

      {/* Job rows */}
      <Collapse in={expanded}>
        <Box sx={{ py: 0.5 }}>
          {jobs.sort(sortByOperationalPriority).map((job) => (
            <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => onSelectJob(job)} showStage onAdvance={onAdvance} onAssign={onAssign} owners={owners} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

/* ─── Generic Group (for client/owner/risk grouping) ─── */

function GenericGroup({
  section,
  selectedJob,
  onSelectJob,
  onAdvance,
  onAssign,
  owners,
}: {
  section: GroupedSection;
  selectedJob: OperationsJob | null;
  onSelectJob: (job: OperationsJob) => void;
  onAdvance?: (jobId: string, nextStatus: string) => void;
  onAssign?: (jobId: string, ownerId: string) => void;
  owners?: OperationsOwner[];
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [expanded, setExpanded] = useState(true);
  const accent = section.color || theme.palette.primary.main;

  // Client logo from first job with a logo
  const logoUrl = section.jobs.find((j) => j.client_logo_url)?.client_logo_url || null;

  // Mini status summary: group by bucket
  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of section.jobs) {
      const bucket = BUCKETS.find((b) => (b.stages as readonly string[]).includes(job.status));
      if (bucket) counts[bucket.key] = (counts[bucket.key] ?? 0) + 1;
    }
    return counts;
  }, [section.jobs]);

  // Unassigned count in section
  const unassignedInSection = section.jobs.filter((j) => !j.owner_id && !j.owner_name).length;

  return (
    <Box sx={{
      borderRadius: 2,
      overflow: 'hidden',
      border: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06)}`,
      bgcolor: dark ? alpha(theme.palette.common.white, 0.01) : alpha(theme.palette.background.paper, 0.5),
    }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          px: 2, py: 1.1,
          display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
          bgcolor: alpha(accent, dark ? 0.06 : 0.04),
          borderBottom: expanded ? `1px solid ${alpha(accent, 0.1)}` : undefined,
          transition: 'all 150ms ease',
          '&:hover': { bgcolor: alpha(accent, dark ? 0.1 : 0.07) },
        }}
      >
        {/* Left accent bar */}
        <Box sx={{ width: 4, height: 28, borderRadius: 1, bgcolor: accent, flexShrink: 0 }} />

        {/* Client logo / avatar */}
        <Avatar
          src={logoUrl || undefined}
          variant="rounded"
          sx={{
            width: 26, height: 26,
            fontSize: '0.6rem', fontWeight: 900,
            bgcolor: alpha(accent, 0.18),
            color: accent,
            border: `1px solid ${alpha(accent, 0.25)}`,
            flexShrink: 0,
          }}
        >
          {section.label.charAt(0).toUpperCase()}
        </Avatar>

        <Typography variant="body2" fontWeight={900} noWrap sx={{ flex: 1, minWidth: 0 }}>
          {section.label}
        </Typography>

        {/* Mini bucket summary */}
        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ flexShrink: 0, mr: 0.5 }}>
          {BUCKETS.filter((b) => bucketCounts[b.key]).map((b) => {
            const bColor = b.color !== 'default' ? theme.palette[b.color].main : alpha(theme.palette.text.primary, 0.4);
            return (
              <Stack key={b.key} direction="row" spacing={0.25} alignItems="center">
                <Box sx={{ color: bColor, display: 'flex' }}>{b.icon}</Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: bColor, fontSize: '0.68rem' }}>
                  {bucketCounts[b.key]}
                </Typography>
              </Stack>
            );
          })}
          {unassignedInSection > 0 && (
            <Chip
              size="small"
              label={`${unassignedInSection} sem dono`}
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: alpha('#FFAE1F', 0.12), color: '#d97706', border: 'none' }}
            />
          )}
        </Stack>

        <Box sx={{
          px: 0.75, py: 0.15, borderRadius: 1.5,
          bgcolor: alpha(accent, 0.12), color: accent,
          fontSize: '0.82rem', fontWeight: 900, minWidth: 22, textAlign: 'center',
          flexShrink: 0,
        }}>
          {section.count}
        </Box>
        {expanded ? <IconChevronUp size={16} style={{ opacity: 0.4 }} /> : <IconChevronDown size={16} style={{ opacity: 0.4 }} />}
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ py: 0.5 }}>
          {section.jobs.sort(sortByOperationalPriority).map((job) => (
            <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => onSelectJob(job)} showStage onAdvance={onAdvance} onAssign={onAssign} owners={owners} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
