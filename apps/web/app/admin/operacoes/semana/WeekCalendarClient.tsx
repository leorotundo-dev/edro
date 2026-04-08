'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import OperationsShell from '@/components/operations/OperationsShell';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { isClosedStatus, sortByOperationalPriority } from '@/components/operations/derived';
import {
  STATUS_VISUALS,
  initials,
  InlineOwnerAssign,
  DeadlineCountdown,
} from '@/components/operations/primitives';
import {
  getRisk,
  type OperationsJob,
  type OperationsOwner,
} from '@/components/operations/model';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import { useJarvisPage } from '@/hooks/useJarvisPage';

import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconCalendarWeek,
  IconChevronLeft,
  IconChevronRight,
  IconFlag,
  IconLayoutKanban,
  IconRefresh,
  IconUserOff,
  IconUsers,
} from '@tabler/icons-react';

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */

const DAY_PX = 46;         // pixels per day
const ROW_H = 52;          // px per job row
const GROUP_H = 36;        // px per group header
const LEFT_W = 240;        // px left panel
const WINDOW_DAYS = 35;    // total days visible in timeline
const DAYS_BEFORE = 7;     // days before today visible

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function parseDate(str?: string | null): Date | null {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return startOfDay(d);
}

function formatDayHeader(d: Date): { dayNum: string; weekday: string } {
  return {
    dayNum: String(d.getDate()).padStart(2, '0'),
    weekday: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d).replace('.', ''),
  };
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function checklistPct(job: OperationsJob): number | null {
  const items = job.checklists?.flatMap((c) => c.items) ?? [];
  if (!items.length) return null;
  return Math.round((items.filter((i) => i.checked).length / items.length) * 100);
}

function ownerColor(ownerId: string | null | undefined, owners: OperationsOwner[]): string {
  const COLORS = ['#5D87FF', '#E85219', '#49BEFF', '#13DEB9', '#FFAE1F', '#FA896B', '#7C5DFA', '#D63384'];
  if (!ownerId) return '#888';
  const idx = owners.findIndex((o) => o.id === ownerId);
  return COLORS[idx >= 0 ? idx % COLORS.length : 0];
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ═══════════════════════════════════════════
   STATUS GROUPS
═══════════════════════════════════════════ */

const STATUS_GROUPS = [
  { key: 'active',   label: 'Em Produção',        statuses: ['allocated', 'in_progress'] },
  { key: 'queue',    label: 'Fila',                statuses: ['intake', 'planned', 'ready'] },
  { key: 'review',   label: 'Revisão / Aprovação', statuses: ['in_review', 'awaiting_approval', 'approved'] },
  { key: 'blocked',  label: 'Bloqueado',           statuses: ['blocked'] },
  { key: 'closing',  label: 'Agendado / Entregue', statuses: ['scheduled', 'published', 'done'] },
] as const;

function getGroupKey(status: string): string {
  for (const g of STATUS_GROUPS) {
    if ((g.statuses as readonly string[]).includes(status)) return g.key;
  }
  return 'queue';
}

/* ═══════════════════════════════════════════
   GANTT BAR
═══════════════════════════════════════════ */

function GanttBar({
  job,
  windowStart,
  onClick,
  onAssign,
  owners,
}: {
  job: OperationsJob;
  windowStart: Date;
  onClick: () => void;
  onAssign?: (jobId: string, ownerId: string) => void;
  owners?: OperationsOwner[];
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const startDate = parseDate(job.start_date || job.created_at);
  const endDate = parseDate(job.deadline_at);

  if (!startDate && !endDate) {
    return (
      <Box sx={{ height: ROW_H, display: 'flex', alignItems: 'center', px: 1 }}>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>Sem datas</Typography>
      </Box>
    );
  }

  const start = startDate ?? endDate!;
  const end = endDate ?? addDays(start, 7);

  const leftDays = daysBetween(windowStart, start);
  const spanDays = Math.max(1, daysBetween(start, end) + 1);

  const left = leftDays * DAY_PX;
  const width = spanDays * DAY_PX - 4;

  const vis = STATUS_VISUALS[job.status] || STATUS_VISUALS.intake;
  const barColor = job.client_brand_color || vis.color;
  const pct = checklistPct(job);
  const isOverdue = endDate ? endDate < startOfDay(new Date()) : false;
  const isUrgent = job.is_urgent || job.priority_band === 'p0' || getRisk(job).level === 'critical';

  return (
    <Box sx={{ position: 'relative', height: ROW_H }}>
      <Tooltip
        arrow
        placement="top"
        title={
          <Stack spacing={0.4} sx={{ p: 0.25 }}>
            <Typography variant="body2" fontWeight={800}>{job.title}</Typography>
            <Typography variant="caption" color="text.secondary">{job.client_name}</Typography>
            {job.deadline_at && <DeadlineCountdown deadline={job.deadline_at} compact />}
          </Stack>
        }
      >
        <Box
          onClick={onClick}
          sx={{
            position: 'absolute',
            left: `${left}px`,
            width: `${Math.max(width, 40)}px`,
            top: 8,
            height: ROW_H - 16,
            borderRadius: 2,
            bgcolor: alpha(barColor, dark ? 0.22 : 0.14),
            border: `1.5px solid ${alpha(barColor, isOverdue ? 0.85 : 0.45)}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            px: 0.75,
            gap: 0.5,
            overflow: 'hidden',
            transition: 'all 130ms ease',
            '&:hover': {
              bgcolor: alpha(barColor, dark ? 0.35 : 0.24),
              transform: 'scaleY(1.06)',
              boxShadow: `0 3px 12px ${alpha(barColor, 0.3)}`,
            },
            ...(isUrgent && {
              borderColor: alpha('#FA896B', 0.85),
              animation: 'gantt-pulse 2s ease-in-out infinite',
              '@keyframes gantt-pulse': {
                '0%,100%': { boxShadow: `0 0 0 0 ${alpha('#FA896B', 0)}` },
                '50%': { boxShadow: `0 0 0 3px ${alpha('#FA896B', 0.25)}` },
              },
            }),
          }}
        >
          {/* Owner avatar */}
          {job.owner_name ? (
            <Tooltip title={job.owner_name} arrow>
              <Avatar
                src={job.owner_avatar_url ?? undefined}
                sx={{ width: 20, height: 20, fontSize: '0.45rem', fontWeight: 900, bgcolor: alpha('#5D87FF', 0.2), color: '#5D87FF', flexShrink: 0 }}
              >
                {initials(job.owner_name)}
              </Avatar>
            </Tooltip>
          ) : null}

          {/* Title */}
          <Typography noWrap sx={{ fontSize: '0.74rem', fontWeight: 700, flex: 1, color: dark ? alpha(barColor, 0.9) : barColor, lineHeight: 1.2 }}>
            {job.title}
          </Typography>

          {/* Urgent flag */}
          {isUrgent && <Box sx={{ color: '#FA896B', display: 'flex', flexShrink: 0 }}><IconFlag size={12} /></Box>}

          {/* Progress % */}
          {pct !== null && (
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: alpha(barColor, 0.85), flexShrink: 0 }}>
              {pct}%
            </Typography>
          )}

          {/* Progress fill bar at bottom */}
          {pct !== null && pct > 0 && (
            <Box sx={{
              position: 'absolute', bottom: 0, left: 0,
              height: 3, width: `${pct}%`,
              bgcolor: barColor, borderRadius: '0 0 8px 8px',
              opacity: 0.65,
            }} />
          )}
        </Box>
      </Tooltip>
    </Box>
  );
}

/* ═══════════════════════════════════════════
   GANTT VIEW
═══════════════════════════════════════════ */

function GanttView({
  jobs,
  owners,
  onOpenJob,
  onAssign,
}: {
  jobs: OperationsJob[];
  owners: OperationsOwner[];
  onOpenJob: (job: OperationsJob) => void;
  onAssign: (jobId: string, ownerId: string) => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const windowStart = useMemo(() => addDays(today, -DAYS_BEFORE), [today]);
  const windowDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < WINDOW_DAYS; i++) days.push(addDays(windowStart, i));
    return days;
  }, [windowStart]);

  const todayOffset = daysBetween(windowStart, today) * DAY_PX;
  const totalWidth = WINDOW_DAYS * DAY_PX;

  // Group jobs by status group, sorted by deadline within group
  const groups = useMemo(() => {
    return STATUS_GROUPS
      .map((g) => ({
        ...g,
        jobs: jobs
          .filter((j) => getGroupKey(j.status) === g.key)
          .sort((a, b) => {
            const da = parseDate(a.deadline_at)?.getTime() ?? Infinity;
            const db = parseDate(b.deadline_at)?.getTime() ?? Infinity;
            return da - db;
          }),
      }))
      .filter((g) => g.jobs.length > 0);
  }, [jobs]);

  // Month groupings for header
  const monthGroups = useMemo(() => {
    const groups: { label: string; startIdx: number; count: number }[] = [];
    let currentMonth = '';
    windowDays.forEach((d, i) => {
      const mLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(d);
      if (mLabel !== currentMonth) {
        currentMonth = mLabel;
        groups.push({ label: mLabel, startIdx: i, count: 1 });
      } else {
        groups[groups.length - 1].count++;
      }
    });
    return groups;
  }, [windowDays]);

  const borderColor = dark ? alpha('#fff', 0.06) : alpha('#000', 0.07);
  const todayColor = theme.palette.primary.main;

  // Cell background per day
  const dayCellBg = (d: Date) => {
    if (isWeekend(d)) return dark ? alpha('#fff', 0.015) : alpha('#000', 0.015);
    if (dateKey(d) === dateKey(today)) return alpha(todayColor, dark ? 0.06 : 0.04);
    return 'transparent';
  };

  return (
    <Box sx={{ display: 'flex', borderRadius: 2, border: `1px solid ${borderColor}`, overflow: 'hidden', bgcolor: dark ? alpha('#fff', 0.02) : '#fff' }}>

      {/* ── Left panel ── */}
      <Box sx={{ width: LEFT_W, flexShrink: 0, borderRight: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
        {/* Month header spacer (same height as timeline month row) */}
        <Box sx={{ height: 24, borderBottom: `1px solid ${borderColor}`, bgcolor: dark ? alpha('#fff', 0.02) : alpha('#000', 0.02), flexShrink: 0 }} />
        {/* Day header spacer */}
        <Box sx={{ height: 40, borderBottom: `1px solid ${borderColor}`, bgcolor: dark ? alpha('#fff', 0.02) : alpha('#000', 0.02), display: 'flex', alignItems: 'center', px: 1.5, flexShrink: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.6rem', color: 'text.disabled' }}>
            Job
          </Typography>
        </Box>

        {/* Groups + rows */}
        {groups.map((g) => (
          <Box key={g.key}>
            {/* Group header */}
            <Box sx={{
              height: GROUP_H, px: 1.5, display: 'flex', alignItems: 'center', gap: 0.75,
              bgcolor: dark ? alpha('#fff', 0.025) : alpha('#000', 0.025),
              borderBottom: `1px solid ${borderColor}`,
              flexShrink: 0,
            }}>
              <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
                {g.label}
              </Typography>
              <Chip size="small" label={g.jobs.length} sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, '& .MuiChip-label': { px: 0.75 } }} />
            </Box>

            {/* Job rows */}
            {g.jobs.map((job) => {
              const vis = STATUS_VISUALS[job.status] || STATUS_VISUALS.intake;
              const accent = job.client_brand_color || vis.color;
              return (
                <Box
                  key={job.id}
                  onClick={() => onOpenJob(job)}
                  sx={{
                    height: ROW_H, px: 1.25, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', gap: 0.3,
                    borderBottom: `1px solid ${borderColor}`,
                    borderLeft: `3px solid ${alpha(accent, 0.7)}`,
                    cursor: 'pointer', transition: 'background 120ms',
                    '&:hover': { bgcolor: alpha(accent, dark ? 0.06 : 0.04) },
                    minWidth: 0,
                  }}
                >
                  <Typography noWrap variant="caption" sx={{ fontWeight: 700, fontSize: '0.78rem', lineHeight: 1.2 }}>
                    {job.title}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {job.client_logo_url ? (
                      <Avatar src={job.client_logo_url} sx={{ width: 14, height: 14, borderRadius: '3px' }} />
                    ) : null}
                    <Typography noWrap variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled', lineHeight: 1 }}>
                      {job.client_name || '—'}
                    </Typography>
                    {!job.owner_id && (
                      <Box onClick={(e) => e.stopPropagation()}>
                        <InlineOwnerAssign owners={owners} onAssign={(ownerId) => onAssign(job.id, ownerId)} />
                      </Box>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* ── Right: scrollable timeline ── */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowX: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* Sticky header wrapper */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: dark ? '#101020' : '#fff', flexShrink: 0 }}>
          {/* Month row */}
          <Box sx={{ display: 'flex', height: 24, borderBottom: `1px solid ${borderColor}`, width: totalWidth }}>
            {monthGroups.map((mg) => (
              <Box
                key={mg.label + mg.startIdx}
                sx={{
                  width: mg.count * DAY_PX, flexShrink: 0, display: 'flex', alignItems: 'center',
                  px: 1, borderRight: `1px solid ${borderColor}`,
                  bgcolor: dark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary' }}>
                  {mg.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Day header row */}
          <Box sx={{ display: 'flex', height: 40, borderBottom: `1px solid ${borderColor}`, width: totalWidth }}>
            {windowDays.map((d, i) => {
              const isT = dateKey(d) === dateKey(today);
              const { dayNum, weekday } = formatDayHeader(d);
              return (
                <Box
                  key={i}
                  sx={{
                    width: DAY_PX, flexShrink: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 0.1,
                    borderRight: `1px solid ${alpha(borderColor, 0.5)}`,
                    bgcolor: isT ? alpha(todayColor, dark ? 0.1 : 0.06) : dayCellBg(d),
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, color: isT ? todayColor : isWeekend(d) ? 'text.disabled' : 'text.secondary', lineHeight: 1, textTransform: 'capitalize' }}>
                    {weekday}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.78rem', fontWeight: isT ? 900 : 700, color: isT ? todayColor : isWeekend(d) ? 'text.disabled' : 'text.primary', lineHeight: 1 }}>
                    {dayNum}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Timeline body */}
        <Box sx={{ position: 'relative', minWidth: totalWidth, flex: 1 }}>
          {/* Day column backgrounds */}
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', pointerEvents: 'none', zIndex: 0 }}>
            {windowDays.map((d, i) => (
              <Box key={i} sx={{ width: DAY_PX, flexShrink: 0, height: '100%', bgcolor: dayCellBg(d), borderRight: `1px solid ${alpha(borderColor, 0.4)}` }} />
            ))}
          </Box>

          {/* Today vertical line */}
          <Box sx={{
            position: 'absolute', top: 0, bottom: 0,
            left: todayOffset + DAY_PX / 2,
            width: 2, bgcolor: todayColor, opacity: 0.6,
            zIndex: 1, pointerEvents: 'none',
          }} />

          {/* Groups + bars */}
          {groups.map((g) => (
            <Box key={g.key}>
              {/* Group header spacer */}
              <Box sx={{ height: GROUP_H, borderBottom: `1px solid ${borderColor}`, bgcolor: dark ? alpha('#fff', 0.015) : alpha('#000', 0.015) }} />

              {/* Job bar rows */}
              {g.jobs.map((job) => (
                <Box key={job.id} sx={{ borderBottom: `1px solid ${alpha(borderColor, 0.6)}`, position: 'relative', zIndex: 1 }}>
                  <GanttBar
                    job={job}
                    windowStart={windowStart}
                    onClick={() => onOpenJob(job)}
                    onAssign={onAssign}
                    owners={owners}
                  />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════
   DISTRIBUTION VIEW (preserved)
═══════════════════════════════════════════ */

function DistCell({
  jobs,
  col,
  owners,
  borderColor,
  dragJobIdRef,
  onOpenJob,
}: {
  jobs: OperationsJob[];
  col: { key: string; today: boolean };
  owners: OperationsOwner[];
  borderColor: string;
  dragJobIdRef: React.MutableRefObject<string | null>;
  onOpenJob: (job: OperationsJob) => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [dragOver, setDragOver] = useState(false);

  return (
    <Box
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => setDragOver(false)}
      sx={{
        minHeight: 64, p: 0.5,
        borderRight: `1px solid ${alpha(borderColor, 0.5)}`,
        '&:last-child': { borderRight: 'none' },
        bgcolor: dragOver ? alpha(theme.palette.primary.main, 0.08) : col.today ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
        display: 'flex', flexDirection: 'column', gap: 0.4,
      }}
    >
      {jobs.sort(sortByOperationalPriority).map((job) => {
        const color = ownerColor(job.owner_id, owners);
        return (
          <Box
            key={job.id}
            draggable
            onDragStart={(e) => { dragJobIdRef.current = job.id; e.dataTransfer.effectAllowed = 'move'; }}
            onClick={() => onOpenJob(job)}
            sx={{
              px: 0.75, py: 0.4, borderRadius: 1,
              borderLeft: `3px solid ${color}`,
              bgcolor: dark ? alpha('#fff', 0.04) : alpha('#000', 0.03),
              cursor: 'grab', overflow: 'hidden',
              '&:active': { cursor: 'grabbing' },
              '&:hover': { bgcolor: alpha(color, dark ? 0.14 : 0.08) },
            }}
          >
            <Typography variant="caption" noWrap sx={{ fontWeight: 700, fontSize: '0.7rem', lineHeight: 1.25, display: 'block' }}>
              {job.title}
            </Typography>
            <Typography variant="caption" noWrap sx={{ fontSize: '0.62rem', color: 'text.disabled', lineHeight: 1 }}>
              {job.client_name}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

const OWNER_ALLOCABLE = (owner: OperationsOwner) =>
  owner.person_type === 'freelancer' ? 16 * 60 : owner.role === 'admin' || owner.role === 'manager' ? 22 * 60 : 28 * 60;

function jobDeadlineKey(job: OperationsJob): string | null {
  const alloc = job.metadata?.allocation as { planned_date?: string } | undefined;
  const dateStr = alloc?.planned_date || job.deadline_at;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return dateKey(startOfDay(d));
}

function DistributionView({
  jobs,
  owners,
  onOpenJob,
  onAssign,
  onAdvance,
}: {
  jobs: OperationsJob[];
  owners: OperationsOwner[];
  onOpenJob: (job: OperationsJob) => void;
  onAssign: (jobId: string, ownerId: string) => void;
  onAdvance: (jobId: string, nextStatus: string) => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const dragJobIdRef = useRef<string | null>(null);
  const [weekStart] = useState(() => startOfWeek(new Date()));

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 5; i++) days.push(addDays(weekStart, i));
    return days;
  }, [weekStart]);

  const cols = weekDays.map((d) => ({ date: d, key: dateKey(d), today: dateKey(d) === dateKey(new Date()) }));
  const gridCols = `${LEFT_W}px repeat(5, minmax(0, 1fr))`;
  const borderColor = dark ? alpha('#fff', 0.07) : alpha('#000', 0.07);
  const headerBg = dark ? alpha('#fff', 0.025) : alpha('#000', 0.025);

  const ownerJobMap = useMemo(() => {
    const map = new Map<string, Map<string, OperationsJob[]>>();
    for (const owner of [...owners, { id: null } as any]) {
      const dayMap = new Map<string, OperationsJob[]>();
      for (const col of cols) dayMap.set(col.key, []);
      map.set(owner.id ?? '__none__', dayMap);
    }
    for (const job of jobs) {
      const oid = job.owner_id ?? '__none__';
      const dk = jobDeadlineKey(job);
      const dayMap = map.get(oid);
      if (!dayMap) continue;
      const bucket = dk ? (dayMap.get(dk) ?? null) : null;
      if (bucket) bucket.push(job);
    }
    return map;
  }, [owners, cols, jobs]);

  const handleDrop = useCallback(async (dayKey: string, ownerId: string | null, ops: ReturnType<typeof useOperationsData>) => {
    const jobId = dragJobIdRef.current;
    if (!jobId) return;
    dragJobIdRef.current = null;
    const payload: Record<string, any> = { deadline_at: `${dayKey}T18:00:00.000Z` };
    if (ownerId) payload.owner_id = ownerId;
    try { await ops.updateJob(jobId, payload); } catch { /* silent */ }
  }, []);

  return (
    <Box sx={{ border: `1px solid ${borderColor}`, borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: `1px solid ${borderColor}`, bgcolor: headerBg }}>
        <Box sx={{ px: 1.5, py: 1, borderRight: `1px solid ${borderColor}` }}>
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.6rem', color: 'text.disabled' }}>Pessoa</Typography>
        </Box>
        {cols.map((col) => (
          <Box key={col.key} sx={{ px: 1, py: 1, borderRight: `1px solid ${alpha(borderColor, 0.5)}`, '&:last-child': { borderRight: 'none' }, textAlign: 'center', bgcolor: col.today ? alpha(theme.palette.primary.main, 0.06) : undefined }}>
            <Typography variant="caption" sx={{ fontWeight: col.today ? 900 : 700, fontSize: '0.72rem', textTransform: 'capitalize', color: col.today ? theme.palette.primary.main : undefined }}>
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit' }).format(col.date)}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Rows */}
      {[...owners, null].map((ownerObj) => {
        const ownerId = ownerObj?.id ?? null;
        const mapKey = ownerId ?? '__none__';
        const dayMap = ownerJobMap.get(mapKey);
        if (!dayMap) return null;
        const allJobs = Array.from(dayMap.values()).flat();
        if (ownerId !== null && allJobs.length === 0) return null;
        const allocable = ownerObj ? OWNER_ALLOCABLE(ownerObj) : 40 * 60;
        const totalMins = allJobs.reduce((s, j) => s + (j.estimated_minutes || 0), 0);
        const usage = allocable > 0 ? Math.min(totalMins / allocable, 1.4) : 0;
        const usageColor = usage > 1 ? '#FA896B' : usage > 0.8 ? '#FFAE1F' : '#13DEB9';
        const name = ownerObj?.name || 'Sem dono';

        return (
          <Box key={mapKey} sx={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: `1px solid ${borderColor}`, minHeight: 64, '&:last-child': { borderBottom: 'none' } }}>
            {/* Owner cell */}
            <Box sx={{ px: 1.25, py: 0.75, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5, borderRight: `1px solid ${borderColor}`, bgcolor: headerBg }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                {ownerObj ? (
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', bgcolor: ownerColor(ownerId, owners), flexShrink: 0 }}>
                    {name.charAt(0).toUpperCase()}
                  </Avatar>
                ) : (
                  <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                    <IconUserOff size={14} />
                  </Box>
                )}
                <Stack sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.72rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name.split(' ')[0]}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: alpha(theme.palette.text.primary, 0.5), lineHeight: 1 }}>
                    {allJobs.length} jobs
                  </Typography>
                </Stack>
              </Stack>
              <Box sx={{ width: '100%', height: 3, borderRadius: 1, bgcolor: alpha(usageColor, 0.18) }}>
                <Box sx={{ height: 3, borderRadius: 1, width: `${Math.min(100, Math.round(usage * 100))}%`, bgcolor: usageColor }} />
              </Box>
            </Box>

            {/* Day cells */}
            {cols.map((col) => (
              <DistCell
                key={col.key}
                jobs={dayMap.get(col.key) ?? []}
                col={col}
                owners={owners}
                borderColor={borderColor}
                dragJobIdRef={dragJobIdRef}
                onOpenJob={onOpenJob}
              />
            ))}
          </Box>
        );
      })}
    </Box>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

type ViewMode = 'gantt' | 'distribution';

export default function WeekCalendarClient() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const ops = useOperationsData('?active=true');
  const { jobs, lookups, loading, error, refresh } = ops;
  const owners = lookups.owners;

  const [viewMode, setViewMode] = useState<ViewMode>('gantt');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openJob = useCallback((job: OperationsJob) => {
    setSelectedJobId(job.id);
    setDrawerOpen(true);
  }, []);

  const handleAssign = useCallback(async (jobId: string, ownerId: string) => {
    await ops.updateJob(jobId, { owner_id: ownerId });
  }, [ops]);

  const handleAdvance = useCallback(async (jobId: string, nextStatus: string) => {
    await ops.changeStatus(jobId, nextStatus);
  }, [ops]);

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

  const activeClients = useMemo(() => {
    const map = new Map<string, string>();
    activeJobs.forEach((j) => { if (j.client_id && j.client_name) map.set(j.client_id, j.client_name); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [activeJobs]);

  const criticalJobs = activeJobs.filter((j) => getRisk(j).level === 'critical').length;
  const noDateJobs = activeJobs.filter((j) => !j.deadline_at && !j.start_date && !j.created_at).length;
  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) : null;

  useJarvisPage(
    {
      screen: 'operations_gantt',
      clientId: selectedJob?.client_id ?? null,
      currentJobId: selectedJob?.id ?? null,
      currentJobTitle: selectedJob?.title ?? null,
      currentJobStatus: selectedJob?.status ?? null,
    },
    [selectedJob?.id, selectedJob?.client_id, selectedJob?.title, selectedJob?.status]
  );

  const summary = (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
      {[
        { value: activeJobs.length, label: 'Jobs ativos', color: theme.palette.primary.main },
        { value: criticalJobs, label: 'Críticos', color: criticalJobs > 0 ? theme.palette.error.main : alpha(theme.palette.text.primary, 0.4) },
        { value: noDateJobs, label: 'Sem data', color: noDateJobs > 3 ? theme.palette.warning.main : alpha(theme.palette.text.primary, 0.4) },
      ].map((kpi) => (
        <Stack key={kpi.label} direction="row" spacing={0.5} alignItems="baseline">
          <Typography variant="body1" sx={{ fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.68rem' }}>{kpi.label}</Typography>
        </Stack>
      ))}
    </Stack>
  );

  return (
    <OperationsShell section="semana" summary={summary}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={480} />
        </Stack>
      ) : (
        <Stack spacing={2}>
          {/* ── Toolbar ── */}
          <Box sx={{
            px: 2, py: 1.25, borderRadius: 2,
            border: `1px solid ${dark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
            bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <IconCalendarWeek size={18} />
                <Typography variant="body2" sx={{ fontWeight: 800 }}>Semana · Gantt</Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                {/* Filters */}
                {owners.length > 0 && (
                  <Select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} size="small"
                    sx={{ fontSize: '0.75rem', fontWeight: 700, height: 32, minWidth: 120 }}>
                    <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>Todos</MenuItem>
                    <MenuItem value="none" sx={{ fontSize: '0.75rem' }}>Sem dono</MenuItem>
                    {owners.map((o) => <MenuItem key={o.id} value={o.id} sx={{ fontSize: '0.75rem' }}>{o.name}</MenuItem>)}
                  </Select>
                )}
                {activeClients.length > 1 && (
                  <Select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} size="small"
                    sx={{ fontSize: '0.75rem', fontWeight: 700, height: 32, minWidth: 130 }}>
                    <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>Todos clientes</MenuItem>
                    {activeClients.map(([id, name]) => <MenuItem key={id} value={id} sx={{ fontSize: '0.75rem' }}>{name}</MenuItem>)}
                  </Select>
                )}

                {/* View toggle */}
                <Box sx={{ display: 'flex', borderRadius: 1.5, overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                  {([
                    { mode: 'gantt' as ViewMode, icon: <IconLayoutKanban size={15} />, label: 'Gantt' },
                    { mode: 'distribution' as ViewMode, icon: <IconUsers size={15} />, label: 'Por pessoa' },
                  ] as const).map(({ mode, icon, label }) => (
                    <Button
                      key={mode}
                      size="small"
                      startIcon={icon}
                      onClick={() => setViewMode(mode)}
                      sx={{
                        borderRadius: 0, px: 1.25, py: 0.5, fontWeight: 700, fontSize: '0.72rem',
                        bgcolor: viewMode === mode ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                        color: viewMode === mode ? theme.palette.primary.main : 'text.secondary',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </Box>

                <Tooltip title="Atualizar">
                  <IconButton size="small" onClick={refresh}><IconRefresh size={16} /></IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>

          {/* ── View ── */}
          {viewMode === 'gantt' && (
            <GanttView jobs={activeJobs} owners={owners} onOpenJob={openJob} onAssign={handleAssign} />
          )}

          {viewMode === 'distribution' && (
            <DistributionView jobs={activeJobs} owners={owners} onOpenJob={openJob} onAssign={handleAssign} onAdvance={handleAdvance} />
          )}
        </Stack>
      )}

      {/* Job drawer */}
      <JobWorkbenchDrawer
        open={drawerOpen}
        jobId={selectedJobId}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={(jobId, status) => ops.changeStatus(jobId, status).catch(() => {})}
        onAssign={(jobId, ownerId) => ops.updateJob(jobId, { owner_id: ownerId }).catch(() => {})}
        owners={owners}
      />
    </OperationsShell>
  );
}
