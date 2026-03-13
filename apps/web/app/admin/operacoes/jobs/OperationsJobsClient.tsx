'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import {
  BlockReason,
  ClientThumb,
  EmptyOperationState,
  EntityLinkCard,
  JobFocusRail,
  NextActionBar,
  OpsDivider,
  OpsJobRow,
  OpsSection,
  OpsSummaryStat,
  OpsStageGroup,
  OpsSurface,
  OpsToolbar,
  PersonThumb,
  PriorityPill,
  RiskFlag,
  SourceThumb,
  StageRail,
} from '@/components/operations/primitives';
import { sortByOperationalPriority } from '@/components/operations/derived';
import { formatSkillLabel, formatSourceLabel, getNextAction, getRisk, groupBy, STAGE_LABELS, type OperationsJob } from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OPS_COPY } from '@/components/operations/copy';

const STAGE_ORDER = ['intake', 'planned', 'ready', 'allocated', 'in_progress', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'done', 'blocked'];

/** 4 simplified buckets for the operator — maps 12 stages into 4 visual groups */
const BUCKETS = [
  { key: 'entrou', label: 'Entrou', subtitle: 'Sem dono, sem classificação ou aguardando triagem', stages: ['intake', 'planned', 'ready'] },
  { key: 'producao', label: 'Em produção', subtitle: 'Alguém está trabalhando', stages: ['allocated', 'in_progress', 'in_review'] },
  { key: 'esperando', label: 'Esperando alguém', subtitle: 'Aprovação, desbloqueio ou agendamento', stages: ['awaiting_approval', 'approved', 'scheduled', 'blocked'] },
  { key: 'entregue', label: 'Entregue', subtitle: 'Publicado ou concluído', stages: ['published', 'done'] },
] as const;

export default function OperationsJobsClient() {
  const searchParams = useSearchParams();
  const shouldOpenComposer = searchParams.get('new') === '1';
  const shouldFilterUnassigned = searchParams.get('unassigned') === 'true';
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (shouldOpenComposer) setComposerOpen(true);
  }, [shouldOpenComposer]);

  useEffect(() => {
    if (shouldFilterUnassigned) setUnassignedOnly(true);
  }, [shouldFilterUnassigned]);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...jobs]
      .filter((job) => !statusFilter || job.status === statusFilter)
      .filter((job) => !priorityFilter || job.priority_band === priorityFilter)
      .filter((job) => !clientFilter || job.client_id === clientFilter)
      .filter((job) => !ownerFilter || job.owner_id === ownerFilter)
      .filter((job) => !urgentOnly || Boolean(job.is_urgent))
      .filter((job) => !unassignedOnly || !job.owner_id)
      .filter((job) => {
        if (!normalizedQuery) return true;
        return [job.title, job.summary, job.client_name, job.owner_name, job.required_skill]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort(sortByOperationalPriority);
  }, [jobs, statusFilter, priorityFilter, clientFilter, ownerFilter, urgentOnly, unassignedOnly, query]);

  const grouped = useMemo(() => groupBy(filteredJobs, (job) => job.status), [filteredJobs]);

  useEffect(() => {
    if (!selectedJob) {
      setSelectedJob(filteredJobs[0] || null);
      return;
    }
    const fresh = filteredJobs.find((job) => job.id === selectedJob.id) || jobs.find((job) => job.id === selectedJob.id);
    if (fresh) setSelectedJob(fresh);
  }, [filteredJobs, jobs, selectedJob]);

  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;

  return (
    <OperationsShell
      section="jobs"
      summary={
        <Stack direction="row" spacing={2.25} flexWrap="wrap" useFlexGap alignItems="center">
          <OpsSummaryStat value={filteredJobs.length} label={OPS_COPY.jobs.summaryVisible} />
          <OpsSummaryStat value={filteredJobs.filter((item) => !item.owner_id).length} label={OPS_COPY.jobs.summaryUnassigned} tone={filteredJobs.some((item) => !item.owner_id) ? 'warning' : 'default'} />
          <OpsSummaryStat value={filteredJobs.filter((item) => item.is_urgent).length} label={OPS_COPY.jobs.summaryUrgent} tone={filteredJobs.some((item) => item.is_urgent) ? 'error' : 'default'} />
          <OpsSummaryStat value={Object.keys(grouped).length} label={OPS_COPY.jobs.summaryStages} />
        </Stack>
      }
    >
      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : filteredJobs.length === 0 ? (
        <EmptyOperationState title="Nenhuma demanda encontrada" description="Mude os filtros ou abra uma nova demanda." actionLabel={OPS_COPY.shell.newDemand} onAction={() => setComposerOpen(true)} />
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7.6 }}>
            <Stack spacing={3}>
              <OpsSection
                eyebrow={OPS_COPY.jobs.triageEyebrow}
                title={OPS_COPY.jobs.triageTitle}
                subtitle={OPS_COPY.jobs.triageSubtitle}
                action={
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="contained" onClick={() => setComposerOpen(true)}>{OPS_COPY.shell.newDemand}</Button>
                    <Button variant="outlined" onClick={refresh}>{OPS_COPY.jobs.refresh}</Button>
                  </Stack>
                }
              >
                <OpsToolbar>
                  <Stack spacing={2}>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth label="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, demanda, responsável ou especialidade" />
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <TextField select fullWidth label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                          <MenuItem value="">Todos</MenuItem>
                          {STAGE_ORDER.map((status) => <MenuItem key={status} value={status}>{STAGE_LABELS[status] || status}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <TextField select fullWidth label="Prioridade" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                          <MenuItem value="">Todas</MenuItem>
                          <MenuItem value="p0">P0</MenuItem>
                          <MenuItem value="p1">P1</MenuItem>
                          <MenuItem value="p2">P2</MenuItem>
                          <MenuItem value="p3">P3</MenuItem>
                          <MenuItem value="p4">P4</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <TextField select fullWidth label="Cliente" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
                          <MenuItem value="">Todos</MenuItem>
                          {lookups.clients.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <TextField select fullWidth label="Responsável" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                          <MenuItem value="">Todos</MenuItem>
                          {lookups.owners.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                        </TextField>
                      </Grid>
                    </Grid>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'center' }}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <FormControlLabel control={<Switch checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} />} label="Só urgentes" />
                        <FormControlLabel control={<Switch checked={unassignedOnly} onChange={(event) => setUnassignedOnly(event.target.checked)} />} label="Só sem responsável" />
                      </Stack>
                      <Chip label={OPS_COPY.jobs.legacyKanban} variant="outlined" />
                    </Stack>
                  </Stack>
                </OpsToolbar>
              </OpsSection>

              <OpsSurface>
                <OpsSection eyebrow={OPS_COPY.jobs.flowEyebrow} title={OPS_COPY.jobs.flowTitle} subtitle={OPS_COPY.jobs.flowSubtitle}>
                  <Stack spacing={1.25}>
                    {BUCKETS.map((bucket) => {
                      const bucketJobs = bucket.stages.flatMap((s) => grouped[s] || []);
                      if (!bucketJobs.length) return null;
                      return (
                        <OpsStageGroup key={bucket.key} title={bucket.label} subtitle={bucket.subtitle} count={bucketJobs.length}>
                          {bucketJobs.sort(sortByOperationalPriority).map((job) => (
                            <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} showStage />
                          ))}
                        </OpsStageGroup>
                      );
                    })}
                  </Stack>
                </OpsSection>
              </OpsSurface>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.4 }}>
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
                        href="/admin/operacoes/planner"
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
                        label="Origem"
                        value={formatSourceLabel(selectedJob.source)}
                        subtitle={selectedJob.job_type}
                        thumbnail={<SourceThumb source={selectedJob.source} jobType={selectedJob.job_type} accent="#E85219" />}
                      />
                    </Grid>
                  </Grid>
                ) : null
              }
              footer={
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" onClick={() => setDetailOpen(true)} disabled={!selectedJob}>{OPS_COPY.common.openDetail}</Button>
                  <Button variant="outlined" onClick={() => setComposerOpen(true)}>{OPS_COPY.shell.newDemand}</Button>
                  <Button variant="outlined" onClick={() => refresh()}>{OPS_COPY.jobs.refresh}</Button>
                  <Button variant="outlined" onClick={() => selectedJob && fetchJob(selectedJob.id).then((job) => setSelectedJob(job))} disabled={!selectedJob}>{OPS_COPY.common.refreshDetail}</Button>
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
        jobTypes={lookups.jobTypes}
        skills={lookups.skills}
        channels={lookups.channels}
        clients={lookups.clients}
        owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setComposerOpen(false)}
        onCreate={async (payload) => {
          const created = await createJob(payload);
          await refresh();
          setSelectedJob(created as OperationsJob);
          return created;
        }}
        onUpdate={updateJob}
        onStatusChange={changeStatus}
      />

      <JobWorkbenchDrawer
        open={detailOpen && Boolean(selectedJob)}
        mode="edit"
        job={selectedJob}
        jobTypes={lookups.jobTypes}
        skills={lookups.skills}
        channels={lookups.channels}
        clients={lookups.clients}
        owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setDetailOpen(false)}
        onCreate={createJob}
        onUpdate={async (jobId, payload) => {
          const updated = await updateJob(jobId, payload);
          await refresh();
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onStatusChange={async (jobId, status, reason) => {
          const updated = await changeStatus(jobId, status, reason);
          await refresh();
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}
