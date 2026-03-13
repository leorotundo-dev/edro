'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Grid from '@mui/material/Grid';
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
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconFlag,
  IconInbox,
  IconLayoutList,
  IconLoader2,
  IconPlayerPlay,
  IconSearch,
  IconTruck,
  IconUser,
  IconUsers,
  IconUserOff,
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
  PersonThumb,
  PipelineBoard,
  SourceThumb,
  StatusDot,
} from '@/components/operations/primitives';
import { criticalAlerts, groupJobsByClient, groupJobsByOwner, groupJobsByRisk, ownerAllocableMinutes, ownerCommittedMinutes, sortByOperationalPriority, type GroupedSection } from '@/components/operations/derived';
import { formatSkillLabel, formatSourceLabel, getNextAction, getRisk, groupBy, STAGE_LABELS, type OperationsJob } from '@/components/operations/model';
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
  const searchParams = useSearchParams();
  const shouldOpenComposer = searchParams.get('new') === '1';
  const shouldFilterUnassigned = searchParams.get('unassigned') === 'true';
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [groupMode, setGroupMode] = useState<'status' | 'client' | 'owner' | 'risk'>('status');

  useEffect(() => { if (shouldOpenComposer) setComposerOpen(true); }, [shouldOpenComposer]);
  useEffect(() => { if (shouldFilterUnassigned) setQuickFilter('unassigned'); }, [shouldFilterUnassigned]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...jobs]
      .filter((job) => !statusFilter || job.status === statusFilter)
      .filter((job) => !priorityFilter || job.priority_band === priorityFilter)
      .filter((job) => !clientFilter || job.client_id === clientFilter)
      .filter((job) => !ownerFilter || job.owner_id === ownerFilter)
      .filter((job) => {
        if (quickFilter === 'urgent') return Boolean(job.is_urgent);
        if (quickFilter === 'unassigned') return !job.owner_id;
        return true;
      })
      .filter((job) => {
        if (!q) return true;
        return [job.title, job.summary, job.client_name, job.owner_name, job.required_skill]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      })
      .sort(sortByOperationalPriority);
  }, [jobs, statusFilter, priorityFilter, clientFilter, ownerFilter, quickFilter, query]);

  const grouped = useMemo(() => groupBy(filteredJobs, (job) => job.status), [filteredJobs]);

  const groupedSections = useMemo((): GroupedSection[] => {
    if (groupMode === 'client') return groupJobsByClient(filteredJobs);
    if (groupMode === 'owner') return groupJobsByOwner(filteredJobs);
    if (groupMode === 'risk') return groupJobsByRisk(filteredJobs);
    // 'status' — default bucket view handled by BucketGroup below
    return [];
  }, [filteredJobs, groupMode]);

  useEffect(() => {
    if (!selectedJob) { setSelectedJob(filteredJobs[0] || null); return; }
    const fresh = filteredJobs.find((j) => j.id === selectedJob.id) || jobs.find((j) => j.id === selectedJob.id);
    if (fresh) setSelectedJob(fresh);
  }, [filteredJobs, jobs, selectedJob]);

  const alerts = useMemo(() => criticalAlerts(jobs), [jobs]);
  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;

  const handleAdvance = async (jobId: string, nextStatus: string) => {
    await changeStatus(jobId, nextStatus);
    await refresh();
  };

  const handleAssign = async (jobId: string, ownerId: string) => {
    await updateJob(jobId, { owner_id: ownerId });
    await refresh();
  };
  const hasActiveFilters = Boolean(statusFilter || priorityFilter || clientFilter || ownerFilter || quickFilter);
  const activeFilterCount = [statusFilter, priorityFilter, clientFilter, ownerFilter, quickFilter].filter(Boolean).length;

  return (
    <OperationsShell
      section="jobs"
      summary={
        <Stack spacing={1}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
            {BUCKETS.map((b) => {
              const cnt = b.stages.flatMap((s) => grouped[s] || []).length;
              const bColor = b.color !== 'default' ? theme.palette[b.color].main : alpha(theme.palette.text.primary, 0.5);
              return (
                <Stack key={b.key} direction="row" spacing={0.6} alignItems="baseline">
                  <Typography sx={{ fontWeight: 900, color: cnt > 0 ? bColor : 'text.disabled', fontSize: '1.1rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {cnt}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.7rem' }}>
                    {b.label}
                  </Typography>
                </Stack>
              );
            })}
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', fontSize: '0.7rem' }}>
              {filteredJobs.length} total
            </Typography>
          </Stack>
          {/* Segmented progress bar */}
          <Stack direction="row" sx={{ height: 4, borderRadius: 1, overflow: 'hidden', bgcolor: dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06) }}>
            {BUCKETS.map((b) => {
              const cnt = b.stages.flatMap((s) => grouped[s] || []).length;
              const bColor = b.color !== 'default' ? theme.palette[b.color].main : alpha(theme.palette.text.primary, 0.3);
              const pct = filteredJobs.length > 0 ? (cnt / filteredJobs.length) * 100 : 0;
              return pct > 0 ? <Box key={b.key} sx={{ width: `${pct}%`, bgcolor: bColor, transition: 'width 300ms ease' }} /> : null;
            })}
          </Stack>
        </Stack>
      }
    >
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {/* Action Strip — alerts + team pulse */}
      {!loading && jobs.length > 0 ? (
        <Box sx={{ mb: 2 }}>
          <ActionStrip
            alerts={alerts}
            owners={lookups.owners}
            jobs={jobs}
            onSelectJob={(job) => { setSelectedJob(job); setDetailOpen(true); }}
            onFilterOwner={(ownerId) => setOwnerFilter(ownerId)}
            allocableMinutesFn={ownerAllocableMinutes}
            committedMinutesFn={ownerCommittedMinutes}
          />
        </Box>
      ) : null}

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2.5}>
          {/* Main column */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={2}>
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

                {/* Quick filters */}
                <Stack direction="row" spacing={0.75} sx={{ px: 2, pb: 1.25 }}>
                  <ToggleButtonGroup value={quickFilter} exclusive onChange={(_e, v) => setQuickFilter(v)} size="small">
                    <ToggleButton value="urgent" sx={{ px: 1.25, py: 0.25, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                      <IconUrgent size={14} style={{ marginRight: 4 }} /> Urgentes
                    </ToggleButton>
                    <ToggleButton value="unassigned" sx={{ px: 1.25, py: 0.25, fontSize: '0.72rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                      <IconUserOff size={14} style={{ marginRight: 4 }} /> Sem dono
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {hasActiveFilters && (
                    <Button size="small" onClick={() => { setStatusFilter(''); setPriorityFilter(''); setClientFilter(''); setOwnerFilter(''); setQuickFilter(null); }}
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

              {/* Pipeline Board — Kanban overview */}
              {filteredJobs.length > 0 ? (
                <PipelineBoard
                  jobs={filteredJobs}
                  selectedJob={selectedJob}
                  onSelectJob={(job) => { setSelectedJob(job); }}
                  onAdvance={async (jobId, nextStatus) => {
                    await changeStatus(jobId, nextStatus);
                    await refresh();
                  }}
                  onShowAll={(columnKey) => {
                    const col = BUCKETS.find((b) => b.key === columnKey);
                    if (col) setStatusFilter(col.stages[0]);
                  }}
                />
              ) : null}

              {/* Group-by selector */}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', mr: 0.5 }}>
                  Agrupar:
                </Typography>
                <ToggleButtonGroup
                  value={groupMode}
                  exclusive
                  onChange={(_e, v) => { if (v) setGroupMode(v); }}
                  size="small"
                >
                  <ToggleButton value="status" sx={{ px: 1, py: 0.25, fontSize: '0.68rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                    <IconLayoutList size={13} style={{ marginRight: 3 }} /> Status
                  </ToggleButton>
                  <ToggleButton value="client" sx={{ px: 1, py: 0.25, fontSize: '0.68rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                    <IconUsers size={13} style={{ marginRight: 3 }} /> Cliente
                  </ToggleButton>
                  <ToggleButton value="owner" sx={{ px: 1, py: 0.25, fontSize: '0.68rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                    <IconUser size={13} style={{ marginRight: 3 }} /> Dono
                  </ToggleButton>
                  <ToggleButton value="risk" sx={{ px: 1, py: 0.25, fontSize: '0.68rem', fontWeight: 700, textTransform: 'none', borderRadius: '8px !important' }}>
                    <IconFlag size={13} style={{ marginRight: 3 }} /> Risco
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
                    return <BucketGroup key={bucket.key} bucket={bucket} jobs={bucketJobs} selectedJob={selectedJob} onSelectJob={setSelectedJob} onAdvance={handleAdvance} onAssign={handleAssign} owners={lookups.owners} />;
                  })}
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  {groupedSections.map((section) => (
                    <GroupSection key={section.key} section={section} selectedJob={selectedJob} onSelectJob={setSelectedJob} onAdvance={handleAdvance} onAssign={handleAssign} owners={lookups.owners} />
                  ))}
                </Stack>
              )}
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
                        href="/admin/operacoes/planner" subtitle={formatSkillLabel(selectedJob.required_skill)}
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
              footer={
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" size="small" onClick={() => setDetailOpen(true)} disabled={!selectedJob}>{OPS_COPY.common.openDetail}</Button>
                  <Button variant="outlined" size="small" onClick={refresh}>{OPS_COPY.jobs.refresh}</Button>
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
        onCreate={async (payload) => { const c = await createJob(payload); await refresh(); setSelectedJob(c as OperationsJob); return c; }}
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
        onStatusChange={async (id, s, r) => { const u = await changeStatus(id, s, r); await refresh(); setSelectedJob(u as OperationsJob); return u; }}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
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
  owners?: Array<{ id: string; name: string; email: string; role: string; specialty?: string | null; person_type?: 'internal' | 'freelancer' }>;
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
          px: 2, py: 1.25,
          display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer',
          borderBottom: expanded ? `1px solid ${alpha(color, 0.1)}` : undefined,
          transition: 'all 150ms ease',
          '&:hover': { bgcolor: alpha(color, dark ? 0.06 : 0.03) },
        }}
      >
        <Typography sx={{ fontSize: '1.35rem', fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'center' }}>
          {jobs.length}
        </Typography>
        <Box sx={{
          width: 24, height: 24, borderRadius: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(color, 0.12),
          color,
        }}>
          {bucket.icon}
        </Box>
        <Typography variant="body2" fontWeight={700}>{bucket.label}</Typography>
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

/* ─── Group Section (for client/owner/risk grouping) ─── */

function GroupSection({
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
  owners?: Array<{ id: string; name: string; email: string; role: string; specialty?: string | null; person_type?: 'internal' | 'freelancer' }>;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [expanded, setExpanded] = useState(true);
  const sectionColor = section.color || theme.palette.primary.main;

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
          px: 2, py: 1.25,
          display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer',
          borderBottom: expanded ? `1px solid ${alpha(sectionColor, 0.1)}` : undefined,
          transition: 'all 150ms ease',
          '&:hover': { bgcolor: alpha(sectionColor, dark ? 0.06 : 0.03) },
        }}
      >
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: sectionColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums', minWidth: 24, textAlign: 'center' }}>
          {section.count}
        </Typography>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sectionColor, flexShrink: 0 }} />
        <Typography variant="body2" fontWeight={700}>{section.label}</Typography>
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
