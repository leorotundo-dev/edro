'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import OperationsShell from '@/components/operations/OperationsShell';
import { useOperationsData } from '@/components/operations/useOperationsData';
import { OpsSummaryStat } from '@/components/operations/primitives';
import { isClosedStatus } from '@/components/operations/derived';
import { formatMinutes, getRisk, type OperationsJob } from '@/components/operations/model';
import JobWorkbenchDrawer from '@/components/operations/JobWorkbenchDrawer';
import { apiGet, apiPost } from '@/lib/api';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
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

/* ─── Signal type → visual config ─── */

type SignalVisual = {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  label: string;
};

function signalVisual(signal: Signal, dark: boolean): SignalVisual {
  const type = signal.signal_type;
  const domain = signal.domain;

  if (type === 'decision' || signal.severity >= 90) {
    return {
      color: dark ? '#FF6B6B' : '#D32F2F',
      bg: dark ? 'rgba(255,72,66,0.1)' : 'rgba(211,47,47,0.06)',
      border: dark ? 'rgba(255,72,66,0.25)' : 'rgba(211,47,47,0.18)',
      icon: <IconFlag size={16} />,
      label: 'DECISÃO',
    };
  }
  if (type === 'attention' || signal.severity >= 70) {
    return {
      color: dark ? '#FF6B6B' : '#D32F2F',
      bg: dark ? 'rgba(255,72,66,0.08)' : 'rgba(211,47,47,0.04)',
      border: dark ? 'rgba(255,72,66,0.18)' : 'rgba(211,47,47,0.12)',
      icon: <IconAlertTriangle size={16} />,
      label: 'ATENÇÃO',
    };
  }
  if (type === 'action' || signal.severity >= 55) {
    return {
      color: dark ? '#FFAE1F' : '#ED6C02',
      bg: dark ? 'rgba(255,174,31,0.08)' : 'rgba(237,108,2,0.04)',
      border: dark ? 'rgba(255,174,31,0.18)' : 'rgba(237,108,2,0.12)',
      icon: domain === 'meeting' ? <IconCalendarEvent size={16} /> : <IconBell size={16} />,
      label: 'AÇÃO',
    };
  }
  if (type === 'opportunity') {
    return {
      color: dark ? '#FFAE1F' : '#ED6C02',
      bg: dark ? 'rgba(255,174,31,0.06)' : 'rgba(237,108,2,0.03)',
      border: dark ? 'rgba(255,174,31,0.14)' : 'rgba(237,108,2,0.08)',
      icon: <IconSparkles size={16} />,
      label: 'OPORTUNIDADE',
    };
  }
  if (type === 'health') {
    return {
      color: dark ? '#aaa' : '#666',
      bg: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      border: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      icon: <IconPlugConnected size={16} />,
      label: 'SAÚDE',
    };
  }
  // Default: production/learning/financial
  return {
    color: dark ? '#ccc' : '#555',
    bg: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
    border: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    icon: <IconClock size={16} />,
    label: type.toUpperCase(),
  };
}

function domainIcon(domain: string) {
  switch (domain) {
    case 'whatsapp': return <IconBrandWhatsapp size={14} />;
    case 'meeting': return <IconCalendarEvent size={14} />;
    case 'health': return <IconPlugConnected size={14} />;
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
  const vis = signalVisual(signal, dark);

  return (
    <Box
      onClick={onClick}
      sx={{
        px: 2,
        py: 1.5,
        cursor: 'pointer',
        borderLeft: `3px solid ${vis.color}`,
        bgcolor: selected ? vis.bg : 'transparent',
        borderBottom: `1px solid ${dark ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.black, 0.06)}`,
        transition: 'all 120ms ease',
        '&:hover': {
          bgcolor: vis.bg,
        },
      }}
    >
      <Stack spacing={0.75}>
        {/* Header: type badge + domain + time */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ color: vis.color, display: 'flex', alignItems: 'center' }}>{vis.icon}</Box>
          <Chip
            size="small"
            label={vis.label}
            sx={{
              height: 18, fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.08em',
              bgcolor: vis.bg, color: vis.color, border: `1px solid ${vis.border}`,
              borderRadius: 0.75,
            }}
          />
          {signal.client_name && (
            <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.5), fontWeight: 600 }}>
              {signal.client_name}
            </Typography>
          )}
          {domainIcon(signal.domain) && (
            <Box sx={{ color: alpha(theme.palette.text.primary, 0.35), display: 'flex' }}>
              {domainIcon(signal.domain)}
            </Box>
          )}
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.35), fontSize: '0.65rem' }}>
            {timeAgo(signal.created_at)}
          </Typography>
        </Stack>

        {/* Title */}
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
          {signal.title}
        </Typography>

        {/* Summary */}
        {signal.summary && (
          <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.55), lineHeight: 1.3 }}>
            {signal.summary}
          </Typography>
        )}

        {/* Actions */}
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
          {(signal.actions || []).map((action, idx) => (
            action.href ? (
              <Button
                key={idx}
                component={Link}
                href={action.href}
                size="small"
                variant={idx === 0 ? 'contained' : 'outlined'}
                sx={{
                  height: 26, fontSize: '0.7rem', fontWeight: 700, borderRadius: 0.75,
                  px: 1.25, textTransform: 'none',
                  ...(idx === 0 ? { bgcolor: vis.color, '&:hover': { bgcolor: vis.color, opacity: 0.9 } } : {}),
                }}
              >
                {action.label}
              </Button>
            ) : (
              <Button
                key={idx}
                size="small"
                variant="outlined"
                sx={{ height: 26, fontSize: '0.7rem', fontWeight: 700, borderRadius: 0.75, px: 1.25, textTransform: 'none' }}
              >
                {action.label}
              </Button>
            )
          ))}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Resolver">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onResolve(); }} sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}>
              <IconCheck size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Adiar 4h">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSnooze(); }} sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}>
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

/* ─── Jarvis Summary ─── */

function JarvisSummary({ signals, jobs }: { signals: Signal[]; jobs: OperationsJob[] }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const critical = signals.filter((s) => s.severity >= 90).length;
  const attention = signals.filter((s) => s.severity >= 70 && s.severity < 90).length;
  const activeJobs = jobs.filter((j) => !isClosedStatus(j.status)).length;
  const blocked = jobs.filter((j) => j.status === 'blocked').length;
  const noOwner = jobs.filter((j) => !j.owner_id && !isClosedStatus(j.status)).length;

  const parts: string[] = [];
  if (critical > 0) parts.push(`${critical} ${critical === 1 ? 'item crítico' : 'itens críticos'}`);
  if (attention > 0) parts.push(`${attention} ${attention === 1 ? 'precisa de atenção' : 'precisam de atenção'}`);
  if (blocked > 0) parts.push(`${blocked} ${blocked === 1 ? 'bloqueado' : 'bloqueados'}`);
  if (noOwner > 0) parts.push(`${noOwner} sem responsável`);
  parts.push(`${activeJobs} jobs ativos`);

  const summary = parts.join(', ') + '.';

  return (
    <Box
      sx={{
        px: 2.5, py: 1.75,
        borderRadius: 1.5,
        bgcolor: dark ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.primary.main, 0.03),
        border: `1px solid ${alpha(theme.palette.primary.main, dark ? 0.15 : 0.1)}`,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ color: theme.palette.primary.main, mt: 0.25 }}>
          <IconSparkles size={20} />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
            {summary}
          </Typography>
          {signals.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              Nenhum sinal operacional ativo. O sistema está em dia.
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

/* ─── Team Capacity Mini (bottom bar) ─── */

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
    <Box
      sx={{
        px: 2, py: 1.25,
        borderRadius: 1,
        border: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.08)}`,
        bgcolor: dark ? alpha(theme.palette.common.white, 0.01) : alpha(theme.palette.background.paper, 0.7),
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem' }}>
          Capacidade do time
        </Typography>
        <Button component={Link} href="/admin/operacoes/semana" size="small" endIcon={<IconChevronRight size={14} />}
          sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'none', ml: 'auto' }}>
          Ver semana
        </Button>
      </Stack>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {ownerStats.slice(0, 6).map((o) => {
          const barColor = o.pct > 100 ? theme.palette.error.main : o.pct > 85 ? theme.palette.warning.main : theme.palette.success.main;
          return (
            <Stack key={o.id} spacing={0.25} sx={{ minWidth: 100 }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                  {o.name?.split(' ')[0]}
                </Typography>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.4), fontSize: '0.65rem' }}>
                  {o.pct}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(o.pct, 100)}
                sx={{
                  height: 4, borderRadius: 1,
                  bgcolor: dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.06),
                  '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 1 },
                }}
              />
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

/* ─── MAIN COMPONENT ─── */

export default function SignalFeedClient() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const ops = useOperationsData('?active=true');
  const { jobs, lookups, loading: jobsLoading } = ops;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  // Drawer for job detail
  const [drawerJobId, setDrawerJobId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadSignals = useCallback(async (silent = false) => {
    if (!silent) setSignalsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Signal[] }>('/operations/signals?limit=30');
      setSignals(res?.data ?? []);
    } catch {
      // Signals table may not exist yet — gracefully degrade
      setSignals([]);
    } finally {
      if (!silent) setSignalsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSignals();
  }, [loadSignals]);

  // Silent refresh every 30s
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
    } catch {
      await loadSignals();
    }
  }, [loadSignals]);

  const handleSelectSignal = useCallback((signal: Signal) => {
    setSelectedSignal(signal);
    if (signal.entity_type === 'job' && signal.entity_id) {
      setDrawerJobId(signal.entity_id);
      setDrawerOpen(true);
    }
  }, []);

  // Find the job for the drawer
  const drawerJob = drawerJobId ? jobs.find((j) => j.id === drawerJobId) || null : null;

  // Stats
  const activeJobs = jobs.filter((j) => !isClosedStatus(j.status));
  const criticalSignals = signals.filter((s) => s.severity >= 90).length;
  const attentionSignals = signals.filter((s) => s.severity >= 70 && s.severity < 90).length;

  const loading = jobsLoading || signalsLoading;

  const summary = (
    <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
      <OpsSummaryStat value={signals.length} label="sinais ativos" />
      <OpsSummaryStat value={criticalSignals} label="críticos" tone={criticalSignals > 0 ? 'error' : 'default'} />
      <OpsSummaryStat value={attentionSignals} label="atenção" tone={attentionSignals > 0 ? 'warning' : 'default'} />
      <OpsSummaryStat value={activeJobs.length} label="jobs ativos" />
    </Stack>
  );

  return (
    <OperationsShell section="overview" summary={summary}>
      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={60} />
          <Skeleton variant="rounded" height={300} />
          <Skeleton variant="rounded" height={60} />
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          {/* Jarvis summary */}
          <JarvisSummary signals={signals} jobs={jobs} />

          {/* Signal feed */}
          <Box
            sx={{
              borderRadius: 1.5,
              border: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.08)}`,
              bgcolor: dark ? alpha(theme.palette.common.white, 0.008) : alpha(theme.palette.background.paper, 0.7),
              overflow: 'hidden',
            }}
          >
            {/* Feed header */}
            <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${dark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.08)}` }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Feed de sinais
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Recalcular sinais">
                    <IconButton size="small" onClick={handleRefreshAll}>
                      <IconRefresh size={16} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>

            {/* Signal list */}
            {signals.length === 0 ? (
              <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
                <IconCheck size={32} style={{ opacity: 0.2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Tudo em dia. Nenhum sinal operacional ativo.
                </Typography>
              </Box>
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
          </Box>

          {/* Team capacity mini */}
          <TeamCapacityMini jobs={jobs} owners={lookups.owners} />
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
