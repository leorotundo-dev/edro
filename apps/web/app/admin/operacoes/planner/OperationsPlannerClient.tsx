'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
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
  OpsSection,
  OpsSurface,
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

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function toIsoFromDateInput(value?: string) {
  if (!value) return null;
  return `${value}T12:00:00.000Z`;
}

function endIsoFromStart(startIso: string | null, minutes: number) {
  if (!startIso) return null;
  const date = new Date(startIso);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCMinutes(date.getUTCMinutes() + Math.max(0, minutes));
  return date.toISOString();
}

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
  const [allocationSaving, setAllocationSaving] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    ownerId: '',
    status: 'committed',
    plannedMinutes: '',
    plannedDate: '',
  });

  useEffect(() => {
    let active = true;
    const loadPlanner = async () => {
      setPlannerLoading(true);
      setPlannerError('');
      try {
        const response = await apiGet<{ data?: typeof plannerData }>('/operations/planner');
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
    if (!selectedJob) {
      setAllocationForm({ ownerId: '', status: 'committed', plannedMinutes: '', plannedDate: '' });
      return;
    }
    const allocation = selectedJob.metadata?.allocation as
      | { status?: string; planned_minutes?: number | null; starts_at?: string | null }
      | undefined;
    setAllocationForm({
      ownerId: selectedJob.owner_id || '',
      status: allocation?.status || (selectedJob.status === 'blocked' ? 'blocked' : selectedJob.status === 'planned' ? 'tentative' : 'committed'),
      plannedMinutes: String(allocation?.planned_minutes ?? selectedJob.estimated_minutes ?? ''),
      plannedDate: toDateInputValue(allocation?.starts_at || selectedJob.deadline_at),
    });
  }, [selectedJob]);

  async function reloadPlanner() {
    await refresh();
    const response = await apiGet<{ data?: typeof plannerData }>('/operations/planner');
    setPlannerData(response?.data || { owners: [], unassigned_jobs: [] });
  }

  async function saveAllocation() {
    if (!selectedJob || !allocationForm.ownerId) {
      setPlannerError('Selecione um responsável para salvar a alocação.');
      return;
    }
    setAllocationSaving(true);
    setPlannerError('');
    try {
      const startsAt = toIsoFromDateInput(allocationForm.plannedDate);
      const plannedMinutes = Number(allocationForm.plannedMinutes || selectedJob.estimated_minutes || 0);
      await apiPost('/operations/allocations', {
        job_id: selectedJob.id,
        owner_id: allocationForm.ownerId,
        status: allocationForm.status,
        planned_minutes: plannedMinutes,
        starts_at: startsAt,
        ends_at: endIsoFromStart(startsAt, plannedMinutes),
      });
      await reloadPlanner();
      const updated = await fetchJob(selectedJob.id);
      setSelectedJob(updated);
    } catch (err: any) {
      setPlannerError(err?.message || 'Falha ao salvar a alocação.');
    } finally {
      setAllocationSaving(false);
    }
  }

  async function dropAllocation() {
    if (!selectedJob) return;
    setAllocationSaving(true);
    setPlannerError('');
    try {
      await apiDelete(`/operations/allocations/${selectedJob.id}`);
      await reloadPlanner();
      const updated = await fetchJob(selectedJob.id);
      setSelectedJob(updated);
    } catch (err: any) {
      setPlannerError(err?.message || 'Falha ao remover a alocação.');
    } finally {
      setAllocationSaving(false);
    }
  }

  return (
    <OperationsShell
      section="planner"
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
                <OpsSurface>
                  <Stack spacing={0}>
                    {ownerRows.map((row, index) => {
                      const accent = ownerAccent(row.owner.person_type);
                      const statusLabel = row.usage >= 1 ? 'Estourado' : row.usage >= 0.85 ? 'Sob pressão' : row.usage >= 0.6 ? 'Em equilíbrio' : 'Com folga';
                      const statusColor = row.usage >= 1 ? 'error' : row.usage >= 0.85 ? 'warning' : row.usage >= 0.6 ? 'info' : 'success';

                      return (
                        <Box
                          key={row.owner.id}
                          sx={{
                            pt: index === 0 ? 0 : 2.25,
                            mt: index === 0 ? 0 : 2.25,
                            borderTop: index === 0 ? 'none' : '1px solid',
                            borderColor: index === 0 ? 'transparent' : 'divider',
                          }}
                        >
                          <Stack spacing={1.5}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ md: 'flex-start' }}>
                              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                                <PersonThumb name={row.owner.name} accent={accent} size={36} />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body1" fontWeight={900}>{row.owner.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {row.owner.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'} · {row.owner.specialty || row.owner.role}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip size="small" label={`${row.activeJobs.length} demandas`} />
                                <Chip size="small" color={statusColor} label={statusLabel} />
                              </Stack>
                            </Stack>

                            <CapacityBar
                              allocableMinutes={row.allocableMinutes}
                              committedMinutes={row.committedMinutes}
                              tentativeMinutes={row.tentativeMinutes}
                              title="Capacidade desta semana"
                            />

                            <Grid container spacing={1}>
                              {plannerWeekSummary(row.activeJobs).map((day) => (
                                <Grid key={day.key} size={{ xs: 6, md: 2.4 }}>
                                  <Box
                                    sx={(theme) => ({
                                      px: 1.25,
                                      py: 1,
                                      borderRadius: 2,
                                      bgcolor: day.jobs.length
                                        ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.03)
                                        : 'transparent',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                    })}
                                  >
                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>{day.label}</Typography>
                                    <Typography variant="body2" fontWeight={800}>
                                      {day.jobs.length ? `${day.jobs.length} demanda(s)` : 'Livre'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {day.jobs.length ? `${Math.round(day.plannedMinutes / 60)}h planejadas` : 'Sem bloco'}
                                    </Typography>
                                  </Box>
                                </Grid>
                              ))}
                            </Grid>

                            <Stack spacing={0.35}>
                              {row.activeJobs.length ? (
                                row.activeJobs.slice(0, 4).map((job) => (
                                  <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} />
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {OPS_COPY.planner.emptyRow}
                                </Typography>
                              )}
                            </Stack>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </OpsSurface>
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
                        href="/admin/operacoes/planner"
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
                  title: 'Ajustar alocação',
                  content: (
                    <Stack spacing={1.5}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="allocation-owner-label">Responsável</InputLabel>
                        <Select
                          labelId="allocation-owner-label"
                          value={allocationForm.ownerId}
                          label="Responsável"
                          onChange={(event) => setAllocationForm((current) => ({ ...current, ownerId: String(event.target.value) }))}
                        >
                          {lookups.owners.map((owner) => (
                            <MenuItem key={owner.id} value={owner.id}>
                              {owner.name} · {owner.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Grid container spacing={1.25}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel id="allocation-status-label">Estado</InputLabel>
                            <Select
                              labelId="allocation-status-label"
                              value={allocationForm.status}
                              label="Estado"
                              onChange={(event) => setAllocationForm((current) => ({ ...current, status: String(event.target.value) }))}
                            >
                              <MenuItem value="tentative">Reservado</MenuItem>
                              <MenuItem value="committed">Confirmado</MenuItem>
                              <MenuItem value="blocked">Bloqueado</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Minutos planejados"
                            value={allocationForm.plannedMinutes}
                            onChange={(event) => setAllocationForm((current) => ({ ...current, plannedMinutes: event.target.value }))}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 12 }}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Dia planejado"
                            value={allocationForm.plannedDate}
                            onChange={(event) => setAllocationForm((current) => ({ ...current, plannedDate: event.target.value }))}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                      </Grid>
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
                      <Button variant="contained" color="warning" onClick={saveAllocation} disabled={!selectedJob || !allocationForm.ownerId || allocationSaving}>
                        {allocationSaving ? 'Salvando...' : 'Salvar alocação'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={dropAllocation}
                        disabled={!selectedJob?.owner_id || allocationSaving}
                      >
                        Soltar alocação
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={reloadPlanner}
                      >
                        {OPS_COPY.planner.refresh}
                      </Button>
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
