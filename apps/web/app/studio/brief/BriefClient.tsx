'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import {
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconClock,
  IconDna,
  IconFileText,
  IconLink,
  IconNews,
  IconRocket,
  IconSparkles,
} from '@tabler/icons-react';

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

type DraftRecovery = {
  id: string;
  title: string;
  step: string;
  stepLabel: string;
};

type SourceContext = {
  id?: string;
  title?: string;
  summary?: string;
  snippet?: string;
  score?: number;
  source?: string;
  published_at?: string;
};

type BriefTemplate = {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: ReactNode;
  defaults: {
    objective: string;
    tone: string;
    platforms: string[];
  };
};

const OBJECTIVE_OPTIONS = [
  'Reconhecimento de Marca',
  'Engajamento',
  'Conversao',
  'Performance',
  'Mix Equilibrado',
];

const TONE_OPTIONS = ['Profissional', 'Inspirador', 'Casual', 'Persuasivo'];

const STEP_LABELS: Record<string, string> = {
  brief: 'Briefing',
  platforms: 'Plataformas',
  editor: 'Editor',
  mockups: 'Mockups',
  review: 'Revisao',
  export: 'Exportar',
};

const BRIEF_TEMPLATES: BriefTemplate[] = [
  {
    id: 'news_response',
    label: 'Resposta a Noticia',
    description: 'Urgente e editorial, baseado em acontecimento do dia.',
    icon: <IconNews size={22} />,
    color: '#dc2626',
    defaults: {
      objective: 'Reconhecimento de Marca',
      tone: 'Profissional',
      platforms: ['Instagram Feed', 'LinkedIn Post'],
    },
  },
  {
    id: 'seasonal',
    label: 'Data Comemorativa',
    description: 'Planejada, sazonal, celebracao ou efemeride.',
    icon: <IconCalendarEvent size={22} />,
    color: '#ff6600',
    defaults: {
      objective: 'Engajamento',
      tone: 'Inspirador',
      platforms: ['Instagram Feed', 'Instagram Story'],
    },
  },
  {
    id: 'product_launch',
    label: 'Lancamento',
    description: 'Produto, servico ou iniciativa nova.',
    icon: <IconRocket size={22} />,
    color: '#5D87FF',
    defaults: {
      objective: 'Conversao',
      tone: 'Persuasivo',
      platforms: ['Instagram Feed', 'LinkedIn Post', 'Email'],
    },
  },
  {
    id: 'institutional',
    label: 'Institucional',
    description: 'Valores de marca, posicionamento e cultura.',
    icon: <IconBuildingSkyscraper size={22} />,
    color: '#7c3aed',
    defaults: {
      objective: 'Reconhecimento de Marca',
      tone: 'Profissional',
      platforms: ['LinkedIn Post', 'Instagram Feed'],
    },
  },
];

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
  const queryRef = searchParams.get('ref') || '';
  const queryRefId = searchParams.get('refId') || searchParams.get('sourceId') || '';
  const queryFresh = searchParams.get('fresh') === '1' || searchParams.get('fresh') === 'true';

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [activeClientId, setActiveClientId] = useState('');
  const [selectedClientsCount, setSelectedClientsCount] = useState(0);
  const [context, setContext] = useState<StudioContext>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [draftRecovery, setDraftRecovery] = useState<DraftRecovery | null>(null);
  const [sourceContext, setSourceContext] = useState<SourceContext | null>(null);
  const [clientDnaTone, setClientDnaTone] = useState('');
  const [deadlineSuggestion, setDeadlineSuggestion] = useState<{ value: string; label: string } | null>(null);
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

  const suggestDeadline = (eventDateStr: string) => {
    const parsedDate = new Date(eventDateStr);
    if (Number.isNaN(parsedDate.getTime())) return null;

    const now = new Date();
    const hoursUntilEvent = (parsedDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    let deadline = new Date(parsedDate);
    let label = '3 dias antes do evento as 18h';

    if (hoursUntilEvent <= 24) {
      deadline = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      label = 'urgente: 4h para aprovacao';
    } else if (hoursUntilEvent <= 5 * 24) {
      deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      deadline.setHours(18, 0, 0, 0);
      label = 'amanha as 18h';
    } else {
      deadline = new Date(parsedDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      deadline.setHours(18, 0, 0, 0);
    }

    const yyyy = deadline.getFullYear();
    const mm = String(deadline.getMonth() + 1).padStart(2, '0');
    const dd = String(deadline.getDate()).padStart(2, '0');
    const hh = String(deadline.getHours()).padStart(2, '0');
    const min = String(deadline.getMinutes()).padStart(2, '0');
    return {
      value: `${yyyy}-${mm}-${dd}T${hh}:${min}`,
      label,
    };
  };

  const clearDraft = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('edro_briefing_id');
    window.localStorage.removeItem('edro_briefing_title');
    window.localStorage.removeItem('edro_studio_step');
    setDraftRecovery(null);
    setSelectedTemplateId('');
  };

  const selectTemplate = (template: BriefTemplate) => {
    setSelectedTemplateId(template.id);
    setForm((prev) => ({
      ...prev,
      objective: prev.objective || template.defaults.objective,
      tone: prev.tone || template.defaults.tone,
    }));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('edro_studio_template', template.id);
      window.localStorage.setItem(
        'edro_studio_template_platforms',
        JSON.stringify(template.defaults.platforms || [])
      );
    }
  };

  const prefillFromSource = (source: SourceContext) => {
    setForm((prev) => ({
      ...prev,
      title: prev.title || source.title || 'Briefing IA',
      event: prev.event || source.title || prev.event,
      message: prev.message || source.summary || source.snippet || prev.message,
      score: prev.score || (source.score != null ? String(source.score) : prev.score),
    }));
  };

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedBriefingId = window.localStorage.getItem('edro_briefing_id') || '';
    const savedTitle = window.localStorage.getItem('edro_briefing_title') || '';
    const savedStep = window.localStorage.getItem('edro_studio_step') || 'brief';
    if (savedBriefingId && savedTitle && !queryFresh) {
      setDraftRecovery({
        id: savedBriefingId,
        title: savedTitle,
        step: savedStep,
        stepLabel: STEP_LABELS[savedStep] || savedStep,
      });
    }
    window.localStorage.setItem('edro_studio_step', 'brief');
    const template = window.localStorage.getItem('edro_studio_template') || '';
    if (template) setSelectedTemplateId(template);
  }, [queryFresh]);

  useEffect(() => {
    const clientId = queryClientId || activeClientId;
    if (!clientId) return;
    let cancelled = false;
    apiGet<any>(`/clients/${clientId}/profile`)
      .then((res) => {
        if (cancelled) return;
        const tone =
          res?.tone ||
          res?.voice_profile ||
          res?.profile?.tone_description ||
          res?.profile?.tone_profile ||
          '';
        if (!tone) return;
        setClientDnaTone(String(tone));
        setForm((prev) => (prev.tone ? prev : { ...prev, tone: String(tone) }));
      })
      .catch(() => {
        if (!cancelled) setClientDnaTone('');
      });
    return () => {
      cancelled = true;
    };
  }, [queryClientId, activeClientId]);

  useEffect(() => {
    if (!queryRef || !queryRefId || !(queryClientId || activeClientId)) return;
    const refMap: Record<string, (id: string, clientId: string) => string> = {
      clipping: (id) => `/clipping/items/${id}`,
      opportunity: (id, clientId) => `/clients/${clientId}/insights/opportunities?sourceId=${encodeURIComponent(id)}`,
      calendar: (id, clientId) => `/clients/${clientId}/calendar/events/${id}`,
    };
    const endpointBuilder = refMap[queryRef];
    if (!endpointBuilder) return;

    let cancelled = false;
    const targetClientId = queryClientId || activeClientId;
    apiGet<any>(endpointBuilder(queryRefId, targetClientId))
      .then((payload) => {
        if (cancelled) return;
        const item =
          payload?.item ||
          payload?.data?.item ||
          payload?.data ||
          (Array.isArray(payload?.items) ? payload.items[0] : null) ||
          payload;
        if (!item || typeof item !== 'object') return;
        setSourceContext({
          id: String(item.id || queryRefId),
          title: String(item.title || item.name || item.event_name || ''),
          summary: String(item.summary || item.snippet || item.description || ''),
          snippet: String(item.snippet || ''),
          score: Number(item.score ?? item.client_score ?? item.relevance_score ?? 0) || undefined,
          source: String(item.source || queryRef || ''),
          published_at: item.published_at || item.date || undefined,
        });
      })
      .catch(() => {
        if (!cancelled) setSourceContext(null);
      });

    return () => {
      cancelled = true;
    };
  }, [queryRef, queryRefId, queryClientId, activeClientId]);

  useEffect(() => {
    if (!form.date || form.dueAt) {
      setDeadlineSuggestion(null);
      return;
    }
    const suggestion = suggestDeadline(form.date);
    setDeadlineSuggestion(suggestion);
  }, [form.date, form.dueAt]);

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
        window.localStorage.setItem('edro_briefing_title', form.title.trim());
        window.localStorage.setItem('edro_studio_step', 'platforms');
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
    hasSelectedClient &&
      ((context?.event && context?.date) || (form.event.trim() && form.date.trim()))
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

      {draftRecovery ? (
        <Card
          sx={{
            borderColor: 'warning.main',
            borderWidth: 1,
            borderStyle: 'solid',
            bgcolor: 'rgba(245,158,11,0.04)',
          }}
        >
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <IconFileText size={18} color="#d97706" />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Pauta em andamento
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  "{draftRecovery.title}" · {draftRecovery.stepLabel}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                href={`/studio/${draftRecovery.step}`}
                sx={{
                  bgcolor: '#ff6600',
                  '&:hover': { bgcolor: '#e65c00' },
                  textTransform: 'none',
                }}
              >
                Continuar
              </Button>
              <Button size="small" variant="text" onClick={clearDraft} sx={{ color: 'text.secondary' }}>
                Comecar nova
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {!queryClientId && !activeClientId && !context?.event && !context?.date ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Escolha o tipo de pauta
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              A IA preenche objetivo, tom e plataformas sugeridas para acelerar o briefing.
            </Typography>
            <Grid container spacing={1.5}>
              {BRIEF_TEMPLATES.map((template) => (
                <Grid key={template.id} size={{ xs: 12, md: 6 }}>
                  <Card
                    variant="outlined"
                    onClick={() => selectTemplate(template)}
                    sx={{
                      cursor: 'pointer',
                      borderColor:
                        selectedTemplateId === template.id ? template.color : 'divider',
                      borderWidth: selectedTemplateId === template.id ? 1.5 : 1,
                    }}
                  >
                    <CardContent sx={{ py: 1.5 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: `${template.color}1f`,
                            color: template.color,
                          }}
                        >
                          {template.icon}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {template.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {template.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      ) : null}

      {!hasSelectedClient ? (
        <Alert severity="warning">Selecione um cliente no topo para continuar o briefing.</Alert>
      ) : null}
      {hasSelectedClient && !hasTopContext ? (
        <Alert severity="warning">Selecione um evento no calendario para continuar o briefing.</Alert>
      ) : null}

      {sourceContext ? (
        <Card
          variant="outlined"
          sx={{
            borderColor: 'rgba(255,102,0,0.2)',
            bgcolor: 'rgba(255,102,0,0.03)',
          }}
        >
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
              <IconLink size={15} color="#ff6600" />
              <Typography
                variant="caption"
                sx={{ textTransform: 'uppercase', color: '#ff6600', fontWeight: 700 }}
              >
                Origem desta pauta
              </Typography>
              <Chip size="small" label={sourceContext.source || queryRef || 'ref'} />
              {sourceContext.score != null ? (
                <Chip size="small" variant="outlined" label={`Score ${sourceContext.score}`} />
              ) : null}
            </Stack>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              {sourceContext.title || 'Sem titulo'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {sourceContext.summary || sourceContext.snippet || 'Sem resumo disponivel.'}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => prefillFromSource(sourceContext)}
              startIcon={<IconSparkles size={14} />}
              sx={{ mt: 1, color: '#ff6600', textTransform: 'none', px: 0 }}
            >
              Usar como base do briefing
            </Button>
          </CardContent>
        </Card>
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
              {clientDnaTone ? (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }}>
                  <IconDna size={12} color="#64748b" />
                  <Typography variant="caption" color="text.secondary">
                    DNA de {selectedClient?.name || 'cliente'}: <b>{clientDnaTone}</b>
                  </Typography>
                  {form.tone !== clientDnaTone ? (
                    <Button
                      size="small"
                      onClick={() => updateForm({ tone: clientDnaTone })}
                      sx={{ py: 0, minWidth: 0, fontSize: '0.7rem' }}
                    >
                      Usar
                    </Button>
                  ) : null}
                </Stack>
              ) : null}
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
              {deadlineSuggestion && !form.dueAt ? (
                <Chip
                  size="small"
                  icon={<IconClock size={12} />}
                  label={`Sugerido: ${deadlineSuggestion.label}`}
                  onClick={() => updateForm({ dueAt: deadlineSuggestion.value })}
                  sx={{
                    mt: 0.75,
                    cursor: 'pointer',
                    bgcolor: 'rgba(255,102,0,0.08)',
                    color: '#ff6600',
                  }}
                />
              ) : null}
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
