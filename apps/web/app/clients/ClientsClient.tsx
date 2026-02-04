'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiDelete, apiGet, apiPatch, apiPost, buildApiUrl } from '@/lib/api';

type ClientRow = {
  id: string;
  name: string;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  segment_primary?: string | null;
  segment_secondary?: string[] | null;
  reportei_account_id?: string | null;
  profile?: Record<string, any> | null;
  updated_at?: string | null;
};

type ConnectorRow = {
  provider: string;
  payload?: Record<string, any> | null;
  secrets_meta?: Record<string, any> | null;
  updated_at?: string | null;
};

type ClientInsight = {
  summary?: Record<string, any> | null;
  created_at?: string | null;
};

type ClientSource = {
  id: string;
  source_type: string;
  platform?: string | null;
  url: string;
  handle?: string | null;
  status: string;
  last_fetched_at?: string | null;
  last_content_at?: string | null;
};

type ReporteiKpi = {
  metric: string;
  value: number;
};

type ReporteiByFormat = {
  format: string;
  score: number;
  kpis?: ReporteiKpi[];
  notes?: string[];
};

type ReporteiByTag = {
  tag: string;
  score: number;
  kpis?: ReporteiKpi[];
};

type ReporteiPayload = {
  by_format?: ReporteiByFormat[];
  by_tag?: ReporteiByTag[];
  editorial_insights?: string[];
  observed_at?: string;
  window?: string;
};

type ReporteiInsight = {
  platform?: string;
  time_window?: string;
  created_at?: string;
  payload?: ReporteiPayload;
};

type ReporteiResponse = {
  items?: ReporteiInsight[];
  updated_at?: string | null;
};

type ClientForm = {
  id?: string;
  name: string;
  country: string;
  uf: string;
  city: string;
  segment_primary: string;
  segment_secondary_text: string;
  reportei_account_id: string;
  tone_profile: string;
  risk_tolerance: string;
  calendar_profile: {
    enable_calendar_total: boolean;
    calendar_weight: number;
    retail_mode: boolean;
    allow_cultural_opportunities: boolean;
    allow_geek_pop: boolean;
    allow_profession_days: boolean;
    restrict_sensitive_causes: boolean;
  };
  trend_profile: {
    enable_trends: boolean;
    trend_weight: number;
    sources_text: string;
  };
  keywords_text: string;
  pillars_text: string;
  knowledge: {
    website: string;
    description: string;
    audience: string;
    brand_promise: string;
    differentiators: string;
    socials: {
      instagram: string;
      facebook: string;
      linkedin: string;
      tiktok: string;
      youtube: string;
      x: string;
      other: string;
    };
    must_mentions_text: string;
    approved_terms_text: string;
    forbidden_claims_text: string;
    hashtags_text: string;
    notes: string;
  };
  platform_preferences_text: string;
};

const emptyForm = (): ClientForm => ({
  id: '',
  name: '',
  country: 'BR',
  uf: '',
  city: '',
  segment_primary: '',
  segment_secondary_text: '',
  reportei_account_id: '',
  tone_profile: '',
  risk_tolerance: '',
  calendar_profile: {
    enable_calendar_total: true,
    calendar_weight: 60,
    retail_mode: true,
    allow_cultural_opportunities: true,
    allow_geek_pop: true,
    allow_profession_days: true,
    restrict_sensitive_causes: false,
  },
  trend_profile: {
    enable_trends: false,
    trend_weight: 40,
    sources_text: '',
  },
  keywords_text: '',
  pillars_text: '',
  knowledge: {
    website: '',
    description: '',
    audience: '',
    brand_promise: '',
    differentiators: '',
    socials: {
      instagram: '',
      facebook: '',
      linkedin: '',
      tiktok: '',
      youtube: '',
      x: '',
      other: '',
    },
    must_mentions_text: '',
    approved_terms_text: '',
    forbidden_claims_text: '',
    hashtags_text: '',
    notes: '',
  },
  platform_preferences_text: '',
});

const trimList = (text: string) =>
  text
    .split(/[,;\n]/)
    .map((value) => value.trim())
    .filter(Boolean);

const normalizeNumber = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return value;
};

const KPI_LABELS: Record<string, string> = {
  impressions: 'Impressoes',
  reach: 'Alcance',
  engagements: 'Engajamentos',
  engagement_rate: 'Taxa de engajamento',
  clicks: 'Cliques',
  ctr: 'CTR',
  cpc: 'CPC',
  cpm: 'CPM',
  conversions: 'Conversoes',
  cost: 'Custo',
};

const RATE_METRICS = new Set(['ctr', 'engagement_rate']);
const CURRENCY_METRICS = new Set(['cpc', 'cpm', 'cost']);

const formatCurrency = (value?: number | null) => {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
};

const formatKpiValue = (metric: string, value: number) => {
  if (!Number.isFinite(value)) return '--';
  if (RATE_METRICS.has(metric)) {
    const display = value > 1 ? value : value * 100;
    return `${display.toFixed(2)}%`;
  }
  if (CURRENCY_METRICS.has(metric)) {
    return formatCurrency(value);
  }
  return new Intl.NumberFormat('pt-BR').format(Number(value));
};

const pickTop = <T extends { score?: number }>(items?: T[]) => {
  if (!items || items.length === 0) return null;
  return [...items].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))[0] || null;
};

const buildFormFromClient = (client: ClientRow): ClientForm => {
  const profile = client.profile || {};
  const calendarProfile = profile.calendar_profile || {};
  const trendProfile = profile.trend_profile || {};
  const knowledge = profile.knowledge_base || {};
  const socialProfiles = knowledge.social_profiles || knowledge.socials || {};

  return {
    id: client.id,
    name: client.name || '',
    country: client.country || 'BR',
    uf: client.uf || '',
    city: client.city || '',
    segment_primary: client.segment_primary || '',
    segment_secondary_text: (client.segment_secondary || profile.segment_secondary || []).join(', '),
    reportei_account_id: client.reportei_account_id || '',
    tone_profile: profile.tone_profile || '',
    risk_tolerance: profile.risk_tolerance || '',
    calendar_profile: {
      enable_calendar_total: calendarProfile.enable_calendar_total ?? true,
      calendar_weight: normalizeNumber(Number(calendarProfile.calendar_weight), 60),
      retail_mode: calendarProfile.retail_mode ?? true,
      allow_cultural_opportunities: calendarProfile.allow_cultural_opportunities ?? true,
      allow_geek_pop: calendarProfile.allow_geek_pop ?? true,
      allow_profession_days: calendarProfile.allow_profession_days ?? true,
      restrict_sensitive_causes: calendarProfile.restrict_sensitive_causes ?? false,
    },
    trend_profile: {
      enable_trends: trendProfile.enable_trends ?? false,
      trend_weight: normalizeNumber(Number(trendProfile.trend_weight), 40),
      sources_text: (trendProfile.sources || []).join(', '),
    },
    keywords_text: (profile.keywords || []).join(', '),
    pillars_text: (profile.pillars || []).join(', '),
    knowledge: {
      website: knowledge.website || '',
      description: knowledge.description || '',
      audience: knowledge.audience || '',
      brand_promise: knowledge.brand_promise || '',
      differentiators: knowledge.differentiators || '',
      socials: {
        instagram: socialProfiles.instagram || '',
        facebook: socialProfiles.facebook || '',
        linkedin: socialProfiles.linkedin || '',
        tiktok: socialProfiles.tiktok || '',
        youtube: socialProfiles.youtube || '',
        x: socialProfiles.x || '',
        other: socialProfiles.other || '',
      },
      must_mentions_text: (knowledge.must_mentions || []).join(', '),
      approved_terms_text: (knowledge.approved_terms || []).join(', '),
      forbidden_claims_text: (knowledge.forbidden_claims || []).join(', '),
      hashtags_text: (knowledge.hashtags || []).join(', '),
      notes: knowledge.notes || '',
    },
    platform_preferences_text: profile.platform_preferences
      ? JSON.stringify(profile.platform_preferences, null, 2)
      : '',
  };
};

export default function ClientsClient({ clientId, noShell }: { clientId?: string; noShell?: boolean }) {
  const searchParams = useSearchParams();
  const urlClientId = searchParams?.get('clientId') || '';
  const lockedClientId = clientId || urlClientId;
  const isLocked = Boolean(clientId);
  const urlNew = searchParams?.get('new') === '1';
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(() => emptyForm());
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [connectorProvider, setConnectorProvider] = useState('reportei');
  const [connectorPayload, setConnectorPayload] = useState('');
  const [connectorSecrets, setConnectorSecrets] = useState('');
  const [connectorSaving, setConnectorSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planMissing, setPlanMissing] = useState<string[]>([]);
  const [intel, setIntel] = useState<ClientInsight | null>(null);
  const [intelSources, setIntelSources] = useState<ClientSource[]>([]);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelActionLoading, setIntelActionLoading] = useState(false);
  const [intelError, setIntelError] = useState('');
  const [bulkIntelLoading, setBulkIntelLoading] = useState(false);
  const [reporteiItems, setReporteiItems] = useState<ReporteiInsight[]>([]);
  const [reporteiUpdatedAt, setReporteiUpdatedAt] = useState<string | null>(null);
  const [reporteiLoading, setReporteiLoading] = useState(false);
  const [reporteiError, setReporteiError] = useState('');
  const [reporteiSyncing, setReporteiSyncing] = useState(false);
  const [reporteiSyncStatus, setReporteiSyncStatus] = useState('');
  const [autoIntelRefresh, setAutoIntelRefresh] = useState(true);
  const intelRef = useRef<HTMLDivElement | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClientRow[]>('/clients');
      setClients(response || []);
      if (response?.length && !selectedId && !isNew && !lockedClientId && !urlNew) {
        setSelectedId(response[0].id);
        setForm(buildFormFromClient(response[0]));
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, [selectedId, isNew, lockedClientId, urlNew]);

  const loadIntelligence = useCallback(async (clientId: string) => {
    setIntelLoading(true);
    setIntelError('');
    try {
      const response = await apiGet<{ insight: ClientInsight | null; sources: ClientSource[] }>(
        `/clients/${clientId}/intelligence`
      );
      setIntel(response?.insight ?? null);
      setIntelSources(response?.sources ?? []);
    } catch (err: any) {
      setIntelError(err?.message || 'Falha ao carregar inteligência.');
      setIntel(null);
      setIntelSources([]);
    } finally {
      setIntelLoading(false);
    }
  }, []);

  const loadClientDetail = useCallback(async (clientId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClientRow>(`/clients/${clientId}`);
      setForm(buildFormFromClient(response));
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar cliente.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConnectors = useCallback(async (clientId: string) => {
    try {
      const response = await apiGet<ConnectorRow[]>(`/clients/${clientId}/connectors`);
      setConnectors(response || []);
    } catch {
      setConnectors([]);
    }
  }, []);

  const loadReportei = useCallback(async (clientId: string) => {
    setReporteiLoading(true);
    setReporteiError('');
    try {
      const response = await apiGet<ReporteiResponse>(`/clients/${clientId}/insights/reportei`);
      setReporteiItems(response?.items || []);
      setReporteiUpdatedAt(response?.updated_at || null);
    } catch (err: any) {
      setReporteiItems([]);
      setReporteiUpdatedAt(null);
      setReporteiError(err?.message || 'Falha ao carregar Reportei.');
    } finally {
      setReporteiLoading(false);
    }
  }, []);

  const syncReportei = useCallback(async () => {
    if (!selectedId) return;
    setReporteiSyncing(true);
    setReporteiSyncStatus('');
    try {
      await apiPost(`/clients/${selectedId}/insights/reportei/sync`, {});
      await loadReportei(selectedId);
      setReporteiSyncStatus('Reportei atualizado com sucesso.');
    } catch (err: any) {
      setReporteiSyncStatus(err?.message || 'Falha ao sincronizar Reportei.');
    } finally {
      setReporteiSyncing(false);
    }
  }, [selectedId, loadReportei]);

  const syncIntelSources = useCallback(async (clientId: string) => {
    setIntelActionLoading(true);
    setIntelError('');
    try {
      const response = await apiPost<{ sources: ClientSource[] }>(
        `/clients/${clientId}/sources/sync`,
        {}
      );
      if (response?.sources) setIntelSources(response.sources);
    } catch (err: any) {
      setIntelError(err?.message || 'Falha ao sincronizar fontes.');
    } finally {
      setIntelActionLoading(false);
    }
  }, []);

  const refreshIntelligence = useCallback(async (clientId: string) => {
    setIntelActionLoading(true);
    setIntelError('');
    try {
      const response = await apiPost<{ insight?: ClientInsight; queued?: boolean }>(
        `/clients/${clientId}/intelligence/refresh`,
        {}
      );
      if (response?.insight) setIntel(response.insight);
      if (response?.queued) {
        setSuccess('Atualização iniciada. Isso pode levar alguns segundos.');
        setTimeout(() => loadIntelligence(clientId), 4000);
      }
    } catch (err: any) {
      setIntelError(err?.message || 'Falha ao atualizar inteligência.');
    } finally {
      setIntelActionLoading(false);
    }
  }, []);

  const refreshAllIntelligence = useCallback(async () => {
    setBulkIntelLoading(true);
    setIntelError('');
    try {
      const response = await apiPost<{ queued?: boolean; total?: number }>(
        '/clients/intelligence/refresh-all',
        {}
      );
      if (response?.queued) {
        const totalLabel = response.total ? ` (${response.total} clientes)` : '';
        setSuccess(`Atualização em lote iniciada${totalLabel}.`);
      }
    } catch (err: any) {
      setIntelError(err?.message || 'Falha ao atualizar inteligência em lote.');
    } finally {
      setBulkIntelLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLocked && lockedClientId) {
      setIsNew(false);
      setSelectedId(lockedClientId);
      return;
    }
    loadClients();
  }, [isLocked, lockedClientId, loadClients]);

  useEffect(() => {
    if (isLocked) return;
    if (urlNew) {
      setIsNew(true);
      setSelectedId(null);
      setForm(emptyForm());
      setConnectors([]);
      return;
    }
    if (urlClientId) {
      setIsNew(false);
      setSelectedId(urlClientId);
    }
  }, [isLocked, urlClientId, urlNew]);

  useEffect(() => {
    setReporteiSyncStatus('');
    setReporteiSyncing(false);
    if (selectedId) {
      loadClientDetail(selectedId);
      loadConnectors(selectedId);
      loadIntelligence(selectedId);
      loadReportei(selectedId);
    } else {
      setConnectors([]);
      setIntel(null);
      setIntelSources([]);
      setReporteiItems([]);
      setReporteiUpdatedAt(null);
      setReporteiError('');
    }
  }, [selectedId, loadClientDetail, loadConnectors, loadIntelligence, loadReportei]);

  const filteredClients = useMemo(() => {
    if (!filter.trim()) return clients;
    const query = filter.toLowerCase();
    return clients.filter((client) => client.name.toLowerCase().includes(query));
  }, [clients, filter]);

  const handleSelectClient = (clientId: string) => {
    setIsNew(false);
    setSelectedId(clientId);
  };

  const handleNewClient = () => {
    setIsNew(true);
    setSelectedId(null);
    setForm(emptyForm());
    setConnectors([]);
  };

  const updateForm = (patch: Partial<ClientForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const updateCalendar = (patch: Partial<ClientForm['calendar_profile']>) => {
    setForm((prev) => ({
      ...prev,
      calendar_profile: { ...prev.calendar_profile, ...patch },
    }));
  };

  const updateTrend = (patch: Partial<ClientForm['trend_profile']>) => {
    setForm((prev) => ({
      ...prev,
      trend_profile: { ...prev.trend_profile, ...patch },
    }));
  };

  const updateKnowledge = (patch: Partial<ClientForm['knowledge']>) => {
    setForm((prev) => ({
      ...prev,
      knowledge: { ...prev.knowledge, ...patch },
    }));
  };

  const updateSocials = (patch: Partial<ClientForm['knowledge']['socials']>) => {
    setForm((prev) => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        socials: { ...prev.knowledge.socials, ...patch },
      },
    }));
  };

  const applyExtractedPlan = (payload: any) => {
    if (!payload) return;
    setForm((prev) => {
      const next = { ...prev };
      if (!next.name && payload.name) next.name = payload.name;
      if (!next.segment_primary && payload.segment_primary) next.segment_primary = payload.segment_primary;
      if (!next.country && payload.country) next.country = payload.country;
      if (!next.uf && payload.uf) next.uf = payload.uf;
      if (!next.city && payload.city) next.city = payload.city;

      if (!next.segment_secondary_text && payload.segment_secondary?.length) {
        next.segment_secondary_text = payload.segment_secondary.join(', ');
      }

      if (!next.keywords_text && payload.keywords?.length) {
        next.keywords_text = payload.keywords.join(', ');
      }
      if (!next.pillars_text && payload.pillars?.length) {
        next.pillars_text = payload.pillars.join(', ');
      }

      if (!next.knowledge.website && payload.website) next.knowledge.website = payload.website;
      if (!next.knowledge.description && payload.description) next.knowledge.description = payload.description;
      if (!next.knowledge.audience && payload.audience) next.knowledge.audience = payload.audience;
      if (!next.knowledge.brand_promise && payload.brand_promise)
        next.knowledge.brand_promise = payload.brand_promise;
      if (!next.knowledge.differentiators && payload.differentiators)
        next.knowledge.differentiators = payload.differentiators;

      const socials = payload.social_profiles || {};
      if (!next.knowledge.socials.instagram && socials.instagram) next.knowledge.socials.instagram = socials.instagram;
      if (!next.knowledge.socials.facebook && socials.facebook) next.knowledge.socials.facebook = socials.facebook;
      if (!next.knowledge.socials.linkedin && socials.linkedin) next.knowledge.socials.linkedin = socials.linkedin;
      if (!next.knowledge.socials.tiktok && socials.tiktok) next.knowledge.socials.tiktok = socials.tiktok;
      if (!next.knowledge.socials.youtube && socials.youtube) next.knowledge.socials.youtube = socials.youtube;
      if (!next.knowledge.socials.x && socials.x) next.knowledge.socials.x = socials.x;
      if (!next.knowledge.socials.other && socials.other) next.knowledge.socials.other = socials.other;

      if (!next.knowledge.notes && payload.notes) next.knowledge.notes = payload.notes;
      return next;
    });
  };

  const analyzePlanFile = async () => {
    if (!planFile) {
      setError('Selecione um arquivo antes de analisar.');
      return;
    }
    setPlanLoading(true);
    setError('');
    setSuccess('');
    setPlanMissing([]);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
      const formData = new FormData();
      formData.append('file', planFile);

      const response = await fetch(buildApiUrl('/clients/plan/analyze'), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Falha ao analisar planejamento.');
      }

      applyExtractedPlan(data.extracted);
      setPlanMissing(Array.isArray(data.missing_fields) ? data.missing_fields : []);
      setSuccess('Planejamento analisado e campos preenchidos.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao analisar planejamento.');
    } finally {
      setPlanLoading(false);
    }
  };

  const missingLabels: Record<string, string> = {
    name: 'Nome do cliente',
    segment_primary: 'Segmento primário',
    website: 'Site oficial',
    description: 'Descrição da marca',
    audience: 'Público-alvo',
    brand_promise: 'Proposta de valor',
    differentiators: 'Diferenciais competitivos',
    keywords: 'Keywords (Radar)',
    pillars: 'Pillars (Radar)',
    social_profiles: 'Redes sociais',
  };

  const buildPayload = () => {
    const platformPreferences = form.platform_preferences_text.trim();
    let platform_preferences: Record<string, any> | undefined;
    if (platformPreferences) {
      try {
        platform_preferences = JSON.parse(platformPreferences);
      } catch {
        throw new Error('JSON inválido em Preferências de Plataforma.');
      }
    }

    const knowledge_base: Record<string, any> = {};
    if (form.knowledge.website) knowledge_base.website = form.knowledge.website;
    if (form.knowledge.description) knowledge_base.description = form.knowledge.description;
    if (form.knowledge.audience) knowledge_base.audience = form.knowledge.audience;
    if (form.knowledge.brand_promise) knowledge_base.brand_promise = form.knowledge.brand_promise;
    if (form.knowledge.differentiators) knowledge_base.differentiators = form.knowledge.differentiators;

    const socials = {
      instagram: form.knowledge.socials.instagram.trim(),
      facebook: form.knowledge.socials.facebook.trim(),
      linkedin: form.knowledge.socials.linkedin.trim(),
      tiktok: form.knowledge.socials.tiktok.trim(),
      youtube: form.knowledge.socials.youtube.trim(),
      x: form.knowledge.socials.x.trim(),
      other: form.knowledge.socials.other.trim(),
    };
    const hasSocials = Object.values(socials).some((value) => value);
    if (hasSocials) knowledge_base.social_profiles = socials;

    const mustMentions = trimList(form.knowledge.must_mentions_text);
    if (mustMentions.length) knowledge_base.must_mentions = mustMentions;
    const approvedTerms = trimList(form.knowledge.approved_terms_text);
    if (approvedTerms.length) knowledge_base.approved_terms = approvedTerms;
    const forbiddenClaims = trimList(form.knowledge.forbidden_claims_text);
    if (forbiddenClaims.length) knowledge_base.forbidden_claims = forbiddenClaims;
    const hashtags = trimList(form.knowledge.hashtags_text);
    if (hashtags.length) knowledge_base.hashtags = hashtags;
    if (form.knowledge.notes) knowledge_base.notes = form.knowledge.notes;

    return {
      id: form.id?.trim() || undefined,
      name: form.name.trim(),
      country: form.country.trim() || undefined,
      uf: form.uf.trim() || null,
      city: form.city.trim() || null,
      segment_primary: form.segment_primary.trim(),
      segment_secondary: trimList(form.segment_secondary_text),
      reportei_account_id: form.reportei_account_id.trim() || null,
      tone_profile: form.tone_profile || undefined,
      risk_tolerance: form.risk_tolerance || undefined,
      calendar_profile: {
        ...form.calendar_profile,
        calendar_weight: Number(form.calendar_profile.calendar_weight),
      },
      trend_profile: {
        enable_trends: form.trend_profile.enable_trends,
        trend_weight: Number(form.trend_profile.trend_weight),
        sources: trimList(form.trend_profile.sources_text),
      },
      platform_preferences,
      keywords: trimList(form.keywords_text),
      pillars: trimList(form.pillars_text),
      knowledge_base: Object.keys(knowledge_base).length ? knowledge_base : undefined,
    };
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Informe o nome do cliente.');
      return;
    }
    if (!form.segment_primary.trim()) {
      setError('Informe o segmento primário.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = buildPayload();
      if (isNew) {
        const created = await apiPost<ClientRow>('/clients', payload);
        setSuccess('Cliente criado com sucesso.');
        setIsNew(false);
        setSelectedId(created.id);
        await loadClients();
        if (autoIntelRefresh) {
          await syncIntelSources(created.id);
          await refreshIntelligence(created.id);
        }
      } else if (selectedId) {
        const updated = await apiPatch<ClientRow>(`/clients/${selectedId}`, payload);
        setSuccess('Cliente atualizado.');
        setForm(buildFormFromClient(updated));
        await loadClients();
        if (autoIntelRefresh) {
          await syncIntelSources(selectedId);
          await refreshIntelligence(selectedId);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const confirmed = window.confirm(
      'Excluir este cliente? Essa ação remove calendários, conectores e dados associados.'
    );
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await apiDelete(`/clients/${selectedId}`);
      setSuccess('Cliente excluído.');
      setSelectedId(null);
      setForm(emptyForm());
      await loadClients();
    } catch (err: any) {
      setError(err?.message || 'Falha ao excluir cliente.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveConnector = async () => {
    if (!selectedId) return;
    setConnectorSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = connectorPayload.trim();
      const secrets = connectorSecrets.trim();
      const body: Record<string, any> = {};

      if (payload) {
        try {
          body.payload = JSON.parse(payload);
        } catch {
          throw new Error('JSON inválido no payload do conector.');
        }
      }

      if (secrets) {
        try {
          body.secrets = JSON.parse(secrets);
        } catch {
          throw new Error('JSON inválido nos secrets do conector.');
        }
      }

      await apiPost(`/clients/${selectedId}/connectors/${connectorProvider}`, body);
      setConnectorPayload('');
      setConnectorSecrets('');
      setSuccess('Conector salvo.');
      await loadConnectors(selectedId);
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar conector.');
    } finally {
      setConnectorSaving(false);
    }
  };

  const parseSummary = (summary: any): Record<string, any> => {
    if (!summary) return {};
    const parseJson = (text: string) => {
      const trimmed = text.trim();
      try {
        return JSON.parse(trimmed);
      } catch {
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
          try {
            return JSON.parse(trimmed.slice(start, end + 1));
          } catch {
            return null;
          }
        }
        return null;
      }
    };
    if (typeof summary === 'string') {
      const parsed = parseJson(summary);
      return parsed || { summary_text: summary };
    }
    if (typeof summary === 'object') {
      const summaryText = typeof summary.summary_text === 'string' ? summary.summary_text : '';
      const parsed = summaryText ? parseJson(summaryText) : null;
      if (parsed) {
        return { ...summary, ...parsed, summary_text: parsed.summary_text || summaryText };
      }
      return summary;
    }
    return {};
  };

  const intelSummary = useMemo(() => parseSummary(intel?.summary), [intel?.summary]);
  const lastIntelUpdate = intel?.created_at ? new Date(intel.created_at) : null;
  const lastFetchedAt = useMemo(() => {
    const timestamps = intelSources
      .map((source) => (source.last_fetched_at ? new Date(source.last_fetched_at).getTime() : 0))
      .filter((time) => Number.isFinite(time) && time > 0);
    if (!timestamps.length) return null;
    return new Date(Math.max(...timestamps));
  }, [intelSources]);
  const activeSources = useMemo(
    () => intelSources.filter((source) => source.status === 'active').length,
    [intelSources]
  );
  const reporteiConnector = useMemo(
    () => connectors.find((connector) => connector.provider === 'reportei') || null,
    [connectors]
  );
  const reporteiDashboardUrl = useMemo(() => {
    const payload = reporteiConnector?.payload || {};
    const companyId =
      payload.reportei_company_id || payload.company_id || payload.reporteiCompanyId || payload.companyId;
    const explicitUrl =
      payload.reportei_dashboard_url || payload.dashboard_url || payload.reporteiDashboardUrl || payload.dashboardUrl;
    if (explicitUrl) return String(explicitUrl);
    if (companyId) return `https://app.reportei.com/company/${companyId}`;
    return '';
  }, [reporteiConnector]);
  const reporteiEmbedUrl = useMemo(() => {
    const payload = reporteiConnector?.payload || {};
    const explicit =
      payload.reportei_embed_url || payload.embed_url || payload.reporteiEmbedUrl || payload.embedUrl;
    return explicit ? String(explicit) : reporteiDashboardUrl;
  }, [reporteiConnector, reporteiDashboardUrl]);
  const reporteiAccountId = useMemo(() => {
    const payload = reporteiConnector?.payload || {};
    return (
      payload.reportei_account_id ||
      payload.account_id ||
      payload.id ||
      form.reportei_account_id ||
      ''
    );
  }, [reporteiConnector, form.reportei_account_id]);
  const hasReporteiAccount = Boolean(reporteiAccountId);
  const formatList = (value: any) => {
    if (!value) return '';
    if (Array.isArray(value)) {
      return value.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
    }
    return String(value);
  };
  const scrollToIntelligence = () => {
    if (!intelRef.current) return;
    intelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const handleOpenClient = () => {
    if (!selectedId || typeof window === 'undefined') return;
    window.location.href = `/clients/${selectedId}`;
  };

  if (loading && clients.length === 0 && !isNew) {
    return (
      <div className="loading-screen">
        <div className="pulse">Carregando clientes...</div>
      </div>
    );
  }

  const content = (
    <div className="page-content">
        {error ? <div className="notice error">{error}</div> : null}
        {success ? <div className="notice success">{success}</div> : null}
        {planMissing.length ? (
          <div className="notice error">
            Informações faltando: {planMissing.map((key) => missingLabels[key] || key).join(', ')}.
          </div>
        ) : null}

        <div className="panel-grid" style={isLocked ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
          {!isLocked ? (
            <aside className="panel-sidebar">
              <div className="toolbar">
                <input
                  className="edro-input"
                  placeholder="Buscar cliente"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
                <button
                  className="btn ghost"
                  type="button"
                  onClick={refreshAllIntelligence}
                  disabled={bulkIntelLoading}
                >
                  {bulkIntelLoading ? 'Atualizando...' : 'Atualizar todos'}
                </button>
                <button className="btn primary" type="button" onClick={handleNewClient}>
                  Novo
                </button>
              </div>
              <div className="panel-list">
                {filteredClients.length === 0 ? (
                  <div className="empty">Nenhum cliente cadastrado.</div>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className={`panel-item ${client.id === selectedId && !isNew ? 'active' : ''}`}
                      onClick={() => handleSelectClient(client.id)}
                    >
                      <strong>{client.name}</strong>
                      <span>{client.segment_primary || 'Sem segmento'}</span>
                    </button>
                  ))
                )}
              </div>
            </aside>
          ) : null}

          <section className="panel-main">
            <div className="card">
              <div className="card-top">
                <span className="badge">Resumo do cliente</span>
                <div className="form-actions">
                  <button className="btn ghost" type="button" onClick={handleOpenClient} disabled={!selectedId}>
                    Ver cliente
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => selectedId && (window.location.href = `/clients/${selectedId}/insights`)}
                    disabled={!selectedId}
                  >
                    Insights
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => selectedId && (window.location.href = `/social-listening?clientId=${selectedId}`)}
                    disabled={!selectedId}
                  >
                    Social Listening
                  </button>
                  <button className="btn ghost" type="button" onClick={scrollToIntelligence} disabled={!selectedId}>
                    Ver inteligência
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => selectedId && (window.location.href = `/clients/${selectedId}/connectors`)}
                    disabled={!selectedId}
                  >
                    🔌 Manage Integrations
                  </button>
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  Cliente
                  <div className="field-static">{form.name || selectedId || '—'}</div>
                </div>
                <div className="field">
                  Segmento
                  <div className="field-static">{form.segment_primary || '—'}</div>
                </div>
                <div className="field">
                  Local
                  <div className="field-static">
                    {[form.city, form.uf].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <div className="field">
                  Inteligência atualizada
                  <div className="field-static">
                    {lastIntelUpdate ? lastIntelUpdate.toLocaleString('pt-BR') : 'Sem atualização'}
                  </div>
                </div>
                <div className="field">
                  Última coleta
                  <div className="field-static">
                    {lastFetchedAt ? lastFetchedAt.toLocaleString('pt-BR') : 'Sem coleta'}
                  </div>
                </div>
                <div className="field">
                  Fontes
                  <div className="field-static">
                    {intelSources.length ? `${activeSources} ativas / ${intelSources.length}` : '0'}
                  </div>
                </div>
              </div>
            </div>
            {selectedId ? (
              <div className="card">
                <div className="card-top flex items-center justify-between">
                  <span className="badge">Reportei Performance</span>
                  <span className="text-xs text-muted">
                    {reporteiUpdatedAt
                      ? `Atualizado em ${new Date(reporteiUpdatedAt).toLocaleDateString('pt-BR')}`
                      : 'Sem atualizacao recente'}
                  </span>
                </div>

                {reporteiError ? <div className="notice error">{reporteiError}</div> : null}

                {reporteiLoading ? (
                  <div className="empty">Carregando dados do Reportei...</div>
                ) : reporteiItems.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {reporteiItems.map((item, index) => {
                      const payload = item.payload || {};
                      const topFormat = pickTop(payload.by_format);
                      const topTag = pickTop(payload.by_tag);
                      const kpis = (topFormat?.kpis?.length ? topFormat.kpis : topTag?.kpis || []).slice(0, 4);
                      const editorial = (payload.editorial_insights || []).slice(0, 3);

                      return (
                        <div key={item.platform || `reportei-${index}`} className="copy-block">
                          <div className="card-title">
                            <h3>{item.platform || 'Plataforma'}</h3>
                            <span className="status">{item.time_window || '30d'}</span>
                          </div>

                          <div className="space-y-2 text-sm text-muted">
                            <div className="flex items-center justify-between">
                              <span>Top formato</span>
                              <strong className="text-ink">
                                {topFormat?.format || 'N/A'}{' '}
                                {topFormat?.score != null ? `(${Math.round(topFormat.score)})` : ''}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Top tag</span>
                              <strong className="text-ink">
                                {topTag?.tag || 'N/A'} {topTag?.score != null ? `(${Math.round(topTag.score)})` : ''}
                              </strong>
                            </div>
                          </div>

                          {kpis.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {kpis.map((kpi) => (
                                <span key={`${item.platform}-${kpi.metric}`} className="chip">
                                  {KPI_LABELS[kpi.metric] || kpi.metric}: {formatKpiValue(kpi.metric, kpi.value)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 text-xs text-muted">Sem KPIs disponiveis.</div>
                          )}

                          {editorial.length ? (
                            <div className="mt-3 text-xs text-muted">
                              <strong className="text-ink">Insights:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                {editorial.map((line, idx) => (
                                  <li key={`${item.platform}-insight-${idx}`}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty">Sem dados do Reportei para este cliente.</div>
                )}
              </div>
              ) : null}
              {selectedId ? (
                <div className="card">
                  <div className="card-top flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="badge">Reportei Dashboard</span>
                      {reporteiUpdatedAt ? (
                        <span className="text-xs text-muted">
                          Atualizado em {new Date(reporteiUpdatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Sem atualização recente</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {reporteiDashboardUrl ? (
                        <a
                          className="btn outline"
                          href={reporteiDashboardUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir no Reportei
                        </a>
                      ) : null}
                      <button
                        className="btn primary"
                        type="button"
                        onClick={syncReportei}
                        disabled={reporteiSyncing || !hasReporteiAccount}
                      >
                        {reporteiSyncing ? 'Sincronizando...' : 'Atualizar dados'}
                      </button>
                    </div>
                  </div>

                  {reporteiSyncStatus ? (
                    <div
                      className={`notice ${
                        reporteiSyncStatus.toLowerCase().includes('falha') ? 'error' : 'success'
                      }`}
                    >
                      {reporteiSyncStatus}
                    </div>
                  ) : null}

                  {reporteiEmbedUrl ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted">
                        Se o embed não carregar, use o botão “Abrir no Reportei”.
                      </div>
                      <iframe
                        title="Reportei Dashboard"
                        src={reporteiEmbedUrl}
                        className="w-full h-[520px] rounded-2xl border border-border bg-paper"
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    </div>
                  ) : (
                    <div className="empty">
                      Configure o link do dashboard do Reportei em “Integrações” para exibir aqui.
                    </div>
                  )}
                </div>
              ) : null}
              <div className="card">
                <div className="card-top">
                  <span className="badge">Planejamento Estratégico</span>
                  <span className="badge outline">Upload + IA</span>
              </div>
              <div className="form-grid">
                <label className="field full">
                  Arquivo (PDF, DOCX ou TXT)
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(event) => setPlanFile(event.target.files?.[0] || null)}
                  />
                </label>
                <div className="form-actions">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={analyzePlanFile}
                    disabled={planLoading}
                  >
                    {planLoading ? 'Analisando...' : 'Analisar e preencher'}
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Dados Corporativos</span>
                <span className="badge outline">{isNew ? 'Novo cliente' : form.name || 'Cliente'}</span>
              </div>
              <div className="form-grid">
                <label className="field">
                  Nome do cliente
                  <input
                    value={form.name}
                    onChange={(event) => updateForm({ name: event.target.value })}
                    placeholder="Nome oficial"
                  />
                </label>
                <label className="field">
                  ID (opcional)
                  <input
                    value={form.id || ''}
                    onChange={(event) => updateForm({ id: event.target.value })}
                    placeholder="cli_nome_0000"
                  />
                </label>
                <label className="field">
                  Segmento primário
                  <input
                    value={form.segment_primary}
                    onChange={(event) => updateForm({ segment_primary: event.target.value })}
                    placeholder="Segmento principal"
                  />
                </label>
                <label className="field">
                  Segmentos secundários
                  <input
                    value={form.segment_secondary_text}
                    onChange={(event) => updateForm({ segment_secondary_text: event.target.value })}
                    placeholder="Ex: varejo, mobilidade, saúde"
                  />
                </label>
                <label className="field">
                  País
                  <input
                    value={form.country}
                    onChange={(event) => updateForm({ country: event.target.value })}
                    placeholder="BR"
                  />
                </label>
                <label className="field">
                  UF
                  <input value={form.uf} onChange={(event) => updateForm({ uf: event.target.value })} />
                </label>
                <label className="field">
                  Cidade
                  <input value={form.city} onChange={(event) => updateForm({ city: event.target.value })} />
                </label>
                <label className="field">
                  Reportei Account ID
                  <input
                    value={form.reportei_account_id}
                    onChange={(event) => updateForm({ reportei_account_id: event.target.value })}
                    placeholder="ID da conta Reportei"
                  />
                </label>
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Perfil de Comunicação</span>
              </div>
              <div className="form-grid">
                <label className="field">
                  Site oficial
                  <input
                    value={form.knowledge.website}
                    onChange={(event) => updateKnowledge({ website: event.target.value })}
                    placeholder="https://cliente.com.br"
                  />
                </label>
                <label className="field">
                  Tom de voz
                  <select
                    value={form.tone_profile}
                    onChange={(event) => updateForm({ tone_profile: event.target.value })}
                  >
                    <option value="">Selecione</option>
                    <option value="conservative">Conservador</option>
                    <option value="balanced">Equilibrado</option>
                    <option value="bold">Ousado</option>
                  </select>
                </label>
                <label className="field">
                  Tolerância a risco
                  <select
                    value={form.risk_tolerance}
                    onChange={(event) => updateForm({ risk_tolerance: event.target.value })}
                  >
                    <option value="">Selecione</option>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </label>
                <label className="field">
                  Público-alvo
                  <input
                    value={form.knowledge.audience}
                    onChange={(event) => updateKnowledge({ audience: event.target.value })}
                    placeholder="Quem precisa ouvir essa marca"
                  />
                </label>
                <label className="field">
                  Proposta de valor
                  <input
                    value={form.knowledge.brand_promise}
                    onChange={(event) => updateKnowledge({ brand_promise: event.target.value })}
                    placeholder="O que a marca promete entregar"
                  />
                </label>
                <label className="field full">
                  Descrição da marca
                  <textarea
                    value={form.knowledge.description}
                    onChange={(event) => updateKnowledge({ description: event.target.value })}
                    rows={3}
                  />
                </label>
                <label className="field full">
                  Diferenciais competitivos
                  <textarea
                    value={form.knowledge.differentiators}
                    onChange={(event) => updateKnowledge({ differentiators: event.target.value })}
                    rows={2}
                  />
                </label>
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Presença Digital</span>
              </div>
              <div className="form-grid">
                <label className="field">
                  Instagram
                  <input
                    value={form.knowledge.socials.instagram}
                    onChange={(event) => updateSocials({ instagram: event.target.value })}
                    placeholder="@cliente ou URL"
                  />
                </label>
                <label className="field">
                  Facebook
                  <input
                    value={form.knowledge.socials.facebook}
                    onChange={(event) => updateSocials({ facebook: event.target.value })}
                    placeholder="URL da página"
                  />
                </label>
                <label className="field">
                  LinkedIn
                  <input
                    value={form.knowledge.socials.linkedin}
                    onChange={(event) => updateSocials({ linkedin: event.target.value })}
                    placeholder="URL da empresa"
                  />
                </label>
                <label className="field">
                  TikTok
                  <input
                    value={form.knowledge.socials.tiktok}
                    onChange={(event) => updateSocials({ tiktok: event.target.value })}
                    placeholder="@cliente ou URL"
                  />
                </label>
                <label className="field">
                  YouTube
                  <input
                    value={form.knowledge.socials.youtube}
                    onChange={(event) => updateSocials({ youtube: event.target.value })}
                    placeholder="URL do canal"
                  />
                </label>
                <label className="field">
                  X (Twitter)
                  <input
                    value={form.knowledge.socials.x}
                    onChange={(event) => updateSocials({ x: event.target.value })}
                    placeholder="@cliente ou URL"
                  />
                </label>
                <label className="field full">
                  Outras redes
                  <input
                    value={form.knowledge.socials.other}
                    onChange={(event) => updateSocials({ other: event.target.value })}
                    placeholder="Ex: WhatsApp, Threads, Pinterest, etc."
                  />
                </label>
              </div>
            </div>

            <div className="card" ref={intelRef}>
              <div className="card-top">
                <span className="badge">Inteligência automática</span>
              </div>
              {!selectedId ? (
                <div className="empty">Salve o cliente para habilitar a inteligência.</div>
              ) : (
                <>
                  {intelError ? <div className="notice error">{intelError}</div> : null}
                  <div className="form-actions">
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => selectedId && syncIntelSources(selectedId)}
                      disabled={intelActionLoading || intelLoading}
                    >
                      {intelActionLoading ? 'Sincronizando...' : 'Sincronizar fontes'}
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => selectedId && refreshIntelligence(selectedId)}
                      disabled={intelActionLoading || intelLoading}
                    >
                      {intelActionLoading ? 'Atualizando...' : 'Atualizar inteligência'}
                    </button>
                    <label className="field checkbox">
                      <input
                        type="checkbox"
                        checked={autoIntelRefresh}
                        onChange={(event) => setAutoIntelRefresh(event.target.checked)}
                      />
                      Atualizar ao salvar
                    </label>
                  </div>

                  <div className="detail-list">
                    <div className="copy-block">
                      <div className="card-title">
                        <h3>Resumo IA</h3>
                        <span className="status">
                          {intel?.created_at
                            ? new Date(intel.created_at).toLocaleString()
                            : 'Sem atualização'}
                        </span>
                      </div>
                      <p className="card-text">
                        {intelSummary.summary_text || 'Nenhum resumo disponível ainda.'}
                      </p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      Indústria
                      <div className="field-static">{intelSummary.industry || '-'}</div>
                    </div>
                    <div className="field">
                      Negócio
                      <div className="field-static">{intelSummary.business || '-'}</div>
                    </div>
                    <div className="field">
                      Posicionamento
                      <div className="field-static">{intelSummary.positioning || '-'}</div>
                    </div>
                    <div className="field">
                      Territórios
                      <div className="field-static">{formatList(intelSummary.territories) || '-'}</div>
                    </div>
                    <div className="field">
                      Canais
                      <div className="field-static">{formatList(intelSummary.channels) || '-'}</div>
                    </div>
                    <div className="field">
                      Produtos
                      <div className="field-static">{formatList(intelSummary.products) || '-'}</div>
                    </div>
                    <div className="field">
                      Serviços
                      <div className="field-static">{formatList(intelSummary.services) || '-'}</div>
                    </div>
                    <div className="field">
                      Personas
                      <div className="field-static">{formatList(intelSummary.personas) || '-'}</div>
                    </div>
                    <div className="field">
                      Concorrentes
                      <div className="field-static">{formatList(intelSummary.competitors) || '-'}</div>
                    </div>
                    <div className="field">
                      Oportunidades
                      <div className="field-static">{formatList(intelSummary.opportunities) || '-'}</div>
                    </div>
                    <div className="field">
                      Riscos
                      <div className="field-static">{formatList(intelSummary.risks) || '-'}</div>
                    </div>
                  </div>

                  <div className="detail-list">
                    <div className="card-title">
                      <h3>Fontes monitoradas</h3>
                      <span className="status">{intelSources.length} fontes</span>
                    </div>
                    {intelSources.length ? (
                      intelSources.map((source) => (
                        <div key={source.id} className="copy-block">
                          <div className="card-title">
                            <h3>
                              {(source.platform || source.source_type || 'fonte').toUpperCase()}
                            </h3>
                            <span className="status">{source.status}</span>
                          </div>
                          <div className="field-static">{source.url || source.handle}</div>
                          {source.last_fetched_at ? (
                            <div className="card-text">
                              Última coleta: {new Date(source.last_fetched_at).toLocaleString()}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="empty">Nenhuma fonte sincronizada.</div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Radar &amp; Insights</span>
              </div>
              <div className="form-grid">
                <label className="field">
                  Keywords (Radar)
                  <input
                    value={form.keywords_text}
                    onChange={(event) => updateForm({ keywords_text: event.target.value })}
                    placeholder="palavras-chave separadas por vírgula"
                  />
                </label>
                <label className="field">
                  Pillars (Radar)
                  <input
                    value={form.pillars_text}
                    onChange={(event) => updateForm({ pillars_text: event.target.value })}
                    placeholder="pilares estratégicos"
                  />
                </label>
                <label className="field">
                  Hashtags oficiais
                  <input
                    value={form.knowledge.hashtags_text}
                    onChange={(event) => updateKnowledge({ hashtags_text: event.target.value })}
                  />
                </label>
                <label className="field">
                  Menções obrigatórias
                  <input
                    value={form.knowledge.must_mentions_text}
                    onChange={(event) => updateKnowledge({ must_mentions_text: event.target.value })}
                  />
                </label>
                <label className="field">
                  Termos aprovados
                  <input
                    value={form.knowledge.approved_terms_text}
                    onChange={(event) => updateKnowledge({ approved_terms_text: event.target.value })}
                  />
                </label>
                <label className="field">
                  Claims proibidos
                  <input
                    value={form.knowledge.forbidden_claims_text}
                    onChange={(event) => updateKnowledge({ forbidden_claims_text: event.target.value })}
                  />
                </label>
                <label className="field full">
                  Observações estratégicas
                  <textarea
                    value={form.knowledge.notes}
                    onChange={(event) => updateKnowledge({ notes: event.target.value })}
                    rows={2}
                  />
                </label>
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Calendário Inteligente</span>
              </div>
              <div className="form-grid">
                <label className="field checkbox">
                  <input
                    type="checkbox"
                    checked={form.calendar_profile.enable_calendar_total}
                    onChange={(event) => updateCalendar({ enable_calendar_total: event.target.checked })}
                  />
                  Ativar calendário total
                </label>
                <label className="field">
                  Peso do calendário
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.calendar_profile.calendar_weight}
                    onChange={(event) => updateCalendar({ calendar_weight: Number(event.target.value) })}
                  />
                </label>
                <label className="field checkbox">
                  <input
                    type="checkbox"
                    checked={form.calendar_profile.retail_mode}
                    onChange={(event) => updateCalendar({ retail_mode: event.target.checked })}
                  />
                  Modo varejo
                </label>
                <label className="field checkbox">
                  <input
                    type="checkbox"
                    checked={form.calendar_profile.allow_cultural_opportunities}
                    onChange={(event) =>
                      updateCalendar({ allow_cultural_opportunities: event.target.checked })
                    }
                  />
                  Oportunidades culturais
                </label>
                <label className="field checkbox">
                  <input
                    type="checkbox"
                    checked={form.calendar_profile.allow_geek_pop}
                    onChange={(event) => updateCalendar({ allow_geek_pop: event.target.checked })}
                  />
                  Geek &amp; Pop
                </label>
                <label className="field checkbox">
                  <input
                    type="checkbox"
                    checked={form.calendar_profile.allow_profession_days}
                    onChange={(event) => updateCalendar({ allow_profession_days: event.target.checked })}
                  />
                  Datas profissionais
                </label>
                <label className="field checkbox">
                  <input
                    type="checkbox"
                    checked={form.calendar_profile.restrict_sensitive_causes}
                    onChange={(event) =>
                      updateCalendar({ restrict_sensitive_causes: event.target.checked })
                    }
                  />
                  Restringir causas sensíveis
                </label>
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Tendências &amp; Performance</span>
              </div>
              <div className="form-grid">
                <label className="field checkbox">
                  <input
                    type="checkbox"
                    checked={form.trend_profile.enable_trends}
                    onChange={(event) => updateTrend({ enable_trends: event.target.checked })}
                  />
                  Ativar tendências
                </label>
                <label className="field">
                  Peso de tendências
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.trend_profile.trend_weight}
                    onChange={(event) => updateTrend({ trend_weight: Number(event.target.value) })}
                  />
                </label>
                <label className="field full">
                  Fontes de tendências (ex: google, youtube)
                  <input
                    value={form.trend_profile.sources_text}
                    onChange={(event) => updateTrend({ sources_text: event.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Preferências de Plataforma</span>
              </div>
              <div className="form-grid">
                <label className="field full">
                  JSON (preferredFormats, blockedFormats, mix, etc.)
                  <textarea
                    value={form.platform_preferences_text}
                    onChange={(event) => updateForm({ platform_preferences_text: event.target.value })}
                    rows={4}
                  />
                </label>
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Integrações</span>
              </div>
              {!selectedId ? (
                <div className="empty">Salve o cliente para habilitar integrações.</div>
              ) : (
                <>
                  <div className="detail-list">
                    {connectors.length ? (
                      connectors.map((connector) => (
                        <div key={connector.provider} className="copy-block">
                          <div className="card-title">
                            <h3>{connector.provider}</h3>
                            <span className="status">
                              {connector.updated_at ? new Date(connector.updated_at).toLocaleDateString() : 'OK'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty">Nenhum conector cadastrado.</div>
                    )}
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      Provider
                      <select
                        value={connectorProvider}
                        onChange={(event) => setConnectorProvider(event.target.value)}
                      >
                        <option value="reportei">Reportei</option>
                        <option value="meta">Meta</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="tiktok">TikTok</option>
                        <option value="youtube">YouTube</option>
                        <option value="x">X (Twitter)</option>
                        <option value="google_ads">Google Ads</option>
                      </select>
                    </label>
                    <label className="field full">
                      Payload (JSON)
                      <textarea
                        value={connectorPayload}
                        onChange={(event) => setConnectorPayload(event.target.value)}
                        rows={3}
                        placeholder='{"reportei_account_id":"123"}'
                      />
                    </label>
                    <label className="field full">
                      Secrets (JSON)
                      <textarea
                        value={connectorSecrets}
                        onChange={(event) => setConnectorSecrets(event.target.value)}
                        rows={3}
                        placeholder='{"token":"..."}'
                      />
                    </label>
                    <div className="form-actions">
                      <button
                        className="btn primary"
                        type="button"
                        onClick={handleSaveConnector}
                        disabled={connectorSaving}
                      >
                        {connectorSaving ? 'Salvando...' : 'Salvar conector'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <div className="form-actions">
                {!isNew && selectedId ? (
                  <button className="btn danger" type="button" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Excluindo...' : 'Excluir cliente'}
                  </button>
                ) : null}
                <button className="btn primary" type="button" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar cliente'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
  );

  if (noShell) {
    return content;
  }

  return (
    <AppShell
      title="Clients"
      action={
        isLocked
          ? undefined
          : {
              label: 'Novo cliente',
              icon: 'add',
              onClick: handleNewClient,
            }
      }
    >
      {content}
    </AppShell>
  );
}
