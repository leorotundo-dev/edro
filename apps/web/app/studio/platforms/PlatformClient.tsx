'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import {
  IconBulb,
  IconAlertTriangle,
  IconArrowRight,
  IconBrandInstagram,
  IconBrandFacebook,
  IconBrandLinkedin,
  IconBrandTiktok,
  IconBrandYoutube,
  IconBrandX,
  IconBrandPinterest,
  IconBrandSpotify,
  IconBrandGoogle,
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandAmazon,
  IconBrandApple,
  IconBrandMeta,
  IconBrandWindows,
  IconMail,
  IconBell,
  IconDeviceMobile,
  IconAd,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

type RecommendedFormat = {
  format_id: string;
  format_name: string;
  platform: string;
  production_type: string;
  recommendation_score: number;
  priority: string;
  quantity: number;
  recommendation_reasons?: string[];
};

type RecommendationSummary = {
  total_formats?: number;
  total_estimated_cost?: number;
  total_estimated_hours?: number;
  total_estimated_days?: number;
  avg_recommendation_score?: number;
  avg_ml_performance_score?: number;
  avg_measurability_score?: number;
  coverage?: {
    platforms?: string[];
    production_types?: string[];
    funnel_stages?: string[];
  };
};

type RecommendationBriefing = {
  extracted_parameters?: {
    campaign_objective?: string;
    campaign_type?: string;
    channels?: {
      platforms?: string[];
      production_types?: string[];
    };
    budget?: {
      total?: number;
      currency?: string;
      flexibility?: string;
    };
    timeline?: {
      deadline?: string;
      urgency?: string;
    };
    requirements?: {
      tone_of_voice?: string;
      key_messages?: string[];
      call_to_action?: string;
    };
    context?: {
      industry?: string;
      competitors?: string[];
      success_metrics?: string[];
    };
  };
};

type RecommendationResponse = {
  recommended_formats: RecommendedFormat[];
  summary?: RecommendationSummary;
  warnings?: string[];
  suggestions?: string[];
  briefing?: RecommendationBriefing;
  client?: { id?: string | null; name?: string | null };
};

type CatalogItem = {
  production_type: string;
  platform: string;
  format_name: string;
  best_practices?: string[];
  notes?: string;
};

type CatalogResponse = {
  production_type?: string | null;
  items: CatalogItem[];
  platforms: Array<{ platform: string; formats: CatalogItem[] }>;
};

type SelectableFormat = {
  id: string;
  platform: string;
  format_name: string;
  production_type?: string;
  recommendation_score?: number;
  recommendation_reasons?: string[];
  source: 'ai' | 'manual';
};

const normalizeProductionType = (value?: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const productionLabel = (value?: string) => {
  const normalized = normalizeProductionType(value);
  if (!normalized) return 'Geral';
  if (normalized.includes('midia-on')) return 'Midia ON';
  if (normalized.includes('midia-off')) return 'Midia OFF';
  if (normalized.includes('ooh')) return 'OOH';
  if (normalized.includes('eventos')) return 'Eventos & Ativacoes';
  if (normalized.includes('endomarketing')) return 'Endomarketing';
  if (normalized.includes('apresent')) return 'Apresentacoes';
  if (normalized.includes('branding')) return 'Branding';
  if (normalized.includes('educacional')) return 'Educacional';
  if (normalized.includes('conteudo-editorial')) return 'Conteudo editorial';
  if (normalized.includes('ecommerce')) return 'E-commerce';
  return value || 'Geral';
};

const platformMeta = (platform?: string): { label: string; abbr: string; color: string; icon: ComponentType<{ size?: number }> } => {
  const label = platform || 'Plataforma';
  const key = label.toLowerCase();
  const abbr = (value: string) =>
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  if (key.includes('instagram')) return { label: 'Instagram', abbr: 'IG', color: '#E1306C', icon: IconBrandInstagram };
  if (key.includes('facebook') || key === 'meta') return { label: 'Facebook', abbr: 'FB', color: '#1877F2', icon: IconBrandFacebook };
  if (key.includes('linkedin')) return { label: 'LinkedIn', abbr: 'IN', color: '#0A66C2', icon: IconBrandLinkedin };
  if (key.includes('tiktok')) return { label: 'TikTok', abbr: 'TT', color: '#0F172A', icon: IconBrandTiktok };
  if (key.includes('youtube')) return { label: 'YouTube', abbr: 'YT', color: '#FF0000', icon: IconBrandYoutube };
  if (key === 'x' || key.includes('twitter')) return { label: 'X', abbr: 'X', color: '#0F172A', icon: IconBrandX };
  if (key.includes('pinterest')) return { label: 'Pinterest', abbr: 'PT', color: '#E60023', icon: IconBrandPinterest };
  if (key.includes('spotify')) return { label: 'Spotify', abbr: 'SP', color: '#1DB954', icon: IconBrandSpotify };
  if (key.includes('google')) return { label: 'Google', abbr: 'GO', color: '#4285F4', icon: IconBrandGoogle };
  if (key.includes('whatsapp')) return { label: 'WhatsApp', abbr: 'WA', color: '#25D366', icon: IconBrandWhatsapp };
  if (key.includes('telegram')) return { label: 'Telegram', abbr: 'TG', color: '#229ED9', icon: IconBrandTelegram };
  if (key.includes('amazon')) return { label: 'Amazon Ads', abbr: 'AA', color: '#FF9900', icon: IconBrandAmazon };
  if (key.includes('apple')) return { label: 'Apple Search Ads', abbr: 'AS', color: '#0F172A', icon: IconBrandApple };
  if (key.includes('meta audience') || key.includes('audience network')) return { label: 'Meta Audience Network', abbr: 'MA', color: '#0668E1', icon: IconBrandMeta };
  if (key.includes('microsoft') || key.includes('bing')) return { label: 'Microsoft Ads', abbr: 'MA', color: '#00A4EF', icon: IconBrandWindows };
  if (key.includes('email') || key.includes('newsletter')) return { label: 'Email', abbr: 'EM', color: '#7C3AED', icon: IconMail };
  if (key.includes('push') || key.includes('notification')) return { label: 'Push Notifications', abbr: 'PN', color: '#F97316', icon: IconBell };
  if (key.includes('in-app') || key.includes('inapp') || key.includes('app ad')) return { label: 'In-App Ads', abbr: 'IA', color: '#6366F1', icon: IconDeviceMobile };

  return { label, abbr: abbr(label) || 'ED', color: '#0F172A', icon: IconAd };
};

const buildPreviewLines = (format: SelectableFormat, recommended?: RecommendedFormat) => {
  const reasons = recommended?.recommendation_reasons?.length
    ? recommended.recommendation_reasons
    : format.recommendation_reasons || [];
  const clean = (value?: string) => (value || '').replace(/\s+/g, ' ').trim();
  const line1 = clean(reasons[0]) || `Mensagem-chave para ${format.format_name}`;
  const line2 = clean(reasons[1]) || 'Texto de apoio com beneficio ou CTA.';
  return {
    headline: format.format_name || 'Formato',
    line1,
    line2,
  };
};

const objectiveLabel = (value?: string) => {
  const key = (value || '').toLowerCase();
  if (key.includes('awareness') || key.includes('reconhecimento')) return 'Reconhecimento de marca';
  if (key.includes('consideration') || key.includes('consideracao')) return 'Consideracao';
  if (key.includes('conversion') || key.includes('conversao') || key.includes('performance')) return 'Conversao';
  if (key.includes('retention') || key.includes('retencao')) return 'Retencao';
  return value || '';
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(parsed);
};

const formatCurrency = (value?: number | null, currency = 'BRL') => {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));
};

const joinList = (values?: string[], fallback = '') => {
  if (!values || values.length === 0) return fallback;
  return values.filter(Boolean).join(' \u00b7 ');
};


const buildSelectionId = (platform?: string, formatName?: string, productionType?: string) => {
  const raw = [platform || 'plataforma', formatName || 'formato', productionType || '']
    .join('::')
    .toLowerCase();
  return raw.replace(/[^a-z0-9:]+/g, '-').replace(/-+/g, '-');
};

const RECOMMENDATION_TIMEOUT_MS = 15000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(label)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export default function PlatformClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formatSearch, setFormatSearch] = useState('');
  const [topContext, setTopContext] = useState<{ event?: string; date?: string; clients: number; score?: string; objective?: string }>({
    event: '',
    date: '',
    clients: 0,
    score: '',
    objective: '',
  });

  const loadRecommendation = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let briefingText = 'Briefing';
      let clientId: string | undefined;
      let clientName: string | undefined;
      let productionType: string | undefined;
      let objective: string | undefined;

      if (typeof window !== 'undefined') {
        const contextRaw = window.localStorage.getItem('edro_studio_context');
        if (contextRaw) {
          try {
            const context = JSON.parse(contextRaw);
            clientId = context.clientId || clientId;
            clientName = context.client || clientName;
            objective = context.objective || objective;
            productionType = window.localStorage.getItem('edro_studio_production_type') || productionType;
            briefingText = [
              context.event,
              context.message,
              context.notes,
              context.tags,
              context.categories,
            ]
              .filter(Boolean)
              .join(' | ') || briefingText;
          } catch {
            // ignore
          }
        }
        const activeClientId = window.localStorage.getItem('edro_active_client_id') || '';
        if (activeClientId) {
          clientId = activeClientId;
          try {
            const selectedRaw = window.localStorage.getItem('edro_selected_clients');
            const selected = selectedRaw ? JSON.parse(selectedRaw) : [];
            const active = Array.isArray(selected)
              ? selected.find((item: any) => item.id === activeClientId)
              : null;
            if (active?.name) clientName = active.name;
          } catch {
            // ignore
          }
        }
      }

      const briefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
      if (briefingId) {
        const briefingResponse = await apiGet<{ success: boolean; data: any }>(`/edro/briefings/${briefingId}`);
        const briefing = briefingResponse?.data?.briefing;
        if (briefing) {
          clientId = briefing.client_id || clientId;
          clientName = briefing.client_name || clientName;
          objective = briefing.payload?.objective || objective;
          briefingText = `${briefing.title || 'Briefing'}\n${JSON.stringify(briefing.payload || {}, null, 2)}`;
        }
      }

      const response = await withTimeout(
        apiPost<RecommendationResponse>('/recommendations/enxoval', {
          briefing_text: briefingText,
          objective,
          production_type: productionType || undefined,
          client_id: clientId,
          client_name: clientName,
        }),
        RECOMMENDATION_TIMEOUT_MS,
        'Tempo limite ao gerar recomendacao.'
      );

      const formats = response?.recommended_formats || [];
      setRecommendation(response);
      setSelectedIds(
        new Set(
          formats.map((format) =>
            buildSelectionId(format.platform, format.format_name, format.production_type)
          )
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar recomendacao.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      let productionType = '';
      if (typeof window !== 'undefined') {
        productionType = window.localStorage.getItem('edro_studio_production_type') || '';
      }
      const query = productionType ? `?type=${encodeURIComponent(productionType)}` : '';
      const response = await apiGet<CatalogResponse>(`/production/catalog${query}`);
      setCatalog(response || null);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar catalogo de formatos.');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendation();
    loadCatalog();
  }, [loadRecommendation, loadCatalog]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => {
      let event = '';
      let date = '';
      let clientsCount = 0;
      let score = '';
      let objective = '';
      try {
        const raw = window.localStorage.getItem('edro_studio_context');
        if (raw) {
          const context = JSON.parse(raw);
          event = context?.event || '';
          date = context?.date || '';
          score = context?.score ? String(context.score) : '';
          objective = context?.objective ? String(context.objective) : '';
        }
      } catch {
        // ignore
      }
      try {
        const selectedRaw = window.localStorage.getItem('edro_selected_clients');
        const selected = selectedRaw ? JSON.parse(selectedRaw) : [];
        if (Array.isArray(selected)) {
          clientsCount = selected.length;
        }
      } catch {
        // ignore
      }
      setTopContext({ event, date, clients: clientsCount, score, objective });
    };
    read();
    window.addEventListener('edro-studio-context-change', read);
    return () => window.removeEventListener('edro-studio-context-change', read);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      loadRecommendation();
      loadCatalog();
    };
    window.addEventListener('edro-studio-context-change', handler);
    return () => {
      window.removeEventListener('edro-studio-context-change', handler);
    };
  }, [loadRecommendation, loadCatalog]);

  const formats = useMemo(() => recommendation?.recommended_formats || [], [recommendation?.recommended_formats]);

  const recommendedFormats = useMemo<SelectableFormat[]>(
    () =>
      formats.map((format) => ({
        id: buildSelectionId(format.platform, format.format_name, format.production_type),
        platform: format.platform,
        format_name: format.format_name,
        production_type: format.production_type,
        recommendation_score: format.recommendation_score,
        recommendation_reasons: format.recommendation_reasons,
        source: 'ai',
      })),
    [formats]
  );

  const manualFormats = useMemo<SelectableFormat[]>(() => {
    const items = catalog?.items || [];
    return items.map((item) => ({
      id: buildSelectionId(item.platform, item.format_name, item.production_type),
      platform: item.platform,
      format_name: item.format_name,
      production_type: item.production_type,
      recommendation_reasons: item.best_practices?.length ? item.best_practices.slice(0, 2) : item.notes ? [item.notes] : [],
      source: 'manual',
    }));
  }, [catalog]);

  const allFormats = useMemo(() => {
    const map = new Map<string, SelectableFormat>();
    manualFormats.forEach((item) => map.set(item.id, item));
    recommendedFormats.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
    return Array.from(map.values());
  }, [manualFormats, recommendedFormats]);

  const productionAreas = useMemo(() => {
    const map = new Map<string, number>();
    allFormats.forEach((format) => {
      const key = normalizeProductionType(format.production_type);
      const label = productionLabel(format.production_type);
      map.set(key || label, (map.get(key || label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, count]) => ({
      key,
      label: key ? productionLabel(key) : 'Geral',
      count,
    }));
  }, [allFormats]);

  const recommendedById = useMemo(() => {
    const map = new Map<string, RecommendedFormat>();
    formats.forEach((format) => {
      map.set(buildSelectionId(format.platform, format.format_name, format.production_type), format);
    });
    return map;
  }, [formats]);

  const [flowStep, setFlowStep] = useState<1 | 2 | 3>(1);
  const [activeArea, setActiveArea] = useState<string>('all');
  const [activePlatform, setActivePlatform] = useState<string>('all');

  const areaKeyFromLabel = useCallback(
    (label: string) => normalizeProductionType(label),
    []
  );

  const platformSamples = useMemo(() => {
    const map = new Map<string, SelectableFormat[]>();
    allFormats.forEach((format) => {
      const areaLabel = productionLabel(format.production_type);
      const areaKey = areaKeyFromLabel(areaLabel);
      if (activeArea !== 'all' && areaKey !== activeArea) return;
      const platform = format.platform || 'Plataforma';
      const existing = map.get(platform) || [];
      existing.push(format);
      map.set(platform, existing);
    });
    const output = new Map<string, SelectableFormat[]>();
    map.forEach((items, platform) => {
      const sorted = [...items].sort((a, b) => {
        const aScore =
          recommendedById.get(a.id)?.recommendation_score || a.recommendation_score || 0;
        const bScore =
          recommendedById.get(b.id)?.recommendation_score || b.recommendation_score || 0;
        return bScore - aScore;
      });
      output.set(platform, sorted.slice(0, 3));
    });
    return output;
  }, [allFormats, activeArea, areaKeyFromLabel, recommendedById]);

  const areaOptions = useMemo(() => {
    const options = productionAreas.map((area) => ({
      key: area.key,
      label: area.label,
      count: area.count,
    }));
    return [{ key: 'all', label: 'Todas', count: allFormats.length }, ...options];
  }, [productionAreas, allFormats.length]);

  const hasTopContext = Boolean(topContext.clients && topContext.event && topContext.date);

  const platformsForArea = useMemo(() => {
    const map = new Map<string, number>();
    allFormats.forEach((format) => {
      const areaLabel = productionLabel(format.production_type);
      const areaKey = areaKeyFromLabel(areaLabel);
      if (activeArea !== 'all' && areaKey !== activeArea) return;
      const platform = format.platform || 'Plataforma';
      map.set(platform, (map.get(platform) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => a.platform.localeCompare(b.platform));
  }, [allFormats, activeArea, areaKeyFromLabel]);

  const recommendationInsights = useMemo(() => {
    if (!recommendation) return null;

    const summary = recommendation.summary || {};
    const briefing = recommendation.briefing?.extracted_parameters || {};
    const coverage = summary.coverage || {};

    const eventLabel = topContext.event || '';
    const dateLabel = formatDate(topContext.date) || formatDate(briefing.timeline?.deadline);
    const relevanceLabel = topContext.score ? `${topContext.score}%` : '';
    const objective = objectiveLabel(topContext.objective || briefing.campaign_objective);
    const productionTypes = coverage.production_types?.length
      ? coverage.production_types
      : briefing.channels?.production_types || [];
    const mediaLabel = joinList(productionTypes.map((item) => productionLabel(item)), '');
    const platformsList = coverage.platforms?.length ? coverage.platforms : briefing.channels?.platforms || [];
    const platformsLabel = joinList(platformsList, '');
    const funnelLabel = joinList(coverage.funnel_stages || [], '');
    const deadlineLabel = formatDate(briefing.timeline?.deadline);
    const estimatedDays = summary.total_estimated_days ? `${summary.total_estimated_days} dias` : '';
    const hoursLabel = summary.total_estimated_hours ? `${summary.total_estimated_hours}h` : '';
    const costLabel = formatCurrency(summary.total_estimated_cost, briefing.budget?.currency || 'BRL');

    const items = [
      eventLabel ? { label: 'Evento', value: eventLabel } : null,
      dateLabel ? { label: 'Data analisada', value: dateLabel } : null,
      relevanceLabel ? { label: 'Relevancia do evento', value: relevanceLabel } : null,
      objective ? { label: 'Objetivo estrategico', value: objective } : null,
      mediaLabel ? { label: 'Midias priorizadas', value: mediaLabel } : null,
      platformsLabel ? { label: 'Plataformas sugeridas', value: platformsLabel } : null,
      funnelLabel ? { label: 'Cobertura de funil', value: funnelLabel } : null,
      estimatedDays || deadlineLabel ? { label: 'Prazo estimado', value: estimatedDays || deadlineLabel } : null,
      hoursLabel ? { label: 'Esforco estimado', value: hoursLabel } : null,
      costLabel ? { label: 'Custo estimado', value: costLabel } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

    const narrativeParts = [
      eventLabel && dateLabel ? `Evento ${eventLabel} em ${dateLabel}.` : eventLabel ? `Evento ${eventLabel}.` : '',
      objective ? `Objetivo: ${objective}.` : '',
      relevanceLabel ? `Relevancia indicada ${relevanceLabel}.` : '',
      mediaLabel ? `Midias priorizadas: ${mediaLabel}.` : '',
    ].filter(Boolean);

    return {
      items,
      narrative: narrativeParts.join(' '),
      totalFormats: summary.total_formats || recommendation.recommended_formats.length || 0,
      warnings: recommendation.warnings || [],
      suggestions: recommendation.suggestions || [],
    };
  }, [recommendation, topContext]);

  const visibleFormats = useMemo(() => {
    const query = formatSearch.trim().toLowerCase();
    return allFormats.filter((format) => {
      const areaLabel = productionLabel(format.production_type);
      const areaKey = areaKeyFromLabel(areaLabel);
      if (activeArea !== 'all' && areaKey !== activeArea) return false;
      if (activePlatform !== 'all' && format.platform !== activePlatform) return false;
      if (!query) return true;
      const formatName = (format.format_name || '').toLowerCase();
      const platformName = (format.platform || '').toLowerCase();
      const areaName = productionLabel(format.production_type).toLowerCase();
      return (
        formatName.includes(query) ||
        platformName.includes(query) ||
        areaName.includes(query)
      );
    });
  }, [allFormats, activeArea, activePlatform, areaKeyFromLabel, formatSearch]);

  const toggleFormat = (formatId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(formatId)) {
        next.delete(formatId);
      } else {
        next.add(formatId);
      }
      return next;
    });
  };

  const handleApplyRecommendation = () => {
    if (!formats.length) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      formats.forEach((format) => {
        const id = buildSelectionId(format.platform, format.format_name, format.production_type);
        next.add(id);
      });
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleContinue = async () => {
    setSaving(true);
    setError('');
    try {
      let selectedFormats = allFormats.filter((format) => selectedIds.has(format.id));
      if (!selectedFormats.length && formats.length) {
        const nextIds = new Set(selectedIds);
        formats.forEach((format) => {
          nextIds.add(buildSelectionId(format.platform, format.format_name, format.production_type));
        });
        setSelectedIds(nextIds);
        selectedFormats = allFormats.filter((format) => nextIds.has(format.id));
      }
      if (!selectedFormats.length) {
        setError('Selecione ao menos um formato.');
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      const formatsByPlatform: Record<string, string[]> = {};
      const inventory = selectedFormats.map((format) => {
        const platformKey = format.platform || 'Plataforma';
        if (!formatsByPlatform[platformKey]) formatsByPlatform[platformKey] = [];
        formatsByPlatform[platformKey].push(format.format_name);
        return {
          id: `${platformKey}-${format.format_name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          platform: platformKey,
          platformId: platformKey,
          format: format.format_name,
          production_type: format.production_type,
          index: 1,
          total: 1,
        };
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('edro_selected_formats_by_platform', JSON.stringify(formatsByPlatform));
        window.localStorage.setItem('edro_selected_inventory', JSON.stringify(inventory));
        window.localStorage.setItem('edro_selected_platforms', JSON.stringify(Object.keys(formatsByPlatform)));
        window.localStorage.setItem(
          'edro_selected_formats',
          JSON.stringify(
            selectedFormats.map((format) => `${format.platform}: ${format.format_name}`)
          )
        );
        if (Object.keys(formatsByPlatform).length) {
          window.localStorage.setItem('edro_active_platform', Object.keys(formatsByPlatform)[0]);
        }
      }

      try {
        router.push('/studio/editor');
      } catch {
        if (typeof window !== 'undefined') {
          window.location.href = '/studio/editor';
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar formatos.');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !recommendation) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Gerando recomendacoes...
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Page Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Selecao de Plataformas e Formatos</Typography>
          <Typography variant="body2" color="text.secondary">
            Use a recomendacao da IA e tambem monte sua propria campanha.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {topContext.event ? <Chip size="small" variant="outlined" label={topContext.event} /> : null}
          {topContext.date ? <Chip size="small" variant="outlined" label={topContext.date} /> : null}
          <Chip size="small" variant="outlined" label={`${selectedIds.size} formatos`} />
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {!hasTopContext ? (
        <Alert severity="warning">Selecione evento e clientes no topo para continuar.</Alert>
      ) : null}

      {/* Recommendation Insights */}
      {recommendationInsights ? (
        <Card sx={{ bgcolor: 'primary.lighter', border: 1, borderColor: 'primary.light' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Chip size="small" color="primary" label="Recomendacao da IA" sx={{ mb: 1 }} />
                <Typography variant="h6">Resumo da decisao</Typography>
                {recommendationInsights.narrative ? (
                  <Typography variant="body2" color="text.secondary">{recommendationInsights.narrative}</Typography>
                ) : null}
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">Formatos sugeridos</Typography>
                <Typography variant="h4" fontWeight={700}>{recommendationInsights.totalFormats}</Typography>
              </Box>
            </Stack>
            {recommendationInsights.items.length ? (
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {recommendationInsights.items.map((item) => (
                  <Grid size={{ xs: 6, md: 3 }} key={item.label}>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
                  </Grid>
                ))}
              </Grid>
            ) : null}
            {recommendationInsights.suggestions.length ? (
              <Alert severity="success" icon={<IconBulb size={20} />} sx={{ mb: 1 }}>
                <strong>Insights</strong> &mdash; {recommendationInsights.suggestions.join(' \u00b7 ')}
              </Alert>
            ) : null}
            {recommendationInsights.warnings.length ? (
              <Alert severity="warning" icon={<IconAlertTriangle size={20} />}>
                <strong>Atencao</strong> &mdash; {recommendationInsights.warnings.join(' \u00b7 ')}
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Flow stepper */}
      <Stepper activeStep={flowStep - 1} alternativeLabel>
        <Step completed={flowStep > 1}><StepLabel>Area</StepLabel></Step>
        <Step completed={flowStep > 2}><StepLabel>Plataforma</StepLabel></Step>
        <Step completed={flowStep > 3}><StepLabel>Formatos</StepLabel></Step>
      </Stepper>

      {/* Step 1 - Area */}
      {flowStep === 1 ? (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Chip size="small" label="Escolha a area de atuacao" />
              <Typography variant="caption" color="text.secondary">{allFormats.length} formatos no catalogo</Typography>
            </Stack>
            <Grid container spacing={2}>
              {areaOptions.map((area) => (
                <Grid size={{ xs: 6, md: 3 }} key={area.key}>
                  <Card
                    variant={activeArea === area.key ? 'elevation' : 'outlined'}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      ...(activeArea === area.key ? { borderColor: 'primary.main', boxShadow: 3 } : {}),
                      '&:hover': { boxShadow: 2 },
                    }}
                    onClick={() => {
                      setActiveArea(area.key);
                      setActivePlatform('all');
                      setFlowStep(2);
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600}>{area.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{area.count} formatos</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 2 - Platform */}
      {flowStep === 2 ? (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Chip size="small" label="Selecione a plataforma" />
              <Typography variant="caption" color="text.secondary">
                Area: {areaOptions.find((area) => area.key === activeArea)?.label || 'Todas'}
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              {platformsForArea.map((platform) => {
                const meta = platformMeta(platform.platform);
                const samples = platformSamples.get(platform.platform) || [];
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={platform.platform}>
                    <Card
                      variant={activePlatform === platform.platform ? 'elevation' : 'outlined'}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        ...(activePlatform === platform.platform ? { borderColor: 'primary.main', boxShadow: 3 } : {}),
                        '&:hover': { boxShadow: 2 },
                      }}
                      onClick={() => {
                        setActivePlatform(platform.platform);
                        setFlowStep(3);
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{ width: 36, height: 36, bgcolor: meta.color }}>
                              <meta.icon size={20} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>{meta.label}</Typography>
                              <Typography variant="caption" color="text.secondary">{platform.count} formatos</Typography>
                            </Box>
                          </Stack>
                          <IconArrowRight size={16} />
                        </Stack>
                        <Stack spacing={0.5}>
                          {samples.length ? (
                            samples.map((sample) => (
                              <Typography key={sample.id} variant="caption" color="text.secondary" noWrap>
                                {sample.format_name} &mdash; {productionLabel(sample.production_type)}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="caption" color="text.disabled">Sem formatos disponiveis</Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
              {!platformsForArea.length ? (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Nenhuma plataforma encontrada para esta area.
                  </Typography>
                </Grid>
              ) : null}
            </Grid>
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => setFlowStep(1)}>
                Voltar para area
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 3 - Formats */}
      {flowStep === 3 ? (
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Chip size="small" label="Selecione os formatos" />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {areaOptions.find((area) => area.key === activeArea)?.label || 'Todas'} &middot;{' '}
                  {activePlatform === 'all' ? 'Todas as plataformas' : activePlatform}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {formats.length ? (
                  <Button variant="outlined" size="small" onClick={handleApplyRecommendation}>
                    Aplicar recomendacao
                  </Button>
                ) : null}
                <Button variant="outlined" size="small" onClick={handleClearSelection}>
                  Limpar selecao
                </Button>
              </Stack>
            </Stack>

            <TextField
              fullWidth
              size="small"
              label="Buscar formato"
              value={formatSearch}
              onChange={(event) => setFormatSearch(event.target.value)}
              placeholder="Digite um formato ou plataforma"
              sx={{ mb: 2 }}
            />

            {catalogLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>Carregando catalogo...</Typography>
              </Box>
            ) : null}
            {!catalogLoading && !visibleFormats.length ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Nenhum formato encontrado.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {visibleFormats.map((format) => {
                  const recommended = recommendedById.get(format.id);
                  const meta = platformMeta(format.platform);
                  const preview = buildPreviewLines(format, recommended);
                  const isSelected = selectedIds.has(format.id);
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={format.id}>
                      <Card
                        variant={isSelected ? 'elevation' : 'outlined'}
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          ...(isSelected ? { borderColor: 'primary.main', boxShadow: 3, bgcolor: 'primary.lighter' } : {}),
                          '&:hover': { boxShadow: 2 },
                        }}
                        onClick={() => toggleFormat(format.id)}
                      >
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              <Chip size="small" label={productionLabel(format.production_type)} />
                              {recommended ? <Chip size="small" color="primary" label="Recomendado" /> : null}
                            </Stack>
                            <Checkbox checked={isSelected} size="small" />
                          </Stack>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>
                            {format.format_name}
                          </Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                            <Avatar sx={{ width: 22, height: 22, bgcolor: meta.color }}>
                              <meta.icon size={14} />
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">{meta.label}</Typography>
                            <Chip size="small" variant="outlined" label={productionLabel(format.production_type)} sx={{ ml: 'auto', height: 20, fontSize: 10 }} />
                          </Stack>
                          <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mt: 1 }}>
                            {preview.headline}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {preview.line1}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {preview.line2}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {format.platform} &middot; {productionLabel(format.production_type)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {recommended?.recommendation_reasons?.slice(0, 2).join(' \u2022 ') ||
                              format.recommendation_reasons?.slice(0, 2).join(' \u2022 ') ||
                              'Formato recomendado para campanhas focadas em clareza e impacto.'}
                          </Typography>
                          {recommended?.recommendation_score ? (
                            <Chip
                              size="small"
                              color="primary"
                              label={recommended.recommendation_score}
                              sx={{ position: 'absolute', top: 8, right: 44, height: 20, fontSize: 10 }}
                            />
                          ) : null}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => setFlowStep(2)}>
                Voltar para plataforma
              </Button>
              <Typography variant="caption" color="text.secondary">{selectedIds.size} formatos selecionados</Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {/* Footer actions */}
      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Button variant="outlined" onClick={() => router.back()}>
          Voltar
        </Button>
        <Button variant="contained" onClick={handleContinue} disabled={saving}>
          {saving ? 'Salvando...' : 'Continuar para Copy'}
        </Button>
      </Stack>
    </Stack>
  );
}
