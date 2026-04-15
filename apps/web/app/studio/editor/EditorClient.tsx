'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PostVersionHistory from '@/components/PostVersionHistory';
import LiveMockupPreview from '@/components/mockups/LiveMockupPreview';
import RejectionReasonPicker from '@/components/studio/RejectionReasonPicker';
import CollaborativeInsights from '@/components/studio/CollaborativeInsights';
import ModelComparePanel from '@/components/studio/ModelComparePanel';
import PipelineProgressNodes from '@/components/studio/PipelineProgressNodes';
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
  IconBrain,
  IconBulb,
  IconCheck,
  IconCopy,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconBolt,
  IconX,
} from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';
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
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Slider from '@mui/material/Slider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import MockupsPage from '@/app/studio/mockups/page';
import {
  addStudioCreativeAsset,
  addStudioCreativeVersion,
  buildStudioHref,
  loadStudioCreativeSession,
  openStudioCreativeSession,
  persistStudioWorkflowContext,
  readStudioInventoryFromSession,
  resolveStudioWorkflowContext,
  syncLegacyStudioStorageFromCreativeContext,
  updateStudioCreativeMetadata,
  type CreativeSessionContextDto,
  updateStudioCreativeStage,
} from '../studioWorkflow';

// ── agentConceito types (mirrors backend) ─────────────────────────────────────
type CreativeConcept = {
  concept_id: string;
  headline_concept: string;
  emotional_truth: string;
  cultural_angle: string;
  visual_direction: string;
  suggested_structure: string;
  risk_level: 'safe' | 'bold' | 'disruptive';
  rationale: string;
};

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

const MODEL_NEGATIVE_DEFAULTS: Record<string, string> = {
  'leonardo-phoenix':      'text, words, letters, logos, watermark, distortion, oversaturated, lens flare, CGI plastic look, deformed hands, ugly, low quality',
  'leonardo-lightning-xl': 'text, words, letters, logos, watermark, blurry, low quality, pixelated, noise, artifacts, deformed anatomy',
  'leonardo-kino-xl':      'text, words, letters, logos, watermark, flat lighting, overexposed, washed out, deformed, low quality',
  'leonardo-diffusion-xl': 'text, words, letters, logos, watermark, blurry, noisy, deformed, low resolution',
  'gemini-2.0-flash-exp-image-generation': 'text, words, letters, logos, watermarks',
  'imagen-3.0-generate-001':               'text, words, letters, logos, watermarks, distortion, artifacts',
  'imagen-3.0-fast-generate-001':          'text, words, letters, logos, watermarks',
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
  const searchParams = useSearchParams();
  const { open: openJarvis, clientId: jarvisClientId } = useJarvis();
  const workflowContext = useMemo(() => resolveStudioWorkflowContext(searchParams), [searchParams]);
  const [sessionId, setSessionId] = useState(workflowContext.sessionId);
  const [creativeContext, setCreativeContext] = useState<CreativeSessionContextDto | null>(null);
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
  const [quickRefineOpen, setQuickRefineOpen] = useState(false);
  const [quickRefineInstruction, setQuickRefineInstruction] = useState('');
  const [quickRefineLoading, setQuickRefineLoading] = useState(false);
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
  const [imageProvider, setImageProvider] = useState<'gemini' | 'leonardo' | 'fal'>('gemini');
  // Art Director mode
  const [artDirMode, setArtDirMode] = useState(false);
  const [artDirGatilho, setArtDirGatilho] = useState('');
  const [artDirOrchestrating, setArtDirOrchestrating] = useState(false);
  const [artDirLayout, setArtDirLayout] = useState<{
    eyebrow: string; headline: string; accentWord: string; accentColor: string; cta: string; body: string; overlayStrength: number;
  } | null>(null);
  const [artDirVisualStrategy, setArtDirVisualStrategy] = useState<Record<string, any> | null>(null);
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
  // Multi-variações — array de URLs retornadas pelo Leonardo
  const [arteImageUrls, setArteImageUrls] = useState<string[]>([]);
  // Multi-formato (P6) — resultado do pipeline de formatos
  const [arteMultiFormat, setArteMultiFormat] = useState<Array<{ format: string; imageUrl: string }>>([]);
  // Resultado completo do pipeline (para PipelineProgressNodes)
  const [arteDAResult, setArteDAResult] = useState<any | null>(null);
  // Comparador de modelos
  const [modelCompareMode, setModelCompareMode] = useState(false);
  const [selectedArteIndex, setSelectedArteIndex] = useState(0);
  // img2img — imagens da library do cliente como referência para Leonardo
  const [libraryImages, setLibraryImages] = useState<Array<{ id: string; title: string; file_mime: string; category?: string }>>([]);
  const [selectedLibraryImageId, setSelectedLibraryImageId] = useState<string | null>(null);
  const [initStrength, setInitStrength] = useState(0.35);
  const [libraryImagesLoading, setLibraryImagesLoading] = useState(false);
  // Tabs: 0 = Gerador de Copy, 1 = Grade de Mockups
  const [criarTab, setCriarTab] = useState<0 | 1>(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // ── agentConceito ─────────────────────────────────────────────────────────
  const [concepts, setConcepts] = useState<CreativeConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<CreativeConcept | null>(null);
  const [conceptRecIdx, setConceptRecIdx] = useState(0);
  const [conceptGenerating, setConceptGenerating] = useState(false);
  const hydratedEditorMetadataRef = useRef('');
  const persistedEditorMetadataRef = useRef('');
  const editorMetadataTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (workflowContext.sessionId) {
      setSessionId(workflowContext.sessionId);
    }
  }, [workflowContext.sessionId]);

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

  const applyCreativeContext = useCallback((context: CreativeSessionContextDto | null) => {
    if (!context) return;
    setCreativeContext(context);
    if (context.session?.id) {
      setSessionId(context.session.id);
      persistStudioWorkflowContext({ jobId: context.job?.id, sessionId: context.session.id });
    }
    syncLegacyStudioStorageFromCreativeContext(context);

    const brief = context.briefing as Record<string, any> | null | undefined;
    if (brief && !tone && typeof brief.tone === 'string') {
      setTone(brief.tone);
    }
    if (context.job?.client_brand_color) {
      setClientBrandColor(context.job.client_brand_color);
    }
    if (context.selected_copy_version?.payload) {
      const payload = context.selected_copy_version.payload;
      const text = String(payload.output || payload.text || '').trim();
      if (text) {
        const parsed = parseOptions(text);
        setOutput(text);
        setOptions(parsed);
        setSelectedOption(0);
      }
    }
    if (context.selected_asset?.file_url) {
      setArteImageUrl(context.selected_asset.file_url);
    }
    const daContext = context.session?.metadata?.da_context as Record<string, any> | undefined;
    if (daContext?.layout && !artDirLayout) {
      setArtDirLayout(daContext.layout);
    }
    if (daContext?.visual_strategy && !artDirVisualStrategy) {
      setArtDirVisualStrategy(daContext.visual_strategy);
    }
    const workflowInventory = readStudioInventoryFromSession(context);
    if (workflowInventory.length) {
      setInventory(
        workflowInventory.map((item) => ({
          id: item.id || `${item.platform || item.platformId || 'plataforma'}-${item.format || item.name || 'formato'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          platform: item.platform || item.platformId || '',
          format: item.format || item.name || '',
          production_type: item.production_type,
        }))
      );
      if (!activeFormatId && workflowInventory[0]?.id) {
        setActiveFormatId(workflowInventory[0].id);
      }
    }
    const editorMeta = context.session?.metadata?.editor as Record<string, any> | undefined;
    const editorMetaKey = JSON.stringify(editorMeta || {});
    if (editorMeta && hydratedEditorMetadataRef.current !== editorMetaKey) {
      if (typeof editorMeta.activeFormatId === 'string') setActiveFormatId(editorMeta.activeFormatId);
      if (typeof editorMeta.pipeline === 'string' && ['simple', 'standard', 'premium', 'collaborative', 'adversarial'].includes(editorMeta.pipeline)) {
        setPipeline(editorMeta.pipeline as 'simple' | 'standard' | 'premium' | 'collaborative' | 'adversarial');
      }
      if (typeof editorMeta.taskType === 'string') setTaskType(editorMeta.taskType);
      if (typeof editorMeta.forceProvider === 'string') setForceProvider(editorMeta.forceProvider);
      if (typeof editorMeta.tone === 'string' && editorMeta.tone) setTone(editorMeta.tone);
      if (typeof editorMeta.selectedOption === 'number') setSelectedOption(editorMeta.selectedOption);
      if (typeof editorMeta.criarTab === 'number' && (editorMeta.criarTab === 0 || editorMeta.criarTab === 1)) {
        setCriarTab(editorMeta.criarTab);
      }
      if (typeof editorMeta.selectedArteIndex === 'number') setSelectedArteIndex(editorMeta.selectedArteIndex);
      hydratedEditorMetadataRef.current = editorMetaKey;
      persistedEditorMetadataRef.current = editorMetaKey;
    }
  }, [artDirLayout, artDirVisualStrategy, tone]);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      let resolvedBriefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
      if (workflowContext.jobId) {
        const context = sessionId
          ? await loadStudioCreativeSession(workflowContext.jobId).catch(() => null)
          : await openStudioCreativeSession(workflowContext.jobId).catch(() => null);
        if (context) {
          resolvedBriefingId = context.session?.briefing_id || resolvedBriefingId;
          applyCreativeContext(context);
        }
      }
      if (!resolvedBriefingId) {
        throw new Error('Nenhum briefing ativo encontrado. Volte para o passo 1.');
      }
      const response = await apiGet<{ success: boolean; data: BriefingResponse }>(`/edro/briefings/${resolvedBriefingId}`);
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
  }, [applyCreativeContext, sessionId, tone, workflowContext.jobId]);

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
    if (creativeContext) {
      const workflowInventory = readStudioInventoryFromSession(creativeContext);
      if (workflowInventory.length) return;
    }
    const parsed = readLocalStorage<any[]>('edro_selected_inventory', []);
    if (workflowContext.jobId && activeFormatId) return;
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
  }, [activeFormatId, creativeContext, workflowContext.jobId]);

  const editorSessionMetadata = useMemo(() => ({
    activeFormatId,
    pipeline,
    taskType,
    forceProvider,
    tone,
    selectedOption,
    criarTab,
    selectedArteIndex,
  }), [activeFormatId, criarTab, forceProvider, pipeline, selectedArteIndex, selectedOption, taskType, tone]);

  useEffect(() => {
    if (!workflowContext.jobId || !sessionId) return;
    const nextKey = JSON.stringify(editorSessionMetadata);
    if (persistedEditorMetadataRef.current === nextKey) return;

    if (editorMetadataTimerRef.current) clearTimeout(editorMetadataTimerRef.current);
    editorMetadataTimerRef.current = setTimeout(() => {
      updateStudioCreativeMetadata(sessionId, {
        job_id: workflowContext.jobId,
        metadata: { editor: editorSessionMetadata },
        reason: 'editor_state_updated',
      })
        .then((context) => {
          persistedEditorMetadataRef.current = nextKey;
          applyCreativeContext(context);
        })
        .catch(() => {});
    }, 800);

    return () => {
      if (editorMetadataTimerRef.current) clearTimeout(editorMetadataTimerRef.current);
    };
  }, [applyCreativeContext, editorSessionMetadata, sessionId, workflowContext.jobId]);

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

  // Load client library images when Leonardo is selected
  useEffect(() => {
    if (imageProvider !== 'leonardo') {
      setLibraryImages([]);
      setSelectedLibraryImageId(null);
      return;
    }
    const clientId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') : null;
    if (!clientId) return;
    setLibraryImagesLoading(true);
    apiGet<any[]>(`/clients/${clientId}/library?type=file&status=ready`)
      .then((rows) => {
        const images = (rows || []).filter((item: any) => item.file_mime?.startsWith('image/'));
        setLibraryImages(images);
      })
      .catch(() => {})
      .finally(() => setLibraryImagesLoading(false));
  }, [imageProvider]);

  // Auto-populate negative prompt when model changes (only if empty or still the previous default)
  useEffect(() => {
    const defaultNeg = MODEL_NEGATIVE_DEFAULTS[imageModel] || '';
    if (!defaultNeg) return;
    setImageNegativePrompt((prev) => {
      const isKnownDefault = Object.values(MODEL_NEGATIVE_DEFAULTS).includes(prev);
      if (prev === '' || isKnownDefault) return defaultNeg;
      return prev; // user customized — don't override
    });
  }, [imageModel]);

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

  // Write editor context to localStorage so Jarvis can read it
  useEffect(() => {
    if (!briefing?.id) return;
    try {
      const selectedCopy = selectedOptionData;
      localStorage.setItem('edro_studio_context', JSON.stringify({
        page: 'studio_editor',
        briefing_id: briefing.id,
        briefing_title: briefing.title,
        client_name: briefing.client_name,
        client_id: jarvisClientId,
        platform: activeFormat?.platform,
        format: activeFormat?.format,
        pipeline,
        current_copy: selectedCopy ? {
          headline: editorCopy.headline || selectedCopy.title,
          body: editorCopy.body || selectedCopy.body,
          cta: editorCopy.cta || selectedCopy.cta,
          legenda: editorCopy.legenda || selectedCopy.legenda,
        } : null,
      }));
    } catch { /* ignore */ }
  }, [briefing?.id, briefing?.title, briefing?.client_name, jarvisClientId, activeFormat, pipeline, selectedOptionData, editorCopy]);

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

      // Build concept context block if a concept is selected
      const conceptBlock = selectedConcept
        ? [
            `CONCEITO CRIATIVO SELECIONADO — use como espinha dorsal desta copy:`,
            `Conceito: ${selectedConcept.headline_concept}`,
            `Verdade emocional: ${selectedConcept.emotional_truth}`,
            `Ângulo cultural: ${selectedConcept.cultural_angle}`,
            `Direção visual sugerida: ${selectedConcept.visual_direction}`,
            `Estrutura sugerida: ${selectedConcept.suggested_structure}`,
          ].join('\n')
        : '';

      for (const client of clientsToGenerate) {
        const instructionLines = [
          client?.name ? `Cliente: ${client.name}` : '',
          client?.segment ? `Segmento: ${client.segment}` : '',
          `Formato selecionado: ${activeFormat?.format || 'não informado'}`,
          `Plataforma: ${activeFormat?.platform || 'não informado'}`,
          activeFormat?.production_type ? `Tipo de produção: ${activeFormat.production_type}` : '',
          tone ? `Tom de voz: ${tone}` : '',
          conceptBlock,
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

  // ── agentConceito ────────────────────────────────────────────────────────────
  const generateConcepts = async () => {
    if (!briefing?.id) return;
    setConceptGenerating(true);
    try {
      const activeClient = resolveActiveClient();
      const res = await apiPost<{ success: boolean; data: { concepts: CreativeConcept[]; recommended_index: number } }>(
        '/studio/creative/conceito',
        {
          briefing: {
            title: briefing.title || '',
            objective: (briefing.payload?.objective || briefing.payload?.product || '') as string,
            context: (briefing.payload?.context || briefing.payload?.positioning || '') as string,
          },
          clientId: activeClient?.id || null,
          platform: activeFormat?.platform || null,
        }
      );
      const result = res?.data;
      if (res?.success && result && Array.isArray(result.concepts) && result.concepts.length) {
        setConcepts(result.concepts);
        setConceptRecIdx(result.recommended_index ?? 0);
        setSelectedConcept(result.concepts[result.recommended_index ?? 0]);
      }
    } catch {
      // silently ignore — concepts are optional
    } finally {
      setConceptGenerating(false);
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

  const applyRegeneratedCopy = useCallback((copy: CopyVersion) => {
    setCopies((prev) => [copy, ...prev.filter((item) => item.id !== copy.id)]);
    handleSelectVersion(copy);
    setComparisonMode(false);
    setRejectOpen(false);
    setQuickRefineOpen(false);
    setQuickRefineInstruction('');
    hasAutoGeneratedRef.current = false;
  }, [handleSelectVersion]);

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

  const resolveBriefingId = () => {
    if (briefing?.id) return briefing.id;
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('edro_briefing_id');
  };

  const ensureCreativeSessionContext = useCallback(async () => {
    if (!workflowContext.jobId) return null;
    const context = sessionId
      ? await loadStudioCreativeSession(workflowContext.jobId).catch(() => creativeContext)
      : await openStudioCreativeSession(workflowContext.jobId, {
          briefing_id: resolveBriefingId(),
        }).catch(() => null);
    if (context) applyCreativeContext(context);
    return context;
  }, [applyCreativeContext, creativeContext, sessionId, workflowContext.jobId]);

  const buildArtDirectionSessionContext = useCallback((overrides?: {
    layout?: Record<string, any> | null;
    visualStrategy?: Record<string, any> | null;
    imagePrompt?: Record<string, any> | null;
  }) => {
    const clientId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') || undefined : undefined;
    const visualStrategy = overrides?.visualStrategy ?? artDirVisualStrategy;
    const layout = overrides?.layout ?? artDirLayout;
    return {
      briefing_id: resolveBriefingId(),
      client_id: clientId || null,
      platform: activeFormat?.platform || null,
      format: activeFormat?.format || null,
      visual_strategy: visualStrategy || null,
      layout: layout || null,
      img_prompt: overrides?.imagePrompt || null,
      reference_examples: Array.isArray(visualStrategy?.referenceExamples) ? visualStrategy.referenceExamples : [],
      trend_signals: Array.isArray(visualStrategy?.trendSignals) ? visualStrategy.trendSignals : [],
      concept_slugs: Array.isArray(visualStrategy?.referenceMovements) ? visualStrategy.referenceMovements : [],
      strategy_summary: typeof visualStrategy?.strategySummary === 'string' ? visualStrategy.strategySummary : null,
      visual_intent: typeof visualStrategy?.intent === 'string' ? visualStrategy.intent : null,
    };
  }, [activeFormat?.format, activeFormat?.platform, artDirLayout, artDirVisualStrategy, briefing?.id]);

  const persistArtDirectionContextToCreativeSession = useCallback(async (payload: {
    layout?: Record<string, any> | null;
    visualStrategy?: Record<string, any> | null;
    imagePrompt?: Record<string, any> | null;
  }) => {
    const context = await ensureCreativeSessionContext();
    if (!context?.session?.id || !workflowContext.jobId) return context;
    const daContext = buildArtDirectionSessionContext(payload);
    const next = await updateStudioCreativeMetadata(context.session.id, {
      job_id: workflowContext.jobId,
      metadata: { da_context: daContext },
      reason: 'art_direction_context_updated',
    }).catch(() => context);
    if (next) applyCreativeContext(next);
    return next;
  }, [applyCreativeContext, buildArtDirectionSessionContext, ensureCreativeSessionContext, workflowContext.jobId]);

  const syncApprovedCopyToCreativeSession = useCallback(async (option: ParsedOption | null, sourceCopyId?: string | null) => {
    if (!workflowContext.jobId || !option) return null;
    const context = await ensureCreativeSessionContext();
    if (!context?.session?.id) return null;

    const next = await addStudioCreativeVersion(context.session.id, {
      job_id: workflowContext.jobId,
      version_type: 'copy',
      source: 'studio',
      payload: {
        output: optionToText(option),
        title: option.title || '',
        body: option.body || '',
        cta: option.cta || '',
        legenda: option.legenda || '',
        hashtags: option.hashtags || '',
        source_copy_version_id: sourceCopyId || null,
        briefing_id: briefing?.id || null,
        platform: activeFormat?.platform || null,
        format: activeFormat?.format || null,
      },
      select: true,
    }).catch(() => null);

    if (next) {
      applyCreativeContext(next);
      await updateStudioCreativeStage(next.session.id, {
        current_stage: 'arte',
        reason: 'copy_aprovada_no_editor',
      }).then(applyCreativeContext).catch(() => null);
    }

    return next;
  }, [activeFormat?.format, activeFormat?.platform, applyCreativeContext, briefing?.id, ensureCreativeSessionContext, workflowContext.jobId]);

  const syncApprovedAssetToCreativeSession = useCallback(async (imageUrl: string | null) => {
    if (!workflowContext.jobId || !imageUrl) return null;
    const context = await ensureCreativeSessionContext();
    if (!context?.session?.id) return null;

    const next = await addStudioCreativeAsset(context.session.id, {
      job_id: workflowContext.jobId,
      asset_type: isVideoFormat(activeFormat?.format) ? 'video' : isCarouselFormat(activeFormat?.format) ? 'carousel' : 'image',
      source: 'studio',
      file_url: imageUrl,
      thumb_url: imageUrl,
      metadata: {
        briefing_id: briefing?.id || null,
        prompt: arteGeneratedPrompt || artePrompt || null,
        platform: activeFormat?.platform || null,
        format: activeFormat?.format || null,
        source_copy_version_id: resolveActiveCopyId() || null,
        da_context: buildArtDirectionSessionContext(),
      },
      select: true,
    }).catch(() => null);

    if (next) {
      applyCreativeContext(next);
      await updateStudioCreativeStage(next.session.id, {
        current_stage: 'revisao',
        reason: 'arte_aprovada_no_editor',
      }).then(applyCreativeContext).catch(() => null);
    }

    return next;
  }, [activeFormat?.format, activeFormat?.platform, applyCreativeContext, arteGeneratedPrompt, artePrompt, briefing?.id, buildArtDirectionSessionContext, ensureCreativeSessionContext, workflowContext.jobId]);

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
          image_provider: imageProvider !== 'gemini' ? imageProvider : undefined,
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
  const handleGenerateArteWithPrompt = async (isPreview = false) => {
    const copyVersionId = resolveActiveCopyId();
    const briefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
    if (!briefingId || !copyVersionId) {
      setArteModalError(`Dados insuficientes para gerar — briefingId: ${briefingId ? 'ok' : 'ausente'}, copyVersionId: ${copyVersionId || 'ausente'}`);
      return;
    }

    setArteModalError('');
    setArteDAResult(null);
    setArteStep('generating');
    try {
      const res = await apiPost<{ success: boolean; image_url?: string; image_urls?: string[]; data?: { image_url?: string }; error?: string }>(
        `/edro/briefings/${briefingId}/generate-creative`,
        {
          copy_version_id: copyVersionId,
          format: activeFormat?.format || 'instagram-feed',
          brand_color: clientBrandColor || undefined,
          client_id: typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') || undefined : undefined,
          headline: editorCopy.headline || undefined,
          body_text: editorCopy.body || undefined,
          custom_prompt: artePrompt || undefined,
          image_model: imageModel || undefined,
          image_provider: imageProvider !== 'gemini' ? imageProvider : undefined,
          aspect_ratio: (imageProvider === 'leonardo' || imageProvider === 'fal' || imageModel.startsWith('imagen-')) ? imageAspectRatio : undefined,
          negative_prompt: imageNegativePrompt || undefined,
          init_image_library_item_id: (imageProvider === 'leonardo' && selectedLibraryImageId) ? selectedLibraryImageId : undefined,
          init_strength: (imageProvider === 'leonardo' && selectedLibraryImageId) ? initStrength : undefined,
          // Preview: sempre 1 imagem; Leonardo/Fal normal: 3 variações
          num_images: isPreview || (imageProvider !== 'leonardo' && imageProvider !== 'fal') ? 1 : 3,
        }
      );
      const urls = res.image_urls?.length ? res.image_urls : (res.image_url || res.data?.image_url ? [res.image_url || res.data?.image_url!] : []);
      if (res.success && urls.length > 0) {
        setArteImageUrls(urls);
        setSelectedArteIndex(0);
        setArteImageUrl(urls[0]);
        setArteGeneratedPrompt(artePrompt);
        setArteDiscardTags([]);
        setArteStep(null);
        setArteModalError('');
        setArteIsPreview(isPreview);
        // Wire up pipeline result data for PipelineProgressNodes + P6
        setArteDAResult(res);
        if ((res as any).multi_format?.length) {
          setArteMultiFormat((res as any).multi_format);
        }
        if (briefingId) {
          apiPost(`/edro/briefings/${briefingId}/creative-image`, { imageUrl: urls[0] }).catch(() => null);
        }
      } else {
        const msg = res.error || 'Não retornou imagem. Tente novamente.';
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
          provider: imageProvider !== 'gemini' ? imageProvider : undefined,
        }
      );
      if (res.ok && res.refined_prompt) {
        setArtePrompt(res.refined_prompt);
        setArteRefinement('');
      }
    } catch { /* silent — user retains current prompt */ }
    setArteRefining(false);
  };

  // ── Preview Rápido — 1 imagem, provider atual
  const handlePreviewArte = () => handleGenerateArteWithPrompt(true);

  // ── Art Director — chama orchestrate e atualiza mockup ────────────────
  const handleArtDirectorGenerate = async (withImage: boolean) => {
    const clientId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') || undefined : undefined;
    const copy = editorCopy.headline || '';
    setArtDirOrchestrating(true);
    try {
      const res = await apiPost<{
        success: boolean;
        layout?: { eyebrow: string; headline: string; accentWord: string; accentColor: string; cta: string; body: string; overlayStrength: number };
        imgPrompt?: { positive: string; negative: string; aspectRatio: string };
        visualStrategy?: Record<string, any>;
        image_url?: string;
        image_urls?: string[];
        brand_colors?: string[];
      }>('/studio/creative/orchestrate', {
        copy,
        gatilho: artDirGatilho || undefined,
        brand: { primaryColor: clientBrandColor || '#E85219' },
        format: activeFormat?.format || 'Feed 1:1',
        platform: activeFormat?.platform || 'Instagram',
        client_id: clientId,
        with_image: withImage,
        image_provider: 'fal',
        num_variants: withImage ? 3 : undefined,
      });
      if (res?.success && res.layout) {
        setArtDirLayout(res.layout);
        setEditorCopy((prev) => ({
          ...prev,
          headline: res.layout!.headline || prev.headline,
          cta: res.layout!.cta || prev.cta,
        }));
      }
      if (res?.visualStrategy) {
        setArtDirVisualStrategy(res.visualStrategy);
      }
      if (res?.success && (res.layout || res.visualStrategy || res.imgPrompt)) {
        const nextContext = await persistArtDirectionContextToCreativeSession({
          layout: res.layout || null,
          visualStrategy: res.visualStrategy || null,
          imagePrompt: res.imgPrompt || null,
        });
        if (nextContext?.session?.id && workflowContext.jobId) {
          const daContext = buildArtDirectionSessionContext({
            layout: res.layout || null,
            visualStrategy: res.visualStrategy || null,
            imagePrompt: res.imgPrompt || null,
          });
          if (res.layout) {
            await addStudioCreativeVersion(nextContext.session.id, {
              job_id: workflowContext.jobId,
              version_type: 'layout',
              source: 'ai',
              payload: {
                layout: res.layout,
                da_context: daContext,
                briefing_id: resolveBriefingId(),
                platform: activeFormat?.platform || null,
                format: activeFormat?.format || null,
              },
              select: false,
            }).then(applyCreativeContext).catch(() => null);
          }
          if (res.imgPrompt) {
            await addStudioCreativeVersion(nextContext.session.id, {
              job_id: workflowContext.jobId,
              version_type: 'image_prompt',
              source: 'ai',
              payload: {
                ...res.imgPrompt,
                visual_strategy: res.visualStrategy || null,
                da_context: daContext,
                briefing_id: resolveBriefingId(),
                platform: activeFormat?.platform || null,
                format: activeFormat?.format || null,
              },
              select: false,
            }).then(applyCreativeContext).catch(() => null);
          }
        }
      }
      if (withImage) {
        const urls = res?.image_urls?.length ? res.image_urls : (res?.image_url ? [res.image_url] : []);
        if (urls.length) {
          setArteImageUrls(urls);
          setArteImageUrl(urls[0]);
          setSelectedArteIndex(0);
        }
      }
    } catch { /* silently fail */ } finally {
      setArtDirOrchestrating(false);
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
        creative_session_id: creativeContext?.session?.id || sessionId || undefined,
        metadata: {
          da_context: buildArtDirectionSessionContext(),
          visual_strategy: artDirVisualStrategy || null,
        },
        rejection_tags: tags?.length ? tags : undefined,
        rejection_reason: reason || undefined,
      });
    } catch { /* best-effort — feedback nunca bloqueia */ }
  };

  const handleApproveCreative = async () => {
    sendCreativeFeedback('approved');
    await syncApprovedAssetToCreativeSession(arteImageUrl);
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
      await syncApprovedCopyToCreativeSession(resolvedOption, copyId);
      setSuccess('Opção aprovada e aprendizado salvo no perfil do cliente.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar aprovação.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleRejectOption = async (tags: string[], reason: string, instruction: string) => {
    const copyId = resolveActiveCopyId();
    if (!copyId) {
      setError('Selecione uma versão de copy antes de rejeitar.');
      return;
    }
    setFeedbackLoading(true);
    try {
      await apiPatch(`/edro/copies/${copyId}/feedback`, {
        status: 'rejected',
        rejected_text: optionToText(resolvedOption),
        rejection_tags: tags,
        rejection_reason: reason || undefined,
        feedback: reason || 'Rejeitada no Creative Studio',
        regeneration_instruction: instruction || undefined,
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

  const handleRegenerateWithInstruction = async (
    tags: string[],
    reason: string,
    instruction: string,
  ) => {
    const copyId = resolveActiveCopyId();
    if (!copyId) {
      setError('Selecione uma versão de copy antes de regenerar.');
      return;
    }
    setFeedbackLoading(true);
    setGenerating(true);
    try {
      await apiPatch(`/edro/copies/${copyId}/feedback`, {
        status: 'rejected',
        rejected_text: optionToText(resolvedOption),
        rejection_tags: tags,
        rejection_reason: reason || undefined,
        feedback: reason || 'Rejeitada — regerando com instrução',
        regeneration_instruction: instruction,
      });

      const response = await apiPost<{
        success?: boolean;
        data?: { copy?: CopyVersion };
      }>(`/edro/copies/${copyId}/regenerate`, {
        instruction,
        platform: activeFormat?.platform || null,
      });

      const regenerated = response?.data?.copy;
      if (!regenerated?.id) {
        throw new Error('Falha ao regenerar copy.');
      }

      applyRegeneratedCopy(regenerated);
      setRegenerationCount((prev) => prev + 1);
      setSuccess('Copy regenerada com a instrução fornecida.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao regenerar copy.');
      setComparisonMode(true);
      hasAutoGeneratedRef.current = false;
    } finally {
      setFeedbackLoading(false);
      setGenerating(false);
    }
  };

  const handleQuickRefine = async () => {
    const copyId = resolveActiveCopyId();
    if (!copyId || !quickRefineInstruction.trim()) return;

    setQuickRefineLoading(true);
    setGenerating(true);

    try {
      const response = await apiPost<{
        success?: boolean;
        data?: { copy?: CopyVersion };
      }>(`/edro/copies/${copyId}/regenerate`, {
        instruction: quickRefineInstruction.trim(),
        platform: activeFormat?.platform || null,
      });

      const regenerated = response?.data?.copy;
      if (!regenerated?.id) {
        throw new Error('Falha ao refinar copy.');
      }

      applyRegeneratedCopy(regenerated);
      setSuccess('Copy refinada.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao refinar copy.');
    } finally {
      setQuickRefineLoading(false);
      setGenerating(false);
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
        <Card
          variant="outlined"
          sx={{
            borderRadius: 4,
            borderColor: clientBrandColor ? `${clientBrandColor}55` : 'divider',
            background: clientBrandColor
              ? `linear-gradient(135deg, ${clientBrandColor}16 0%, rgba(93,135,255,0.04) 52%, #fff 100%)`
              : 'linear-gradient(135deg, rgba(93,135,255,0.08) 0%, rgba(73,190,255,0.05) 52%, #fff 100%)',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={2}
              >
                <Box>
                  <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 0.8 }}>
                    AI workspace
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    Studio Criativo
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
                    Gere copy, construa prompt visual, aprove a melhor direção e siga para mockup e exportação sem sair do mesmo fluxo.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
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
                  <Chip
                    size="small"
                    color="primary"
                    label={criarTab === 0 ? 'Modo criar' : 'Modo mockups'}
                    sx={{ fontWeight: 700 }}
                  />
                  {activeFormat?.platform ? <Chip size="small" variant="outlined" label={activeFormat.platform} /> : null}
                  {formatLabel ? <Chip size="small" variant="outlined" label={formatLabel} /> : null}
                  {activeCopyLabel ? <Chip size="small" label={activeCopyLabel} /> : null}
                </Stack>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                {[
                  {
                    label: 'Copys prontas',
                    value: String(options.length),
                    helper: options.length ? 'Variações disponíveis para decidir' : 'Nenhuma variação gerada ainda',
                    tone: '#5D87FF',
                  },
                  {
                    label: 'Arte',
                    value: arteImageUrl ? 'Pronta' : 'Pendente',
                    helper: arteImageUrl ? 'Já existe imagem aprovada para seguir' : 'Gere ou refine o visual',
                    tone: arteImageUrl ? '#13DEB9' : '#E85219',
                  },
                  {
                    label: 'Motor visual',
                    value: imageProvider === 'gemini' ? 'Gemini / Imagen' : imageProvider === 'leonardo' ? 'Leonardo' : 'FAL',
                    helper: imageModel,
                    tone: '#7C3AED',
                  },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      p: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {item.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ color: item.tone }}>
                      {item.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.helper}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

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

        {/* Tab bar — Gerador de Copy / Grade de Mockups */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs value={criarTab} onChange={(_, v) => setCriarTab(v as 0 | 1)}>
            <Tab value={0} label="Gerador de Copy" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }} />
            <Tab value={1} label="Grade de Mockups" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }} />
          </Tabs>
          {briefing?.id && (
            <Button
              size="small"
              component={Link}
              href={buildStudioHref(`/studio/pipeline/${briefing.id}`, searchParams)}
              variant="outlined"
              sx={{
                mr: 1.5, textTransform: 'none', fontSize: '0.72rem', fontWeight: 600,
                borderColor: '#5D87FF', color: '#5D87FF',
                '&:hover': { borderColor: '#4a72e8', bgcolor: 'rgba(93,135,255,0.06)' },
              }}
            >
              ✦ Pipeline View
            </Button>
          )}
        </Box>

        {criarTab === 1 && <MockupsPage embedded />}

        {criarTab === 0 && (
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
                {/* ── Workflow step bar ── */}
                {(() => {
                  const copyDone = options.length > 0;
                  const arteDone = arteImageUrl !== null;
                  const steps = [
                    { label: 'Gerar Copy', sublabel: 'Escolha o texto', done: copyDone, active: !copyDone },
                    { label: 'Criar Arte', sublabel: 'Gere o visual', done: arteDone, active: copyDone && !arteDone, locked: !copyDone },
                    { label: 'Exportar', sublabel: 'Finalizar peça', done: false, active: arteDone, locked: !arteDone },
                  ];
                  return (
                    <Box sx={{
                      display: 'flex', alignItems: 'stretch',
                      borderBottom: '1px solid', borderColor: 'divider',
                      overflow: 'hidden',
                    }}>
                      {steps.map((s, i) => (
                        <Box key={i} sx={{
                          flex: 1, display: 'flex', alignItems: 'center', gap: 1.25,
                          px: 2, py: 1.25,
                          borderRight: i < 2 ? '1px solid' : 'none',
                          borderColor: 'divider',
                          bgcolor: s.active ? 'rgba(232,82,25,0.06)' : s.done ? 'rgba(19,222,185,0.04)' : 'transparent',
                          transition: 'background-color 0.3s',
                        }}>
                          {/* Step circle */}
                          <Box sx={{
                            width: 26, height: 26, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            bgcolor: s.done ? '#13DEB9' : s.active ? '#E85219' : 'action.disabledBackground',
                            border: s.active ? '2px solid #E85219' : 'none',
                            boxShadow: s.active ? '0 0 0 4px rgba(232,82,25,0.15)' : 'none',
                            transition: 'all 0.3s',
                          }}>
                            {s.done
                              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : s.locked
                              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/><path d="M8 11V7a4 4 0 018 0v4" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/></svg>
                              : <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{i + 1}</Typography>
                            }
                          </Box>
                          {/* Step text */}
                          <Box>
                            <Typography sx={{
                              fontSize: '0.72rem', fontWeight: 700, lineHeight: 1.2,
                              color: s.done ? 'success.main' : s.active ? '#E85219' : 'text.disabled',
                              transition: 'color 0.3s',
                            }}>
                              {s.label}
                            </Typography>
                            <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', lineHeight: 1.3 }}>
                              {s.sublabel}
                            </Typography>
                          </Box>
                          {/* Connector arrow (not last) */}
                        </Box>
                      ))}
                    </Box>
                  );
                })()}
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
                    artDirectorLayout={artDirLayout}
                    align="left"
                    showHeader={false}
                  />
                </Box>
                {/* Copy options */}
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                      {/* ── agentConceito panel ── */}
                      <Box sx={{ mb: 2 }}>
                        {concepts.length === 0 ? (
                          <LoadingButton
                            size="small" variant="outlined"
                            loading={conceptGenerating}
                            onClick={generateConcepts}
                            disabled={!briefing?.id}
                            startIcon={!conceptGenerating ? <IconBulb size={14} /> : null}
                            sx={{ textTransform: 'none', fontSize: '0.75rem', borderColor: 'divider', color: 'text.secondary' }}
                          >
                            Gerar conceito criativo
                          </LoadingButton>
                        ) : (
                          <Box>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Conceito criativo
                              </Typography>
                              <Button size="small" variant="text" onClick={generateConcepts} disabled={conceptGenerating}
                                sx={{ textTransform: 'none', fontSize: '0.7rem', p: '2px 6px', minWidth: 0 }}>
                                ↺ Regenerar
                              </Button>
                            </Stack>
                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                              {concepts.map((c, i) => {
                                const isSelected = selectedConcept?.concept_id === c.concept_id;
                                const isRec = i === conceptRecIdx;
                                return (
                                  <Chip
                                    key={c.concept_id}
                                    label={`${isRec ? '★ ' : ''}${c.headline_concept}`}
                                    size="small"
                                    onClick={() => setSelectedConcept(isSelected ? null : c)}
                                    color={isSelected ? 'primary' : 'default'}
                                    variant={isSelected ? 'filled' : 'outlined'}
                                    sx={{ fontSize: '0.7rem', cursor: 'pointer', maxWidth: 200 }}
                                  />
                                );
                              })}
                            </Stack>
                            {selectedConcept && (
                              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(93,135,255,0.06)', border: '1px solid', borderColor: 'primary.main', opacity: 0.85 }}>
                                <Typography variant="caption" color="primary" fontWeight={700}>{selectedConcept.headline_concept}</Typography>
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {selectedConcept.emotional_truth}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} alignItems="center">
                                  <Chip label={selectedConcept.risk_level} size="small" sx={{ fontSize: '0.65rem', height: 18 }}
                                    color={selectedConcept.risk_level === 'safe' ? 'success' : selectedConcept.risk_level === 'bold' ? 'warning' : 'error'} />
                                  <Button size="small" variant="text" onClick={() => setSelectedConcept(null)}
                                    sx={{ textTransform: 'none', fontSize: '0.7rem', p: '1px 4px', minWidth: 0, color: 'text.disabled' }}>
                                    × limpar
                                  </Button>
                                </Stack>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>

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
                        <Tooltip title="Refinar com Jarvis">
                          <Button
                            size="small" variant="outlined"
                            onClick={() => {
                              openJarvis(jarvisClientId || undefined);
                              const copy = selectedOptionData;
                              const copyText = copy
                                ? [copy.title && `Título: ${copy.title}`, copy.body && `Texto: ${copy.body}`, copy.cta && `CTA: ${copy.cta}`].filter(Boolean).join('\n')
                                : '';
                              window.dispatchEvent(new CustomEvent('jarvis-studio-send', {
                                detail: {
                                  clientId: jarvisClientId,
                                  message: copyText
                                    ? `Estou no editor de copy para "${briefing?.title || 'um briefing'}". Aqui está o copy atual:\n\n${copyText}\n\nRefina este copy para ser mais persuasivo e impactante, mantendo a voz do cliente.`
                                    : `Estou no editor de copy para "${briefing?.title || 'um briefing'}". Me ajuda a criar um copy impactante para ${activeFormat?.platform || 'esta plataforma'}.`,
                                }
                              }));
                            }}
                            disabled={!briefing?.id}
                            startIcon={<IconBrain size={14} />}
                            sx={{ flexShrink: 0, textTransform: 'none', borderColor: '#E85219', color: '#E85219', '&:hover': { borderColor: '#c94215', bgcolor: '#E8521908' } }}
                          >
                            Jarvis
                          </Button>
                        </Tooltip>
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
                                startIcon={<IconSparkles size={14} />}
                                onClick={() => setQuickRefineOpen(true)}
                                disabled={feedbackLoading || quickRefineLoading || !selectedOptionData}
                              >
                                Refinar
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
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {/* Lock overlay — shown while no copy generated */}
                  {options.length === 0 && (
                    <Box sx={{
                      position: 'absolute', inset: 0, zIndex: 10,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 1.5,
                      backdropFilter: 'blur(4px)',
                      bgcolor: 'rgba(20,20,20,0.55)',
                      borderRadius: 0,
                    }}>
                      <Box sx={{
                        width: 44, height: 44, borderRadius: '50%',
                        bgcolor: 'action.disabledBackground',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <rect x="4" y="11" width="16" height="11" rx="2" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
                          <path d="M8 11V7a4 4 0 018 0v4" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: 'text.secondary', mb: 0.25 }}>
                          Etapa 2 — Criar Arte
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          Gere o copy primeiro para desbloquear
                        </Typography>
                      </Box>
                    </Box>
                  )}
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <Chip size="small" label="Criativo com IA" />
                        {arteRefsCount > 0 && (
                          <Chip size="small" variant="outlined" label={`${arteRefsCount} ref${arteRefsCount > 1 ? 's' : ''} visual`} />
                        )}
                      </Stack>

                      <Stack spacing={1.5}>
                        {/* Provider */}
                        <Stack direction="row" spacing={0.75} sx={{ mb: 0.5 }}>
                          <Chip
                            size="small" label="Imagem"
                            variant={!artDirMode && !modelCompareMode ? 'filled' : 'outlined'}
                            color={!artDirMode && !modelCompareMode ? 'primary' : 'default'}
                            onClick={() => { setArtDirMode(false); setModelCompareMode(false); }}
                            sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                          />
                          <Chip
                            size="small" label="Art Director"
                            variant={artDirMode ? 'filled' : 'outlined'}
                            color={artDirMode ? 'secondary' : 'default'}
                            onClick={() => { setArtDirMode(true); setModelCompareMode(false); }}
                            sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                          />
                          <Chip
                            size="small" label="Comparar"
                            variant={modelCompareMode ? 'filled' : 'outlined'}
                            color={modelCompareMode ? 'warning' : 'default'}
                            onClick={() => { setModelCompareMode(true); setArtDirMode(false); }}
                            sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                          />
                        </Stack>

                        <TextField
                          select size="small" label="Provedor de imagem"
                          value={imageProvider}
                          onChange={(e) => {
                            const p = e.target.value as 'gemini' | 'leonardo' | 'fal';
                            setImageProvider(p);
                            if (p === 'leonardo') setImageModel('leonardo-phoenix');
                            else if (p === 'fal') setImageModel('fal-flux-pro');
                            else setImageModel('gemini-2.0-flash-exp-image-generation');
                          }}
                          fullWidth
                        >
                          <MenuItem value="gemini">Google Gemini / Imagen</MenuItem>
                          <MenuItem value="leonardo">Leonardo.ai</MenuItem>
                          <MenuItem value="fal">Fal.ai / Flux</MenuItem>
                        </TextField>

                        {/* Model — Gemini */}
                        {imageProvider === 'gemini' && (
                          <TextField
                            select size="small" label="Modelo"
                            value={imageModel}
                            onChange={(e) => setImageModel(e.target.value)}
                            fullWidth
                          >
                            <MenuItem value="gemini-2.0-flash-exp-image-generation">Gemini 2.0 Flash (padrão)</MenuItem>
                            <MenuItem value="imagen-3.0-generate-001">Imagen 3 — Alta qualidade</MenuItem>
                            <MenuItem value="imagen-3.0-fast-generate-001">Imagen 3 Fast — Rápido</MenuItem>
                          </TextField>
                        )}

                        {/* Model — Leonardo */}
                        {imageProvider === 'leonardo' && (
                          <TextField
                            select size="small" label="Modelo Leonardo"
                            value={imageModel}
                            onChange={(e) => setImageModel(e.target.value)}
                            fullWidth
                          >
                            <MenuItem value="leonardo-phoenix">Phoenix — Flagship (melhor qualidade)</MenuItem>
                            <MenuItem value="leonardo-lightning-xl">Lightning XL — Rápido</MenuItem>
                            <MenuItem value="leonardo-kino-xl">Kino XL — Cinematográfico</MenuItem>
                            <MenuItem value="leonardo-diffusion-xl">Diffusion XL — Criativo</MenuItem>
                          </TextField>
                        )}

                        {/* Model — Fal.ai */}
                        {imageProvider === 'fal' && (
                          <TextField
                            select size="small" label="Modelo Fal.ai"
                            value={imageModel}
                            onChange={(e) => setImageModel(e.target.value)}
                            fullWidth
                          >
                            <MenuItem value="fal-flux-pro">Flux Pro — Alta qualidade</MenuItem>
                            <MenuItem value="fal-flux-schnell">Flux Schnell — Rápido</MenuItem>
                            <MenuItem value="fal-flux-realism">Flux Realism — Fotorrealismo</MenuItem>
                            <MenuItem value="fal-flux-dev">Flux Dev — Criativo</MenuItem>
                          </TextField>
                        )}

                        {/* Library image reference picker — Leonardo only */}
                        {imageProvider === 'leonardo' && (libraryImagesLoading || libraryImages.length > 0) && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem', display: 'block', mb: 0.75 }}>
                              Referência de local (biblioteca do cliente)
                            </Typography>
                            {libraryImagesLoading ? (
                              <Stack direction="row" spacing={0.75}>
                                {[0,1,2].map(i => <Box key={i} sx={{ width: 56, height: 56, borderRadius: 1, bgcolor: 'action.hover', flexShrink: 0 }} />)}
                              </Stack>
                            ) : (
                              <Stack direction="row" spacing={0.75} sx={{ overflowX: 'auto', pb: 0.5 }}>
                                <Tooltip title="Sem referência (txt2img puro)">
                                  <Box
                                    sx={{
                                      width: 56, height: 56, flexShrink: 0, borderRadius: 1,
                                      border: 2, borderColor: !selectedLibraryImageId ? 'primary.main' : 'divider',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer', bgcolor: 'action.hover', fontSize: 10, color: 'text.secondary', textAlign: 'center', lineHeight: 1.2,
                                    }}
                                    onClick={() => setSelectedLibraryImageId(null)}
                                  >
                                    Sem ref.
                                  </Box>
                                </Tooltip>
                                {libraryImages.map((img) => (
                                  <Tooltip key={img.id} title={img.title}>
                                    <Box
                                      component="img"
                                      src={`/api/proxy/library/${img.id}/file`}
                                      alt={img.title}
                                      sx={{
                                        width: 56, height: 56, flexShrink: 0, borderRadius: 1, objectFit: 'cover',
                                        border: 2, borderColor: selectedLibraryImageId === img.id ? 'primary.main' : 'divider',
                                        cursor: 'pointer',
                                      }}
                                      onClick={() => setSelectedLibraryImageId(img.id)}
                                    />
                                  </Tooltip>
                                ))}
                              </Stack>
                            )}
                            {selectedLibraryImageId && (
                              <Box sx={{ mt: 1 }}>
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Fiel ao local</Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Criativo</Typography>
                                </Stack>
                                <Slider
                                  size="small"
                                  value={initStrength}
                                  onChange={(_, v) => setInitStrength(v as number)}
                                  min={0.2} max={0.7} step={0.05}
                                  valueLabelDisplay="auto"
                                  valueLabelFormat={(v) => `${Math.round((v as number) * 100)}%`}
                                  sx={{ color: '#E85219' }}
                                />
                              </Box>
                            )}
                          </Box>
                        )}

                        {/* Aspect ratio — Imagen 3 or Leonardo */}
                        {(imageProvider === 'leonardo' || imageModel.startsWith('imagen-')) && (
                          <TextField
                            select size="small" label="Proporção"
                            value={imageAspectRatio}
                            onChange={(e) => setImageAspectRatio(e.target.value)}
                            fullWidth
                          >
                            <MenuItem value="1:1">1:1 — Quadrado (Feed)</MenuItem>
                            <MenuItem value="4:5">4:5 — Portrait (Instagram)</MenuItem>
                            <MenuItem value="4:3">4:3 — Landscape</MenuItem>
                            <MenuItem value="3:4">3:4 — Portrait</MenuItem>
                            <MenuItem value="16:9">16:9 — Widescreen</MenuItem>
                            <MenuItem value="9:16">9:16 — Story / Vertical</MenuItem>
                          </TextField>
                        )}

                        {/* Art Director Mode */}
                        {artDirMode && (
                          <Box sx={{ border: '1px solid', borderColor: 'secondary.light', borderRadius: 1.5, p: 1.25, bgcolor: 'rgba(156,39,176,0.03)' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 600, display: 'block', mb: 0.75 }}>
                              Gatilho Psicológico
                            </Typography>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                              {[
                                { id: 'G01', label: 'G01 Perda' },
                                { id: 'G02', label: 'G02 Específico' },
                                { id: 'G03', label: 'G03 Zeigarnik' },
                                { id: 'G04', label: 'G04 Âncora' },
                                { id: 'G05', label: 'G05 Social' },
                                { id: 'G06', label: 'G06 Pratfall' },
                                { id: 'G07', label: 'G07 Dark' },
                              ].map((g) => (
                                <Chip
                                  key={g.id} label={g.label} size="small"
                                  variant={artDirGatilho === g.id ? 'filled' : 'outlined'}
                                  color={artDirGatilho === g.id ? 'secondary' : 'default'}
                                  onClick={() => setArtDirGatilho((prev) => prev === g.id ? '' : g.id)}
                                  sx={{ fontSize: '0.65rem', cursor: 'pointer' }}
                                />
                              ))}
                            </Stack>
                            <Stack direction="row" spacing={0.75}>
                              <LoadingButton
                                size="small" variant="outlined" color="secondary" fullWidth
                                loading={artDirOrchestrating}
                                onClick={() => handleArtDirectorGenerate(false)}
                                sx={{ fontSize: '0.7rem' }}
                              >
                                Layout
                              </LoadingButton>
                              <LoadingButton
                                size="small" variant="contained" color="secondary" fullWidth
                                loading={artDirOrchestrating}
                                onClick={() => handleArtDirectorGenerate(true)}
                                sx={{ fontSize: '0.7rem' }}
                              >
                                Layout + Imagem
                              </LoadingButton>
                            </Stack>
                          </Box>
                        )}

                        {/* ── Comparador de Modelos ──────────────────────── */}
                        {modelCompareMode && (
                          <ModelComparePanel
                            prompt={artePrompt}
                            negativePrompt={imageNegativePrompt}
                            aspectRatio={imageAspectRatio}
                            clientId={typeof window !== 'undefined' ? window.localStorage.getItem('edro_active_client_id') ?? undefined : undefined}
                            onSelect={(url, modelLabel) => {
                              setArteImageUrl(url);
                              setArteImageUrls([url]);
                              setModelCompareMode(false);
                            }}
                          />
                        )}

                        {/* Prompt — shown only in Imagem mode */}
                        {!artDirMode && !modelCompareMode && <Box>
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
                        </Box>}

                        {/* Negative prompt — Imagem mode only */}
                        {!artDirMode && !modelCompareMode && <TextField
                          size="small" label="Prompt negativo (opcional)"
                          value={imageNegativePrompt}
                          onChange={(e) => setImageNegativePrompt(e.target.value)}
                          placeholder="Ex: texto, palavras, logos, watermark, distorção..."
                          fullWidth
                        />}

                        {/* Iteração Guiada — aparece quando há prompt */}
                        {!artDirMode && !modelCompareMode && artePrompt.trim() && (
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

                        {/* Generate + Preview — Imagem mode only */}
                        {!artDirMode && !modelCompareMode && <Stack direction="row" spacing={0.75}>
                          <LoadingButton
                            fullWidth variant="contained" size="small"
                            loading={arteStep === 'generating' && !arteIsPreview}
                            disabled={!artePrompt.trim() || arteStep !== null}
                            onClick={() => handleGenerateArteWithPrompt()}
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
                        </Stack>}

                        {/* Pipeline progress nodes */}
                        <PipelineProgressNodes
                          active={arteStep === 'generating'}
                          result={arteDAResult}
                        />

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
                            {/* Variation picker — shown when multiple images were generated */}
                            {arteImageUrls.length > 1 && (
                              <Stack direction="row" spacing={0.75} sx={{ mt: 1, overflowX: 'auto', pb: 0.5 }}>
                                {arteImageUrls.map((url, idx) => (
                                  <Box
                                    key={idx}
                                    component="img"
                                    src={url}
                                    alt={`Variação ${idx + 1}`}
                                    onClick={() => { setSelectedArteIndex(idx); setArteImageUrl(url); }}
                                    sx={{
                                      width: 64, height: 64, objectFit: 'cover', borderRadius: 1,
                                      cursor: 'pointer', flexShrink: 0,
                                      border: 2,
                                      borderColor: selectedArteIndex === idx ? 'primary.main' : 'divider',
                                      opacity: selectedArteIndex === idx ? 1 : 0.65,
                                      transition: 'all 0.15s',
                                      '&:hover': { opacity: 1, borderColor: 'primary.light' },
                                    }}
                                  />
                                ))}
                              </Stack>
                            )}
                            {/* Multi-format grid (P6) */}
                            {arteMultiFormat.length > 0 && (
                              <Accordion disableGutters elevation={0} sx={{ mt: 1, border: 1, borderColor: 'divider', borderRadius: 1.5, '&:before': { display: 'none' } }}>
                                <AccordionSummary sx={{ minHeight: 32, py: 0, '& .MuiAccordionSummary-content': { my: 0 } }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Todos os formatos ({arteMultiFormat.length})
                                  </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                                  <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                                    {arteMultiFormat.map(f => (
                                      <Box key={f.format} sx={{ minWidth: 72, textAlign: 'center', flexShrink: 0 }}>
                                        <Box
                                          component="img" src={f.imageUrl} alt={f.format}
                                          sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider', display: 'block' }}
                                        />
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, display: 'block', mt: 0.25 }}>
                                          {f.format}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Stack>
                                </AccordionDetails>
                              </Accordion>
                            )}

                            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                              <Button size="small" variant="contained" color="success" onClick={handleApproveCreative} startIcon={<IconCheck size={14} />}>
                                Usar
                              </Button>
                              <Button size="small" variant="outlined" color="error" onClick={() => setArteDiscardOpen(true)} startIcon={<IconX size={14} />}>
                                Descartar
                              </Button>
                              <Button size="small" variant="outlined" onClick={() => { handleApproveCreative(); setCriarTab(1); }} sx={{ ml: 'auto' }}>
                                Ver Mockups →
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
        )}

        {/* Footer actions */}
        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button variant="outlined" onClick={() => router.back()}>
            Voltar
          </Button>
          <Tooltip title={!arteImageUrl ? 'Crie a arte antes de exportar' : ''} placement="top">
            <span>
              <Button
                variant="contained"
                component={arteImageUrl ? Link : 'button'}
                href={arteImageUrl ? buildStudioHref('/studio/export', searchParams) : undefined}
                disabled={!arteImageUrl}
                sx={!arteImageUrl ? { opacity: 0.45 } : {}}
              >
                Avançar para Exportar
              </Button>
            </span>
          </Tooltip>
        </Stack>
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
        onRegenerate={handleRegenerateWithInstruction}
      />

      <Dialog
        open={quickRefineOpen}
        onClose={() => {
          if (!quickRefineLoading) {
            setQuickRefineOpen(false);
            setQuickRefineInstruction('');
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pb: 1 }}>Refinar copy</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            label="O que mudar?"
            placeholder="ex.: mais curta, CTA de urgência, tom mais formal"
            value={quickRefineInstruction}
            onChange={(event) => setQuickRefineInstruction(event.target.value)}
            disabled={quickRefineLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickRefineOpen(false)} disabled={quickRefineLoading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleQuickRefine}
            disabled={quickRefineLoading || !quickRefineInstruction.trim()}
          >
            {quickRefineLoading ? 'Refinando...' : '↺ Refinar'}
          </Button>
        </DialogActions>
      </Dialog>

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
