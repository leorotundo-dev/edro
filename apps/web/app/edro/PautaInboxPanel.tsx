'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RejectionReasonPicker from '@/components/studio/RejectionReasonPicker';
import PautaComparisonCard, { type PautaSuggestion } from './PautaComparisonCard';

type PautaInboxResponse = {
  items?: PautaSuggestion[];
};

export default function PautaInboxPanel() {
  const router = useRouter();
  const [items, setItems] = useState<PautaSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

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
  }, [load]);

  const handleApprove = async (suggestionId: string, approach: 'A' | 'B') => {
    setSavingId(suggestionId);
    setError('');
    try {
      const result = await apiPost<{ briefing_id?: string }>(`/pauta-inbox/${suggestionId}/approve`, {
        approach,
      });
      setItems((prev) => prev.filter((item) => item.id !== suggestionId));
      if (result?.briefing_id) {
        router.push(`/edro/${result.briefing_id}`);
      }
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

  if (loading) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Carregando pauta inbox...
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Pauta Inbox
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare duas abordagens e transforme aprovacoes em briefings.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={load}>
            Atualizar
          </Button>
          <Button variant="contained" onClick={() => router.push('/studio/brief')}>
            Nova pauta manual
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {!items.length ? (
        <Alert severity="info">Nenhuma sugestao pendente na pauta inbox.</Alert>
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

