'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconChevronRight, IconTemplate } from '@tabler/icons-react';

type BriefingTemplate = {
  id: string;
  name: string;
  category: string;
  objective?: string;
  target_audience?: string;
  channels?: string[];
  additional_notes?: string;
};

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

const CATEGORY_LABELS: Record<string, string> = {
  social: 'Social',
  ads: 'Tráfego Pago',
  email: 'Email',
  launch: 'Lançamento',
  seasonal: 'Sazonal',
  content: 'Conteúdo',
};

export default function NewBriefingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // client_id = clients.id (TEXT) — vem da aba de briefings do workspace do cliente
  const prefillClientId = searchParams.get('client_id') || '';
  const prefillClientName = searchParams.get('client_name') || '';
  // Parâmetros vindos do calendário (quando o usuário clica numa data/evento)
  const prefillTitle = searchParams.get('title') || '';
  const prefillDate = searchParams.get('date') || '';
  const prefillEventWhy = searchParams.get('event_why') || '';
  const prefillEventCategories = searchParams.get('event_categories') || '';

  // Monta notas adicionais com contexto do evento do calendário
  const calendarNotes = [
    prefillEventWhy ? `Contexto do evento: ${prefillEventWhy}` : '',
    prefillEventCategories ? `Categorias: ${prefillEventCategories}` : '',
  ].filter(Boolean).join('\n');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<BriefingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState<BriefingFormData>({
    client_name: prefillClientName,
    title: prefillTitle,
    objective: '',
    target_audience: '',
    channels: '',
    due_at: prefillDate,
    traffic_owner: '',
    additional_notes: calendarNotes,
  });

  useEffect(() => {
    apiGet<{ data: BriefingTemplate[] }>('/edro/templates')
      .then((res) => setTemplates(res?.data ?? []))
      .catch(() => {});
  }, []);

  const applyTemplate = (tpl: BriefingTemplate) => {
    setSelectedTemplate(tpl.id);
    setFormData((prev) => ({
      ...prev,
      objective: tpl.objective || prev.objective,
      target_audience: tpl.target_audience || prev.target_audience,
      channels: tpl.channels?.join(', ') || prev.channels,
      additional_notes: tpl.additional_notes || prev.additional_notes,
    }));
  };

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
      const payload: Record<string, any> = {
        // Se veio da aba do cliente (client_id é o clients.id TEXT),
        // o backend usará como main_client_id (fonte única de verdade do perfil)
        ...(prefillClientId ? { client_id: prefillClientId } : { client_name: formData.client_name }),
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

        {templates.length > 0 && (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'action.hover' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <IconTemplate size={18} />
                <Typography variant="subtitle2">Começar a partir de um template</Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {templates.map((tpl) => (
                  <Chip
                    key={tpl.id}
                    label={tpl.name}
                    size="small"
                    variant={selectedTemplate === tpl.id ? 'filled' : 'outlined'}
                    color={selectedTemplate === tpl.id ? 'primary' : 'default'}
                    onClick={() => applyTemplate(tpl)}
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Stack>
              {selectedTemplate && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Campos preenchidos pelo template. Você pode editar antes de criar.
                </Typography>
              )}
            </CardContent>
          </Card>
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
