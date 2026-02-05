'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PostVersionHistory from '@/components/PostVersionHistory';
import LiveMockupPreview from '@/components/mockups/LiveMockupPreview';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';

type CopyVersion = {
  id: string;
  output: string;
  model?: string | null;
  payload?: Record<string, any> | null;
  created_at?: string | null;
};

type BriefingResponse = {
  briefing: {
    id: string;
    title: string;
    client_name?: string | null;
    payload?: Record<string, any>;
  };
  copies: CopyVersion[];
};

type OrchestratorInfo = {
  available?: string[];
  configured?: Record<string, boolean>;
  providers?: {
    available?: string[];
    configured?: Record<string, boolean>;
  };
  routing?: Record<string, { provider: string; tier: string }>;
};

type InventoryItem = {
  id: string;
  platform?: string;
  format?: string;
  production_type?: string;
};

type CatalogItem = {
  production_type?: string;
  platform?: string;
  format_name?: string;
  max_chars?: Record<string, number>;
  best_practices?: string[];
  notes?: string;
};

type StoredClient = {
  id: string;
  name: string;
  segment?: string | null;
  city?: string | null;
  uf?: string | null;
};

type ParsedOption = {
  title: string;
  body: string;
  cta: string;
  raw: string;
};

type ReporteiSummary = {
  source?: string;
  platform?: string | null;
  window?: string | null;
  format?: { name?: string; score?: number; basis?: string } | null;
  tag?: { name?: string; score?: number } | null;
  kpis?: string[];
  insights?: string[];
  used_in_prompt?: boolean;
};

type CopyMeta = {
  provider?: string;
  model?: string;
  tier?: string;
  task_type?: string;
  reportei?: ReporteiSummary | null;
};

const TASK_TYPES = [
  { value: 'social_post', label: 'Social post' },
  { value: 'headlines', label: 'Headlines' },
  { value: 'variations', label: 'Variacoes' },
  { value: 'institutional_copy', label: 'Institucional' },
  { value: 'campaign_strategy', label: 'Estrategia de campanha' },
];

const TONE_OPTIONS = ['Profissional', 'Inspirador', 'Casual', 'Persuasivo'];
const MAX_CHAR_LABELS: Record<string, string> = {
  caption: 'Legenda',
  headline: 'Titulo',
  cta: 'CTA',
  body: 'Texto',
  subject: 'Assunto',
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  claude: 'Claude',
};

const formatReporteiSummary = (reportei?: ReporteiSummary | null) => {
  if (!reportei) return '';
  const parts: string[] = [];
  if (reportei.format?.name) {
    const score =
      typeof reportei.format.score === 'number' ? ` (${Math.round(reportei.format.score)})` : '';
    parts.push(`Formato ${reportei.format.name}${score}`);
  }
  if (reportei.tag?.name) {
    const score = typeof reportei.tag.score === 'number' ? ` (${Math.round(reportei.tag.score)})` : '';
    parts.push(`Tag ${reportei.tag.name}${score}`);
  }
  if (reportei.window) parts.push(String(reportei.window));
  return parts.length ? `Reportei: ${parts.join(' \u00b7 ')}` : '';
};

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const readLocalStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  return safeParse(window.localStorage.getItem(key), fallback);
};

const normalizeCatalogToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function parseOptions(text: string): ParsedOption[] {
  if (!text) return [];
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    const options = parsed.options || parsed.copys || parsed.copies || parsed.variations;
    if (Array.isArray(options)) {
      return options.map((option: any) => ({
        title: option.title || option.headline || option.titulo || '',
        body: option.body || option.corpo || option.text || '',
        cta: option.cta || option.call_to_action || option.callToAction || '',
        raw: JSON.stringify(option),
      }));
    }
  } catch {
    // ignore JSON parse
  }

  const chunks = trimmed
    .split(/\n(?=\s*\d+[\).:-]\s+)/g)
    .map((chunk) => chunk.replace(/^\s*\d+[\).:-]\s*/, '').trim())
    .filter(Boolean);

  if (!chunks.length) {
    return [
      {
        title: '',
        body: trimmed,
        cta: '',
        raw: trimmed,
      },
    ];
  }

  return chunks.map((chunk) => {
    const titleMatch = chunk.match(/(?:titulo|title|headline)\s*[:\-]\s*(.+)/i);
    const bodyMatch = chunk.match(/(?:corpo|body|texto)\s*[:\-]\s*(.+)/i);
    const ctaMatch = chunk.match(/(?:cta|call to action)\s*[:\-]\s*(.+)/i);
    return {
      title: titleMatch?.[1]?.trim() || '',
      body: bodyMatch?.[1]?.trim() || chunk,
      cta: ctaMatch?.[1]?.trim() || '',
      raw: chunk,
    };
  });
}

const extractCopyMeta = (copy?: CopyVersion | null): CopyMeta | null => {
  if (!copy) return null;
  const payload = copy.payload || {};
  const edro = (payload as any)?._edro || {};
  return {
    provider: (payload as any).provider || edro.provider || '',
    model: copy.model || '',
    tier: (payload as any).tier || edro.tier || '',
    task_type: (payload as any).taskType || edro.task_type || '',
    reportei: edro.reportei || null,
  };
};

export default function EditorClient() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<BriefingResponse['briefing'] | null>(null);
  const [copies, setCopies] = useState<CopyVersion[]>([]);
  const [orchestrator, setOrchestrator] = useState<OrchestratorInfo | null>(null);
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeFormatId, setActiveFormatId] = useState('');
  const [output, setOutput] = useState('');
  const [options, setOptions] = useState<ParsedOption[]>([]);
  const [selectedOption, setSelectedOption] = useState(0);
  const [pipeline, setPipeline] = useState<'simple' | 'standard' | 'premium' | 'collaborative'>('standard');
  const [collabStep, setCollabStep] = useState(0);
  const [taskType, setTaskType] = useState('social_post');
  const [forceProvider, setForceProvider] = useState('');
  const [tone, setTone] = useState('');
  const [count, setCount] = useState(3);
  const [activeCopyMeta, setActiveCopyMeta] = useState<CopyMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copyProgressTick, setCopyProgressTick] = useState(0);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const resolveActiveClient = () => {
    if (typeof window === 'undefined') return null;
    const activeId = window.localStorage.getItem('edro_active_client_id') || '';
    const parsed = readLocalStorage<StoredClient[]>('edro_selected_clients', []);
    if (!parsed.length) return activeId ? { id: activeId, name: activeId } : null;
    if (activeId) {
      return parsed.find((client) => client.id === activeId) || parsed[0] || null;
    }
    return parsed[0] || null;
  };

  const readSelectedClients = () => {
    return readLocalStorage<StoredClient[]>('edro_selected_clients', []);
  };

  const resolveTargetClients = () => {
    const selectedClients = readSelectedClients();
    if (selectedClients.length) return selectedClients;
    const active = resolveActiveClient();
    return active ? [active] : [];
  };

  const ensureCopyStageUnlocked = useCallback(async (briefingId: string) => {
    const prereqStages = ['briefing', 'iclips_in', 'alinhamento'] as const;
    for (const stage of prereqStages) {
      await apiPatch(`/edro/briefings/${briefingId}/stages/${stage}`, { status: 'done' });
    }
    try {
      await apiPatch(`/edro/briefings/${briefingId}/stages/copy_ia`, { status: 'in_progress' });
    } catch {
      // ignore if already in progress/done
    }
  }, []);

  const activeFormat = useMemo(
    () => inventory.find((item) => item.id === activeFormatId) || inventory[0] || null,
    [inventory, activeFormatId]
  );

  const inventoryProgress = useMemo(() => {
    if (typeof window === 'undefined') {
      return { done: 0, total: inventory.length, items: [] as Array<InventoryItem & { hasCopy: boolean; key: string }> };
    }
    const map = readLocalStorage<Record<string, string>>('edro_copy_by_platform_format', {});
    const activeClient = resolveActiveClient();
    let done = 0;
    const items = inventory.map((item) => {
      const key = `${item.platform || 'Plataforma'}::${item.format || 'Formato'}`;
      const clientKey = activeClient?.id ? `${activeClient.id}::${key}` : key;
      const stored = map[clientKey] || map[key] || '';
      const hasCopy = typeof stored === 'string' && stored.trim().length > 0;
      if (hasCopy) done += 1;
      return { ...item, hasCopy, key };
    });
    return { done, total: inventory.length, items };
  }, [inventory, copyProgressTick]);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const briefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
      if (!briefingId) {
        throw new Error('Nenhum briefing ativo encontrado. Volte para o passo 1.');
      }
      const response = await apiGet<{ success: boolean; data: BriefingResponse }>(`/edro/briefings/${briefingId}`);
      const data = response?.data;
      if (!data?.briefing) throw new Error('Briefing nao encontrado.');
      setBriefing(data.briefing);
      setCopies(data.copies || []);
      if (data.copies?.length) {
        const latest = data.copies[0];
        setOutput(latest.output || '');
        const parsed = parseOptions(latest.output || '');
        setOptions(parsed);
        setSelectedOption(0);
        setActiveCopyMeta(extractCopyMeta(latest));
      }
      if (data.briefing?.payload?.tone && !tone) {
        setTone(String(data.briefing.payload.tone));
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefing.');
    } finally {
      setLoading(false);
    }
  }, [tone]);

  const loadOrchestrator = useCallback(async () => {
    try {
      const response = await apiGet<{ success: boolean; data: OrchestratorInfo }>('/edro/orchestrator');
      setOrchestrator(response?.data || {});
    } catch {
      setOrchestrator(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parsed = readLocalStorage<any[]>('edro_selected_inventory', []);
    if (Array.isArray(parsed) && parsed.length) {
      setInventory(
        parsed.map((item: any) => ({
          id: item.id,
          platform: item.platform || item.platformId,
          format: item.format,
          production_type: item.production_type,
        }))
      );
      if (parsed[0]?.id) setActiveFormatId(parsed[0].id);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadCatalogItem = async () => {
      if (!activeFormat?.platform || !activeFormat?.format) {
        if (isActive) {
          setCatalogItem(null);
          setCatalogLoading(false);
        }
        return;
      }
      setCatalogLoading(true);
      try {
        const type = activeFormat.production_type || '';
        const query = type ? `?type=${encodeURIComponent(type)}` : '';
        const response = await apiGet<{ items: CatalogItem[] }>(`/production/catalog${query}`);
        const items = response?.items || [];
        const platformKey = normalizeCatalogToken(activeFormat.platform || '');
        const formatKey = normalizeCatalogToken(activeFormat.format || '');
        const matched =
          items.find(
            (item) =>
              normalizeCatalogToken(item.platform || '') === platformKey &&
              normalizeCatalogToken(item.format_name || '') === formatKey
          ) ||
          items.find((item) => normalizeCatalogToken(item.format_name || '') === formatKey) ||
          null;
        if (isActive) setCatalogItem(matched);
      } catch {
        if (isActive) setCatalogItem(null);
      } finally {
        if (isActive) setCatalogLoading(false);
      }
    };
    loadCatalogItem();
    return () => {
      isActive = false;
    };
  }, [activeFormat?.platform, activeFormat?.format, activeFormat?.production_type]);

  const formatLabel = activeFormat
    ? `${activeFormat.platform || 'Plataforma'} \u2022 ${activeFormat.format || 'Formato'}`
    : 'Formato nao definido';

  const mockupMeta = useMemo(() => {
    const parts = [activeFormat?.platform, activeFormat?.format].filter(Boolean) as string[];
    if (catalogItem?.production_type) parts.push(catalogItem.production_type);
    return parts.join(' \u00b7 ');
  }, [activeFormat?.platform, activeFormat?.format, catalogItem?.production_type]);

  const selectedOptionData = useMemo(() => options[selectedOption] || null, [options, selectedOption]);

  const providerLabels = useMemo(() => {
    const available = orchestrator?.available ?? orchestrator?.providers?.available ?? [];
    const configured = orchestrator?.configured ?? orchestrator?.providers?.configured ?? {};
    if (!available.length) return [];
    const map: Record<string, string> = {
      openai: 'OpenAI',
      gemini: 'Gemini',
      claude: 'Claude',
    };
    return available.map((provider) => ({
      provider,
      label: map[provider] || provider,
      configured: configured?.[provider] ?? true,
    }));
  }, [orchestrator]);

  const activeCopyLabel = useMemo(() => {
    if (!activeCopyMeta) return 'IA: desconhecida';
    const providerLabel = activeCopyMeta.provider
      ? PROVIDER_LABELS[activeCopyMeta.provider] || activeCopyMeta.provider
      : activeCopyMeta.model || 'IA';
    const detailParts: string[] = [];
    if (activeCopyMeta.provider && activeCopyMeta.model) detailParts.push(activeCopyMeta.model);
    if (activeCopyMeta.tier) detailParts.push(activeCopyMeta.tier);
    const detail = detailParts.join(' \u00b7 ');
    return detail ? `IA: ${providerLabel} \u00b7 ${detail}` : `IA: ${providerLabel}`;
  }, [activeCopyMeta]);

  const reporteiLabel = useMemo(
    () => formatReporteiSummary(activeCopyMeta?.reportei),
    [activeCopyMeta]
  );

  const reporteiBadges = useMemo(() => {
    const reportei = activeCopyMeta?.reportei;
    if (!reportei) return [] as string[];
    const badges = [`Reportei${reportei.window ? ` ${reportei.window}` : ''}`];
    if (reportei.format?.name) badges.push(`Formato ${reportei.format.name}`);
    if (reportei.tag?.name) badges.push(`Tag ${reportei.tag.name}`);
    return badges;
  }, [activeCopyMeta]);

  const reporteiKpisLine = useMemo(() => {
    const reportei = activeCopyMeta?.reportei;
    if (!reportei?.kpis?.length) return '';
    return `KPIs: ${reportei.kpis.join(', ')}`;
  }, [activeCopyMeta]);

  const reporteiInsightsLine = useMemo(() => {
    const reportei = activeCopyMeta?.reportei;
    if (!reportei?.insights?.length) return '';
    return `Insights editoriais: ${reportei.insights.join(' \u2022 ')}`;
  }, [activeCopyMeta]);

  const persistCopyMaps = useCallback(
    (
      formatKey: string,
      outputText: string,
      parsedOptions: ParsedOption[],
      copyMeta: CopyVersion,
      clientId?: string
    ) => {
      if (typeof window === 'undefined') return;
      const copyMap = readLocalStorage<Record<string, string>>('edro_copy_by_platform_format', {});
      const key = clientId ? `${clientId}::${formatKey}` : formatKey;
      copyMap[key] = outputText || '';
      window.localStorage.setItem('edro_copy_by_platform_format', JSON.stringify(copyMap));

      const optionsMap = readLocalStorage<Record<string, ParsedOption[]>>('edro_copy_options_by_platform_format', {});
      optionsMap[key] = parsedOptions;
      window.localStorage.setItem('edro_copy_options_by_platform_format', JSON.stringify(optionsMap));

      const metaMap = readLocalStorage<Record<string, any>>('edro_copy_meta_by_platform_format', {});
      metaMap[key] = {
        model: copyMeta.model,
        provider: copyMeta.payload?.provider || copyMeta.payload?._edro?.provider || '',
        tier: copyMeta.payload?.tier || copyMeta.payload?._edro?.tier || '',
        task_type: copyMeta.payload?.taskType || copyMeta.payload?._edro?.task_type || '',
        reportei: copyMeta.payload?._edro?.reportei || null,
      };
      window.localStorage.setItem('edro_copy_meta_by_platform_format', JSON.stringify(metaMap));
    },
    []
  );

  const loadCopyForActiveClient = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!activeFormat?.platform || !activeFormat?.format) return;
    const formatKey = `${activeFormat.platform}::${activeFormat.format}`;
    const activeClient = resolveActiveClient();
    const clientKey = activeClient?.id ? `${activeClient.id}::${formatKey}` : formatKey;

    try {
      const outputMap = readLocalStorage<Record<string, string>>('edro_copy_by_platform_format', {});
      const storedOutput = outputMap[clientKey] || outputMap[formatKey];
      if (storedOutput) {
        setOutput(String(storedOutput));
        const parsed = parseOptions(String(storedOutput));
        setOptions(parsed);
        setSelectedOption(0);
      }

      const optionsMap = readLocalStorage<Record<string, ParsedOption[]>>('edro_copy_options_by_platform_format', {});
      const storedOptions = optionsMap[clientKey] || optionsMap[formatKey];
      if (Array.isArray(storedOptions) && storedOptions.length) {
        setOptions(storedOptions);
        setSelectedOption(0);
      }

      const metaMap = readLocalStorage<Record<string, CopyMeta>>('edro_copy_meta_by_platform_format', {});
      const storedMeta = metaMap[clientKey] || metaMap[formatKey];
      if (storedMeta) setActiveCopyMeta(storedMeta);
    } catch {
      // ignore cache errors
    }
  }, [activeFormat?.platform, activeFormat?.format]);

  useEffect(() => {
    loadBriefing();
    loadOrchestrator();
  }, [loadBriefing, loadOrchestrator]);

  useEffect(() => {
    loadCopyForActiveClient();
    if (typeof window === 'undefined') return;
    const handler = () => {
      loadCopyForActiveClient();
    };
    window.addEventListener('edro-studio-context-change', handler);
    return () => {
      window.removeEventListener('edro-studio-context-change', handler);
    };
  }, [loadCopyForActiveClient]);

  // Collaborative stepper progress simulation
  useEffect(() => {
    if (!generating || pipeline !== 'collaborative') {
      setCollabStep(0);
      return;
    }
    setCollabStep(0);
    const t1 = setTimeout(() => setCollabStep(1), 4000);
    const t2 = setTimeout(() => setCollabStep(2), 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [generating, pipeline]);

  const handleGenerate = async () => {
    if (!briefing?.id) return;
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      await ensureCopyStageUnlocked(briefing.id);
      const formatName = activeFormat?.format || '';
      const formatLower = formatName.toLowerCase();
      const extraGuidelines: string[] = [];
      if (formatLower.includes('radio') || formatLower.includes('spot')) {
        extraGuidelines.push('Formato de radio: gerar roteiro curto com tempo estimado e fala fluida.');
      }
      if (formatLower.includes('tv') || formatLower.includes('video')) {
        extraGuidelines.push('Formato audiovisual: incluir indicacoes de cena e locucao quando pertinente.');
      }
      if (formatLower.includes('outdoor') || formatLower.includes('ooh') || formatLower.includes('busdoor')) {
        extraGuidelines.push('OOH: copy curto, direto e legivel a distancia.');
      }
      if (catalogItem?.best_practices?.length) {
        extraGuidelines.push(`Boas praticas da peca: ${catalogItem.best_practices.join('; ')}`);
      }
      if (catalogItem?.max_chars) {
        const maxCharEntries = Object.entries(catalogItem.max_chars).filter(
          ([, value]) => typeof value === 'number' && value > 0
        );
        if (maxCharEntries.length) {
          const limitsText = maxCharEntries
            .map(([key, value]) => `${MAX_CHAR_LABELS[key] || key}: ate ${value} caracteres`)
            .join(', ');
          extraGuidelines.push(`Limites de caracteres: ${limitsText}.`);
        }
      }

      const targetClients = resolveTargetClients();
      const activeClient = resolveActiveClient();
      const clientsToGenerate = targetClients.length ? targetClients : [null];
      const primaryClientId = activeClient?.id || clientsToGenerate[0]?.id || '';
      let primaryCopy: CopyVersion | null = null;

      for (const client of clientsToGenerate) {
        const instructionLines = [
          client?.name ? `Cliente: ${client.name}` : '',
          client?.segment ? `Segmento: ${client.segment}` : '',
          `Formato selecionado: ${activeFormat?.format || 'nao informado'}`,
          `Plataforma: ${activeFormat?.platform || 'nao informado'}`,
          activeFormat?.production_type ? `Tipo de producao: ${activeFormat.production_type}` : '',
          tone ? `Tom de voz: ${tone}` : '',
          clientsToGenerate.length > 1 ? 'Gerar opcoes alinhadas a este cliente.' : '',
          'Retorne opcoes separadas e numeradas.',
          ...extraGuidelines,
        ].filter(Boolean);

        const response = await apiPost<{ success: boolean; data: { copy: CopyVersion } }>(
          `/edro/briefings/${briefing.id}/copy`,
          {
            count,
            pipeline,
            task_type: taskType,
            force_provider: forceProvider || undefined,
            instructions: instructionLines.join('\n'),
            metadata: {
              format: activeFormat?.format || null,
              platform: activeFormat?.platform || null,
              production_type: activeFormat?.production_type || null,
              client_id: client?.id || null,
              client_name: client?.name || null,
              tone,
              task_type: taskType,
              pipeline,
              provider: forceProvider || null,
              source: 'studio',
              allow_auto_stage: true,
            },
          }
        );

        const created = response?.data?.copy;
        if (!created?.id) throw new Error('Falha ao gerar copy.');

        setCopies((prev) => [created, ...prev]);
        if (!primaryCopy && (!primaryClientId || client?.id === primaryClientId)) {
          primaryCopy = created;
        }

        if (typeof window !== 'undefined' && activeFormat?.platform && activeFormat?.format) {
          const key = `${activeFormat.platform}::${activeFormat.format}`;
          const parsed = parseOptions(created.output || '');
          persistCopyMaps(key, created.output || '', parsed, created, client?.id);
          setCopyProgressTick((prev) => prev + 1);
        }
      }

      if (primaryCopy) {
        setOutput(primaryCopy.output || '');
        const parsed = parseOptions(primaryCopy.output || '');
        setOptions(parsed);
        setSelectedOption(0);
        setActiveCopyMeta(extractCopyMeta(primaryCopy));
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('edro_copy_version_id', primaryCopy.id);
        }
        setCopyProgressTick((prev) => prev + 1);
      }

      setSuccess(
        clientsToGenerate.length > 1
          ? `Copys geradas para ${clientsToGenerate.length} clientes.`
          : 'Copy gerada com sucesso.'
      );
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar copy.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectVersion = (copy: CopyVersion) => {
    setOutput(copy.output || '');
    const parsed = parseOptions(copy.output || '');
    setOptions(parsed);
    setSelectedOption(0);
    setActiveCopyMeta(extractCopyMeta(copy));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('edro_copy_version_id', copy.id);
      if (activeFormat?.platform && activeFormat?.format) {
        const key = `${activeFormat.platform}::${activeFormat.format}`;
        const parsed = parseOptions(copy.output || '');
        const activeClient = resolveActiveClient();
        persistCopyMaps(key, copy.output || '', parsed, copy, activeClient?.id);
      }
    }
    setCopyProgressTick((prev) => prev + 1);
  };

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
    if (typeof window !== 'undefined') {
      const selected = options[index];
      window.localStorage.setItem(
        'edro_selected_copy_option',
        JSON.stringify({
          copyVersionId: typeof window !== 'undefined' ? window.localStorage.getItem('edro_copy_version_id') : null,
          optionIndex: index,
          option: selected,
        })
      );
      if (activeFormat?.platform && activeFormat?.format) {
        const key = `${activeFormat.platform}::${activeFormat.format}`;
        const map = readLocalStorage<Record<string, string>>('edro_copy_by_platform_format', {});
        const activeClient = resolveActiveClient();
        const clientKey = activeClient?.id ? `${activeClient.id}::${key}` : key;
        map[clientKey] = output || '';
        window.localStorage.setItem('edro_copy_by_platform_format', JSON.stringify(map));
      }
    }
    setCopyProgressTick((prev) => prev + 1);
  };

  if (loading && !briefing) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Carregando copy studio...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={3}>
        {/* Page Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>Copy Studio</Typography>
            <Typography variant="body2" color="text.secondary">
              Gere e refine copies com base no briefing e nas boas praticas.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {activeFormat?.platform ? <Chip size="small" variant="outlined" label={activeFormat.platform} /> : null}
            {formatLabel ? <Chip size="small" variant="outlined" label={formatLabel} /> : null}
            {activeCopyLabel ? <Chip size="small" label={activeCopyLabel} /> : null}
          </Stack>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        {/* Main + Sidebar grid */}
        <Grid container spacing={3}>
          {/* Main panel */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={3}>
              <Grid container spacing={3}>
                {/* Mockup card */}
                <Grid size={{ xs: 12, xl: 5 }}>
                  <Card>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
                        <Chip size="small" label="Mockup ao vivo" />
                        {mockupMeta ? <Typography variant="caption" color="text.secondary">{mockupMeta}</Typography> : null}
                      </Stack>
                      <LiveMockupPreview
                        platform={activeFormat?.platform}
                        format={activeFormat?.format}
                        productionType={activeFormat?.production_type}
                        copy={output}
                        option={selectedOptionData}
                        bestPractices={catalogItem?.best_practices}
                        maxChars={catalogItem?.max_chars}
                        notes={catalogItem?.notes}
                        brandName={briefing?.client_name}
                        showHeader={false}
                      />
                      {catalogLoading ? (
                        <Typography variant="overline" color="text.disabled" sx={{ mt: 1 }}>
                          carregando boas praticas...
                        </Typography>
                      ) : null}
                    </CardContent>
                  </Card>
                </Grid>
                {/* Copy options card */}
                <Grid size={{ xs: 12, xl: 7 }}>
                  <Card>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" spacing={1} sx={{ mb: 2 }}>
                        <Box>
                          <Chip size="small" label="Opcoes de copy" />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {formatLabel}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {options.length ? `${options.length} opcoes` : 'Sem opcoes'}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setShowVersionHistory(true)}
                            disabled={!activeFormat?.id}
                          >
                            History
                          </Button>
                          <Chip size="small" label={activeCopyLabel} />
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {providerLabels.length ? (
                              providerLabels.map((provider) => (
                                <Chip key={provider.provider} size="small" label={`${provider.label} ${provider.configured ? '\u2713' : 'x'}`} />
                              ))
                            ) : (
                              <Chip size="small" label="Sem IA" />
                            )}
                          </Stack>
                          {reporteiBadges.length ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {reporteiBadges.map((badge) => (
                                <Chip key={badge} size="small" label={badge} />
                              ))}
                            </Stack>
                          ) : null}
                          <TextField
                            select
                            size="small"
                            value={pipeline}
                            onChange={(e) => setPipeline(e.target.value as any)}
                            sx={{ minWidth: 160 }}
                          >
                            <MenuItem value="simple">Simples (1 IA)</MenuItem>
                            <MenuItem value="standard">Standard (2 IAs)</MenuItem>
                            <MenuItem value="premium">Premium (Claude)</MenuItem>
                            <MenuItem value="collaborative">Colaborativo (3 IAs)</MenuItem>
                          </TextField>
                          <Button size="small" variant="contained" onClick={handleGenerate} disabled={generating}>
                            {generating ? 'Gerando...' : 'Gerar com IA'}
                          </Button>
                        </Stack>
                      </Stack>
                      {reporteiLabel ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{reporteiLabel}</Typography> : null}
                      {reporteiKpisLine ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{reporteiKpisLine}</Typography> : null}
                      {reporteiInsightsLine ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{reporteiInsightsLine}</Typography> : null}

                      {generating && pipeline === 'collaborative' && (
                        <Card variant="outlined" sx={{ mt: 2, bgcolor: 'grey.50' }}>
                          <CardContent sx={{ py: 2 }}>
                            <Stepper activeStep={collabStep} alternativeLabel>
                              <Step completed={collabStep > 0}>
                                <StepLabel>
                                  <Typography variant="caption" fontWeight={collabStep === 0 ? 700 : 400}>
                                    Gemini
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Analisando
                                  </Typography>
                                </StepLabel>
                              </Step>
                              <Step completed={collabStep > 1}>
                                <StepLabel>
                                  <Typography variant="caption" fontWeight={collabStep === 1 ? 700 : 400}>
                                    OpenAI
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Criando
                                  </Typography>
                                </StepLabel>
                              </Step>
                              <Step completed={!generating && collabStep >= 2}>
                                <StepLabel>
                                  <Typography variant="caption" fontWeight={collabStep === 2 ? 700 : 400}>
                                    Claude
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Revisando
                                  </Typography>
                                </StepLabel>
                              </Step>
                            </Stepper>
                            {collabStep === 0 && <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />}
                            {collabStep === 1 && <LinearProgress color="warning" sx={{ mt: 2, borderRadius: 2 }} />}
                            {collabStep === 2 && <LinearProgress color="secondary" sx={{ mt: 2, borderRadius: 2 }} />}
                          </CardContent>
                        </Card>
                      )}

                      <Stack spacing={1} sx={{ mt: 2 }}>
                        {options.length ? (
                          options.map((option, index) => (
                            <Card
                              key={index}
                              variant={selectedOption === index ? 'elevation' : 'outlined'}
                              sx={{
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                ...(selectedOption === index ? { borderColor: 'primary.main', bgcolor: 'primary.lighter' } : {}),
                              }}
                              onClick={() => handleSelectOption(index)}
                            >
                              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {option.title || `Opcao ${index + 1}`}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                  {option.body || option.raw}
                                </Typography>
                                {option.cta ? (
                                  <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                                    CTA: {option.cta}
                                  </Typography>
                                ) : null}
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                            Nenhuma opcao gerada.
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Version History */}
              {copies.length ? (
                <Card>
                  <CardContent>
                    <Chip size="small" label="Historico de versoes" sx={{ mb: 2 }} />
                    <Stack spacing={1}>
                      {copies.map((copy) => {
                        const reporteiSummary = formatReporteiSummary((copy.payload as any)?._edro?.reportei || null);
                        return (
                          <Card key={copy.id} variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => handleSelectVersion(copy)}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle2" fontWeight={600}>{copy.model || 'IA'}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {copy.created_at ? new Date(copy.created_at).toLocaleString('pt-BR') : 'Agora'}
                                </Typography>
                              </Stack>
                              {reporteiSummary ? (
                                <Typography variant="caption" color="text.secondary">{reporteiSummary}</Typography>
                              ) : null}
                              <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {copy.output?.slice(0, 160)}
                              </Typography>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>
                  </CardContent>
                </Card>
              ) : null}
            </Stack>
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Chip size="small" label="Inventario de pecas" />
                  <Typography variant="caption" color="text.secondary">
                    {inventoryProgress.done}/{inventoryProgress.total}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={inventoryProgress.total ? Math.round((inventoryProgress.done / inventoryProgress.total) * 100) : 0}
                  sx={{ height: 6, borderRadius: 3, mb: 2 }}
                />
                <Stack spacing={1}>
                  {inventoryProgress.items.length ? (
                    inventoryProgress.items.map((item) => (
                      <Card
                        key={item.id}
                        variant={item.id === activeFormatId ? 'elevation' : 'outlined'}
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          ...(item.id === activeFormatId ? { borderColor: 'primary.main', boxShadow: 2 } : {}),
                        }}
                        onClick={() => setActiveFormatId(item.id)}
                      >
                        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {item.platform || 'Plataforma'} &middot; {item.format || 'Formato'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.production_type ? item.production_type : 'Tipo nao informado'}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              color={item.hasCopy ? 'success' : 'default'}
                              label={item.hasCopy ? 'Feito' : 'Pendente'}
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      Nenhum formato selecionado.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Footer actions */}
        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button variant="outlined" onClick={() => router.back()}>
            Voltar
          </Button>
          <Button variant="contained" onClick={() => router.push('/studio/mockups')}>
            Aprovar e avancar
          </Button>
        </Stack>
      </Stack>

      {activeFormat?.id && (
        <PostVersionHistory
          postAssetId={activeFormat.id}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </>
  );
}
