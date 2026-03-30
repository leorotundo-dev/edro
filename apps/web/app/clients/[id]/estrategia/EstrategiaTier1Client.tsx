'use client';

import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { apiGet, apiPut } from '@/lib/api';

type Tier1 = {
  verdade_humana?: string;
  verdade_mercado?: string;
  verdade_marca?: string;
  territorio_criativo?: string;
  prova_base?: string;
  updated_at?: string;
  updated_by?: string;
};

const FIELDS: { key: keyof Tier1; label: string; hint: string }[] = [
  {
    key: 'verdade_humana',
    label: 'Verdade Humana',
    hint: 'O que as pessoas sentem mas raramente verbalizam — a tensão emocional universal que conecta o cliente à vida real.',
  },
  {
    key: 'verdade_mercado',
    label: 'Verdade de Mercado',
    hint: 'O que o mercado acredita hoje vs. o que o cliente sabe que é mais verdadeiro.',
  },
  {
    key: 'verdade_marca',
    label: 'Verdade da Marca',
    hint: 'O que esse cliente faz de forma única e que nenhum concorrente pode roubar.',
  },
  {
    key: 'territorio_criativo',
    label: 'Território Criativo',
    hint: 'O espaço conceitual e emocional onde toda a criação deste cliente deve habitar.',
  },
  {
    key: 'prova_base',
    label: 'Provas Base',
    hint: 'Dados, resultados, depoimentos ou fatos que sustentam a verdade da marca.',
  },
];

type Props = { clientId: string };

export default function EstrategiaTier1Client({ clientId }: Props) {
  const [form, setForm]     = useState<Tier1>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/clients/${clientId}/strategy/tier1`);
      setForm(data || {});
    } catch {
      setError('Não foi possível carregar a estratégia.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPut(`/clients/${clientId}/strategy/tier1`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>DNA do Cliente — Tier 1</Typography>
          <Typography variant="body2" color="text.secondary">
            Estratégia perene. Revisada a cada 6–12 meses ou quando houver reposicionamento.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconDeviceFloppy size={16} />}
          onClick={handleSave}
          disabled={saving}
          color={saved ? 'success' : 'primary'}
        >
          {saved ? 'Salvo!' : 'Salvar'}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2.5}>
        {FIELDS.map(({ key, label, hint }) => (
          <Card key={key} variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              {hint}
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              placeholder={`Escreva a ${label.toLowerCase()} deste cliente...`}
              value={form[key] ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              size="small"
            />
          </Card>
        ))}
      </Stack>

      {form.updated_at && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Última atualização: {new Date(form.updated_at).toLocaleDateString('pt-BR')}
          {form.updated_by ? ` por ${form.updated_by}` : ''}
        </Typography>
      )}
    </Box>
  );
}
