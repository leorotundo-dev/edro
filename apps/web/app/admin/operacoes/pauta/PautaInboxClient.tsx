'use client';

import { useCallback, useEffect, useState } from 'react';
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
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconBulb,
  IconCheck,
  IconFilter,
  IconInbox,
  IconLayoutColumns,
  IconPlus,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import { apiGet, apiPost } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type Approach = {
  title?: string;
  angle?: string;
  message?: string;
  objective?: string;
  tone?: string;
  platforms?: string[];
  format?: string;
  hook?: string;
  call_to_action?: string;
};

type PautaSuggestion = {
  id: string;
  client_id: string;
  client_name: string;
  client_segment?: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  approach_a: Approach;
  approach_b: Approach;
  source_type?: string;
  source_domain?: string;
  ai_score?: number;
  topic_category?: string;
  suggested_deadline?: string;
  platforms?: string[];
  generated_at: string;
};

type ClientOption = { id: string; name: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFAE1F',
  approved: '#13DEB9',
  rejected: '#FA896B',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
  catch { return null; }
}

function scoreColor(score?: number | null) {
  if (!score) return '#ccc';
  if (score >= 80) return '#13DEB9';
  if (score >= 60) return '#FFAE1F';
  return '#FA896B';
}

// ─── ApproachCard ─────────────────────────────────────────────────────────────

function ApproachCard({
  approach,
  label,
  accent,
  onApprove,
  saving,
  disabled,
}: {
  approach: Approach;
  label: 'A' | 'B';
  accent: string;
  onApprove: () => void;
  saving: boolean;
  disabled: boolean;
}) {
  return (
    <Card variant="outlined" sx={{ flex: 1, borderColor: alpha(accent, 0.4), position: 'relative' }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <Box
            sx={{
              width: 26, height: 26, borderRadius: '50%',
              bgcolor: alpha(accent, 0.15), color: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '0.75rem',
            }}
          >
            {label}
          </Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
            {approach.title || `Abordagem ${label}`}
          </Typography>
        </Stack>

        {approach.angle && (
          <Typography variant="body2" color="text.secondary" mb={1}>
            <strong>Ângulo:</strong> {approach.angle}
          </Typography>
        )}
        {approach.message && (
          <Typography variant="body2" color="text.secondary" mb={1}>
            {approach.message}
          </Typography>
        )}
        {approach.hook && (
          <Typography variant="body2" color="text.secondary" mb={1}>
            <strong>Hook:</strong> {approach.hook}
          </Typography>
        )}
        {approach.objective && (
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>
            Objetivo: {approach.objective}
          </Typography>
        )}
        {approach.tone && (
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>
            Tom: {approach.tone}
          </Typography>
        )}
        {approach.call_to_action && (
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>
            CTA: {approach.call_to_action}
          </Typography>
        )}
        {approach.platforms && approach.platforms.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mt={1}>
            {approach.platforms.map((p) => (
              <Chip key={p} label={p} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
            ))}
          </Stack>
        )}

        <Box mt={2}>
          <Button
            fullWidth
            variant="contained"
            size="small"
            disabled={saving || disabled}
            onClick={onApprove}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconCheck size={14} />}
            sx={{ bgcolor: accent, '&:hover': { bgcolor: alpha(accent, 0.85) }, fontWeight: 700 }}
          >
            Aprovar {label}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── SuggestionRow ───────────────────────────────────────────────────────────

function SuggestionRow({
  s,
  onApprove,
  onReject,
}: {
  s: PautaSuggestion;
  onApprove: (id: string, approach: 'A' | 'B') => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState<'A' | 'B' | 'reject' | null>(null);

  const handleApprove = async (approach: 'A' | 'B') => {
    setSaving(approach);
    try { await onApprove(s.id, approach); } finally { setSaving(null); }
  };
  const handleReject = async () => {
    setSaving('reject');
    try { await onReject(s.id); } finally { setSaving(null); }
  };

  const isPending = s.status === 'pending';
  const deadline = fmtDate(s.suggested_deadline);

  return (
    <Card variant="outlined" sx={{ mb: 2, opacity: isPending ? 1 : 0.7 }}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" spacing={1} mb={1.5} flexWrap="wrap" useFlexGap>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap mb={0.5}>
              <Chip
                size="small"
                label={STATUS_LABELS[s.status] || s.status}
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  bgcolor: alpha(STATUS_COLORS[s.status] || '#ccc', 0.12),
                  color: STATUS_COLORS[s.status] || '#ccc',
                }}
              />
              <Typography variant="caption" color="text.disabled" fontWeight={700}>
                {s.client_name}
              </Typography>
              {s.topic_category && (
                <Chip size="small" label={s.topic_category} sx={{ height: 18, fontSize: '0.58rem' }} />
              )}
              {typeof s.ai_score === 'number' && (
                <Chip
                  size="small"
                  label={`Score ${s.ai_score}`}
                  sx={{ height: 18, fontSize: '0.58rem', color: scoreColor(s.ai_score), bgcolor: alpha(scoreColor(s.ai_score), 0.1) }}
                />
              )}
              {deadline && (
                <Typography variant="caption" color="text.disabled">
                  Prazo sugerido: {deadline}
                </Typography>
              )}
            </Stack>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.3 }}>
              {s.title}
            </Typography>
            {s.source_domain && (
              <Typography variant="caption" color="text.disabled">
                Fonte: {s.source_domain}
              </Typography>
            )}
          </Box>

          {isPending && (
            <Tooltip title="Rejeitar sem escolher abordagem">
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={saving !== null}
                onClick={handleReject}
                startIcon={saving === 'reject' ? <CircularProgress size={12} color="inherit" /> : <IconX size={14} />}
                sx={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
              >
                Rejeitar
              </Button>
            </Tooltip>
          )}
        </Stack>

        {/* Approaches */}
        {isPending && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <ApproachCard
              approach={s.approach_a}
              label="A"
              accent="#5D87FF"
              onApprove={() => handleApprove('A')}
              saving={saving === 'A'}
              disabled={saving !== null}
            />
            <ApproachCard
              approach={s.approach_b}
              label="B"
              accent="#13DEB9"
              onApprove={() => handleApprove('B')}
              saving={saving === 'B'}
              disabled={saving !== null}
            />
          </Stack>
        )}

        {!isPending && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <Box sx={{ flex: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Abordagem A</Typography>
              <Typography variant="body2" mt={0.5}>{s.approach_a?.title || '—'}</Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Abordagem B</Typography>
              <Typography variant="body2" mt={0.5}>{s.approach_b?.title || '—'}</Typography>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PautaInboxClient() {
  const [items, setItems] = useState<PautaSuggestion[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // Manual generation dialog
  const [genOpen, setGenOpen] = useState(false);
  const [genClient, setGenClient] = useState('');
  const [genTitle, setGenTitle] = useState('');
  const [genText, setGenText] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genSuccess, setGenSuccess] = useState(false);

  // All clients for the "generate pauta" dropdown (pulled once on mount)
  const [allClients, setAllClients] = useState<ClientOption[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: filterStatus });
      if (filterClient) params.set('client_id', filterClient);
      const res = await apiGet<{ items: PautaSuggestion[] }>(`/pauta-inbox?${params}`);
      setItems(res.items || []);

      // Build client dropdown from results
      const map: Record<string, string> = {};
      for (const it of res.items || []) {
        if (it.client_id && it.client_name) map[it.client_id] = it.client_name;
      }
      setClients(Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar pauta inbox');
    } finally {
      setLoading(false);
    }
  }, [filterClient, filterStatus]);

  useEffect(() => { void load(); }, [load]);

  // Load full client list once (for "Gerar Pauta" dialog)
  useEffect(() => {
    apiGet<Array<{ id: string; name: string }>>('/clients')
      .then((r) => {
        const list = Array.isArray(r) ? r : [];
        setAllClients(list.map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {});
  }, []);

  const handleApprove = async (id: string, approach: 'A' | 'B') => {
    await apiPost(`/pauta-inbox/${id}/approve`, { approach });
    await load();
  };

  const handleReject = async (id: string) => {
    await apiPost(`/pauta-inbox/${id}/reject`, {});
    await load();
  };

  const handleGenerate = async () => {
    if (!genClient || !genTitle.trim()) return;
    setGenLoading(true);
    setGenSuccess(false);
    try {
      await apiPost('/pauta-inbox/generate', {
        client_id: genClient,
        title: genTitle.trim(),
        source_type: 'manual',
        source_text: genText.trim() || undefined,
      });
      setGenSuccess(true);
      setGenTitle('');
      setGenText('');
      setTimeout(() => { setGenOpen(false); setGenSuccess(false); void load(); }, 1500);
    } catch {
      // keep dialog open on error
    } finally {
      setGenLoading(false);
    }
  };

  const pending = items.filter((i) => i.status === 'pending').length;

  return (
    <OperationsShell section="pauta">
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1.5} mb={3} flexWrap="wrap" useFlexGap>
          <IconInbox size={28} color="#5D87FF" />
          <Typography variant="h5" fontWeight={800}>Pauta Inbox</Typography>
          {pending > 0 && (
            <Chip label={`${pending} pendente${pending > 1 ? 's' : ''}`} color="warning" size="small" sx={{ fontWeight: 700 }} />
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<IconPlus size={16} />}
            variant="contained"
            onClick={() => setGenOpen(true)}
          >
            Gerar pauta
          </Button>
          <Button size="small" startIcon={<IconRefresh size={16} />} variant="outlined" onClick={load} disabled={loading}>
            Atualizar
          </Button>
        </Stack>

        {/* Filters */}
        <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap" useFlexGap alignItems="center">
          <IconFilter size={16} color="#888" />
          <TextField
            select
            size="small"
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="pending">Pendentes</MenuItem>
            <MenuItem value="approved">Aprovadas</MenuItem>
            <MenuItem value="rejected">Rejeitadas</MenuItem>
            <MenuItem value="all">Todos</MenuItem>
          </TextField>

          {clients.length > 0 && (
            <TextField
              select
              size="small"
              label="Cliente"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Todos os clientes</MenuItem>
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          )}
        </Stack>

        {/* Content */}
        {loading && (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {!loading && !error && items.length === 0 && (
          <Stack alignItems="center" py={8} spacing={1.5}>
            <IconLayoutColumns size={48} color="#ccc" />
            <Typography color="text.secondary" fontWeight={600}>
              {filterStatus === 'pending' ? 'Nenhuma pauta pendente no momento.' : 'Nenhuma pauta encontrada.'}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              As pautas são geradas automaticamente pelo Motor de Conteúdo a partir do clipping e social listening.
            </Typography>
          </Stack>
        )}

        {!loading && items.length > 0 && (
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <IconBulb size={16} color="#FFAE1F" />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {items.length} sugestão{items.length !== 1 ? 'ões' : ''} · cada card mostra duas abordagens para escolher
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2.5 }} />
            {items.map((s) => (
              <SuggestionRow
                key={s.id}
                s={s}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </Box>
        )}
      </Box>
      {/* ── Manual generation dialog ────────────────────────────────────── */}
      <Dialog open={genOpen} onClose={() => setGenOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={800} sx={{ pb: 1 }}>
          Gerar sugestão de pauta
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Informe o tema e o cliente. O Motor gera duas abordagens A/B com IA para revisão.
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              label="Cliente"
              value={genClient}
              onChange={(e) => setGenClient(e.target.value)}
              size="small"
              fullWidth
            >
              {(allClients.length ? allClients : clients).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Tema / assunto"
              value={genTitle}
              onChange={(e) => setGenTitle(e.target.value)}
              size="small"
              fullWidth
              placeholder="Ex: Nova lei do mercado X impacta o setor"
            />
            <TextField
              label="Contexto adicional (opcional)"
              value={genText}
              onChange={(e) => setGenText(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder="Cole aqui o trecho do artigo, nota de imprensa ou contexto relevante..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setGenOpen(false)} color="inherit" disabled={genLoading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={genLoading || !genClient || !genTitle.trim()}
            startIcon={
              genSuccess
                ? <IconCheck size={15} />
                : genLoading
                  ? <CircularProgress size={14} color="inherit" />
                  : <IconBulb size={15} />
            }
            color={genSuccess ? 'success' : 'primary'}
          >
            {genSuccess ? 'Pauta enviada para análise!' : 'Gerar com IA'}
          </Button>
        </DialogActions>
      </Dialog>
    </OperationsShell>
  );
}
