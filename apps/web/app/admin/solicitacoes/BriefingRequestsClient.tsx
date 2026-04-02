'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import AppShell from '@/components/AppShell';
import {
  IconCheck, IconX, IconBriefcase, IconRobot,
  IconCalendar, IconChevronDown, IconBrandTrello,
  IconAlertTriangle, IconBulb, IconPencil, IconUser,
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
  auto_pipeline_output?: {
    concept?: { angles?: string[]; strategy?: string };
    draft_copy?: { hook?: string; body?: string; cta?: string };
    pre_call_brief?: string;
    learning_highlights?: string[];
    risk_flags?: string[];
    trello_card_url?: string;
    internal_board_id?: string;
    local_card_id?: string;
    internal_url?: string;
    whatsapp_sent?: boolean;
    pipeline_ran_at?: string;
  };
  trello_card_id?: string;
  pipeline_ran_at?: string;
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

const STATUS_MAP: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  pending:   { label: 'Rascunho', color: 'default' },
  enriching: { label: 'Analisando', color: 'info' },
  submitted: { label: 'Aguardando', color: 'warning' },
  accepted:  { label: 'Aceita', color: 'success' },
  declined:  { label: 'Recusada', color: 'error' },
  converted: { label: 'Convertida', color: 'success' },
};

export default function BriefingRequestsClient() {
  const router = useRouter();
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
      const res = await apiPatch<{ ok: boolean; status: string; internal_url?: string | null }>(
        `/admin/briefing-requests/${selected.id}`,
        { action: actionType, agency_notes: notes.trim() || undefined },
      );
      setSelected(null); setActionType(null); setNotes('');
      if (actionType === 'accept' && res?.internal_url) {
        router.push(res.internal_url);
        return;
      }
      load();
    } catch (e: any) {
      setError(e.message ?? 'Erro ao processar solicitação.');
    } finally { setSaving(false); }
  };

  const openAction = (req: BriefingRequest, action: 'accept' | 'decline') => {
    setSelected(req); setActionType(action); setNotes('');
  };

  return (
    <AppShell
      title="Solicitações de Job"
      meta="Pedidos enviados pelos clientes via portal"
    >
      {error && (
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      )}

      {/* Tabs */}
      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)}>
            {STATUS_TABS.map(t => <Tab key={t.value} label={t.label} />)}
          </Tabs>
        </Box>

        {loading ? (
          <Stack alignItems="center" py={8}>
            <CircularProgress size={28} />
          </Stack>
        ) : requests.length === 0 ? (
          <Stack alignItems="center" py={8} spacing={1.5}>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 3, display: 'flex' }}>
              <IconBriefcase size={28} opacity={0.4} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Nenhuma solicitação{statusFilter !== 'all' ? ` ${STATUS_TABS[tabIdx].label.toLowerCase()}` : ''} no momento.
            </Typography>
          </Stack>
        ) : (
          <Stack divider={<Divider />}>
            {requests.map(req => {
              const s = STATUS_MAP[req.status] ?? { label: req.status, color: 'default' as const };
              return (
                <Box key={req.id} sx={{ px: 3, py: 2.5 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Title row */}
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {req.ai_enriched?.suggested_title ?? req.form_data.type ?? 'Solicitação'}
                        </Typography>
                        <Chip label={s.label} size="small" color={s.color} />
                        {req.ai_enriched?.urgency && (
                          <Chip
                            label={URGENCY_LABELS[req.ai_enriched.urgency] ?? req.ai_enriched.urgency}
                            size="small"
                            color={URGENCY_COLORS[req.ai_enriched.urgency] ?? 'default'}
                            variant="outlined"
                          />
                        )}
                        {req.ai_enriched?.estimated_complexity && (
                          <Chip
                            label={COMPLEXITY_LABELS[req.ai_enriched.estimated_complexity] ?? req.ai_enriched.estimated_complexity}
                            size="small" variant="outlined"
                          />
                        )}
                      </Stack>

                      {/* Meta row */}
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconUser size={13} opacity={0.5} />
                          <Typography variant="caption" color="text.secondary">
                            {req.client_name}
                            {req.contact_name ? ` · ${req.contact_name}` : ''}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconCalendar size={13} opacity={0.5} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(req.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </Typography>
                        </Stack>
                      </Stack>

                      {/* Objective */}
                      {req.form_data.objective && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          {req.form_data.objective}
                        </Typography>
                      )}

                      {/* Tags */}
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: req.form_data.notes ? 1 : 0 }}>
                        {req.form_data.platform && <Chip label={req.form_data.platform} size="small" variant="outlined" />}
                        {req.form_data.deadline && (
                          <Chip label={`Prazo: ${req.form_data.deadline}`} size="small" variant="outlined" />
                        )}
                        {req.form_data.budget_range && (
                          <Chip label={`Orçamento: ${req.form_data.budget_range}`} size="small" variant="outlined" />
                        )}
                      </Stack>

                      {/* Jarvis analysis */}
                      <JarvisPanel req={req} />

                      {/* Agency notes */}
                      {req.agency_notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                          <strong>Nota:</strong> {req.agency_notes}
                        </Typography>
                      )}
                    </Box>

                    {/* Actions */}
                    {req.status === 'submitted' && (
                      <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1} sx={{ flexShrink: 0 }}>
                        <Button
                          variant="contained" color="success" size="small"
                          startIcon={<IconCheck size={14} />}
                          onClick={() => openAction(req, 'accept')}
                        >
                          Aceitar
                        </Button>
                        <Button
                          variant="outlined" color="error" size="small"
                          startIcon={<IconX size={14} />}
                          onClick={() => openAction(req, 'decline')}
                        >
                          Recusar
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Card>

      {/* Action dialog */}
      <Dialog
        open={!!selected && !!actionType}
        onClose={() => { setSelected(null); setActionType(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>
          {actionType === 'accept' ? 'Aceitar solicitação' : 'Recusar solicitação'}
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setSelected(null); setActionType(null); }} color="inherit" disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleAction}
            variant="contained"
            color={actionType === 'accept' ? 'success' : 'error'}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {actionType === 'accept' ? 'Confirmar aceite' : 'Confirmar recusa'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}

function JarvisPanel({ req }: { req: BriefingRequest }) {
  const p = req.auto_pipeline_output;
  const internalUrl = p?.internal_url ?? null;

  if (!p && !req.ai_enriched) return null;

  if (!p) {
    return (
      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
          <IconRobot size={13} />
          <Typography variant="caption" fontWeight={700} color="primary.main">Análise Jarvis</Typography>
        </Stack>
        {req.ai_enriched?.key_deliverables?.length ? (
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>Entregas:</strong> {req.ai_enriched.key_deliverables.join(' · ')}
          </Typography>
        ) : null}
        {req.ai_enriched?.internal_notes && (
          <Typography variant="caption" color="text.secondary" display="block">
            {req.ai_enriched.internal_notes}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Accordion
      disableGutters elevation={0}
      sx={{
        mt: 1.5,
        border: '1px solid',
        borderColor: 'primary.light',
        borderRadius: '8px !important',
        bgcolor: 'rgba(93,135,255,0.03)',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<IconChevronDown size={16} />} sx={{ minHeight: 40, py: 0, px: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <IconRobot size={14} />
          <Typography variant="caption" fontWeight={700} color="primary.main">
            Jarvis processou este briefing
          </Typography>
          {p.risk_flags?.length ? (
            <Chip
              label={`${p.risk_flags.length} risco${p.risk_flags.length > 1 ? 's' : ''}`}
              size="small" color="warning" variant="outlined"
              icon={<IconAlertTriangle size={11} />}
              sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.6rem' } }}
            />
          ) : null}
          {internalUrl ? (
            <Chip label="Quadro interno" size="small" color="info" variant="outlined"
              icon={<IconBrandTrello size={11} />}
              sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.6rem' } }}
            />
          ) : p.trello_card_url ? (
            <Chip label="Trello sync" size="small" color="default" variant="outlined"
              icon={<IconBrandTrello size={11} />}
              sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.6rem' } }}
            />
          ) : null}
          {p.whatsapp_sent && (
            <Chip label="WhatsApp ✓" size="small" color="success" variant="outlined"
              sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.6rem' } }} />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pb: 1.5, pt: 0 }}>
        <Divider sx={{ mb: 1.5 }} />
        <Stack spacing={1.5}>
          {p.risk_flags?.length ? (
            <Box sx={{ p: 1.25, bgcolor: 'warning.light', borderRadius: 1.5 }}>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                <IconAlertTriangle size={13} />
                <Typography variant="caption" fontWeight={700} color="warning.dark">Riscos detectados</Typography>
              </Stack>
              {p.risk_flags.map((r, i) => (
                <Typography key={i} variant="caption" color="warning.dark" display="block">• {r}</Typography>
              ))}
            </Box>
          ) : null}

          {p.concept?.angles?.length ? (
            <Box>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
                <IconBulb size={13} />
                <Typography variant="caption" fontWeight={700}>Ângulos criativos</Typography>
              </Stack>
              <Stack spacing={0.25}>
                {p.concept.angles.map((a, i) => (
                  <Typography key={i} variant="caption" color="text.secondary">{i + 1}. {a}</Typography>
                ))}
              </Stack>
              {p.concept.strategy && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                  Estratégia: {p.concept.strategy}
                </Typography>
              )}
            </Box>
          ) : null}

          {p.draft_copy?.hook && (
            <Box sx={{ p: 1.25, bgcolor: 'action.hover', borderRadius: 1.5 }}>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
                <IconPencil size={13} />
                <Typography variant="caption" fontWeight={700}>Draft de copy (Jarvis)</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block"><strong>Hook:</strong> {p.draft_copy.hook}</Typography>
              {p.draft_copy.body && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}><strong>Body:</strong> {p.draft_copy.body}</Typography>}
              {p.draft_copy.cta && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}><strong>CTA:</strong> {p.draft_copy.cta}</Typography>}
            </Box>
          )}

          {p.pre_call_brief && (
            <Box>
              <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                Pauta do call de alinhamento
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {p.pre_call_brief}
              </Typography>
            </Box>
          )}

          {p.learning_highlights?.length ? (
            <Box>
              <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                Memória do cliente
              </Typography>
              {p.learning_highlights.map((h, i) => (
                <Typography key={i} variant="caption" color="text.secondary" display="block">• {h}</Typography>
              ))}
            </Box>
          ) : null}

          {internalUrl && (
            <Box>
              <Button
                variant="outlined" size="small" color="info"
                startIcon={<IconBrandTrello size={14} />}
                href={internalUrl}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Abrir no quadro interno
              </Button>
            </Box>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
