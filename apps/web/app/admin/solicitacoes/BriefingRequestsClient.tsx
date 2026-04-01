'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';
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
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AppShell from '@/components/AppShell';
import {
  IconCheck, IconX, IconBriefcase, IconRobot,
  IconCalendar, IconUser,
} from '@tabler/icons-react';

type BriefingRequest = {
  id: string;
  status: 'pending' | 'enriching' | 'submitted' | 'accepted' | 'declined' | 'converted';
  form_data: {
    type?: string; platform?: string; objective?: string;
    deadline?: string; budget_range?: string; notes?: string;
  };
  ai_enriched?: {
    suggested_title?: string; job_type?: string; urgency?: string;
    key_deliverables?: string[]; suggested_platforms?: string[];
    estimated_complexity?: string; internal_notes?: string;
  };
  agency_notes?: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_id: string;
  contact_name?: string;
  contact_email?: string;
  contact_role?: string;
};

const STATUS_TABS = [
  { label: 'Pendentes', value: 'submitted' },
  { label: 'Aceitas', value: 'accepted' },
  { label: 'Recusadas', value: 'declined' },
  { label: 'Todas', value: 'all' },
];

const URGENCY_COLORS: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default', medium: 'info', high: 'warning', urgent: 'error',
};
const URGENCY_LABELS: Record<string, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
};
const COMPLEXITY_LABELS: Record<string, string> = {
  small: 'Pequeno', medium: 'Médio', large: 'Grande',
};

export default function BriefingRequestsClient() {
  const [tabIdx, setTabIdx] = useState(0);
  const [requests, setRequests] = useState<BriefingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BriefingRequest | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'decline' | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const statusFilter = STATUS_TABS[tabIdx].value;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ requests: BriefingRequest[] }>(
        `/admin/briefing-requests?status=${statusFilter}&limit=100`,
      );
      setRequests(res?.requests ?? []);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!selected || !actionType) return;
    setSaving(true); setError('');
    try {
      await apiPatch(`/admin/briefing-requests/${selected.id}`, {
        action: actionType,
        agency_notes: notes.trim() || undefined,
      });
      setSelected(null); setActionType(null); setNotes('');
      load();
    } catch (e: any) {
      setError(e.message ?? 'Erro ao processar solicitação.');
    } finally { setSaving(false); }
  };

  const openAction = (req: BriefingRequest, action: 'accept' | 'decline') => {
    setSelected(req); setActionType(action); setNotes('');
  };

  return (
    <AppShell title="Solicitações de Job">
      <Box sx={{ maxWidth: 900, mx: 'auto', py: 3, px: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: 1.5 }}>
            <IconBriefcase size={20} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Solicitações de Job</Typography>
            <Typography variant="body2" color="text.secondary">
              Pedidos enviados pelos clientes via portal. Aceite para criar o briefing.
            </Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          {STATUS_TABS.map(t => <Tab key={t.value} label={t.label} />)}
        </Tabs>

        {loading ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : requests.length === 0 ? (
          <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <IconBriefcase size={40} color="#ccc" />
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                Nenhuma solicitação {statusFilter !== 'all' ? `com status "${STATUS_TABS[tabIdx].label.toLowerCase()}"` : ''}.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {requests.map(req => (
              <Card key={req.id} variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Header */}
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {req.ai_enriched?.suggested_title ?? req.form_data.type ?? 'Solicitação'}
                        </Typography>
                        {req.ai_enriched?.urgency && (
                          <Chip
                            label={URGENCY_LABELS[req.ai_enriched.urgency] ?? req.ai_enriched.urgency}
                            size="small"
                            color={URGENCY_COLORS[req.ai_enriched.urgency] ?? 'default'}
                          />
                        )}
                        {req.ai_enriched?.estimated_complexity && (
                          <Chip
                            label={COMPLEXITY_LABELS[req.ai_enriched.estimated_complexity] ?? req.ai_enriched.estimated_complexity}
                            size="small" variant="outlined"
                          />
                        )}
                        <StatusChip status={req.status} />
                      </Stack>

                      {/* Client + contact */}
                      <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Cliente:</strong> {req.client_name}
                        </Typography>
                        {req.contact_email && (
                          <Typography variant="caption" color="text.secondary">
                            <strong>Por:</strong> {req.contact_name ?? req.contact_email}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          <IconCalendar size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                          {new Date(req.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </Typography>
                      </Stack>

                      {/* Objective */}
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {req.form_data.objective}
                      </Typography>

                      {/* Platform / deadline / budget */}
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {req.form_data.platform && <Chip label={req.form_data.platform} size="small" variant="outlined" />}
                        {req.form_data.deadline && (
                          <Chip label={`Prazo: ${req.form_data.deadline}`} size="small" variant="outlined" />
                        )}
                        {req.form_data.budget_range && (
                          <Chip label={`Orçamento: ${req.form_data.budget_range}`} size="small" variant="outlined" />
                        )}
                      </Stack>

                      {/* AI insights */}
                      {req.ai_enriched && (
                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                            <IconRobot size={13} />
                            <Typography variant="caption" fontWeight={700} color="primary.main">Análise Jarvis</Typography>
                          </Stack>
                          {req.ai_enriched.key_deliverables?.length ? (
                            <Typography variant="caption" color="text.secondary" display="block">
                              <strong>Entregas:</strong> {req.ai_enriched.key_deliverables.join(' · ')}
                            </Typography>
                          ) : null}
                          {req.ai_enriched.internal_notes && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {req.ai_enriched.internal_notes}
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* Agency notes (accepted/declined) */}
                      {req.agency_notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          <strong>Nota:</strong> {req.agency_notes}
                        </Typography>
                      )}
                    </Box>

                    {/* Actions */}
                    {req.status === 'submitted' && (
                      <Stack spacing={1} sx={{ flexShrink: 0, justifyContent: 'flex-start', pt: 0.5 }}>
                        <Button
                          variant="contained" color="success" size="small"
                          startIcon={<IconCheck size={15} />}
                          onClick={() => openAction(req, 'accept')}
                        >
                          Aceitar
                        </Button>
                        <Button
                          variant="outlined" color="error" size="small"
                          startIcon={<IconX size={15} />}
                          onClick={() => openAction(req, 'decline')}
                        >
                          Recusar
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Action dialog */}
      <Dialog open={!!selected && !!actionType} onClose={() => { setSelected(null); setActionType(null); }} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>
          {actionType === 'accept' ? '✓ Aceitar solicitação' : '✕ Recusar solicitação'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {actionType === 'accept'
              ? 'O cliente será notificado que a solicitação foi recebida e está em produção.'
              : 'O cliente será notificado. Adicione uma explicação abaixo (opcional).'}
          </Typography>
          <TextField
            label={actionType === 'accept' ? 'Nota interna (opcional)' : 'Motivo para o cliente (opcional)'}
            fullWidth multiline rows={3} size="small"
            value={notes} onChange={e => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSelected(null); setActionType(null); }} color="inherit">Cancelar</Button>
          <Button
            onClick={handleAction}
            variant="contained"
            color={actionType === 'accept' ? 'success' : 'error'}
            disabled={saving}
          >
            {saving ? <CircularProgress size={16} color="inherit" /> : actionType === 'accept' ? 'Confirmar aceite' : 'Confirmar recusa'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}

function StatusChip({ status }: { status: BriefingRequest['status'] }) {
  const map: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
    pending:   { label: 'Rascunho', color: 'default' },
    enriching: { label: 'Analisando', color: 'info' },
    submitted: { label: 'Aguardando', color: 'warning' },
    accepted:  { label: 'Aceita', color: 'success' },
    declined:  { label: 'Recusada', color: 'error' },
    converted: { label: 'Convertida', color: 'success' },
  };
  const s = map[status] ?? { label: status, color: 'default' };
  return <Chip label={s.label} size="small" color={s.color} />;
}
