'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconRefresh, IconSparkles } from '@tabler/icons-react';
import RejectionReasonPicker from '@/components/studio/RejectionReasonPicker';
import PautaComparisonCard, { type PautaSuggestion } from './PautaComparisonCard';

type PautaInboxResponse = {
  items?: PautaSuggestion[];
};

type ClientOption = { id: string; name: string };

export default function PautaInboxPanel() {
  const router = useRouter();
  const [items, setItems] = useState<PautaSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<PautaInboxResponse>('/pauta-inbox');
      setItems(response?.items || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar pauta inbox.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    apiGet<ClientOption[]>('/clients')
      .then((res) => setClients(res || []))
      .catch(() => {});
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      await apiPost('/pauta-inbox/generate', {
        client_id: selectedClientId || undefined,
        count: 3,
      });
      await load();
    } catch (err: any) {
      setGenerateError(err?.message || 'Falha ao gerar sugestões.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (suggestionId: string, approach: 'A' | 'B') => {
    setSavingId(suggestionId);
    setError('');
    try {
      const result = await apiPost<{ briefing_id?: string }>(`/pauta-inbox/${suggestionId}/approve`, { approach });
      setItems((prev) => prev.filter((item) => item.id !== suggestionId));
      if (result?.briefing_id) router.push(`/edro/${result.briefing_id}`);
    } catch (err: any) {
      setError(err?.message || 'Falha ao aprovar sugestao.');
    } finally {
      setSavingId(null);
    }
  };

  const handleReject = async (tags: string[], reason: string) => {
    if (!rejectTarget) return;
    setSavingId(rejectTarget);
    setError('');
    try {
      await apiPost(`/pauta-inbox/${rejectTarget}/reject`, { tags, reason });
      setItems((prev) => prev.filter((item) => item.id !== rejectTarget));
      setRejectTarget(null);
    } catch (err: any) {
      setError(err?.message || 'Falha ao rejeitar sugestao.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Pauta Inbox</Typography>
          <Typography variant="body2" color="text.secondary">
            Compare duas abordagens geradas por IA e aprove para criar briefings.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={16} />}
            onClick={load}
            disabled={loading}
          >
            Atualizar
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => router.push('/studio/brief')}
          >
            Nova pauta manual
          </Button>
        </Stack>
      </Stack>

      {/* Generate new suggestions */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
        {clients.length > 0 && (
          <TextField
            select
            size="small"
            label="Cliente (opcional)"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todos os clientes</MenuItem>
            {clients.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        )}
        <LoadingButton
          variant="contained"
          size="small"
          loading={generating}
          onClick={handleGenerate}
          startIcon={!generating ? <IconSparkles size={16} /> : null}
          sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' }, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          Gerar novas sugestões
        </LoadingButton>
      </Stack>

      {generateError && <Alert severity="warning" onClose={() => setGenerateError('')}>{generateError}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Carregando...</Typography>
        </Box>
      ) : !items.length ? (
        <Alert severity="info" icon={<IconSparkles size={18} />}>
          Nenhuma sugestão pendente. Clique em <strong>"Gerar novas sugestões"</strong> para criar pautas com IA.
        </Alert>
      ) : (
        items.map((suggestion) => (
          <PautaComparisonCard
            key={suggestion.id}
            suggestion={suggestion}
            loading={savingId === suggestion.id}
            onApproveA={() => handleApprove(suggestion.id, 'A')}
            onApproveB={() => handleApprove(suggestion.id, 'B')}
            onReject={() => setRejectTarget(suggestion.id)}
          />
        ))
      )}

      <RejectionReasonPicker
        open={Boolean(rejectTarget)}
        type="pauta"
        loading={Boolean(savingId)}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleReject}
      />
    </Stack>
  );
}
