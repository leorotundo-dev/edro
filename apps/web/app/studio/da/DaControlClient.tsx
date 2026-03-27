'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconArrowUpRight,
  IconBrain,
  IconChecklist,
  IconEyeSearch,
  IconFlame,
  IconRefresh,
  IconRoute,
  IconSparkles,
  IconTargetArrow,
} from '@tabler/icons-react';

type Concept = {
  id: string;
  slug: string;
  title: string;
  category: string;
  definition: string;
  heuristics: string[];
  critique_checks: string[];
  when_to_use: string[];
  examples: string[];
  trust_score: number;
};

type Reference = {
  id: string;
  title: string;
  source_url: string;
  image_url: string | null;
  platform: string | null;
  format: string | null;
  segment: string | null;
  visual_intent: string | null;
  creative_direction: string | null;
  mood_words: string[];
  style_tags: string[];
  composition_tags: string[];
  typography_tags: string[];
  trend_score: number | null;
  confidence_score: number | null;
  rationale: string | null;
  discovered_at: string;
};

type ManagedReference = Reference & {
  status: 'discovered' | 'analyzed' | 'rejected' | 'archived';
  domain: string | null;
  search_query: string | null;
  source_kind: string;
  source_id: string | null;
  source_name: string | null;
  source_type: string | null;
  snippet: string | null;
  analyzed_at: string | null;
};

type ReferencePreview = {
  id: string;
  title: string | null;
  source_url: string;
  image_url: string | null;
  preview_excerpt: string | null;
  preview_site_name: string | null;
  curated: boolean;
  source_name: string | null;
  source_type: string | null;
  domain: string | null;
};

type ReferenceSource = {
  id: string;
  name: string;
  source_type: 'search' | 'manual' | 'social' | 'rss' | 'site' | 'library';
  base_url: string | null;
  domain: string | null;
  trust_score: number;
  enabled: boolean;
  updated_at: string;
};

type Trend = {
  id: string;
  cluster_key: string;
  tag: string;
  sample_size: number;
  recent_count: number;
  previous_count: number;
  momentum: number;
  trust_score: number;
  trend_score: number;
  platform: string | null;
  segment: string | null;
};

type MemoryStats = {
  concepts: {
    active: number;
  };
  references: {
    discovered: number;
    analyzed: number;
    rejected: number;
    archived: number;
    lastDiscoveredAt: string | null;
    lastAnalyzedAt: string | null;
  };
  trends: {
    snapshots: number;
    lastSnapshotAt: string | null;
  };
  feedback: {
    used: number;
    approved: number;
    rejected: number;
    saved: number;
  };
};

type CanonEntry = {
  id: string;
  canon_id: string;
  canon_slug: string;
  canon_title: string;
  slug: string;
  title: string;
  summary_short: string | null;
  summary_medium: string | null;
  summary_long: string | null;
  definition: string;
  when_to_use: string[];
  when_to_avoid: string[];
  heuristics: string[];
  critique_checks: string[];
  examples: string[];
  chunk_count: number;
  source_count: number;
  metadata: Record<string, any>;
  status: 'active' | 'draft' | 'archived';
  source_confidence: number;
};

type Canon = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: 'active' | 'draft' | 'archived';
  sort_order: number;
  total_entries: number;
  active_entries: number;
  draft_entries: number;
  archived_entries: number;
  entries: CanonEntry[];
};

type MemoryResponse = {
  success: boolean;
  degraded?: boolean;
  warning?: string;
  memory: {
    promptBlock: string;
    critiqueBlock: string;
  };
  stats: MemoryStats;
  concepts: Concept[];
  canons: Canon[];
  references: Reference[];
  pendingReferences: ManagedReference[];
  rejectedReferences: ManagedReference[];
  sources: ReferenceSource[];
  trends: Trend[];
};

type ReferenceDraft = {
  title: string;
  source_url: string;
  platform: string;
  format: string;
  segment: string;
  visual_intent: string;
  creative_direction: string;
  rationale: string;
  status: ManagedReference['status'];
};

type SourceDraft = {
  name: string;
  source_type: ReferenceSource['source_type'];
  base_url: string;
  domain: string;
  trust_score: string;
  enabled: boolean;
};

const PLATFORM_OPTIONS = [
  { value: '', label: 'Sem filtro' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'General', label: 'General' },
];
const REFERENCE_STATUS_OPTIONS: ManagedReference['status'][] = ['discovered', 'analyzed', 'rejected', 'archived'];
const SOURCE_TYPE_OPTIONS: ReferenceSource['source_type'][] = ['site', 'search', 'manual', 'social', 'rss', 'library'];
const CANON_GROUPS = [
  {
    key: 'fundamentos_visuais',
    title: 'Fundamentos da Visão',
    description: 'Base perceptiva e compositiva do DA da Edro.',
    coverage: ['Gestalt', 'Grids', 'Hierarquia', 'Teoria das cores', 'Semiótica', 'Linguagem visual'],
  },
  {
    key: 'tipografia',
    title: 'Domínio Tipográfico',
    description: 'Tipografia como tom, legibilidade e valor percebido.',
    coverage: ['Tipografia', 'Sans-serifs', 'Serifas', 'Psicologia das fontes', 'Léxico tipográfico'],
  },
  {
    key: 'historia_estilo',
    title: 'História e Estilo',
    description: 'Movimentos e linguagens que o motor usa como repertório histórico.',
    coverage: ['Bauhaus', 'Design suíço', 'Pós-modernismo', 'Retrô', 'Vanguarda', 'Pastiche'],
  },
  {
    key: 'formatos_aplicacoes',
    title: 'Formatos e Aplicações',
    description: 'Como o canon desce para mídia, fotografia e direção executável.',
    coverage: ['Capas', 'Pôsteres', 'Redes sociais', 'Websites', 'Fotografia', 'UI/UX design'],
  },
  {
    key: 'acessibilidade_critica',
    title: 'Acessibilidade e Crítica',
    description: 'Regras de inclusão, clareza e revisão obrigatória.',
    coverage: ['Acessibilidade', 'Ética', 'Políticas do design', 'Resolução de problemas'],
  },
] as const;

const EDRO_SURFACE_BORDER = '1px solid rgba(15, 23, 42, 0.08)';
const EDRO_SURFACE_SHADOW = '0 24px 48px rgba(15, 23, 42, 0.06)';
const EDRO_PANEL_BG = 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)';

function EmptySection({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: 4,
        border: '1px dashed rgba(232,82,25,0.24)',
        bgcolor: 'rgba(255,255,255,0.72)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
      }}
    >
      <Typography variant="overline" sx={{ color: '#E85219', fontWeight: 800, letterSpacing: '0.08em' }}>
        Estado Vazio
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.25 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        {description}
      </Typography>
      {action ? <Box sx={{ mt: 1.5 }}>{action}</Box> : null}
    </Paper>
  );
}

function ScoreCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 4,
        height: '100%',
        border: `1px solid ${color}26`,
        background: `linear-gradient(180deg, ${color}12 0%, rgba(255,255,255,0.98) 24%, rgba(248,250,252,0.96) 100%)`,
        boxShadow: EDRO_SURFACE_SHADOW,
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              bgcolor: `${color}20`,
              color,
              display: 'grid',
              placeItems: 'center',
              border: `1px solid ${color}20`,
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
            }}
          >
            {icon}
          </Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em' }}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.1, maxWidth: 220 }}>
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  action,
  eyebrow,
  tone = '#E85219',
  sectionId,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
  tone?: string;
  sectionId?: string;
}) {
  return (
    <Card
      id={sectionId}
      variant="outlined"
      sx={{
        borderRadius: 4,
        border: EDRO_SURFACE_BORDER,
        background: EDRO_PANEL_BG,
        boxShadow: EDRO_SURFACE_SHADOW,
        overflow: 'hidden',
        scrollMarginTop: { xs: 88, md: 104 },
      }}
    >
      <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} mb={2.25}>
          <Box>
            {eyebrow ? (
              <Typography variant="overline" sx={{ color: tone, fontWeight: 800, letterSpacing: '0.08em' }}>
                {eyebrow}
              </Typography>
            ) : null}
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6, maxWidth: 760 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
        <Divider sx={{ mb: 2.25, borderColor: 'rgba(15, 23, 42, 0.06)' }} />
        {children}
      </CardContent>
    </Card>
  );
}

function timeAgo(value?: string | null) {
  if (!value) return 'sem data';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;
  const diff = Date.now() - then;
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.round(hours / 24);
  return `${days} d atrás`;
}

function uniqueTags(reference: Reference) {
  return Array.from(
    new Set([
      ...(reference.style_tags || []),
      ...(reference.composition_tags || []),
      ...(reference.typography_tags || []),
    ].filter(Boolean)),
  ).slice(0, 5);
}

function toOptionalString(value: string) {
  const normalized = value.trim();
  return normalized || undefined;
}

function getDomainLabel(url?: string | null) {
  try {
    return new URL(String(url || '')).hostname.replace(/^www\./, '');
  } catch {
    return String(url || '').trim() || 'fonte desconhecida';
  }
}

function getCanonEntryContainerStatus(entry: CanonEntry) {
  const signals = [
    Boolean(entry.definition?.trim()),
    entry.when_to_use.length > 0,
    entry.when_to_avoid.length > 0,
    entry.heuristics.length > 0,
    entry.critique_checks.length > 0,
    entry.examples.length > 0,
    entry.chunk_count > 0,
  ].filter(Boolean).length;

  if (entry.status === 'active' && signals >= 5) {
    return {
      label: 'conteúdo forte',
      color: 'success' as const,
      helper: 'já consegue alimentar o Jarvis com teoria utilizável',
    };
  }

  if (signals >= 3) {
    return {
      label: 'em expansão',
      color: 'warning' as const,
      helper: 'o contêiner já existe, mas ainda precisa de aprofundamento editorial',
    };
  }

  return {
    label: 'contêiner base',
    color: 'default' as const,
    helper: 'o tópico já existe no canon, aguardando conteúdo teórico mais profundo',
  };
}

type CanonModuleGroup = {
  key: string;
  title: string;
  description: string;
  order: number;
  entries: CanonEntry[];
};

function getCanonEntryModule(entry: CanonEntry): CanonModuleGroup {
  const title = String(entry.metadata?.curriculum_module_title || 'Mapa geral');
  return {
    key: String(entry.metadata?.curriculum_module_key || 'mapa_geral'),
    title,
    description: String(entry.metadata?.curriculum_module_description || 'Subárea curricular do canon da Edro.'),
    order: Number(entry.metadata?.curriculum_module_order || 999),
    entries: [entry],
  };
}

function groupCanonEntriesByModule(entries: CanonEntry[]) {
  const grouped = new Map<string, CanonModuleGroup>();

  for (const entry of entries) {
    const module = getCanonEntryModule(entry);
    const current = grouped.get(module.key);
    if (current) {
      current.entries.push(entry);
      continue;
    }
    grouped.set(module.key, module);
  }

  return Array.from(grouped.values())
    .map((module) => ({
      ...module,
      entries: [...module.entries].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    }))
    .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title, 'pt-BR'));
}

function getReferenceSourceMeta(reference: {
  source_url: string;
  source_name?: string | null;
  source_type?: string | null;
  domain?: string | null;
  curated?: boolean;
}) {
  const sourceName = reference.source_name || null;
  const sourceType = reference.source_type || null;
  const domain = reference.domain || getDomainLabel(reference.source_url);
  const isCurated = typeof reference.curated === 'boolean'
    ? reference.curated
    : sourceType === 'site' || sourceType === 'library';

  if (isCurated) {
    return {
      label: sourceName || domain,
      helper: 'fonte curada da Edro',
      color: 'success' as const,
    };
  }

  return {
    label: domain || sourceName || 'web aberta',
    helper: 'descoberta aberta',
    color: 'default' as const,
  };
}

function createSourceDraft(source?: ReferenceSource | null): SourceDraft {
  return {
    name: source?.name || '',
    source_type: source?.source_type || 'site',
    base_url: source?.base_url || '',
    domain: source?.domain || '',
    trust_score: source ? String(source.trust_score ?? 0.7) : '0.70',
    enabled: source?.enabled ?? true,
  };
}

function ReferenceVisualPreview({
  title,
  imageUrl,
  excerpt,
}: {
  title: string;
  imageUrl?: string | null;
  excerpt?: string | null;
}) {
  if (imageUrl) {
    return (
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 3,
          border: '1px solid rgba(15, 23, 42, 0.08)',
          bgcolor: 'rgba(15, 23, 42, 0.04)',
          aspectRatio: '16 / 10',
          mb: 1.5,
        }}
      >
        <Box
          component="img"
          src={imageUrl}
          alt={title}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </Box>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 1.5,
        borderRadius: 3,
        bgcolor: 'rgba(15, 23, 42, 0.03)',
        minHeight: 160,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Box>
        <Typography variant="overline" sx={{ color: '#E85219', fontWeight: 800, letterSpacing: '0.08em' }}>
          Preview textual
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {excerpt || 'Ainda não conseguimos puxar imagem dessa fonte. A referência segue visível aqui pelo trecho extraído.'}
        </Typography>
      </Box>
    </Paper>
  );
}

function renderReferenceDraftFields({
  draft,
  onChange,
  compact = false,
}: {
  draft: ReferenceDraft;
  onChange: (patch: Partial<ReferenceDraft>) => void;
  compact?: boolean;
}) {
  return (
    <Grid container spacing={1.25}>
      <Grid size={{ xs: 12, md: compact ? 6 : 8 }}>
        <TextField fullWidth label="Título" value={draft.title} onChange={(e) => onChange({ title: e.target.value })} size="small" />
      </Grid>
      <Grid size={{ xs: 12, md: compact ? 6 : 4 }}>
        <TextField
          select
          fullWidth
          label="Status"
          value={draft.status}
          onChange={(e) => onChange({ status: e.target.value as ManagedReference['status'] })}
          size="small"
        >
          {REFERENCE_STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="URL" value={draft.source_url} onChange={(e) => onChange({ source_url: e.target.value })} size="small" />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField fullWidth label="Plataforma" value={draft.platform} onChange={(e) => onChange({ platform: e.target.value })} size="small" />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField fullWidth label="Formato" value={draft.format} onChange={(e) => onChange({ format: e.target.value })} size="small" />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField fullWidth label="Segmento" value={draft.segment} onChange={(e) => onChange({ segment: e.target.value })} size="small" />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Intenção visual"
          value={draft.visual_intent}
          onChange={(e) => onChange({ visual_intent: e.target.value })}
          size="small"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Direção criativa"
          value={draft.creative_direction}
          onChange={(e) => onChange({ creative_direction: e.target.value })}
          size="small"
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          multiline
          minRows={compact ? 2 : 3}
          label="Racional"
          value={draft.rationale}
          onChange={(e) => onChange({ rationale: e.target.value })}
          size="small"
        />
      </Grid>
    </Grid>
  );
}

function renderSourceDraftFields({
  draft,
  onChange,
}: {
  draft: SourceDraft;
  onChange: (patch: Partial<SourceDraft>) => void;
}) {
  return (
    <Grid container spacing={1.25}>
      <Grid size={{ xs: 12, md: 5 }}>
        <TextField fullWidth label="Nome" value={draft.name} onChange={(e) => onChange({ name: e.target.value })} size="small" />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <TextField
          select
          fullWidth
          label="Tipo"
          value={draft.source_type}
          onChange={(e) => onChange({ source_type: e.target.value as ReferenceSource['source_type'] })}
          size="small"
        >
          {SOURCE_TYPE_OPTIONS.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <TextField fullWidth label="Trust" value={draft.trust_score} onChange={(e) => onChange({ trust_score: e.target.value })} size="small" />
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <TextField
          select
          fullWidth
          label="Ativa"
          value={draft.enabled ? 'true' : 'false'}
          onChange={(e) => onChange({ enabled: e.target.value === 'true' })}
          size="small"
        >
          <MenuItem value="true">Sim</MenuItem>
          <MenuItem value="false">Não</MenuItem>
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <TextField fullWidth label="Base URL" value={draft.base_url} onChange={(e) => onChange({ base_url: e.target.value })} size="small" />
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <TextField fullWidth label="Domain" value={draft.domain} onChange={(e) => onChange({ domain: e.target.value })} size="small" />
      </Grid>
    </Grid>
  );
}

export default function DaControlClient() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'discover' | 'refresh' | null>(null);
  const [showApplicationFilters, setShowApplicationFilters] = useState(false);
  const [error, setError] = useState<string>('');
  const [warning, setWarning] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const [segment, setSegment] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [mood, setMood] = useState<string>('');
  const [data, setData] = useState<MemoryResponse | null>(null);
  const [previewByReferenceId, setPreviewByReferenceId] = useState<Record<string, ReferencePreview>>({});
  const [savingReferenceId, setSavingReferenceId] = useState<string | null>(null);
  const [manualReference, setManualReference] = useState<ReferenceDraft>({
    title: '',
    source_url: '',
    platform: '',
    format: '',
    segment: '',
    visual_intent: '',
    creative_direction: '',
    rationale: '',
    status: 'discovered',
  });
  const [creatingReference, setCreatingReference] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [sourceDrafts, setSourceDrafts] = useState<Record<string, SourceDraft>>({});
  const [savingSourceId, setSavingSourceId] = useState<string | null>(null);
  const [newSource, setNewSource] = useState<SourceDraft>(createSourceDraft());
  const [canonQuery, setCanonQuery] = useState<string>('');
  const [selectedCanonKey, setSelectedCanonKey] = useState<string | null>(null);
  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null);
  const [selectedEntrySlug, setSelectedEntrySlug] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = searchParams?.get('clientId') || '';
    if (fromQuery) {
      setClientId(fromQuery);
      setShowApplicationFilters(true);
      return;
    }

    // O motor de DA é supra-cliente. Não herda client/segment/category do contexto
    // operacional salvo no navegador; qualquer recorte aqui deve ser explícito.
    setClientId('');
    setSegment('');
    setPlatform('');
    setCategory('');
    setShowApplicationFilters(false);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setWarning('');
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (platform) params.set('platform', platform);
      if (segment) params.set('segment', segment);
      params.set('concept_limit', '8');
      params.set('reference_limit', '8');
      params.set('trend_limit', '6');
      const response = await apiGet<MemoryResponse>(`/studio/creative/da-memory?${params.toString()}`);
      setData(response);
      if (response.degraded) {
        setWarning('A memória de DA ainda não está totalmente provisionada. O painel abriu em modo degradado.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar motor de DA');
    } finally {
      setLoading(false);
    }
  }, [clientId, platform, segment]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDiscover = async () => {
    setBusy('discover');
    setError('');
    setSuccess('');
    try {
      const response = await apiPost<{ inserted: number; queries: string[]; stats?: MemoryStats }>('/studio/creative/da-memory/discover', {
        client_id: clientId || undefined,
        platform: platform || undefined,
        segment: segment || undefined,
        category: category || undefined,
        mood: mood || undefined,
      });
      const queued = response.stats?.references?.discovered ?? 0;
      setSuccess(`Descoberta executada. ${response.inserted ?? 0} referências salvas. Fila atual: ${queued}.`);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao buscar referências');
    } finally {
      setBusy(null);
    }
  };

  const handleRefresh = async () => {
    setBusy('refresh');
    setError('');
    setSuccess('');
    try {
      const response = await apiPost<{ analyzed: number; snapshots: number; stats?: MemoryStats }>('/studio/creative/da-memory/refresh', {
        client_id: clientId || undefined,
        platform: platform || undefined,
        segment: segment || undefined,
        limit: 12,
        window_days: 30,
        recent_days: 7,
      });
      const remainingQueue = response.stats?.references?.discovered ?? 0;
      setSuccess(
        `Memória atualizada. ${response.analyzed ?? 0} referências analisadas, ${response.snapshots ?? 0} snapshots de tendência. Fila restante: ${remainingQueue}.`,
      );
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao recalcular memória');
    } finally {
      setBusy(null);
    }
  };

  const sendFeedback = async (referenceId: string, eventType: 'used' | 'approved' | 'rejected' | 'saved') => {
    setError('');
    setSuccess('');
    try {
      await apiPost('/studio/creative/da-memory/feedback', {
        client_id: clientId || undefined,
        reference_id: referenceId,
        event_type: eventType,
        metadata: {
          source: 'studio_da_dashboard',
          platform: platform || undefined,
          segment: segment || undefined,
        },
      });
      setSuccess(`Feedback registrado: ${eventType}.`);
    } catch (err: any) {
      setError(err?.message || 'Falha ao registrar feedback');
    }
  };

  const ensureReferencePreview = useCallback(async (reference: Reference | ManagedReference) => {
    if (previewByReferenceId[reference.id]) return;
    if (reference.image_url) {
      setPreviewByReferenceId((current) => ({
        ...current,
        [reference.id]: {
          id: reference.id,
          title: reference.title,
          source_url: reference.source_url,
          image_url: reference.image_url,
          preview_excerpt: null,
          preview_site_name: null,
          curated: false,
          source_name: null,
          source_type: null,
          domain: getDomainLabel(reference.source_url),
        },
      }));
      return;
    }

    try {
      const response = await apiGet<{ success: boolean; preview: ReferencePreview }>(
        `/studio/creative/da-memory/references/${reference.id}/preview`,
      );
      setPreviewByReferenceId((current) => ({
        ...current,
        [reference.id]: response.preview,
      }));
    } catch {
      // best-effort: keep card renderable without preview
    }
  }, [previewByReferenceId]);

  const patchJson = useCallback(async <T,>(path: string, body: Record<string, unknown>) => {
    const response = await fetch(`/api/proxy${path}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((payload as any)?.error || `Falha em ${path}`);
    }
    return payload as T;
  }, []);

  const quickUpdateReferenceStatus = useCallback(async (referenceId: string, status: ManagedReference['status']) => {
    setSavingReferenceId(referenceId);
    setError('');
    setSuccess('');
    try {
      await patchJson<{ success: boolean; reference: ManagedReference }>(`/studio/creative/da-memory/references/${referenceId}`, {
        status,
      });
      if (status === 'analyzed' || status === 'rejected') {
        await apiPost('/studio/creative/da-memory/feedback', {
          client_id: clientId || undefined,
          reference_id: referenceId,
          event_type: status === 'analyzed' ? 'approved' : 'rejected',
          metadata: {
            source: 'studio_da_training_queue',
            platform: platform || undefined,
            segment: segment || undefined,
          },
        }).catch(() => {});
      }
      setSuccess(
        status === 'analyzed'
          ? 'Referência aceita e incorporada ao repertório vivo.'
          : status === 'rejected'
          ? 'Referência rejeitada e removida da fila de treino.'
          : `Referência movida para ${status}.`,
      );
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar status da referência');
    } finally {
      setSavingReferenceId(null);
    }
  }, [load, patchJson]);

  const createManualReference = useCallback(async () => {
    setCreatingReference(true);
    setError('');
    setSuccess('');
    try {
      await apiPost<{ success: boolean; reference: ManagedReference }>('/studio/creative/da-memory/references', {
        client_id: clientId || undefined,
        title: toOptionalString(manualReference.title),
        source_url: manualReference.source_url.trim(),
        platform: toOptionalString(manualReference.platform),
        format: toOptionalString(manualReference.format),
        segment: toOptionalString(manualReference.segment) || toOptionalString(segment),
        visual_intent: toOptionalString(manualReference.visual_intent),
        creative_direction: toOptionalString(manualReference.creative_direction),
        rationale: toOptionalString(manualReference.rationale),
        status: manualReference.status,
      });
      setSuccess('Referência manual criada.');
      setManualReference({
        title: '',
        source_url: '',
        platform: '',
        format: '',
        segment: '',
        visual_intent: '',
        creative_direction: '',
        rationale: '',
        status: 'discovered',
      });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar referência manual');
    } finally {
      setCreatingReference(false);
    }
  }, [clientId, load, manualReference, segment]);

  const beginEditSource = useCallback((source: ReferenceSource) => {
    setEditingSourceId(source.id);
    setSourceDrafts((current) => ({
      ...current,
      [source.id]: current[source.id] || createSourceDraft(source),
    }));
  }, []);

  const saveSourceDraft = useCallback(async (sourceId?: string | null) => {
    const draft = sourceId ? sourceDrafts[sourceId] : newSource;
    if (!draft) return;
    const payload = {
      name: draft.name.trim(),
      source_type: draft.source_type,
      base_url: toOptionalString(draft.base_url),
      domain: toOptionalString(draft.domain),
      trust_score: Number(draft.trust_score || '0.70'),
      enabled: draft.enabled,
    };

    setSavingSourceId(sourceId || 'new');
    setError('');
    setSuccess('');
    try {
      if (sourceId) {
        await patchJson<{ success: boolean; source: ReferenceSource }>(`/studio/creative/da-memory/sources/${sourceId}`, payload);
        setEditingSourceId(null);
        setSuccess('Fonte atualizada.');
      } else {
        await apiPost<{ success: boolean; source: ReferenceSource }>('/studio/creative/da-memory/sources', payload);
        setNewSource(createSourceDraft());
        setSuccess('Fonte criada.');
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar fonte');
    } finally {
      setSavingSourceId(null);
    }
  }, [load, newSource, patchJson, sourceDrafts]);

  const topTrend = useMemo(() => data?.trends?.[0] ?? null, [data]);
  const stats = data?.stats;
  const pendingReferences = data?.pendingReferences ?? [];
  const rejectedReferences = data?.rejectedReferences ?? [];
  const analyzedReferences = data?.references ?? [];
  const sources = data?.sources ?? [];
  const canons = data?.canons ?? [];
  const activeSources = useMemo(() => sources.filter((source) => source.enabled).length, [sources]);
  const canonGroups = useMemo(
    () =>
      CANON_GROUPS.map((group) => ({
        ...group,
        canon: canons.find((canon) => canon.slug === group.key) ?? null,
        canonModules: groupCanonEntriesByModule((canons.find((canon) => canon.slug === group.key)?.entries ?? [])),
        concepts: (data?.concepts ?? []).filter((concept) =>
          group.key === 'formatos_aplicacoes'
            ? concept.category === 'formatos_aplicacoes' || concept.category === 'formatos_midias'
            : concept.category === group.key,
        ),
      })),
    [canons, data?.concepts],
  );
  const populatedCanonGroups = useMemo(
    () => canonGroups.filter((group) => (group.canon?.active_entries ?? group.concepts.length) > 0).length,
    [canonGroups],
  );
  const filteredCanonGroups = useMemo(() => {
    const normalizedQuery = canonQuery.trim().toLowerCase();
    if (!normalizedQuery) return canonGroups;
    return canonGroups
      .map((group) => {
        const filteredEntries = (group.canon?.entries ?? []).filter((entry) =>
          [entry.title, entry.slug, entry.definition, ...(entry.heuristics || []), ...(entry.examples || [])]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery),
        );
        const filteredConcepts = group.concepts.filter((concept) =>
          [concept.title, concept.slug, concept.definition, ...(concept.heuristics || []), ...(concept.examples || [])]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery),
        );
        const coverageMatch = group.coverage.some((item) => item.toLowerCase().includes(normalizedQuery));
        return {
          ...group,
          canon: group.canon ? { ...group.canon, entries: filteredEntries } : null,
          canonModules: groupCanonEntriesByModule(filteredEntries),
          concepts: filteredConcepts,
          hidden: !coverageMatch && !filteredEntries.length && !filteredConcepts.length,
        };
      })
      .filter((group) => !group.hidden);
  }, [canonGroups, canonQuery]);

  useEffect(() => {
    if (!filteredCanonGroups.length) {
      setSelectedCanonKey(null);
      setSelectedModuleKey(null);
      setSelectedEntrySlug(null);
      return;
    }

    if (!selectedCanonKey || !filteredCanonGroups.some((group) => group.key === selectedCanonKey)) {
      setSelectedCanonKey(filteredCanonGroups[0].key);
      setSelectedModuleKey(null);
      setSelectedEntrySlug(null);
    }
  }, [filteredCanonGroups, selectedCanonKey]);

  const activeCanonGroup = useMemo(
    () => filteredCanonGroups.find((group) => group.key === selectedCanonKey) ?? filteredCanonGroups[0] ?? null,
    [filteredCanonGroups, selectedCanonKey],
  );

  useEffect(() => {
    const modules = activeCanonGroup?.canonModules ?? [];
    if (!modules.length) {
      setSelectedModuleKey(null);
      setSelectedEntrySlug(null);
      return;
    }

    if (!selectedModuleKey || !modules.some((module) => module.key === selectedModuleKey)) {
      setSelectedModuleKey(modules[0].key);
      setSelectedEntrySlug(null);
    }
  }, [activeCanonGroup, selectedModuleKey]);

  const activeModule = useMemo(
    () => activeCanonGroup?.canonModules?.find((module) => module.key === selectedModuleKey) ?? activeCanonGroup?.canonModules?.[0] ?? null,
    [activeCanonGroup, selectedModuleKey],
  );

  useEffect(() => {
    const entries = activeModule?.entries ?? [];
    if (!entries.length) {
      setSelectedEntrySlug(null);
      return;
    }

    if (!selectedEntrySlug || !entries.some((entry) => entry.slug === selectedEntrySlug)) {
      setSelectedEntrySlug(entries[0].slug);
    }
  }, [activeModule, selectedEntrySlug]);

  const activeEntry = useMemo(
    () => activeModule?.entries?.find((entry) => entry.slug === selectedEntrySlug) ?? activeModule?.entries?.[0] ?? null,
    [activeModule, selectedEntrySlug],
  );

  useEffect(() => {
    const candidates = [...pendingReferences.slice(0, 12), ...analyzedReferences.slice(0, 8)];
    for (const reference of candidates) {
      void ensureReferencePreview(reference);
    }
  }, [analyzedReferences, ensureReferencePreview, pendingReferences]);

  const nextStep = useMemo(() => {
    if (!stats) return 'Carregando status do pipeline.';
    if ((canons.length === 0) && (data?.concepts?.length ?? 0) === 0) {
      return 'O canon ainda não carregou nesta visão. Recarregue a tela; se continuar zerado, ainda há problema de setup.';
    }
    if (stats.references.discovered === 0 && stats.references.analyzed === 0) {
      return 'Próximo passo: buscar referências para enfileirar repertório visual.';
    }
    if (stats.references.discovered > 0 && stats.references.analyzed === 0) {
      return 'Há referências na fila, mas nenhuma analisada ainda. Rode Recalcular para transformar descoberta em memória útil.';
    }
    if (stats.references.analyzed > 0 && stats.trends.snapshots === 0) {
      return 'As referências já foram analisadas. Falta recalcular os snapshots para o Trend Radar começar a aparecer.';
    }
    return 'O pipeline está ativo. O próximo ganho vem de buscar mais referências e alimentar feedback humano nas melhores.';
  }, [canons.length, data?.concepts?.length, stats]);

  return (
    <Box
      sx={{
        maxWidth: 1440,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: 4,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '0 16px auto',
          height: 260,
          borderRadius: 6,
          background:
            'radial-gradient(circle at top left, rgba(232,82,25,0.18), transparent 42%), radial-gradient(circle at top right, rgba(93,135,255,0.18), transparent 44%), linear-gradient(180deg, rgba(255,246,241,0.9) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
    >
      <Stack spacing={3}>
        <Card
          variant="outlined"
          sx={{
            position: 'relative',
            zIndex: 1,
            borderRadius: 5,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            background:
              'linear-gradient(135deg, rgba(255,248,244,0.96) 0%, rgba(255,255,255,0.98) 42%, rgba(244,248,255,0.96) 100%)',
            boxShadow: '0 28px 60px rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Grid container spacing={3} alignItems="stretch">
              <Grid size={{ xs: 12, lg: 7 }}>
                <Typography variant="overline" sx={{ color: '#E85219', fontWeight: 900, letterSpacing: '0.12em' }}>
                  Edro Canon Lab
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.05em', mt: 0.5, maxWidth: 780 }}>
                  Direção de Arte Intelligence
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1.2, maxWidth: 760, fontSize: '1.02rem' }}>
                  O cérebro visual da Edro aprende aqui. Mas ele aprende em duas matérias diferentes:
                  primeiro os canons teóricos da Edro, depois as referências visuais externas que entram para triagem.
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" mt={2}>
                  <Chip size="small" label="Canons teóricos" sx={{ bgcolor: 'rgba(232,82,25,0.10)', color: '#E85219' }} />
                  <Chip size="small" label="Referências externas" sx={{ bgcolor: 'rgba(19,222,185,0.10)', color: '#0f766e' }} />
                  <Chip size="small" label="Tendências derivadas" sx={{ bgcolor: 'rgba(255,174,31,0.12)', color: '#b45309' }} />
                  <Chip size="small" label="Feedback humano" sx={{ bgcolor: 'rgba(93,135,255,0.10)', color: '#3659c9' }} />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, lg: 5 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    height: '100%',
                    p: 2.25,
                    borderRadius: 4,
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    bgcolor: 'rgba(255,255,255,0.78)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                  }}
                >
                  <Typography variant="overline" sx={{ color: '#5D87FF', fontWeight: 800, letterSpacing: '0.08em' }}>
                    Estado do Treino
                  </Typography>
                  <Stack spacing={1.25} mt={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Pilares populados</Typography>
                      <Chip size="small" color="primary" label={`${populatedCanonGroups}/${CANON_GROUPS.length}`} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Fila de referências</Typography>
                      <Chip size="small" color="warning" variant="outlined" label={stats ? `${stats.references.discovered}` : '...'} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Repertório analisado</Typography>
                      <Chip size="small" color="success" variant="outlined" label={stats ? `${stats.references.analyzed}` : '...'} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Snapshots ativos</Typography>
                      <Chip size="small" variant="outlined" label={stats ? `${stats.trends.snapshots}` : '...'} />
                    </Stack>
                  </Stack>
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 2,
                      p: 1.5,
                      borderRadius: 3,
                      border: '1px dashed rgba(232,82,25,0.22)',
                      bgcolor: 'rgba(232,82,25,0.04)',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#E85219' }}>
                      Próximo movimento
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {nextStep}
                    </Typography>
                  </Paper>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error ? <Alert severity="error" sx={{ zIndex: 1 }}>{error}</Alert> : null}
        {warning ? <Alert severity="warning" sx={{ zIndex: 1 }}>{warning}</Alert> : null}
        {success ? <Alert severity="success" sx={{ zIndex: 1 }}>{success}</Alert> : null}

        <Grid container spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <ScoreCard
              title="Canons teóricos"
              value={canons.length ? canons.reduce((sum, canon) => sum + canon.active_entries, 0) : data?.concepts?.length ?? 0}
              subtitle={
                canons.length
                  ? `${canons.reduce((sum, canon) => sum + canon.total_entries, 0)} tópicos catalogados em ${CANON_GROUPS.length} pilares`
                  : 'biblioteca teórica do DA da Edro'
              }
              icon={<IconBrain size={20} />}
              color="#5D87FF"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <ScoreCard
              title="Refs externas aceitas"
              value={stats?.references?.analyzed ?? data?.references?.length ?? 0}
              subtitle={
                stats
                  ? `${stats.references.discovered} em triagem • ${stats.references.rejected} rejeitadas`
                  : 'casos externos aceitos no repertório'
              }
              icon={<IconEyeSearch size={20} />}
              color="#13DEB9"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <ScoreCard
              title="Tendências derivadas"
              value={stats?.trends?.snapshots ?? data?.trends?.length ?? 0}
              subtitle={
                topTrend
                  ? `principal sinal: ${topTrend.tag}`
                  : stats?.references?.analyzed
                  ? 'aguardando snapshots'
                  : 'nenhum snapshot ainda'
              }
              icon={<IconFlame size={20} />}
              color="#FFAE1F"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <ScoreCard
              title="Fontes externas"
              value={activeSources}
              subtitle={sources.length ? `${sources.length} fontes cadastradas na Edro` : 'cadastre sites de referência da Edro'}
              icon={<IconTargetArrow size={20} />}
              color="#FA896B"
            />
          </Grid>
        </Grid>

        <SectionCard
          title="Como o bot DA é alimentado"
          subtitle="Clique em cada card para ir direto à área certa. Os canons ensinam teoria. As referências externas entram em triagem, e só depois viram repertório e tendência."
          eyebrow="Fluxo"
          tone="#5D87FF"
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <Link href="#da-canons" underline="none" color="inherit" sx={{ display: 'block' }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    height: '100%',
                    bgcolor: 'rgba(93,135,255,0.04)',
                    cursor: 'pointer',
                    transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 18px 38px rgba(93,135,255,0.12)',
                      borderColor: 'rgba(93,135,255,0.28)',
                    },
                  }}
                >
                  <Typography variant="overline" sx={{ color: '#5D87FF', fontWeight: 800, letterSpacing: '0.08em' }}>
                    1. Canon
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Biblioteca teórica da Edro
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Aqui mora a disciplina: design gráfico, tipografia, estética, direção de arte, história e crítica.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1.2, color: '#5D87FF', fontWeight: 700 }}>
                    Entrar para alimentar, estudar e revisar a teoria
                  </Typography>
                  <Chip sx={{ mt: 1.5 }} size="small" color="primary" label={`${canons.reduce((sum, canon) => sum + canon.total_entries, 0)} tópicos`} />
                </Paper>
              </Link>
            </Grid>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <Link href="#da-triagem" underline="none" color="inherit" sx={{ display: 'block' }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    height: '100%',
                    bgcolor: 'rgba(19,222,185,0.04)',
                    cursor: 'pointer',
                    transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 18px 38px rgba(19,222,185,0.12)',
                      borderColor: 'rgba(19,222,185,0.28)',
                    },
                  }}
                >
                  <Typography variant="overline" sx={{ color: '#13DEB9', fontWeight: 800, letterSpacing: '0.08em' }}>
                    2. Triagem
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Referências visuais externas
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Sites, portfólios e buscas externas entram aqui. O gesto é binário: aceita no repertório ou rejeita.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1.2, color: '#13DEB9', fontWeight: 700 }}>
                    Entrar para aprovar ou rejeitar referências
                  </Typography>
                  <Chip sx={{ mt: 1.5 }} size="small" color="success" variant="outlined" label={`${pendingReferences.length} na fila`} />
                </Paper>
              </Link>
            </Grid>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <Link href="#da-repertorio" underline="none" color="inherit" sx={{ display: 'block' }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    height: '100%',
                    bgcolor: 'rgba(232,82,25,0.04)',
                    cursor: 'pointer',
                    transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 18px 38px rgba(232,82,25,0.12)',
                      borderColor: 'rgba(232,82,25,0.28)',
                    },
                  }}
                >
                  <Typography variant="overline" sx={{ color: '#E85219', fontWeight: 800, letterSpacing: '0.08em' }}>
                    3. Repertório
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Memória visual viva
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    As referências aceitas passam a compor o repertório reutilizável do bot DA da Edro.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1.2, color: '#E85219', fontWeight: 700 }}>
                    Entrar para revisar, usar e recalibrar o repertório
                  </Typography>
                  <Chip sx={{ mt: 1.5 }} size="small" color="warning" variant="outlined" label={`${analyzedReferences.length} aceitas`} />
                </Paper>
              </Link>
            </Grid>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <Link href="#da-trends" underline="none" color="inherit" sx={{ display: 'block' }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    height: '100%',
                    bgcolor: 'rgba(255,174,31,0.06)',
                    cursor: 'pointer',
                    transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 18px 38px rgba(255,174,31,0.12)',
                      borderColor: 'rgba(255,174,31,0.28)',
                    },
                  }}
                >
                  <Typography variant="overline" sx={{ color: '#FFAE1F', fontWeight: 800, letterSpacing: '0.08em' }}>
                    4. Trend radar
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Padrões derivados
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    O radar não é teoria nem referência. Ele é o que o sistema extrai do repertório já aceito.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1.2, color: '#FFAE1F', fontWeight: 700 }}>
                    Entrar para auditar o que o bot está derivando
                  </Typography>
                  <Chip sx={{ mt: 1.5 }} size="small" variant="outlined" label={`${stats?.trends.snapshots ?? 0} snapshots`} />
                </Paper>
              </Link>
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          sectionId="da-triagem"
          title="Referências externas em triagem"
          subtitle="Este bloco não é teoria. Aqui entram sites, portfólios e resultados externos para você decidir se ensinam o bot visualmente. A ação principal aqui é aprovar ou rejeitar."
          eyebrow="Referências Externas"
          tone="#13DEB9"
        >
          {loading ? (
            <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
          ) : (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'rgba(19,222,185,0.04)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  O que você faz aqui
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Ver a referência sem sair da Edro, abrir a fonte se precisar conferir, e decidir binariamente: entra no repertório da Edro ou sai.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Fila de referências externas
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      O que aparece aqui veio de fontes externas. O gesto principal é binário: entra no repertório da Edro ou sai.
                    </Typography>
                  </Box>
                  <Chip color="warning" variant="outlined" label={`${pendingReferences.length} na fila`} />
                </Stack>

                {!pendingReferences.length ? (
                  <EmptySection
                    title="Nenhuma referência descoberta pendente."
                    description="Quando a descoberta web enfileirar novos casos, eles aparecem aqui para revisão rápida antes da análise."
                  />
                ) : (
                  <Grid container spacing={2}>
                    {pendingReferences.map((reference) => {
                      const isSaving = savingReferenceId === reference.id;
                      const preview = previewByReferenceId[reference.id];
                      const sourceMeta = getReferenceSourceMeta(preview || reference);

                      return (
                        <Grid key={reference.id} size={{ xs: 12, xl: 6 }}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                            <Stack direction="row" justifyContent="space-between" gap={2} mb={1}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                  {reference.title || 'Sem título'}
                                </Typography>
                                <Stack direction="row" gap={1} flexWrap="wrap" mt={0.75}>
                                  <Chip size="small" color={sourceMeta.color} variant="outlined" label={sourceMeta.helper} />
                                  <Chip size="small" variant="outlined" label={sourceMeta.label} />
                                  {reference.search_query ? <Chip size="small" variant="outlined" label={reference.search_query} /> : null}
                                  <Chip size="small" variant="outlined" label={timeAgo(reference.discovered_at)} />
                                </Stack>
                              </Box>
                              <Stack direction="row" gap={1} flexWrap="wrap">
                                <Chip size="small" color="warning" label="na fila" />
                                <Button
                                  size="small"
                                  component={Link}
                                  href={reference.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  endIcon={<IconArrowUpRight size={14} />}
                                >
                                  Ver fonte
                                </Button>
                              </Stack>
                            </Stack>

                            <ReferenceVisualPreview
                              title={preview?.title || reference.title || 'Referência'}
                              imageUrl={preview?.image_url || reference.image_url}
                              excerpt={preview?.preview_excerpt || reference.snippet || reference.rationale}
                            />

                            <Typography variant="body2" color="text.secondary">
                              {preview?.preview_excerpt || reference.snippet || reference.rationale || 'Sem resumo salvo nesta descoberta.'}
                            </Typography>
                            <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
                              {reference.visual_intent ? <Chip size="small" variant="outlined" label={reference.visual_intent} /> : null}
                            </Stack>
                            <Divider sx={{ my: 1.5 }} />
                            <Stack direction="row" gap={1} flexWrap="wrap">
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => void quickUpdateReferenceStatus(reference.id, 'analyzed')}
                                disabled={isSaving}
                              >
                                Aceitar
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() => void quickUpdateReferenceStatus(reference.id, 'rejected')}
                                disabled={isSaving}
                              >
                                Rejeitar
                              </Button>
                            </Stack>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Paper>

              {!!rejectedReferences.length && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Descartadas
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Casos que saíram do repertório ativo, mas ainda podem ser revisados.
                      </Typography>
                    </Box>
                    <Chip color="default" variant="outlined" label={`${rejectedReferences.length} descartadas`} />
                  </Stack>
                  <Grid container spacing={2}>
                    {rejectedReferences.map((reference) => (
                      <Grid key={reference.id} size={{ xs: 12, lg: 6 }}>
                        <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'rgba(15, 23, 42, 0.02)', height: '100%' }}>
                          <Stack direction="row" justifyContent="space-between" gap={2}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {reference.title || 'Sem título'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {reference.domain || reference.source_name || 'fonte não classificada'} • {timeAgo(reference.discovered_at)}
                              </Typography>
                            </Box>
                            <Stack direction="row" gap={1}>
                              <Button size="small" component={Link} href={reference.source_url} target="_blank" rel="noopener noreferrer">
                                Abrir
                              </Button>
                              <Button
                                size="small"
                                onClick={() => void quickUpdateReferenceStatus(reference.id, 'discovered')}
                                disabled={savingReferenceId === reference.id}
                              >
                                Restaurar
                              </Button>
                            </Stack>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {reference.snippet || reference.rationale || 'Sem observação salva.'}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}
            </Stack>
          )}
        </SectionCard>

        <SectionCard
          title="Busca e ingestão de referências externas"
          subtitle="Este bloco controla só a camada de referências externas. Ele não mexe na biblioteca teórica dos canons."
          eyebrow="Busca Externa"
          tone="#5D87FF"
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={busy === 'refresh' ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
                onClick={handleRefresh}
                disabled={busy !== null}
              >
                Recalcular
              </Button>
              <Button
                variant="contained"
                startIcon={busy === 'discover' ? <CircularProgress size={14} /> : <IconSparkles size={16} />}
                onClick={handleDiscover}
                disabled={busy !== null}
              >
                Buscar referências
              </Button>
            </Stack>
          }
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Plataforma opcional"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {PLATFORM_OPTIONS.map((item) => (
                  <MenuItem key={item.value || 'all'} value={item.value}>{item.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Tema de busca opcional"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="editorial, poster design, embalagem..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                label="Mood opcional"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="premium, clean, bold, documentary..."
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  height: '100%',
                  borderRadius: 2,
                  bgcolor: 'rgba(93,135,255,0.03)',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Este bloco atua só no fluxo externo:
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                  <Chip size="small" label="Busca" />
                  <Chip size="small" label="Triagem" />
                  <Chip size="small" label="Repertório" />
                  <Chip size="small" label="Trend Radar" />
                  {(clientId || segment) ? <Chip size="small" color="warning" variant="outlined" label="Recorte opcional ativo" /> : null}
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(15, 23, 42, 0.02)',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5} alignItems={{ md: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Recorte opcional de aplicação
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Cliente e segmento não treinam o cérebro da Edro. Eles só testam como o DA se comporta em um contexto específico.
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {(clientId || segment) ? (
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => {
                          setClientId('');
                          setSegment('');
                        }}
                      >
                        Limpar recorte
                      </Button>
                    ) : null}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowApplicationFilters((current) => !current)}
                    >
                      {showApplicationFilters ? 'Ocultar recorte' : 'Aplicar recorte'}
                    </Button>
                  </Stack>
                </Stack>
                {showApplicationFilters ? (
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Cliente opcional"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="id do cliente para teste"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Segmento opcional"
                        value={segment}
                        onChange={(e) => setSegment(e.target.value)}
                        placeholder="varejo, saúde, industrial..."
                      />
                    </Grid>
                  </Grid>
                ) : null}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(232,82,25,0.03)',
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#E85219' }}>
                      Próximo passo recomendado
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {nextStep}
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                    <Chip size="small" label={`Descobertas ${stats?.references.discovered ?? 0}`} />
                    <Chip size="small" label={`Analisadas ${stats?.references.analyzed ?? 0}`} />
                    <Chip size="small" label={`Snapshots ${stats?.trends.snapshots ?? 0}`} />
                    <Chip size="small" label={`Feedback +${(stats?.feedback.approved ?? 0) + (stats?.feedback.used ?? 0)}`} />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </SectionCard>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <SectionCard
              title="Inclusão manual"
              subtitle="Cadastre uma referência específica quando você já souber qual caso precisa entrar na memória."
              eyebrow="Entrada Direta"
              tone="#E85219"
            >
              <Stack spacing={1.5}>
                {renderReferenceDraftFields({
                  draft: manualReference,
                  onChange: (patch) => setManualReference((current) => ({ ...current, ...patch })),
                })}
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={() => void createManualReference()}
                    disabled={creatingReference || !manualReference.source_url.trim()}
                  >
                    {creatingReference ? 'Criando...' : 'Incluir referência'}
                  </Button>
                </Stack>
              </Stack>
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <SectionCard
              title="Sites e fontes de referência"
              subtitle="Cadastre os domínios que o motor deve privilegiar nas buscas e ajuste o peso de confiança."
              eyebrow="Fontes"
              tone="#FA896B"
            >
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(93,135,255,0.03)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Nova fonte
                  </Typography>
                  <Stack spacing={1.5}>
                    {renderSourceDraftFields({
                      draft: newSource,
                      onChange: (patch) => setNewSource((current) => ({ ...current, ...patch })),
                    })}
                    <Stack direction="row" justifyContent="flex-end">
                      <Button
                        variant="contained"
                        onClick={() => void saveSourceDraft(null)}
                        disabled={savingSourceId === 'new' || !newSource.name.trim()}
                      >
                        {savingSourceId === 'new' ? 'Salvando...' : 'Adicionar site'}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>

                {!sources.length ? (
                  <EmptySection
                    title="Nenhuma fonte cadastrada."
                    description="Cadastre sites de referência para o motor priorizar domínios específicos durante a descoberta."
                  />
                ) : (
                  <Stack spacing={1.5}>
                    {sources.map((source) => {
                      const draft = sourceDrafts[source.id] || createSourceDraft(source);
                      const isEditing = editingSourceId === source.id;
                      const isSaving = savingSourceId === source.id;

                      return (
                        <Paper key={source.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                          <Stack direction="row" justifyContent="space-between" gap={2} mb={1.5}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {source.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {source.domain || source.base_url || 'sem domínio'} • atualizado {timeAgo(source.updated_at)}
                              </Typography>
                            </Box>
                            <Stack direction="row" gap={1} flexWrap="wrap">
                              <Chip size="small" label={source.source_type} />
                              <Chip
                                size="small"
                                color={source.enabled ? 'success' : 'default'}
                                variant="outlined"
                                label={source.enabled ? 'ativa' : 'pausada'}
                              />
                              <Chip size="small" variant="outlined" label={`trust ${Number(source.trust_score || 0).toFixed(2)}`} />
                            </Stack>
                          </Stack>

                          {isEditing ? (
                            <Stack spacing={1.5}>
                              {renderSourceDraftFields({
                                draft,
                                onChange: (patch) =>
                                  setSourceDrafts((current) => ({
                                    ...current,
                                    [source.id]: {
                                      ...(current[source.id] || createSourceDraft(source)),
                                      ...patch,
                                    },
                                  })),
                              })}
                              <Stack direction="row" gap={1}>
                                <Button variant="contained" size="small" onClick={() => void saveSourceDraft(source.id)} disabled={isSaving}>
                                  {isSaving ? 'Salvando...' : 'Salvar'}
                                </Button>
                                <Button variant="outlined" size="small" onClick={() => setEditingSourceId(null)} disabled={isSaving}>
                                  Cancelar
                                </Button>
                              </Stack>
                            </Stack>
                          ) : (
                            <Stack direction="row" gap={1} flexWrap="wrap">
                              {source.base_url ? <Chip size="small" variant="outlined" label={source.base_url} /> : null}
                              <Button size="small" variant="outlined" onClick={() => beginEditSource(source)}>
                                Editar
                              </Button>
                              {source.base_url ? (
                                <Button
                                  size="small"
                                  component={Link}
                                  href={source.base_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  endIcon={<IconArrowUpRight size={14} />}
                                >
                                  Abrir site
                                </Button>
                              ) : null}
                            </Stack>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              sectionId="da-canons"
              title="Biblioteca completa de teoria e canons da Edro"
              subtitle="Aqui fica a disciplina que a Edro ensina ao bot: fundamentos, tipografia, história, formatos, estética, direção de arte e crítica. É a área para alimentar, revisar e aprofundar a teoria."
              eyebrow="Canon"
              tone="#5D87FF"
              action={(
                <TextField
                  size="small"
                  label="Buscar na teoria"
                  value={canonQuery}
                  onChange={(e) => setCanonQuery(e.target.value)}
                  placeholder="gestalt, bauhaus, tipografia..."
                  sx={{ minWidth: { xs: 180, md: 260 } }}
                />
              )}
            >
              {loading ? (
                <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
              ) : !(canons.length || data?.concepts?.length) ? (
                <EmptySection
                  title="Nenhum conceito retornou nesta carga."
                  description="O canon base deveria aparecer automaticamente. Se isso continuar zerado após o refresh, ainda há problema de provisionamento ou filtro agressivo demais."
                />
              ) : (
                <Stack spacing={1.5}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.75,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(15, 23, 42, 0.02)',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Biblioteca supra-cliente da Edro. Navegue por canon, módulo e tópico para estudar ou alimentar um contêiner teórico por vez.
                    </Typography>
                    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                      <Chip size="small" label={`${canons.reduce((sum, canon) => sum + canon.total_entries, 0)} tópicos catalogados`} />
                      <Chip size="small" label={`${canons.reduce((sum, canon) => sum + canon.active_entries, 0)} ativos`} />
                      <Chip size="small" label={`${canons.reduce((sum, canon) => sum + canon.draft_entries, 0)} em curadoria`} />
                      <Chip size="small" variant="outlined" label="da_canons" />
                      <Chip size="small" variant="outlined" label="da_canon_entries" />
                      <Chip size="small" variant="outlined" label="da_canon_chunks" />
                    </Stack>
                  </Paper>
                  {filteredCanonGroups.length ? (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, lg: 4 }}>
                        <Stack spacing={1.5}>
                          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              1. Escolha um canon
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45, mb: 1.2 }}>
                              Entre por um território da disciplina.
                            </Typography>
                            <List dense disablePadding>
                              {filteredCanonGroups.map((group) => {
                                const selected = group.key === activeCanonGroup?.key;
                                return (
                                  <ListItemButton
                                    key={`canon-browser-${group.key}`}
                                    onClick={() => {
                                      setSelectedCanonKey(group.key);
                                      setSelectedModuleKey(null);
                                      setSelectedEntrySlug(null);
                                    }}
                                    sx={{
                                      px: 1.25,
                                      py: 1,
                                      mb: 0.75,
                                      borderRadius: 2,
                                      border: '1px solid',
                                      borderColor: selected ? 'rgba(93,135,255,0.38)' : 'rgba(15, 23, 42, 0.08)',
                                      bgcolor: selected ? 'rgba(93,135,255,0.08)' : 'rgba(255,255,255,0.92)',
                                    }}
                                  >
                                    <ListItemText
                                      primary={group.title}
                                      secondary={group.description}
                                      primaryTypographyProps={{ fontWeight: 700, fontSize: 14.5 }}
                                      secondaryTypographyProps={{ fontSize: 12.5 }}
                                    />
                                    <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent="flex-end">
                                      <Chip size="small" variant={selected ? 'filled' : 'outlined'} color={selected ? 'primary' : 'default'} label={`${group.canon?.total_entries ?? 0}`} />
                                      <Chip size="small" variant="outlined" label={`${group.canonModules?.length ?? 0} módulos`} />
                                    </Stack>
                                  </ListItemButton>
                                );
                              })}
                            </List>
                          </Paper>

                          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              2. Escolha um módulo
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45, mb: 1.2 }}>
                              O canon é quebrado em blocos de estudo.
                            </Typography>
                            {activeCanonGroup?.canonModules?.length ? (
                              <List dense disablePadding>
                                {activeCanonGroup.canonModules.map((module) => {
                                  const selected = module.key === activeModule?.key;
                                  return (
                                    <ListItemButton
                                      key={`module-browser-${module.key}`}
                                      onClick={() => {
                                        setSelectedModuleKey(module.key);
                                        setSelectedEntrySlug(null);
                                      }}
                                      sx={{
                                        px: 1.25,
                                        py: 0.95,
                                        mb: 0.75,
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: selected ? 'rgba(232,82,25,0.30)' : 'rgba(15, 23, 42, 0.08)',
                                        bgcolor: selected ? 'rgba(232,82,25,0.06)' : 'rgba(255,255,255,0.92)',
                                      }}
                                    >
                                      <ListItemText
                                        primary={module.title}
                                        secondary={module.description}
                                        primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }}
                                        secondaryTypographyProps={{ fontSize: 12.5 }}
                                      />
                                      <Chip size="small" variant="outlined" label={`${module.entries.length}`} />
                                    </ListItemButton>
                                  );
                                })}
                              </List>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Selecione um canon para ver seus módulos.
                              </Typography>
                            )}
                          </Paper>

                          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              3. Escolha um tópico
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45, mb: 1.2 }}>
                              Entre no contêiner teórico específico.
                            </Typography>
                            {activeModule?.entries?.length ? (
                              <List dense disablePadding sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
                                {activeModule.entries.map((entry) => (
                                  <ListItemButton
                                    key={`topic-browser-${entry.slug}`}
                                    onClick={() => setSelectedEntrySlug(entry.slug)}
                                    sx={{
                                      px: 1.25,
                                      py: 0.95,
                                      mb: 0.75,
                                      borderRadius: 2,
                                      border: '1px solid',
                                      borderColor: entry.slug === activeEntry?.slug ? 'rgba(93,135,255,0.38)' : 'rgba(15, 23, 42, 0.08)',
                                      bgcolor: entry.slug === activeEntry?.slug ? 'rgba(93,135,255,0.08)' : 'rgba(255,255,255,0.92)',
                                    }}
                                  >
                                    <ListItemText
                                      primary={entry.title}
                                      secondary={entry.status === 'active' ? 'ativo' : entry.status === 'draft' ? 'em curadoria' : entry.status}
                                      primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }}
                                      secondaryTypographyProps={{ fontSize: 12.5 }}
                                    />
                                    <Chip size="small" variant="outlined" label={`${entry.chunk_count} chunks`} />
                                  </ListItemButton>
                                ))}
                              </List>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Selecione um módulo para ver os tópicos.
                              </Typography>
                            )}
                          </Paper>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 12, lg: 8 }}>
                        <Stack spacing={1.5}>
                          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(15, 23, 42, 0.02)' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.85 }}>
                              Breadcrumb da biblioteca
                            </Typography>
                            <Breadcrumbs aria-label="breadcrumb" separator="›">
                              <Button variant="text" size="small" onClick={() => {
                                setSelectedModuleKey(null);
                                setSelectedEntrySlug(null);
                              }}>
                                Biblioteca teórica
                              </Button>
                              {activeCanonGroup ? (
                                <Button variant="text" size="small" onClick={() => {
                                  setSelectedCanonKey(activeCanonGroup.key);
                                  setSelectedModuleKey(null);
                                  setSelectedEntrySlug(null);
                                }}>
                                  {activeCanonGroup.title}
                                </Button>
                              ) : null}
                              {activeModule ? (
                                <Button variant="text" size="small" onClick={() => {
                                  setSelectedModuleKey(activeModule.key);
                                  setSelectedEntrySlug(null);
                                }}>
                                  {activeModule.title}
                                </Button>
                              ) : null}
                              {activeEntry ? <Typography variant="body2" sx={{ fontWeight: 700 }}>{activeEntry.title}</Typography> : null}
                            </Breadcrumbs>
                          </Paper>
                          {activeEntry ? (
                            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5 }}>
                              <Stack direction="row" justifyContent="space-between" gap={2} mb={1.2}>
                                <Box>
                                  <Typography variant="overline" sx={{ color: '#5D87FF', fontWeight: 800, letterSpacing: '0.08em' }}>
                                    {activeCanonGroup?.title || 'Canon'}
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.35 }}>
                                    {activeEntry.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>
                                    {activeModule?.description || activeCanonGroup?.description}
                                  </Typography>
                                </Box>
                                <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
                                  <Chip size="small" variant="outlined" label={activeEntry.slug} />
                                  <Chip size="small" variant="outlined" label={activeEntry.status} color={activeEntry.status === 'active' ? 'success' : activeEntry.status === 'draft' ? 'warning' : 'default'} />
                                </Stack>
                              </Stack>
                              <Grid container spacing={1.5}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Paper variant="outlined" sx={{ p: 1.4, borderRadius: 2.25, height: '100%' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                      Como esse tópico alimenta o Jarvis
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>
                                      {getCanonEntryContainerStatus(activeEntry).helper}
                                    </Typography>
                                    <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                                      <Chip size="small" variant="outlined" label={`chunks ${activeEntry.chunk_count}`} />
                                      <Chip size="small" variant="outlined" label={`fontes ${activeEntry.source_count}`} />
                                      <Chip size="small" variant="outlined" label={`heurísticas ${activeEntry.heuristics.length}`} />
                                      <Chip size="small" variant="outlined" label={`exemplos ${activeEntry.examples.length}`} />
                                    </Stack>
                                  </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Paper variant="outlined" sx={{ p: 1.4, borderRadius: 2.25, height: '100%' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                      Definição-base
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>
                                      {activeEntry.definition}
                                    </Typography>
                                  </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Paper variant="outlined" sx={{ p: 1.4, borderRadius: 2.25, height: '100%' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                      Quando usar
                                    </Typography>
                                    <Stack direction="row" gap={1} flexWrap="wrap" mt={0.75}>
                                      {activeEntry.when_to_use.length ? activeEntry.when_to_use.map((item) => (
                                        <Chip key={`${activeEntry.id}-use-browser-${item}`} size="small" variant="outlined" label={item} />
                                      )) : <Chip size="small" variant="outlined" label="aguardando conteúdo" />}
                                    </Stack>
                                  </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Paper variant="outlined" sx={{ p: 1.4, borderRadius: 2.25, height: '100%' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                      Quando evitar
                                    </Typography>
                                    <Stack direction="row" gap={1} flexWrap="wrap" mt={0.75}>
                                      {activeEntry.when_to_avoid.length ? activeEntry.when_to_avoid.map((item) => (
                                        <Chip key={`${activeEntry.id}-avoid-browser-${item}`} size="small" variant="outlined" label={item} />
                                      )) : <Chip size="small" variant="outlined" label="aguardando conteúdo" />}
                                    </Stack>
                                  </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Paper variant="outlined" sx={{ p: 1.4, borderRadius: 2.25, height: '100%' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                      Heurísticas e crítica
                                    </Typography>
                                    <Stack direction="row" gap={1} flexWrap="wrap" mt={0.75}>
                                      {activeEntry.heuristics.length ? activeEntry.heuristics.map((item) => (
                                        <Chip key={`${activeEntry.id}-heur-browser-${item}`} size="small" variant="outlined" label={item} />
                                      )) : <Chip size="small" variant="outlined" label="heurísticas pendentes" />}
                                      {activeEntry.critique_checks.length ? activeEntry.critique_checks.map((item) => (
                                        <Chip key={`${activeEntry.id}-crit-browser-${item}`} size="small" color="warning" variant="outlined" label={item} />
                                      )) : null}
                                    </Stack>
                                  </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Paper variant="outlined" sx={{ p: 1.4, borderRadius: 2.25, height: '100%' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                      Exemplos e repertório
                                    </Typography>
                                    <Stack direction="row" gap={1} flexWrap="wrap" mt={0.75}>
                                      {activeEntry.examples.length ? activeEntry.examples.map((item) => (
                                        <Chip key={`${activeEntry.id}-ex-browser-${item}`} size="small" variant="outlined" label={item} />
                                      )) : <Chip size="small" variant="outlined" label="exemplos pendentes" />}
                                    </Stack>
                                  </Paper>
                                </Grid>
                              </Grid>
                            </Paper>
                          ) : (
                            <EmptySection
                              title="Selecione um tópico para ver o contêiner teórico."
                              description="Escolha um canon, depois um módulo, e por fim o tópico que você quer estudar ou alimentar."
                            />
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                  ) : (
                    <EmptySection
                      title="Nenhum tópico encontrado nessa busca."
                      description="Tente buscar por um movimento, conceito ou formato para localizar onde ele está dentro dos canons da Edro."
                    />
                  )}
                  <Box sx={{ display: 'none' }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.75,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(15, 23, 42, 0.02)',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Mapa da disciplina
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Esta é a lista grande de tópicos que a Edro quer dominar. Cada item abaixo é um contêiner teórico no banco, pronto para receber definição, histórico, heurísticas, aplicação, crítica e exemplos.
                    </Typography>
                    <Stack spacing={1.5} mt={1.5}>
                      {filteredCanonGroups.map((group) => {
                        if (group.canonModules?.length) {
                          return (
                            <Box key={`${group.key}-map`}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                {group.title} • {group.canon?.total_entries ?? group.canonModules.reduce((sum, module) => sum + module.entries.length, 0)} tópicos
                              </Typography>
                              <Stack spacing={1} mt={0.85}>
                                {group.canonModules.map((module) => (
                                  <Paper
                                    key={`${group.key}-${module.key}-map`}
                                    variant="outlined"
                                    sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(15, 23, 42, 0.02)' }}
                                  >
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {module.title} • {module.entries.length}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                      {module.description}
                                    </Typography>
                                    <Stack direction="row" gap={1} flexWrap="wrap" mt={0.85}>
                                      {module.entries.map((entry) => (
                                        <Chip key={`${module.key}-${entry.slug}`} size="small" variant="outlined" label={entry.title} />
                                      ))}
                                    </Stack>
                                  </Paper>
                                ))}
                              </Stack>
                            </Box>
                          );
                        }

                        const topicLabels = group.concepts.map((concept) => concept.title);
                        if (!topicLabels.length) return null;

                        return (
                          <Box key={`${group.key}-map`}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                              {group.title} • {topicLabels.length} tópicos
                            </Typography>
                            <Stack direction="row" gap={1} flexWrap="wrap" mt={0.75}>
                              {topicLabels.map((label) => (
                                <Chip key={`${group.key}-${label}`} size="small" variant="outlined" label={label} />
                              ))}
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Paper>
                  {filteredCanonGroups.map((group) => (
                    <Paper key={group.key} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                      <Stack direction="row" justifyContent="space-between" gap={2} mb={1}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{group.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{group.description}</Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={
                            group.canon
                              ? `${group.canon.entries.length}/${group.canon.total_entries} visíveis • ${group.canon.active_entries} ativos`
                              : `${group.concepts.length} conceitos`
                          }
                          color={(group.canon?.active_entries ?? group.concepts.length) > 0 ? 'primary' : 'default'}
                          variant={(group.canon?.active_entries ?? group.concepts.length) > 0 ? 'filled' : 'outlined'}
                        />
                      </Stack>

                      <Stack direction="row" gap={1} flexWrap="wrap" mb={group.concepts.length ? 1.25 : 0}>
                        {group.coverage.map((item) => (
                          <Chip key={item} size="small" variant="outlined" label={item} />
                        ))}
                      </Stack>

                      {group.canonModules?.length ? (
                        <Stack spacing={1}>
                          {group.canonModules.map((module) => (
                            <Paper
                              key={`${group.key}-${module.key}`}
                              variant="outlined"
                              sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(15, 23, 42, 0.02)' }}
                            >
                              <Stack direction="row" justifyContent="space-between" gap={2} mb={1.1}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                    {module.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                                    {module.description}
                                  </Typography>
                                </Box>
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`${module.entries.length} tópicos`}
                                />
                              </Stack>

                              <Stack spacing={1}>
                                {module.entries.map((entry) => {
                                  const containerStatus = getCanonEntryContainerStatus(entry);
                                  return (
                                    <Paper key={entry.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                                      <Stack direction="row" justifyContent="space-between" gap={2} mb={0.9}>
                                        <Box>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{entry.title}</Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            contêiner teórico do canon • {entry.slug}
                                          </Typography>
                                        </Box>
                                        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
                                          <Chip
                                            size="small"
                                            color={containerStatus.color}
                                            variant="outlined"
                                            label={containerStatus.label}
                                          />
                                          <Chip
                                            size="small"
                                            color={entry.status === 'active' ? 'success' : entry.status === 'draft' ? 'warning' : 'default'}
                                            variant="outlined"
                                            label={entry.status}
                                          />
                                        </Stack>
                                      </Stack>

                                      <Typography variant="body2" color="text.secondary">
                                        {entry.summary_medium || entry.summary_short || entry.definition}
                                      </Typography>

                                      <Paper
                                        variant="outlined"
                                        sx={{
                                          p: 1.25,
                                          borderRadius: 2,
                                          mt: 1.25,
                                          bgcolor: 'rgba(15, 23, 42, 0.02)',
                                        }}
                                      >
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                          Como esse tópico alimenta o Jarvis
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                          {containerStatus.helper}
                                        </Typography>
                                        <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                                          <Chip size="small" variant="outlined" label={`chunks ${entry.chunk_count}`} />
                                          <Chip size="small" variant="outlined" label={`fontes ${entry.source_count}`} />
                                          <Chip size="small" variant="outlined" label={`heurísticas ${entry.heuristics.length}`} />
                                          <Chip size="small" variant="outlined" label={`exemplos ${entry.examples.length}`} />
                                        </Stack>
                                      </Paper>

                                      <Stack spacing={1} mt={1.25}>
                                        <Box>
                                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                            Definição-base
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                                            {entry.definition}
                                          </Typography>
                                        </Box>

                                        <Box>
                                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                            Quando usar
                                          </Typography>
                                          <Stack direction="row" gap={1} flexWrap="wrap" mt={0.55}>
                                            {entry.when_to_use.length ? entry.when_to_use.map((item) => (
                                              <Chip key={`${entry.id}-use-${item}`} size="small" variant="outlined" label={item} />
                                            )) : <Chip size="small" variant="outlined" label="aguardando conteúdo" />}
                                          </Stack>
                                        </Box>

                                        <Box>
                                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                            Quando evitar
                                          </Typography>
                                          <Stack direction="row" gap={1} flexWrap="wrap" mt={0.55}>
                                            {entry.when_to_avoid.length ? entry.when_to_avoid.map((item) => (
                                              <Chip key={`${entry.id}-avoid-${item}`} size="small" variant="outlined" label={item} />
                                            )) : <Chip size="small" variant="outlined" label="aguardando conteúdo" />}
                                          </Stack>
                                        </Box>

                                        <Box>
                                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                            Heurísticas e crítica
                                          </Typography>
                                          <Stack direction="row" gap={1} flexWrap="wrap" mt={0.55}>
                                            {entry.heuristics.length ? entry.heuristics.slice(0, 4).map((item) => (
                                              <Chip key={`${entry.id}-heur-${item}`} size="small" variant="outlined" label={item} />
                                            )) : <Chip size="small" variant="outlined" label="heurísticas pendentes" />}
                                            {entry.critique_checks.length ? entry.critique_checks.slice(0, 2).map((item) => (
                                              <Chip key={`${entry.id}-crit-${item}`} size="small" color="warning" variant="outlined" label={item} />
                                            )) : null}
                                          </Stack>
                                        </Box>

                                        <Box>
                                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                            Exemplos e repertório
                                          </Typography>
                                          <Stack direction="row" gap={1} flexWrap="wrap" mt={0.55}>
                                            {entry.examples.length ? entry.examples.slice(0, 3).map((item) => (
                                              <Chip key={`${entry.id}-ex-${item}`} size="small" variant="outlined" label={item} />
                                            )) : <Chip size="small" variant="outlined" label="exemplos pendentes" />}
                                          </Stack>
                                        </Box>
                                      </Stack>
                                    </Paper>
                                  );
                                })}
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      ) : group.concepts.length ? (
                        <Stack spacing={1}>
                          {group.concepts.map((concept) => (
                            <Paper key={concept.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                              <Stack direction="row" justifyContent="space-between" gap={2} mb={0.75}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{concept.title}</Typography>
                                <Chip size="small" label={concept.slug} />
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                {concept.definition}
                              </Typography>
                              <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                                {concept.heuristics.slice(0, 3).map((item) => (
                                  <Chip key={item} size="small" variant="outlined" label={item} />
                                ))}
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Grupo já definido no canon da Edro, mas ainda não populado com conceitos no seed atual.
                        </Typography>
                      )}
                    </Paper>
                  ))}
                  {!filteredCanonGroups.length ? (
                    <EmptySection
                      title="Nenhum tópico encontrado nessa busca."
                      description="Tente buscar por um movimento, conceito ou formato para localizar onde ele está dentro dos canons da Edro."
                    />
                  ) : null}
                  </Box>
                </Stack>
              )}
            </SectionCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              sectionId="da-trends"
              title="Trend radar"
              subtitle="Padrões recorrentes detectados nas referências analisadas. Aqui você audita se o bot está derivando sinais coerentes do repertório aceito."
              eyebrow="Tendências"
              tone="#FFAE1F"
            >
              {loading ? (
                <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
              ) : !(data?.trends?.length) ? (
                <EmptySection
                  title="Trend radar ainda vazio."
                  description={
                    (stats?.references.analyzed ?? 0) > 0
                      ? 'Já existem referências analisadas, mas ainda faltam snapshots. Rode Recalcular.'
                      : 'O radar só aparece depois que houver referências analisadas. Primeiro busque referências e depois recalcule.'
                  }
                  action={
                    <Button
                      variant="outlined"
                      startIcon={busy === 'refresh' ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
                      onClick={handleRefresh}
                      disabled={busy !== null}
                    >
                      Recalcular agora
                    </Button>
                  }
                />
              ) : (
                <Stack spacing={1.25}>
                  <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'rgba(255,174,31,0.05)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      O que você faz aqui
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Confere os padrões que emergiram do repertório aceito e verifica se o radar do bot está lendo tendências com coerência.
                    </Typography>
                  </Paper>
                  {(data?.trends ?? []).map((trend) => (
                    <Paper key={trend.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{trend.tag}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {trend.cluster_key}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          color={trend.momentum > 0 ? 'success' : 'default'}
                          label={`score ${Number(trend.trend_score || 0).toFixed(0)}`}
                        />
                      </Stack>
                      <Stack direction="row" gap={1} mt={1.25} flexWrap="wrap">
                        <Chip size="small" label={`momentum ${Number(trend.momentum || 0).toFixed(2)}`} />
                        <Chip size="small" label={`amostra ${trend.sample_size}`} />
                        <Chip size="small" label={`trust ${Number(trend.trust_score || 0).toFixed(2)}`} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </SectionCard>
          </Grid>
        </Grid>

        <SectionCard
          sectionId="da-repertorio"
          title="Repertório visual aceito"
          subtitle="Estas são referências externas que já passaram pela triagem e viraram memória visual reaproveitável da Edro. Aqui você revisa o que o bot já absorveu e calibra a qualidade disso."
          eyebrow="Repertório"
          tone="#13DEB9"
        >
          {loading ? (
            <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
          ) : !(data?.references?.length) ? (
            <EmptySection
              title="Ainda não há referências analisadas."
              description={
                (stats?.references.discovered ?? 0) > 0
                  ? `Existem ${stats?.references.discovered ?? 0} referências descobertas na fila. Falta rodar Recalcular para analisá-las e trazê-las para a memória viva.`
                  : 'O motor ainda não encontrou repertório suficiente. Use Buscar referências para começar a ingestão.'
              }
              action={
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={busy === 'discover' ? <CircularProgress size={14} /> : <IconSparkles size={16} />}
                    onClick={handleDiscover}
                    disabled={busy !== null}
                  >
                    Buscar referências
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={busy === 'refresh' ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
                    onClick={handleRefresh}
                    disabled={busy !== null}
                  >
                    Recalcular
                  </Button>
                </Stack>
              }
            />
          ) : (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'rgba(232,82,25,0.04)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  O que você faz aqui
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Revisa as referências já aceitas, marca o que foi usado ou aprovado no mundo real e sinaliza o que ficou ruim para recalibrar o bot.
                </Typography>
              </Paper>
              <Grid container spacing={2}>
              {analyzedReferences.map((reference) => {
                const preview = previewByReferenceId[reference.id];
                const sourceMeta = getReferenceSourceMeta(preview || {
                  ...reference,
                  curated: false,
                  source_name: null,
                  source_type: null,
                  domain: getDomainLabel(reference.source_url),
                });

                return (
                  <Grid key={reference.id} size={{ xs: 12, xl: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                      <Stack direction="row" justifyContent="space-between" gap={2}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {reference.title}
                          </Typography>
                          <Stack direction="row" gap={1} flexWrap="wrap" mt={0.75}>
                            <Chip size="small" color={sourceMeta.color} variant="outlined" label={sourceMeta.helper} />
                            <Chip size="small" variant="outlined" label={sourceMeta.label} />
                            <Chip size="small" variant="outlined" label={timeAgo(reference.discovered_at)} />
                          </Stack>
                        </Box>
                        <Button
                          size="small"
                          component={Link}
                          href={reference.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          endIcon={<IconArrowUpRight size={14} />}
                        >
                          Ver fonte
                        </Button>
                      </Stack>

                      <ReferenceVisualPreview
                        title={preview?.title || reference.title}
                        imageUrl={preview?.image_url || reference.image_url}
                        excerpt={preview?.preview_excerpt || reference.rationale}
                      />

                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {reference.rationale || reference.creative_direction || reference.visual_intent || 'Sem racional salvo.'}
                      </Typography>

                      <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
                        {(uniqueTags(reference)).map((tag) => (
                          <Chip key={tag} size="small" variant="outlined" label={tag} />
                        ))}
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />

                      <Stack direction="row" gap={1} flexWrap="wrap">
                        <Chip size="small" label={`trend ${Number(reference.trend_score || 0).toFixed(0)}`} />
                        <Chip size="small" label={`confidence ${Number(reference.confidence_score || 0).toFixed(2)}`} />
                        <Button size="small" onClick={() => void sendFeedback(reference.id, 'used')}>Usada</Button>
                        <Button size="small" onClick={() => void sendFeedback(reference.id, 'approved')}>Aprovada</Button>
                        <Button size="small" color="error" onClick={() => void sendFeedback(reference.id, 'rejected')}>Ruim</Button>
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}
              </Grid>
            </Stack>
          )}
        </SectionCard>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              title="Bloco de prompt"
              subtitle="O resumo que o motor envia para geração como memória externa."
              eyebrow="Prompt Runtime"
              tone="#5D87FF"
              action={<IconRoute size={18} color="#5D87FF" />}
            >
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#0f172a', color: '#e2e8f0', overflowX: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}>
                  {data?.memory?.promptBlock || 'Sem bloco gerado ainda. Ele aparece quando o canon já carregou e houver memória de referência ou tendência suficiente.'}
                </pre>
              </Paper>
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              title="Bloco de critique"
              subtitle="Os critérios extras que entram na revisão de direção de arte."
              eyebrow="Critique Runtime"
              tone="#13DEB9"
              action={<IconChecklist size={18} color="#13DEB9" />}
            >
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#111827', color: '#d1fae5', overflowX: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}>
                  {data?.memory?.critiqueBlock || 'Sem bloco crítico gerado ainda. Ele aparece quando o sistema já consegue combinar canon, referências e sinais já aprendidos.'}
                </pre>
              </Paper>
            </SectionCard>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
