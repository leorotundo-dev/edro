'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import OperationsShell from '@/components/operations/OperationsShell';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { StatusDot, DeadlineCountdown } from '@/components/operations/primitives';
import { isClosedStatus } from '@/components/operations/derived';
import { formatMinutes, getRisk, type OperationsJob } from '@/components/operations/model';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import { apiGet, apiPost } from '@/lib/api';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAlertTriangle,
  IconBell,
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconFlag,
  IconInbox,
  IconPlugConnected,
  IconRefresh,
  IconSparkles,
  IconZzz,
} from '@tabler/icons-react';

/* ─── Types ─── */

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
  snoozed_until?: string | null;
};

/* ─── Signal visual mapping ─── */

function signalConfig(signal: Signal) {
  const t = signal.signal_type;
  if (t === 'decision' || signal.severity >= 90) return { color: 'error' as const, icon: <IconFlag size={15} />, label: 'Decisão' };
  if (t === 'attention' || signal.severity >= 70) return { color: 'warning' as const, icon: <IconAlertTriangle size={15} />, label: 'Atenção' };
  if (t === 'action' || signal.severity >= 55) return { color: 'info' as const, icon: signal.domain === 'meeting' ? <IconCalendarEvent size={15} /> : <IconBell size={15} />, label: 'Ação' };
  if (t === 'opportunity') return { color: 'success' as const, icon: <IconSparkles size={15} />, label: 'Oportunidade' };
  return { color: 'default' as const, icon: <IconPlugConnected size={15} />, label: 'Saúde' };
}

function domainLabel(domain: string) {
  switch (domain) {
    case 'jobs': return 'Demandas';
    case 'whatsapp': return 'WhatsApp';
    case 'meeting': return 'Reuniões';
    case 'health': return 'Integrações';
    default: return domain;
  }
}

function domainIcon(domain: string) {
  switch (domain) {
    case 'whatsapp': return <IconBrandWhatsapp size={13} />;
    case 'meeting': return <IconCalendarEvent size={13} />;
    case 'health': return <IconPlugConnected size={13} />;
    default: return null;
  }
}

/* ─── Signal Card ─── */

function SignalCard({
  signal,
  selected,
  onClick,
  onResolve,
  onSnooze,
}: {
  signal: Signal;
  selected?: boolean;
  onClick: () => void;
  onResolve: () => void;
  onSnooze: () => void;
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const cfg = signalConfig(signal);
  const paletteColor = cfg.color !== 'default' ? theme.palette[cfg.color].main : alpha(theme.palette.text.primary, 0.5);

  return (
    <Box
      onClick={onClick}
      sx={{
        px: 2,
        py: 1.5,
        cursor: 'pointer',
        borderLeft: `3px solid ${paletteColor}`,
        bgcolor: selected ? alpha(paletteColor, dark ? 0.08 : 0.04) : 'transparent',
        transition: 'all 120ms ease',
        '&:hover': { bgcolor: alpha(paletteColor, dark ? 0.06 : 0.03) },
        '&:not(:last-child)': {
          borderBottom: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Stack spacing={0.75}>
        {/* Header row */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ color: paletteColor, display: 'flex' }}>{cfg.icon}</Box>
          <Chip
            size="small"
            label={cfg.label}
            color={cfg.color}
            variant="outlined"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, borderRadius: 1 }}
          />
          <Chip
            size="small"
            label={domainLabel(signal.domain)}
            icon={domainIcon(signal.domain) || undefined}
            variant="filled"
            sx={{ height: 20, fontSize: '0.62rem', fontWeight: 600, bgcolor: alpha(theme.palette.text.primary, dark ? 0.06 : 0.05), color: 'text.secondary' }}
          />
          {signal.client_name && (
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              {signal.client_name}
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.35), fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
            {timeAgo(signal.created_at)}
          </Typography>
        </Stack>

        {/* Title */}
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.4, color: 'text.primary' }}>
          {signal.title}
        </Typography>

        {/* Summary */}
        {signal.summary && (
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.35 }}>
            {signal.summary}
          </Typography>
        )}

        {/* Actions row */}
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
          {(signal.actions || []).map((action, idx) =>
            action.href ? (
              <Button
                key={idx}
                component={Link}
                href={action.href}
                size="small"
                variant={idx === 0 ? 'contained' : 'text'}
                color={idx === 0 && cfg.color !== 'default' ? cfg.color : undefined}
                sx={{ height: 26, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1, px: 1.25, textTransform: 'none' }}
              >
                {action.label}
              </Button>
            ) : (
              <Button
                key={idx}
                size="small"
                variant="text"
                sx={{ height: 26, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1, px: 1.25, textTransform: 'none' }}
              >
                {action.label}
              </Button>
            ),
          )}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Resolver">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onResolve(); }} sx={{ opacity: 0.3, '&:hover': { opacity: 1, color: 'success.main' } }}>
              <IconCheck size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Adiar 4h">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSnooze(); }} sx={{ opacity: 0.3, '&:hover': { opacity: 1, color: 'warning.main' } }}>
              <IconZzz size={14} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}

/* ─── Time ago helper ─── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/* ─── Empty State ─── */

function EmptySignals() {
  const theme = useTheme();
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: alpha(theme.palette.success.main, 0.08),
        color: 'success.main',
      }}>
        <IconCheck size={28} />
      </Box>
      <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5 }}>
        Tudo em dia
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Nenhum sinal operacional ativo. O sistema está limpo.
      </Typography>
    </Box>
  );
}

/* ─── Team Capacity Mini ─── */

function TeamCapacityMini({ jobs, owners }: { jobs: OperationsJob[]; owners: Array<{ id: string; name: string; role: string; person_type?: string | null }> }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const activeJobs = jobs.filter((j) => !isClosedStatus(j.status));

  const ownerStats = owners.map((o) => {
    const ownerJobs = activeJobs.filter((j) => j.owner_id === o.id);
    const committed = ownerJobs.reduce((sum, j) => sum + Number(j.estimated_minutes || 0), 0);
    const weekly = o.person_type === 'freelancer' ? 16 * 60 : o.role === 'admin' || o.role === 'manager' ? 22 * 60 : 28 * 60;
    const pct = weekly > 0 ? Math.round((committed / weekly) * 100) : 0;
    return { ...o, committed, weekly, pct, jobCount: ownerJobs.length };
  }).filter((o) => o.jobCount > 0).sort((a, b) => b.pct - a.pct);

  if (!ownerStats.length) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.68rem', color: 'text.secondary' }}>
          Capacidade do time
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button component={Link} href="/admin/operacoes/semana" size="small" endIcon={<IconChevronRight size={14} />}
          sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'none' }}>
          Ver semana
        </Button>
      </Stack>
      <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap>
        {ownerStats.slice(0, 8).map((o) => {
          const barColor = o.pct > 100 ? theme.palette.error.main : o.pct > 85 ? theme.palette.warning.main : theme.palette.success.main;
          return (
            <Stack key={o.id} spacing={0.5} sx={{ minWidth: 100, flex: '1 1 100px', maxWidth: 160 }}>
              <Stack direction="row" spacing={0.5} alignItems="baseline">
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  {o.name?.split(' ')[0]}
                </Typography>
                <Typography variant="caption" sx={{ color: barColor, fontWeight: 700, fontSize: '0.68rem' }}>
                  {o.pct}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(o.pct, 100)}
                sx={{
                  height: 5, borderRadius: 1,
                  bgcolor: dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06),
                  '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 1 },
                }}
              />
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
}

/* ─── MAIN COMPONENT ─── */

export default function SignalFeedClient() {
  const theme = useTheme();

  const ops = useOperationsData('?active=true');
  const { jobs, lookups, loading: jobsLoading } = ops;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [drawerJobId, setDrawerJobId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadSignals = useCallback(async (silent = false) => {
    if (!silent) setSignalsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Signal[] }>('/operations/signals?limit=30');
      setSignals(res?.data ?? []);
    } catch {
      setSignals([]);
    } finally {
      if (!silent) setSignalsLoading(false);
    }
  }, []);

  useEffect(() => { loadSignals(); }, [loadSignals]);
  useEffect(() => {
    const id = setInterval(() => loadSignals(true), 30_000);
    return () => clearInterval(id);
  }, [loadSignals]);

  const handleResolve = useCallback(async (signalId: string) => {
    try {
      await apiPost(`/operations/signals/${signalId}/resolve`, {});
      setSignals((prev) => prev.filter((s) => s.id !== signalId));
    } catch { /* ignore */ }
  }, []);

  const handleSnooze = useCallback(async (signalId: string) => {
    try {
      await apiPost(`/operations/signals/${signalId}/snooze`, { hours: 4 });
      setSignals((prev) => prev.filter((s) => s.id !== signalId));
    } catch { /* ignore */ }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    setSignalsLoading(true);
    try {
      await apiPost('/operations/signals/rebuild', {});
      await loadSignals();
    } catch { await loadSignals(); }
  }, [loadSignals]);

  const handleSelectSignal = useCallback((signal: Signal) => {
    setSelectedSignal(signal);
    if (signal.entity_type === 'job' && signal.entity_id) {
      setDrawerJobId(signal.entity_id);
      setDrawerOpen(true);
    }
  }, []);

  const drawerJob = drawerJobId ? jobs.find((j) => j.id === drawerJobId) || null : null;
  const activeJobs = jobs.filter((j) => !isClosedStatus(j.status));
  const criticalSignals = signals.filter((s) => s.severity >= 90).length;
  const attentionSignals = signals.filter((s) => s.severity >= 70 && s.severity < 90).length;
  const loading = jobsLoading || signalsLoading;

  const blockedCount = activeJobs.filter((j) => j.status === 'blocked').length;
  const unassignedCount = activeJobs.filter((j) => !j.owner_id).length;

  const summary = null; // KPIs moved to hero strip below

  return (
    <OperationsShell section="overview" summary={summary}>
      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={90} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          {/* ── Hero KPI Strip ── */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {[
              { value: signals.length, label: 'Sinais', color: theme.palette.primary.main, pulse: false },
              { value: criticalSignals, label: 'Críticos', color: theme.palette.error.main, pulse: criticalSignals > 0 },
              { value: attentionSignals, label: 'Atenção', color: theme.palette.warning.main, pulse: false },
              { value: blockedCount, label: 'Bloqueados', color: '#FA896B', pulse: blockedCount > 0 },
              { value: unassignedCount, label: 'Sem dono', color: '#FFAE1F', pulse: false },
              { value: activeJobs.length, label: 'Ativos', color: theme.palette.success.main, pulse: false },
            ].map((kpi) => (
              <Paper
                key={kpi.label}
                variant="outlined"
                sx={{
                  flex: '1 1 100px',
                  minWidth: 90,
                  p: 1.5,
                  borderRadius: 2.5,
                  textAlign: 'center',
                  borderColor: kpi.value > 0 ? alpha(kpi.color, 0.3) : 'divider',
                  bgcolor: kpi.value > 0 ? alpha(kpi.color, 0.04) : 'transparent',
                  transition: 'all 200ms ease',
                  ...(kpi.pulse && {
                    animation: 'kpiPulse 2s ease-in-out infinite',
                    '@keyframes kpiPulse': {
                      '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(kpi.color, 0.3)}` },
                      '50%': { boxShadow: `0 0 0 4px ${alpha(kpi.color, 0.15)}` },
                    },
                  }),
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    lineHeight: 1,
                    color: kpi.value > 0 ? kpi.color : 'text.disabled',
                    fontSize: { xs: '1.5rem', md: '2rem' },
                  }}
                >
                  {kpi.value}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {kpi.label}
                </Typography>
              </Paper>
            ))}
          </Stack>

          <Grid container spacing={2.5}>
            {/* Signal feed (main content) */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {/* Feed header */}
                <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconInbox size={16} style={{ opacity: 0.5 }} />
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        Feed de sinais
                      </Typography>
                      {signals.length > 0 && (
                        <Box sx={{
                          px: 0.75, py: 0.1, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.12),
                          color: theme.palette.primary.main, fontSize: '0.7rem', fontWeight: 800,
                        }}>
                          {signals.length}
                        </Box>
                      )}
                    </Stack>
                    <Tooltip title="Recalcular sinais">
                      <IconButton size="small" onClick={handleRefreshAll} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                        <IconRefresh size={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                {/* Signal list */}
                {signals.length === 0 ? (
                  <EmptySignals />
                ) : (
                  signals.map((signal) => (
                    <SignalCard
                      key={signal.id}
                      signal={signal}
                      selected={selectedSignal?.id === signal.id}
                      onClick={() => handleSelectSignal(signal)}
                      onResolve={() => handleResolve(signal.id)}
                      onSnooze={() => handleSnooze(signal.id)}
                    />
                  ))
                )}
              </Paper>
            </Grid>

            {/* Right sidebar: quick stats + capacity */}
            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack spacing={2}>
                {/* Quick action links — big visual blocks */}
                {[
                  { label: 'Sem dono', value: unassignedCount, href: '/admin/operacoes/jobs?unassigned=true', color: theme.palette.warning.main, icon: <IconClock size={18} /> },
                  { label: 'Bloqueados', value: blockedCount, href: '/admin/operacoes/radar', color: theme.palette.error.main, icon: <IconFlag size={18} /> },
                  { label: 'Aprovação', value: activeJobs.filter((j) => j.status === 'awaiting_approval').length, href: '/admin/operacoes/jobs', color: theme.palette.info.main, icon: <IconCheck size={18} /> },
                ].map((item) => (
                  <Paper
                    key={item.label}
                    component={Link}
                    href={item.href}
                    variant="outlined"
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      px: 2, py: 1.5, borderRadius: 2.5,
                      textDecoration: 'none', color: 'inherit',
                      borderColor: item.value > 0 ? alpha(item.color, 0.3) : 'divider',
                      transition: 'all 140ms ease',
                      '&:hover': { bgcolor: alpha(item.color, 0.04), transform: 'translateX(2px)' },
                    }}
                  >
                    <Box sx={{
                      width: 36, height: 36, borderRadius: 1.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: alpha(item.color, item.value > 0 ? 0.14 : 0.06),
                      color: item.value > 0 ? item.color : 'text.disabled',
                    }}>
                      {item.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.68rem' }}>
                        {item.label}
                      </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: item.value > 0 ? item.color : 'text.disabled' }}>
                      {item.value}
                    </Typography>
                    <IconChevronRight size={16} style={{ opacity: 0.3 }} />
                  </Paper>
                ))}

                {/* Team capacity */}
                <TeamCapacityMini jobs={jobs} owners={lookups.owners} />
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      )}

      {/* Job Detail Drawer */}
      <JobWorkbenchDrawer
        open={drawerOpen}
        mode="edit"
        job={drawerJob}
        jobTypes={lookups.jobTypes}
        skills={lookups.skills}
        channels={lookups.channels}
        clients={lookups.clients}
        owners={lookups.owners}
        currentUserId={ops.currentUserId}
        onClose={() => { setDrawerOpen(false); setDrawerJobId(null); }}
        onCreate={async (payload) => ops.createJob(payload)}
        onUpdate={async (id, payload) => ops.updateJob(id, payload)}
        onStatusChange={async (id, status, reason) => ops.changeStatus(id, status, reason)}
        onFetchDetail={async (id) => ops.fetchJob(id)}
      />
    </OperationsShell>
  );
}
