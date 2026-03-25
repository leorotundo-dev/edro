'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { IconAlertTriangle, IconBolt, IconCheckbox, IconTrendingUp, IconX, IconBellOff } from '@tabler/icons-react';

type BoardInsightsSummary = {
  summary: {
    cards_in_progress: number;
    pct_on_time: number | null;
    avg_days_overdue: number | null;
  };
  throughput: { cards_per_week_last_4w: number | null; wip_count: number };
  bottleneck: { stage: string | null; avg_hours: number | null };
  cycle_times: { median_hours: number | null };
};

const STAGE_LABELS: Record<string, string> = {
  intake: 'Entrada', in_progress: 'Produção', revision: 'Revisão',
  approval_internal: 'Aprovação Interna', approval_client: 'Aprovação Cliente',
  ready: 'Pronto', scheduled: 'Agendado', done: 'Concluído',
};

function StatCard({
  icon, label, value, sub, color,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Box sx={{
      p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider',
      bgcolor: 'background.paper', display: 'flex', gap: 1.5, alignItems: 'flex-start',
    }}>
      <Box sx={{ color: color ?? 'primary.main', mt: 0.25 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
        <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
    </Box>
  );
}

// ─── Jarvis Alerts ────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#6b7280',
};

const ALERT_TYPE_LABEL: Record<string, string> = {
  card_stalled: 'Card parado',
  meeting_no_card: 'Reunião sem card',
  whatsapp_no_reply: 'Sem resposta WhatsApp',
  contract_expiring: 'Contrato expirando',
  market_opportunity: 'Oportunidade',
  job_no_briefing: 'Job sem briefing',
};

type JarvisAlertItem = {
  id: string;
  alert_type: string;
  title: string;
  body: string;
  priority: string;
  created_at: string;
};

function JarvisAlertsPanel({ clientId }: { clientId: string }) {
  const [alerts, setAlerts] = useState<JarvisAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: JarvisAlertItem[] }>(`/jarvis/alerts?client_id=${clientId}&limit=5`);
      setAlerts(res.data ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const dismiss = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await apiPost(`/jarvis/alerts/${id}/dismiss`, {});
    } catch {}
  };

  const snooze = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await apiPost(`/jarvis/alerts/${id}/snooze`, { hours: 24 });
    } catch {}
  };

  if (loading) return null;
  if (!alerts.length) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.65rem', display: 'block', mb: 1 }}>
        Alertas Jarvis · {alerts.length}
      </Typography>
      <Stack spacing={0.75}>
        {alerts.map((a) => {
          const color = PRIORITY_COLOR[a.priority] ?? '#6b7280';
          return (
            <Box
              key={a.id}
              sx={(theme) => ({
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: `1px solid ${alpha(color, 0.25)}`,
                bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.07 : 0.04),
              })}
            >
              <Box sx={{ color, flexShrink: 0, mt: 0.3 }}>
                <IconAlertTriangle size={14} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {a.title}
                  </Typography>
                  <Chip
                    label={ALERT_TYPE_LABEL[a.alert_type] ?? a.alert_type}
                    size="small"
                    sx={{ height: 16, fontSize: '0.6rem', bgcolor: alpha(color, 0.12), color }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                  {a.body}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.25} flexShrink={0}>
                <Tooltip title="Soneca 24h">
                  <IconButton size="small" onClick={() => snooze(a.id)} sx={{ p: 0.25 }}>
                    <IconBellOff size={12} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Dispensar">
                  <IconButton size="small" onClick={() => dismiss(a.id)} sx={{ p: 0.25 }}>
                    <IconX size={12} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

type Props = { boardId: string; clientId?: string };

export default function OperacaoRadarSection({ boardId, clientId }: Props) {
  const [data, setData] = useState<BoardInsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ insights: BoardInsightsSummary }>(`/trello/project-boards/${boardId}/insights`);
      setData(res.insights);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>;
  if (!data) return null;

  const { summary, throughput, bottleneck, cycle_times } = data;

  const onTime = summary.pct_on_time != null ? `${Math.round(summary.pct_on_time)}%` : '—';
  const onTimeColor = summary.pct_on_time == null ? undefined : summary.pct_on_time >= 80 ? 'success.main' : summary.pct_on_time >= 60 ? 'warning.main' : 'error.main';

  const cycleLabel = cycle_times.median_hours != null
    ? cycle_times.median_hours < 24
      ? `${Math.round(cycle_times.median_hours)}h`
      : `${(cycle_times.median_hours / 24).toFixed(1)}d`
    : '—';

  const bottleneckLabel = bottleneck.stage ? (STAGE_LABELS[bottleneck.stage] ?? bottleneck.stage) : null;
  const bottleneckHours = bottleneck.avg_hours != null
    ? bottleneck.avg_hours < 24 ? `${Math.round(bottleneck.avg_hours)}h parado` : `${(bottleneck.avg_hours / 24).toFixed(1)}d parado`
    : null;

  return (
    <>
    {clientId && <JarvisAlertsPanel clientId={clientId} />}
    <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard
          icon={<IconBolt size={18} />}
          label="Em produção"
          value={String(summary.cards_in_progress)}
          sub={`${throughput.wip_count} total em aberto`}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard
          icon={<IconCheckbox size={18} />}
          label="No prazo"
          value={onTime}
          sub={summary.avg_days_overdue ? `${summary.avg_days_overdue.toFixed(1)}d de atraso médio` : 'Sem atrasos'}
          color={onTimeColor}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard
          icon={<IconTrendingUp size={18} />}
          label="Entregues / semana"
          value={throughput.cards_per_week_last_4w != null ? throughput.cards_per_week_last_4w.toFixed(1) : '—'}
          sub="Média das últimas 4 semanas"
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        {bottleneckLabel ? (
          <StatCard
            icon={<IconAlertTriangle size={18} />}
            label="Gargalo"
            value={bottleneckLabel}
            sub={bottleneckHours ?? `Cycle time médio: ${cycleLabel}`}
            color="warning.main"
          />
        ) : (
          <StatCard
            icon={<IconTrendingUp size={18} />}
            label="Cycle time médio"
            value={cycleLabel}
            sub="Briefing → entrega"
          />
        )}
      </Grid>
    </Grid>
    </>
  );
}
