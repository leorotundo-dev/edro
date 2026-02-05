'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconChevronRight } from '@tabler/icons-react';

type BriefingFormData = {
  client_name: string;
  title: string;
  objective: string;
  target_audience: string;
  channels: string;
  due_at: string;
  traffic_owner: string;
  additional_notes: string;
};

export default function NewBriefingClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<BriefingFormData>({
    client_name: '',
    title: '',
    objective: '',
    target_audience: '',
    channels: '',
    due_at: '',
    traffic_owner: '',
    additional_notes: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        client_name: formData.client_name,
        title: formData.title,
        payload: {
          objective: formData.objective,
          target_audience: formData.target_audience,
          channels: formData.channels,
          additional_notes: formData.additional_notes,
        },
        due_at: formData.due_at || undefined,
        traffic_owner: formData.traffic_owner || undefined,
        notify_traffic: Boolean(formData.traffic_owner),
      };

      const response = await apiPost<{ success: boolean; data: { briefing: { id: string } } }>(
        '/edro/briefings',
        payload
      );

      if (response?.data?.briefing?.id) {
        router.push(`/edro/${response.data.briefing.id}`);
      } else {
        setError('Briefing criado mas ID não retornado.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar briefing.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/edro');
  };

  return (
    <AppShell
      title="Novo Briefing"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" onClick={handleCancel} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Edro
          </Button>
          <IconChevronRight size={14} />
          <Typography variant="body2" fontWeight={500}>Novo Briefing</Typography>
        </Stack>
      }
    >
      <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Informações Básicas</Typography>

                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Cliente *"
                    name="client_name"
                    value={formData.client_name}
                    onChange={handleChange}
                    required
                    placeholder="Nome do cliente"
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label="Título do Briefing *"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    inputProps={{ minLength: 3 }}
                    placeholder="Ex: Campanha Dia das Mães 2026"
                  />

                  <Box>
                    <TextField
                      fullWidth
                      size="small"
                      label="Responsável de Tráfego"
                      name="traffic_owner"
                      type="email"
                      value={formData.traffic_owner}
                      onChange={handleChange}
                      placeholder="email@edro.digital"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Receberá notificações sobre o briefing
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    size="small"
                    label="Prazo de Entrega"
                    name="due_at"
                    type="date"
                    value={formData.due_at}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Detalhes da Campanha</Typography>

                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Objetivo *"
                    name="objective"
                    value={formData.objective}
                    onChange={handleChange}
                    required
                  >
                    <MenuItem value="">Selecione o objetivo</MenuItem>
                    <MenuItem value="awareness">Awareness / Reconhecimento de Marca</MenuItem>
                    <MenuItem value="engagement">Engajamento</MenuItem>
                    <MenuItem value="conversao">Conversão / Vendas</MenuItem>
                    <MenuItem value="leads">Geração de Leads</MenuItem>
                    <MenuItem value="branding">Branding / Institucional</MenuItem>
                    <MenuItem value="lancamento">Lançamento de Produto</MenuItem>
                  </TextField>

                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    label="Público-Alvo *"
                    name="target_audience"
                    value={formData.target_audience}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Mulheres, 25-45 anos, classes A/B, interessadas em decoração..."
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label="Canais *"
                    name="channels"
                    value={formData.channels}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Instagram, Facebook, LinkedIn"
                  />

                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={4}
                    label="Observações Adicionais"
                    name="additional_notes"
                    value={formData.additional_notes}
                    onChange={handleChange}
                    placeholder="Informações adicionais, referências, restrições..."
                  />
                </Stack>
              </CardContent>
            </Card>

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {loading ? 'Criando...' : 'Criar Briefing'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Box>
    </AppShell>
  );
}
