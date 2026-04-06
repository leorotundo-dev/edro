'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconCircleCheckFilled,
  IconInbox,
  IconCalendarClock,
  IconAlertTriangle,
  IconRefresh,
} from '@tabler/icons-react';
import { apiGet } from '@/lib/api';
import AskJarvisButton from '@/components/jarvis/AskJarvisButton';
import { useJarvisPage } from '@/hooks/useJarvisPage';
import OperationsShell from '@/components/operations/OperationsShell';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import {
  ClientThumb,
  EntityLinkCard,
  OperationsContextRail,
  OpsJobRow,
  OpsPanel,
  PersonThumb,
  SourceThumb,
} from '@/components/operations/primitives';
import {
  jobsForToday,
  sortByOperationalPriority,
} from '@/components/operations/derived';
import {
  formatSkillLabel,
  formatSourceLabel,
  getNextAction,
  getRisk,
  isApprovalQueueJob,
  isCopyReadyJob,
  isWaitingBriefing,
  isWaitingInfo,
  type OperationsJob,
} from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { apiPost } from '@/lib/api';
import { OPS_COPY } from '@/components/operations/copy';

type LatestDigest = {
  id: string;
  type: 'daily' | 'weekly';
  created_at: string;
  sent_at: string | null;
  content?: {
    active_jobs_total?: number;
    top_action?: string | null;
  } | null;
};

export default function OperationsOverviewClient() {
  const { jobs, lookups, loading, error, refresh, syncHealth, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [syncing, setSyncing] = useState(false);
  const [generatingDigest, setGeneratingDigest] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [signalStats, setSignalStats] = useState({ total: 0, critical: 0, attention: 0 });
  const [pendingRequests, setPendingRequests] = useState<Array<{ id: string; client_name: string; form_data: { type?: string; objective?: string } }>>([]);
  const [latestDailyDigest, setLatestDailyDigest] = useState<LatestDigest | null>(null);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('edit');
  const [createComposerPath, setCreateComposerPath] = useState<'briefing' | 'job' | 'adjustment' | 'client_request'>('client_request');

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await apiPost('/trello/sync-all', {});
      setTimeout(() => { refresh(); setSyncing(false); }, 4000);
    } catch {
      setSyncing(false);
    }
  };
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
  const criticalJobs = useMemo(
    () => [...jobs].filter((job) => ['critical', 'high'].includes(getRisk(job).level)).sort(sortByOperationalPriority),
    [jobs]
  );
  const unassignedJobs = useMemo(
    () => [...jobs].filter((job) => !job.owner_id && job.status !== 'archived').sort(sortByOperationalPriority),
    [jobs]
  );
  const todayJobs = useMemo(() => jobsForToday(jobs).sort(sortByOperationalPriority), [jobs]);

  const esperandoClienteJobs = useMemo(
    () => jobs.filter((j) => j.status === 'awaiting_approval'),
    [jobs]
  );
  const copyQueue = useMemo(
    () => jobs.filter((job) => !isWaitingBriefing(job) && !isWaitingInfo(job) && isCopyReadyJob(job)).sort(sortByOperationalPriority).slice(0, 6),
    [jobs]
  );
  const approvalQueue = useMemo(
    () => jobs.filter(isApprovalQueueJob).sort(sortByOperationalPriority).slice(0, 6),
    [jobs]
  );

  const loadOverviewRuntime = useCallback(async () => {
    try {
      const response = await apiGet<{ data?: typeof overviewRuntime }>('/operations/overview');
      if (response?.data) setOverviewRuntime(response.data);
    } catch {
      setOverviewRuntime((current) => current);
    }
  }, []);

  const loadSignalStats = useCallback(async () => {
    try {
      const response = await apiGet<{ data?: Array<{ severity: number }> }>('/operations/signals?limit=50');
      const signals = response?.data || [];
      setSignalStats({
        total: signals.length,
        critical: signals.filter((signal) => signal.severity >= 90).length,
        attention: signals.filter((signal) => signal.severity >= 70 && signal.severity < 90).length,
      });
    } catch {
      setSignalStats({ total: 0, critical: 0, attention: 0 });
    }
  }, []);

  const loadCommandDesk = useCallback(async () => {
    try {
      const digestResponse = await apiGet<{ daily?: LatestDigest | null }>('/admin/diario/latest');
      setLatestDailyDigest(digestResponse?.daily ?? null);
    } catch {
      setLatestDailyDigest(null);
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
    void loadSignalStats();
    void loadCommandDesk();
    apiGet<{ requests: typeof pendingRequests }>('/admin/briefing-requests?status=submitted&limit=20')
      .then(r => setPendingRequests(r?.requests ?? []))
      .catch(() => {});
  }, [loadCommandDesk, loadOverviewRuntime, loadSignalStats, loading]);

  const handleRefreshOverview = useCallback(async () => {
    await refresh();
    await loadOverviewRuntime();
    await loadSignalStats();
    await loadCommandDesk();
  }, [loadCommandDesk, loadOverviewRuntime, loadSignalStats, refresh]);

  const handleGenerateDigest = useCallback(async () => {
    setGeneratingDigest(true);
    try {
      await apiPost('/admin/diario/generate', { type: 'daily' });
      await loadCommandDesk();
    } finally {
      setGeneratingDigest(false);
    }
  }, [loadCommandDesk]);

  const handleResendLatestDigest = useCallback(async () => {
    if (!latestDailyDigest?.id) return;
    setSendingDigest(true);
    try {
      await apiPost(`/admin/diario/${latestDailyDigest.id}/send`, {});
      await loadCommandDesk();
    } finally {
      setSendingDigest(false);
    }
  }, [latestDailyDigest?.id, loadCommandDesk]);

  const handleAdvance = useCallback(async (jobId: string, nextStatus: string) => {
    await changeStatus(jobId, nextStatus);
    await handleRefreshOverview();
  }, [changeStatus, handleRefreshOverview]);

  const handleAssign = useCallback(async (jobId: string, ownerId: string) => {
    await updateJob(jobId, { owner_id: ownerId, assignee_ids: [ownerId] });
    await handleRefreshOverview();
  }, [handleRefreshOverview, updateJob]);

  const openCommands = useCallback((job: OperationsJob) => {
    setSelectedJob(job);
    setDrawerMode('edit');
    setDrawerOpen(true);
  }, []);

  const openCreate = useCallback((path: 'briefing' | 'job' | 'adjustment' | 'client_request' = 'client_request') => {
    setSelectedJob(null);
    setCreateComposerPath(path);
    setDrawerMode('create');
    setDrawerOpen(true);
  }, []);

  const focusedAction = selectedJob ? getNextAction(selectedJob) : null;
  useJarvisPage(
    {
      screen: 'operations_overview',
      clientId: selectedJob?.client_id ?? null,
      currentJobId: selectedJob?.id ?? null,
      currentJobTitle: selectedJob?.title ?? null,
      currentJobStatus: selectedJob?.status ?? null,
      currentJobOwner: selectedJob?.owner_name ?? null,
      pendingPortalRequests: pendingRequests.length,
      copyQueueItems: copyQueue.length,
      criticalJobs: criticalJobs.length,
      unassignedJobs: unassignedJobs.length,
      waitingClientJobs: esperandoClienteJobs.length,
    },
    [
      selectedJob?.id,
      selectedJob?.client_id,
      selectedJob?.title,
      selectedJob?.status,
      selectedJob?.owner_name,
      pendingRequests.length,
      copyQueue.length,
      criticalJobs.length,
      unassignedJobs.length,
      esperandoClienteJobs.length,
    ]
  );
  return (
    <OperationsShell
      section="overview"
      onNewDemand={() => openCreate('client_request')}
    >
      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && syncHealth?.needs_attention && (
        <Alert
          severity={syncHealth.stale_boards > 0 || (syncHealth.unmapped_lists ?? 0) > 0 ? 'warning' : 'info'}
          sx={{ mb: 2 }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                color="inherit"
                variant="outlined"
                disabled={syncing}
                onClick={handleSyncNow}
              >
                {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
              </Button>
              <Button size="small" color="inherit" href="/admin/trello" component="a">
                Configurar
              </Button>
            </Stack>
          }
        >
          {syncHealth.stale_boards > 0 && (
            <span>{syncHealth.stale_boards} board(s) com dados desatualizados{syncHealth.oldest_sync_hours != null ? ` (há ${syncHealth.oldest_sync_hours}h)` : ''}. </span>
          )}
          {syncHealth.unlinked_boards > 0 && (
            <span>{syncHealth.unlinked_boards} board(s) sem cliente vinculado — cards aparecem sem contexto. </span>
          )}
          {(syncHealth.unmapped_lists ?? 0) > 0 && (
            <span>{syncHealth.unmapped_lists} lista(s) sem status mapeado — cards aparecem como Intake incorretamente. <a href="/admin/trello?tab=mapping" style={{ color: 'inherit', fontWeight: 600 }}>Mapear →</a></span>
          )}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3.5}>
          <Grid size={{ xs: 12 }}>
            <OpsPanel
              eyebrow="Mesa de decisão"
              title="O que decidir agora"
              subtitle="A mesa do dia concentra só o que exige decisão imediata: risco, prazo, dono, retorno do cliente e gargalos de entrada."
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
                    { label: 'Pegando fogo', value: criticalJobs.length + signalStats.critical, subtitle: `${criticalJobs.length} demandas · ${signalStats.critical} sinais`, href: '/admin/operacoes/radar', icon: <IconAlertTriangle size={16} />, color: '#FA896B' },
                    { label: 'Vence hoje', value: todayJobs.length, subtitle: 'Demandas com prazo imediato', href: '/admin/operacoes/jobs?group=status', icon: <IconCalendarClock size={16} />, color: '#5D87FF' },
                    { label: 'Sem dono', value: unassignedJobs.length, subtitle: 'Demandas que precisam de responsável', href: '/admin/operacoes/jobs?unassigned=true', icon: <IconInbox size={16} />, color: '#FFAE1F' },
                    { label: 'Esperando cliente', value: overviewRuntime.summary.approvals_pending_total + overviewRuntime.summary.approvals_blocked_total, subtitle: 'Aprovações e retornos', href: '/admin/operacoes/jobs', icon: <IconCircleCheckFilled size={16} />, color: '#FFAE1F' },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      component={Link}
                      href={item.href}
                      sx={(theme) => ({
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit',
                        p: 1.75,
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
                      <Stack spacing={0.8}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box sx={{ width: 28, height: 28, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(item.color, 0.14), color: item.color }}>
                            {item.icon}
                          </Box>
                          <Typography sx={{ fontWeight: 900, color: item.color, fontSize: '1.5rem', lineHeight: 1 }}>
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
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                    gap: 1.25,
                  }}
                >
                  {[
                    {
                      key: 'portal',
                      eyebrow: 'Entrada do cliente',
                      title: pendingRequests.length ? `${pendingRequests.length} pedido(s) chegaram` : 'Nenhum pedido novo agora',
                      subtitle: pendingRequests.length
                        ? pendingRequests.slice(0, 3).map((request) => request.client_name).join(' · ')
                        : 'A bandeja de solicitações está limpa neste momento.',
                      href: '/admin/solicitacoes',
                      cta: 'Abrir solicitações',
                    },
                    {
                      key: 'creative',
                      eyebrow: 'Handoff criativo',
                      title: copyQueue.length ? `${copyQueue.length} demanda(s) prontas para copy` : 'Sem fila de copy agora',
                      subtitle: approvalQueue.length
                        ? `${approvalQueue.length} demanda(s) em aprovação ou revisão criativa`
                        : 'Nenhuma demanda está parada em aprovação criativa.',
                      href: '/admin/operacoes/ia',
                      cta: 'Abrir handoff',
                    },
                    {
                      key: 'digest',
                      eyebrow: 'Diário operacional',
                      title: latestDailyDigest?.created_at
                        ? `Último diário em ${new Date(latestDailyDigest.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                        : 'Nenhum diário gerado ainda',
                      subtitle: latestDailyDigest?.sent_at
                        ? `Enviado em ${new Date(latestDailyDigest.sent_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                        : latestDailyDigest?.content?.top_action || 'Use o diário para registrar o foco do dia para operação e liderança.',
                      href: '/admin/diario',
                      cta: latestDailyDigest?.sent_at ? 'Abrir diário' : latestDailyDigest ? (sendingDigest ? 'Reenviando...' : 'Reenviar último') : 'Abrir diário',
                      action: latestDailyDigest && !latestDailyDigest.sent_at ? handleResendLatestDigest : undefined,
                      disabled: sendingDigest,
                    },
                  ].map((card) => (
                    <Box
                      key={card.key}
                      sx={(theme) => ({
                        p: 1.6,
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08)}`,
                        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.7) : '#fff',
                      })}
                    >
                      <Stack spacing={1.1}>
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {card.eyebrow}
                          </Typography>
                          <Typography variant="body2" fontWeight={800} sx={{ mt: 0.35 }}>
                            {card.title}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ minHeight: 38 }}>
                          {card.subtitle}
                        </Typography>
                        <Button
                          size="small"
                          variant="text"
                          component={card.action ? 'button' : Link}
                          href={card.action ? undefined : card.href}
                          onClick={card.action}
                          disabled={card.disabled}
                          sx={{ alignSelf: 'flex-start', px: 0, fontWeight: 700 }}
                        >
                          {card.cta}
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" component={Link} href="/admin/operacoes/jobs?unassigned=true">
                    Resolver sem dono
                  </Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/ia">
                    Handoff criativo
                  </Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/semana?view=distribution">
                    Replanejar semana
                  </Button>
                  <Button variant="outlined" disabled={generatingDigest} onClick={handleGenerateDigest}>
                    {generatingDigest ? 'Gerando diário...' : 'Gerar diário'}
                  </Button>
                  {syncHealth?.needs_attention ? (
                    <Button variant="outlined" disabled={syncing} onClick={handleSyncNow} startIcon={<IconRefresh size={14} />}>
                      {syncing ? 'Sincronizando...' : 'Sincronizar Trello'}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </OpsPanel>
          </Grid>

          <Grid size={{ xs: 12, lg: 3 }}>
            <Stack spacing={2.5}>
              {/* Card: Sem responsável */}
              <OpsPanel
                eyebrow="O QUE ENTROU"
                title="Demandas para organizar"
                subtitle="Itens que ainda precisam de responsável, prazo ou decisão."
              >
                {[
                  {
                    key: 'unassigned',
                    icon: <IconInbox size={16} />,
                    color: '#E85219',
                    label: 'Sem responsável',
                    count: unassignedJobs.length,
                    countColor: 'warning' as const,
                  },
                  {
                    key: 'today',
                    icon: <IconCalendarClock size={16} />,
                    color: '#FFAE1F',
                    label: 'Vence hoje',
                    count: todayJobs.length,
                    countColor: 'default' as const,
                  },
                  {
                    key: 'approvals',
                    icon: <IconCircleCheckFilled size={16} />,
                    color: '#13DEB9',
                    label: 'Aprovações do cliente',
                    count: overviewRuntime.summary.approvals_pending_total + overviewRuntime.summary.approvals_blocked_total,
                    countColor: overviewRuntime.summary.approvals_blocked_total ? 'error' as const : 'default' as const,
                  },
                ].map((section, idx) => (
                  <Box key={section.key}>
                    {idx > 0 && <Divider sx={{ mb: 2.5 }} />}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{
                          width: 30, height: 30, borderRadius: 1.5,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          bgcolor: alpha(section.color, 0.12), color: section.color,
                        }}>
                          {section.icon}
                        </Box>
                        <Typography variant="body2" fontWeight={700}>{section.label}</Typography>
                      </Stack>
                      <Chip
                        size="small"
                        color={section.countColor}
                        label={`${section.count}`}
                        sx={{ fontWeight: 700, minWidth: 32 }}
                      />
                    </Stack>
                    <Stack spacing={0.5}>
                      {section.key === 'unassigned' && unassignedJobs.slice(0, 4).map((job) => (
                        <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} onAssign={handleAssign} owners={lookups.owners} />
                      ))}
                      {section.key === 'today' && todayJobs.slice(0, 4).map((job) => (
                        <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} onAdvance={handleAdvance} onAssign={handleAssign} owners={lookups.owners} />
                      ))}
                      {section.key === 'approvals' && overviewRuntime.approvals.slice(0, 4).map((job) => (
                        <OpsJobRow key={job.id} job={job} selected={selectedJob?.id === job.id} onClick={() => setSelectedJob(job)} showStage onAdvance={handleAdvance} onAssign={handleAssign} owners={lookups.owners} />
                      ))}
                      {(section.key === 'unassigned' && !unassignedJobs.length) && (
                        <Box sx={(theme) => ({ py: 1.5, px: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.06), border: `1px solid ${alpha(theme.palette.success.main, 0.15)}` })}>
                          <Typography variant="body2" color="success.main" fontWeight={600} fontSize="0.8rem">{OPS_COPY.overview.emptyUnassigned}</Typography>
                        </Box>
                      )}
                      {(section.key === 'today' && !todayJobs.length) && (
                        <Box sx={(theme) => ({ py: 1.5, px: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.text.primary, 0.025) })}>
                          <Typography variant="body2" color="text.secondary" fontSize="0.8rem">{OPS_COPY.overview.emptyToday}</Typography>
                        </Box>
                      )}
                      {(section.key === 'approvals' && !overviewRuntime.approvals.length) && (
                        <Box sx={(theme) => ({ py: 1.5, px: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.text.primary, 0.025) })}>
                          <Typography variant="body2" color="text.secondary" fontSize="0.8rem">{OPS_COPY.overview.emptyApprovals}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                ))}
              </OpsPanel>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <OperationsContextRail
              job={selectedJob}
              eyebrow={OPS_COPY.common.contextEyebrow}
              title={OPS_COPY.overview.supportTitle}
              subtitle={OPS_COPY.overview.supportSubtitle}
              primaryLabel={focusedAction?.label}
              onPrimaryAction={() => {
                if (!selectedJob) return;
                openCommands(selectedJob);
              }}
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
                        href={(() => {
                          const owner = lookups.owners.find((o) => o.id === selectedJob.owner_id);
                          return owner?.freelancer_profile_id
                            ? `/admin/equipe/${owner.freelancer_profile_id}`
                            : '/admin/operacoes/semana?view=distribution';
                        })()}
                        subtitle={formatSkillLabel(selectedJob.required_skill)}
                        thumbnail={<PersonThumb name={selectedJob.owner_name} accent="#5D87FF" size={26} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <EntityLinkCard
                        label="Pauta Geral"
                        value="Abrir na carteira"
                        href={`/admin/operacoes/jobs?view=table&group=client&highlight=${selectedJob.id}`}
                        subtitle="Continuar a leitura por cliente"
                        thumbnail={<SourceThumb source="trello" jobType={selectedJob.job_type} accent="#5D87FF" />}
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
              sections={
                selectedJob
                  ? [
                      {
                        title: 'Jarvis nesta demanda',
                        content: (
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <AskJarvisButton
                              message={`Resuma a demanda "${selectedJob.title}" do cliente "${selectedJob.client_name || 'Sem cliente'}" e me diga o próximo passo operacional.`}
                              label="Resumir"
                              variant="outlined"
                            />
                            <AskJarvisButton
                              message={`Transforme a demanda "${selectedJob.title}" do cliente "${selectedJob.client_name || 'Sem cliente'}" em briefing e próximos passos.`}
                              label="Virar briefing"
                              variant="outlined"
                            />
                            <AskJarvisButton
                              message={`Gere o copy inicial da demanda "${selectedJob.title}" do cliente "${selectedJob.client_name || 'Sem cliente'}".`}
                              label="Gerar copy"
                              variant="outlined"
                            />
                          </Stack>
                        ),
                      },
                    ]
                  : []
              }
            />
          </Grid>
        </Grid>
      )}

      <JobWorkbenchDrawer
        open={drawerOpen}
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
        onClose={() => setDrawerOpen(false)}
        onCreate={createJob}
        onUpdate={updateJob}
        onStatusChange={changeStatus}
        onFetchDetail={fetchJob}
      />
    </OperationsShell>
  );
}
