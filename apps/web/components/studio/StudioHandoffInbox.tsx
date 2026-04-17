'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { IconArrowBackUp, IconCheck, IconExternalLink, IconRefresh, IconSend, IconTruckDelivery } from '@tabler/icons-react';
import { apiPost } from '@/lib/api';
import {
  loadStudioHandoffInbox,
  type StudioHandoffInboxItem,
  type StudioHandoffInboxSummary,
} from '@/app/studio/studioWorkflow';

type InboxTab = 'mine' | 'da' | 'traffic' | 'overdue';

const EMPTY_SUMMARY: StudioHandoffInboxSummary = {
  unassigned: 0,
  assigned: 0,
  accepted: 0,
  returned_for_changes: 0,
  ready_for_traffic: 0,
  exported: 0,
  sent: 0,
  overdue: 0,
};

function formatDate(value?: string | null) {
  if (!value) return 'Sem prazo';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : value;
}

export default function StudioHandoffInbox() {
  const [tab, setTab] = useState<InboxTab>('mine');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StudioHandoffInboxItem[]>([]);
  const [summary, setSummary] = useState<StudioHandoffInboxSummary>(EMPTY_SUMMARY);
  const [error, setError] = useState<string | null>(null);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const filters = useMemo(() => {
    if (tab === 'mine') return { mine: true };
    if (tab === 'da') return { role: 'da' as const };
    if (tab === 'traffic') return { role: 'traffic' as const };
    return { overdue: true };
  }, [tab]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadStudioHandoffInbox(filters);
      setItems(data.items);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar handoffs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const runAction = async (
    item: StudioHandoffInboxItem,
    action: 'accept' | 'return' | 'exported' | 'sent',
  ) => {
    const note =
      action === 'return'
        ? window.prompt('Motivo da devolução para ajustes:', '') || ''
        : '';
    if (action === 'return' && !note.trim()) return;

    setBusySessionId(item.creative_session_id);
    setError(null);
    try {
      const endpoint =
        action === 'accept'
          ? 'accept'
          : action === 'return'
          ? 'return'
          : action === 'exported'
          ? 'exported'
          : 'sent';
      await apiPost(`/creative-sessions/${item.creative_session_id}/handoff/${endpoint}`, {
        job_id: item.job_id,
        note: note || null,
      });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar handoff.');
    } finally {
      setBusySessionId(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Inbox operacional</Typography>
          <Typography variant="body2" color="text.secondary">
            Fila única para DA e tráfego operarem handoffs do Studio.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<IconRefresh size={16} />} onClick={load} disabled={loading}>
          Atualizar
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip label={`Sem dono ${summary.unassigned}`} />
        <Chip label={`Atribuídas ${summary.assigned}`} color="primary" variant="outlined" />
        <Chip label={`Aceitas ${summary.accepted}`} color="success" variant="outlined" />
        <Chip label={`Prontas tráfego ${summary.ready_for_traffic}`} color="info" variant="outlined" />
        <Chip label={`Devolvidas ${summary.returned_for_changes}`} color="warning" variant="outlined" />
        <Chip label={`Atrasadas ${summary.overdue}`} color={summary.overdue ? 'error' : 'default'} variant="outlined" />
      </Stack>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Minhas" value="mine" />
        <Tab label="DA" value="da" />
        <Tab label="Tráfego" value="traffic" />
        <Tab label="Atrasadas" value="overdue" />
      </Tabs>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Carregando handoffs...</Typography>
        </Stack>
      ) : null}

      {!loading && !items.length ? (
        <Alert severity="info">Nenhum handoff encontrado neste filtro.</Alert>
      ) : null}

      <Stack spacing={2}>
        {items.map((item) => {
          const isBusy = busySessionId === item.creative_session_id;
          return (
            <Card key={item.creative_session_id} variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {item.client_name || 'Cliente'} · {item.job_title || 'Demanda'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Prazo: {formatDate(item.deadline_at)} · Etapa: {item.current_stage || 'arte'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                      <Chip size="small" label={item.next_actor === 'da' ? 'DA' : 'Tráfego'} />
                      <Chip
                        size="small"
                        label={item.assignment_status === 'unassigned' ? 'Sem dono' : item.assignment_status.replace(/_/g, ' ')}
                        color={item.assignment_status === 'unassigned' ? 'warning' : 'default'}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={item.handoff_status.replace(/_/g, ' ')}
                        color={item.handoff_status === 'ready_for_traffic' ? 'info' : item.handoff_status === 'accepted' ? 'success' : 'default'}
                        variant="outlined"
                      />
                      {item.overdue ? <Chip size="small" label="Atrasado" color="error" /> : null}
                    </Stack>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    Dono: {item.assigned_name || 'não atribuído'}{item.assignment_reason ? ` · ${item.assignment_reason}` : ''}
                  </Typography>
                  {item.copy_preview ? (
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>
                      {item.copy_preview}
                    </Typography>
                  ) : null}

                  <Divider />

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<IconCheck size={14} />}
                      disabled={isBusy || item.handoff_status === 'accepted' || item.handoff_status === 'sent'}
                      onClick={() => runAction(item, 'accept')}
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<IconArrowBackUp size={14} />}
                      disabled={isBusy || item.handoff_status === 'sent'}
                      onClick={() => runAction(item, 'return')}
                    >
                      Devolver
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<IconTruckDelivery size={14} />}
                      disabled={isBusy || item.next_actor !== 'traffic' || item.handoff_status === 'exported' || item.handoff_status === 'sent'}
                      onClick={() => runAction(item, 'exported')}
                    >
                      Exportado
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<IconSend size={14} />}
                      disabled={isBusy || item.next_actor !== 'traffic' || item.handoff_status === 'sent'}
                      onClick={() => runAction(item, 'sent')}
                    >
                      Enviado
                    </Button>
                    <Button
                      size="small"
                      component={Link}
                      href={item.studio_url}
                      startIcon={<IconExternalLink size={14} />}
                    >
                      Abrir Studio
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
