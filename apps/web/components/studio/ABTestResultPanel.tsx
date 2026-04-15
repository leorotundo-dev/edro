'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { apiPatch, apiPost } from '@/lib/api';

type CopyVersion = {
  id: string;
  output: string;
};

type ABTest = {
  id: string;
  variant_a_id: string;
  variant_b_id: string;
  winner_id?: string | null;
  metric: string;
  status: string;
};

type Props = {
  test: ABTest;
  copies: CopyVersion[];
  onChanged: (test: ABTest) => void;
};

const EMPTY_METRICS = { impressions: 0, clicks: 0, engagement: 0, conversions: 0 };

export default function ABTestResultPanel({ test, copies, onChanged }: Props) {
  const [results, setResults] = useState<Record<string, typeof EMPTY_METRICS>>({
    [test.variant_a_id]: { ...EMPTY_METRICS },
    [test.variant_b_id]: { ...EMPTY_METRICS },
  });
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [declaring, setDeclaring] = useState(false);
  const [error, setError] = useState('');

  const variants = useMemo(
    () => [
      { id: test.variant_a_id, label: 'Variante A', copy: copies.find((item) => item.id === test.variant_a_id) },
      { id: test.variant_b_id, label: 'Variante B', copy: copies.find((item) => item.id === test.variant_b_id) },
    ],
    [copies, test.variant_a_id, test.variant_b_id]
  );

  const handleSave = async (variantId: string) => {
    setSavingFor(variantId);
    setError('');
    try {
      await apiPatch(`/edro/ab-tests/${test.id}/result`, {
        variant_id: variantId,
        ...results[variantId],
      });
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar resultado do teste.');
    } finally {
      setSavingFor(null);
    }
  };

  const handleDeclareWinner = async () => {
    setDeclaring(true);
    setError('');
    try {
      const response = await apiPost<{ success: boolean; data: ABTest }>(`/edro/ab-tests/${test.id}/declare-winner`, {});
      if (response?.data) onChanged(response.data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao declarar vencedor.');
    } finally {
      setDeclaring(false);
    }
  };

  if (test.status === 'completed' && test.winner_id) {
    const winner = variants.find((item) => item.id === test.winner_id);
    return (
      <Alert severity="success" sx={{ mt: 2 }}>
        Vencedor declarado: {winner?.label || test.winner_id.slice(0, 8)} por {test.metric}.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
        Teste A/B ativo · métrica: {test.metric}
      </Typography>

      <Stack spacing={2}>
        {variants.map((variant) => (
          <Box key={variant.id}>
            <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.75 }}>
              {variant.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25, whiteSpace: 'pre-wrap' }}>
              {(variant.copy?.output || 'Copy não encontrada').slice(0, 220)}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1, mb: 1 }}>
              {(['impressions', 'clicks', 'engagement', 'conversions'] as const).map((field) => (
                <TextField
                  key={field}
                  size="small"
                  type="number"
                  label={field}
                  value={results[variant.id]?.[field] ?? 0}
                  onChange={(event) =>
                    setResults((prev) => ({
                      ...prev,
                      [variant.id]: {
                        ...prev[variant.id],
                        [field]: Number(event.target.value),
                      },
                    }))
                  }
                />
              ))}
            </Box>
            <Button
              size="small"
              variant="outlined"
              disabled={savingFor === variant.id}
              onClick={() => handleSave(variant.id)}
            >
              {savingFor === variant.id ? 'Salvando...' : 'Salvar resultado'}
            </Button>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ my: 2 }} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Button variant="contained" fullWidth disabled={declaring} onClick={handleDeclareWinner}>
        {declaring ? 'Declarando...' : 'Declarar vencedor'}
      </Button>
    </Box>
  );
}
