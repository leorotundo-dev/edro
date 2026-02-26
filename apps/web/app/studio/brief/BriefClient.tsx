'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import {
  IconBookmark,
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
  IconClick,
  IconClock,
  IconDna,
  IconFileText,
  IconFlag,
  IconLink,
  IconMessage,
  IconNews,
  IconRocket,
  IconShare,
  IconSparkles,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
  timezone?: string | null;
  profile?: {
    brand_colors?: string[];
    personas?: Array<{ id: string; name: string; momento: string }>;
  } | null;
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
  persona_id: string;
  momento_consciencia: 'problema' | 'solucao' | 'decisao' | '';
  amd: 'salvar' | 'compartilhar' | 'clicar' | 'responder' | 'marcar_alguem' | 'pedir_proposta' | '';
  campaign_id: string;
  campaign_phase_id: string;
  behavior_intent_id: string;
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

const AMD_OPTIONS = [
  { value: 'salvar',         label: 'Salvar',         icon: <IconBookmark size={13} /> },
  { value: 'compartilhar',   label: 'Compartilhar',   icon: <IconShare size={13} /> },
  { value: 'clicar',         label: 'Clicar',         icon: <IconClick size={13} /> },
  { value: 'responder',      label: 'Responder',      icon: <IconMessage size={13} /> },
  { value: 'marcar_alguem',  label: 'Marcar alguém',  icon: <IconUserPlus size={13} /> },
  { value: 'pedir_proposta', label: 'Pedir proposta', icon: <IconFileText size={13} /> },
];

const MOMENTO_OPTIONS = [
  { value: 'problema', label: 'Descoberta', color: '#3b82f6' },
  { value: 'solucao',  label: 'Avaliando',  color: '#f59e0b' },
  { value: 'decisao',  label: 'Pronto para agir', color: '#10b981' },
];

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
  const queryBehaviorIntentId = searchParams.get('behavior_intent_id') || '';
  const queryBehavioralCopyId = searchParams.get('behavioral_copy_id') || '';
  const queryTitle = searchParams.get('title') || '';
  const queryCampaignId = searchParams.get('campaign_id') || '';
  const queryCampaignPhaseId = searchParams.get('campaign_phase_id') || '';

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
  const [clientPersonas, setClientPersonas] = useState<Array<{ id: string; name: string; momento: string }>>([]);
  const [clientCampaigns, setClientCampaigns] = useState<Array<{ id: string; name: string; phases: Array<{ id: string; name: string; order: number }>; behavior_intents: Array<{ id: string; amd: string; momento: string; triggers: string[]; target_behavior: string; phase_id: string }> }>>([]);
  const [deadlineSuggestion, setDeadlineSuggestion] = useState<{ value: string; label: string } | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarDays, setCalendarDays] = useState<Record<string, any[]>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [manualEventName, setManualEventName] = useState('');
  const [form, setForm] = useState<BriefForm>({
    title: queryTitle || (queryEvent ? `Briefing: ${queryEvent}` : ''),
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
    persona_id: '',
    momento_consciencia: '',
    amd: '',
    campaign_id: queryCampaignId,
    campaign_phase_id: queryCampaignPhaseId,
    behavior_intent_id: queryBehaviorIntentId,
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

  // Auto-fill momento when persona changes
  useEffect(() => {
    if (!form.persona_id) return;
    const found = clientPersonas.find((p) => p.id === form.persona_id);
    if (found?.momento) updateForm({ momento_consciencia: found.momento as 'problema' | 'solucao' | 'decisao' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.persona_id, clientPersonas]);

  // Auto-fill amd + momento from linked behavior intent (when opened from CampaignsClient)
  useEffect(() => {
    if (!queryBehaviorIntentId || !queryCampaignId) return;
    const campaign = clientCampaigns.find(c => c.id === queryCampaignId);
    const intent = campaign?.behavior_intents.find(bi => bi.id === queryBehaviorIntentId);
    if (intent) {
      updateForm({
        amd: intent.amd as BriefForm['amd'],
        momento_consciencia: intent.momento as BriefForm['momento_consciencia'],
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientCampaigns, queryBehaviorIntentId, queryCampaignId]);

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

  const getRelevanceColor = (score: number): string => {
    if (score >= 75) return '#22c55e';  // verde
    if (score >= 50) return '#f97316';  // laranja
    if (score >= 25) return '#eab308';  // amarelo
    return '#94a3b8';                   // cinza
  };

  const CLIENT_COLORS = ['#ff6600', '#5D87FF', '#7c3aed', '#dc2626', '#059669', '#d97706'];
  const getClientColor = (name: string) => CLIENT_COLORS[name.charCodeAt(0) % CLIENT_COLORS.length];

  const handleSelectClient = (client: ClientRow) => {
    setActiveClientId(client.id);
    setSelectedClientsCount(1);
    // Reset campaign selection when client changes
    updateForm({ campaign_id: '', campaign_phase_id: '', behavior_intent_id: '' });
    // Load personas for the selected client
    if (client.profile?.personas?.length) {
      setClientPersonas(client.profile.personas.map((p) => ({ id: p.id, name: p.name, momento: p.momento })));
    } else {
      apiGet<{ personas: any[] }>(`/clients/${client.id}/personas`)
        .then((res) => setClientPersonas((res?.personas ?? []).map((p: any) => ({ id: p.id, name: p.name, momento: p.momento }))))
        .catch(() => {});
    }
    // Load active campaigns for the selected client
    apiGet<{ success: boolean; data: any[] }>(`/campaigns?client_id=${client.id}&status=active`)
      .then((res) => setClientCampaigns((res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name, phases: Array.isArray(c.phases) ? c.phases : [], behavior_intents: Array.isArray(c.behavior_intents) ? c.behavior_intents : [] }))))
      .catch(() => setClientCampaigns([]));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('edro_active_client_id', client.id);
      window.localStorage.setItem(
        'edro_selected_clients',
        JSON.stringify([{
          id: client.id,
          name: client.name,
          segment: client.segment_primary || null,
          city: null,
          uf: null,
        }])
      );
      window.dispatchEvent(new CustomEvent('edro-studio-context-change'));
    }
  };

  const handleClearClient = () => {
    setActiveClientId('');
    setSelectedClientsCount(0);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('edro_active_client_id');
      window.localStorage.removeItem('edro_selected_clients');
      window.dispatchEvent(new CustomEvent('edro-studio-context-change'));
    }
  };

  const loadCalendarMonth = async (month: string, clientId: string) => {
    setCalendarLoading(true);
    try {
      const res = await apiGet<{ days?: Record<string, any[]> }>(`/clients/${clientId}/calendar/month/${month}?all=true`);
      setCalendarDays(res?.days || {});
    } catch {
      setCalendarDays({});
    } finally {
      setCalendarLoading(false);
    }
  };

  const openCalendar = () => {
    const clientId = queryClientId || activeClientId;
    if (!clientId) return;
    setCalendarOpen(true);
    setSelectedDay('');
    loadCalendarMonth(calendarMonth, clientId);
  };

  const navigateMonth = (delta: number) => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    const newMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(newMonth);
    setSelectedDay('');
    const clientId = queryClientId || activeClientId;
    if (clientId) loadCalendarMonth(newMonth, clientId);
  };

  const handleEventPick = (evt: any) => {
    const eventName = evt.name || evt.title || evt.event_name || '';
    const eventDate = evt.date || '';
    setForm((prev) => ({
      ...prev,
      event: eventName,
      date: eventDate,
      title: prev.title && !prev.title.startsWith('Briefing:') ? prev.title : `Briefing: ${eventName}`,
      tags: prev.tags || (Array.isArray(evt.tags) ? evt.tags.join(', ') : ''),
      categories: prev.categories || (Array.isArray(evt.categories) ? evt.categories.join(', ') : ''),
      score: prev.score || (evt.score != null ? String(evt.score) : ''),
    }));
    setCalendarOpen(false);
    setSelectedDay('');
  };

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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
        ...(form.persona_id ? { persona_id: form.persona_id } : {}),
        ...(form.momento_consciencia ? { momento_consciencia: form.momento_consciencia } : {}),
        ...(form.amd ? { amd: form.amd } : {}),
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
        ...(form.campaign_id ? { campaign_id: form.campaign_id } : {}),
        ...(form.campaign_phase_id ? { campaign_phase_id: form.campaign_phase_id } : {}),
        ...(form.behavior_intent_id ? { behavior_intent_id: form.behavior_intent_id } : {}),
      });

      const briefingId = response?.data?.briefing?.id;
      if (!briefingId) {
        throw new Error('Briefing criado, mas sem ID.');
      }

      // Non-blocking: link the briefing back to the saved behavioral copy row
      if (queryBehavioralCopyId) {
        apiPatch(`/campaigns/behavioral-copies/${queryBehavioralCopyId}/briefing`, {
          briefing_id: briefingId,
        }).catch(() => {});
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

      {/* Client Selector */}
      {!queryClientId ? (
        !hasSelectedClient ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Selecione o cliente
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Escolha para qual cliente esta pauta sera criada.
              </Typography>
              {clients.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum cliente cadastrado.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {clients.map((client) => {
                    const color = client.profile?.brand_colors?.[0] || getClientColor(client.name);
                    return (
                      <Card
                        key={client.id}
                        variant="outlined"
                        onClick={() => handleSelectClient(client)}
                        sx={{
                          cursor: 'pointer',
                          width: 110,
                          textAlign: 'center',
                          p: 1.5,
                          borderColor: 'divider',
                          '&:hover': { borderColor: color, bgcolor: `${color}08` },
                          transition: 'all 0.15s',
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 44,
                            height: 44,
                            bgcolor: color,
                            mx: 'auto',
                            mb: 1,
                            fontSize: '1.1rem',
                            fontWeight: 700,
                          }}
                        >
                          {client.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ display: 'block', lineHeight: 1.3, wordBreak: 'break-word' }}
                        >
                          {client.name.length > 16 ? `${client.name.slice(0, 15)}…` : client.name}
                        </Typography>
                        {client.segment_primary ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: '0.62rem', display: 'block', mt: 0.25 }}
                          >
                            {client.segment_primary.length > 14
                              ? `${client.segment_primary.slice(0, 13)}…`
                              : client.segment_primary}
                          </Typography>
                        ) : null}
                      </Card>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card
            variant="outlined"
            sx={{ borderColor: 'rgba(255,102,0,0.35)', bgcolor: 'rgba(255,102,0,0.02)' }}
          >
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: selectedClient ? (selectedClient.profile?.brand_colors?.[0] || getClientColor(selectedClient.name)) : '#ff6600',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                  }}
                >
                  {selectedClient?.name?.charAt(0).toUpperCase() ?? '?'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {selectedClient?.name ?? activeClientId}
                  </Typography>
                  {selectedClient?.segment_primary ? (
                    <Typography variant="caption" color="text.secondary">
                      {selectedClient.segment_primary}
                    </Typography>
                  ) : null}
                </Box>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleClearClient}
                  sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Trocar cliente
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )
      ) : null}

      {/* ── Seção AMD + Persona (visível apenas com cliente selecionado) ─────────── */}
      {(activeClientId || queryClientId) && (
        <Card variant="outlined" sx={{ borderColor: 'rgba(93,135,255,0.35)', bgcolor: 'rgba(93,135,255,0.02)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 0.25 }}>Público e Objetivo Comportamental</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Quem vai receber esta copy e o que você quer que ela faça de verdade.
            </Typography>
            <Stack spacing={2}>
              {clientPersonas.length > 0 && (
                <TextField
                  select fullWidth size="small" label="Persona alvo"
                  value={form.persona_id}
                  onChange={(e) => updateForm({ persona_id: e.target.value })}
                >
                  <MenuItem value="">Nenhuma persona selecionada</MenuItem>
                  {clientPersonas.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </TextField>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                  Momento de consciência
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {MOMENTO_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      onClick={() => updateForm({ momento_consciencia: opt.value as 'problema' | 'solucao' | 'decisao' })}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: form.momento_consciencia === opt.value ? opt.color : 'transparent',
                        color: form.momento_consciencia === opt.value ? '#fff' : 'text.secondary',
                        border: `1px solid ${opt.color}`,
                        fontWeight: form.momento_consciencia === opt.value ? 700 : 400,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                  AMD — Ação Mínima Desejada
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {AMD_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.value}
                      icon={opt.icon}
                      label={opt.label}
                      onClick={() => updateForm({ amd: opt.value as BriefForm['amd'] })}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: form.amd === opt.value ? '#5D87FF' : 'transparent',
                        color: form.amd === opt.value ? '#fff' : 'text.secondary',
                        border: '1px solid',
                        borderColor: form.amd === opt.value ? '#5D87FF' : 'divider',
                        fontWeight: form.amd === opt.value ? 700 : 400,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {clientCampaigns.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <IconFlag size={16} color="#6366f1" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Vincular à campanha</Typography>
              <Typography variant="caption" color="text.secondary">(opcional)</Typography>
            </Stack>
            <Stack spacing={1.5}>
              <FormControl size="small" fullWidth>
                <InputLabel>Campanha</InputLabel>
                <Select
                  value={form.campaign_id}
                  label="Campanha"
                  onChange={(e) => updateForm({ campaign_id: e.target.value, campaign_phase_id: '', behavior_intent_id: '' })}
                >
                  <MenuItem value=""><em>Nenhuma campanha</em></MenuItem>
                  {clientCampaigns.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {form.campaign_id && (() => {
                const selectedCampaign = clientCampaigns.find(c => c.id === form.campaign_id);
                const phases = selectedCampaign?.phases?.length
                  ? [...selectedCampaign.phases].sort((a, b) => a.order - b.order)
                  : [{ id: 'historia', name: 'História', order: 1 }, { id: 'prova', name: 'Prova', order: 2 }, { id: 'convite', name: 'Convite', order: 3 }];
                return (
                  <FormControl size="small" fullWidth>
                    <InputLabel>Fase da campanha</InputLabel>
                    <Select
                      value={form.campaign_phase_id}
                      label="Fase da campanha"
                      onChange={(e) => updateForm({ campaign_phase_id: e.target.value })}
                    >
                      <MenuItem value=""><em>Sem fase específica</em></MenuItem>
                      {phases.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              })()}
            </Stack>
          </CardContent>
        </Card>
      )}

      {!context?.event && !context?.date ? (
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

      {hasSelectedClient && !hasTopContext ? (
        <Card variant="outlined" sx={{ borderColor: 'warning.light', bgcolor: 'rgba(245,158,11,0.03)' }}>
          <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Escolha um evento do calendario
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecione a data e o evento para guiar a producao do conteudo.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<IconCalendarEvent size={16} />}
                onClick={openCalendar}
                sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' }, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Abrir calendario
              </Button>
            </Stack>
          </CardContent>
        </Card>
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

      {/* Behavioral intent context banner — shown when brief was created from a behavioral copy */}
      {queryBehaviorIntentId && (() => {
        const campaign = clientCampaigns.find(c => c.id === queryCampaignId);
        const intent = campaign?.behavior_intents.find(bi => bi.id === queryBehaviorIntentId);
        if (!intent) return null;
        const AMD_COLORS: Record<string, string> = {
          salvar: '#7c3aed', compartilhar: '#2563eb', clicar: '#ea580c',
          responder: '#16a34a', marcar_alguem: '#0891b2', pedir_proposta: '#dc2626',
        };
        const amdColor = AMD_COLORS[intent.amd] ?? '#64748b';
        return (
          <Card variant="outlined" sx={{ borderLeft: `3px solid ${amdColor}`, bgcolor: `${amdColor}08`, mb: 0 }}>
            <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip size="small" label="Intent" sx={{ height: 16, fontSize: '0.58rem', bgcolor: amdColor, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }} />
                <Chip size="small" label={intent.amd} sx={{ height: 16, fontSize: '0.62rem', bgcolor: `${amdColor}22`, color: amdColor, fontWeight: 700 }} />
                <Chip size="small" label={intent.momento} sx={{ height: 16, fontSize: '0.62rem' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                  {intent.target_behavior}
                </Typography>
              </Stack>
              {intent.triggers.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} flexWrap="wrap">
                  {intent.triggers.map((t) => (
                    <Chip key={t} size="small" label={t} sx={{ height: 14, fontSize: '0.58rem', bgcolor: 'action.hover' }} />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        );
      })()}

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

      {/* Calendar Dialog */}
      <Dialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton size="small" onClick={() => navigateMonth(-1)} disabled={calendarLoading}>
                <IconChevronLeft size={18} />
              </IconButton>
              <Typography fontWeight={700} sx={{ minWidth: 180, textAlign: 'center', textTransform: 'capitalize' }}>
                {formatMonthLabel(calendarMonth)}
              </Typography>
              <IconButton size="small" onClick={() => navigateMonth(1)} disabled={calendarLoading}>
                <IconChevronRight size={18} />
              </IconButton>
            </Stack>
            <IconButton size="small" onClick={() => setCalendarOpen(false)}>
              <IconX size={18} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {calendarLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (() => {
            const [calYear, calMonthNum] = calendarMonth.split('-').map(Number);
            const daysInMonth = new Date(calYear, calMonthNum, 0).getDate();
            const firstWeekday = new Date(calYear, calMonthNum - 1, 1).getDay();
            const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
            const todayStr = new Date().toISOString().slice(0, 10);
            const WEEKDAYS_BR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

            return (
              <Box>
                {/* Weekday headers */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
                  {WEEKDAYS_BR.map((wd) => (
                    <Typography
                      key={wd}
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                      sx={{ textAlign: 'center', py: 0.5 }}
                    >
                      {wd}
                    </Typography>
                  ))}
                </Box>

                {/* Day cells */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25 }}>
                  {Array.from({ length: totalCells }, (_, i) => {
                    const dayNum = i - firstWeekday + 1;
                    if (dayNum < 1 || dayNum > daysInMonth) return <Box key={i} />;
                    const dateStr = `${calendarMonth}-${String(dayNum).padStart(2, '0')}`;
                    const dayEvents = calendarDays[dateStr] || [];
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDay;
                    const hasEvents = dayEvents.length > 0;
                    const maxScore = dayEvents.reduce((m: number, e: any) => Math.max(m, e.score ?? 0), 0);
                    const dotColor = hasEvents ? getRelevanceColor(maxScore) : 'transparent';

                    return (
                      <Box
                        key={i}
                        onClick={() => { setSelectedDay(isSelected ? '' : dateStr); setManualEventName(''); }}
                        sx={{
                          textAlign: 'center',
                          py: 0.75,
                          borderRadius: 1,
                          cursor: 'pointer',
                          bgcolor: isSelected
                            ? '#ff6600'
                            : isToday
                            ? 'rgba(255,102,0,0.12)'
                            : 'transparent',
                          color: isSelected ? '#fff' : 'text.primary',
                          '&:hover': { bgcolor: isSelected ? '#e65c00' : 'rgba(255,102,0,0.08)' },
                          transition: 'background 0.12s',
                        }}
                      >
                        <Typography variant="body2" fontWeight={isToday ? 700 : 400} lineHeight={1.2}>
                          {dayNum}
                        </Typography>
                        {hasEvents ? (
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              bgcolor: isSelected ? '#fff' : dotColor,
                              mx: 'auto',
                              mt: 0.25,
                            }}
                          />
                        ) : (
                          <Box sx={{ height: 5, mt: 0.25 }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>

                {/* Legend */}
                <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 1.5 }}>
                  {[
                    { color: '#22c55e', label: '75–100%' },
                    { color: '#f97316', label: '50–74%' },
                    { color: '#eab308', label: '25–49%' },
                    { color: '#94a3b8', label: '0–24%' },
                  ].map(({ color, label }) => (
                    <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                    </Stack>
                  ))}
                </Stack>

                {/* Events for selected day */}
                <Divider sx={{ mt: 1.5, mb: 1.5 }} />
                {selectedDay && (calendarDays[selectedDay] || []).length > 0 ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                      {new Date(`${selectedDay}T12:00:00`).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                      })}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {(calendarDays[selectedDay] || []).map((evt: any, idx: number) => (
                        <Card
                          key={evt.id || idx}
                          variant="outlined"
                          onClick={() => handleEventPick({ ...evt, date: selectedDay })}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { borderColor: '#ff6600', bgcolor: 'rgba(255,102,0,0.02)' },
                            transition: 'border-color 0.12s',
                          }}
                        >
                          <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <IconCalendarEvent size={16} color={getRelevanceColor(evt.score ?? 0)} />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {evt.name || evt.title || evt.event_name || 'Sem nome'}
                                </Typography>
                              </Box>
                              {evt.score != null ? (
                                <Chip
                                  size="small"
                                  label={`${Math.round(evt.score)}%`}
                                  sx={{
                                    bgcolor: getRelevanceColor(evt.score),
                                    color: '#fff',
                                    fontWeight: 700,
                                    minWidth: 44,
                                    fontSize: '0.72rem',
                                  }}
                                />
                              ) : null}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                ) : selectedDay ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Nenhum evento cadastrado para{' '}
                      {new Date(`${selectedDay}T12:00:00`).toLocaleDateString('pt-BR', {
                        weekday: 'long', day: '2-digit', month: 'long',
                      })}. Defina um evento manualmente:
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nome do evento"
                      placeholder="Ex: Dia do Cliente, Aniversário da empresa..."
                      value={manualEventName}
                      onChange={(e) => setManualEventName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualEventName.trim()) {
                          handleEventPick({ name: manualEventName.trim(), date: selectedDay });
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={!manualEventName.trim()}
                      onClick={() => handleEventPick({ name: manualEventName.trim(), date: selectedDay })}
                      sx={{ mt: 1, bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } }}
                    >
                      Usar esta data
                    </Button>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Clique em qualquer dia para ver os eventos ou definir um evento manualmente.
                  </Typography>
                )}
              </Box>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
