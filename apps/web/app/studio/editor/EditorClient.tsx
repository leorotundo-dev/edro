'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PostVersionHistory from '@/components/PostVersionHistory';
import LiveMockupPreview from '@/components/mockups/LiveMockupPreview';
import RejectionReasonPicker from '@/components/studio/RejectionReasonPicker';
import CollaborativeInsights from '@/components/studio/CollaborativeInsights';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { matchPlatformRule } from '@/lib/platformRules';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import {
  IconCheck,
  IconCopy,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconBolt,
  IconX,
} from '@tabler/icons-react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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

type CarouselSlide = { title: string; body: string };

type ParsedOption = {
  title: string;
  body: string;
  cta: string;
  legenda: string;
  hashtags: string;
  raw: string;
  slides?: CarouselSlide[];
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
  { value: 'variations', label: 'Variações' },
  { value: 'institutional_copy', label: 'Institucional' },
  { value: 'campaign_strategy', label: 'Estrategia de campanha' },
];

const PIPELINE_LABELS: Record<string, string> = {
  simple: 'Rápido',
  standard: 'Padrão',
  premium: 'Premium',
  collaborative: 'Colaborativo (Gemini -> OpenAI -> Claude)',
  adversarial: 'Adversarial (3 IAs independentes)',
};

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

const autoSelectPipeline = (dueAt?: string | null, clientTier?: string | null) => {
  const due = dueAt ? new Date(dueAt) : null;
  const hoursUntilDue = due ? (due.getTime() - Date.now()) / (1000 * 60 * 60) : 999;
  if (hoursUntilDue > 0 && hoursUntilDue < 4) return 'simple';
  if (String(clientTier || '').toLowerCase() === 'premium') return 'collaborative';
  return 'standard';
};

const autoSelectTaskType = (platform?: string | null, format?: string | null) => {
  const formatText = String(format || '').toLowerCase();
  const platformText = String(platform || '').toLowerCase();
  if (
    formatText.includes('reels') ||
    formatText.includes('tiktok') ||
    formatText.includes('youtube') ||
    formatText.includes('video')
  ) {
    return 'campaign_strategy';
  }
  if (platformText.includes('linkedin') || formatText.includes('institucional')) {
    return 'institutional_copy';
  }
  if (formatText.includes('headline') || formatText.includes('ooh') || formatText.includes('outdoor')) {
    return 'headlines';
  }
  return 'social_post';
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

// Vídeos CURTOS de social media (Hook/Corpo/CTA) — exclui vídeos institucionais/TV
const isCarouselFormat = (format?: string | null): boolean => {
  if (!format) return false;
  const f = format.toLowerCase();
  return f.includes('carrossel') || f.includes('carousel') || f.includes('caroussel');
};

const isVideoFormat = (format?: string | null): boolean => {
  if (!format) return false;
  const f = format.toLowerCase();
  return (
    f.includes('reels') ||
    f.includes('tiktok') ||
    f.includes('shorts') ||
    f.includes('youtube shorts') ||
    (f.includes('video') && (f.includes('social') || f.includes('feed') || f.includes('story') || f.includes('ig ') || f.includes('instagram') || f.includes('tik') || f.includes('reel')))
  );
};

// Strip common markdown formatting from a string
function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

function parseOptionChunk(chunk: string): ParsedOption {
  const lines = chunk.split('\n');
  const fields: Record<string, string> = {};
  let currentField = '';
  const slides: CarouselSlide[] = [];

  for (const rawLine of lines) {
    const raw = rawLine.trim();
    if (!raw) continue;

    // Strip markdown from line for matching (keep raw value for display)
    const line = stripMd(raw);
    if (!line) continue;

    // Skip OPCAO N: header lines (with or without markdown / extra suffix)
    if (/^OPCA[OÃo]\s*\d+/i.test(line)) { currentField = ''; continue; }
    // Skip editorial meta lines (e.g. "ANÁLISE EDITORIAL", "REESCRITA", score lines)
    if (/^ANÁLISE\b|^REESCRITA\b|^\d+[\.,]\d+\/10|^---+$/i.test(line)) continue;

    // Carousel slide detection
    const slideM = line.match(/^slide\s*(\d+)\s*[:\-]\s*(.*)/i);
    if (slideM) {
      const idx = Math.min(parseInt(slideM[1], 10) - 1, 4);
      while (slides.length <= idx) slides.push({ title: '', body: '' });
      slides[idx].title = stripMd(slideM[2]).trim();
      currentField = `_slide_${idx}`;
      continue;
    }

    const arteTitle = line.match(/^arte\s*[-–]\s*t[ií]tulo(?:\s+slide\s*\d+)?\s*[:\-]\s*(.+)/i);
    const arteBody  = line.match(/^arte\s*[-–]\s*corpo(?:\s+slide\s*\d+)?\s*[:\-]\s*(.+)/i);
    const legenda   = line.match(/^legenda\s*[:\-]\s*(.*)/i);
    const cta       = line.match(/^cta\s*[:\-]\s*(.+)/i);
    const hashtags  = line.match(/^hashtags?\s*[:\-]\s*(.+)/i);
    const titleFb   = line.match(/^(?:t[ií]tulo|title|headline|chamada)\s*[:\-]\s*(.+)/i);
    const bodyFb    = line.match(/^(?:corpo|body|texto)\s*[:\-]\s*(.+)/i);

    if (arteTitle)  { currentField = 'title';    fields.title    = stripMd(arteTitle[1]); continue; }
    if (arteBody)   { currentField = 'body';     fields.body     = stripMd(arteBody[1]);  continue; }
    if (legenda)    { currentField = 'legenda';  fields.legenda  = stripMd(legenda[1] ?? ''); continue; }
    if (cta)        { currentField = 'cta';      fields.cta      = stripMd(cta[1]);       continue; }
    if (hashtags)   { currentField = 'hashtags'; fields.hashtags = stripMd(hashtags[1]);  continue; }
    if (!fields.title && titleFb) { currentField = 'title'; fields.title = stripMd(titleFb[1]); continue; }
    if (!fields.body  && bodyFb)  { currentField = 'body';  fields.body  = stripMd(bodyFb[1]);  continue; }

    // Multi-line continuation
    if (currentField.startsWith('_slide_')) {
      const idx = parseInt(currentField.split('_')[2], 10);
      if (slides[idx]) {
        const clean = stripMd(raw);
        slides[idx].body = slides[idx].body ? `${slides[idx].body}\n${clean}` : clean;
      }
    } else if (currentField) {
      const clean = stripMd(raw);
      fields[currentField] = fields[currentField] ? `${fields[currentField]}\n${clean}` : clean;
    }
  }

  const body = fields.body || (Object.keys(fields).length === 0 && slides.length === 0 ? stripMd(chunk) : '');
  return {
    title:    fields.title    || '',
    body,
    cta:      fields.cta      || '',
    legenda:  fields.legenda  || '',
    hashtags: fields.hashtags || '',
    raw: chunk,
    slides:   slides.length ? slides : undefined,
  };
}

function parseOptions(text: string): ParsedOption[] {
  if (!text) return [];

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  let trimmed = text.trim()
    .replace(/^```(?:json|javascript|text|plaintext)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  // Try JSON parse — handle keys from multiple AI formats
  try {
    const parsed = JSON.parse(trimmed);
    const arr =
      parsed.options     ||
      parsed.copys       ||
      parsed.copies      ||
      parsed.variations  ||
      parsed.copies_ranqueadas ||
      parsed.copias_ranqueadas ||
      parsed.opcoes;
    if (Array.isArray(arr)) {
      return arr.map((o: any) => ({
        title:    o.arte_titulo || o.title    || o.headline || o.titulo || '',
        body:     o.arte_corpo  || o.body     || o.corpo    || o.text   || '',
        cta:      o.cta || o.call_to_action || o.callToAction || '',
        legenda:  o.legenda || o.caption || '',
        hashtags: Array.isArray(o.hashtags) ? o.hashtags.join(' ') : (o.hashtags || ''),
        raw: JSON.stringify(o),
      }));
    }
  } catch {
    // not JSON — continue
  }

  // Split on OPCAO N: headers — supports plain, markdown heading prefix,
  // and extra suffix like "(REESCRITA - 8.2/10)"
  const opcaoSplit = trimmed.split(/\n(?=(?:#{1,3}\s*)?OPCA[OÃo]\s*\d+\s*[:\(\-]?)/i).filter(Boolean);
  if (opcaoSplit.length > 1) {
    return opcaoSplit.map(parseOptionChunk);
  }

  // Split on numbered list fallback
  const chunks = trimmed
    .split(/\n(?=\s*\d+[\).:-]\s+)/g)
    .map((c) => c.replace(/^\s*\d+[\).:-]\s*/, '').trim())
    .filter(Boolean);

  if (!chunks.length) {
    return [{ title: '', body: trimmed, cta: '', legenda: '', hashtags: '', raw: trimmed }];
  }

  return chunks.map(parseOptionChunk);
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

const AMD_LABELS: Record<string, string> = {
  salvar: 'Salvar', compartilhar: 'Compartilhar', clicar: 'Clicar',
  responder: 'Responder', marcar_alguem: 'Marcar alguém', pedir_proposta: 'Pedir proposta',
};

function CharCounter({ text, max }: { text: string; max?: number }) {
  if (!max) return null;
  const count = text.length;
  const pct = count / max;
  const color = pct > 1 ? 'error.main' : pct > 0.85 ? 'warning.main' : 'text.disabled';
  return (
    <Typography component="span" variant="caption" sx={{ color, fontSize: '0.58rem', ml: 0.5, fontVariantNumeric: 'tabular-nums' }}>
      {count}/{max}
    </Typography>
  );
}

export default function EditorClient() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<BriefingResponse['briefing'] | null>(null);
  const [copies, setCopies] = useState<CopyVersion[]>([]);
  const [orchestrator, setOrchestrator] = useState<OrchestratorInfo | null>(null);
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeFormatId, setActiveFormatId] = useState('');
  const [editorCopy, setEditorCopy] = useState({ headline: '', body: '', cta: '', legenda: '' });
  const [output, setOutput] = useState('');
  const [options, setOptions] = useState<ParsedOption[]>([]);
  const [selectedOption, setSelectedOption] = useState(0);
  const [pipeline, setPipeline] = useState<'simple' | 'standard' | 'premium' | 'collaborative' | 'adversarial'>('collaborative');
  const [collabStep, setCollabStep] = useState(0);
  const [taskType, setTaskType] = useState('social_post');
  const [forceProvider, setForceProvider] = useState('');
  const [tone, setTone] = useState('');
  const [count, setCount] = useState(3);
  const [activeCopyMeta, setActiveCopyMeta] = useState<CopyMeta | null>(null);
  const [clientBrandColor, setClientBrandColor] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copyProgressTick, setCopyProgressTick] = useState(0);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(true);
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [videoScript, setVideoScript] = useState<{ hook: string; corpo: string; cta: string }>({ hook: '', corpo: '', cta: '' });
  const [qualityScore, setQualityScore] = useState<{ overall: number; brand_dna_match: number; platform_fit: number; cta_clarity: number; needs_revision: boolean } | null>(null);
  const [qualityScores, setQualityScores] = useState<Array<{ variation_index: number; scores: { brand_dna_match: number; platform_fit: number; cta_clarity: number }; overall: number; pass: boolean; issues: string[] }>>([]);
  const [revisionCount, setRevisionCount] = useState(0);
  const [revisionHistory, setRevisionHistory] = useState<Array<{ loop: number; issues_raised: string[]; score_before: number; score_after: number }>>([]);
  const [collabAnalysis, setCollabAnalysis] = useState('');
  const [analysisJson, setAnalysisJson] = useState<Record<string, any> | null>(null);
  const [adversarialContributions, setAdversarialContributions] = useState<{ gemini: string; openai: string; claude: string } | null>(null);
  const [adversarialVersions, setAdversarialVersions] = useState<{ gemini: string; openai: string; claude: string } | null>(null);
  const [amdResults, setAmdResults] = useState<Record<string, string>>({});
  const [arteImageUrl, setArteImageUrl] = useState<string | null>(null);
  const [arteStep, setArteStep] = useState<null | 'loading_prompt' | 'generating'>(null);
  const [artePrompt, setArtePrompt] = useState('');
  const [arteVariations, setArteVariations] = useState<string[]>([]);
  const [arteRefsCount, setArteRefsCount] = useState(0);
  const [arteModalError, setArteModalError] = useState('');
  const [imageModel, setImageModel] = useState('gemini-2.0-flash-exp-image-generation');
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
  const [imageNegativePrompt, setImageNegativePrompt] = useState('');
  // Loop de aprendizado: guarda o prompt da imagem exibida + estado do dialog de descarte
  const [arteGeneratedPrompt, setArteGeneratedPrompt] = useState('');
  const [arteDiscardOpen, setArteDiscardOpen] = useState(false);
  const [arteDiscardTags, setArteDiscardTags] = useState<string[]>([]);
  // Iteração Guiada
  const [arteRefinement, setArteRefinement] = useState('');
  const [arteRefining, setArteRefining] = useState(false);
  // Preview Rápido
  const [arteIsPreview, setArteIsPreview] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    });
  };

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
      if (!data?.briefing) throw new Error('Briefing não encontrado.');
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
      // Carregar cor da marca do cliente ativo
      const activeClient = resolveActiveClient();
      if (activeClient?.id) {
        apiGet<any>(`/clients/${activeClient.id}/profile`)
          .then((res) => {
            const colors: string[] = res?.profile?.brand_colors || res?.brand_colors || [];
            if (colors.length) setClientBrandColor(colors[0]);
          })
          .catch(() => {});
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
    : 'Formato não definido';

  const mockupMeta = useMemo(() => {
    const parts = [activeFormat?.platform, activeFormat?.format].filter(Boolean) as string[];
    if (catalogItem?.production_type) parts.push(catalogItem.production_type);
    return parts.join(' \u00b7 ');
  }, [activeFormat?.platform, activeFormat?.format, catalogItem?.production_type]);

  const selectedOptionData = useMemo(() => options[selectedOption] || null, [options, selectedOption]);

  // Sync editorCopy fields when the selected option changes (new generation or option switch)
  useEffect(() => {
    if (!selectedOptionData) return;
    setEditorCopy({
      headline: selectedOptionData.title || '',
      body: selectedOptionData.body || '',
      cta: selectedOptionData.cta || '',
      legenda: selectedOptionData.legenda || '',
    });
  }, [selectedOptionData]);

  // Merge selectedOptionData with live-edited editorCopy for preview + approval
  const resolvedOption = useMemo<ParsedOption | null>(() => {
    if (!selectedOptionData) return null;
    return {
      ...selectedOptionData,
      title: editorCopy.headline,
      body: editorCopy.body,
      cta: editorCopy.cta,
      legenda: editorCopy.legenda,
    };
  }, [selectedOptionData, editorCopy]);

  const copyWarnings = useMemo(() => {
    const rule = matchPlatformRule(activeFormat?.platform || '');
    if (!rule) return [];
    const legendaText = selectedOptionData?.legenda || '';
    const warnings: Array<{ type: string; message: string }> = [];
    if (legendaText.length > rule.fold) {
      warnings.push({
        type: 'truncation',
        message: `${rule.hookWarning} (+${legendaText.length - rule.fold} chars além da dobra)`,
      });
    }
    const hashCount = (legendaText.match(/#/g) || []).length;
    if (rule.maxHashtags >= 0 && hashCount > rule.maxHashtags) {
      warnings.push({
        type: 'hashtags',
        message: `${hashCount} hashtags na legenda — ideal para ${activeFormat?.platform}: máx ${rule.maxHashtags}.`,
      });
    }
    return warnings;
  }, [activeFormat?.platform, selectedOptionData?.legenda]);

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

  // Auto-generate on first visit when briefing has no copies yet
  const hasAutoGeneratedRef = useRef(false);
  useEffect(() => {
    if (loading || !briefing?.id || generating || options.length > 0) return;
    if (hasAutoGeneratedRef.current) return;
    hasAutoGeneratedRef.current = true;
    handleGenerate(); // eslint-disable-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, briefing?.id, options.length]);

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
      if (isCarouselFormat(formatName)) {
        extraGuidelines.push(
          'FORMATO CARROSSEL — estruture CADA OPCAO com exatamente 3 slides:\n' +
          'Slide 1: [Título do slide — gancho/abertura]\n[texto do slide 1]\n' +
          'Slide 2: [Título do slide — desenvolvimento]\n[texto do slide 2]\n' +
          'Slide 3: [Título do slide — fechamento ou CTA]\n[texto do slide 3]\n' +
          'Legenda: [caption para o post]\n' +
          'Hashtags: [#tag1 #tag2 ...]'
        );
      }
      if (isVideoFormat(formatName)) {
        // Vídeo curto (Reels/TikTok/Shorts): estrutura Hook/Corpo/CTA — sobrepõe a instrução genérica
        extraGuidelines.push(
          'FORMATO VIDEO CURTO — estruture CADA OPCAO obrigatoriamente com:\nHook: [gancho de abertura 0-3s]\nCorpo: [desenvolvimento 10-25s]\nCTA: [chamada para acao final]'
        );
      } else if (formatLower.includes('tv') || formatLower.includes('video')) {
        // TV e vídeo institucional longo: roteiro com cenas (NÃO é Hook/Corpo/CTA)
        extraGuidelines.push('Formato audiovisual: incluir indicações de cena e locução quando pertinente.');
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
          `Formato selecionado: ${activeFormat?.format || 'não informado'}`,
          `Plataforma: ${activeFormat?.platform || 'não informado'}`,
          activeFormat?.production_type ? `Tipo de produção: ${activeFormat.production_type}` : '',
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
        setComparisonMode(true);
        setRegenerationCount((c) => c + 1);
        setActiveCopyMeta(extractCopyMeta(primaryCopy));
        if (isVideoFormat(activeFormat?.format) && parsed[0]) {
          setVideoScript({ hook: parsed[0].title || '', corpo: parsed[0].body || '', cta: parsed[0].cta || '' });
        }
        const qs = primaryCopy.payload?.quality_score ?? null;
        setQualityScore(qs ? { overall: qs.overall, brand_dna_match: qs.brand_dna_match, platform_fit: qs.platform_fit, cta_clarity: qs.cta_clarity, needs_revision: qs.needs_revision } : null);
        const qsArr = primaryCopy.payload?.quality_scores;
        setQualityScores(Array.isArray(qsArr) ? qsArr : []);
        setRevisionCount(primaryCopy.payload?.revision_count ?? 0);
        setRevisionHistory(Array.isArray(primaryCopy.payload?.revision_history) ? primaryCopy.payload.revision_history : []);
        setCollabAnalysis(primaryCopy.payload?.gemini_analysis ?? '');
        setAnalysisJson(primaryCopy.payload?.analysis_json ?? null);
        setAdversarialContributions(primaryCopy.payload?.contributions ?? null);
        setAdversarialVersions(primaryCopy.payload?.versions ?? null);
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
    const qsArr2 = copy.payload?.quality_scores;
    setQualityScores(Array.isArray(qsArr2) ? qsArr2 : []);
    setRevisionCount(copy.payload?.revision_count ?? 0);
    setRevisionHistory(Array.isArray(copy.payload?.revision_history) ? copy.payload.revision_history : []);
    setCollabAnalysis(copy.payload?.gemini_analysis ?? '');
    setAnalysisJson(copy.payload?.analysis_json ?? null);
    setAdversarialContributions(copy.payload?.contributions ?? null);
    setAdversarialVersions(copy.payload?.versions ?? null);
    const qs2 = copy.payload?.quality_score ?? null;
    setQualityScore(qs2 ? { overall: qs2.overall, brand_dna_match: qs2.brand_dna_match, platform_fit: qs2.platform_fit, cta_clarity: qs2.cta_clarity, needs_revision: qs2.needs_revision } : null);
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

  const advanceToNextPendingFormat = () => {
    if (typeof window === 'undefined') return;
    const map = readLocalStorage<Record<string, string>>('edro_copy_by_platform_format', {});
    const activeClient = resolveActiveClient();
    const currentIdx = inventory.findIndex((item) => item.id === activeFormatId);
    for (let i = currentIdx + 1; i < inventory.length; i++) {
      const item = inventory[i];
      const key = `${item.platform || 'Plataforma'}::${item.format || 'Formato'}`;
      const clientKey = activeClient?.id ? `${activeClient.id}::${key}` : key;
      const stored = map[clientKey] || map[key] || '';
      if (!stored.trim()) {
        setActiveFormatId(item.id);
        setOptions([]);
        setOutput('');
        setComparisonMode(true);
        hasAutoGeneratedRef.current = false;
        return;
      }
    }
    setSuccess('Todas as peças do inventário foram concluídas!');
  };

  const handleCopySelected = async (selectedIdx: number) => {
    handleSelectOption(selectedIdx);
    const rejectedIdx = selectedIdx === 0 ? 1 : 0;
    const activeClient = resolveActiveClient();
    const clientId = activeClient?.id;
    const copyId = resolveActiveCopyId();
    try {
      await Promise.all([
        // Aprovar o copy no sistema
        copyId
          ? apiPatch(`/edro/copies/${copyId}/feedback`, {
              status: 'approved',
              approved_text: optionToText(options[selectedIdx] ?? null),
              feedback: 'Aprovada no Creative Studio',
            })
          : Promise.resolve(),
        // Registrar preferência aprendida (aprovado)
        clientId
          ? apiPost(`/clients/${clientId}/copy-feedback`, {
              feedback_type: 'copy',
              action: 'approved',
              copy_approved_text: optionToText(options[selectedIdx] ?? null),
              copy_platform: activeFormat?.platform,
              copy_pipeline: pipeline,
            })
          : Promise.resolve(),
        // Registrar preferência aprendida (rejeitado)
        clientId && options[rejectedIdx]
          ? apiPost(`/clients/${clientId}/copy-feedback`, {
              feedback_type: 'copy',
              action: 'rejected',
              copy_rejected_text: optionToText(options[rejectedIdx] ?? null),
              copy_platform: activeFormat?.platform,
              copy_pipeline: pipeline,
            })
          : Promise.resolve(),
      ]);
    } catch { /* non-blocking */ }
    advanceToNextPendingFormat();
  };

  const resolveActiveCopyId = () => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('edro_copy_version_id') || '';
  };

  // Fase 1: busca as referências visuais e monta o prompt sem gerar a imagem
  const handleGenerateArte = async () => {
    const copyVersionId = resolveActiveCopyId();
    const briefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
    if (!briefingId || !copyVersionId) return;

    setArteStep('loading_prompt');
    try {
      const res = await apiPost<{ success: boolean; prompt?: string; prompt_variations?: string[]; visual_refs_count?: number; error?: string }>(
        `/edro/briefings/${briefingId}/generate-creative`,
        {
          copy_version_id: copyVersionId,
          format: activeFormat?.format || 'instagram-feed',
          brand_color: clientBrandColor || undefined,
          client_id: typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') || undefined : undefined,
          headline: editorCopy.headline || undefined,
          body_text: editorCopy.body || undefined,
          prompt_only: true,
        }
      );
      if (res.success && res.prompt) {
        const variations = res.prompt_variations?.length ? res.prompt_variations : [res.prompt];
        setArteVariations(variations);
        setArtePrompt(variations[0]);
        setArteRefsCount(res.visual_refs_count || 0);
        setArteModalError('');
        setArteStep(null);
      } else {
        setError(res.error || 'Erro ao montar prompt de arte');
        setArteStep(null);
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao buscar referências visuais');
      setArteStep(null);
    }
  };

  // Fase 2: gera a imagem com o prompt (possivelmente editado pelo usuário)
  const handleGenerateArteWithPrompt = async () => {
    const copyVersionId = resolveActiveCopyId();
    const briefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
    if (!briefingId || !copyVersionId) {
      setArteModalError(`Dados insuficientes para gerar — briefingId: ${briefingId ? 'ok' : 'ausente'}, copyVersionId: ${copyVersionId || 'ausente'}`);
      return;
    }

    setArteModalError('');
    setArteStep('generating');
    try {
      const res = await apiPost<{ success: boolean; image_url?: string; data?: { image_url?: string }; error?: string }>(
        `/edro/briefings/${briefingId}/generate-creative`,
        {
          copy_version_id: copyVersionId,
          format: activeFormat?.format || 'instagram-feed',
          brand_color: clientBrandColor || undefined,
          client_id: typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') || undefined : undefined,
          headline: editorCopy.headline || undefined,
          body_text: editorCopy.body || undefined,
          custom_prompt: artePrompt || undefined,
          image_model: imageModel,
          aspect_ratio: imageModel.startsWith('imagen-') ? imageAspectRatio : undefined,
          negative_prompt: imageNegativePrompt || undefined,
        }
      );
      const imageUrl = res.image_url || res.data?.image_url;
      if (res.success && imageUrl) {
        setArteImageUrl(imageUrl);
        setArteGeneratedPrompt(artePrompt); // salva para feedback posterior
        setArteDiscardTags([]);
        setArteStep(null);
        setArteModalError('');
        setArteIsPreview(false);
        // Persist so step 4 (Mockups) can load it
        if (briefingId) {
          apiPost(`/edro/briefings/${briefingId}/creative-image`, { imageUrl }).catch(() => null);
        }
      } else {
        const msg = res.error || 'Gemini não retornou imagem. Tente novamente.';
        console.error('[arteIA] generate-creative error:', msg, res);
        setArteModalError(msg);
        setArteStep(null);
      }
    } catch (e: any) {
      const msg = e?.message || 'Erro de rede ao gerar arte com IA';
      console.error('[arteIA] generate-creative exception:', msg);
      setArteModalError(msg);
      setArteStep(null);
    }
  };

  // ── Iteração Guiada — refina a narrativa em linguagem natural ─────────
  const handleRefinePrompt = async () => {
    if (!artePrompt.trim() || !arteRefinement.trim()) return;
    const briefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
    if (!briefingId) return;
    setArteRefining(true);
    try {
      const res = await apiPost<{ ok: boolean; refined_prompt?: string; error?: string }>(
        `/edro/briefings/${briefingId}/refine-creative-prompt`,
        {
          current_prompt: artePrompt,
          instruction: arteRefinement,
          headline: editorCopy.headline || undefined,
          brand: briefing?.client_name || undefined,
          client_id: typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') || undefined : undefined,
        }
      );
      if (res.ok && res.refined_prompt) {
        setArtePrompt(res.refined_prompt);
        setArteRefinement('');
      }
    } catch { /* silent — user retains current prompt */ }
    setArteRefining(false);
  };

  // ── Preview Rápido — força Flash para prévia instantânea ──────────────
  const handlePreviewArte = async () => {
    const copyVersionId = resolveActiveCopyId();
    const briefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
    if (!briefingId || !copyVersionId || !artePrompt.trim()) return;

    setArteModalError('');
    setArteStep('generating');
    setArteIsPreview(true);
    try {
      const res = await apiPost<{ success: boolean; image_url?: string; data?: { image_url?: string }; error?: string }>(
        `/edro/briefings/${briefingId}/generate-creative`,
        {
          copy_version_id: copyVersionId,
          format: activeFormat?.format || 'instagram-feed',
          brand_color: clientBrandColor || undefined,
          client_id: typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') || undefined : undefined,
          headline: editorCopy.headline || undefined,
          body_text: editorCopy.body || undefined,
          custom_prompt: artePrompt || undefined,
          image_model: 'gemini-2.0-flash-exp-image-generation', // sempre Flash para prévia
        }
      );
      const imageUrl = res.image_url || res.data?.image_url;
      if (res.success && imageUrl) {
        setArteImageUrl(imageUrl);
        setArteGeneratedPrompt(artePrompt);
        setArteDiscardTags([]);
        setArteStep(null);
      } else {
        setArteModalError(res.error || 'Erro na prévia. Tente novamente.');
        setArteStep(null);
        setArteIsPreview(false);
      }
    } catch (e: any) {
      setArteModalError(e?.message || 'Erro de rede');
      setArteStep(null);
      setArteIsPreview(false);
    }
  };

  // ── Feedback de criativo — loop de aprendizado ──────────────────────
  const sendCreativeFeedback = async (
    action: 'approved' | 'discarded',
    tags?: string[],
    reason?: string
  ) => {
    const briefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
    if (!briefingId || !arteGeneratedPrompt) return;
    const copyVersionId = resolveActiveCopyId();
    const clientId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') || undefined : undefined;
    try {
      await apiPost(`/edro/briefings/${briefingId}/creative-feedback`, {
        action,
        prompt: arteGeneratedPrompt,
        format: activeFormat?.format || 'instagram-feed',
        client_id: clientId,
        copy_version_id: copyVersionId || undefined,
        rejection_tags: tags?.length ? tags : undefined,
        rejection_reason: reason || undefined,
      });
    } catch { /* best-effort — feedback nunca bloqueia */ }
  };

  const handleApproveCreative = () => {
    sendCreativeFeedback('approved');
    // mantém a imagem na tela — usuário continua trabalhando
  };

  const handleDiscardCreative = async (tags: string[], reason?: string) => {
    await sendCreativeFeedback('discarded', tags, reason);
    setArteImageUrl(null);
    setArteGeneratedPrompt('');
    setArteDiscardOpen(false);
    setArteDiscardTags([]);
  };

  const optionToText = (option: ParsedOption | null) => {
    if (!option) return output || '';
    const parts = [
      option.title  ? `Arte - Título: ${option.title}` : '',
      option.body   ? `Arte - Corpo: ${option.body}`   : '',
      option.legenda ? `Legenda: ${option.legenda}`    : '',
      option.cta    ? `CTA: ${option.cta}`             : '',
      option.hashtags ? `Hashtags: ${option.hashtags}` : '',
    ].filter(Boolean);
    return parts.join('\n').trim();
  };

  const handleApproveOption = async () => {
    const copyId = resolveActiveCopyId();
    if (!copyId) {
      setError('Selecione uma versão de copy antes de aprovar.');
      return;
    }
    setFeedbackLoading(true);
    try {
      await apiPatch(`/edro/copies/${copyId}/feedback`, {
        status: 'approved',
        approved_text: optionToText(resolvedOption),
        feedback: 'Aprovada no Creative Studio',
      });
      setSuccess('Opção aprovada e aprendizado salvo no perfil do cliente.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar aprovação.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleRejectOption = async (tags: string[], reason: string) => {
    const copyId = resolveActiveCopyId();
    if (!copyId) {
      setError('Selecione uma versão de copy antes de rejeitar.');
      return;
    }
    setFeedbackLoading(true);
    try {
      await apiPatch(`/edro/copies/${copyId}/feedback`, {
        status: 'rejected',
        rejected_text: optionToText(selectedOptionData),
        rejection_tags: tags,
        rejection_reason: reason || undefined,
        feedback: reason || 'Rejeitada no Creative Studio',
      });
      setRejectOpen(false);
      setRegenerationCount((prev) => prev + 1);
      setOptions([]);
      setOutput('');
      setComparisonMode(true);
      hasAutoGeneratedRef.current = false;
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar rejeição.');
    } finally {
      setFeedbackLoading(false);
    }
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
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            {(() => {
              const ac = resolveActiveClient();
              return ac?.name ? (
                <Chip
                  size="small"
                  label={ac.name}
                  sx={{
                    fontWeight: 700,
                    bgcolor: clientBrandColor ? `${clientBrandColor}22` : 'action.selected',
                    color: clientBrandColor || 'text.primary',
                    border: `1.5px solid ${clientBrandColor || 'transparent'}`,
                  }}
                />
              ) : null;
            })()}
            {activeFormat?.platform ? <Chip size="small" variant="outlined" label={activeFormat.platform} /> : null}
            {formatLabel ? <Chip size="small" variant="outlined" label={formatLabel} /> : null}
            {activeCopyLabel ? <Chip size="small" label={activeCopyLabel} /> : null}
          </Stack>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        {/* AMD Result — registrar se o comportamento mínimo desejado foi alcançado */}
        {success && briefing?.payload?.amd && (() => {
          const briefingAmd = briefing.payload!.amd as string;
          const activeCopyId = resolveActiveCopyId();
          if (!activeCopyId) return null;
          return (
            <Box sx={{ p: 1.5, bgcolor: 'rgba(232,82,25,0.05)', borderRadius: 1, border: '1px dashed rgba(232,82,25,0.3)' }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" color="text.secondary">
                  AMD: {AMD_LABELS[briefingAmd] ?? briefingAmd} — Atingida?
                </Typography>
                {(['sim', 'parcial', 'nao'] as const).map((val) => (
                  <Chip key={val} size="small"
                    label={val === 'sim' ? 'Sim' : val === 'parcial' ? 'Parcial' : 'Não'}
                    onClick={async () => {
                      try {
                        await apiPatch(`/edro/copies/${activeCopyId}/amd-result`, { amd_achieved: val });
                        setAmdResults((prev) => ({ ...prev, [activeCopyId]: val }));
                      } catch { /* non-blocking */ }
                    }}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: amdResults[activeCopyId] === val
                        ? (val === 'sim' ? 'success.main' : val === 'parcial' ? 'warning.main' : 'error.main')
                        : 'transparent',
                      color: amdResults[activeCopyId] === val ? '#fff' : 'text.secondary',
                      border: '1px solid',
                      borderColor: val === 'sim' ? 'success.main' : val === 'parcial' ? 'warning.main' : 'error.main',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          );
        })()}

        <>
        <Grid container>
          <Grid size={{ xs: 12 }}>
            <Stack spacing={3}>
              {/* Inventário de peças — strip compacto */}
              {inventoryProgress.items.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflowX: 'auto', pb: 0.5 }}>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      Peças
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {inventoryProgress.done}/{inventoryProgress.total}
                    </Typography>
                  </Stack>
                  <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {inventoryProgress.items.map((item) => (
                      <Chip
                        key={item.id}
                        size="small"
                        label={`${item.platform || 'Plataforma'} · ${item.format || 'Formato'}`}
                        onClick={() => setActiveFormatId(item.id)}
                        color={item.hasCopy ? 'success' : 'default'}
                        variant={item.id === activeFormatId ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer', flexShrink: 0 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              <Card sx={{ overflow: 'hidden' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr 1fr' } }}>
                {/* Mockup preview */}
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                  <CollaborativeInsights analysisJson={analysisJson} />
                  <LiveMockupPreview
                    platform={activeFormat?.platform}
                    format={activeFormat?.format}
                    productionType={activeFormat?.production_type}
                    copy={output}
                    option={resolvedOption}
                    legenda={resolvedOption?.legenda || null}
                    maxChars={catalogItem?.max_chars}
                    brandName={briefing?.client_name}
                    brandColor={clientBrandColor || undefined}
                    arteImageUrl={arteImageUrl}
                    align="left"
                    showHeader={false}
                  />
                </Box>
                {/* Copy options */}
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                      {/* ── Generation controls ── */}
                      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center" sx={{ mb: 2 }}>
                        <TextField
                          select size="small" label="Pipeline"
                          value={pipeline}
                          onChange={(e) => setPipeline(e.target.value as any)}
                          sx={{ minWidth: 200, flex: '1 1 180px' }}
                        >
                          {Object.entries(PIPELINE_LABELS).map(([v, l]) => (
                            <MenuItem key={v} value={v}>{l}</MenuItem>
                          ))}
                        </TextField>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                          <IconButton size="small" onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={count <= 1 || generating}>
                            <IconMinus size={14} />
                          </IconButton>
                          <Typography variant="body2" fontWeight={700} sx={{ minWidth: 20, textAlign: 'center' }}>
                            {count}
                          </Typography>
                          <IconButton size="small" onClick={() => setCount((c) => Math.min(5, c + 1))} disabled={count >= 5 || generating}>
                            <IconPlus size={14} />
                          </IconButton>
                        </Stack>
                        <LoadingButton
                          variant="contained" size="small"
                          loading={generating}
                          onClick={handleGenerate}
                          startIcon={!generating ? <IconRefresh size={14} /> : null}
                          sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' }, textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                        >
                          {options.length ? 'Regenerar' : 'Gerar copy'}
                        </LoadingButton>
                        <Button
                          size="small" variant="outlined"
                          onClick={() => setShowVersionHistory(true)}
                          disabled={!activeFormat?.id}
                          sx={{ flexShrink: 0 }}
                        >
                          History
                        </Button>
                      </Stack>
                      <Divider sx={{ mb: 2 }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" spacing={1} sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatLabel}{options.length ? ` · ${options.length} opç${options.length === 1 ? 'ão' : 'ões'}` : ''}
                        </Typography>
                        {reporteiBadges.length ? (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {reporteiBadges.map((badge) => (
                              <Chip key={badge} size="small" label={badge} />
                            ))}
                          </Stack>
                        ) : null}
                      </Stack>
                      {reporteiLabel ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{reporteiLabel}</Typography> : null}
                      {reporteiKpisLine ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{reporteiKpisLine}</Typography> : null}
                      {reporteiInsightsLine ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{reporteiInsightsLine}</Typography> : null}

                      {!generating && pipeline === 'collaborative' && options.length > 0 && (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" alignItems="center" sx={{ mt: 1.5 }}>
                          {['Gemini', 'GPT-4', 'Claude'].map((stage) => (
                            <Chip key={stage} size="small" label={`✓ ${stage}`}
                              sx={{ height: 20, fontSize: '0.62rem', bgcolor: 'success.light', color: 'success.main', border: '1px solid', borderColor: 'success.main' }} />
                          ))}
                          {revisionCount > 0 && (
                            <Chip size="small" label={`↺ ${revisionCount} revisão${revisionCount > 1 ? 'ões' : ''}`}
                              sx={{ height: 20, fontSize: '0.62rem', bgcolor: 'warning.light', color: 'warning.main', border: '1px solid', borderColor: 'warning.main' }} />
                          )}
                        </Stack>
                      )}

                      {!generating && pipeline === 'adversarial' && options.length > 0 && (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" alignItems="center" sx={{ mt: 1.5 }}>
                          {[{ label: 'Gemini', color: '#fef9c3', border: '#fde68a' }, { label: 'GPT-4', color: '#dbeafe', border: '#93c5fd' }, { label: 'Claude', color: '#f0fdf4', border: '#bbf7d0' }].map((s) => (
                            <Chip key={s.label} size="small" label={`✓ ${s.label}`}
                              sx={{ height: 20, fontSize: '0.62rem', bgcolor: s.color, border: `1px solid ${s.border}` }} />
                          ))}
                          <Chip size="small" label="→ Síntese Claude"
                            sx={{ height: 20, fontSize: '0.62rem', bgcolor: 'success.light', color: 'success.main', border: '1px solid', borderColor: 'success.main' }} />
                        </Stack>
                      )}

                      {!generating && pipeline === 'collaborative' && collabAnalysis && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(19,222,185,0.04)', borderRadius: 1, border: '1px solid rgba(19,222,185,0.2)' }}>
                          <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.25, color: '#13DEB9' }}>
                            Análise Gemini
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                            {collabAnalysis}
                          </Typography>
                        </Box>
                      )}

                      {!generating && pipeline === 'adversarial' && adversarialContributions && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(232,82,25,0.04)', borderRadius: 1, border: '1px solid rgba(232,82,25,0.2)' }}>
                          <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.75, color: '#E85219' }}>
                            Contribuições por perspectiva
                          </Typography>
                          <Stack spacing={0.5}>
                            {([
                              { key: 'gemini', label: 'Gemini (dados)', color: '#d97706' },
                              { key: 'openai', label: 'GPT-4 (criativo)', color: '#2563eb' },
                              { key: 'claude', label: 'Claude (DNA)', color: '#16a34a' },
                            ] as { key: 'gemini' | 'openai' | 'claude'; label: string; color: string }[]).map(({ key, label, color }) => (
                              <Stack key={key} direction="row" spacing={0.75} alignItems="flex-start">
                                <Chip size="small" label={label}
                                  sx={{ height: 18, fontSize: '0.58rem', flexShrink: 0, color, bgcolor: `${color}14`, border: `1px solid ${color}33` }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', lineHeight: 1.4 }}>
                                  {adversarialContributions[key]}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {generating && pipeline === 'adversarial' && (
                        <Card variant="outlined" sx={{ mt: 2, bgcolor: 'grey.50' }}>
                          <CardContent sx={{ py: 2 }}>
                            <Stepper activeStep={collabStep} alternativeLabel>
                              <Step completed={collabStep > 0}>
                                <StepLabel>
                                  <Typography variant="caption" fontWeight={collabStep === 0 ? 700 : 400}>Gemini</Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">Perspectiva dados</Typography>
                                </StepLabel>
                              </Step>
                              <Step completed={collabStep > 1}>
                                <StepLabel>
                                  <Typography variant="caption" fontWeight={collabStep === 1 ? 700 : 400}>GPT-4</Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">Perspectiva criativa</Typography>
                                </StepLabel>
                              </Step>
                              <Step completed={collabStep > 2}>
                                <StepLabel>
                                  <Typography variant="caption" fontWeight={collabStep === 2 ? 700 : 400}>Claude</Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">Perspectiva DNA</Typography>
                                </StepLabel>
                              </Step>
                              <Step completed={!generating}>
                                <StepLabel>
                                  <Typography variant="caption" fontWeight={collabStep >= 3 ? 700 : 400}>Síntese</Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">Claude edita</Typography>
                                </StepLabel>
                              </Step>
                            </Stepper>
                            <LinearProgress color={collabStep >= 3 ? 'secondary' : 'primary'} sx={{ mt: 2, borderRadius: 2 }} />
                          </CardContent>
                        </Card>
                      )}

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
                              {revisionCount > 0 && (
                                <Step completed>
                                  <StepLabel>
                                    <Typography variant="caption" fontWeight={400}>
                                      Revisão
                                    </Typography>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                      {revisionCount}x
                                    </Typography>
                                  </StepLabel>
                                </Step>
                              )}
                            </Stepper>
                            {collabStep === 0 && <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />}
                            {collabStep === 1 && <LinearProgress color="warning" sx={{ mt: 2, borderRadius: 2 }} />}
                            {collabStep === 2 && <LinearProgress color="secondary" sx={{ mt: 2, borderRadius: 2 }} />}
                          </CardContent>
                        </Card>
                      )}

                      {options.length >= 2 && comparisonMode ? (
                        /* ── Comparação pareada A vs B ── */
                        <Box sx={{ mt: 2 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Qual abordagem representa melhor a marca?
                            </Typography>
                            {qualityScore && (
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Chip
                                  size="small"
                                  label={`Score IA: ${qualityScore.overall.toFixed(1)}/10`}
                                  sx={{
                                    fontSize: '0.65rem',
                                    height: 20,
                                    bgcolor: qualityScore.overall >= 8 ? 'success.light' : qualityScore.overall >= 7 ? 'warning.light' : 'error.light',
                                    color: qualityScore.overall >= 8 ? 'success.dark' : qualityScore.overall >= 7 ? 'warning.dark' : 'error.dark',
                                  }}
                                />
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                                  DNA:{qualityScore.brand_dna_match} · Plat:{qualityScore.platform_fit} · CTA:{qualityScore.cta_clarity}
                                </Typography>
                              </Stack>
                            )}
                          </Stack>
                          <Grid container spacing={2}>
                            {[0, 1].map((idx) => {
                              const option = options[idx];
                              return (
                                <Grid key={idx} size={{ xs: 12, md: 6 }}>
                                  <Card
                                    variant="outlined"
                                    onClick={() => setSelectedOption(idx)}
                                    sx={{
                                      border: '2px solid',
                                      borderColor: selectedOption === idx ? '#E85219' : 'divider',
                                      transition: 'border-color 0.15s',
                                      cursor: 'pointer',
                                      '&:hover': { borderColor: '#E85219' },
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                    }}
                                  >
                                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 2 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                        Opção {idx === 0 ? 'A' : 'B'}
                                      </Typography>

                                      {/* Slides (Carrossel) ou Arte (demais formatos) */}
                                      {isCarouselFormat(activeFormat?.format) && option.slides?.length ? (
                                        option.slides.map((slide, si) => (
                                          <Box key={si} sx={{ mb: 1.5, ...(si > 0 ? { pt: 1.25, borderTop: '1px dashed', borderColor: 'divider' } : {}) }}>
                                            <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', display: 'block', mb: 0.25 }}>
                                              Slide {si + 1}/{option.slides!.length}
                                            </Typography>
                                            {slide.title && (
                                              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.25 }}>
                                                {slide.title}
                                              </Typography>
                                            )}
                                            {slide.body && (
                                              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                                {slide.body}
                                              </Typography>
                                            )}
                                          </Box>
                                        ))
                                      ) : (
                                        <Box sx={{ mb: 1.5 }}>
                                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                                            <Stack direction="row" alignItems="center">
                                              <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', letterSpacing: '0.12em' }}>
                                                Arte
                                              </Typography>
                                              {option.title && <CharCounter text={option.title} max={catalogItem?.max_chars?.headline} />}
                                            </Stack>
                                            <Tooltip title={copiedField === `arte-${idx}` ? 'Copiado!' : 'Copiar texto de arte'}>
                                              <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); handleCopy([option.title, option.body].filter(Boolean).join('\n'), `arte-${idx}`); }}>
                                                {copiedField === `arte-${idx}` ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                              </IconButton>
                                            </Tooltip>
                                          </Stack>
                                          {option.title && (
                                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.25 }}>
                                              {option.title}
                                            </Typography>
                                          )}
                                          {option.body && (
                                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                              {option.body}
                                            </Typography>
                                          )}
                                          {!option.title && !option.body && (
                                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                              {option.raw}
                                            </Typography>
                                          )}
                                        </Box>
                                      )}

                                      {/* Legenda */}
                                      {option.legenda && (
                                        <Box sx={{ mb: 1.5, pt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
                                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                                            <Stack direction="row" alignItems="center">
                                              <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', letterSpacing: '0.12em' }}>
                                                Legenda
                                              </Typography>
                                              <CharCounter text={option.legenda} max={catalogItem?.max_chars?.caption} />
                                            </Stack>
                                            <Tooltip title={copiedField === `legenda-${idx}` ? 'Copiado!' : 'Copiar legenda'}>
                                              <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); handleCopy(option.legenda, `legenda-${idx}`); }}>
                                                {copiedField === `legenda-${idx}` ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                              </IconButton>
                                            </Tooltip>
                                          </Stack>
                                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                            {option.legenda}
                                          </Typography>
                                        </Box>
                                      )}

                                      {/* Hashtags */}
                                      {option.hashtags && (
                                        <Box sx={{ mb: 1.5, pt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
                                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                                            <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', letterSpacing: '0.12em' }}>
                                              Hashtags
                                            </Typography>
                                            <Tooltip title={copiedField === `hashtags-${idx}` ? 'Copiado!' : 'Copiar hashtags'}>
                                              <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); handleCopy(option.hashtags, `hashtags-${idx}`); }}>
                                                {copiedField === `hashtags-${idx}` ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                              </IconButton>
                                            </Tooltip>
                                          </Stack>
                                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {option.hashtags}
                                          </Typography>
                                        </Box>
                                      )}

                                      {/* CTA */}
                                      {option.cta && (
                                        <Box sx={{ pt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
                                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                                            <Stack direction="row" alignItems="center">
                                              <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', letterSpacing: '0.12em' }}>
                                                CTA
                                              </Typography>
                                              <CharCounter text={option.cta} max={catalogItem?.max_chars?.cta} />
                                            </Stack>
                                            <Tooltip title={copiedField === `cta-${idx}` ? 'Copiado!' : 'Copiar CTA'}>
                                              <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); handleCopy(option.cta, `cta-${idx}`); }}>
                                                {copiedField === `cta-${idx}` ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                              </IconButton>
                                            </Tooltip>
                                          </Stack>
                                          <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                                            {option.cta}
                                          </Typography>
                                        </Box>
                                      )}

                                      {qualityScores[idx] && (
                                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.6rem' }}>Score IA</Typography>
                                            <Chip
                                              size="small"
                                              label={`${qualityScores[idx].overall.toFixed(1)}/10`}
                                              sx={{
                                                height: 18, fontSize: '0.6rem',
                                                bgcolor: qualityScores[idx].overall >= 8.5 ? 'success.light' : qualityScores[idx].overall >= 7 ? 'warning.light' : 'error.light',
                                                color: qualityScores[idx].overall >= 8.5 ? 'success.dark' : qualityScores[idx].overall >= 7 ? 'warning.dark' : 'error.dark',
                                              }}
                                            />
                                          </Stack>
                                          <Stack spacing={0.4}>
                                            {([
                                              { label: 'DNA', value: qualityScores[idx].scores.brand_dna_match },
                                              { label: 'Plat', value: qualityScores[idx].scores.platform_fit },
                                              { label: 'CTA', value: qualityScores[idx].scores.cta_clarity },
                                            ] as { label: string; value: number }[]).map(({ label, value }) => (
                                              <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
                                                <Typography variant="caption" color="text.disabled" sx={{ minWidth: 26, fontSize: '0.58rem' }}>{label}</Typography>
                                                <LinearProgress
                                                  variant="determinate"
                                                  value={value * 10}
                                                  sx={{
                                                    flex: 1, height: 3, borderRadius: 2, bgcolor: 'action.hover',
                                                    '& .MuiLinearProgress-bar': {
                                                      bgcolor: value >= 8.5 ? 'success.main' : value >= 7 ? 'warning.main' : 'error.main',
                                                    },
                                                  }}
                                                />
                                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.58rem', minWidth: 18, textAlign: 'right' }}>
                                                  {value.toFixed(1)}
                                                </Typography>
                                              </Stack>
                                            ))}
                                          </Stack>
                                          {qualityScores[idx].issues?.length > 0 && (
                                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontSize: '0.6rem', lineHeight: 1.3 }}>
                                              {qualityScores[idx].issues[0]}
                                            </Typography>
                                          )}
                                        </Box>
                                      )}

                                      <Box sx={{ mt: 'auto', pt: 1 }}>
                                        <Button
                                          fullWidth
                                          size="small"
                                          variant="contained"
                                          onClick={() => handleCopySelected(idx)}
                                          disabled={feedbackLoading}
                                          sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' }, textTransform: 'none' }}
                                        >
                                          Esta é a melhor
                                        </Button>
                                      </Box>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              );
                            })}
                          </Grid>
                          <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setRejectOpen(true)}
                              disabled={feedbackLoading}
                              sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Nenhuma representa a marca — rejeitar
                            </Button>
                          </Box>
                          {regenerationCount >= 3 && (
                            <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.8rem' }}>
                              Após várias regenerações, considere revisar o briefing para dar mais contexto à IA.
                            </Alert>
                          )}

                          {revisionHistory.length > 0 && (
                            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                                Loop de qualidade — {revisionHistory.length} ciclo{revisionHistory.length > 1 ? 's' : ''}
                              </Typography>
                              <Stack spacing={0.5}>
                                {revisionHistory.map((rev, i) => (
                                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                                    <Chip size="small" label={`Loop ${rev.loop}`} sx={{ height: 16, fontSize: '0.58rem' }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                                      {rev.score_before.toFixed(1)} → {rev.score_after.toFixed(1)}
                                      {rev.issues_raised?.length ? ` · ${rev.issues_raised[0]}` : ''}
                                    </Typography>
                                  </Stack>
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        /* ── Lista vertical: Editor de Copy estruturado ── */
                        <>
                          {options.length ? (
                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>
                                  Editor de Copy
                                </Typography>
                                {options.length > 1 && (
                                  <Chip size="small" label={`Opção ${selectedOption + 1} de ${options.length}`} sx={{ height: 18, fontSize: '0.62rem' }} />
                                )}
                              </Stack>
                              <Stack spacing={1.5} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                <TextField
                                  size="small"
                                  label="Headline"
                                  value={editorCopy.headline}
                                  onChange={(e) => setEditorCopy((prev) => ({ ...prev, headline: e.target.value }))}
                                  placeholder="Título principal do criativo"
                                  fullWidth
                                  InputProps={{ sx: { fontSize: 13 } }}
                                />
                                <TextField
                                  size="small"
                                  label="Corpo"
                                  value={editorCopy.body}
                                  onChange={(e) => setEditorCopy((prev) => ({ ...prev, body: e.target.value }))}
                                  placeholder="Texto principal / caption"
                                  multiline
                                  minRows={3}
                                  fullWidth
                                  InputProps={{ sx: { fontSize: 13 } }}
                                />
                                <TextField
                                  size="small"
                                  label="CTA"
                                  value={editorCopy.cta}
                                  onChange={(e) => setEditorCopy((prev) => ({ ...prev, cta: e.target.value }))}
                                  placeholder="Ex: Saiba mais, Compre agora"
                                  fullWidth
                                  InputProps={{ sx: { fontSize: 13 } }}
                                />
                                <TextField
                                  size="small"
                                  label="Legenda"
                                  value={editorCopy.legenda}
                                  onChange={(e) => setEditorCopy((prev) => ({ ...prev, legenda: e.target.value }))}
                                  placeholder="Legenda do post..."
                                  multiline
                                  minRows={6}
                                  fullWidth
                                  InputProps={{ sx: { fontSize: 13, alignItems: 'flex-start' } }}
                                  sx={{ flexGrow: 1, '& .MuiInputBase-root': { height: '100%' }, '& textarea': { flexGrow: 1 } }}
                                />
                              </Stack>
                              {options.length > 1 && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.75 }}>
                                    Outras opções
                                  </Typography>
                                  <Stack spacing={0.75}>
                                    {options.map((option, index) => {
                                      if (index === selectedOption) return null;
                                      return (
                                        <Card
                                          key={index}
                                          variant="outlined"
                                          sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.light' } }}
                                          onClick={() => handleSelectOption(index)}
                                        >
                                          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                              <Chip size="small" label={`Opção ${index + 1}`} sx={{ height: 16, fontSize: '0.6rem', flexShrink: 0, mt: 0.25 }} />
                                              <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="caption" fontWeight={600} display="block" noWrap>
                                                  {option.title || option.body?.slice(0, 60) || `Opção ${index + 1}`}
                                                </Typography>
                                                {option.body && (
                                                  <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                    {option.body}
                                                  </Typography>
                                                )}
                                              </Box>
                                            </Stack>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </Stack>
                                </Box>
                              )}
                            </Box>
                          ) : (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                              {generating ? (
                                <>
                                  <CircularProgress size={24} sx={{ mb: 1 }} />
                                  <Typography variant="body2" color="text.secondary">
                                    Preparando opcoes de copy...
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  Nenhuma opção gerada.
                                </Typography>
                              )}
                            </Box>
                          )}

                          {/* Video script editor — aparece quando formato é video e opção selecionada */}
                          {isVideoFormat(activeFormat?.format) && selectedOptionData && (
                            <Box sx={{ mt: 2, p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1.25 }}>
                                Roteiro estruturado
                              </Typography>
                              <Stack spacing={1.5}>
                                <TextField
                                  label="Hook (0-3s)"
                                  placeholder="Gancho de abertura..."
                                  fullWidth multiline rows={2} size="small"
                                  value={videoScript.hook}
                                  onChange={(e) => setVideoScript((s) => ({ ...s, hook: e.target.value }))}
                                />
                                <TextField
                                  label="Corpo (10-25s)"
                                  placeholder="Desenvolvimento da mensagem..."
                                  fullWidth multiline rows={3} size="small"
                                  value={videoScript.corpo}
                                  onChange={(e) => setVideoScript((s) => ({ ...s, corpo: e.target.value }))}
                                />
                                <TextField
                                  label="CTA / Encerramento"
                                  placeholder="Chamada para ação..."
                                  fullWidth multiline rows={2} size="small"
                                  value={videoScript.cta}
                                  onChange={(e) => setVideoScript((s) => ({ ...s, cta: e.target.value }))}
                                />
                              </Stack>
                            </Box>
                          )}

                          {options.length ? (
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={handleApproveOption}
                                disabled={feedbackLoading || !selectedOptionData}
                                sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                              >
                                Aprovar opção
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => setRejectOpen(true)}
                                disabled={feedbackLoading || !selectedOptionData}
                              >
                                Rejeitar opção
                              </Button>
                            </Stack>
                          ) : null}
                        </>
                      )}
                </Box>

                {/* ── Image Generation Panel ── */}
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <Chip size="small" label="Criativo com IA" />
                        {arteRefsCount > 0 && (
                          <Chip size="small" variant="outlined" label={`${arteRefsCount} ref${arteRefsCount > 1 ? 's' : ''} visual`} />
                        )}
                      </Stack>

                      <Stack spacing={1.5}>
                        {/* Model */}
                        <TextField
                          select size="small" label="Modelo de imagem"
                          value={imageModel}
                          onChange={(e) => setImageModel(e.target.value)}
                          fullWidth
                        >
                          <MenuItem value="gemini-2.0-flash-exp-image-generation">Gemini 2.0 Flash (padrão)</MenuItem>
                          <MenuItem value="imagen-3.0-generate-001">Imagen 3 — Alta qualidade</MenuItem>
                          <MenuItem value="imagen-3.0-fast-generate-001">Imagen 3 Fast — Nano (rápido)</MenuItem>
                        </TextField>

                        {/* Aspect ratio — Imagen 3 only */}
                        {imageModel.startsWith('imagen-') && (
                          <TextField
                            select size="small" label="Proporção"
                            value={imageAspectRatio}
                            onChange={(e) => setImageAspectRatio(e.target.value)}
                            fullWidth
                          >
                            <MenuItem value="1:1">1:1 — Quadrado (Feed)</MenuItem>
                            <MenuItem value="4:3">4:3 — Landscape</MenuItem>
                            <MenuItem value="3:4">3:4 — Portrait</MenuItem>
                            <MenuItem value="16:9">16:9 — Widescreen</MenuItem>
                            <MenuItem value="9:16">9:16 — Story / Vertical</MenuItem>
                          </TextField>
                        )}

                        {/* Prompt */}
                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>
                              Prompt
                            </Typography>
                            <LoadingButton
                              size="small" variant="text"
                              loading={arteStep === 'loading_prompt'}
                              disabled={arteStep !== null || !output}
                              onClick={handleGenerateArte}
                              sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0.25 }}
                            >
                              Auto-gerar
                            </LoadingButton>
                          </Stack>

                          {/* Variation picker — aparece após Auto-gerar */}
                          {arteVariations.length > 1 && (
                            <Stack direction="row" spacing={0.75} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.75 }}>
                              {(['Metáfora', 'Ambiente', 'Humano'] as const).map((label, idx) => (
                                <Chip
                                  key={label}
                                  size="small"
                                  label={label}
                                  variant={artePrompt === arteVariations[idx] ? 'filled' : 'outlined'}
                                  color={artePrompt === arteVariations[idx] ? 'primary' : 'default'}
                                  onClick={() => arteVariations[idx] && setArtePrompt(arteVariations[idx])}
                                  sx={{ cursor: 'pointer', fontSize: '0.68rem' }}
                                />
                              ))}
                            </Stack>
                          )}

                          <TextField
                            multiline minRows={5}
                            fullWidth size="small"
                            value={artePrompt}
                            onChange={(e) => setArtePrompt(e.target.value)}
                            placeholder="Descreva o criativo desejado, ou clique em Auto-gerar para criar automaticamente a partir do copy..."
                            disabled={arteStep === 'generating'}
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
                          />
                        </Box>

                        {/* Negative prompt */}
                        <TextField
                          size="small" label="Prompt negativo (opcional)"
                          value={imageNegativePrompt}
                          onChange={(e) => setImageNegativePrompt(e.target.value)}
                          placeholder="Ex: texto, palavras, logos, watermark, distorção..."
                          fullWidth
                        />

                        {/* Iteração Guiada — aparece quando há prompt */}
                        {artePrompt.trim() && (
                          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                              Refinar cena
                            </Typography>
                            <Stack direction="row" spacing={0.75}>
                              <TextField
                                size="small" fullWidth
                                value={arteRefinement}
                                onChange={(e) => setArteRefinement(e.target.value)}
                                placeholder="Ex: mais sombrio, sem pessoas, use laranja dominante..."
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefinePrompt(); } }}
                                inputProps={{ style: { fontSize: 12 } }}
                                disabled={arteRefining}
                              />
                              <LoadingButton
                                loading={arteRefining}
                                disabled={!arteRefinement.trim()}
                                onClick={handleRefinePrompt}
                                size="small" variant="outlined"
                                sx={{ minWidth: 36, px: 1, flexShrink: 0 }}
                              >
                                {!arteRefining && <IconSparkles size={15} />}
                              </LoadingButton>
                            </Stack>
                          </Box>
                        )}

                        {/* Error */}
                        {arteModalError && (
                          <Alert severity="error" sx={{ py: 0.5, fontSize: 12 }}>{arteModalError}</Alert>
                        )}

                        {/* Generate + Preview */}
                        <Stack direction="row" spacing={0.75}>
                          <LoadingButton
                            fullWidth variant="contained" size="small"
                            loading={arteStep === 'generating' && !arteIsPreview}
                            disabled={!artePrompt.trim() || arteStep !== null}
                            onClick={handleGenerateArteWithPrompt}
                            sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' }, textTransform: 'none', fontWeight: 600 }}
                          >
                            {arteImageUrl ? 'Regenerar' : 'Gerar Imagem'}
                          </LoadingButton>
                          <LoadingButton
                            loading={arteStep === 'generating' && arteIsPreview}
                            disabled={!artePrompt.trim() || arteStep !== null}
                            onClick={handlePreviewArte}
                            size="small" variant="outlined"
                            title="Prévia rápida com Flash (menor qualidade)"
                            sx={{ minWidth: 40, px: 1, flexShrink: 0, borderColor: '#E85219', color: '#E85219' }}
                          >
                            {!(arteStep === 'generating' && arteIsPreview) && <IconBolt size={15} />}
                          </LoadingButton>
                        </Stack>

                        {/* Generated image preview */}
                        {arteImageUrl && (
                          <Box>
                            <Box sx={{ position: 'relative' }}>
                              <Box
                                component="img"
                                src={arteImageUrl}
                                alt="Arte gerada"
                                sx={{ width: '100%', borderRadius: 1.5, border: 1, borderColor: 'divider', display: 'block' }}
                              />
                              {arteIsPreview && (
                                <Box sx={{
                                  position: 'absolute', top: 6, right: 6,
                                  bgcolor: 'rgba(0,0,0,0.65)', color: '#fff',
                                  fontSize: 10, fontWeight: 700, px: 0.75, py: 0.25, borderRadius: 0.75,
                                  letterSpacing: 0.5,
                                }}>
                                  PRÉVIA
                                </Box>
                              )}
                            </Box>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Button size="small" variant="contained" color="success" onClick={handleApproveCreative} startIcon={<IconCheck size={14} />}>
                                Usar
                              </Button>
                              <Button size="small" variant="outlined" color="error" onClick={() => setArteDiscardOpen(true)} startIcon={<IconX size={14} />}>
                                Descartar
                              </Button>
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                </Box>
                </Box>
              </Card>

              {/* Version History */}
              {copies.length ? (
                <Card>
                  <CardContent>
                    <Chip size="small" label="Histórico de versões" sx={{ mb: 1 }} />
                    <Timeline sx={{ p: 0, m: 0 }}>
                      {copies.map((copy, idx) => {
                        const reporteiSummary = formatReporteiSummary((copy.payload as any)?._edro?.reportei || null);
                        const model = (copy.model || '').toLowerCase();
                        const dotColor = model.includes('claude') || model.includes('anthropic') ? '#7c3aed'
                          : model.includes('gpt') || model.includes('openai') ? '#22c55e'
                          : model.includes('gemini') || model.includes('google') ? '#f59e0b'
                          : '#94a3b8';
                        return (
                          <TimelineItem key={copy.id}>
                            <TimelineOppositeContent sx={{ flex: 0.35, px: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                                {copy.created_at ? new Date(copy.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Agora'}
                              </Typography>
                            </TimelineOppositeContent>
                            <TimelineSeparator>
                              <TimelineDot sx={{ bgcolor: dotColor, boxShadow: 'none', m: '6px 0' }} />
                              {idx < copies.length - 1 && <TimelineConnector sx={{ bgcolor: 'divider' }} />}
                            </TimelineSeparator>
                            <TimelineContent sx={{ pb: 2 }}>
                              <Card
                                variant="outlined"
                                sx={{ cursor: 'pointer', '&:hover': { borderColor: dotColor + '80' } }}
                                onClick={() => handleSelectVersion(copy)}
                              >
                                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ color: dotColor }}>
                                    {copy.model || 'IA'}
                                  </Typography>
                                  {reporteiSummary ? (
                                    <Typography variant="caption" color="text.secondary" display="block">{reporteiSummary}</Typography>
                                  ) : null}
                                  <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {copy.output?.slice(0, 160)}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </TimelineContent>
                          </TimelineItem>
                        );
                      })}
                    </Timeline>
                  </CardContent>
                </Card>
              ) : null}
            </Stack>
          </Grid>

        </Grid>

        {/* Footer actions */}
        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button variant="outlined" onClick={() => router.back()}>
            Voltar
          </Button>
          <Button variant="contained" component={Link} href="/studio/export">
            Avançar para Exportar
          </Button>
        </Stack>
        </>
      </Stack>

      {activeFormat?.id && (
        <PostVersionHistory
          postAssetId={activeFormat.id}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      <RejectionReasonPicker
        open={rejectOpen}
        type="copy"
        loading={feedbackLoading}
        onClose={() => setRejectOpen(false)}
        onSubmit={handleRejectOption}
      />

      <Snackbar
        open={Boolean(copiedField)}
        message="Copiado!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { minWidth: 'auto', px: 2.5, py: 0.75 } }}
      />

      {/* Dialog de descarte de arte — coleta tags de feedback para loop de aprendizado */}
      <Dialog
        open={arteDiscardOpen}
        onClose={() => { setArteDiscardOpen(false); setArteDiscardTags([]); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>Por que descartar esta imagem?</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Selecione os motivos — isso melhora as próximas gerações para este cliente.
          </Typography>
          <Stack spacing={0.75}>
            {['Texto na imagem', 'Fora do estilo da marca', 'Cores incorretas', 'Assunto errado', 'Qualidade baixa'].map((tag) => (
              <Button
                key={tag}
                size="small"
                variant={arteDiscardTags.includes(tag) ? 'contained' : 'outlined'}
                onClick={() =>
                  setArteDiscardTags((prev) =>
                    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                  )
                }
                sx={{ justifyContent: 'flex-start', textTransform: 'none', fontSize: 13 }}
              >
                {tag}
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => { setArteDiscardOpen(false); setArteDiscardTags([]); }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleDiscardCreative(arteDiscardTags)}
          >
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
