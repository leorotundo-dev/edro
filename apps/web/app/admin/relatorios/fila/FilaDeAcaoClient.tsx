'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAlertTriangle,
  IconAlertCircle,
  IconInfoCircle,
  IconRefresh,
  IconCheck,
  IconClock,
  IconLock,
  IconChartBar,
  IconPlugConnected,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionItem = {
  id: string;
  type: 'signal' | 'blocked_job' | 'overdue_job' | 'no_metrics' | 'health_drop';
  severity: number;
  title: string;
  summary: string | null;
  client_name: string | null;
  client_id: string | null;
  actions: Array<{ label: string; href?: string; action_type?: string }>;
  created_at: string | null;
};

type QueueSummary = {
  total: number;
  critical: number;
  warning: number;
  info: number;
};

const TYPE_CONFIG: Record<ActionItem['type'], { label: string; icon: React.ReactNode; color: string }> = {
  signal: { label: 'Sinal', icon: <IconAlertCircle size={15} />, color: '#FA4D56' },
  blocked_job: { label: 'Job Bloqueado', icon: <IconLock size={15} />, color: '#FF8C00' },
  overdue_job: { label: 'Job Atrasado', icon: <IconClock size={15} />, color: '#FF4D4F' },
  no_metrics: { label: 'Métricas', icon: <IconPlugConnected size={15} />, color: '#BFBFBF' },
  health_drop: { label: 'Saúde', icon: <IconChartBar size={15} />, color: '#FA896B' },
};

function SeverityIcon({ severity }: { severity: number }) {
  if (severity >= 80) return <IconAlertCircle size={18} color="#FA4D56" />;
  if (severity >= 50) return <IconAlertTriangle size={18} color="#FFAE1F" />;
  return <IconInfoCircle size={18} color="#5D87FF" />;
}

function ActionCard({ item, onResolve }: { item: ActionItem; onResolve: (id: string) => void }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const cfg = TYPE_CONFIG[item.type];

  const borderColor = item.severity >= 80
    ? alpha(theme.palette.error.main, 0.3)
    : item.severity >= 50
    ? alpha(theme.palette.warning.main, 0.2)
    : dark ? alpha('#fff', 0.06) : alpha('#000', 0.06);

  return (
    <Paper elevation={0} sx={{
      p: 2, borderRadius: 2,
      border: `1px solid ${borderColor}`,
      bgcolor: item.severity >= 80 ? alpha(theme.palette.error.main, 0.03) : 'inherit',
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box sx={{ pt: 0.25 }}><SeverityIcon severity={item.severity} /></Box>
        <Stack flex={1} spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography fontWeight={700} fontSize="0.9rem">{item.title}</Typography>
            <Chip size="small" label={cfg.label} sx={{ bgcolor: alpha(cfg.color, 0.12), color: cfg.color, fontSize: '0.7rem', fontWeight: 700 }} />
            {item.client_name && (
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{item.client_name}</Typography>
            )}
          </Stack>
          {item.summary && (
            <Typography variant="body2" color="text.secondary" fontSize="0.8rem">{item.summary}</Typography>
          )}
          {item.created_at && (
            <Typography variant="caption" color="text.disabled">
              {new Date(item.created_at).toLocaleString('pt-BR')}
            </Typography>
          )}

          {/* Actions */}
          {(item.actions?.length > 0 || item.client_id || item.type === 'signal') && (
            <Stack direction="row" spacing={1} pt={0.5} flexWrap="wrap">
              {item.actions?.map((a, i) => (
                <Button key={i} size="small" variant="outlined" component={a.href ? Link : 'button'} href={a.href} sx={{ fontSize: '0.75rem' }}>
                  {a.label}
                </Button>
              ))}
              {item.client_id && (
                <Button size="small" variant="text" component={Link} href={`/clients/${item.client_id}`} sx={{ fontSize: '0.75rem' }}>
                  Ver cliente
                </Button>
              )}
              {item.type === 'signal' && (
                <Button size="small" variant="text" color="success" onClick={() => onResolve(item.id)} sx={{ fontSize: '0.75rem' }}>
                  Resolver
                </Button>
              )}
            </Stack>
          )}
        </Stack>

        {/* Severity badge */}
        <Box sx={{
          px: 1, py: 0.5, borderRadius: 1, minWidth: 40, textAlign: 'center',
          bgcolor: item.severity >= 80 ? alpha(theme.palette.error.main, 0.1) : item.severity >= 50 ? alpha(theme.palette.warning.main, 0.1) : alpha('#5D87FF', 0.1),
        }}>
          <Typography fontWeight={900} fontSize="0.85rem" color={item.severity >= 80 ? 'error.main' : item.severity >= 50 ? 'warning.main' : '#5D87FF'}>
            {item.severity}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FilaDeAcaoClient() {
  const theme = useTheme();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [queueSummary, setQueueSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ items: ActionItem[]; summary: QueueSummary }>('/admin/relatorios/fila');
      setItems(res?.items ?? []);
      setQueueSummary(res?.summary ?? null);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = useCallback(async (id: string) => {
    try {
      await apiPost(`/operations/signals/${id}/resolve`, {});
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { /* ignore */ }
  }, []);

  const tabs = [
    { label: `Todos (${queueSummary?.total ?? 0})`, filter: (i: ActionItem) => true },
    { label: `Críticos (${queueSummary?.critical ?? 0})`, filter: (i: ActionItem) => i.severity >= 80 },
    { label: `Atenção (${queueSummary?.warning ?? 0})`, filter: (i: ActionItem) => i.severity >= 50 && i.severity < 80 },
    { label: `Info (${queueSummary?.info ?? 0})`, filter: (i: ActionItem) => i.severity < 50 },
  ];

  const filtered = items.filter(tabs[activeTab].filter);

  return (
    <AppShell>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
          <Stack>
            <Typography variant="h5" fontWeight={800}>Fila de Ação</Typography>
            <Typography variant="body2" color="text.secondary">
              Itens que requerem atenção — ordenados por prioridade.
            </Typography>
          </Stack>
          <Button variant="outlined" size="small" startIcon={<IconRefresh size={16} />} onClick={load} disabled={loading}>
            Atualizar
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Stack alignItems="center" py={8}><CircularProgress /></Stack>
        ) : (
          <>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
              {tabs.map((t, i) => (
                <Tab key={i} label={t.label} />
              ))}
            </Tabs>

            {filtered.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <IconCheck size={32} color={theme.palette.success.main} />
                <Typography color="text.secondary" mt={1}>
                  Nenhum item nesta categoria. Tudo certo!
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {filtered.map((item) => (
                  <ActionCard key={item.id} item={item} onResolve={handleResolve} />
                ))}
              </Stack>
            )}
          </>
        )}
      </Box>
    </AppShell>
  );
}
