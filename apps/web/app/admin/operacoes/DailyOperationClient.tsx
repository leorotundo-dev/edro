'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAlertTriangle,
  IconDots,
  IconPlus,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import JobDetailClient from './jobs/[id]/JobDetailClient';
import { useJarvisPage } from '@/hooks/useJarvisPage';
import { getRisk, type OperationsJob } from '@/components/operations/model';
import { sortByOperationalPriority } from '@/components/operations/derived';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { apiPost } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'urgent' | 'awaiting' | 'in_progress' | 'unassigned';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',         label: 'Todos' },
  { key: 'urgent',      label: 'Urgentes' },
  { key: 'in_progress', label: 'Em execução' },
  { key: 'awaiting',    label: 'Aprovação' },
  { key: 'unassigned',  label: 'Sem dono' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function filterJobs(jobs: OperationsJob[], filter: FilterKey): OperationsJob[] {
  switch (filter) {
    case 'urgent':
      return jobs.filter((j) => j.is_urgent || j.priority_band === 'p0' || getRisk(j).level === 'critical');
    case 'in_progress':
      return jobs.filter((j) => ['allocated', 'in_progress'].includes(j.status));
    case 'awaiting':
      return jobs.filter((j) => ['awaiting_approval', 'in_review'].includes(j.status));
    case 'unassigned':
      return jobs.filter((j) => !j.owner_id);
    default:
      return jobs;
  }
}

function checklistPct(job: OperationsJob): number | null {
  const items = job.checklists?.flatMap((c) => c.items) ?? [];
  if (!items.length) return null;
  return Math.round((items.filter((i) => i.checked).length / items.length) * 100);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  // Handle "YYYY-MM-DD", "YYYY-MM-DDT...", "YYYY-MM-DD HH:MM:SS" formats
  const datePart = String(iso).split(/[T ]/)[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return '';
  return `${day}.${String(month).padStart(2, '0')}.${String(year).slice(2)}`;
}

function cardBg(job: OperationsJob, dark: boolean): string {
  const risk = getRisk(job).level;
  if (job.is_urgent || job.priority_band === 'p0' || risk === 'critical')
    return dark ? alpha('#F9A825', 0.07) : alpha('#F9A825', 0.05);
  if (job.status === 'awaiting_approval')
    return dark ? alpha('#7C3AED', 0.07) : alpha('#7C3AED', 0.04);
  if (job.status === 'blocked')
    return dark ? alpha('#FA896B', 0.07) : alpha('#FA896B', 0.04);
  return dark ? alpha('#fff', 0.03) : '#fff';
}

function barColor(job: OperationsJob): string {
  const risk = getRisk(job).level;
  if (job.is_urgent || job.priority_band === 'p0' || risk === 'critical') return '#F9A825';
  if (job.status === 'blocked') return '#FA896B';
  if (job.status === 'awaiting_approval') return '#7C3AED';
  if (job.status === 'in_review') return '#5D87FF';
  if (job.status === 'in_progress' || job.status === 'allocated') return '#13DEB9';
  return '#5D87FF';
}

function initials(name?: string | null) {
  return (name || '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

// ── StatNumber ────────────────────────────────────────────────────────────────

function StatNumber({ value, label, color }: { value: number; label: string; color?: string }) {
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
    <Stack spacing={0} alignItems="flex-start">
      <Typography variant="h3" fontWeight={900} sx={{ lineHeight: 1, color: color || 'text.primary', fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
        {display}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </Typography>
    </Stack>
  );
}

// ── DailyOpCard ───────────────────────────────────────────────────────────────

function DailyOpCard({ job, onOpen, onDetail }: { job: OperationsJob; onOpen: (j: OperationsJob) => void; onDetail: (j: OperationsJob) => void }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const pct = checklistPct(job);
  const isUrgent = job.is_urgent || job.priority_band === 'p0' || getRisk(job).level === 'critical';
  const bg = cardBg(job, dark);
  const bar = barColor(job);

  return (
    <Box
      onClick={() => onDetail(job)}
      sx={{
        borderRadius: 2.5,
        bgcolor: bg,
        boxShadow: dark ? '0 1px 4px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
        '&:hover': {
          boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.35)' : '0 4px 20px rgba(0,0,0,0.1)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 1.25, flex: 1 }}>
        {/* Client + menu */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography
            variant="caption"
            noWrap
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'text.disabled',
              maxWidth: '75%',
            }}
          >
            {job.client_name || 'Sem cliente'}
          </Typography>
          <Stack direction="row" spacing={0.25} alignItems="center">
            {isUrgent && (
              <Box sx={{ color: '#F9A825', display: 'flex', lineHeight: 1 }}>
                <IconAlertTriangle size={11} />
              </Box>
            )}
            <IconButton
              component="span"
              size="small"
              onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onOpen(job); }}
              sx={{ p: 0.25, opacity: 0, '.MuiBox-root:hover &': { opacity: 0.5 }, '&:hover': { opacity: '1 !important' } }}
            >
              <IconDots size={13} />
            </IconButton>
          </Stack>
        </Stack>

        {/* Title */}
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            fontSize: '0.82rem',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
            color: 'text.primary',
          }}
        >
          {job.title}
        </Typography>

        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={pct ?? 0}
          sx={{
            height: 2,
            borderRadius: 1,
            bgcolor: dark ? alpha('#fff', 0.08) : alpha('#000', 0.06),
            '& .MuiLinearProgress-bar': { bgcolor: bar, borderRadius: 1 },
          }}
        />

        {/* Footer */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Avatar
              src={job.owner_avatar_url ?? undefined}
              sx={{ width: 20, height: 20, fontSize: '0.5rem', fontWeight: 800, bgcolor: alpha('#5D87FF', 0.15), color: '#5D87FF' }}
            >
              {initials(job.owner_name)}
            </Avatar>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 500 }}>
              {job.owner_name?.split(' ')[0] ?? 'Sem dono'}
            </Typography>
          </Stack>
          {job.deadline_at && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
              {fmtDate(job.deadline_at)}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DailyOperationClient() {
  const { jobs, lookups, loading, error, refresh, syncHealth, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');

  const [filter, setFilter]     = useState<FilterKey>('all');
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

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiPost('/trello/sync-all', {});
      setTimeout(() => { refresh(); setSyncing(false); }, 4000);
    } catch {
      setSyncing(false);
    }
  };

  // Stats
  const activeJobs        = useMemo(() => jobs.filter((j) => j.status !== 'archived'), [jobs]);
  const pendingApproval   = useMemo(() => jobs.filter((j) => j.status === 'awaiting_approval').length, [jobs]);
  const peopleInvolved    = useMemo(() => new Set(jobs.map((j) => j.owner_id).filter(Boolean)).size, [jobs]);
  const urgentCount       = useMemo(() => jobs.filter((j) => j.is_urgent || j.priority_band === 'p0' || getRisk(j).level === 'critical').length, [jobs]);

  // Filtered + sorted
  const displayed = useMemo(
    () => filterJobs(activeJobs, filter).sort(sortByOperationalPriority),
    [activeJobs, filter],
  );

  // Filter chip counts
  const counts: Record<FilterKey, number> = useMemo(() => ({
    all:         activeJobs.length,
    urgent:      urgentCount,
    in_progress: activeJobs.filter((j) => ['allocated', 'in_progress'].includes(j.status)).length,
    awaiting:    activeJobs.filter((j) => ['awaiting_approval', 'in_review'].includes(j.status)).length,
    unassigned:  activeJobs.filter((j) => !j.owner_id).length,
  }), [activeJobs, urgentCount]);

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

      {syncHealth?.needs_attention && !loading && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button size="small" color="inherit" onClick={handleSync} disabled={syncing}>
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          }
        >
          Trello desatualizado — dados podem estar incompletos.
        </Alert>
      )}

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
          <StatNumber value={activeJobs.length} label="Jobs ativos" />
          <StatNumber value={pendingApproval}   label="Pendentes aprovação" color={pendingApproval > 0 ? '#7C3AED' : undefined} />
          <StatNumber value={peopleInvolved}    label="Pessoas envolvidas" />
          {urgentCount > 0 && (
            <StatNumber value={urgentCount} label="Urgentes" color="#F9A825" />
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
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

      {/* ── Filter chips ── */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={`${f.label} ${counts[f.key]}`}
            onClick={() => setFilter(f.key)}
            variant={filter === f.key ? 'filled' : 'outlined'}
            sx={(theme) => ({
              fontWeight: 700,
              fontSize: '0.72rem',
              height: 28,
              borderRadius: '14px',
              cursor: 'pointer',
              bgcolor: filter === f.key
                ? theme.palette.mode === 'dark' ? '#fff' : '#111'
                : 'transparent',
              color: filter === f.key
                ? theme.palette.mode === 'dark' ? '#111' : '#fff'
                : 'text.secondary',
              borderColor: filter === f.key ? 'transparent' : 'divider',
              '&:hover': {
                bgcolor: filter === f.key
                  ? theme.palette.mode === 'dark' ? '#e0e0e0' : '#333'
                  : alpha(theme.palette.text.primary, 0.06),
              },
            })}
          />
        ))}
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
                    <DailyOpCard job={job} onOpen={openCommands} onDetail={openDetail} />
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
