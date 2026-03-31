'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  IconLoader2,
  IconPlayerPlay,
  IconSearch,
  IconTruck,
  IconUserOff,
  IconUsers,
  IconUrgent,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import {
  ActionStrip,
  ClientThumb,
  EmptyOperationState,
  EntityLinkCard,
  JobFocusRail,
  OpsJobRow,
  OpsPanel,
  PersonThumb,
  PipelineBoard,
  SourceThumb,
} from '@/components/operations/primitives';
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
import { formatSkillLabel, formatSourceLabel, getDeliveryStatus, getNextAction, getRisk, groupBy, STAGE_LABELS, type OperationsJob, type OperationsOwner } from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OPS_COPY } from '@/components/operations/copy';

const STAGE_ORDER = ['intake', 'planned', 'ready', 'allocated', 'in_progress', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'done', 'blocked'];

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
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [deadlineFilter, setDeadlineFilter] = useState<string | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const rawGroup = searchParams.get('group');
  const validGroup = rawGroup === 'client' || rawGroup === 'owner' || rawGroup === 'risk' ? rawGroup : 'status';
  const [groupMode, setGroupModeState] = useState<'status' | 'client' | 'owner' | 'risk'>(validGroup);
  const setGroupMode = useCallback((v: 'status' | 'client' | 'owner' | 'risk') => {
    setGroupModeState(v);
    const params = new URLSearchParams(searchParams.toString());
    if (v === 'status') params.delete('group'); else params.set('group', v);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => { if (shouldOpenComposer) setComposerOpen(true); }, [shouldOpenComposer]);
  useEffect(() => { if (shouldFilterUnassigned) setQuickFilter('unassigned'); }, [shouldFilterUnassigned]);
  useEffect(() => { if (ownerIdParam) setOwnerFilter(ownerIdParam); }, [ownerIdParam]);

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
        if (quickFilter === 'urgent') return Boolean(job.is_urgent);
        if (quickFilter === 'unassigned') return !job.owner_id && !job.assignees?.length;
        if (quickFilter === 'mine') return job.owner_id === currentUserId || job.assignees?.some((a) => a.user_id === currentUserId);
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

  return (
    <OperationsShell
      section="jobs"
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
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={2}>
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
                    {[
                      { label: 'Entrou', value: intakeCount, subtitle: 'Ainda precisa organizar', href: '/admin/operacoes/jobs?group=status', icon: <IconInbox size={16} />, color: '#5D87FF' },
                      { label: 'Produção', value: inProgressCount, subtitle: 'Já está rodando', href: '/admin/operacoes/jobs?group=status', icon: <IconPlayerPlay size={16} />, color: '#13DEB9' },
                      { label: 'Sem dono', value: unassignedCount(filteredJobs), subtitle: 'Precisa de responsável', href: '/admin/operacoes/jobs?unassigned=true', icon: <IconUserOff size={16} />, color: '#FFAE1F' },
                      { label: 'Atrasadas', value: overdueJobs.length, subtitle: 'Já passaram do prazo', href: '/admin/operacoes/jobs', icon: <IconCalendarDue size={16} />, color: '#FA896B' },
                      { label: 'Esperando cliente', value: waitingClientJobs.length, subtitle: 'Aprovação ou retorno', href: '/admin/operacoes/jobs', icon: <IconLoader2 size={16} />, color: '#FFAE1F' },
                      { label: 'Urgentes', value: urgentJobs.length, subtitle: 'P0 ou marcadas como urgente', href: '/admin/operacoes/radar', icon: <IconUrgent size={16} />, color: '#E85219' },
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
                    <Button variant="contained" component={Link} href="/admin/operacoes/jobs?new=1">
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

              {/* Search + filter bar */}
              <Box sx={{
                borderRadius: 2, overflow: 'hidden',
                border: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06)}`,
                bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : '#fff',
                boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, dark ? 0.1 : 0.04)}`,
              }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1 }}>
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

                {/* Quick filters */}
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ px: 2, pb: 1.25 }}>
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
                  {hasActiveFilters && (
                    <Button size="small" onClick={() => { setStatusFilter(''); setPriorityFilter(''); setClientFilter(''); setOwnerFilter(''); setQuickFilter(null); setDeadlineFilter(null); setDeliveryFilter(null); }}
                      sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'none' }}>
                      Limpar filtros
                    </Button>
                  )}
                </Stack>

                {/* Advanced filters */}
                <Collapse in={filtersOpen}>
                  <Box sx={{ px: 2, pb: 1.5, borderTop: `1px solid ${theme.palette.divider}`, pt: 1.5 }}>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <TextField select fullWidth size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                          <MenuItem value="">Todos</MenuItem>
                          {STAGE_ORDER.map((s) => <MenuItem key={s} value={s}>{STAGE_LABELS[s] || s}</MenuItem>)}
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
                onSelectJob={(job) => { setSelectedJob(job); setDetailOpen(true); }}
                onFilterOwner={(id) => setOwnerFilter(ownerFilter === id ? '' : id)}
                allocableMinutesFn={ownerAllocableMinutes}
                committedMinutesFn={ownerCommittedMinutes}
              />

              {/* Zone 2: Pipeline Board — horizontal kanban */}
              <PipelineBoard
                jobs={filteredJobs}
                selectedJob={selectedJob}
                onSelectJob={setSelectedJob}
                onAdvance={handleAdvance}
                onShowAll={() => setGroupMode('status')}
              />

              {/* Group-by selector */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>Agrupar:</Typography>
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

              {/* Job list */}
              {filteredJobs.length === 0 ? (
                <EmptyOperationState title="Nenhuma demanda encontrada" description="Mude os filtros ou crie uma nova demanda." actionLabel={OPS_COPY.shell.newDemand} onAction={() => setComposerOpen(true)} />
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
                        onSelectJob={setSelectedJob}
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
                      onSelectJob={setSelectedJob}
                      onAdvance={handleAdvance}
                      onAssign={handleAssign}
                      owners={lookups.owners}
                    />
                  ))}
                </Stack>
              ) : null}
            </Stack>
          </Grid>

          {/* Right sidebar */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <JobFocusRail
              job={selectedJob}
              title={OPS_COPY.common.focusTitle}
              subtitle={OPS_COPY.jobs.focusSubtitle}
              primaryLabel={focusedAction?.label}
              onPrimaryAction={() => setDetailOpen(true)}
              emptyTitle="Selecione uma demanda"
              emptyDescription={OPS_COPY.jobs.focusEmptySubtitle}
              links={
                selectedJob ? (
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard label="Cliente" value={selectedJob.client_name || 'Sem cliente'}
                        href={selectedJob.client_id ? `/clients/${selectedJob.client_id}` : undefined}
                        subtitle={OPS_COPY.common.clientSubtitle} accent={selectedJob.client_brand_color || '#E85219'}
                        thumbnail={<ClientThumb name={selectedJob.client_name} logoUrl={selectedJob.client_logo_url} accent={selectedJob.client_brand_color || '#E85219'} size={26} />} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard label="Responsável" value={selectedJob.owner_name || 'Sem responsável'}
                        href={(() => {
                          const owner = lookups.owners.find((o) => o.id === selectedJob.owner_id);
                          return owner?.freelancer_profile_id
                            ? `/admin/equipe/${owner.freelancer_profile_id}`
                            : '/admin/operacoes/semana?view=distribution';
                        })()}
                        subtitle={formatSkillLabel(selectedJob.required_skill)}
                        thumbnail={<PersonThumb name={selectedJob.owner_name} accent="#5D87FF" size={26} />} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard label="Studio criativo" value="Abrir produção" href="/edro" subtitle="Entrar na execução criativa"
                        thumbnail={<SourceThumb source="creative_studio" jobType="design_static" accent="#5D87FF" />} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard label="Origem" value={formatSourceLabel(selectedJob.source)} subtitle={selectedJob.job_type}
                        thumbnail={<SourceThumb source={selectedJob.source} jobType={selectedJob.job_type} accent="#E85219" />} />
                    </Grid>
                  </Grid>
                ) : null
              }
              sections={(() => {
                if (!selectedJob?.owner_id) return [];
                const ownerPulse = teamPulse.find((o) => o.id === selectedJob.owner_id);
                if (!ownerPulse) return [];
                const barColor = ownerPulse.pct > 90 ? '#FA896B' : ownerPulse.pct > 75 ? '#FFAE1F' : '#13DEB9';
                return [{
                  title: 'Capacidade do responsável',
                  content: (
                    <Box sx={{ px: 0.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem' }}>{ownerPulse.name}</Typography>
                        <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.7rem', color: barColor }}>
                          {ownerPulse.pct}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(ownerPulse.pct, 100)}
                        sx={{ borderRadius: 1, height: 5, bgcolor: alpha(barColor, 0.15), '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 1 } }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', mt: 0.4, display: 'block' }}>
                        {Math.round(ownerPulse.committed / 60)}h comprometido · {Math.round(ownerPulse.cap / 60)}h disponível/semana
                      </Typography>
                    </Box>
                  ),
                }];
              })()}
              footer={
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" size="small" onClick={() => setDetailOpen(true)} disabled={!selectedJob}>{OPS_COPY.common.openDetail}</Button>
                  <Button variant="outlined" size="small" onClick={refresh}>{OPS_COPY.jobs.refresh}</Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => {
                      setDeleteError('');
                      setDeleteConfirmation('');
                      setDeleteDialogOpen(true);
                    }}
                    disabled={!selectedJob}
                  >
                    Excluir demanda
                  </Button>
                </Stack>
              }
            />
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
        onCreate={async (payload) => { const c = await createJob(payload); setComposerOpen(false); router.push(`/admin/operacoes/jobs/${c.id}/briefing`); return c; }}
        onUpdate={updateJob} onStatusChange={changeStatus}
      />

      <JobWorkbenchDrawer
        open={detailOpen && Boolean(selectedJob)}
        mode="edit"
        job={selectedJob}
        jobTypes={lookups.jobTypes} skills={lookups.skills} channels={lookups.channels} clients={lookups.clients} owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setDetailOpen(false)}
        onCreate={createJob}
        onUpdate={async (id, p) => { const u = await updateJob(id, p); await refresh(); setSelectedJob(u as OperationsJob); return u; }}
        onDelete={handleDeleteJob}
        onStatusChange={async (id, s, r) => { const u = await changeStatus(id, s, r); await refresh(); setSelectedJob(u as OperationsJob); return u; }}
        onFetchDetail={fetchJob}
      />

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
        <Box sx={{
          width: 6, height: 20, borderRadius: 1,
          bgcolor: accent,
          flexShrink: 0,
        }} />
        <Typography variant="body2" fontWeight={800}>{section.label}</Typography>
        <Box sx={{
          px: 0.75, py: 0.15, borderRadius: 1.5,
          bgcolor: alpha(accent, 0.12), color: accent,
          fontSize: '0.82rem', fontWeight: 900, minWidth: 22, textAlign: 'center',
        }}>
          {section.count}
        </Box>
        <Box sx={{ flex: 1 }} />
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
