'use client';

/**
 * JarvisAlertsSectionClient — Fila global de alertas Jarvis no Radar de Operações.
 *
 * Mostra alertas abertos de todos os clientes, com dismiss/snooze inline.
 * Renderiza apenas quando há alertas.
 */

import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { IconAlertTriangle, IconBellOff, IconBrain, IconRefresh, IconX } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

type JarvisAlertItem = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  alert_type: string;
  title: string;
  body: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  created_at: string;
};

const PRIORITY_COLOR_MAP: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#6b7280',
};

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

const ALERT_TYPE_LABEL: Record<string, string> = {
  card_stalled:       'Card parado',
  meeting_no_card:    'Reunião sem card',
  whatsapp_no_reply:  'Sem resposta',
  contract_expiring:  'Contrato expirando',
  market_opportunity: 'Oportunidade',
  job_no_briefing:    'Job sem briefing',
};

function getClientHref(alert: JarvisAlertItem) {
  if (!alert.client_id) return null;
  if (alert.alert_type === 'meeting_no_card') {
    return `/clients/${alert.client_id}/radar?sub=comunicacao&inner=reunioes`;
  }
  if (alert.alert_type === 'whatsapp_no_reply') {
    return `/clients/${alert.client_id}/radar?sub=comunicacao&inner=whatsapp`;
  }
  return `/clients/${alert.client_id}/operacao`;
}

function getClientHrefLabel(alertType: string) {
  if (alertType === 'meeting_no_card' || alertType === 'whatsapp_no_reply') {
    return 'Ver comunicação →';
  }
  return 'Ver operação →';
}

export default function JarvisAlertsSectionClient({ limit = 20 }: { limit?: number }) {
  const theme = useTheme();
  const [alerts, setAlerts] = useState<JarvisAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: JarvisAlertItem[] }>(`/jarvis/alerts?limit=${limit}`);
      const items = (res.data ?? []).sort(
        (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
      );
      setAlerts(items);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const dismiss = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try { await apiPost(`/jarvis/alerts/${id}/dismiss`, {}); } catch {}
  };

  const snooze = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try { await apiPost(`/jarvis/alerts/${id}/snooze`, { hours: 24 }); } catch {}
  };

  const runEngine = async () => {
    setRunning(true);
    try {
      await apiPost('/jarvis/alerts/run', {});
      await loadAlerts();
    } catch {} finally {
      setRunning(false);
    }
  };

  if (loading) return null;
  if (alerts.length === 0) return null;

  const urgent = alerts.filter((a) => a.priority === 'urgent').length;
  const high   = alerts.filter((a) => a.priority === 'high').length;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <IconBrain size={15} style={{ color: PRIORITY_COLOR_MAP.urgent }} />
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.72rem' }}
          >
            Alertas Jarvis
          </Typography>
          {urgent > 0 && (
            <Chip size="small" label={`${urgent} urgente${urgent > 1 ? 's' : ''}`} color="error"
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }} />
          )}
          {high > 0 && (
            <Chip size="small" label={`${high} alto${high > 1 ? 's' : ''}`} color="warning"
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }} />
          )}
        </Stack>
        <Tooltip title="Rodar motor de alertas agora">
          <span>
            <IconButton size="small" onClick={runEngine} disabled={running}>
              {running ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Alert list */}
      <Stack spacing={0.75}>
        {alerts.map((a) => {
          const color = PRIORITY_COLOR_MAP[a.priority] ?? '#6b7280';
          const clientHref = getClientHref(a);

          return (
            <Box
              key={a.id}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                border: `1px solid ${alpha(color, 0.25)}`,
                bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.07 : 0.04),
                transition: 'all 120ms ease',
              }}
            >
              <Box sx={{ color, flexShrink: 0, mt: 0.3 }}>
                <IconAlertTriangle size={14} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                  <Typography
                    variant="body2"
                    sx={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.3 }}
                  >
                    {a.title}
                  </Typography>
                  <Chip
                    label={ALERT_TYPE_LABEL[a.alert_type] ?? a.alert_type}
                    size="small"
                    sx={{
                      height: 16, fontSize: '0.6rem', fontWeight: 600,
                      bgcolor: alpha(color, 0.12), color,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'block' }}>
                  {a.body}
                </Typography>
                {clientHref && (
                  <Button
                    component={Link}
                    href={clientHref}
                    size="small"
                    sx={{
                      mt: 0.5, p: 0, fontSize: '0.7rem', fontWeight: 600,
                      color, minWidth: 0, textTransform: 'none',
                      '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                    }}
                  >
                    {getClientHrefLabel(a.alert_type)}
                  </Button>
                )}
              </Box>
              <Stack direction="row" spacing={0.25} flexShrink={0}>
                <Tooltip title="Soneca 24h">
                  <IconButton size="small" onClick={() => snooze(a.id)} sx={{ p: 0.35 }}>
                    <IconBellOff size={13} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Dispensar">
                  <IconButton size="small" onClick={() => dismiss(a.id)} sx={{ p: 0.35 }}>
                    <IconX size={13} />
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
