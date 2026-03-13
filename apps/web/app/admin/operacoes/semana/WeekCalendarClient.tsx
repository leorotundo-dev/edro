'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import OperationsShell from '@/components/operations/OperationsShell';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { isClosedStatus, sortByOperationalPriority } from '@/components/operations/derived';
import {
  formatMinutes,
  getRisk,
  type OperationsJob,
  type OperationsOwner,
} from '@/components/operations/model';
import { ClientThumb, StatusDot, DeadlineCountdown } from '@/components/operations/primitives';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandWhatsapp,
  IconBrandYoutube,
  IconCalendarWeek,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceDesktop,
  IconMail,
  IconRefresh,
} from '@tabler/icons-react';

/* ─── helpers ─── */

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function formatDayHeader(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit' }).format(d);
}

function formatWeekRange(monday: Date): string {
  const friday = addDays(monday, 4);
  const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
  return `${fmt.format(monday)} – ${fmt.format(friday)}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function jobDateKey(job: OperationsJob): string | null {
  const alloc = job.metadata?.allocation as { planned_date?: string } | undefined;
  const dateStr = alloc?.planned_date || job.deadline_at;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return dateKey(d);
}

/** Assign a stable color per owner for visual scanning */
const OWNER_COLORS = [
  '#5D87FF', '#E85219', '#49BEFF', '#13DEB9', '#FFAE1F',
  '#FA896B', '#7C5DFA', '#0DCAF0', '#D63384', '#198754',
];

function ownerColor(ownerId: string | null | undefined, owners: OperationsOwner[]): string {
  if (!ownerId) return '#888';
  const idx = owners.findIndex((o) => o.id === ownerId);
  return OWNER_COLORS[idx >= 0 ? idx % OWNER_COLORS.length : 0];
}

function riskDot(job: OperationsJob): string {
  const risk = getRisk(job);
  switch (risk.level) {
    case 'critical': return '#FF4842';
    case 'high': return '#FFAE1F';
    case 'medium': return '#49BEFF';
    default: return '#13DEB9';
  }
}

/* ─── types ─── */

type DayColumn = {
  date: Date;
  key: string;
  label: string;
  today: boolean;
  jobs: OperationsJob[];
  totalMinutes: number;
};

/* ─── OWNER LEGEND ─── */

function OwnerLegend({ owners, jobs }: { owners: OperationsOwner[]; jobs: OperationsJob[] }) {
  const activeOwnerIds = new Set(jobs.filter((j) => j.owner_id && !isClosedStatus(j.status)).map((j) => j.owner_id));
  const activeOwners = owners.filter((o) => activeOwnerIds.has(o.id));
  if (!activeOwners.length) return null;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {activeOwners.map((o) => (
        <Chip
          key={o.id}
          size="small"
          avatar={
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ownerColor(o.id, owners), flexShrink: 0 }} />
          }
          label={o.name?.split(' ')[0] || 'Sem nome'}
          sx={{ height: 24, fontWeight: 700, borderRadius: 1 }}
        />
      ))}
      {jobs.some((j) => !j.owner_id && !isClosedStatus(j.status)) && (
        <Chip
          size="small"
          avatar={<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#888', flexShrink: 0 }} />}
          label="Sem dono"
          sx={{ height: 24, fontWeight: 700, borderRadius: 1 }}
        />
      )}
    </Stack>
  );
}

/* ─── CHANNEL ICON ─── */

const CHANNEL_ICON_MAP: Record<string, React.ReactNode> = {
  instagram: <IconBrandInstagram size={12} />,
  facebook: <IconBrandFacebook size={12} />,
  linkedin: <IconBrandLinkedin size={12} />,
  tiktok: <IconBrandTiktok size={12} />,
  youtube: <IconBrandYoutube size={12} />,
  whatsapp: <IconBrandWhatsapp size={12} />,
  email: <IconMail size={12} />,
  site: <IconDeviceDesktop size={12} />,
  web: <IconDeviceDesktop size={12} />,
};

function channelIcon(channel?: string | null) {
  if (!channel) return null;
  const key = channel.toLowerCase();
  for (const [match, icon] of Object.entries(CHANNEL_ICON_MAP)) {
    if (key.includes(match)) return icon;
  }
  return null;
}

/* ─── JOB CARD (minimal, inspired by Monday/ClickUp) ─── */

function JobCard({
  job,
  owners,
  selected,
  onClick,
  onDragStart,
}: {
  job: OperationsJob;
  owners: OperationsOwner[];
  selected?: boolean;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const color = ownerColor(job.owner_id, owners);
  const risk = getRisk(job);
  const ownerFirstName = job.owner_name?.split(' ')[0] || 'Sem dono';
  const hours = job.estimated_minutes ? `${Math.round(job.estimated_minutes / 60)}h` : '';
  const chIcon = channelIcon(job.channel);

  return (
    <Tooltip
      arrow
      enterDelay={400}
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="body2" fontWeight={800}>{job.title}</Typography>
          <Typography variant="caption" display="block">Cliente: {job.client_name || '—'}</Typography>
          <Typography variant="caption" display="block">Tipo: {job.job_type}</Typography>
          <Typography variant="caption" display="block">Canal: {job.channel || '—'}</Typography>
          <Typography variant="caption" display="block">Status: {job.status}</Typography>
          <Typography variant="caption" display="block">Risco: {risk.label}</Typography>
          {job.deadline_at && (
            <Typography variant="caption" display="block">
              Prazo: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(job.deadline_at))}
            </Typography>
          )}
        </Box>
      }
    >
      <Box
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
        sx={{
          px: 1,
          py: 0.75,
          borderRadius: 1,
          cursor: 'grab',
          borderLeft: `3px solid ${color}`,
          bgcolor: selected
            ? alpha(color, dark ? 0.16 : 0.1)
            : dark ? alpha(theme.palette.common.white, 0.03) : theme.palette.background.paper,
          border: selected
            ? `1px solid ${alpha(color, 0.4)}`
            : `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.08)}`,
          borderLeftWidth: '3px',
          borderLeftColor: color,
          boxShadow: risk.level === 'critical'
            ? `inset 0 0 0 1px ${alpha(theme.palette.error.main, 0.35)}`
            : 'none',
          transition: 'all 120ms ease',
          '&:hover': {
            bgcolor: dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.04),
            transform: 'translateY(-1px)',
            boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.1)}`,
          },
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          <StatusDot status={job.status} size={16} />
          <ClientThumb
            name={job.client_name}
            logoUrl={job.client_logo_url}
            accent={job.client_brand_color || color}
            size={20}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}
          >
            {job.title}
          </Typography>
          {chIcon && (
            <Box sx={{ flexShrink: 0, color: alpha(theme.palette.text.primary, 0.45), display: 'flex' }}>
              {chIcon}
            </Box>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25, pl: 2.5 }}>
          <Typography variant="caption" sx={(t) => ({ color: alpha(t.palette.text.primary, 0.55), fontWeight: 600, fontSize: '0.68rem' })}>
            {ownerFirstName}
          </Typography>
          {hours && (
            <Typography variant="caption" sx={(t) => ({ color: alpha(t.palette.text.primary, 0.4), fontSize: '0.65rem' })}>
              {hours}
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          <DeadlineCountdown deadline={job.deadline_at} compact />
        </Stack>
      </Box>
    </Tooltip>
  );
}

/* ─── DAY COLUMN ─── */

function DayColumnView({
  col,
  owners,
  teamCapacityPerDay,
  selectedJobId,
  onSelectJob,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  col: DayColumn;
  owners: OperationsOwner[];
  teamCapacityPerDay: number;
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  onDragStart: (jobId: string, e: React.DragEvent) => void;
  onDrop: (dayKey: string) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const usage = teamCapacityPerDay > 0 ? Math.min(col.totalMinutes / teamCapacityPerDay, 1.4) : 0;
  const usagePct = Math.round(usage * 100);
  const usageColor = usage > 1 ? theme.palette.error.main : usage > 0.8 ? theme.palette.warning.main : theme.palette.success.main;
  const [dragOver, setDragOver] = useState(false);

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
        onDragOver(e);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => {
        setDragOver(false);
        onDrop(col.key);
      }}
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${theme.palette.divider}`,
        '&:last-child': { borderRight: 'none' },
        bgcolor: dragOver
          ? alpha(theme.palette.primary.main, dark ? 0.08 : 0.05)
          : col.today
            ? alpha(theme.palette.primary.main, dark ? 0.04 : 0.02)
            : 'transparent',
        transition: 'background-color 150ms ease',
      }}
    >
      {/* Day header */}
      <Box
        sx={{
          px: 1,
          py: 0.75,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography
            variant="caption"
            sx={{
              fontWeight: col.today ? 900 : 700,
              textTransform: 'capitalize',
              color: col.today ? theme.palette.primary.main : undefined,
            }}
          >
            {col.label}
          </Typography>
          <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.45), fontSize: '0.65rem' }}>
            {formatMinutes(col.totalMinutes)}
          </Typography>
        </Stack>
        {/* Capacity bar */}
        <LinearProgress
          variant="determinate"
          value={Math.min(usagePct, 100)}
          sx={{
            mt: 0.5,
            height: 3,
            borderRadius: 1,
            bgcolor: dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06),
            '& .MuiLinearProgress-bar': {
              bgcolor: usageColor,
              borderRadius: 1,
            },
          }}
        />
      </Box>

      {/* Job cards */}
      <Box sx={{ flex: 1, p: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5, minHeight: 120, overflowY: 'auto' }}>
        {col.jobs.sort(sortByOperationalPriority).map((job) => (
          <JobCard
            key={job.id}
            job={job}
            owners={owners}
            selected={selectedJobId === job.id}
            onClick={() => onSelectJob(job.id)}
            onDragStart={(e) => onDragStart(job.id, e)}
          />
        ))}
        {!col.jobs.length && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
            <Typography variant="caption">—</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ─── BACKLOG ─── */

function BacklogRow({
  jobs,
  owners,
  selectedJobId,
  onSelectJob,
  onDragStart,
}: {
  jobs: OperationsJob[];
  owners: OperationsOwner[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  onDragStart: (jobId: string, e: React.DragEvent) => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  if (!jobs.length) return null;

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        borderTop: `2px dashed ${dark ? alpha(theme.palette.common.white, 0.1) : alpha(theme.palette.common.black, 0.12)}`,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Sem data
        </Typography>
        <Chip size="small" label={jobs.length} sx={{ height: 20, fontWeight: 800, borderRadius: 1 }} />
        <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.45) }}>
          Arraste para a semana ↑
        </Typography>
      </Stack>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {jobs.sort(sortByOperationalPriority).map((job) => (
          <Box key={job.id} sx={{ width: { xs: '100%', sm: '48%', md: '23%', lg: '18%' } }}>
            <JobCard
              job={job}
              owners={owners}
              selected={selectedJobId === job.id}
              onClick={() => onSelectJob(job.id)}
              onDragStart={(e) => onDragStart(job.id, e)}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ─── PUBLICATIONS ROW ─── */

function PublicationsRow({ jobs }: { jobs: OperationsJob[] }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const pubJobs = jobs.filter(
    (j) =>
      !isClosedStatus(j.status) &&
      (j.job_type === 'publication' || j.status === 'scheduled' || j.status === 'published' || j.status === 'approved')
  );
  if (!pubJobs.length) return null;

  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.75,
        borderTop: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.08)}`,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', mr: 0.5 }}>
          Publicações
        </Typography>
        {pubJobs.slice(0, 8).map((j) => {
          const d = j.deadline_at ? new Date(j.deadline_at) : null;
          const dayLabel = d ? new Intl.DateTimeFormat('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(d) : '—';
          return (
            <Chip
              key={j.id}
              size="small"
              label={`${dayLabel}: ${j.title?.slice(0, 20) || j.job_type}${j.channel ? ` (${j.channel})` : ''}`}
              sx={{ height: 22, fontWeight: 600, borderRadius: 1 }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}

/* ─── MAIN COMPONENT ─── */

export default function WeekCalendarClient() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const ops = useOperationsData('?active=true');
  const { jobs, lookups, loading, refresh } = ops;
  const owners = lookups.owners;

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const goToday = () => setWeekStart(startOfWeek(new Date()));
  const goPrev = () => setWeekStart((prev) => addDays(prev, -7));
  const goNext = () => setWeekStart((prev) => addDays(prev, 7));

  // Filters
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');

  // Selection & drawer
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelectJob = useCallback((id: string) => {
    setSelectedJobId(id);
    setDrawerOpen(true);
  }, []);

  // Drag state
  const dragJobIdRef = useRef<string | null>(null);

  const handleDragStart = useCallback((jobId: string, e: React.DragEvent) => {
    dragJobIdRef.current = jobId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', jobId);
  }, []);

  const handleDrop = useCallback(async (dayKey: string) => {
    const jobId = dragJobIdRef.current;
    if (!jobId) return;
    dragJobIdRef.current = null;

    try {
      await ops.updateJob(jobId, { deadline_at: `${dayKey}T18:00:00.000Z` });
    } catch {
      // silently fail — user sees no change
    }
  }, [ops]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Filter active (non-closed) jobs
  const activeJobs = useMemo(() => {
    let filtered = jobs.filter((j) => !isClosedStatus(j.status));
    if (filterOwner !== 'all') {
      filtered = filterOwner === 'none'
        ? filtered.filter((j) => !j.owner_id)
        : filtered.filter((j) => j.owner_id === filterOwner);
    }
    if (filterClient !== 'all') {
      filtered = filtered.filter((j) => j.client_id === filterClient);
    }
    return filtered;
  }, [jobs, filterOwner, filterClient]);

  // Build day columns
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 5; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  const columns: DayColumn[] = useMemo(() => {
    return weekDays.map((d) => {
      const key = dateKey(d);
      const dayJobs = activeJobs.filter((j) => jobDateKey(j) === key);
      return {
        date: d,
        key,
        label: formatDayHeader(d),
        today: isToday(d),
        jobs: dayJobs,
        totalMinutes: dayJobs.reduce((sum, j) => sum + Number(j.estimated_minutes || 0), 0),
      };
    });
  }, [weekDays, activeJobs]);

  const backlogJobs = useMemo(() => {
    const weekKeys = new Set(columns.map((c) => c.key));
    return activeJobs.filter((j) => {
      const dk = jobDateKey(j);
      return !dk || !weekKeys.has(dk);
    });
  }, [activeJobs, columns]);

  // Team capacity per day (all owners' daily capacity summed)
  const teamCapacityPerDay = useMemo(() => {
    const weeklyMinutes = owners.reduce((sum, o) => {
      if (o.person_type === 'freelancer') return sum + 16 * 60;
      if (o.role === 'admin' || o.role === 'manager') return sum + 22 * 60;
      return sum + 28 * 60;
    }, 0);
    return Math.round(weeklyMinutes / 5);
  }, [owners]);

  // Summary stats
  const totalWeekMinutes = columns.reduce((s, c) => s + c.totalMinutes, 0);
  const totalWeekJobs = columns.reduce((s, c) => s + c.jobs.length, 0);
  const criticalJobs = activeJobs.filter((j) => getRisk(j).level === 'critical').length;

  // Active clients for filter
  const activeClients = useMemo(() => {
    const map = new Map<string, string>();
    activeJobs.forEach((j) => {
      if (j.client_id && j.client_name) map.set(j.client_id, j.client_name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [activeJobs]);

  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) : null;

  const summary = (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
      {[
        { value: totalWeekJobs, label: 'Jobs', color: theme.palette.primary.main },
        { value: formatMinutes(totalWeekMinutes), label: 'Estimado', color: theme.palette.success.main },
        { value: backlogJobs.length, label: 'Sem data', color: backlogJobs.length > 5 ? theme.palette.warning.main : alpha(theme.palette.text.primary, 0.5) },
        { value: criticalJobs, label: 'Críticos', color: criticalJobs > 0 ? theme.palette.error.main : alpha(theme.palette.text.primary, 0.5) },
      ].map((kpi) => (
        <Stack key={kpi.label} direction="row" spacing={0.5} alignItems="baseline">
          <Typography variant="body1" sx={{ fontWeight: 900, color: kpi.color, lineHeight: 1 }}>
            {kpi.value}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.68rem' }}>
            {kpi.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );

  return (
    <OperationsShell section="semana" summary={summary}>
      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={400} />
        </Stack>
      ) : (
        <Stack spacing={0}>
          {/* ─── Toolbar ─── */}
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderRadius: '12px 12px 0 0',
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: dark ? alpha(theme.palette.background.paper, 0.5) : theme.palette.background.paper,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
              {/* Week nav */}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconCalendarWeek size={18} />
                <IconButton size="small" onClick={goPrev}><IconChevronLeft size={18} /></IconButton>
                <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 160, textAlign: 'center', textTransform: 'capitalize' }}>
                  {formatWeekRange(weekStart)}
                </Typography>
                <IconButton size="small" onClick={goNext}><IconChevronRight size={18} /></IconButton>
                <Button size="small" onClick={goToday} sx={{ fontWeight: 700, minWidth: 0 }}>Hoje</Button>
              </Stack>

              {/* Filters */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Select
                  size="small"
                  value={filterOwner}
                  onChange={(e) => setFilterOwner(e.target.value)}
                  sx={{ minWidth: 130, height: 32, fontSize: '0.8rem', fontWeight: 700 }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="none">Sem dono</MenuItem>
                  {owners.map((o) => (
                    <MenuItem key={o.id} value={o.id}>{o.name?.split(' ')[0]}</MenuItem>
                  ))}
                </Select>
                <Select
                  size="small"
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  sx={{ minWidth: 130, height: 32, fontSize: '0.8rem', fontWeight: 700 }}
                >
                  <MenuItem value="all">Clientes</MenuItem>
                  {activeClients.map(([id, name]) => (
                    <MenuItem key={id} value={id}>{name}</MenuItem>
                  ))}
                </Select>
                <IconButton size="small" onClick={() => refresh()}>
                  <IconRefresh size={16} />
                </IconButton>
              </Stack>

              {/* Legend */}
              <OwnerLegend owners={owners} jobs={activeJobs} />
            </Stack>
          </Box>

          {/* ─── Week Grid ─── */}
          <Box
            sx={{
              display: 'flex',
              border: `1px solid ${theme.palette.divider}`,
              borderTop: 'none',
              minHeight: 360,
              bgcolor: dark ? alpha(theme.palette.background.paper, 0.3) : alpha(theme.palette.background.paper, 0.7),
            }}
          >
            {columns.map((col) => (
              <DayColumnView
                key={col.key}
                col={col}
                owners={owners}
                teamCapacityPerDay={teamCapacityPerDay}
                selectedJobId={selectedJobId}
                onSelectJob={handleSelectJob}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              />
            ))}
          </Box>

          {/* ─── Publications ─── */}
          <Box
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderTop: 'none',
              bgcolor: dark ? alpha(theme.palette.background.paper, 0.3) : alpha(theme.palette.background.paper, 0.7),
            }}
          >
            <PublicationsRow jobs={activeJobs} />
          </Box>

          {/* ─── Backlog ─── */}
          <Box
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              bgcolor: dark ? alpha(theme.palette.background.paper, 0.3) : alpha(theme.palette.background.paper, 0.7),
            }}
          >
            <BacklogRow
              jobs={backlogJobs}
              owners={owners}
              selectedJobId={selectedJobId}
              onSelectJob={handleSelectJob}
              onDragStart={handleDragStart}
            />
          </Box>
        </Stack>
      )}

      {/* ─── Job Detail Drawer ─── */}
      <JobWorkbenchDrawer
        open={drawerOpen}
        mode="edit"
        job={selectedJob || null}
        jobTypes={lookups.jobTypes}
        skills={lookups.skills}
        channels={lookups.channels}
        clients={lookups.clients}
        owners={lookups.owners}
        currentUserId={ops.currentUserId}
        onClose={() => { setDrawerOpen(false); setSelectedJobId(null); }}
        onCreate={async (payload) => ops.createJob(payload)}
        onUpdate={async (id, payload) => ops.updateJob(id, payload)}
        onStatusChange={async (id, status, reason) => ops.changeStatus(id, status, reason)}
        onFetchDetail={async (id) => ops.fetchJob(id)}
      />
    </OperationsShell>
  );
}
