'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
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
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
  timezone?: string | null;
};

type StoredClient = {
  id: string;
  name: string;
  segment?: string | null;
  city?: string | null;
  uf?: string | null;
};

type StudioContext = {
  event?: string;
  date?: string;
  client?: string;
  clientId?: string;
  segment?: string;
  objective?: string;
  tone?: string;
  message?: string;
  notes?: string;
  tags?: string;
  categories?: string;
  score?: string;
  source?: string;
};

type BriefForm = {
  title: string;
  objective: string;
  message: string;
  tone: string;
  notes: string;
  event: string;
  date: string;
  tags: string;
  categories: string;
  score: string;
  source: string;
  dueAt: string;
};

const OBJECTIVE_OPTIONS = [
  'Reconhecimento de Marca',
  'Engajamento',
  'Conversao',
  'Performance',
  'Mix Equilibrado',
];

const TONE_OPTIONS = ['Profissional', 'Inspirador', 'Casual', 'Persuasivo'];

export default function BriefClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryClientId = searchParams.get('clientId') || '';
  const queryClientName = searchParams.get('client') || '';
  const queryClientIds = searchParams.get('clientIds') || '';
  const queryClientNames = searchParams.get('clients') || '';
  const queryObjective = searchParams.get('objective') || '';
  const queryMessage = searchParams.get('message') || '';
  const queryTone = searchParams.get('tone') || '';
  const queryNotes = searchParams.get('notes') || '';
  const queryEvent = searchParams.get('event') || '';
  const queryDate = searchParams.get('date') || '';
  const queryTags = searchParams.get('tags') || '';
  const queryCategories = searchParams.get('categories') || '';
  const queryScore = searchParams.get('score') || '';
  const querySource = searchParams.get('source') || '';
  const queryProductionType = searchParams.get('productionType') || searchParams.get('production_type') || '';

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [activeClientId, setActiveClientId] = useState('');
  const [selectedClientsCount, setSelectedClientsCount] = useState(0);
  const [context, setContext] = useState<StudioContext>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<BriefForm>({
    title: queryEvent ? `Briefing: ${queryEvent}` : '',
    objective: queryObjective,
    message: queryMessage,
    tone: queryTone,
    notes: queryNotes,
    event: queryEvent,
    date: queryDate,
    tags: queryTags,
    categories: queryCategories,
    score: queryScore,
    source: querySource || 'manual',
    dueAt: '',
  });

  useEffect(() => {
    const loadClients = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiGet<ClientRow[]>('/clients');
        setClients(response || []);
        const idsFromQuery = queryClientIds
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        const namesFromQuery = queryClientNames
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        const hasMultiSelection = idsFromQuery.length > 0 || namesFromQuery.length > 0;
        if (!hasMultiSelection) {
          if (queryClientId && !idsFromQuery.includes(queryClientId)) {
            idsFromQuery.push(queryClientId);
          }
          if (queryClientName) {
            namesFromQuery.push(queryClientName.trim());
          }
        }
        if (typeof window !== 'undefined' && response?.length) {
          const selectedList = response.filter((client) =>
            idsFromQuery.length ? idsFromQuery.includes(client.id) : namesFromQuery.includes(client.name)
          );
          if (selectedList.length) {
            window.localStorage.setItem(
              'edro_selected_clients',
              JSON.stringify(
                selectedList.map((client) => ({
                  id: client.id,
                  name: client.name,
                  segment: client.segment_primary || null,
                  city: null,
                  uf: null,
                }))
              )
            );
            if (!queryClientId) {
              window.localStorage.setItem('edro_active_client_id', selectedList[0].id);
            }
            window.dispatchEvent(new CustomEvent('edro-studio-context-change'));
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Falha ao carregar clientes.');
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [queryClientId, queryClientName, queryClientIds, queryClientNames]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readFromStorage = () => {
      try {
        const raw = window.localStorage.getItem('edro_selected_clients');
        const stored = raw ? (JSON.parse(raw) as StoredClient[]) : [];
        setSelectedClientsCount(stored.length);
        const activeId = window.localStorage.getItem('edro_active_client_id') || stored[0]?.id || '';
        setActiveClientId(activeId);
        const contextRaw = window.localStorage.getItem('edro_studio_context');
        if (contextRaw) {
          const nextContext = JSON.parse(contextRaw) as StudioContext;
          setContext(nextContext || {});
          setForm((prev) => {
            const next = { ...prev };
            if (nextContext?.event && nextContext.event !== prev.event) {
              next.event = nextContext.event;
              if (!prev.title || prev.title.startsWith('Briefing:')) {
                next.title = `Briefing: ${nextContext.event}`;
              }
            }
            if (nextContext?.date && nextContext.date !== prev.date) {
              next.date = nextContext.date;
            }
            if (!prev.objective && nextContext?.objective) {
              next.objective = nextContext.objective;
            }
            if (!prev.tone && nextContext?.tone) {
              next.tone = nextContext.tone;
            }
            if (!prev.message && nextContext?.message) {
              next.message = nextContext.message;
            }
            if (!prev.notes && nextContext?.notes) {
              next.notes = nextContext.notes;
            }
            if (!prev.tags && nextContext?.tags) {
              next.tags = nextContext.tags;
            }
            if (!prev.categories && nextContext?.categories) {
              next.categories = nextContext.categories;
            }
            if (!prev.score && nextContext?.score) {
              next.score = nextContext.score;
            }
            if (nextContext?.source && nextContext.source !== prev.source) {
              next.source = nextContext.source;
            }
            return next;
          });
        } else {
          setContext({});
        }
      } catch {
        setActiveClientId('');
      }
    };

    readFromStorage();

    const handler = () => readFromStorage();
    window.addEventListener('edro-studio-context-change', handler);
    return () => window.removeEventListener('edro-studio-context-change', handler);
  }, []);

  const selectedClient = useMemo(
    () => {
      if (activeClientId) {
        return clients.find((client) => client.id === activeClientId) || null;
      }
      return null;
    },
    [clients, activeClientId]
  );

  const updateForm = (patch: Partial<BriefForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async () => {
    if (!activeClientId) {
      setError('Selecione o cliente no topo para continuar.');
      return;
    }
    if (!form.title.trim()) {
      setError('Informe o titulo do briefing.');
      return;
    }
    if (!form.objective.trim()) {
      setError('Selecione o objetivo estrategico.');
      return;
    }
    if (!form.tone.trim()) {
      setError('Selecione o tom de voz.');
      return;
    }
    if (!form.event.trim() || !form.date.trim()) {
      setError('Preencha evento e data do briefing.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const isUuid = (value?: string) =>
        Boolean(
          value &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              value
            )
        );
      const payload = {
        objective: form.objective,
        message: form.message,
        tone: form.tone,
        notes: form.notes,
        event: form.event,
        date: form.date,
        score: form.score,
        tags: form.tags,
        categories: form.categories,
        source: form.source,
        productionType: queryProductionType,
        client_ref: activeClientId && !isUuid(activeClientId)
          ? {
              id: activeClientId,
              name: selectedClient?.name || '',
            }
          : undefined,
      };
      const resolvedClientId = isUuid(activeClientId) ? activeClientId : undefined;
      const resolvedClientName = selectedClient?.name || undefined;

      const response = await apiPost<{ success: boolean; data: any }>('/edro/briefings', {
        client_id: resolvedClientId,
        client_name: resolvedClientName,
        client_segment: selectedClient?.segment_primary || undefined,
        client_timezone: selectedClient?.timezone || undefined,
        title: form.title.trim(),
        payload,
        source: form.source || 'manual',
        due_at: form.dueAt || undefined,
      });

      const briefingId = response?.data?.briefing?.id;
      if (!briefingId) {
        throw new Error('Briefing criado, mas sem ID.');
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('edro_briefing_id', briefingId);
        if (activeClientId) window.localStorage.setItem('edro_client_id', activeClientId);
        if (activeClientId) window.localStorage.setItem('edro_active_client_id', activeClientId);
        const context = {
          client: selectedClient?.name || '',
          clientId: activeClientId,
          segment: selectedClient?.segment_primary || '',
          date: form.date,
          event: form.event,
          score: form.score,
          tags: form.tags,
          categories: form.categories,
          source: form.source,
          objective: form.objective,
          message: form.message,
          tone: form.tone,
          notes: form.notes,
        };
        window.localStorage.setItem('edro_studio_context', JSON.stringify(context));
        if (queryProductionType) {
          window.localStorage.setItem('edro_studio_production_type', queryProductionType);
        }
        window.dispatchEvent(new CustomEvent('edro-studio-context-change'));
      }

      setSuccess('Briefing criado com sucesso.');
      router.push('/studio/platforms');
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar briefing.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && clients.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Carregando briefing...
        </Typography>
      </Box>
    );
  }

  const hasSelectedClient = Boolean(
    selectedClientsCount || activeClientId || selectedClient?.id
  );
  const hasTopContext = Boolean(
    hasSelectedClient && context?.event && context?.date
  );
  const isPrimaryReady = Boolean(
    hasTopContext && form.title.trim() && form.objective.trim() && form.tone.trim()
  );
  const isContextReady = Boolean(isPrimaryReady && form.event.trim() && form.date.trim());
  const canSubmit = Boolean(isContextReady && !saving);

  return (
    <Stack spacing={3}>
      {/* Page Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Briefing</Typography>
          <Typography variant="body2" color="text.secondary">
            Preencha as informacoes estrategicas para iniciar a producao.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip size="small" variant="outlined" label={`Clientes: ${selectedClientsCount || (selectedClient ? 1 : 0)}`} />
          {context?.event ? <Chip size="small" variant="outlined" label={context.event} /> : null}
          {context?.date ? <Chip size="small" variant="outlined" label={context.date} /> : null}
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {!hasSelectedClient ? (
        <Alert severity="warning">Selecione um cliente no topo para continuar o briefing.</Alert>
      ) : null}
      {hasSelectedClient && !hasTopContext ? (
        <Alert severity="warning">Selecione um evento no calendario para continuar o briefing.</Alert>
      ) : null}

      {/* Dados principais */}
      <Card sx={{ opacity: hasTopContext ? 1 : 0.5, pointerEvents: hasTopContext ? 'auto' : 'none' }}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Dados principais</Typography>
            <Typography variant="body2" color="text.secondary">
              Objetivo, tom e prazos do briefing.
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Titulo do briefing"
                value={form.title}
                onChange={(event) => updateForm({ title: event.target.value })}
                placeholder="Campanha, evento ou tema"
                disabled={!hasTopContext}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="Objetivo estrategico"
                value={form.objective}
                onChange={(event) => updateForm({ objective: event.target.value })}
                disabled={!hasTopContext}
              >
                <MenuItem value="">Selecionar</MenuItem>
                {OBJECTIVE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="Tom de voz"
                value={form.tone}
                onChange={(event) => updateForm({ tone: event.target.value })}
                disabled={!hasTopContext}
              >
                <MenuItem value="">Selecionar</MenuItem>
                {TONE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label="Prazo"
                value={form.dueAt}
                onChange={(event) => updateForm({ dueAt: event.target.value })}
                disabled={!hasTopContext}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Contexto do evento */}
      <Card sx={{ opacity: isPrimaryReady ? 1 : 0.5, pointerEvents: isPrimaryReady ? 'auto' : 'none' }}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Contexto do evento</Typography>
            <Typography variant="body2" color="text.secondary">
              Detalhes que guiam a recomendacao de formatos.
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Evento"
                value={form.event}
                onChange={(event) => updateForm({ event: event.target.value })}
                disabled={!isPrimaryReady}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Data"
                value={form.date}
                onChange={(event) => updateForm({ date: event.target.value })}
                disabled={!isPrimaryReady}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Tags"
                value={form.tags}
                onChange={(event) => updateForm({ tags: event.target.value })}
                disabled={!isPrimaryReady}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Categorias"
                value={form.categories}
                onChange={(event) => updateForm({ categories: event.target.value })}
                disabled={!isPrimaryReady}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Score"
                value={form.score}
                onChange={(event) => updateForm({ score: event.target.value })}
                disabled={!isPrimaryReady}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Fonte"
                value={form.source}
                onChange={(event) => updateForm({ source: event.target.value })}
                disabled={!isPrimaryReady}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Mensagem */}
      <Card sx={{ opacity: isContextReady ? 1 : 0.5, pointerEvents: isContextReady ? 'auto' : 'none' }}>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Mensagem</Typography>
            <Typography variant="body2" color="text.secondary">
              Insira mensagem principal e observacoes.
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Mensagem principal"
                multiline
                rows={4}
                value={form.message}
                onChange={(event) => updateForm({ message: event.target.value })}
                disabled={!isContextReady}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Observacoes adicionais"
                multiline
                rows={3}
                value={form.notes}
                onChange={(event) => updateForm({ notes: event.target.value })}
                disabled={!isContextReady}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Actions */}
      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Button variant="outlined" onClick={() => router.back()}>
          Voltar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
          {saving ? 'Criando...' : 'Criar briefing e avancar'}
        </Button>
      </Stack>
    </Stack>
  );
}
