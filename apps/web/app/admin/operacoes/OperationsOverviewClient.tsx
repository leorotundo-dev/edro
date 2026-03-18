'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconTargetArrow,
  IconTimeline,
  IconBrush,
  IconCircleCheckFilled,
  IconInbox,
  IconCalendarClock,
} from '@tabler/icons-react';
import { apiGet } from '@/lib/api';
import JarvisHomeSection from '@/components/jarvis/JarvisHomeSection';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import {
  CapacityBar,
  ClientThumb,
  EmptyOperationState,
  EntityLinkCard,
  OperationsContextRail,
  OpsDivider,
  OpsJobRow,
  OpsPanel,
  PersonThumb,
  SourceThumb,
} from '@/components/operations/primitives';
import {
  jobsByAttentionClient,
  jobsForToday,
  ownerActiveJobs,
  ownerAllocableMinutes,
  ownerCommittedMinutes,
  ownerTentativeMinutes,
  sortByOperationalPriority,
} from '@/components/operations/derived';
import { formatSkillLabel, formatSourceLabel, getNextAction, getRisk, type OperationsJob } from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OPS_COPY } from '@/components/operations/copy';

function buildFlowBuckets(jobs: OperationsJob[]) {
  return [
    {
      key: 'intake',
      title: '01 Entrada',
      subtitle: 'captar, classificar e completar o contexto',
      jobs: jobs.filter((job) => ['intake', 'planned'].includes(job.status)).sort(sortByOperationalPriority).slice(0, 4),
    },
    {
      key: 'ready',
      title: '02 Planejamento',
      subtitle: 'definir responsável, prazo e capacidade',
      jobs: jobs.filter((job) => ['ready', 'allocated'].includes(job.status)).sort(sortByOperationalPriority).slice(0, 4),
    },
    {
      key: 'production',
      title: '03 Produção',
      subtitle: 'executar, revisar e resolver bloqueios',
      jobs: jobs.filter((job) => ['in_progress', 'in_review', 'blocked'].includes(job.status)).sort(sortByOperationalPriority).slice(0, 4),
    },
    {
      key: 'delivery',
      title: '04 Entrega',
      subtitle: 'aprovar, agendar e concluir',
      jobs: jobs.filter((job) => ['awaiting_approval', 'approved', 'scheduled', 'published'].includes(job.status)).sort(sortByOperationalPriority).slice(0, 4),
    },
  ];
}

const FLOW_VISUALS = {
  intake: { icon: IconTargetArrow, accent: '#E85219' },
  ready: { icon: IconTimeline, accent: '#FFAE1F' },
  production: { icon: IconBrush, accent: '#5D87FF' },
  delivery: { icon: IconCircleCheckFilled, accent: '#13DEB9' },
} as const;

function flowBucketForStatus(status?: string | null) {
  if (['intake', 'planned'].includes(status || '')) return 'intake';
  if (['ready', 'allocated'].includes(status || '')) return 'ready';
  if (['in_progress', 'in_review', 'blocked'].includes(status || '')) return 'production';
  if (['awaiting_approval', 'approved', 'scheduled', 'published'].includes(status || '')) return 'delivery';
  return 'intake';
}

export default function OperationsOverviewClient() {
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [overviewRuntime, setOverviewRuntime] = useState<{
    checkpoints: OperationsJob[];
    approvals: OperationsJob[];
    summary: {
      checkpoints_total: number;
      approvals_pending_total: number;
      approvals_blocked_total: number;
      near_deadline_total: number;
    };
  }>({
    checkpoints: [],
    approvals: [],
    summary: {
      checkpoints_total: 0,
      approvals_pending_total: 0,
      approvals_blocked_total: 0,
      near_deadline_total: 0,
    },
  });
  const clientsById = useMemo(() => new Map(lookups.clients.map((client) => [client.id, client])), [lookups.clients]);

  const criticalJobs = useMemo(
    () => [...jobs].filter((job) => ['critical', 'high'].includes(getRisk(job).level)).sort(sortByOperationalPriority),
    [jobs]
  );
  const unassignedJobs = useMemo(
    () => [...jobs].filter((job) => !job.owner_id && job.status !== 'archived').sort(sortByOperationalPriority),
    [jobs]
  );
  const todayJobs = useMemo(() => jobsForToday(jobs).sort(sortByOperationalPriority), [jobs]);
  const attentionClients = useMemo(() => jobsByAttentionClient(jobs).slice(0, 5), [jobs]);
  const flowBuckets = useMemo(() => buildFlowBuckets(jobs), [jobs]);
  const ownerLoads = useMemo(
    () =>
      lookups.owners
        .map((owner) => ({
          owner,
          allocableMinutes: ownerAllocableMinutes(owner),
          committedMinutes: ownerCommittedMinutes(jobs, owner.id),
          tentativeMinutes: ownerTentativeMinutes(jobs, owner.id),
        }))
        .filter((item) => item.committedMinutes > 0 || item.tentativeMinutes > 0)
        .sort((a, b) => b.committedMinutes + b.tentativeMinutes - (a.committedMinutes + a.tentativeMinutes))
        .slice(0, 4),
    [jobs, lookups.owners]
  );

  const loadOverviewRuntime = useCallback(async () => {
    try {
      const response = await apiGet<{ data?: typeof overviewRuntime }>('/operations/overview');
      if (response?.data) setOverviewRuntime(response.data);
    } catch {
      setOverviewRuntime((current) => current);
    }
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    const fresh = jobs.find((job) => job.id === selectedJob.id);
    if (fresh) {
      setSelectedJob(fresh);
      return;
    }
    const runtimeJob = [...overviewRuntime.checkpoints, ...overviewRuntime.approvals].find((job) => job.id === selectedJob.id);
    if (runtimeJob) {
      setSelectedJob(runtimeJob);
      return;
    }
    setSelectedJob(null);
  }, [criticalJobs, jobs, overviewRuntime.approvals, overviewRuntime.checkpoints, selectedJob, todayJobs, unassignedJobs]);

  useEffect(() => {
    if (loading) return;
    void loadOverviewRuntime();
  }, [loadOverviewRuntime, loading]);

  const handleRefreshOverview = useCallback(async () => {
    await refresh();
    await loadOverviewRuntime();
  }, [loadOverviewRuntime, refresh]);

  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;
  const focusedBucketKey = flowBucketForStatus(selectedJob?.status);

  return (
    <OperationsShell
      section="overview"
      summary={
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          {[
            { value: criticalJobs.length, label: OPS_COPY.overview.summaryExceptions, color: criticalJobs.length ? '#FA896B' : undefined },
            { value: unassignedJobs.length, label: OPS_COPY.overview.summaryUnassigned, color: unassignedJobs.length ? '#FFAE1F' : undefined },
            { value: todayJobs.length, label: OPS_COPY.overview.summaryToday, color: todayJobs.length ? '#FFAE1F' : undefined },
            { value: overviewRuntime.summary.checkpoints_total, label: OPS_COPY.overview.summaryCheckpoints, color: overviewRuntime.summary.checkpoints_total ? '#FFAE1F' : undefined },
          ].map((kpi) => (
            <Stack key={kpi.label} direction="row" spacing={0.5} alignItems="baseline">
              <Typography variant="body1" sx={{ fontWeight: 900, lineHeight: 1, ...(kpi.color ? { color: kpi.color } : {}) }}>
                {kpi.value}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.68rem' }}>
                {kpi.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      }
    >
      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 3 }}>
            <OpsPanel eyebrow={OPS_COPY.overview.pulseEyebrow} title={OPS_COPY.overview.pulseTitle} subtitle={OPS_COPY.overview.pulseSubtitle}>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha('#E85219', 0.12),
                          color: '#E85219',
                        }}
                      >
                        <IconInbox size={14} />
                      </Box>
                      <Typography variant="body2" fontWeight={900}>Sem responsável</Typography>
                    </Stack>
                    <Chip size="small" color="warning" label={`${unassignedJobs.length}`} />
                  </Stack>
                  <Stack spacing={0.35}>
                    {unassignedJobs.slice(0, 4).map((job) => (
                      <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} />
                    ))}
                    {!unassignedJobs.length ? <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyUnassigned}</Typography> : null}
                  </Stack>
                </Box>

                <OpsDivider />

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha('#5D87FF', 0.12),
                          color: '#5D87FF',
                        }}
                      >
                        <IconCalendarClock size={14} />
                      </Box>
                      <Typography variant="body2" fontWeight={900}>Vence hoje</Typography>
                    </Stack>
                    <Chip size="small" label={`${todayJobs.length}`} />
                  </Stack>
                  <Stack spacing={0.35}>
                    {todayJobs.slice(0, 4).map((job) => (
                      <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} />
                    ))}
                    {!todayJobs.length ? <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyToday}</Typography> : null}
                  </Stack>
                </Box>

                <OpsDivider />

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha('#FFAE1F', 0.12),
                          color: '#FFAE1F',
                        }}
                      >
                        <IconCircleCheckFilled size={14} />
                      </Box>
                      <Typography variant="body2" fontWeight={900}>Aprovações do cliente</Typography>
                    </Stack>
                    <Chip size="small" color={overviewRuntime.summary.approvals_blocked_total ? 'error' : 'default'} label={`${overviewRuntime.summary.approvals_pending_total + overviewRuntime.summary.approvals_blocked_total}`} />
                  </Stack>
                  <Stack spacing={0.35}>
                    {overviewRuntime.approvals.slice(0, 4).map((job) => (
                      <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} showStage />
                    ))}
                    {!overviewRuntime.approvals.length ? <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyApprovals}</Typography> : null}
                  </Stack>
                </Box>
              </Stack>
            </OpsPanel>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <OpsPanel
              eyebrow={OPS_COPY.overview.flowEyebrow}
              title={OPS_COPY.overview.flowTitle}
              subtitle={OPS_COPY.overview.flowSubtitle}
              action={
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" variant="outlined" label={`${jobs.length} demandas ativas`} />
                  <Button variant="outlined" size="small" onClick={handleRefreshOverview}>{OPS_COPY.overview.flowRefresh}</Button>
                </Stack>
              }
            >
              <Stack spacing={2}>
                <Box sx={{ px: 0.25, py: 0.25 }}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={{ xs: 1.5, md: 0.75 }}
                    sx={{ alignItems: { md: 'stretch' } }}
                  >
                    {flowBuckets.map((bucket) => {
                      const spotlight = bucket.jobs[0];
                      const isFocused = focusedBucketKey === bucket.key;
                      const Icon = FLOW_VISUALS[bucket.key as keyof typeof FLOW_VISUALS]?.icon || IconTargetArrow;
                      const accent = FLOW_VISUALS[bucket.key as keyof typeof FLOW_VISUALS]?.accent || '#E85219';
                      return (
                        <Box
                          key={bucket.key}
                          sx={(theme) => ({
                            flex: 1,
                            minWidth: 0,
                            px: { xs: 0, md: 0.75 },
                            py: 0.75,
                            borderTop: `2px solid ${isFocused ? accent : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.14)}`,
                          })}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                            <Stack direction="row" spacing={0.85} alignItems="center" sx={{ minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: alpha(accent, 0.14),
                                  color: accent,
                                  flexShrink: 0,
                                }}
                              >
                                <Icon size={13} />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" sx={{ color: accent, fontWeight: 900, display: 'block', lineHeight: 1.1 }}>
                                  {bucket.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                                  {bucket.subtitle}
                                </Typography>
                              </Box>
                            </Stack>
                            <Chip size="small" label={`${bucket.jobs.length}`} />
                          </Stack>

                          {spotlight ? (
                            <Stack
                              direction="row"
                              spacing={0.85}
                              alignItems="center"
                              onClick={() => setSelectedJob(spotlight)}
                              sx={(theme) => ({
                                mt: 1,
                                cursor: 'pointer',
                                minWidth: 0,
                                '&:hover .flow-spotlight-title': { color: theme.palette.text.primary },
                              })}
                            >
                              <ClientThumb
                                name={spotlight.client_name}
                                logoUrl={spotlight.client_logo_url}
                                accent={spotlight.client_brand_color || accent}
                                size={24}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography className="flow-spotlight-title" variant="caption" sx={(theme) => ({ display: 'block', color: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.78 : 0.82) })} noWrap>
                                  {spotlight.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {spotlight.client_name || 'Sem cliente'}
                                </Typography>
                              </Box>
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              Sem pressão nesta etapa.
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>

                {selectedJob ? (
                  <Box sx={(theme) => ({ py: 1.1, borderTop: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.1)}`, borderBottom: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.1)}` })}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'center' }}>
                      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                        <ClientThumb
                          name={selectedJob.client_name}
                          logoUrl={selectedJob.client_logo_url}
                          accent={selectedJob.client_brand_color || '#E85219'}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Demanda em foco · {flowBuckets.find((bucket) => bucket.key === focusedBucketKey)?.title || '01 Entrada'}
                          </Typography>
                          <Typography variant="body2" fontWeight={800} noWrap>
                            {selectedJob.title}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip size="small" variant="outlined" label={focusedAction?.label || 'Sem próxima ação'} />
                        <Button variant="outlined" size="small" onClick={() => setDrawerOpen(true)}>Abrir detalhe</Button>
                      </Stack>
                    </Stack>
                  </Box>
                ) : null}

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight={900}>Demandas por etapa</Typography>
                    <Typography variant="caption" color="text.secondary">As demandas que estão puxando a operação agora</Typography>
                  </Stack>
                  <Stack spacing={1.5}>
                    {flowBuckets.map((bucket) => (
                      <Box key={bucket.key} sx={(theme) => ({ pt: 1.35, borderTop: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.1)}` })}>
                        <Grid container spacing={1.5}>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Stack spacing={0.35}>
                              <Typography variant="body2" fontWeight={900}>{bucket.title}</Typography>
                              <Typography variant="caption" color="text.secondary">{bucket.subtitle}</Typography>
                            </Stack>
                          </Grid>
                          <Grid size={{ xs: 12, md: 8 }}>
                            <Stack spacing={0.35}>
                              {bucket.jobs.length ? bucket.jobs.slice(0, 3).map((job) => (
                                <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} showStage />
                              )) : <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyStage}</Typography>}
                            </Stack>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <OpsDivider />

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight={900}>Checkpoints operacionais</Typography>
                    <Chip size="small" variant="outlined" label={`${overviewRuntime.summary.checkpoints_total}`} />
                  </Stack>
                  <Stack spacing={0.35} sx={{ mb: 2 }}>
                    {overviewRuntime.checkpoints.slice(0, 4).map((job) => (
                      <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} showStage />
                    ))}
                    {!overviewRuntime.checkpoints.length ? <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyCheckpoints}</Typography> : null}
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight={900}>Exceções operacionais</Typography>
                    <Button component={Link} href="/admin/operacoes/radar" variant="outlined" size="small">Abrir radar</Button>
                  </Stack>
                  <Stack spacing={0.35}>
                    {criticalJobs.slice(0, 4).map((job) => (
                      <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} showStage />
                    ))}
                    {!criticalJobs.length ? <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyExceptions}</Typography> : null}
                  </Stack>
                </Box>
              </Stack>
            </OpsPanel>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <OperationsContextRail
              lead={<JarvisHomeSection />}
              job={selectedJob}
              eyebrow={OPS_COPY.common.contextEyebrow}
              title={OPS_COPY.overview.supportTitle}
              subtitle={OPS_COPY.overview.supportSubtitle}
              primaryLabel={focusedAction?.label}
              onPrimaryAction={() => setDrawerOpen(true)}
              emptyTitle="Selecione um item"
              emptyDescription={OPS_COPY.jobs.emptyFocus}
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
                        label="Agenda"
                        value={selectedJob.deadline_at ? 'Já está na agenda' : 'Sem prazo'}
                        href="/admin/operacoes/agenda"
                        subtitle={selectedJob.deadline_at ? 'A demanda já mexe na agenda da semana' : 'Defina um prazo para ela entrar na agenda'}
                        thumbnail={<SourceThumb source="agenda" jobType="meeting" accent="#13DEB9" />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Origem"
                        value={formatSourceLabel(selectedJob.source)}
                        subtitle={selectedJob.job_type || 'Demanda operacional'}
                        thumbnail={<SourceThumb source={selectedJob.source} jobType={selectedJob.job_type} accent="#E85219" />}
                      />
                    </Grid>
                  </Grid>
                ) : null
              }
              sections={[
                {
                  title: 'Capacidade da semana',
                  content: (
                    <Stack spacing={1.25}>
                      {ownerLoads.length ? ownerLoads.map(({ owner, allocableMinutes, committedMinutes, tentativeMinutes }) => (
                        <Box key={owner.id} sx={(theme) => ({ py: 1.15, borderTop: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.1)}` })}>
                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <PersonThumb name={owner.name} accent={owner.person_type === 'freelancer' ? '#E85219' : '#5D87FF'} />
                                <Box>
                                  <Typography variant="body2" fontWeight={800}>{owner.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {owner.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'} · {owner.specialty || owner.role}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Chip size="small" label={`${ownerActiveJobs(jobs, owner.id).length} demandas`} />
                            </Stack>
                            <CapacityBar allocableMinutes={allocableMinutes} committedMinutes={committedMinutes} tentativeMinutes={tentativeMinutes} />
                          </Stack>
                        </Box>
                      )) : <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyCapacity}</Typography>}
                    </Stack>
                  ),
                },
                {
                  title: 'Clientes em atenção',
                  action: <Chip size="small" label={`${attentionClients.filter((item) => item.critical > 0).length} vermelhos`} color="error" />,
                  content: (
                    <Stack spacing={0.35}>
                      {attentionClients.length ? attentionClients.map((item) => (
                        <Box key={item.clientId} sx={(theme) => ({ py: 1.15, borderTop: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.1)}` })}>
                          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <ClientThumb
                                name={item.clientName}
                                logoUrl={clientsById.get(item.clientId)?.logo_url}
                                accent={clientsById.get(item.clientId)?.brand_color || '#E85219'}
                              />
                              <Box>
                                <Typography
                                  variant="body2"
                                  fontWeight={800}
                                  component={Link}
                                  href={`/clients/${item.clientId}/demandas`}
                                  sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { color: 'primary.main' } }}
                                >
                                  {item.clientName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.open} demandas ativas · {item.total} min previstos
                                </Typography>
                              </Box>
                            </Stack>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                              {item.critical > 0 ? <Chip size="small" color="error" label={`${item.critical} risco`} /> : null}
                              <Chip size="small" variant="outlined" label={`${item.open} ativos`} />
                            </Stack>
                          </Stack>
                        </Box>
                      )) : <Typography variant="body2" color="text.secondary">{OPS_COPY.overview.emptyAttentionClients}</Typography>}
                    </Stack>
                  ),
                },
              ]}
            />
          </Grid>
        </Grid>
      )}

      <JobWorkbenchDrawer
        open={drawerOpen && Boolean(selectedJob)}
        mode="edit"
        job={selectedJob}
        jobTypes={lookups.jobTypes}
        skills={lookups.skills}
        channels={lookups.channels}
        clients={lookups.clients}
        owners={lookups.owners}
        currentUserId={currentUserId}
        onClose={() => setDrawerOpen(false)}
        onCreate={createJob}
        onUpdate={updateJob}
        onStatusChange={changeStatus}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}
