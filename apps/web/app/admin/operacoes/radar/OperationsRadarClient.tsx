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
import { useJarvisPage } from '@/hooks/useJarvisPage';
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
  EmptyOperationState,
  OpsJobRow,
  OpsPanel,
  OpsSection,
} from '@/components/operations/primitives';
import { getNextAction, type OperationsJob } from '@/components/operations/model';
import { sortByOperationalPriority } from '@/components/operations/derived';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OPS_COPY } from '@/components/operations/copy';
import JarvisAlertsSectionClient from '@/components/operations/JarvisAlertsSectionClient';

export default function OperationsRadarClient() {
  const theme = useTheme();
  const router = useRouter();
  const { jobs, lookups, loading, error, refresh, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [selectedJob, setSelectedJob] = useState<OperationsJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('edit');
  const [createComposerPath, setCreateComposerPath] = useState<'briefing' | 'job' | 'adjustment' | 'client_request'>('client_request');

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
  const clientRiskJobs = useMemo(() => {
    const grouped = new Map<string, OperationsJob[]>();
    [...critical, ...high]
      .sort(sortByOperationalPriority)
      .forEach((job) => {
        if (!job.client_id) return;
        const bucket = grouped.get(job.client_id) ?? [];
        bucket.push(job);
        grouped.set(job.client_id, bucket);
      });
    return grouped;
  }, [critical, high]);

  useJarvisPage(
    {
      screen: 'operations_radar',
      radarView: 'desk',
      clientId: selectedJob?.client_id ?? null,
      currentJobId: selectedJob?.id ?? null,
      currentJobTitle: selectedJob?.title ?? null,
      currentJobStatus: selectedJob?.status ?? null,
      currentJobOwner: selectedJob?.owner_name ?? null,
      criticalRisks: critical.length,
      highRisks: high.length,
      signalsTotal: signals.length,
    },
    [
      selectedJob?.id,
      selectedJob?.client_id,
      selectedJob?.title,
      selectedJob?.status,
      selectedJob?.owner_name,
      critical.length,
      high.length,
      signals.length,
    ]
  );

  useEffect(() => {
    if (!selectedJob) return;
    const fresh = jobs.find((job) => job.id === selectedJob.id);
    if (fresh) {
      setSelectedJob(fresh);
      return;
    }
    setSelectedJob(null);
  }, [critical, high, jobs, selectedJob]);

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

  const openCreate = useCallback((path: 'briefing' | 'job' | 'adjustment' | 'client_request' = 'client_request') => {
    setSelectedJob(null);
    setCreateComposerPath(path);
    setDrawerMode('create');
    setDetailOpen(true);
  }, []);

  const openCommands = useCallback((job: OperationsJob) => {
    setSelectedJob(job);
    setDrawerMode('edit');
    setDetailOpen(true);
  }, []);

  const openRiskJob = useCallback((job: OperationsJob) => {
    setSelectedJob(job);
    if (job.metadata?.calendar_item?.standalone) {
      if (job.source === 'meeting') {
        router.push('/admin/reunioes');
      }
      return;
    }
    openCommands(job);
  }, [openCommands, router]);

  const openSignalDemand = useCallback(async (signal: Signal) => {
    if (signal.entity_type !== 'job' || !signal.entity_id) {
      return;
    }
    const existing = jobs.find((job) => job.id === signal.entity_id);
    if (existing) {
      openCommands(existing);
      return;
    }
    const fetched = await fetchJob(signal.entity_id);
    if (!fetched) return;
    setSelectedJob(fetched);
    setDrawerMode('edit');
    setDetailOpen(true);
  }, [fetchJob, jobs, openCommands]);

  return (
    <OperationsShell
      section="radar"
      titleOverride="Riscos"
      subtitleOverride="Mesa de exceção da operação: só sinais, bloqueios e demandas que já pedem contenção."
      onNewDemand={() => openCreate('client_request')}
      summary={
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          {[
            { value: critical.length, label: OPS_COPY.radar.summaryCritical, color: critical.length ? theme.palette.error.main : alpha(theme.palette.text.primary, 0.4), pulse: critical.length > 0 },
            { value: high.length, label: OPS_COPY.radar.summaryHigh, color: high.length ? theme.palette.warning.main : alpha(theme.palette.text.primary, 0.4), pulse: false },
            { value: signals.length, label: 'sinais ativos', color: signals.length ? theme.palette.warning.main : alpha(theme.palette.text.primary, 0.4), pulse: false },
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

      {loading || riskLoading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Stack spacing={3}>
              <OpsPanel
                eyebrow="Semáforo dos riscos"
                title="O que pode quebrar a operação"
                subtitle="Aqui entram só exceções de verdade: sinais do momento, bloqueios e demandas que já pedem contenção. Carteira, semana e pessoas ficam fora desta leitura."
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
                      gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                      gap: 1.25,
                    }}
                  >
                    {[
                      { label: 'Críticos', value: critical.length, subtitle: 'Precisam de ação agora', href: '/admin/operacoes/radar', icon: <IconAlertTriangle size={16} />, color: '#FA896B' },
                      { label: 'Altos', value: high.length, subtitle: 'Ainda cabem, mas já apertam', href: '/admin/operacoes/radar', icon: <IconFlag size={16} />, color: '#FFAE1F' },
                      { label: 'Sinais ativos', value: signals.length, subtitle: `${attentionSignals} em atenção`, href: '/admin/operacoes/radar', icon: <IconBell size={16} />, color: '#E85219' },
                      { label: 'Clientes em risco', value: clientRisk.filter((client) => client.critical > 0).length, subtitle: 'Contas com itens críticos abertos', href: '/admin/operacoes/jobs?view=table&group=client', icon: <IconCheck size={16} />, color: '#5D87FF' },
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
                    <Button variant="contained" component="a" href="#sinais-operacionais">
                      Ir para sinais
                    </Button>
                    <Button variant="outlined" component="a" href="#riscos-da-operacao">
                      Ir para riscos
                    </Button>
                    <Button variant="outlined" component={Link} href="/admin/operacoes/jobs?view=table&group=client">
                      Abrir pauta geral
                    </Button>
                    <Button variant="outlined" component={Link} href="/admin/operacoes/jobs?unassigned=true">
                      Resolver sem dono
                    </Button>
                    <Button variant="outlined" component={Link} href="/admin/operacoes">
                      Voltar ao hoje
                    </Button>
                  </Stack>
                </Stack>
              </OpsPanel>

              {/* ── Operational Signals ─────────────────────────────── */}
              {(signalsLoading || signals.length > 0) && (
                <Box id="sinais-operacionais">
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
                                        signal.entity_type === 'job' && signal.entity_id && a.label.toLowerCase().includes('demanda') ? (
                                          <Link
                                            key={i}
                                            component="button"
                                            type="button"
                                            underline="hover"
                                            onClick={() => { void openSignalDemand(signal); }}
                                            sx={{ fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                          >
                                            {a.label} →
                                          </Link>
                                        ) : (
                                          <Link key={i} href={a.href!} underline="hover"
                                            sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                            {a.label} →
                                          </Link>
                                        )
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
              <JarvisAlertsSectionClient />

              <Box id="riscos-da-operacao">
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
                          onClick={() => openRiskJob(critical[0])}
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
                            onClick={() => openRiskJob(job)}
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
                          onClick={() => openRiskJob(high[0])}
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
                            onClick={() => openRiskJob(job)}
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

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, xl: 7 }}>
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
                            <Typography variant="body1" fontWeight={900}>{OPS_COPY.radar.attentionClientsTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Clique no cliente ou no chip para abrir a demanda mais crítica.
                            </Typography>
                          </Box>
                          <Chip size="small" label={`${clientRisk.length} cliente${clientRisk.length === 1 ? '' : 's'}`} />
                        </Stack>
                        {clientRisk.length ? (
                          <Stack spacing={1}>
                            {clientRisk.map((item) => {
                              const leadJob = clientRiskJobs.get(item.clientId)?.[0] ?? null;
                              return (
                                <Box
                                  key={item.clientId}
                                  onClick={leadJob ? () => openRiskJob(leadJob) : undefined}
                                  sx={{
                                    px: 1.25,
                                    py: 1.1,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    cursor: leadJob ? 'pointer' : 'default',
                                    transition: 'all 150ms ease',
                                    '&:hover': leadJob ? {
                                      borderColor: alpha(theme.palette.warning.main, 0.35),
                                      bgcolor: alpha(theme.palette.warning.main, 0.05),
                                    } : undefined,
                                  }}
                                >
                                  <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between">
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography variant="body2" fontWeight={800} noWrap>{item.clientName}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {item.open} demandas ativas · {item.total} min previstos
                                      </Typography>
                                    </Box>
                                    <Chip
                                      size="small"
                                      color={item.critical > 0 ? 'error' : 'default'}
                                      label={`${item.critical} em risco`}
                                      clickable={Boolean(leadJob)}
                                      onClick={leadJob ? (event) => {
                                        event.stopPropagation();
                                        openRiskJob(leadJob);
                                      } : undefined}
                                    />
                                  </Stack>
                                </Box>
                              );
                            })}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {OPS_COPY.radar.attentionClientsEmpty}
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, xl: 5 }}>
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
                        <Stack spacing={1.25}>
                          <Box>
                            <Typography variant="body1" fontWeight={900}>{OPS_COPY.radar.rulesTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              A mesma leitura de risco continua, só sem a coluna lateral.
                            </Typography>
                          </Box>
                          <Alert severity="info">Bloqueado, atrasado ou P0 sem responsável sobe para risco crítico.</Alert>
                          <Alert severity="warning">Prazo em até 24h e aprovação pendente contam como risco alto.</Alert>
                          <Alert severity="info">Entrada incompleta e demanda sem responsável entram como risco médio até a operação resolver.</Alert>
                        </Stack>
                      </Box>
                    </Grid>
                  </Grid>
                </Stack>
              </OpsSection>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      )}

      <JobWorkbenchDrawer
        open={detailOpen && (drawerMode === 'create' || Boolean(selectedJob))}
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
