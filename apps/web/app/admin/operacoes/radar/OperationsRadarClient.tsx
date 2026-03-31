'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { apiGet, apiPost } from '@/lib/api';
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconClockPause,
  IconFlag,
  IconRefresh,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import {
  ClientThumb,
  EmptyOperationState,
  EntityLinkCard,
  OperationsContextRail,
  OpsJobRow,
  OpsPanel,
  OpsSection,
  PersonThumb,
  SourceThumb,
} from '@/components/operations/primitives';
import { formatSourceLabel, getNextAction, type OperationsJob } from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OPS_COPY } from '@/components/operations/copy';
import JarvisAlertsSectionClient from '@/components/operations/JarvisAlertsSectionClient';

export default function OperationsRadarClient() {
  const theme = useTheme();
  const router = useRouter();
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cockpit' | 'signals' | 'risks'>('cockpit');

  // ── Operational signals ──────────────────────────────────────────────────
  type Signal = {
    id: string;
    domain: string;
    signal_type: string;
    severity: number;
    title: string;
    summary?: string | null;
    entity_type?: string | null;
    entity_id?: string | null;
    client_id?: string | null;
    client_name?: string | null;
    actions?: Array<{ label: string; href?: string; action_type?: string }>;
    created_at: string;
  };
  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [snoozingId, setSnoozingId] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  const loadSignals = useCallback(async () => {
    setSignalsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Signal[] }>('/operations/signals?limit=20');
      setSignals(res?.data ?? []);
    } catch {
      // signals are non-critical; fail silently
    } finally {
      setSignalsLoading(false);
    }
  }, []);

  const resolveSignal = async (id: string) => {
    setResolvingId(id);
    try {
      await apiPost(`/operations/signals/${id}/resolve`, {});
      setSignals((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setResolvingId(null);
    }
  };

  const snoozeSignal = async (id: string) => {
    setSnoozingId(id);
    try {
      await apiPost(`/operations/signals/${id}/snooze`, { hours: 4 });
      setSignals((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setSnoozingId(null);
    }
  };

  const rebuildSignals = async () => {
    setRebuilding(true);
    try {
      await apiPost('/operations/signals/rebuild', {});
      await loadSignals();
    } finally {
      setRebuilding(false);
    }
  };

  useEffect(() => { loadSignals(); }, [loadSignals]);

  // ── Risk data ─────────────────────────────────────────────────────────────
  const [riskLoading, setRiskLoading] = useState(true);
  const [riskError, setRiskError] = useState('');
  const [riskData, setRiskData] = useState<{
    critical: OperationsJob[];
    high: OperationsJob[];
    client_risk: Array<{
      clientId: string;
      clientName: string;
      clientLogoUrl?: string | null;
      clientBrandColor?: string | null;
      total: number;
      critical: number;
      open: number;
    }>;
  }>({ critical: [], high: [], client_risk: [] });

  const loadRisks = useCallback(async () => {
    setRiskLoading(true);
    setRiskError('');
    try {
      const response = await apiGet<{ data?: typeof riskData }>('/operations/risks');
      setRiskData(response?.data || { critical: [], high: [], client_risk: [] });
    } catch (err: any) {
      setRiskError(err?.message || 'Falha ao carregar os riscos.');
    } finally {
      setRiskLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRisks();
  }, [jobs.length, loadRisks]);

  const critical = riskData.critical;
  const high = riskData.high;
  const clientRisk = riskData.client_risk;
  const blockedJobs = useMemo(() => jobs.filter((job) => job.status === 'blocked'), [jobs]);
  const waitingClientJobs = useMemo(() => jobs.filter((job) => job.status === 'awaiting_approval'), [jobs]);
  const unassignedJobs = useMemo(() => jobs.filter((job) => !job.owner_id && job.status !== 'archived'), [jobs]);
  const attentionSignals = useMemo(
    () => signals.filter((signal) => signal.severity >= 70 && signal.severity < 90).length,
    [signals]
  );
  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;
  const isStandaloneRiskItem = Boolean(selectedJob?.metadata?.calendar_item?.standalone);
  const isNativeMeeting = selectedJob?.metadata?.calendar_item?.source_type === 'meeting';

  useEffect(() => {
    if (!selectedJob) return;
    const fresh = jobs.find((job) => job.id === selectedJob.id);
    if (fresh) {
      setSelectedJob(fresh);
      return;
    }
    setSelectedJob(null);
  }, [critical, high, jobs, selectedJob]);

  const handleViewModeChange = (next: 'cockpit' | 'signals' | 'risks') => {
    setViewMode(next);
    if (next === 'signals') setSelectedJob(null);
  };

  const refreshRadar = useCallback(async () => {
    await refresh();
    await Promise.all([loadRisks(), loadSignals()]);
  }, [loadRisks, loadSignals, refresh]);

  const handleAdvance = useCallback(async (jobId: string, nextStatus: string) => {
    const updated = await changeStatus(jobId, nextStatus);
    await refreshRadar();
    if (updated) setSelectedJob(updated as OperationsJob);
  }, [changeStatus, refreshRadar]);

  const handleAssign = useCallback(async (jobId: string, ownerId: string) => {
    const updated = await updateJob(jobId, { owner_id: ownerId, assignee_ids: [ownerId] });
    await refreshRadar();
    if (updated) setSelectedJob(updated as OperationsJob);
  }, [refreshRadar, updateJob]);

  return (
    <OperationsShell
      section="radar"
      summary={
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          {[
            { value: critical.length, label: OPS_COPY.radar.summaryCritical, color: critical.length ? theme.palette.error.main : alpha(theme.palette.text.primary, 0.4), pulse: critical.length > 0 },
            { value: high.length, label: OPS_COPY.radar.summaryHigh, color: high.length ? theme.palette.warning.main : alpha(theme.palette.text.primary, 0.4), pulse: false },
            { value: clientRisk.filter((c) => c.critical > 0).length, label: OPS_COPY.radar.summaryClients, color: clientRisk.some((c) => c.critical > 0) ? theme.palette.error.main : alpha(theme.palette.text.primary, 0.4), pulse: false },
          ].map((kpi) => (
            <Stack key={kpi.label} direction="row" spacing={0.5} alignItems="baseline"
              sx={undefined}>
              <Typography variant="body1" sx={{ fontWeight: 900, color: kpi.color, lineHeight: 1, fontSize: '1.1rem' }}>
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
      {riskError ? <Alert severity="error">{riskError}</Alert> : null}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
        {[
          { key: 'cockpit' as const, label: 'Cockpit', subtitle: 'Sinais + riscos' },
          { key: 'signals' as const, label: 'Sinais', subtitle: 'Tudo que acabou de acender' },
          { key: 'risks' as const, label: 'Riscos', subtitle: 'Demandas que podem estourar' },
        ].map((item) => (
          <Button
            key={item.key}
            variant={viewMode === item.key ? 'contained' : 'outlined'}
            onClick={() => handleViewModeChange(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </Stack>

      {loading || riskLoading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7.6 }}>
            <Stack spacing={3}>
              <OpsPanel
                eyebrow="Semáforo dos riscos"
                title="O que pode quebrar a operação"
                subtitle="Aqui ficam sinais do momento e demandas que realmente podem estourar. Primeiro veja o semáforo, depois desça para o detalhe."
                action={
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" variant="outlined" label="Ao vivo do Trello" />
                    <Chip size="small" variant="outlined" color="warning" label="Calculado pela Edro" />
                  </Stack>
                }
              >
                <Stack spacing={2.25}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
                      gap: 1.25,
                    }}
                  >
                    {[
                      { label: 'Críticos', value: critical.length, subtitle: 'Precisam de ação agora', href: '/admin/operacoes/radar', icon: <IconAlertTriangle size={16} />, color: '#FA896B' },
                      { label: 'Altos', value: high.length, subtitle: 'Ainda cabem, mas já apertam', href: '/admin/operacoes/radar', icon: <IconFlag size={16} />, color: '#FFAE1F' },
                      { label: 'Sinais ativos', value: signals.length, subtitle: `${attentionSignals} em atenção`, href: '/admin/operacoes/radar', icon: <IconBell size={16} />, color: '#E85219' },
                      { label: 'Bloqueados', value: blockedJobs.length, subtitle: 'Parados por dependência', href: '/admin/operacoes/radar', icon: <IconClockPause size={16} />, color: '#FA896B' },
                      { label: 'Esperando cliente', value: waitingClientJobs.length, subtitle: 'Aprovação ou retorno', href: '/admin/operacoes/jobs', icon: <IconCheck size={16} />, color: '#FFAE1F' },
                      { label: 'Sem dono', value: unassignedJobs.length, subtitle: 'Sem responsável definido', href: '/admin/operacoes/jobs?unassigned=true', icon: <IconRefresh size={16} />, color: '#5D87FF' },
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

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="contained" onClick={() => handleViewModeChange('cockpit')}>
                      Ver cockpit
                    </Button>
                    <Button variant="outlined" onClick={() => handleViewModeChange('signals')}>
                      Ver sinais
                    </Button>
                    <Button variant="outlined" onClick={() => handleViewModeChange('risks')}>
                      Ver riscos
                    </Button>
                    <Button variant="outlined" component={Link} href="/admin/operacoes/jobs?unassigned=true">
                      Resolver sem dono
                    </Button>
                    <Button variant="outlined" component={Link} href="/admin/operacoes/semana?view=distribution">
                      Abrir semana
                    </Button>
                  </Stack>
                </Stack>
              </OpsPanel>

              {/* ── Operational Signals ─────────────────────────────── */}
              {viewMode !== 'risks' && (signalsLoading || signals.length > 0) && (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <IconBell size={15} style={{ color: theme.palette.warning.main }} />
                      <Typography variant="body2" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}>
                        Sinais Operacionais
                      </Typography>
                      {!signalsLoading && (
                        <Chip size="small" label={signals.length} color={signals.length > 0 ? 'warning' : 'default'}
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }} />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Recomputar sinais">
                        <span>
                          <IconButton size="small" onClick={rebuildSignals} disabled={rebuilding}>
                            {rebuilding ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  {signalsLoading ? (
                    <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={20} /></Box>
                  ) : (
                    <Stack spacing={0.75}>
                      {signals.map((signal) => {
                        const sevColor =
                          signal.severity >= 90 ? theme.palette.error.main
                            : signal.severity >= 70 ? theme.palette.warning.main
                            : signal.severity >= 50 ? theme.palette.info.main
                            : theme.palette.text.disabled;
                        return (
                          <Box key={signal.id} sx={{
                            px: 1.5, py: 1,
                            borderRadius: 2,
                            border: `1px solid`,
                            borderColor: alpha(sevColor, 0.25),
                            bgcolor: alpha(sevColor, 0.04),
                          }}>
                            <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                              <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
                                <Box sx={{ mt: 0.3, color: sevColor, flexShrink: 0 }}>
                                  <IconAlertTriangle size={14} />
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem', lineHeight: 1.3 }}>
                                    {signal.title}
                                  </Typography>
                                  {signal.summary && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                                      {signal.summary}
                                    </Typography>
                                  )}
                                  {(signal.actions ?? []).filter((a) => a.href).length > 0 && (
                                    <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
                                      {(signal.actions ?? []).filter((a) => a.href).map((a, i) => (
                                        <Link key={i} href={a.href!} underline="hover"
                                          sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                          {a.label} →
                                        </Link>
                                      ))}
                                    </Stack>
                                  )}
                                </Box>
                              </Stack>
                              <Stack direction="row" spacing={0.25} flexShrink={0}>
                                <Tooltip title="Soneca 4h">
                                  <span>
                                    <IconButton size="small" onClick={() => snoozeSignal(signal.id)}
                                      disabled={snoozingId === signal.id}
                                      sx={{ color: 'text.disabled', '&:hover': { color: 'warning.main' } }}>
                                      {snoozingId === signal.id ? <CircularProgress size={12} /> : <IconClockPause size={13} />}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Resolver">
                                  <span>
                                    <IconButton size="small" onClick={() => resolveSignal(signal.id)}
                                      disabled={resolvingId === signal.id}
                                      sx={{ color: 'text.disabled', '&:hover': { color: 'success.main' } }}>
                                      {resolvingId === signal.id ? <CircularProgress size={12} /> : <IconCheck size={13} />}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              )}

              {/* ── Jarvis Cross-Source Alerts ──────────────────────── */}
              {viewMode === 'cockpit' && <JarvisAlertsSectionClient />}

              {viewMode !== 'signals' && (
              <OpsSection
                eyebrow="Pontos de atenção"
                title={OPS_COPY.radar.title}
                subtitle={OPS_COPY.radar.subtitle}
                action={
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" color={critical.length ? 'error' : 'default'} label={`${critical.length} críticos`} />
                    <Chip size="small" color={high.length ? 'warning' : 'default'} label={`${high.length} altos`} />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={async () => {
                        await refresh();
                        const response = await apiGet<{ data?: typeof riskData }>('/operations/risks');
                        setRiskData(response?.data || { critical: [], high: [], client_risk: [] });
                      }}
                    >
                      {OPS_COPY.radar.refresh}
                    </Button>
                  </Stack>
                }
              >
                <Stack spacing={2.5}>
                  <Box
                    sx={(theme) => {
                      const dark = theme.palette.mode === 'dark';
                      return {
                        px: 2,
                        py: 2,
                        borderRadius: 2,
                        border: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06)}`,
                        bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : '#fff',
                      };
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                      <Box>
                        <Typography variant="body1" fontWeight={900}>Crítico</Typography>
                        <Typography variant="caption" color="text.secondary">{OPS_COPY.radar.criticalSubtitle}</Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: critical.length > 0 ? 'error.main' : 'text.disabled', lineHeight: 1,
                         }}>
                        {critical.length}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
                      {critical[0] ? (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setSelectedJob(critical[0])}
                        >
                          Abrir mais crítico
                        </Button>
                      ) : null}
                      {critical.some((job) => !job.owner_id) && currentUserId ? (
                        <Button
                          variant="text"
                          size="small"
                          onClick={async () => {
                            const target = critical.find((job) => !job.owner_id);
                            if (!target) return;
                            await handleAssign(target.id, currentUserId);
                          }}
                        >
                          Assumir sem dono
                        </Button>
                      ) : null}
                    </Stack>
                    <Stack spacing={0.5}>
                      {critical.length ? critical.map((job) => (
                        <Box key={job.id}>
                          <OpsJobRow
                            job={job}
                            selected={selectedJob?.id === job.id}
                            onClick={() => setSelectedJob(job)}
                            showStage
                            onAdvance={handleAdvance}
                            onAssign={handleAssign}
                            owners={lookups.owners}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1, pt: 0.4 }}>
                            Próxima ação sugerida: {getNextAction(job).label}
                          </Typography>
                        </Box>
                      )) : (
                        <EmptyOperationState title={OPS_COPY.radar.emptyCriticalTitle} description={OPS_COPY.radar.emptyCriticalDescription} />
                      )}
                    </Stack>
                  </Box>

                  <Box
                    sx={(theme) => {
                      const dark = theme.palette.mode === 'dark';
                      return {
                        px: 2,
                        py: 2,
                        borderRadius: 2,
                        border: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06)}`,
                        bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : '#fff',
                      };
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                      <Box>
                        <Typography variant="body1" fontWeight={900}>Risco alto</Typography>
                        <Typography variant="caption" color="text.secondary">{OPS_COPY.radar.highSubtitle}</Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: high.length > 0 ? 'warning.main' : 'text.disabled', lineHeight: 1 }}>
                        {high.length}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
                      {high[0] ? (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setSelectedJob(high[0])}
                        >
                          Abrir mais urgente
                        </Button>
                      ) : null}
                      {high.some((job) => !job.owner_id) && currentUserId ? (
                        <Button
                          variant="text"
                          size="small"
                          onClick={async () => {
                            const target = high.find((job) => !job.owner_id);
                            if (!target) return;
                            await handleAssign(target.id, currentUserId);
                          }}
                        >
                          Assumir sem dono
                        </Button>
                      ) : null}
                    </Stack>
                    <Stack spacing={0.5}>
                      {high.length ? high.map((job) => (
                        <Box key={job.id}>
                          <OpsJobRow
                            job={job}
                            selected={selectedJob?.id === job.id}
                            onClick={() => setSelectedJob(job)}
                            showStage
                            onAdvance={handleAdvance}
                            onAssign={handleAssign}
                            owners={lookups.owners}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1, pt: 0.4 }}>
                            Próxima ação sugerida: {getNextAction(job).label}
                          </Typography>
                        </Box>
                      )) : (
                        <EmptyOperationState title="Sem risco alto" description={OPS_COPY.radar.emptyHigh} />
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </OpsSection>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.4 }}>
            <OperationsContextRail
              eyebrow={OPS_COPY.common.contextEyebrow}
              title={OPS_COPY.common.focusTitle}
              subtitle={OPS_COPY.radar.focusSubtitle}
              job={selectedJob}
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
              emptyDescription={OPS_COPY.radar.focusEmptySubtitle}
              links={
                selectedJob ? (
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Cliente"
                        value={selectedJob.client_name || 'Sem cliente'}
                        href={selectedJob.client_id ? `/clients/${selectedJob.client_id}` : undefined}
                        subtitle="Conta em risco"
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
                            : '/admin/operacoes/semana?view=distribution';
                        })()}
                        subtitle="Quem precisa agir primeiro"
                        thumbnail={<PersonThumb name={selectedJob.owner_name} accent="#5D87FF" size={26} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Agenda"
                        value={selectedJob.deadline_at ? 'Prazo em andamento' : 'Sem prazo'}
                        href="/admin/operacoes/semana?view=calendar"
                        subtitle={selectedJob.deadline_at ? 'Acompanhar impacto no calendário' : 'Defina prazo para medir risco'}
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
                  title: OPS_COPY.radar.attentionClientsTitle,
                  content: clientRisk.length ? (
                    <Stack spacing={1}>
                      {clientRisk.map((item) => (
                        <Box
                          key={item.clientId}
                          sx={{
                            px: 1.25,
                            py: 1.1,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
                              <ClientThumb
                                name={item.clientName}
                                logoUrl={item.clientLogoUrl}
                                accent={item.clientBrandColor || '#E85219'}
                                size={30}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={800} noWrap>{item.clientName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.open} demandas ativas · {item.total} min previstos
                                </Typography>
                              </Box>
                            </Stack>
                            <Chip size="small" color={item.critical > 0 ? 'error' : 'default'} label={`${item.critical} em risco`} />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {OPS_COPY.radar.attentionClientsEmpty}
                    </Typography>
                  ),
                },
                {
                  title: OPS_COPY.radar.rulesTitle,
                  content: (
                    <Stack spacing={1.25}>
                      <Alert severity="info">Bloqueado, atrasado ou P0 sem responsável sobe para risco crítico.</Alert>
                      <Alert severity="warning">Prazo em até 24h e aprovação pendente contam como risco alto.</Alert>
                      <Alert severity="info">Entrada incompleta e demanda sem responsável entram como risco médio até a operação resolver.</Alert>
                    </Stack>
                  ),
                },
                {
                  content: (
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
                      {!isStandaloneRiskItem && selectedJob && !selectedJob.owner_id && currentUserId ? (
                        <Button
                          variant="outlined"
                          onClick={async () => {
                            await handleAssign(selectedJob.id, currentUserId);
                          }}
                        >
                          Assumir agora
                        </Button>
                      ) : null}
                      {selectedJob ? (
                        <Button
                          variant="outlined"
                          component={Link}
                          href="/admin/operacoes/semana?view=distribution"
                        >
                          Ver semana
                        </Button>
                      ) : null}
                      <Button
                        variant="outlined"
                        onClick={async () => {
                          await refreshRadar();
                        }}
                      >
                        {OPS_COPY.radar.refresh}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => selectedJob && fetchJob(selectedJob.id).then((job) => setSelectedJob(job))}
                        disabled={!selectedJob || isStandaloneRiskItem}
                      >
                        {isNativeMeeting ? 'Demanda indisponível' : OPS_COPY.common.refreshDetail}
                      </Button>
                    </Stack>
                  ),
                },
              ]}
            />
          </Grid>
        </Grid>
      )}

      <JobWorkbenchDrawer
        open={detailOpen && Boolean(selectedJob) && !isStandaloneRiskItem}
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
          await refreshRadar();
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onStatusChange={async (jobId, status, reason) => {
          const updated = await changeStatus(jobId, status, reason);
          await refreshRadar();
          setSelectedJob(updated as OperationsJob);
          return updated;
        }}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}
