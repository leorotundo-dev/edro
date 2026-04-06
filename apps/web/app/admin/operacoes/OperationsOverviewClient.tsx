'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
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
  OpsPanel,
} from '@/components/operations/primitives';
import {
  jobsForToday,
  sortByOperationalPriority,
} from '@/components/operations/derived';
import {
  getRisk,
  isApprovalQueueJob,
  isCopyReadyJob,
  isWaitingBriefing,
  isWaitingInfo,
  type OperationsJob,
} from '@/components/operations/model';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { apiPost } from '@/lib/api';

const FLOW_COLUMNS = [
  { key: 'entrada', label: 'Entrada', color: '#5D87FF', stages: ['intake', 'planned', 'ready'] },
  { key: 'producao', label: 'Produção', color: '#E85219', stages: ['allocated', 'in_progress', 'in_review'] },
  { key: 'esperando', label: 'Esperando', color: '#FFAE1F', stages: ['awaiting_approval', 'approved', 'scheduled', 'blocked'] },
  { key: 'entregue', label: 'Entregue', color: '#13DEB9', stages: ['published', 'done'] },
] as const;

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

type InAppNotification = {
  id: string;
  event_type: string;
  title: string;
  body?: string;
  link?: string;
  read_at: string | null;
  created_at: string;
};

export default function OperationsOverviewClient() {
  const { jobs, lookups, loading, error, refresh, syncHealth, currentUserId, createJob, updateJob, changeStatus, fetchJob } = useOperationsData('?active=true');
  const [syncing, setSyncing] = useState(false);
  const [generatingDigest, setGeneratingDigest] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [signalStats, setSignalStats] = useState({ total: 0, critical: 0, attention: 0 });
  const [pendingRequests, setPendingRequests] = useState<Array<{ id: string; client_name: string; form_data: { type?: string; objective?: string } }>>([]);
  const [latestDailyDigest, setLatestDailyDigest] = useState<LatestDigest | null>(null);
  const [bedelNotifications, setBedelNotifications] = useState<InAppNotification[]>([]);
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
      const [digestResponse, notificationsResponse] = await Promise.all([
        apiGet<{ daily?: LatestDigest | null }>('/admin/diario/latest'),
        apiGet<{ notifications?: InAppNotification[]; unreadCount?: number }>('/notifications').catch(() => ({ notifications: [] })),
      ]);
      setLatestDailyDigest(digestResponse?.daily ?? null);
      setBedelNotifications(
        (notificationsResponse?.notifications ?? [])
          .filter((notification) => notification.event_type.startsWith('bedel_'))
          .slice(0, 3)
      );
    } catch {
      setLatestDailyDigest(null);
      setBedelNotifications([]);
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
  const flowColumns = useMemo(() => {
    return FLOW_COLUMNS.map((column) => {
      const items = jobs
        .filter((job) => job.status !== 'archived' && column.stages.some((stage) => stage === job.status))
        .sort(sortByOperationalPriority);
      return { ...column, items };
    });
  }, [jobs]);

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
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
                    gap: 1.25,
                  }}
                >
                  {[
                    {
                      key: 'portal',
                      eyebrow: 'Solicitações novas',
                      title: pendingRequests.length ? `${pendingRequests.length} pedido(s) no portal` : 'Nenhum pedido novo agora',
                      subtitle: pendingRequests.length
                        ? pendingRequests.slice(0, 3).map((request) => request.client_name).join(' · ')
                        : 'A bandeja de solicitações está limpa neste momento.',
                      href: '/admin/solicitacoes',
                      cta: 'Abrir portal',
                    },
                    {
                      key: 'creative',
                      eyebrow: 'Criativo em espera',
                      title: copyQueue.length ? `${copyQueue.length} demanda(s) prontas para copy` : 'Sem fila de copy agora',
                      subtitle: approvalQueue.length
                        ? `${approvalQueue.length} demanda(s) em aprovação ou revisão criativa`
                        : 'Nenhuma demanda está parada em aprovação criativa.',
                      href: '/admin/operacoes/ia',
                      cta: 'Abrir handoff criativo',
                    },
                    {
                      key: 'bedel',
                      eyebrow: 'Bedel no plantão',
                      title: bedelNotifications.length ? `${bedelNotifications.length} alerta(s) do Bedel` : 'Bedel em silêncio agora',
                      subtitle: bedelNotifications.length
                        ? bedelNotifications[0]?.title || 'Há movimentações recentes do Bedel na operação.'
                        : 'Sugestões de alocação e alertas de risco vão aparecer aqui assim que o Bedel agir.',
                      href: bedelNotifications[0]?.link || '/admin/operacoes/jobs',
                      cta: bedelNotifications.length ? 'Abrir alerta do Bedel' : 'Abrir fila',
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

          <Grid size={{ xs: 12 }}>
            <OpsPanel
              eyebrow="Pauta Geral"
              title="Como a carteira está andando"
              subtitle="Acompanhe entrada, produção, espera e entrega sem dividir a atenção com painéis laterais. Aqui a operação lê o Trello em linguagem de agência."
              action={
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" variant="outlined" label={`${jobs.length} demandas ativas`} />
                  <Chip size="small" variant="outlined" label={`${lookups.clients.length} cliente(s)`} />
                </Stack>
              }
            >
              <Stack spacing={2.25}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
                    gap: 1.5,
                  }}
                >
                  {flowColumns.map((column) => (
                    <Box
                      key={column.key}
                      sx={(theme) => ({
                        minWidth: 0,
                        borderRadius: 2.5,
                        border: `1px solid ${alpha(column.color, 0.16)}`,
                        bgcolor: theme.palette.mode === 'dark' ? alpha(column.color, 0.06) : alpha(column.color, 0.035),
                        boxShadow: `0 2px 14px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.2 : 0.035)}`,
                        overflow: 'hidden',
                      })}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          px: 1.6,
                          py: 1.15,
                          bgcolor: alpha(column.color, 0.08),
                          borderBottom: `1px solid ${alpha(column.color, 0.14)}`,
                        }}
                      >
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: column.color, flexShrink: 0 }} />
                          <Typography variant="subtitle2" fontWeight={800} sx={{ color: column.color }}>
                            {column.label}
                          </Typography>
                        </Stack>
                        <Chip
                          size="small"
                          label={column.items.length}
                          sx={{
                            height: 22,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            bgcolor: alpha(column.color, 0.14),
                            color: column.color,
                          }}
                        />
                      </Stack>

                      <Stack spacing={1.2} sx={{ p: 1.3 }}>
                        {column.items.length ? (
                          <>
                            {column.items.slice(0, 3).map((job) => (
                              <Box
                                key={job.id}
                                onClick={() => openCommands(job)}
                                sx={(theme) => ({
                                  p: 1.35,
                                  borderRadius: 2,
                                  border: `1px solid ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.08 : 0.08)}`,
                                  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.92) : '#fff',
                                  cursor: 'pointer',
                                  transition: 'all 140ms ease',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 10px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.26 : 0.08)}`,
                                    borderColor: alpha(column.color, 0.24),
                                  },
                                })}
                              >
                                <Stack spacing={1}>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.35 }}>
                                      <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary' }}>
                                        {job.client_name || 'Sem cliente'}
                                      </Typography>
                                      {!job.owner_name ? (
                                        <Chip
                                          size="small"
                                          label="Sem dono"
                                          sx={{
                                            height: 20,
                                            fontSize: '0.62rem',
                                            fontWeight: 800,
                                            bgcolor: alpha('#FFAE1F', 0.12),
                                            color: '#d97706',
                                            border: `1px solid ${alpha('#FFAE1F', 0.3)}`,
                                            '& .MuiChip-label': { px: 0.7 },
                                          }}
                                        />
                                      ) : null}
                                    </Stack>
                                    <Typography
                                      variant="body2"
                                      fontWeight={700}
                                      sx={{
                                        fontSize: '0.97rem',
                                        lineHeight: 1.35,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {job.title}
                                    </Typography>
                                  </Box>
                                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                                    <Chip
                                      size="small"
                                      label={job.owner_name || 'Sem responsável'}
                                      sx={{
                                        height: 22,
                                        fontSize: '0.66rem',
                                        fontWeight: 700,
                                        bgcolor: alpha(column.color, 0.08),
                                        color: 'text.primary',
                                      }}
                                    />
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      sx={{ minWidth: 0, px: 1.1, py: 0.3, fontSize: '0.68rem', fontWeight: 700 }}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openCommands(job);
                                      }}
                                    >
                                      Abrir demanda
                                    </Button>
                                  </Stack>
                                </Stack>
                              </Box>
                            ))}
                            {column.items.length > 3 ? (
                              <Button
                                size="small"
                                component={Link}
                                href={`/admin/operacoes/jobs?group=status&highlight=${column.items[0]?.id ?? ''}`}
                                sx={{ alignSelf: 'flex-start', px: 0.2, fontWeight: 700, color: column.color }}
                              >
                                +{column.items.length - 3} mais na pauta
                              </Button>
                            ) : null}
                          </>
                        ) : (
                          <Box
                            sx={{
                              px: 1.3,
                              py: 2.4,
                              borderRadius: 2,
                              border: `1px dashed ${alpha(column.color, 0.24)}`,
                              bgcolor: alpha(column.color, 0.03),
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700, color: alpha(column.color, 0.9) }}>
                              Nada aqui agora.
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" component={Link} href="/admin/operacoes/jobs?view=table&group=client">
                    Abrir pauta geral
                  </Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/ia">
                    Abrir handoff criativo
                  </Button>
                  <Button variant="outlined" component={Link} href="/admin/operacoes/radar">
                    Abrir riscos
                  </Button>
                  {selectedJob ? (
                    <AskJarvisButton
                      message={`Resuma a demanda "${selectedJob.title}" do cliente "${selectedJob.client_name || 'Sem cliente'}" e me diga o próximo passo operacional.`}
                      label="Perguntar ao Jarvis sobre a demanda"
                      variant="outlined"
                    />
                  ) : null}
                </Stack>
              </Stack>
            </OpsPanel>
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
