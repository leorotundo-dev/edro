'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import {
  IconAlertTriangle,
  IconCalendarClock,
  IconCircleCheckFilled,
  IconInbox,
  IconUserQuestion,
  IconUsers,
} from '@tabler/icons-react';
import { apiGet } from '@/lib/api';
import { useJarvisPage } from '@/hooks/useJarvisPage';
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
  OpsPanel,
  OpsSection,
  OpsSurface,
  OpsToolbar,
  PersonThumb,
  SourceThumb,
} from '@/components/operations/primitives';
import { formatSourceLabel, getNextAction, getRisk, type OperationsJob } from '@/components/operations/model';
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

function opsDayState(jobCount: number, plannedMinutes: number) {
  if (!jobCount) return { label: 'Livre', tone: 'neutral' as const };
  if (plannedMinutes >= 6 * 60) return { label: 'Pesado', tone: 'error' as const };
  if (plannedMinutes >= 3 * 60) return { label: 'Atenção', tone: 'warning' as const };
  return { label: 'Leve', tone: 'success' as const };
}

function ownerLoadState(usage: number) {
  if (usage >= 1) return { label: 'Estourado', color: 'error' as const };
  if (usage >= 0.85) return { label: 'Atenção', color: 'warning' as const };
  return { label: 'Com folga', color: 'success' as const };
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

function summarizeAgendaJobs(jobs: OperationsJob[]) {
  const ordered = [...jobs].sort(sortByOperationalPriority);
  return {
    primaryJob: ordered[0] || null,
    unassigned: jobs.filter((job) => !job.owner_id).length,
    waitingClient: jobs.filter((job) => job.status === 'awaiting_approval').length,
    blocked: jobs.filter((job) => job.status === 'blocked').length,
    urgent: jobs.filter((job) => job.is_urgent).length,
    risky: jobs.filter((job) => {
      const level = getRisk(job).level;
      return level === 'critical' || level === 'high';
    }).length,
  };
}

export default function OperationsAgendaClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('edit');
  const [createComposerPath, setCreateComposerPath] = useState<'briefing' | 'job' | 'adjustment' | 'client_request'>('client_request');
  const queryView = searchParams.get('view');
  const initialViewMode: AgendaViewMode = queryView === 'distribution' ? 'distribution' : 'calendar';
  const [viewMode, setViewMode] = useState<AgendaViewMode>(initialViewMode);
  const [layers, setLayers] = useState<AgendaLayer[]>(['deadlines', 'approvals', 'publications', 'production', 'meetings', 'risks']);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaError, setAgendaError] = useState('');
  const [agendaDays, setAgendaDays] = useState<Array<{ day: string; jobs: OperationsJob[]; layerSummary: Array<{ key: string; label: string; count: number }> }>>([]);
  const [plannerData, setPlannerData] = useState<PlannerData>({ owners: [], unassigned_jobs: [] });

  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  useEffect(() => {
    let active = true;
    const loadAgenda = async () => {
      setAgendaLoading(true);
      setAgendaError('');
      try {
        const [calendarResponse, plannerResponse] = await Promise.all([
          apiGet<{ data?: { days?: typeof agendaDays } }>('/trello/ops-calendar'),
          apiGet<{ data?: PlannerData }>('/trello/ops-planner'),
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
  const layerCountMap = useMemo(
    () => Object.fromEntries(layerCounts.map((item) => [item.key, item.count])) as Record<AgendaLayer, number>,
    [layerCounts]
  );
  const weekPulseDays = useMemo(
    () =>
      WEEK_DAYS.map((day) => {
        const jobsForDay = filteredJobs.filter((job) => agendaWeekdayKey(job) === day.key);
        const plannedMinutes = jobsForDay.reduce((sum, job) => {
          const allocation = job.metadata?.allocation as { planned_minutes?: number | null } | undefined;
          return sum + Number(allocation?.planned_minutes ?? job.estimated_minutes ?? 0);
        }, 0);
        const state = opsDayState(jobsForDay.length, plannedMinutes);
        const summary = summarizeAgendaJobs(jobsForDay);
        return {
          ...day,
          dayLabel: day.label,
          jobCount: jobsForDay.length,
          plannedMinutes,
          stateLabel: state.label,
          tone: state.tone,
          ...summary,
        };
      }),
    [filteredJobs]
  );
  const overloadedOwners = useMemo(() => distributionRows.filter((row) => row.usage >= 0.85).length, [distributionRows]);
  const ownersWithSlack = useMemo(() => distributionRows.filter((row) => row.usage < 0.55).length, [distributionRows]);
  const busiestDay = useMemo(
    () => [...weekPulseDays].sort((a, b) => b.plannedMinutes - a.plannedMinutes || b.jobCount - a.jobCount)[0],
    [weekPulseDays]
  );

  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;
  const selectedLayer = selectedJob ? (agendaLayer(selectedJob) as AgendaLayer) : null;
  const isStandaloneAgendaItem = Boolean(selectedJob?.metadata?.calendar_item?.standalone);

  useJarvisPage(
    {
      screen: 'operations_agenda',
      operationsView: viewMode,
      clientId: selectedJob?.client_id ?? null,
      currentJobId: selectedJob?.id ?? null,
      currentJobTitle: selectedJob?.title ?? null,
      currentJobStatus: selectedJob?.status ?? null,
      currentJobOwner: selectedJob?.owner_name ?? null,
      currentJobDeadline: selectedJob?.deadline_at ?? null,
      agendaLayers: layers,
    },
    [
      viewMode,
      selectedJob?.id,
      selectedJob?.client_id,
      selectedJob?.title,
      selectedJob?.status,
      selectedJob?.owner_name,
      selectedJob?.deadline_at,
      layers.join('|'),
    ]
  );
  const isNativeMeeting = selectedJob?.metadata?.calendar_item?.source_type === 'meeting';
  const selectedAgendaLabel = selectedJob
    ? String(selectedJob.metadata?.calendar_item?.label || (selectedLayer ? LAYER_LABELS[selectedLayer] : 'Sem camada'))
    : 'Sem camada';
  const shellSubtitle = viewMode === 'calendar'
    ? 'Janela temporal da operação para prazos, aprovações, publicações e impacto no calendário.'
    : 'Distribuição da carga da equipe para replanejar a semana e resolver apertos.';

  async function reloadAgenda() {
    await refresh();
    const [calendarResponse, plannerResponse] = await Promise.all([
      apiGet<{ data?: { days?: typeof agendaDays } }>('/trello/ops-calendar'),
      apiGet<{ data?: PlannerData }>('/trello/ops-planner'),
    ]);
    setAgendaDays(calendarResponse?.data?.days || []);
    setPlannerData(plannerResponse?.data || { owners: [], unassigned_jobs: [] });
  }

  const handleAdvance = async (jobId: string, nextStatus: string) => {
    const updated = await changeStatus(jobId, nextStatus);
    await reloadAgenda();
    if (updated) setSelectedJob(updated as OperationsJob);
  };

  const handleAssign = async (jobId: string, ownerId: string) => {
    const updated = await updateJob(jobId, { owner_id: ownerId, assignee_ids: [ownerId] });
    await reloadAgenda();
    if (updated) setSelectedJob(updated as OperationsJob);
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, next: AgendaViewMode | null) => {
    if (!next) return;
    setViewMode(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'calendar') params.delete('view');
    else params.set('view', next);
    const qs = params.toString();
    router.replace(qs ? `/admin/operacoes/semana?${qs}` : '/admin/operacoes/semana', { scroll: false });
  };

  const openCreate = (path: 'briefing' | 'job' | 'adjustment' | 'client_request' = 'client_request') => {
    setSelectedJob(null);
    setCreateComposerPath(path);
    setDrawerMode('create');
    setDetailOpen(true);
  };

  const openCommands = (job: OperationsJob) => {
    setSelectedJob(job);
    setDrawerMode('edit');
    setDetailOpen(true);
  };

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
      section="semana"
      titleOverride="Semana"
      subtitleOverride={shellSubtitle}
      onNewDemand={() => openCreate('client_request')}
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
          <Grid size={{ xs: 12 }}>
            <OpsPanel
              eyebrow="Semáforo da semana"
              title={viewMode === 'calendar' ? 'Onde o calendário aperta' : 'Onde a distribuição aperta'}
              subtitle={
                viewMode === 'calendar'
                  ? 'Veja prazos, aprovações e publicações que pressionam a semana antes de decidir.'
                  : 'Redistribua a carga da equipe vendo quem apertou, o que ficou sem dono e quais dias já pesaram.'
              }
              action={
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" variant="outlined" label="Ao vivo do Trello" />
                  <Chip size="small" variant="outlined" color="info" label="Estimado pela Edro" />
                </Stack>
              }
            >
              <Stack spacing={2.25}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' },
                    gap: 1.25,
                  }}
                >
                  {[
                    { label: 'Aperto', value: overloadedOwners, subtitle: 'Pessoas sob pressão', href: '/admin/operacoes/semana?view=distribution', icon: <IconAlertTriangle size={16} />, color: '#FA896B' },
                    { label: 'Folga', value: ownersWithSlack, subtitle: 'Pessoas com espaço', href: '/admin/operacoes/semana?view=distribution', icon: <IconUsers size={16} />, color: '#13DEB9' },
                    { label: 'Sem dono', value: plannerData.unassigned_jobs.length, subtitle: 'Demandas soltas', href: '/admin/operacoes/jobs?unassigned=true', icon: <IconInbox size={16} />, color: '#FFAE1F' },
                    { label: 'Aprovações', value: layerCountMap.approvals || 0, subtitle: 'Esperando cliente', href: '/admin/operacoes/radar', icon: <IconCircleCheckFilled size={16} />, color: '#FFAE1F' },
                    { label: 'Riscos', value: layerCountMap.risks || 0, subtitle: 'Podem estourar', href: '/admin/operacoes/radar', icon: <IconCalendarClock size={16} />, color: '#E85219' },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      component={Link}
                      href={item.href}
                      sx={(theme) => ({
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit',
                        p: 1.5,
                        borderRadius: 2,
                        border: `1px solid ${alpha(item.color, 0.22)}`,
                        bgcolor: theme.palette.mode === 'dark' ? alpha(item.color, 0.08) : alpha(item.color, 0.04),
                        transition: 'all 180ms ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          borderColor: alpha(item.color, 0.35),
                          bgcolor: theme.palette.mode === 'dark' ? alpha(item.color, 0.12) : alpha(item.color, 0.08),
                        },
                      })}
                    >
                      <Stack spacing={0.7}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: alpha(item.color, 0.14),
                              color: item.color,
                            }}
                          >
                            {item.icon}
                          </Box>
                          <Typography sx={{ fontWeight: 900, color: item.color, fontSize: '1.4rem', lineHeight: 1 }}>
                            {item.value}
                          </Typography>
                        </Stack>
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.primary', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {item.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {item.subtitle}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                </Box>

                <Box
                  sx={(theme) => ({
                    p: 1.25,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.common.black, 0.015),
                  })}
                >
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'center' }} sx={{ mb: 1.25 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={900}>
                        Pulso dos dias úteis
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cada bloco mostra quantas demandas e quantas horas previstas puxam o dia.
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={busiestDay ? `${busiestDay.dayLabel} mais puxado: ${busiestDay.jobCount} demanda(s)` : 'Nenhum dia puxado'}
                    />
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' },
                      gap: 1,
                    }}
                  >
                    {weekPulseDays.map((day) => {
                      const color =
                        day.tone === 'error'
                          ? '#FA896B'
                          : day.tone === 'warning'
                            ? '#FFAE1F'
                            : day.tone === 'success'
                              ? '#13DEB9'
                              : alpha('#111827', 0.38);

                      return (
                        <Box
                          key={day.key}
                          onClick={() => {
                            if (day.primaryJob) setSelectedJob(day.primaryJob);
                          }}
                          sx={(theme) => ({
                            p: 1.15,
                            borderRadius: 2,
                            border: `1px solid ${alpha(color, day.tone === 'neutral' ? 0.18 : 0.24)}`,
                            borderTop: `3px solid ${color}`,
                            bgcolor: theme.palette.mode === 'dark' ? alpha(color, day.tone === 'neutral' ? 0.04 : 0.08) : alpha(color, day.tone === 'neutral' ? 0.03 : 0.04),
                            cursor: day.primaryJob ? 'pointer' : 'default',
                            transition: 'transform 160ms ease, box-shadow 160ms ease',
                            '&:hover': day.primaryJob
                              ? {
                                  transform: 'translateY(-2px)',
                                  boxShadow: theme.shadows[2],
                                }
                              : undefined,
                          })}
                        >
                          <Stack spacing={0.55}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {day.dayLabel}
                              </Typography>
                              <Chip size="small" label={day.jobCount ? `${Math.round(day.plannedMinutes / 60)}h` : '0h'} />
                            </Stack>
                            <Typography sx={{ fontWeight: 900, color, fontSize: '1.2rem', lineHeight: 1 }}>
                              {day.jobCount}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {day.jobCount ? `${day.dayLabel.toLowerCase()} · ${day.stateLabel === 'Livre' ? 'sem pressão' : `${day.stateLabel.toLowerCase()} na agenda`}` : 'Sem impacto'}
                            </Typography>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {day.unassigned ? <Chip size="small" label={`${day.unassigned} sem dono`} /> : null}
                              {day.waitingClient ? <Chip size="small" color="warning" label={`${day.waitingClient} cliente`} /> : null}
                              {day.risky ? <Chip size="small" color="error" label={`${day.risky} risco`} /> : null}
                            </Stack>
                            <Chip
                              size="small"
                              color={day.tone === 'error' ? 'error' : day.tone === 'warning' ? 'warning' : day.tone === 'success' ? 'success' : 'default'}
                              label={day.stateLabel}
                              sx={{ alignSelf: 'flex-start' }}
                            />
                            {day.primaryJob ? (
                              <Button
                                variant="text"
                                size="small"
                                sx={{ alignSelf: 'flex-start', px: 0 }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedJob(day.primaryJob);
                                }}
                              >
                                Abrir mais crítica
                              </Button>
                            ) : null}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" onClick={() => openCreate('client_request')}>
                    Nova demanda
                  </Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/semana?view=distribution">
                    Ver capacidade
                  </Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/semana?view=calendar">
                    Ver calendário
                  </Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/radar">
                    Abrir riscos
                  </Button>
                </Stack>
              </Stack>
            </OpsPanel>
          </Grid>

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
                      onChange={handleViewModeChange}
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
                        (() => {
                          const summary = summarizeAgendaJobs(group.jobs);
                          return (
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
                                <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {group.layerSummary.map((item) => (
                                      <Chip key={item.key} size="small" label={`${item.label} ${item.count}`} />
                                    ))}
                                    {summary.unassigned ? <Chip size="small" label={`${summary.unassigned} sem dono`} /> : null}
                                    {summary.waitingClient ? <Chip size="small" color="warning" label={`${summary.waitingClient} cliente`} /> : null}
                                    {summary.risky ? <Chip size="small" color="error" label={`${summary.risky} risco`} /> : null}
                                  </Stack>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {summary.primaryJob ? (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => setSelectedJob(summary.primaryJob)}
                                      >
                                        Abrir mais crítica
                                      </Button>
                                    ) : null}
                                    {summary.unassigned && currentUserId ? (
                                      <Button
                                        size="small"
                                        variant="text"
                                        onClick={async () => {
                                          const target = group.jobs.find((job) => !job.owner_id);
                                          if (!target) return;
                                          await handleAssign(target.id, currentUserId);
                                        }}
                                      >
                                        Puxar sem dono
                                      </Button>
                                    ) : null}
                                  </Stack>
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
                                    onAdvance={handleAdvance}
                                    onAssign={handleAssign}
                                    owners={lookups.owners}
                                  />
                                ))}
                              </Stack>
                            </Stack>
                          </Box>
                          );
                        })()
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
                                onAdvance={handleAdvance}
                                onAssign={handleAssign}
                                owners={lookups.owners}
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
                                <Chip
                                  size="small"
                                  color={ownerLoadState(row.usage).color}
                                  label={ownerLoadState(row.usage).label}
                                />
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
                                (() => {
                                  const summary = summarizeAgendaJobs(day.jobs);
                                  return (
                                <Grid key={day.key} size={{ xs: 12, sm: 6, md: 2.4 }}>
                                  <Box
                                    onClick={() => {
                                      if (summary.primaryJob) setSelectedJob(summary.primaryJob);
                                    }}
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
                                      cursor: summary.primaryJob ? 'pointer' : 'default',
                                      transition: 'transform 160ms ease, box-shadow 160ms ease',
                                      '&:hover': summary.primaryJob
                                        ? {
                                            transform: 'translateY(-2px)',
                                            boxShadow: theme.shadows[2],
                                          }
                                        : undefined,
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
                                      <Chip
                                        size="small"
                                        color={
                                          day.jobs.length
                                            ? day.plannedMinutes >= 6 * 60
                                              ? 'error'
                                              : day.plannedMinutes >= 3 * 60
                                                ? 'warning'
                                                : 'success'
                                            : 'default'
                                        }
                                        label={day.jobs.length ? opsDayState(day.jobs.length, day.plannedMinutes).label : 'Livre'}
                                        sx={{ alignSelf: 'flex-start' }}
                                      />
                                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                        {summary.waitingClient ? <Chip size="small" color="warning" label={`${summary.waitingClient} cliente`} /> : null}
                                        {summary.blocked ? <Chip size="small" color="error" label={`${summary.blocked} bloqueado`} /> : null}
                                        {summary.urgent ? <Chip size="small" color="error" label={`${summary.urgent} urgente`} /> : null}
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
                                      {summary.primaryJob ? (
                                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                          <Button
                                            size="small"
                                            variant="text"
                                            sx={{ px: 0 }}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setSelectedJob(summary.primaryJob);
                                            }}
                                          >
                                            Abrir crítica
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="text"
                                            sx={{ px: 0 }}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              openCommands(summary.primaryJob);
                                            }}
                                          >
                                            Abrir comandos
                                          </Button>
                                        </Stack>
                                      ) : null}
                                    </Stack>
                                  </Box>
                                </Grid>
                                  );
                                })()
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
                title={viewMode === 'calendar' ? 'Janela da semana' : 'Distribuição da semana'}
                subtitle={
                  viewMode === 'calendar'
                    ? 'Resolva prazo, aprovação e contexto sem perder a leitura temporal da operação.'
                    : 'Resolva dono, carga e encaixe sem perder a leitura da distribuição.'
                }
                primaryLabel={isNativeMeeting ? 'Abrir reunioes' : 'Abrir comandos'}
                onPrimaryAction={() => {
                  if (!selectedJob) return;
                  if (isNativeMeeting) {
                    router.push('/admin/reunioes');
                    return;
                  }
                  openCommands(selectedJob);
                }}
                emptyTitle="Selecione uma demanda"
                emptyDescription="Clique em uma demanda da semana para ver o pulso, os atalhos e o que precisa ser resolvido."
                eyebrow="SEMANA EM FOCO"
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
                        label="Dono"
                        value={selectedJob.owner_name || 'Sem responsavel'}
                        href={(() => {
                          const owner = lookups.owners.find((o) => o.id === selectedJob.owner_id);
                          return owner?.freelancer_profile_id
                            ? `/admin/equipe/${owner.freelancer_profile_id}`
                            : '/admin/operacoes/semana?view=distribution';
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
                          openCommands(selectedJob);
                        }}
                        disabled={!selectedJob}
                      >
                        {isNativeMeeting ? 'Abrir reunioes' : 'Abrir prazo e comandos'}
                      </Button>
                      {!isNativeMeeting && selectedJob && !selectedJob.owner_id && currentUserId ? (
                        <Button
                          variant="outlined"
                          onClick={async () => {
                            await handleAssign(selectedJob.id, currentUserId);
                          }}
                        >
                          Assumir agora
                        </Button>
                      ) : null}
                      {!isNativeMeeting && selectedJob?.owner_id ? (
                        <Button
                          variant="outlined"
                          component={Link}
                          href="/admin/operacoes/semana?view=distribution"
                        >
                          Ver distribuicao
                        </Button>
                      ) : null}
                      <Button
                        variant="outlined"
                        onClick={async () => {
                          await refresh();
                          const response = await apiGet<{ data?: { days?: typeof agendaDays } }>('/trello/ops-calendar');
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
                        {isNativeMeeting ? 'Demanda indisponivel' : OPS_COPY.common.refreshDetail}
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
        open={detailOpen && (drawerMode === 'create' || (Boolean(selectedJob) && !isStandaloneAgendaItem))}
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
        onClose={() => setDetailOpen(false)}
        onCreate={createJob}
        onUpdate={async (jobId, payload) => {
          const updated = await updateJob(jobId, payload);
          await refresh();
          const response = await apiGet<{ data?: { days?: typeof agendaDays } }>('/trello/ops-calendar');
          setAgendaDays(response?.data?.days || []);
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onStatusChange={async (jobId, status, reason) => {
          const updated = await changeStatus(jobId, status, reason);
          await refresh();
          const response = await apiGet<{ data?: { days?: typeof agendaDays } }>('/trello/ops-calendar');
          setAgendaDays(response?.data?.days || []);
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}
