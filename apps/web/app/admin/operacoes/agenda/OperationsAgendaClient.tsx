'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { IconUserQuestion } from '@tabler/icons-react';
import { apiGet } from '@/lib/api';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import { agendaLayer, sortByOperationalPriority } from '@/components/operations/derived';
import {
  CapacityBar,
  ClientThumb,
  EmptyOperationState,
  EntityLinkCard,
  JobFocusRail,
  OpsDivider,
  OpsJobRow,
  OpsSection,
  OpsSurface,
  OpsToolbar,
  PersonThumb,
  SourceThumb,
} from '@/components/operations/primitives';
import { formatSourceLabel, getNextAction, type OperationsJob } from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OPS_COPY } from '@/components/operations/copy';

type AgendaLayer = 'deadlines' | 'approvals' | 'publications' | 'production' | 'meetings' | 'risks';
type AgendaViewMode = 'calendar' | 'distribution';
type PlannerData = {
  owners: Array<{
    owner: {
      id: string;
      name: string;
      email?: string | null;
      role?: string | null;
      specialty?: string | null;
      person_type?: 'internal' | 'freelancer';
      freelancer_profile_id?: string | null;
    };
    allocable_minutes: number;
    committed_minutes: number;
    tentative_minutes: number;
    usage: number;
    jobs: OperationsJob[];
  }>;
  unassigned_jobs: OperationsJob[];
};

const LAYERS: Array<{ key: AgendaLayer; label: string; subtitle: string }> = [
  { key: 'deadlines', label: 'Prazos', subtitle: 'Entregas com data crítica' },
  { key: 'approvals', label: 'Aprovações', subtitle: 'Itens aguardando decisão' },
  { key: 'publications', label: 'Publicações', subtitle: 'Agendamentos e saídas' },
  { key: 'production', label: 'Produção', subtitle: 'Execução com impacto no calendário' },
  { key: 'meetings', label: 'Reuniões', subtitle: 'Chamadas e checkpoints' },
  { key: 'risks', label: 'Riscos', subtitle: 'Exceções que já afetam a agenda' },
];

const LAYER_LABELS = Object.fromEntries(LAYERS.map((item) => [item.key, item.label])) as Record<AgendaLayer, string>;

function agendaAnchor(job: OperationsJob) {
  return job.metadata?.calendar_item?.starts_at || job.deadline_at || null;
}

const WEEK_DAYS = [
  { key: 1, label: 'Seg' },
  { key: 2, label: 'Ter' },
  { key: 3, label: 'Qua' },
  { key: 4, label: 'Qui' },
  { key: 5, label: 'Sex' },
] as const;

function ownerAccent(personType?: string | null) {
  return personType === 'freelancer' ? '#E85219' : '#5D87FF';
}

function opsDayAccent(theme: any, jobCount: number, plannedMinutes: number) {
  if (!jobCount) return alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.14);
  if (plannedMinutes >= 6 * 60) return theme.palette.error.main;
  if (plannedMinutes >= 3 * 60) return theme.palette.warning.main;
  return theme.palette.success.main;
}

function agendaWeekdayKey(job: OperationsJob) {
  const allocation = job.metadata?.allocation as { starts_at?: string | null } | undefined;
  const source = allocation?.starts_at || agendaAnchor(job);
  if (!source) return null;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

export default function OperationsAgendaClient() {
  const router = useRouter();
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<AgendaViewMode>('calendar');
  const [layers, setLayers] = useState<AgendaLayer[]>(['deadlines', 'approvals', 'publications', 'production', 'meetings', 'risks']);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaError, setAgendaError] = useState('');
  const [agendaDays, setAgendaDays] = useState<Array<{ day: string; jobs: OperationsJob[]; layerSummary: Array<{ key: string; label: string; count: number }> }>>([]);
  const [plannerData, setPlannerData] = useState<PlannerData>({ owners: [], unassigned_jobs: [] });

  useEffect(() => {
    let active = true;
    const loadAgenda = async () => {
      setAgendaLoading(true);
      setAgendaError('');
      try {
        const [calendarResponse, plannerResponse] = await Promise.all([
          apiGet<{ data?: { days?: typeof agendaDays } }>('/operations/calendar'),
          apiGet<{ data?: PlannerData }>('/operations/planner'),
        ]);
        if (!active) return;
        setAgendaDays(calendarResponse?.data?.days || []);
        setPlannerData(plannerResponse?.data || { owners: [], unassigned_jobs: [] });
      } catch (err: any) {
        if (!active) return;
        setAgendaError(err?.message || 'Falha ao carregar a agenda.');
      } finally {
        if (active) setAgendaLoading(false);
      }
    };
    loadAgenda();
    return () => {
      active = false;
    };
  }, [jobs.length]);

  const groupedDays = useMemo(() => {
    return agendaDays
      .map((day) => {
        const dayJobs = day.jobs
          .filter((job) => layers.includes(agendaLayer(job) as AgendaLayer))
          .sort((a, b) => {
            const timeA = new Date(String(agendaAnchor(a) || a.updated_at || a.created_at || Date.now())).getTime();
            const timeB = new Date(String(agendaAnchor(b) || b.updated_at || b.created_at || Date.now())).getTime();
            return (timeA - timeB) || sortByOperationalPriority(a, b);
          });

        return {
          day: day.day,
          jobs: dayJobs,
          layerSummary: LAYERS
            .map((layer) => ({
              ...layer,
              count: dayJobs.filter((job) => agendaLayer(job) === layer.key).length,
            }))
            .filter((layer) => layer.count > 0),
        };
      })
      .filter((day) => day.jobs.length > 0);
  }, [agendaDays, layers]);

  const filteredJobs = useMemo(
    () => groupedDays.flatMap((day) => day.jobs),
    [groupedDays]
  );

  const layerCounts = useMemo(
    () =>
      LAYERS.map((layer) => ({
        ...layer,
        count: filteredJobs.filter((job) => agendaLayer(job) === layer.key).length,
      })),
    [filteredJobs]
  );

  const distributionRows = useMemo(
    () =>
      plannerData.owners.map((row) => ({
        ...row,
        days: WEEK_DAYS.map((day) => {
          const dayJobs = row.jobs
            .filter((job) => layers.includes(agendaLayer(job) as AgendaLayer))
            .filter((job) => agendaWeekdayKey(job) === day.key)
            .sort(sortByOperationalPriority);
          return {
            ...day,
            jobs: dayJobs,
            plannedMinutes: dayJobs.reduce((sum, job) => {
              const allocation = job.metadata?.allocation as { planned_minutes?: number | null } | undefined;
              return sum + Number(allocation?.planned_minutes ?? job.estimated_minutes ?? 0);
            }, 0),
          };
        }),
      })),
    [layers, plannerData.owners]
  );

  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;
  const selectedLayer = selectedJob ? (agendaLayer(selectedJob) as AgendaLayer) : null;
  const isStandaloneAgendaItem = Boolean(selectedJob?.metadata?.calendar_item?.standalone);
  const isNativeMeeting = selectedJob?.metadata?.calendar_item?.source_type === 'meeting';
  const selectedAgendaLabel = selectedJob
    ? String(selectedJob.metadata?.calendar_item?.label || (selectedLayer ? LAYER_LABELS[selectedLayer] : 'Sem camada'))
    : 'Sem camada';

  async function reloadAgenda() {
    await refresh();
    const [calendarResponse, plannerResponse] = await Promise.all([
      apiGet<{ data?: { days?: typeof agendaDays } }>('/operations/calendar'),
      apiGet<{ data?: PlannerData }>('/operations/planner'),
    ]);
    setAgendaDays(calendarResponse?.data?.days || []);
    setPlannerData(plannerResponse?.data || { owners: [], unassigned_jobs: [] });
  }

  useEffect(() => {
    if (!selectedJob) return;
    const fresh = filteredJobs.find((job) => job.id === selectedJob.id) || jobs.find((job) => job.id === selectedJob.id);
    if (fresh) {
      setSelectedJob(fresh);
      return;
    }
    setSelectedJob(null);
  }, [filteredJobs, jobs, selectedJob]);

  return (
    <OperationsShell
      section="agenda"
      summary={
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          {[
            { value: groupedDays.length, label: OPS_COPY.agenda.summaryDays },
            { value: filteredJobs.length, label: OPS_COPY.agenda.summaryItems },
            { value: layers.length, label: OPS_COPY.agenda.summaryLayers },
            { value: plannerData.owners.length, label: OPS_COPY.agenda.summaryDistributed },
          ].map((kpi) => (
            <Stack key={kpi.label} direction="row" spacing={0.5} alignItems="baseline">
              <Typography variant="body1" sx={{ fontWeight: 900, lineHeight: 1 }}>
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
      {agendaError ? <Alert severity="error">{agendaError}</Alert> : null}

      {loading || agendaLoading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7.6 }}>
            <Stack spacing={3}>
              <OpsSection
                eyebrow={OPS_COPY.agenda.layersEyebrow}
                title={OPS_COPY.agenda.layersTitle}
                subtitle={OPS_COPY.agenda.layersSubtitle}
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={reloadAgenda}
                  >
                    {OPS_COPY.agenda.refresh}
                  </Button>
                }
              >
                <OpsToolbar>
                  <Stack spacing={2}>
                    <ToggleButtonGroup
                      value={viewMode}
                      exclusive
                      onChange={(_event, next) => next && setViewMode(next)}
                      sx={{ flexWrap: 'wrap', gap: 1 }}
                    >
                      <ToggleButton value="calendar" sx={{ borderRadius: 1.25 }}>
                        {OPS_COPY.agenda.viewCalendar}
                      </ToggleButton>
                      <ToggleButton value="distribution" sx={{ borderRadius: 1.25 }}>
                        {OPS_COPY.agenda.viewDistribution}
                      </ToggleButton>
                    </ToggleButtonGroup>

                    <ToggleButtonGroup
                      value={layers}
                      onChange={(_event, next) => next.length && setLayers(next)}
                      sx={{ flexWrap: 'wrap', gap: 1 }}
                    >
                      {LAYERS.map((item) => (
                        <ToggleButton key={item.key} value={item.key} sx={{ borderRadius: 1.25 }}>
                          {item.label}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>

                    <Grid container spacing={1.25}>
                      {layerCounts.map((item) => (
                        <Grid key={item.key} size={{ xs: 12, md: 6 }}>
                          <EntityLinkCard
                            label={item.label}
                            value={item.count ? `${item.count} demanda(s)` : OPS_COPY.agenda.emptyLayer}
                            subtitle={item.subtitle}
                          />
                        </Grid>
                      ))}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <EntityLinkCard
                          label="Calendário editorial"
                          value={OPS_COPY.agenda.editorialLinkValue}
                          href="/calendar"
                          subtitle={OPS_COPY.agenda.editorialLinkSubtitle}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <EntityLinkCard
                          label="Reuniões"
                          value={OPS_COPY.agenda.meetingsLinkValue}
                          href="/admin/reunioes"
                          subtitle={OPS_COPY.agenda.meetingsLinkSubtitle}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </OpsToolbar>
              </OpsSection>

              <OpsSection
                eyebrow={viewMode === 'calendar' ? OPS_COPY.agenda.calendarEyebrow : OPS_COPY.agenda.distributionEyebrow}
                title={viewMode === 'calendar' ? OPS_COPY.agenda.calendarTitle : OPS_COPY.agenda.distributionTitle}
                subtitle={viewMode === 'calendar' ? OPS_COPY.agenda.calendarSubtitle : OPS_COPY.agenda.distributionSubtitle}
              >
                <OpsSurface>
                  {viewMode === 'calendar' ? (
                    groupedDays.length ? (
                    <Stack spacing={0}>
                      {groupedDays.map((group, index) => (
                        <Box
                          key={group.day}
                          sx={(theme) => ({
                            pt: index === 0 ? 0 : 2.25,
                            mt: index === 0 ? 0 : 2.25,
                            borderTop: index === 0 ? 'none' : '1px solid',
                            borderColor: index === 0 ? 'transparent' : theme.palette.divider,
                          })}
                        >
                          <Stack spacing={1.5}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'flex-start' }}>
                              <Box>
                                <Typography variant="h6" fontWeight={900}>
                                  {group.day}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {group.jobs.length} {OPS_COPY.agenda.dayImpactSuffix}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {group.layerSummary.map((item) => (
                                  <Chip key={item.key} size="small" label={`${item.label} ${item.count}`} />
                                ))}
                              </Stack>
                            </Stack>

                            <Stack spacing={0.35}>
                              {group.jobs.map((job) => (
                                <OpsJobRow
                                  key={job.id}
                                  job={job}
                                  selected={selectedJob?.id === job.id}
                                  onClick={() => setSelectedJob(job)}
                                  showStage
                                  timeValue={agendaAnchor(job)}
                                />
                              ))}
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                    ) : (
                    <EmptyOperationState
                      title={OPS_COPY.agenda.emptyAgendaTitle}
                      description={OPS_COPY.agenda.emptyAgendaDescription}
                    />
                    )
                  ) : distributionRows.length ? (
                    <Stack spacing={0}>
                      <Box
                        sx={{
                          mb: 2.25,
                          px: 1.5,
                          py: 1.25,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={900}>
                              {OPS_COPY.agenda.distributionHeaderTitle}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {OPS_COPY.agenda.distributionHeaderSubtitle}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip size="small" color="success" label="Folga" />
                            <Chip size="small" color="warning" label="Carga média" />
                            <Chip size="small" color="error" label="Carga alta" />
                          </Stack>
                        </Stack>
                      </Box>

                      <Box
                        sx={{
                          mb: 2.25,
                          pb: 2.25,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'flex-start' }} sx={{ mb: 1.25 }}>
                          <Box>
                            <Typography variant="body2" fontWeight={900}>
                              {OPS_COPY.agenda.unassignedTitle}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {OPS_COPY.agenda.unassignedSubtitle}
                            </Typography>
                          </Box>
                          <Chip size="small" label={`${plannerData.unassigned_jobs.length} demanda(s)`} />
                        </Stack>

                        {plannerData.unassigned_jobs.length ? (
                          <Stack spacing={0.35}>
                            {plannerData.unassigned_jobs.slice(0, 4).map((job) => (
                              <OpsJobRow
                                key={job.id}
                                job={job}
                                selected={selectedJob?.id === job.id}
                                onClick={() => setSelectedJob(job)}
                                showStage
                                timeValue={agendaAnchor(job)}
                              />
                            ))}
                            {plannerData.unassigned_jobs.length > 4 ? (
                              <Typography variant="caption" color="text.secondary" sx={{ pt: 0.75 }}>
                                +{plannerData.unassigned_jobs.length - 4} demanda(s) ainda sem responsável.
                              </Typography>
                            ) : null}
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
                            <Box
                              sx={(theme) => ({
                                width: 28,
                                height: 28,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
                                color: theme.palette.success.main,
                              })}
                            >
                              <IconUserQuestion size={15} />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {OPS_COPY.agenda.unassignedEmpty}
                            </Typography>
                          </Stack>
                        )}
                      </Box>

                      {distributionRows.map((row, index) => (
                        <Box
                          key={row.owner.id}
                          sx={(theme) => ({
                            pt: index === 0 ? 0 : 2.25,
                            mt: index === 0 ? 0 : 2.25,
                            borderTop: index === 0 ? 'none' : '1px solid',
                            borderColor: index === 0 ? 'transparent' : theme.palette.divider,
                          })}
                        >
                          <Stack spacing={1.5}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'flex-start' }}>
                              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                                <PersonThumb name={row.owner.name} accent={ownerAccent(row.owner.person_type)} size={34} />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body1" fontWeight={900}>
                                    {row.owner.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {(row.owner.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna')} · {row.owner.specialty || row.owner.role || 'Operação'}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip size="small" label={`${row.jobs.length} demanda(s)`} />
                                <Chip size="small" color={row.usage >= 0.85 ? 'warning' : 'default'} label={row.usage >= 0.85 ? 'Sob pressão' : 'Com folga'} />
                              </Stack>
                            </Stack>

                            <CapacityBar
                              allocableMinutes={row.allocable_minutes}
                              committedMinutes={row.committed_minutes}
                              tentativeMinutes={row.tentative_minutes}
                              title="Carga desta semana"
                            />

                            <Grid container spacing={1} sx={{ mb: 0.25 }}>
                              {row.days.map((day) => (
                                <Grid key={`header-${row.owner.id}-${day.key}`} size={{ xs: 12, sm: 6, md: 2.4 }}>
                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    sx={{
                                      px: 0.3,
                                      pb: 0.2,
                                      borderBottom: '1px solid',
                                      borderColor: 'divider',
                                    }}
                                  >
                                    <Typography variant="caption" color="text.secondary">
                                      {day.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {day.jobs.length ? `${Math.round(day.plannedMinutes / 60)}h` : 'livre'}
                                    </Typography>
                                  </Stack>
                                </Grid>
                              ))}
                            </Grid>

                            <Grid container spacing={1}>
                              {row.days.map((day) => (
                                <Grid key={day.key} size={{ xs: 12, sm: 6, md: 2.4 }}>
                                  <Box
                                    sx={(theme) => ({
                                      px: 1,
                                      py: 1,
                                      minHeight: 112,
                                      borderRadius: 2,
                                      bgcolor: day.jobs.length
                                        ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.04 : 0.02)
                                        : 'transparent',
                                      border: '1px solid',
                                      borderColor: theme.palette.divider,
                                      borderTop: `2px solid ${opsDayAccent(theme, day.jobs.length, day.plannedMinutes)}`,
                                    })}
                                  >
                                    <Stack spacing={0.8}>
                                      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                                        <Box>
                                          <Typography variant="body2" fontWeight={800}>
                                            {day.jobs.length ? `${day.jobs.length} demanda(s)` : 'Livre'}
                                          </Typography>
                                        </Box>
                                        {day.plannedMinutes ? <Chip size="small" label={`${Math.round(day.plannedMinutes / 60)}h`} /> : null}
                                      </Stack>
                                      <Stack spacing={0.45}>
                                        {day.jobs.slice(0, 2).map((job) => (
                                          <Box
                                            key={job.id}
                                            onClick={() => setSelectedJob(job)}
                                            sx={(theme) => ({
                                              px: 0.75,
                                              py: 0.7,
                                              borderRadius: 1,
                                              cursor: 'pointer',
                                              bgcolor: selectedJob?.id === job.id ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) : 'transparent',
                                              '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.06),
                                              },
                                            })}
                                          >
                                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                                              <ClientThumb name={job.client_name} logoUrl={job.client_logo_url} accent={job.client_brand_color || '#E85219'} size={22} />
                                              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }} noWrap>
                                                {job.title}
                                              </Typography>
                                            </Stack>
                                          </Box>
                                        ))}
                                        {day.jobs.length > 2 ? (
                                          <Typography variant="caption" color="text.secondary">
                                            +{day.jobs.length - 2} demanda(s)
                                          </Typography>
                                        ) : null}
                                      </Stack>
                                    </Stack>
                                  </Box>
                                </Grid>
                              ))}
                            </Grid>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <EmptyOperationState
                      title={OPS_COPY.agenda.distributionEmptyTitle}
                      description={OPS_COPY.agenda.distributionEmptyDescription}
                    />
                  )}
                </OpsSurface>
              </OpsSection>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.4 }}>
            <Stack spacing={3}>
              <JobFocusRail
                job={selectedJob}
                title={OPS_COPY.common.focusTitle}
                subtitle={OPS_COPY.agenda.focusSubtitle}
                primaryLabel={isNativeMeeting ? 'Abrir reuniões' : focusedAction?.label}
                onPrimaryAction={() => {
                  if (!selectedJob) return;
                  if (isNativeMeeting) {
                    router.push('/admin/reunioes');
                    return;
                  }
                  setDetailOpen(true);
                }}
                emptyTitle="Selecione uma demanda"
                emptyDescription={OPS_COPY.agenda.focusEmptySubtitle}
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
                        href={(() => {
                          const owner = lookups.owners.find((o) => o.id === selectedJob.owner_id);
                          return owner?.freelancer_profile_id
                            ? `/admin/equipe/${owner.freelancer_profile_id}`
                            : '/admin/operacoes/planner';
                        })()}
                        subtitle="Quem precisa agir primeiro"
                        thumbnail={<PersonThumb name={selectedJob.owner_name} accent="#5D87FF" size={26} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Janela na agenda"
                        value={selectedAgendaLabel}
                        subtitle="Como esta demanda entra na leitura da semana"
                        thumbnail={<SourceThumb source={selectedLayer || 'agenda'} jobType="meeting" accent="#13DEB9" />}
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
                  <Stack spacing={2}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight={900}>
                          {OPS_COPY.agenda.nextDaysTitle}
                        </Typography>
                        <Chip size="small" label={`${groupedDays.length}`} />
                      </Stack>
                      <Stack spacing={0.35}>
                        {groupedDays.slice(0, 4).map((group) => (
                          <Box key={group.day} sx={{ px: 1.25, py: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                              <Box>
                                <Typography variant="body2" fontWeight={800}>
                                  {group.day}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {group.jobs.length} item(ns) no dia
                                </Typography>
                              </Box>
                              <Chip size="small" label={`${group.layerSummary.length} camadas`} />
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (!selectedJob) return;
                          if (isNativeMeeting) {
                            router.push('/admin/reunioes');
                            return;
                          }
                          setDetailOpen(true);
                        }}
                        disabled={!selectedJob}
                      >
                        {isNativeMeeting ? 'Abrir reuniões' : OPS_COPY.common.openDetail}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={async () => {
                          await refresh();
                          const response = await apiGet<{ data?: { days?: typeof agendaDays } }>('/operations/calendar');
                          setAgendaDays(response?.data?.days || []);
                        }}
                      >
                        {OPS_COPY.agenda.refresh}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => selectedJob && fetchJob(selectedJob.id).then((job) => setSelectedJob(job))}
                        disabled={!selectedJob || isStandaloneAgendaItem}
                      >
                        {isNativeMeeting ? 'Demanda indisponível' : OPS_COPY.common.refreshDetail}
                      </Button>
                    </Stack>
                  </Stack>
                }
              />
            </Stack>
          </Grid>
        </Grid>
      )}

      <JobWorkbenchDrawer
        open={detailOpen && Boolean(selectedJob) && !isStandaloneAgendaItem}
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
          const response = await apiGet<{ data?: { days?: typeof agendaDays } }>('/operations/calendar');
          setAgendaDays(response?.data?.days || []);
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onStatusChange={async (jobId, status, reason) => {
          const updated = await changeStatus(jobId, status, reason);
          await refresh();
          const response = await apiGet<{ data?: { days?: typeof agendaDays } }>('/operations/calendar');
          setAgendaDays(response?.data?.days || []);
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}
