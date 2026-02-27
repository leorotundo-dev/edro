'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconEyeOff,
  IconPlus,
  IconTrash,
  IconX,
  IconBrandWhatsapp,
  IconBrandSlack,
  IconMail,
  IconBrandLinkedin,
  IconBrandInstagram,
  IconUsersGroup,
  IconUser,
  IconQuestionMark,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type DarkFunnelEvent = {
  id: string;
  source_type: 'form_field' | 'sales_call_note' | 'crm_custom_field' | 'email_reply';
  raw_text: string;
  parsed_channel: string | null;
  confidence_score: number | null;
  related_content_ids: string[];
  journey_stage: 'first_touch_dark' | 'middle_touch_dark' | 'last_touch_dark' | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

type Stats = {
  channels: Array<{ channel: string; count: number }>;
  stages: Array<{ stage: string; count: number }>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_TYPE_LABELS: Record<string, string> = {
  form_field: 'Formulário',
  sales_call_note: 'Chamada Comercial',
  crm_custom_field: 'CRM',
  email_reply: 'Resposta de E-mail',
};

const CHANNEL_CONFIG: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'secondary' | 'default'; icon: React.ReactNode }> = {
  whatsapp:      { label: 'WhatsApp',       color: 'success',   icon: <IconBrandWhatsapp size={12} /> },
  slack:         { label: 'Slack',          color: 'warning',   icon: <IconBrandSlack size={12} /> },
  teams:         { label: 'Teams',          color: 'info',      icon: <IconUsersGroup size={12} /> },
  email_forward: { label: 'E-mail Forward', color: 'secondary', icon: <IconMail size={12} /> },
  linkedin:      { label: 'LinkedIn',       color: 'info',      icon: <IconBrandLinkedin size={12} /> },
  instagram:     { label: 'Instagram',      color: 'error',     icon: <IconBrandInstagram size={12} /> },
  unknown_group: { label: 'Grupo',          color: 'warning',   icon: <IconUsersGroup size={12} /> },
  direct:        { label: 'Indicação',      color: 'success',   icon: <IconUser size={12} /> },
  other:         { label: 'Outro',          color: 'default',   icon: <IconQuestionMark size={12} /> },
};

const STAGE_CONFIG: Record<string, { label: string; color: 'info' | 'warning' | 'error' }> = {
  first_touch_dark:  { label: 'Primeiro Contato', color: 'info' },
  middle_touch_dark: { label: 'Consideração',     color: 'warning' },
  last_touch_dark:   { label: 'Pré-Conversão',    color: 'error' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DarkFunnelPage() {
  const params = useParams();
  const clientId = params?.id as string;

  const [events, setEvents] = useState<DarkFunnelEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [channelFilter, setChannelFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    source_type: 'sales_call_note',
    raw_text: '',
    notes: '',
    recorded_by: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, statsRes] = await Promise.all([
        apiGet<{ data: DarkFunnelEvent[]; total: number }>(
          `/dark-funnel?client_id=${clientId}${channelFilter ? `&channel=${channelFilter}` : ''}&limit=50`
        ),
        apiGet<Stats>(`/dark-funnel/stats?client_id=${clientId}`),
      ]);
      setEvents(eventsRes.data ?? []);
      setTotal(eventsRes.total ?? 0);
      setStats(statsRes);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [clientId, channelFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!form.raw_text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost('/dark-funnel', {
        client_id: clientId,
        source_type: form.source_type,
        raw_text: form.raw_text,
        notes: form.notes || null,
        recorded_by: form.recorded_by || null,
      });
      setDialogOpen(false);
      setForm({ source_type: 'sales_call_note', raw_text: '', notes: '', recorded_by: '' });
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiDelete(`/dark-funnel/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao deletar');
    } finally {
      setDeletingId(null);
    }
  };

  const topChannel = stats?.channels?.[0];

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconEyeOff size={20} />
            <Typography variant="h5">Dark Funnel</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Sinais de atribuição invisíveis — leads que chegaram por grupos privados, indicações e compartilhamentos off-platform.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<IconPlus size={14} />}
          onClick={() => setDialogOpen(true)}
        >
          Registrar sinal
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* Stats cards */}
      {stats && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">Total de sinais</Typography>
                <Typography variant="h4">{total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">Canal mais frequente</Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>
                  {topChannel
                    ? `${CHANNEL_CONFIG[topChannel.channel]?.label ?? topChannel.channel} (${topChannel.count})`
                    : '—'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">Distribuição de canais</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {stats.channels.slice(0, 4).map((c) => {
                    const cfg = CHANNEL_CONFIG[c.channel];
                    return (
                      <Chip
                        key={c.channel}
                        size="small"
                        label={`${cfg?.label ?? c.channel} · ${c.count}`}
                        color={cfg?.color ?? 'default'}
                        variant="outlined"
                        onClick={() => setChannelFilter(channelFilter === c.channel ? '' : c.channel)}
                        sx={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter bar */}
      {channelFilter && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Filtro:</Typography>
          <Chip
            size="small"
            label={CHANNEL_CONFIG[channelFilter]?.label ?? channelFilter}
            onDelete={() => setChannelFilter('')}
          />
        </Stack>
      )}

      {/* Events list */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : events.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <IconEyeOff size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <Typography variant="body1" color="text.secondary">
              Nenhum sinal dark funnel registrado ainda.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Registre quando um lead mencionar WhatsApp, Slack, indicações ou outros canais não rastreáveis.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 2 }}
              startIcon={<IconPlus size={14} />}
              onClick={() => setDialogOpen(true)}
            >
              Registrar primeiro sinal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {events.map((event) => {
            const channelCfg = event.parsed_channel ? CHANNEL_CONFIG[event.parsed_channel] : null;
            const stageCfg = event.journey_stage ? STAGE_CONFIG[event.journey_stage] : null;
            return (
              <Card key={event.id} variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Chips row */}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={SOURCE_TYPE_LABELS[event.source_type] ?? event.source_type}
                        />
                        {channelCfg && (
                          <Chip
                            size="small"
                            color={channelCfg.color}
                            icon={channelCfg.icon as any}
                            label={channelCfg.label}
                          />
                        )}
                        {stageCfg && (
                          <Chip
                            size="small"
                            color={stageCfg.color}
                            variant="outlined"
                            label={stageCfg.label}
                          />
                        )}
                        {event.confidence_score !== null && event.confidence_score < 0.75 && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`confiança ${Math.round((event.confidence_score ?? 0) * 100)}%`}
                            color="warning"
                          />
                        )}
                      </Stack>

                      {/* Raw text */}
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        &quot;{event.raw_text}&quot;
                      </Typography>

                      {/* Notes */}
                      {event.notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Nota: {event.notes}
                        </Typography>
                      )}

                      {/* Meta */}
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                        {event.recorded_by ? `por ${event.recorded_by} · ` : ''}
                        {new Date(event.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </Typography>
                    </Box>

                    <Tooltip title="Remover sinal">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(event.id)}
                        disabled={deletingId === event.id}
                      >
                        {deletingId === event.id
                          ? <CircularProgress size={14} />
                          : <IconTrash size={14} />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Add event dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Registrar sinal dark funnel</Typography>
            <IconButton onClick={() => setDialogOpen(false)} size="small">
              <IconX size={18} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Fonte do sinal"
              value={form.source_type}
              onChange={(e) => setForm({ ...form, source_type: e.target.value })}
            >
              {Object.entries(SOURCE_TYPE_LABELS).map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={3}
              size="small"
              label="Texto bruto *"
              placeholder='Ex: "Vi num grupo de WhatsApp do meu setor e me mandaram"'
              value={form.raw_text}
              onChange={(e) => setForm({ ...form, raw_text: e.target.value })}
              helperText="Transcreva exatamente o que o lead disse. O sistema identifica o canal automaticamente."
            />

            <Divider>
              <Typography variant="caption" color="text.secondary">Opcionais</Typography>
            </Divider>

            <TextField
              fullWidth
              size="small"
              label="Notas internas"
              placeholder="Contexto adicional, momento da jornada, observações"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <TextField
              fullWidth
              size="small"
              label="Registrado por"
              placeholder="Nome do SDR, AE ou CS"
              value={form.recorded_by}
              onChange={(e) => setForm({ ...form, recorded_by: e.target.value })}
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.raw_text.trim()}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {saving ? 'Salvando...' : 'Registrar sinal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
