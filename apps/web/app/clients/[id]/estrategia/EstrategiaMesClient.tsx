'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconChevronLeft, IconChevronRight, IconDeviceFloppy } from '@tabler/icons-react';
import { apiGet, apiPut } from '@/lib/api';

type Tier2 = {
  negocio_do_mes?: string;
  tensao?: string;
  transformacao_de?: string;
  transformacao_para?: string;
  frente_dominante?: string;
  notas?: string;
};

const FRENTES = ['institucional', 'comercial', 'relacional', 'experiencial'];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Props = { clientId: string };

export default function EstrategiaMesClient({ clientId }: Props) {
  const now    = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [form, setForm]   = useState<Tier2>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/clients/${clientId}/strategy/monthly?year=${year}&month=${month}`);
      setForm(data || {});
    } catch {
      setForm({});
    } finally {
      setLoading(false);
    }
  }, [clientId, year, month]);

  useEffect(() => { load(); }, [load]);

  const navigate = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    setMonth(m);
    setYear(y);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPut(`/clients/${clientId}/strategy/monthly`, { year, month, ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Month navigator */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button size="small" variant="outlined" sx={{ minWidth: 32, px: 0.5 }} onClick={() => navigate(-1)}>
            <IconChevronLeft size={16} />
          </Button>
          <Typography variant="h6" fontWeight={600} sx={{ minWidth: 180, textAlign: 'center' }}>
            {MONTH_NAMES[month - 1]} {year}
          </Typography>
          <Button size="small" variant="outlined" sx={{ minWidth: 32, px: 0.5 }} onClick={() => navigate(1)}>
            <IconChevronRight size={16} />
          </Button>
          {year === now.getFullYear() && month === now.getMonth() + 1 && (
            <Chip label="Mês atual" size="small" color="primary" variant="outlined" />
          )}
        </Stack>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconDeviceFloppy size={16} />}
          onClick={handleSave}
          disabled={saving || loading}
          color={saved ? 'success' : 'primary'}
        >
          {saved ? 'Salvo!' : 'Salvar'}
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={24} />
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          <Card variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Negócio do Mês</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              O que precisa mudar no mundo real este mês — resultado de negócio concreto.
            </Typography>
            <TextField
              fullWidth multiline minRows={2} maxRows={4} size="small"
              placeholder="Ex: Aumentar agendamentos de consultas em 20%..."
              value={form.negocio_do_mes ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, negocio_do_mes: e.target.value }))}
            />
          </Card>

          <Card variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Tensão Central</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              A contradição criativa que o mês vai explorar. Conflito entre percepção atual e desejada.
            </Typography>
            <TextField
              fullWidth multiline minRows={2} maxRows={4} size="small"
              placeholder="Ex: As pessoas querem cuidar da saúde mas acham que não têm tempo..."
              value={form.tensao ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, tensao: e.target.value }))}
            />
          </Card>

          <Card variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Transformação</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth size="small"
                label="De (percepção atual)"
                placeholder="Como o público vê hoje..."
                value={form.transformacao_de ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, transformacao_de: e.target.value }))}
              />
              <TextField
                fullWidth size="small"
                label="Para (percepção desejada)"
                placeholder="Como queremos que vejam..."
                value={form.transformacao_para ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, transformacao_para: e.target.value }))}
              />
            </Stack>
          </Card>

          <Card variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Frente Dominante</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {FRENTES.map((f) => (
                <Chip
                  key={f}
                  label={f.charAt(0).toUpperCase() + f.slice(1)}
                  onClick={() => setForm((p) => ({ ...p, frente_dominante: p.frente_dominante === f ? '' : f }))}
                  color={form.frente_dominante === f ? 'primary' : 'default'}
                  variant={form.frente_dominante === f ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer', textTransform: 'capitalize' }}
                />
              ))}
            </Stack>
          </Card>

          <Card variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>Notas</Typography>
            <TextField
              fullWidth multiline minRows={2} maxRows={4} size="small"
              placeholder="Observações livres, contexto adicional, datas importantes..."
              value={form.notas ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
            />
          </Card>
        </Stack>
      )}
    </Box>
  );
}
