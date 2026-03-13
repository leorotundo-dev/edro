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
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconFilter,
  IconInbox,
  IconLoader2,
  IconPlayerPlay,
  IconSearch,
  IconShieldCheck,
  IconTruck,
  IconUserOff,
  IconUsers,
  IconUrgent,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import {
  ClientThumb,
  EmptyOperationState,
  EntityLinkCard,
  JobFocusRail,
  OpsJobRow,
  PersonThumb,
  SourceThumb,
  StatusDot,
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
import { formatSkillLabel, formatSourceLabel, getNextAction, getRisk, groupBy, STAGE_LABELS, type OperationsJob, type OperationsOwner } from '@/components/operations/model';
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

  useEffect(() => {
    if (!selectedJob) { setSelectedJob(filteredJobs[0] || null); return; }
    const fresh = filteredJobs.find((j) => j.id === selectedJob.id) || jobs.find((j) => j.id === selectedJob.id);
    if (fresh) setSelectedJob(fresh);
  }, [filteredJobs, jobs, selectedJob]);

  const alerts = useMemo(() => criticalAlerts(jobs), [jobs]);

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

  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;
  const hasActiveFilters = Boolean(statusFilter || priorityFilter || clientFilter || ownerFilter || quickFilter);
  const activeFilterCount = [statusFilter, priorityFilter, clientFilter, ownerFilter, quickFilter].filter(Boolean).length;

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

              {/* Alert strip — critical jobs */}
              {alerts.length > 0 && (
                <Box sx={{
                  display: 'flex', gap: 1.25, overflowX: 'auto', py: 0.5,
                  '&::-webkit-scrollbar': { display: 'none' },
                }}>
                  {alerts.map((job) => {
                    const risk = getRisk(job);
                    return (
                      <Box
                        key={job.id}
                        onClick={() => { setSelectedJob(job); setDetailOpen(true); }}
                        sx={{
                          minWidth: 200, maxWidth: 260, flexShrink: 0,
                          px: 1.5, py: 1, borderRadius: 2, cursor: 'pointer',
                          border: `1px solid ${alpha('#FA896B', 0.25)}`,
                          bgcolor: alpha('#FA896B', dark ? 0.08 : 0.04),
                          transition: 'all 150ms ease',
                          '&:hover': { bgcolor: alpha('#FA896B', dark ? 0.14 : 0.08), borderColor: alpha('#FA896B', 0.4) },
                        }}
                      >
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                          <IconAlertTriangle size={14} style={{ color: '#FA896B', flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#FA896B', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                            {risk.level === 'critical' ? 'Crítico' : 'P0 sem dono'}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.78rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {job.title}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                          {job.client_name && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{job.client_name}</Typography>
                          )}
                          {job.owner_name ? (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>· {job.owner_name}</Typography>
                          ) : (
                            <Chip label="Sem dono" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha('#FA896B', 0.12), color: '#FA896B' }} />
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Team pulse strip */}
              {teamPulse.length > 0 && (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ py: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.68rem', mr: 0.5 }}>Equipe:</Typography>
                  {teamPulse.map((o) => {
                    const barColor = o.pct > 90 ? '#FA896B' : o.pct > 75 ? '#FFAE1F' : '#13DEB9';
                    return (
                      <Tooltip key={o.id} title={`${o.name}: ${o.pct}% (${Math.round(o.committed / 60)}h / ${Math.round(o.cap / 60)}h)`} arrow>
                        <Stack
                          direction="row" spacing={0.5} alignItems="center"
                          onClick={() => setOwnerFilter(ownerFilter === o.id ? '' : o.id)}
                          sx={{
                            px: 0.75, py: 0.3, borderRadius: 1.5, cursor: 'pointer',
                            bgcolor: ownerFilter === o.id ? alpha(barColor, 0.15) : 'transparent',
                            border: ownerFilter === o.id ? `1px solid ${alpha(barColor, 0.3)}` : '1px solid transparent',
                            '&:hover': { bgcolor: alpha(barColor, 0.08) },
                          }}
                        >
                          <Avatar sx={{ width: 22, height: 22, fontSize: '0.55rem', fontWeight: 900, bgcolor: alpha(barColor, 0.15), color: barColor }}>
                            {o.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: alpha(barColor, 0.15), overflow: 'hidden' }}>
                            <Box sx={{ width: `${Math.min(o.pct, 100)}%`, height: '100%', borderRadius: 2, bgcolor: barColor }} />
                          </Box>
                        </Stack>
                      </Tooltip>
                    );
                  })}
                  {alerts.length === 0 && (
                    <Chip icon={<IconShieldCheck size={12} />} label="Controlado" size="small"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha('#13DEB9', 0.1), color: '#13DEB9', ml: 'auto' }} />
                  )}
                </Stack>
              )}

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
