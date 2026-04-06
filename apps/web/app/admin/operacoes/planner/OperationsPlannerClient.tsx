'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { apiGet, apiPost } from '@/lib/api';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import {
  CapacityBar,
  ClientThumb,
  EmptyOperationState,
  EntityLinkCard,
  OperationsContextRail,
  OpsJobRow,
  OpsSection,
  PersonThumb,
  SourceThumb,
} from '@/components/operations/primitives';
import { formatSkillLabel, formatSourceLabel, getNextAction, type OperationsJob } from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OPS_COPY } from '@/components/operations/copy';

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

/** Returns a color interpolated from green (free) → yellow (mid) → red (full) */
function heatColor(usage: number) {
  const u = Math.max(0, Math.min(1.2, usage));
  if (u <= 0.5) {
    // green → yellow
    const t = u / 0.5;
    const r = Math.round(19 + (255 - 19) * t);
    const g = Math.round(222 + (174 - 222) * t);
    const b = Math.round(185 + (31 - 185) * t);
    return `rgb(${r},${g},${b})`;
  }
  // yellow → red
  const t = Math.min(1, (u - 0.5) / 0.5);
  const r = Math.round(255 - (255 - 250) * t);
  const g = Math.round(174 - (174 - 56) * t);
  const b = Math.round(31 - (31 - 75) * t);
  return `rgb(${r},${g},${b})`;
}

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}min`;
  if (!m) return `${h}h`;
  return `${h}h${m}`;
}

type Suggestion = {
  display_name: string;
  email: string;
  trello_member_id: string | null;
  user_id: string | null;
  active_cards: number;
  sla_rate: number | null;
  score: number;
  score_breakdown: { load: number; sla: number; specialty: number };
  reason: string;
};

function plannerWeekdayKey(job: OperationsJob) {
  const allocation = job.metadata?.allocation as { starts_at?: string | null } | undefined;
  const source = allocation?.starts_at || job.deadline_at;
  if (!source) return null;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function plannerWeekSummary(jobs: OperationsJob[]) {
  return WEEK_DAYS.map((day) => {
    const dayJobs = jobs.filter((job) => plannerWeekdayKey(job) === day.key);
    const plannedMinutes = dayJobs.reduce((sum, job) => {
      const allocation = job.metadata?.allocation as { planned_minutes?: number | null } | undefined;
      return sum + Number(allocation?.planned_minutes ?? job.estimated_minutes ?? 0);
    }, 0);
    return { ...day, jobs: dayJobs, plannedMinutes };
  });
}

function TeamHeatStrip({
  rows,
  selectedOwnerId,
  onSelect,
}: {
  rows: Array<{
    owner: { id: string; name: string; role?: string | null; specialty?: string | null; person_type?: 'internal' | 'freelancer'; freelancer_profile_id?: string | null };
    allocableMinutes: number;
    committedMinutes: number;
    usage: number;
    activeJobs: OperationsJob[];
  }>;
  selectedOwnerId?: string | null;
  onSelect?: (ownerId: string) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        overflowX: 'auto',
        pb: 1,
        px: 0.5,
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.12)', borderRadius: 2 },
      }}
    >
      {rows.map((row) => {
        const color = heatColor(row.usage);
        const freeMinutes = Math.max(0, row.allocableMinutes - row.committedMinutes);
        const selected = selectedOwnerId === row.owner.id;
        const accent = ownerAccent(row.owner.person_type);

        return (
          <Box
            key={row.owner.id}
            onClick={() => onSelect?.(row.owner.id)}
            sx={(theme) => ({
              minWidth: 140,
              maxWidth: 160,
              px: 1.75,
              py: 1.5,
              borderRadius: 2,
              cursor: 'pointer',
              flexShrink: 0,
              bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.18 : 0.12),
              border: selected
                ? `2px solid ${color}`
                : `1px solid ${alpha(color, 0.25)}`,
              transition: 'all 180ms ease',
              '&:hover': {
                bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.25 : 0.18),
                transform: 'translateY(-2px)',
              },
            })}
          >
            <Stack spacing={0.75} alignItems="center" textAlign="center">
              <PersonThumb name={row.owner.name} accent={accent} size={40} />
              <Box>
                <Typography
                  variant="body2"
                  fontWeight={900}
                  noWrap
                  sx={{ maxWidth: 120 }}
                  {...(row.owner.freelancer_profile_id ? {
                    component: Link,
                    href: `/admin/equipe/${row.owner.freelancer_profile_id}`,
                    onClick: (e: React.MouseEvent) => e.stopPropagation(),
                    sx: { maxWidth: 120, textDecoration: 'none', color: 'inherit', '&:hover': { color: accent } },
                  } as any : {})}
                >
                  {row.owner.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem', display: 'block', maxWidth: 120 }}>
                  {row.owner.specialty || row.owner.role || 'Equipe'}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                fontWeight={800}
                sx={{ color, fontSize: '0.72rem' }}
              >
                {freeMinutes > 0 ? formatHours(freeMinutes) + ' livre' : 'Lotado'}
              </Typography>
              <Box sx={{ width: '100%', height: 4, borderRadius: 2, bgcolor: alpha(color, 0.15) }}>
                <Box
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: color,
                    width: `${Math.min(100, Math.round(row.usage * 100))}%`,
                    transition: 'width 300ms ease',
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                {row.activeJobs.length} job{row.activeJobs.length !== 1 ? 's' : ''}
              </Typography>
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}

export default function OperationsPlannerClient() {
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(true);
  const [plannerError, setPlannerError] = useState('');
  const [plannerData, setPlannerData] = useState<{
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
  }>({ owners: [], unassigned_jobs: [] });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadPlanner = async () => {
      setPlannerLoading(true);
      setPlannerError('');
      try {
        const response = await apiGet<{ data?: typeof plannerData }>('/trello/ops-planner');
        if (!active) return;
        setPlannerData(response?.data || { owners: [], unassigned_jobs: [] });
      } catch (err: any) {
        if (!active) return;
        setPlannerError(err?.message || 'Falha ao carregar a alocação.');
      } finally {
        if (active) setPlannerLoading(false);
      }
    };
    loadPlanner();
    return () => {
      active = false;
    };
  }, [jobs.length]);

  const ownerRows = plannerData.owners.map((row) => ({
    owner: row.owner,
    allocableMinutes: row.allocable_minutes,
    committedMinutes: row.committed_minutes,
    tentativeMinutes: row.tentative_minutes,
    usage: row.usage,
    activeJobs: row.jobs,
  }));

  const unassignedJobs = plannerData.unassigned_jobs;

  const overloaded = ownerRows.filter((row) => row.usage >= 0.85).length;
  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;
  const plannerJobs = useMemo(
    () => [...unassignedJobs, ...ownerRows.flatMap((row) => row.activeJobs)],
    [ownerRows, unassignedJobs]
  );

  useEffect(() => {
    if (!selectedJob) return;
    const fresh = plannerJobs.find((job) => job.id === selectedJob.id) || jobs.find((job) => job.id === selectedJob.id);
    if (fresh) {
      setSelectedJob(fresh);
      return;
    }
    setSelectedJob(null);
  }, [jobs, plannerJobs, selectedJob]);

  useEffect(() => {
    if (!selectedJob) { setSuggestions([]); return; }
    let active = true;
    setSuggestionsLoading(true);
    apiGet<{ suggestions: Suggestion[] }>(`/trello/ops-suggest-owner/${selectedJob.id}`)
      .then((res) => { if (active) setSuggestions(res?.suggestions ?? []); })
      .catch(() => { if (active) setSuggestions([]); })
      .finally(() => { if (active) setSuggestionsLoading(false); });
    return () => { active = false; };
  }, [selectedJob?.id]);

  async function reloadPlanner() {
    await refresh();
    const response = await apiGet<{ data?: typeof plannerData }>('/trello/ops-planner');
    setPlannerData(response?.data || { owners: [], unassigned_jobs: [] });
  }

  async function handleAssign(email: string, displayName: string) {
    if (!selectedJob) return;
    setAssigning(email);
    try {
      await apiPost(`/trello/ops-cards/${selectedJob.id}/assign`, { email });
      await reloadPlanner();
    } catch {
      setPlannerError(`Erro ao atribuir para ${displayName}.`);
    } finally {
      setAssigning(null);
    }
  }

  return (
    <OperationsShell
      section="semana"
      summary={
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          {[
            { value: ownerRows.length, label: OPS_COPY.planner.summaryPeople, color: undefined },
            { value: overloaded, label: OPS_COPY.planner.summaryOverload, color: overloaded ? '#FA896B' : undefined },
            { value: unassignedJobs.length, label: OPS_COPY.planner.summaryUnassigned, color: unassignedJobs.length ? '#FFAE1F' : undefined },
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
      {plannerError ? <Alert severity="error">{plannerError}</Alert> : null}

      {loading || plannerLoading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7.6 }}>
            <Stack spacing={3}>
              <OpsSection
                eyebrow="Leitura da carga"
                title={OPS_COPY.planner.title}
                subtitle={OPS_COPY.planner.subtitle}
                action={
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={`${ownerRows.length} pessoas`} />
                    <Chip size="small" color={overloaded ? 'error' : 'default'} label={`${overloaded} sob pressão`} />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={reloadPlanner}
                    >
                      {OPS_COPY.planner.refresh}
                    </Button>
                  </Stack>
                }
              >
                <TeamHeatStrip
                  rows={ownerRows}
                  selectedOwnerId={selectedJob?.owner_id}
                  onSelect={(ownerId) => {
                    const ownerRow = ownerRows.find((r) => r.owner.id === ownerId);
                    const firstJob = ownerRow?.activeJobs[0];
                    if (firstJob) setSelectedJob(firstJob);
                  }}
                />
                <Stack spacing={2}>
                  {ownerRows.map((row) => {
                    const accent = ownerAccent(row.owner.person_type);
                    const color = heatColor(row.usage);
                    const statusLabel = row.usage >= 1 ? 'Estourado' : row.usage >= 0.85 ? 'Sob pressão' : row.usage >= 0.6 ? 'Em equilíbrio' : 'Com folga';
                    const statusColor: 'error' | 'warning' | 'info' | 'success' = row.usage >= 1 ? 'error' : row.usage >= 0.85 ? 'warning' : row.usage >= 0.6 ? 'info' : 'success';
                    const freeMinutes = Math.max(0, row.allocableMinutes - row.committedMinutes);

                    return (
                      <Box
                        key={row.owner.id}
                        sx={(theme) => ({
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: alpha(color, 0.28),
                          borderLeft: `5px solid ${color}`,
                          bgcolor: theme.palette.mode === 'dark' ? alpha(color, 0.07) : alpha(color, 0.04),
                          overflow: 'hidden',
                        })}
                      >
                        {/* Header */}
                        <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <PersonThumb name={row.owner.name} accent={accent} size={46} />
                              <Box>
                                <Typography variant="body1" fontWeight={900} lineHeight={1.2}>
                                  {row.owner.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {row.owner.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'}
                                  {(row.owner.specialty || row.owner.role) ? ` · ${row.owner.specialty || row.owner.role}` : ''}
                                </Typography>
                              </Box>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Box sx={{
                                px: 1.5, py: 0.5, borderRadius: 99,
                                bgcolor: alpha(color, 0.15),
                                border: `1px solid ${alpha(color, 0.35)}`,
                              }}>
                                <Typography variant="caption" fontWeight={800} sx={{ color }}>
                                  {freeMinutes > 0 ? `${formatHours(freeMinutes)} livre` : 'Sem folga'}
                                </Typography>
                              </Box>
                              <Chip size="small" label={`${row.activeJobs.length} demanda${row.activeJobs.length !== 1 ? 's' : ''}`} />
                              <Chip size="small" color={statusColor} label={statusLabel} />
                            </Stack>
                          </Stack>
                        </Box>

                        {/* Capacity bar */}
                        <Box sx={{ px: 2.5, pb: 2 }}>
                          <CapacityBar
                            allocableMinutes={row.allocableMinutes}
                            committedMinutes={row.committedMinutes}
                            tentativeMinutes={row.tentativeMinutes}
                            title="Capacidade desta semana"
                          />
                        </Box>

                        {/* Week day mini-blocks */}
                        <Box sx={{ px: 2.5, pb: 2 }}>
                          <Grid container spacing={1}>
                            {plannerWeekSummary(row.activeJobs).map((day) => {
                              const hasWork = day.jobs.length > 0;
                              return (
                                <Grid key={day.key} size={{ xs: 6, md: 2.4 }}>
                                  <Box
                                    sx={(theme) => ({
                                      px: 1.5, py: 1.25,
                                      borderRadius: 2,
                                      bgcolor: hasWork
                                        ? alpha(color, theme.palette.mode === 'dark' ? 0.16 : 0.10)
                                        : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.04 : 0.03),
                                      border: '1px solid',
                                      borderColor: hasWork ? alpha(color, 0.35) : 'divider',
                                    })}
                                  >
                                    <Typography
                                      variant="caption"
                                      fontWeight={800}
                                      sx={{ color: hasWork ? color : 'text.disabled', fontSize: '0.62rem', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block' }}
                                    >
                                      {day.label}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={900} sx={{ mt: 0.25, lineHeight: 1.1 }}>
                                      {hasWork ? `${day.jobs.length}×` : 'Livre'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                                      {hasWork ? `${Math.round(day.plannedMinutes / 60)}h` : '—'}
                                    </Typography>
                                  </Box>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Box>

                        {/* Job list */}
                        <Box
                          sx={(theme) => ({
                            px: 2.5, pt: 1.5, pb: 2.5,
                            borderTop: '1px solid',
                            borderColor: alpha(color, 0.15),
                            bgcolor: theme.palette.mode === 'dark' ? alpha('#000', 0.15) : alpha('#fff', 0.55),
                          })}
                        >
                          {row.activeJobs.length > 0 ? (
                            <Stack spacing={0.35}>
                              {row.activeJobs.slice(0, 4).map((job) => (
                                <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} />
                              ))}
                              {row.activeJobs.length > 4 && (
                                <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5, pl: 0.5 }}>
                                  +{row.activeJobs.length - 4} demandas
                                </Typography>
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              {OPS_COPY.planner.emptyRow}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </OpsSection>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.4 }}>
            <OperationsContextRail
              job={selectedJob}
              title={OPS_COPY.common.focusTitle}
              subtitle={OPS_COPY.planner.focusSubtitle}
              primaryLabel={focusedAction?.label}
              onPrimaryAction={() => setDetailOpen(true)}
              emptyTitle="Selecione uma demanda"
              emptyDescription={OPS_COPY.planner.focusEmptySubtitle}
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
                        subtitle={formatSkillLabel(selectedJob.required_skill)}
                        thumbnail={<PersonThumb name={selectedJob.owner_name} accent="#5D87FF" size={26} />}
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
                        subtitle={selectedJob.job_type}
                        thumbnail={<SourceThumb source={selectedJob.source} jobType={selectedJob.job_type} accent="#E85219" />}
                      />
                    </Grid>
                  </Grid>
                ) : null
              }
              sections={[
                {
                  title: 'Demandas sem responsável',
                  action: <Chip size="small" color="warning" label={`${unassignedJobs.length}`} />,
                  content: (
                    <Stack spacing={0.35}>
                      {unassignedJobs.slice(0, 4).map((job) => (
                        <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} />
                      ))}
                      {!unassignedJobs.length ? (
                        <Typography variant="body2" color="text.secondary">
                          {OPS_COPY.planner.emptyUnassigned}
                        </Typography>
                      ) : null}
                    </Stack>
                  ),
                },
                {
                  title: 'Indicação inteligente',
                  content: !selectedJob ? (
                    <Typography variant="body2" color="text.secondary">Selecione uma demanda para ver sugestões.</Typography>
                  ) : suggestionsLoading ? (
                    <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={22} /></Box>
                  ) : suggestions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Nenhuma sugestão disponível.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {suggestions.map((s) => {
                        const scoreColor = s.score >= 75 ? '#13DEB9' : s.score >= 50 ? '#FFAE1F' : '#FA896B';
                        const isAssigning = assigning === s.email;
                        return (
                          <Box
                            key={s.email}
                            sx={(theme) => ({
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: alpha(scoreColor, 0.25),
                              borderLeft: `4px solid ${scoreColor}`,
                              bgcolor: theme.palette.mode === 'dark' ? alpha(scoreColor, 0.06) : alpha(scoreColor, 0.04),
                              px: 1.5,
                              py: 1.25,
                            })}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                  <Typography variant="body2" fontWeight={800} noWrap>{s.display_name}</Typography>
                                  <Chip
                                    size="small"
                                    label={`${s.score}`}
                                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: alpha(scoreColor, 0.15), color: scoreColor, '& .MuiChip-label': { px: 0.75 } }}
                                  />
                                </Stack>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontSize: '0.65rem' }}>
                                  {s.reason}
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={s.score}
                                  sx={{ height: 3, borderRadius: 99, bgcolor: alpha(scoreColor, 0.12), '& .MuiLinearProgress-bar': { bgcolor: scoreColor } }}
                                />
                                <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                                    {s.active_cards} cards ativos
                                  </Typography>
                                  {s.sla_rate !== null && (
                                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                                      SLA {s.sla_rate}%
                                    </Typography>
                                  )}
                                </Stack>
                              </Box>
                              <Button
                                size="small"
                                variant="contained"
                                disabled={assigning !== null}
                                onClick={() => handleAssign(s.email, s.display_name)}
                                sx={{ flexShrink: 0, minWidth: 72, fontSize: '0.7rem' }}
                              >
                                {isAssigning ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : 'Atribuir'}
                              </Button>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  ),
                },
                {
                  title: OPS_COPY.planner.rulesTitle,
                  content: (
                    <Stack spacing={1.25}>
                      <Alert severity="info">Equipe interna opera com 28h alocáveis por semana nesta versão beta.</Alert>
                      <Alert severity="info">Freelancer opera com 16h alocáveis por semana até existir modelagem fina de capacidade.</Alert>
                      <Alert severity="warning">Acima de 85% a pessoa entra em sobrecarga e exige replanejamento.</Alert>
                    </Stack>
                  ),
                },
                {
                  content: (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button variant="contained" onClick={() => setDetailOpen(true)} disabled={!selectedJob}>{OPS_COPY.common.openDetail}</Button>
                      <Button variant="outlined" onClick={reloadPlanner}>{OPS_COPY.planner.refresh}</Button>
                      <Button variant="outlined" onClick={() => selectedJob && fetchJob(selectedJob.id).then((job) => setSelectedJob(job))} disabled={!selectedJob}>{OPS_COPY.common.refreshDetail}</Button>
                    </Stack>
                  ),
                },
              ]}
            />
          </Grid>
        </Grid>
      )}

      <JobWorkbenchDrawer
        open={detailOpen && Boolean(selectedJob)}
        mode="edit"
        job={selectedJob}
        presentation="modal"
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
          await reloadPlanner();
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onStatusChange={async (jobId, status, reason) => {
          const updated = await changeStatus(jobId, status, reason);
          await reloadPlanner();
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}
