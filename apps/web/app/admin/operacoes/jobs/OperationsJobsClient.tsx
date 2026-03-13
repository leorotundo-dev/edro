'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconChevronDown,
  IconChevronRight,
  IconFilter,
  IconLayoutKanban,
  IconList,
  IconSearch,
  IconUserOff,
  IconUrgent,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import { sortByOperationalPriority, groupJobsByClient, groupJobsByOwner, groupJobsByRisk, type GroupedSection } from '@/components/operations/derived';
import { getNextAction, getNextStatus, groupBy, STAGE_LABELS, type OperationsJob, type OperationsOwner } from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OPS_COPY } from '@/components/operations/copy';

/* ═══ Constants ═══ */

const STAGE_ORDER = ['intake', 'planned', 'ready', 'allocated', 'in_progress', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'done', 'blocked'];

const BUCKETS = [
  { key: 'entrou', label: 'Entrada', stages: ['intake', 'planned', 'ready'], dot: '#5D87FF' },
  { key: 'producao', label: 'Produção', stages: ['allocated', 'in_progress', 'in_review'], dot: '#13DEB9' },
  { key: 'esperando', label: 'Esperando', stages: ['awaiting_approval', 'approved', 'scheduled', 'blocked'], dot: '#FFAE1F' },
  { key: 'entregue', label: 'Entregue', stages: ['published', 'done'], dot: '#868e96' },
] as const;

const STATUS_DOTS: Record<string, string> = {
  intake: '#5D87FF', planned: '#5D87FF', ready: '#5D87FF',
  allocated: '#13DEB9', in_progress: '#13DEB9', in_review: '#13DEB9',
  awaiting_approval: '#FFAE1F', approved: '#FFAE1F', scheduled: '#FFAE1F', blocked: '#FA896B',
  published: '#868e96', done: '#868e96',
};

/* ═══ Helpers ═══ */

function ini(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function relDl(d?: string | null) {
  if (!d) return '';
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
  if (diff < -1) return `${Math.abs(diff)}d atrás`;
  if (diff === -1) return 'Ontem';
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return `${diff}d`;
}

function dlColor(d?: string | null): string {
  if (!d) return 'inherit';
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
  if (diff < 0) return '#FA896B';
  if (diff <= 1) return '#FFAE1F';
  return 'inherit';
}

/* ═══ Main Component ═══ */

export default function OperationsJobsClient() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const searchParams = useSearchParams();
  const shouldOpenComposer = searchParams.get('new') === '1';
  const shouldFilterUnassigned = searchParams.get('unassigned') === 'true';
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');

  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [view, setView] = useState<'board' | 'list'>('list');
  const [query, setQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<'status' | 'client' | 'owner' | 'risk'>('status');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  useEffect(() => {
    if (shouldOpenComposer) { setComposerOpen(true); setDetailOpen(false); }
  }, [shouldOpenComposer]);
  useEffect(() => { if (shouldFilterUnassigned) setQuickFilter('unassigned'); }, [shouldFilterUnassigned]);

  // Keep selectedJob fresh after data refreshes
  useEffect(() => {
    if (!selectedJob) return;
    const fresh = jobs.find((j) => j.id === selectedJob.id);
    if (fresh && fresh !== selectedJob) setSelectedJob(fresh);
  }, [jobs, selectedJob]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...jobs]
      .filter((j) => !statusFilter || j.status === statusFilter)
      .filter((j) => !priorityFilter || j.priority_band === priorityFilter)
      .filter((j) => !clientFilter || j.client_id === clientFilter)
      .filter((j) => !ownerFilter || j.owner_id === ownerFilter)
      .filter((j) => {
        if (quickFilter === 'urgent') return Boolean(j.is_urgent);
        if (quickFilter === 'unassigned') return !j.owner_id;
        return true;
      })
      .filter((j) => {
        if (!q) return true;
        return [j.title, j.summary, j.client_name, j.owner_name, j.required_skill]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      })
      .sort(sortByOperationalPriority);
  }, [jobs, statusFilter, priorityFilter, clientFilter, ownerFilter, quickFilter, query]);

  const grouped = useMemo(() => groupBy(filteredJobs, (j) => j.status), [filteredJobs]);

  const sections = useMemo((): GroupedSection[] => {
    if (groupMode === 'client') return groupJobsByClient(filteredJobs);
    if (groupMode === 'owner') return groupJobsByOwner(filteredJobs);
    if (groupMode === 'risk') return groupJobsByRisk(filteredJobs);
    return BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      color: b.dot,
      count: b.stages.flatMap((s) => grouped[s] || []).length,
      jobs: b.stages.flatMap((s) => grouped[s] || []),
    })).filter((s) => s.count > 0);
  }, [filteredJobs, groupMode, grouped]);

  const openJob = (job: OperationsJob) => { setComposerOpen(false); setSelectedJob(job); setDetailOpen(true); };
  const handleAdvance = async (jobId: string, next: string) => { await changeStatus(jobId, next); await refresh(); };
  const handleAssign = async (jobId: string, ownerId: string) => { await updateJob(jobId, { owner_id: ownerId }); await refresh(); };

  const hasFilters = Boolean(statusFilter || priorityFilter || clientFilter || ownerFilter || quickFilter);
  const filterCount = [statusFilter, priorityFilter, clientFilter, ownerFilter, quickFilter].filter(Boolean).length;
  const clearAll = () => { setStatusFilter(''); setPriorityFilter(''); setClientFilter(''); setOwnerFilter(''); setQuickFilter(null); };

  const bdr = dark ? alpha('#fff', 0.06) : alpha('#000', 0.06);

  return (
    <OperationsShell
      section="jobs"
      summary={
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {filteredJobs.length} demanda{filteredJobs.length !== 1 ? 's' : ''}
        </Typography>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
      ) : (
        <Box sx={{ border: `1px solid ${bdr}`, borderRadius: 2, overflow: 'hidden', bgcolor: dark ? alpha('#fff', 0.01) : '#fff' }}>
          {/* ─── Toolbar ─── */}
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1.5, py: 0.75, borderBottom: `1px solid ${bdr}`, flexWrap: 'nowrap', overflow: 'hidden' }}>
            <ViewTab active={view === 'board'} onClick={() => setView('board')} icon={<IconLayoutKanban size={14} />} label="Board" />
            <ViewTab active={view === 'list'} onClick={() => setView('list')} icon={<IconList size={14} />} label="Lista" />

            <Box sx={{ width: 1, height: 16, bgcolor: bdr, flexShrink: 0 }} />

            <TextField
              size="small" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              InputProps={{ startAdornment: <IconSearch size={14} style={{ opacity: 0.3, marginRight: 6 }} /> }}
              sx={{ width: 200, flexShrink: 0, '& .MuiOutlinedInput-root': { fontSize: '0.78rem', height: 30, bgcolor: dark ? alpha('#fff', 0.03) : alpha('#000', 0.025), borderRadius: 1.5, '& fieldset': { border: 'none' } } }}
            />

            <Pill active={quickFilter === 'urgent'} onClick={() => setQuickFilter(quickFilter === 'urgent' ? null : 'urgent')} icon={<IconUrgent size={13} />} label="Urgentes" />
            <Pill active={quickFilter === 'unassigned'} onClick={() => setQuickFilter(quickFilter === 'unassigned' ? null : 'unassigned')} icon={<IconUserOff size={13} />} label="Sem dono" />

            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <IconButton size="small" onClick={() => setFiltersOpen(!filtersOpen)} sx={{ color: hasFilters ? 'primary.main' : 'text.secondary' }}>
                <IconFilter size={15} />
              </IconButton>
              {filterCount > 0 && (
                <Box sx={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', fontSize: '0.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {filterCount}
                </Box>
              )}
            </Box>

            {hasFilters && (
              <Button size="small" onClick={clearAll} sx={{ fontSize: '0.68rem', textTransform: 'none', minWidth: 0, color: 'text.secondary', flexShrink: 0 }}>Limpar</Button>
            )}

            <Box sx={{ flex: 1 }} />

            {view === 'list' && <GroupByPicker value={groupMode} onChange={setGroupMode} />}
          </Stack>

          {/* ─── Filter row ─── */}
          <Collapse in={filtersOpen}>
            <Stack direction="row" spacing={1.5} sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${bdr}` }}>
              <CompactSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'Todos' }, ...STAGE_ORDER.map((s) => ({ value: s, label: STAGE_LABELS[s] || s }))]} />
              <CompactSelect label="Prioridade" value={priorityFilter} onChange={setPriorityFilter} options={[{ value: '', label: 'Todas' }, ...['p0', 'p1', 'p2', 'p3', 'p4'].map((p) => ({ value: p, label: p.toUpperCase() }))]} />
              <CompactSelect label="Cliente" value={clientFilter} onChange={setClientFilter} options={[{ value: '', label: 'Todos' }, ...lookups.clients.map((c) => ({ value: c.id, label: c.name }))]} />
              <CompactSelect label="Responsável" value={ownerFilter} onChange={setOwnerFilter} options={[{ value: '', label: 'Todos' }, ...lookups.owners.map((o) => ({ value: o.id, label: o.name }))]} />
            </Stack>
          </Collapse>

          {/* ─── Content ─── */}
          {filteredJobs.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Nenhuma demanda encontrada</Typography>
              <Button size="small" onClick={() => setComposerOpen(true)} sx={{ textTransform: 'none' }}>{OPS_COPY.shell.newDemand}</Button>
            </Box>
          ) : view === 'board' ? (
            <BoardView buckets={BUCKETS} grouped={grouped} onOpen={openJob} onAdvance={handleAdvance} />
          ) : (
            <ListView sections={sections} onOpen={openJob} onAdvance={handleAdvance} onAssign={handleAssign} owners={lookups.owners} />
          )}
        </Box>
      )}

      {/* ─── Drawers ─── */}
      <JobWorkbenchDrawer
        open={composerOpen}
        mode="create" job={null}
        jobTypes={lookups.jobTypes} skills={lookups.skills} channels={lookups.channels} clients={lookups.clients} owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setComposerOpen(false)}
        onCreate={async (payload) => { const c = await createJob(payload); await refresh(); setSelectedJob(c as OperationsJob); return c; }}
        onUpdate={updateJob} onStatusChange={changeStatus}
      />
      <JobWorkbenchDrawer
        open={detailOpen && Boolean(selectedJob)}
        mode="edit" job={selectedJob}
        jobTypes={lookups.jobTypes} skills={lookups.skills} channels={lookups.channels} clients={lookups.clients} owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setDetailOpen(false)}
        onCreate={createJob}
        onUpdate={async (id, p) => { const u = await updateJob(id, p); await refresh(); setSelectedJob(u as OperationsJob); return u; }}
        onStatusChange={async (id, s, r) => { const u = await changeStatus(id, s, r); await refresh(); setSelectedJob(u as OperationsJob); return u; }}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BOARD VIEW — Notion-style kanban columns
   ═══════════════════════════════════════════════════════════════════ */

const MAX_BOARD_CARDS = 6;

function BoardView({
  buckets,
  grouped,
  onOpen,
  onAdvance,
}: {
  buckets: typeof BUCKETS;
  grouped: Record<string, OperationsJob[]>;
  onOpen: (job: OperationsJob) => void;
  onAdvance: (jobId: string, next: string) => void;
}) {
  const columns = buckets.map((b) => ({ ...b, jobs: b.stages.flatMap((s) => grouped[s] || []) }));
  const nonEmpty = columns.filter((c) => c.jobs.length > 0);
  const empty = columns.filter((c) => c.jobs.length === 0);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ minHeight: 320, p: 0.75 }} spacing={0.5}>
      {nonEmpty.map((col) => (
        <BoardColumn key={col.key} label={col.label} dot={col.dot} jobs={col.jobs} onOpen={onOpen} onAdvance={onAdvance} />
      ))}
      {empty.length > 0 && (
        <Stack spacing={0.5} sx={{ minWidth: 80 }}>
          {empty.map((col) => (
            <Stack key={col.key} direction="row" spacing={0.5} alignItems="center" sx={{ px: 1, py: 0.5, opacity: 0.4 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: col.dot }} />
              <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>{col.label} 0</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function BoardColumn({ label, dot, jobs, onOpen, onAdvance }: {
  label: string; dot: string; jobs: OperationsJob[];
  onOpen: (job: OperationsJob) => void;
  onAdvance: (jobId: string, next: string) => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const visible = jobs.slice(0, MAX_BOARD_CARDS);
  const remaining = jobs.length - visible.length;

  return (
    <Box sx={{ flex: 1, minWidth: 0, bgcolor: dark ? alpha('#fff', 0.015) : alpha('#000', 0.018), borderRadius: 1.5, p: 0.75 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 0.75, py: 0.6 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dot }} />
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>{jobs.length}</Typography>
      </Stack>
      <Stack spacing={0.5}>
        {visible.map((job) => (
          <BoardCard key={job.id} job={job} onClick={() => onOpen(job)} onAdvance={onAdvance} />
        ))}
        {remaining > 0 && (
          <Typography
            onClick={() => onOpen(jobs[MAX_BOARD_CARDS])}
            sx={{ textAlign: 'center', py: 0.5, fontSize: '0.7rem', fontWeight: 600, color: dot, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          >
            +{remaining} mais
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function BoardCard({ job, onClick, onAdvance }: {
  job: OperationsJob; onClick: () => void;
  onAdvance: (jobId: string, next: string) => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const next = getNextStatus(job);

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.25, borderRadius: 1.5, cursor: 'pointer',
        bgcolor: dark ? alpha('#fff', 0.03) : '#fff',
        border: `1px solid ${dark ? alpha('#fff', 0.05) : alpha('#000', 0.05)}`,
        transition: 'all 100ms',
        '&:hover': {
          bgcolor: dark ? alpha('#fff', 0.055) : alpha('#000', 0.012),
          boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
          '& .board-advance': { opacity: 1 },
        },
      }}
    >
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.35, mb: 0.75, color: 'text.primary' }}>
        {job.title}
      </Typography>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Avatar
          src={job.client_logo_url || undefined}
          sx={{ width: 18, height: 18, borderRadius: 0.5, fontSize: '0.45rem', fontWeight: 800, bgcolor: alpha(job.client_brand_color || '#5D87FF', 0.12), color: job.client_brand_color || '#5D87FF' }}
        >
          {ini(job.client_name)}
        </Avatar>
        <Typography noWrap sx={{ fontSize: '0.68rem', color: 'text.secondary', flex: 1, minWidth: 0 }}>
          {job.client_name || '—'}
        </Typography>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase' }}>
          {job.priority_band}
        </Typography>
        {job.deadline_at && (
          <Typography sx={{ fontSize: '0.65rem', color: dlColor(job.deadline_at) }}>
            {relDl(job.deadline_at)}
          </Typography>
        )}
        {job.owner_name && (
          <Tooltip title={job.owner_name} arrow>
            <Avatar sx={{ width: 18, height: 18, fontSize: '0.45rem', fontWeight: 800, bgcolor: alpha('#5D87FF', 0.12), color: '#5D87FF' }}>
              {ini(job.owner_name)}
            </Avatar>
          </Tooltip>
        )}
        {next && (
          <Tooltip title={getNextAction(job).label} arrow>
            <Box
              className="board-advance"
              onClick={(e) => { e.stopPropagation(); onAdvance(job.id, next); }}
              sx={{ width: 18, height: 18, borderRadius: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, cursor: 'pointer', color: 'text.secondary', transition: 'opacity 100ms', '&:hover': { bgcolor: dark ? alpha('#fff', 0.1) : alpha('#000', 0.06) } }}
            >
              <IconChevronRight size={13} />
            </Box>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LIST VIEW — Notion-style database rows with grouped sections
   ═══════════════════════════════════════════════════════════════════ */

function ListView({ sections, onOpen, onAdvance, onAssign, owners }: {
  sections: GroupedSection[];
  onOpen: (job: OperationsJob) => void;
  onAdvance: (jobId: string, next: string) => void;
  onAssign: (jobId: string, ownerId: string) => void;
  owners: OperationsOwner[];
}) {
  return (
    <Box>
      <ListHeader />
      {sections.map((s) => (
        <ListGroup key={s.key} section={s} onOpen={onOpen} onAdvance={onAdvance} onAssign={onAssign} owners={owners} />
      ))}
    </Box>
  );
}

function ListHeader() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const hdr: React.CSSProperties & Record<string, unknown> = { fontSize: '0.62rem', fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.5, borderBottom: `1px solid ${dark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}` }}>
      <Typography sx={{ ...hdr, flex: 1 }}>Título</Typography>
      <Typography sx={{ ...hdr, minWidth: 90 }}>Status</Typography>
      <Typography sx={{ ...hdr, minWidth: 28, textAlign: 'center' }}>Pri</Typography>
      <Typography sx={{ ...hdr, minWidth: 110 }}>Cliente</Typography>
      <Typography sx={{ ...hdr, minWidth: 28, textAlign: 'center' }}>Resp</Typography>
      <Typography sx={{ ...hdr, minWidth: 52, textAlign: 'right' }}>Prazo</Typography>
    </Box>
  );
}

function ListGroup({ section, onOpen, onAdvance, onAssign, owners }: {
  section: GroupedSection;
  onOpen: (job: OperationsJob) => void;
  onAdvance: (jobId: string, next: string) => void;
  onAssign: (jobId: string, ownerId: string) => void;
  owners: OperationsOwner[];
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [open, setOpen] = useState(true);

  return (
    <Box>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.6, cursor: 'pointer',
          '&:hover': { bgcolor: dark ? alpha('#fff', 0.02) : alpha('#000', 0.015) },
        }}
      >
        <IconChevronRight size={13} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', opacity: 0.35 }} />
        {section.color && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: section.color }} />}
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.primary' }}>{section.label}</Typography>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>{section.count}</Typography>
      </Box>
      <Collapse in={open}>
        {section.jobs.sort(sortByOperationalPriority).map((job) => (
          <ListRow key={job.id} job={job} onClick={() => onOpen(job)} onAdvance={onAdvance} onAssign={onAssign} owners={owners} />
        ))}
      </Collapse>
    </Box>
  );
}

function ListRow({ job, onClick, onAdvance, onAssign, owners }: {
  job: OperationsJob; onClick: () => void;
  onAdvance: (jobId: string, next: string) => void;
  onAssign: (jobId: string, ownerId: string) => void;
  owners: OperationsOwner[];
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const next = getNextStatus(job);
  const dotColor = STATUS_DOTS[job.status] || '#868e96';

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.6, cursor: 'pointer', position: 'relative',
        borderBottom: `1px solid ${dark ? alpha('#fff', 0.03) : alpha('#000', 0.03)}`,
        transition: 'background 80ms',
        '&:hover': {
          bgcolor: dark ? alpha('#fff', 0.025) : alpha('#000', 0.015),
          '& .row-actions': { opacity: 1 },
        },
      }}
    >
      {/* Title */}
      <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.82rem', fontWeight: 500, color: 'text.primary' }}>
        {job.title}
      </Typography>

      {/* Hover actions */}
      <Stack
        className="row-actions"
        direction="row" spacing={0.5} alignItems="center"
        sx={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          opacity: 0, transition: 'opacity 80ms',
          bgcolor: dark ? 'rgba(18,18,20,0.95)' : 'rgba(255,255,255,0.95)',
          px: 0.75, py: 0.25, borderRadius: 1,
          boxShadow: dark ? 'none' : '0 0 0 1px rgba(0,0,0,0.04)',
          zIndex: 2,
        }}
      >
        {!job.owner_id && owners.length > 0 && (
          <QuickAssign owners={owners} onAssign={(oid) => onAssign(job.id, oid)} />
        )}
        {next && (
          <Tooltip title={getNextAction(job).label} arrow>
            <Box
              onClick={(e) => { e.stopPropagation(); onAdvance(job.id, next); }}
              sx={{ width: 22, height: 22, borderRadius: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { bgcolor: dark ? alpha('#fff', 0.08) : alpha('#000', 0.05) } }}
            >
              <IconChevronRight size={14} />
            </Box>
          </Tooltip>
        )}
      </Stack>

      {/* Status */}
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 90, flexShrink: 0 }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
        <Typography noWrap sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{STAGE_LABELS[job.status] || job.status}</Typography>
      </Stack>

      {/* Priority */}
      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', minWidth: 28, textAlign: 'center', flexShrink: 0 }}>
        {job.priority_band}
      </Typography>

      {/* Client */}
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 110, flexShrink: 0 }}>
        <Avatar
          src={job.client_logo_url || undefined}
          sx={{ width: 18, height: 18, borderRadius: 0.5, fontSize: '0.45rem', fontWeight: 800, bgcolor: alpha(job.client_brand_color || '#5D87FF', 0.12), color: job.client_brand_color || '#5D87FF' }}
        >
          {ini(job.client_name)}
        </Avatar>
        <Typography noWrap sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{job.client_name || '—'}</Typography>
      </Stack>

      {/* Owner */}
      {job.owner_name ? (
        <Tooltip title={job.owner_name} arrow>
          <Avatar sx={{ width: 22, height: 22, fontSize: '0.5rem', fontWeight: 800, bgcolor: alpha('#5D87FF', 0.12), color: '#5D87FF', flexShrink: 0 }}>
            {ini(job.owner_name)}
          </Avatar>
        </Tooltip>
      ) : (
        <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px dashed ${dark ? alpha('#fff', 0.12) : alpha('#000', 0.1)}`, flexShrink: 0 }} />
      )}

      {/* Deadline */}
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: dlColor(job.deadline_at), minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
        {relDl(job.deadline_at) || '—'}
      </Typography>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TOOLBAR PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */

function ViewTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, cursor: 'pointer',
        fontSize: '0.75rem', fontWeight: active ? 600 : 400, color: active ? 'text.primary' : 'text.secondary',
        borderBottom: active ? '2px solid currentColor' : '2px solid transparent',
        transition: 'all 100ms',
        '&:hover': { color: 'text.primary' },
      }}
    >
      {icon}{label}
    </Box>
  );
}

function Pill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <Box
      onClick={onClick}
      sx={(theme) => {
        const dk = theme.palette.mode === 'dark';
        return {
          display: 'flex', alignItems: 'center', gap: 0.4, px: 0.9, py: 0.3, borderRadius: 1, cursor: 'pointer',
          fontSize: '0.7rem', fontWeight: 500,
          color: active ? theme.palette.primary.main : 'text.secondary',
          bgcolor: active ? alpha(theme.palette.primary.main, dk ? 0.12 : 0.08) : 'transparent',
          transition: 'all 100ms',
          '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
        };
      }}
    >
      {icon}{label}
    </Box>
  );
}

function GroupByPicker({ value, onChange }: { value: string; onChange: (v: 'status' | 'client' | 'owner' | 'risk') => void }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const map: Record<string, string> = { status: 'Status', client: 'Cliente', owner: 'Responsável', risk: 'Risco' };
  return (
    <>
      <Box
        onClick={(e) => setEl(e.currentTarget)}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 0.9, py: 0.3, borderRadius: 1, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 500, color: 'text.secondary', '&:hover': { bgcolor: (t) => alpha(t.palette.text.primary, 0.04) } }}
      >
        Agrupar: {map[value]}<IconChevronDown size={13} />
      </Box>
      <Menu anchorEl={el} open={Boolean(el)} onClose={() => setEl(null)} slotProps={{ paper: { sx: { minWidth: 140 } } }}>
        {Object.entries(map).map(([k, l]) => (
          <MenuItem key={k} selected={k === value} onClick={() => { onChange(k as 'status' | 'client' | 'owner' | 'risk'); setEl(null); }} sx={{ fontSize: '0.78rem' }}>{l}</MenuItem>
        ))}
      </Menu>
    </>
  );
}

function CompactSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <TextField
      select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 130, '& .MuiInputBase-root': { fontSize: '0.75rem', height: 32 }, '& .MuiInputLabel-root': { fontSize: '0.72rem' } }}
    >
      {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  );
}

function QuickAssign({ owners, onAssign }: { owners: OperationsOwner[]; onAssign: (ownerId: string) => void }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  return (
    <>
      <Typography
        onClick={(e) => { e.stopPropagation(); setEl(e.currentTarget as HTMLElement); }}
        sx={{ fontSize: '0.65rem', fontWeight: 600, color: 'primary.main', cursor: 'pointer', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
      >
        Atribuir
      </Typography>
      <Menu
        anchorEl={el} open={Boolean(el)}
        onClose={(e: React.SyntheticEvent) => { e.stopPropagation?.(); setEl(null); }}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { maxHeight: 240, minWidth: 160 } } }}
      >
        {owners.map((o) => (
          <MenuItem key={o.id} onClick={(e) => { e.stopPropagation(); onAssign(o.id); setEl(null); }} sx={{ fontSize: '0.75rem', py: 0.5 }}>
            <Avatar sx={{ width: 18, height: 18, fontSize: '0.45rem', fontWeight: 900, bgcolor: alpha('#5D87FF', 0.12), color: '#5D87FF', mr: 0.75 }}>
              {ini(o.name)}
            </Avatar>
            {o.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
