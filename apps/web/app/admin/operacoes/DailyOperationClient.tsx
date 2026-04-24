'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, animate } from 'framer-motion';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconCalendarWeek,
  IconLayoutGrid,
  IconList,
  IconPlus,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import JobDetailClient from './jobs/[id]/JobDetailClient';
import { useJarvisPage } from '@/hooks/useJarvisPage';
import { getRisk, STAGE_LABELS, type OperationsJob, type OperationsOwner } from '@/components/operations/model';
import { OpsCard } from '@/components/operations/primitives';
import { sortByOperationalPriority } from '@/components/operations/derived';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { apiPost } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'focus' | 'urgent' | 'awaiting' | 'in_progress' | 'unassigned';

const FILTERS: { key: FilterKey; label: string; hot?: boolean }[] = [
  { key: 'all',         label: 'Todos' },
  { key: 'focus',       label: 'Precisa de ação', hot: true },
  { key: 'urgent',      label: 'Urgentes' },
  { key: 'in_progress', label: 'Em execução' },
  { key: 'awaiting',    label: 'Aprovação' },
  { key: 'unassigned',  label: 'Sem dono' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isDueImminently(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false;
  const datePart = String(isoDate).split(/[T ]/)[0];
  const due = new Date(datePart + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  return diffMs <= 2 * 24 * 60 * 60 * 1000; // ≤ 2 days (includes overdue)
}

function filterJobs(jobs: OperationsJob[], filter: FilterKey): OperationsJob[] {
  switch (filter) {
    case 'focus':
      return jobs.filter((j) =>
        j.is_urgent ||
        j.priority_band === 'p0' ||
        getRisk(j).level === 'critical' ||
        ['awaiting_approval', 'in_review'].includes(j.status) ||
        (isDueImminently(j.deadline_at) && !['awaiting_approval', 'approved', 'scheduled', 'published', 'done'].includes(j.status))
      );
    case 'urgent':
      return jobs.filter((j) => j.is_urgent || j.priority_band === 'p0' || getRisk(j).level === 'critical');
    case 'in_progress':
      return jobs.filter((j) => ['allocated', 'in_progress'].includes(j.status));
    case 'awaiting':
      return jobs.filter((j) => ['awaiting_approval', 'in_review'].includes(j.status));
    case 'unassigned':
      return jobs.filter((j) => !j.owner_id && !j.owner_name);
    default:
      return jobs;
  }
}

// ── Week helpers ─────────────────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}

function wDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function jobDayKey(job: OperationsJob): string | null {
  if (!job.deadline_at) return null;
  const part = String(job.deadline_at).split(/[T ]/)[0];
  const d = new Date(part + 'T00:00:00');
  return isNaN(d.getTime()) ? null : wDateKey(d);
}

// ── StatNumber ────────────────────────────────────────────────────────────────

function StatNumber({ value, label, color, onClick }: { value: number; label: string; color?: string; onClick?: () => void }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    const ctrl = animate(from, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return ctrl.stop;
  }, [value]);

  return (
    <Stack
      spacing={0}
      alignItems="flex-start"
      onClick={onClick}
      sx={onClick ? { cursor: 'pointer', '&:hover': { opacity: 0.75 }, transition: 'opacity 0.15s' } : undefined}
    >
      <Typography variant="h3" fontWeight={900} sx={{ lineHeight: 1, color: color || 'text.primary', fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
        {display}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
    </Stack>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DailyOperationClient() {
  const { jobs, lookups, loading, error, refresh, syncHealth, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState<FilterKey>(() => {
    const p = searchParams.get('filter') as FilterKey | null;
    return p && ['urgent', 'in_progress', 'awaiting', 'unassigned'].includes(p) ? p : 'all';
  });
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [filterOwnerId, setFilterOwnerId] = useState<string>('all');
  const [groupByClient, setGroupByClient] = useState(false);
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [drawerMode, setDrawerMode]   = useState<'create' | 'edit'>('edit');
  const [createComposerPath, setCreateComposerPath] = useState<'briefing' | 'job' | 'adjustment' | 'client_request'>('client_request');
  const [syncing, setSyncing]   = useState(false);
  const [detailJobId, setDetailJobId] = useState<string | null>(null);

  // Sync selected job with fresh data
  useEffect(() => {
    if (!selectedJob) return;
    const fresh = jobs.find((j) => j.id === selectedJob.id);
    if (fresh) setSelectedJob(fresh);
  }, [jobs, selectedJob]);

  const openCommands = useCallback((job: OperationsJob) => {
    setSelectedJob(job);
    setDrawerMode('edit');
    setDrawerOpen(true);
  }, []);

  const openDetail = useCallback((job: OperationsJob) => {
    setDetailJobId(job.id);
  }, []);

  const openCreate = useCallback(() => {
    setSelectedJob(null);
    setCreateComposerPath('client_request');
    setDrawerMode('create');
    setDrawerOpen(true);
  }, []);

  const assignOwner = useCallback(async (jobId: string, ownerId: string) => {
    await updateJob(jobId, { owner_id: ownerId });
  }, [updateJob]);

  const handleAdvance = useCallback(async (jobId: string, nextStatus: string) => {
    await changeStatus(jobId, nextStatus);
  }, [changeStatus]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiPost('/trello/sync-all', {});
      setTimeout(() => { refresh(); setSyncing(false); }, 4000);
    } catch {
      setSyncing(false);
    }
  };

  const activeJobs = useMemo(() => jobs.filter((j) => j.status !== 'archived'), [jobs]);

  const drilldownJobs = useMemo(() => {
    let result = activeJobs;
    if (filterClientId !== 'all') result = result.filter((j) => j.client_id === filterClientId);
    if (filterOwnerId !== 'all') {
      result = filterOwnerId === '__none__'
        ? result.filter((j) => !j.owner_id && !j.owner_name)
        : result.filter((j) => j.owner_id === filterOwnerId || j.owner_email === filterOwnerId || j.owner_name === filterOwnerId);
    }
    return result;
  }, [activeJobs, filterClientId, filterOwnerId]);

  const scopedJobs = useMemo(() => {
    if (!filterDay) return drilldownJobs;
    return drilldownJobs.filter((j) => jobDayKey(j) === filterDay);
  }, [drilldownJobs, filterDay]);

  // Stats reflect the current client/owner/day scope, before the status chip filter.
  const pendingApproval = useMemo(() => scopedJobs.filter((j) => j.status === 'awaiting_approval').length, [scopedJobs]);
  const peopleInvolved = useMemo(() => new Set(scopedJobs.map((j) => j.owner_id || j.owner_email || j.owner_name).filter(Boolean)).size, [scopedJobs]);
  const urgentCount = useMemo(() => filterJobs(scopedJobs, 'urgent').length, [scopedJobs]);

  // Week strip data
  const weekDays = useMemo(() => {
    const monday = startOfWeek(new Date());
    const todayKey = wDateKey(new Date());
    return Array.from({ length: 5 }, (_, i) => {
      const d = addDays(monday, i);
      const key = wDateKey(d);
      return {
        date: d,
        key,
        short: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d).replace('.', '').toUpperCase(),
        dayNum: d.getDate(),
        today: key === todayKey,
      };
    });
  }, []);

  const jobsPerDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of weekDays) map.set(d.key, 0);
    for (const job of drilldownJobs) {
      const dk = jobDayKey(job);
      if (dk && map.has(dk)) map.set(dk, (map.get(dk) ?? 0) + 1);
    }
    return map;
  }, [weekDays, drilldownJobs]);

  const maxDayJobs = useMemo(
    () => Math.max(1, ...weekDays.map((d) => jobsPerDay.get(d.key) ?? 0)),
    [weekDays, jobsPerDay],
  );

  // Client and owner lists for dropdowns
  const activeClientsList = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of activeJobs) if (job.client_id && job.client_name) map.set(job.client_id, job.client_name);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [activeJobs]);

  const activeOwnersList = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of activeJobs) {
      const key = job.owner_id || job.owner_email || job.owner_name;
      if (key && job.owner_name) map.set(key, job.owner_name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [activeJobs]);

  // Filtered + sorted (with day, client, owner drill-downs)
  const displayed = useMemo(() => {
    return [...filterJobs(scopedJobs, filter)].sort(sortByOperationalPriority);
  }, [scopedJobs, filter]);

  // Grouped by client (for group mode)
  const groupedByClient = useMemo(() => {
    if (!groupByClient) return null;
    const map = new Map<string, { key: string; name: string; logoUrl: string | null; color: string | null; jobs: OperationsJob[] }>();
    for (const job of displayed) {
      const key = job.client_id || '__none__';
      if (!map.has(key)) map.set(key, { key, name: job.client_name || 'Sem cliente', logoUrl: job.client_logo_url || null, color: job.client_brand_color || null, jobs: [] });
      map.get(key)!.jobs.push(job);
    }
    return Array.from(map.values()).sort((a, b) => b.jobs.length - a.jobs.length);
  }, [groupByClient, displayed]);

  // Filter chip counts
  const counts: Record<FilterKey, number> = useMemo(() => ({
    all:         scopedJobs.length,
    focus:       filterJobs(scopedJobs, 'focus').length,
    urgent:      urgentCount,
    in_progress: filterJobs(scopedJobs, 'in_progress').length,
    awaiting:    filterJobs(scopedJobs, 'awaiting').length,
    unassigned:  filterJobs(scopedJobs, 'unassigned').length,
  }), [scopedJobs, urgentCount]);

  useJarvisPage(
    {
      screen: 'operations_overview',
      clientId: selectedJob?.client_id ?? null,
      currentJobId: selectedJob?.id ?? null,
      currentJobTitle: selectedJob?.title ?? null,
      currentJobStatus: selectedJob?.status ?? null,
      currentJobOwner: selectedJob?.owner_name ?? null,
      criticalJobs: urgentCount,
      unassignedJobs: counts.unassigned,
      waitingClientJobs: pendingApproval,
    },
    [selectedJob?.id, urgentCount, counts.unassigned, pendingApproval],
  );

  return (
    <OperationsShell section="overview" onNewDemand={openCreate}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Stats row ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 0 }}
        divider={
          <Box sx={{ width: '1px', bgcolor: 'divider', mx: { sm: 3 }, display: { xs: 'none', sm: 'block' } }} />
        }
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <StatNumber value={scopedJobs.length} label="Jobs ativos" onClick={() => setFilter('all')} />
          <StatNumber value={pendingApproval}   label="Pendentes aprovação" color={pendingApproval > 0 ? '#7C3AED' : undefined} onClick={() => setFilter('awaiting')} />
          <StatNumber value={peopleInvolved}    label="Pessoas envolvidas" />
          {urgentCount > 0 && (
            <StatNumber value={urgentCount} label="Urgentes" color="#F9A825" onClick={() => setFilter('urgent')} />
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={groupByClient ? 'Vista plana' : 'Agrupar por cliente'}>
            <IconButton
              size="small"
              onClick={() => setGroupByClient((v) => !v)}
              sx={{ opacity: groupByClient ? 1 : 0.45, '&:hover': { opacity: 1 } }}
            >
              {groupByClient ? <IconList size={16} /> : <IconLayoutGrid size={16} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Sincronizar Trello">
            <IconButton size="small" onClick={handleSync} disabled={syncing} sx={{ opacity: 0.6 }}>
              <IconRefresh size={16} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<IconPlus size={14} />}
            onClick={openCreate}
            sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', borderRadius: 2, boxShadow: 'none' }}
          >
            Nova demanda
          </Button>
        </Stack>
      </Stack>

      {/* ── Week strip ── */}
      <Box sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <IconCalendarWeek size={14} style={{ opacity: 0.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary', fontSize: '0.65rem' }}>
            Semana
          </Typography>
          {filterDay && (
            <Chip
              size="small"
              label="Limpar dia"
              onClick={() => setFilterDay(null)}
              sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}
            />
          )}
        </Stack>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {weekDays.map((day) => {
            const count = jobsPerDay.get(day.key) ?? 0;
            const pct = Math.round((count / maxDayJobs) * 100);
            const isSelected = filterDay === day.key;
            const barCol = day.today ? '#5D87FF' : count > 0 ? '#13DEB9' : '#A0AEC0';
            return (
              <Box
                key={day.key}
                onClick={() => setFilterDay(isSelected ? null : day.key)}
                sx={(t) => ({
                  minWidth: 68,
                  px: 1.25,
                  pt: 0.9,
                  pb: 0.75,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: `1.5px solid`,
                  borderColor: isSelected
                    ? (day.today ? '#5D87FF' : alpha(t.palette.text.primary, 0.35))
                    : day.today
                      ? alpha('#5D87FF', 0.3)
                      : alpha(t.palette.divider, 0.7),
                  bgcolor: isSelected
                    ? (day.today ? alpha('#5D87FF', 0.1) : alpha(t.palette.text.primary, 0.05))
                    : day.today
                      ? alpha('#5D87FF', 0.04)
                      : t.palette.mode === 'dark' ? alpha('#fff', 0.02) : '#fff',
                  transition: 'all 150ms ease',
                  '&:hover': {
                    borderColor: day.today ? '#5D87FF' : alpha(t.palette.text.primary, 0.3),
                    bgcolor: day.today ? alpha('#5D87FF', 0.08) : alpha(t.palette.text.primary, 0.04),
                  },
                })}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 900, fontSize: '0.62rem', color: day.today ? '#5D87FF' : 'text.secondary', display: 'block', lineHeight: 1, mb: 0.3 }}
                >
                  {day.short}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 900, fontSize: '0.95rem', lineHeight: 1, display: 'block', color: day.today ? '#5D87FF' : 'text.primary' }}
                >
                  {day.dayNum}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.6 }}>
                  <Box sx={{ flex: 1, height: 3, borderRadius: 1, bgcolor: alpha(barCol, 0.15) }}>
                    <Box sx={{ height: 3, borderRadius: 1, width: `${pct}%`, bgcolor: barCol, transition: 'width 300ms ease' }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 800, color: count > 0 ? barCol : 'text.disabled', lineHeight: 1, minWidth: 14, textAlign: 'right' }}>
                    {count || '—'}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* ── Filter chips + extra dropdowns ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap flex={1}>
        {FILTERS.map((f) => {
          const isSelected = filter === f.key;
          const isFocus = f.key === 'focus';
          const focusColor = '#E85219';
          return (
            <Chip
              key={f.key}
              label={`${f.label} ${counts[f.key]}`}
              onClick={() => setFilter(f.key)}
              variant={isSelected ? 'filled' : 'outlined'}
              sx={(theme) => {
                const dark = theme.palette.mode === 'dark';
                if (isFocus) return {
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  height: 28,
                  borderRadius: '14px',
                  cursor: 'pointer',
                  bgcolor: isSelected ? focusColor : alpha(focusColor, 0.08),
                  color: isSelected ? '#fff' : focusColor,
                  borderColor: isSelected ? 'transparent' : alpha(focusColor, 0.35),
                  border: `1px solid`,
                  '&:hover': { bgcolor: isSelected ? alpha(focusColor, 0.85) : alpha(focusColor, 0.14) },
                };
                return {
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  height: 28,
                  borderRadius: '14px',
                  cursor: 'pointer',
                  bgcolor: isSelected ? (dark ? '#fff' : '#111') : 'transparent',
                  color: isSelected ? (dark ? '#111' : '#fff') : 'text.secondary',
                  borderColor: isSelected ? 'transparent' : 'divider',
                  '&:hover': {
                    bgcolor: isSelected
                      ? (dark ? '#e0e0e0' : '#333')
                      : alpha(theme.palette.text.primary, 0.06),
                  },
                };
              }}
            />
          );
        })}
        </Stack>

        {/* Client + owner dropdowns */}
        <Stack direction="row" spacing={1} flexShrink={0}>
          <Select
            size="small"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            displayEmpty
            sx={{ height: 28, fontSize: '0.72rem', fontWeight: 700, minWidth: 130, '& .MuiSelect-select': { py: 0 } }}
          >
            <MenuItem value="all">Todos clientes</MenuItem>
            {activeClientsList.map(([id, name]) => (
              <MenuItem key={id} value={id}>{name}</MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={filterOwnerId}
            onChange={(e) => setFilterOwnerId(e.target.value)}
            displayEmpty
            sx={{ height: 28, fontSize: '0.72rem', fontWeight: 700, minWidth: 120, '& .MuiSelect-select': { py: 0 } }}
          >
            <MenuItem value="all">Todos criativos</MenuItem>
            <MenuItem value="__none__">Sem dono</MenuItem>
            {activeOwnersList.map(([key, name]) => (
              <MenuItem key={key} value={key}>{name.split(' ')[0]}</MenuItem>
            ))}
          </Select>
        </Stack>
      </Stack>

      {/* ── Card grid ── */}
      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : displayed.length === 0 ? (
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <Typography color="text.secondary">Nenhuma demanda encontrada para este filtro.</Typography>
        </Box>
      ) : groupedByClient ? (
        <Stack spacing={3}>
          {groupedByClient.map((group) => (
            <Box key={group.key}>
              {/* Client group header */}
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  mb: 1.5,
                  pb: 1,
                  borderBottom: `2px solid ${group.color ? alpha(group.color, 0.3) : 'divider'}`,
                }}
              >
                {group.logoUrl ? (
                  <Avatar
                    src={group.logoUrl}
                    alt={group.name}
                    variant="rounded"
                    sx={{ width: 20, height: 20, '& img': { objectFit: 'contain' } }}
                  />
                ) : null}
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    color: group.color || 'text.secondary',
                    lineHeight: 1,
                  }}
                >
                  {group.name}
                </Typography>
                <Chip size="small" label={group.jobs.length} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
              </Stack>
              <Grid container spacing={2}>
                {group.jobs.map((job, i) => (
                  <Grid key={job.id} size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2.4 }}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(i * 0.02, 0.4), ease: [0.16, 1, 0.3, 1] }}
                    >
                      <OpsCard job={job} onOpen={openCommands} onClick={() => openDetail(job)} onAssign={assignOwner} owners={lookups.owners} onAdvance={handleAdvance} />
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Stack>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Grid container spacing={2}>
              {displayed.map((job, i) => (
                <Grid key={job.id} size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2.4 }}>
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: Math.min(i * 0.025, 0.6), ease: [0.16, 1, 0.3, 1] }}
                  >
                    <OpsCard job={job} onOpen={openCommands} onClick={() => openDetail(job)} onAssign={assignOwner} owners={lookups.owners} onAdvance={handleAdvance} />
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Job detail dialog */}
      <Dialog
        open={!!detailJobId}
        onClose={() => setDetailJobId(null)}
        fullWidth
        maxWidth="lg"
        scroll="paper"
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '92vh' } }}
      >
        <DialogTitle sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setDetailJobId(null)}
            size="small"
            sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10, opacity: 0.6, '&:hover': { opacity: 1 } }}
          >
            <IconX size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {detailJobId && (
            <JobDetailClient id={detailJobId} onClose={() => setDetailJobId(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Quick-edit drawer (⋮ button) */}
      <JobWorkbenchDrawer
        open={drawerOpen}
        mode={drawerMode}
        job={selectedJob}
        presentation="modal"
        initialComposerPath={createComposerPath}
        jobTypes={lookups.jobTypes}
        skills={lookups.skills}
        channels={lookups.channels}
        clients={lookups.clients}
        owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => { setDrawerOpen(false); setSelectedJob(null); }}
        onCreate={createJob}
        onUpdate={updateJob}
        onStatusChange={changeStatus}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}
