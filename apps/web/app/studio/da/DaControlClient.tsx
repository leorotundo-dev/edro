'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
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

type StoredClient = {
  id: string;
  name: string;
  segment?: string | null;
};

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

type FrameworkLayer = {
  key: string;
  title: string;
  description: string;
  prompts: string[];
};

type FrameworkField = {
  key: string;
  label: string;
  description: string;
};

type FrameworkAxis = {
  key: string;
  label: string;
  question: string;
};

type FrameworkOperatingLayer = {
  key: string;
  title: string;
  question: string;
  output: string;
};

type FrameworkCriterion = {
  key: string;
  label: string;
  description: string;
  weight: number;
};

type FrameworkRepertoireMapping = {
  key: string;
  problem: string;
  dominantRepertoires: string[];
  desiredEffect: string;
  principalRisk: string;
  bestFor: string[];
};

type FrameworkStackLayer = {
  key: string;
  title: string;
  role: string;
  sources: string[];
  output: string;
};

type FrameworkModule = {
  key: string;
  title: string;
  function: string;
  coreQuestion: string;
  dominantRepertoires: string[];
  successCriteria: string[];
  antipatterns: string[];
};

type FrameworkArtifact = {
  key: string;
  title: string;
  purpose: string;
  steps: string[];
};

type ArtDirectionFramework = {
  title: string;
  thesis: string;
  operatorRole: string;
  directionFormula: string;
  layers: FrameworkLayer[];
  commandments: string[];
  briefingSchema: FrameworkField[];
  critiqueAxes: FrameworkAxis[];
  workflowPhases: Array<{ key: string; title: string; description: string }>;
  operatingSystem: FrameworkOperatingLayer[];
  resultCriteria: FrameworkCriterion[];
  repertoireMatrix: FrameworkRepertoireMapping[];
  intelligenceStack: FrameworkStackLayer[];
  specializedModules: FrameworkModule[];
  operationalArtifacts: FrameworkArtifact[];
};

type CanonEntry = {
  id: string;
  canon_id: string;
  canon_slug: string;
  canon_title: string;
  slug: string;
  title: string;
  summary_short: string | null;
  definition: string;
  heuristics: string[];
  critique_checks: string[];
  examples: string[];
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
  framework?: ArtDirectionFramework;
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

const PLATFORM_OPTIONS = ['Instagram', 'LinkedIn', 'Facebook', 'TikTok', 'YouTube', 'WhatsApp', 'General'];
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
        p: 2.5,
        borderRadius: 2.5,
        bgcolor: 'rgba(15, 23, 42, 0.02)',
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
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
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: `${color}18`,
              color,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {icon}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
        </Stack>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
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
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} mb={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
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

function createReferenceDraft(reference: ManagedReference): ReferenceDraft {
  return {
    title: reference.title || '',
    source_url: reference.source_url || '',
    platform: reference.platform || '',
    format: reference.format || '',
    segment: reference.segment || '',
    visual_intent: reference.visual_intent || '',
    creative_direction: reference.creative_direction || '',
    rationale: reference.rationale || '',
    status: reference.status,
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
  const [error, setError] = useState<string>('');
  const [warning, setWarning] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [platform, setPlatform] = useState<string>('Instagram');
  const [segment, setSegment] = useState<string>('');
  const [category, setCategory] = useState<string>('social media');
  const [mood, setMood] = useState<string>('');
  const [data, setData] = useState<MemoryResponse | null>(null);
  const [editingReferenceId, setEditingReferenceId] = useState<string | null>(null);
  const [referenceDrafts, setReferenceDrafts] = useState<Record<string, ReferenceDraft>>({});
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
  const [creatingSource, setCreatingSource] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams?.get('clientId') || '';
    if (fromQuery) {
      setClientId(fromQuery);
      return;
    }
    try {
      const selected = JSON.parse(window.localStorage.getItem('edro_selected_clients') || '[]') as StoredClient[];
      const activeId = window.localStorage.getItem('edro_active_client_id') || '';
      const found = selected.find((client) => client.id === activeId) || selected[0] || null;
      if (found?.id) setClientId(found.id);
      if (found?.segment) {
        setSegment(found.segment);
        setCategory(found.segment);
      }
    } catch {
      // ignore
    }
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
        platform,
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
        platform,
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
          platform,
          segment,
        },
      });
      setSuccess(`Feedback registrado: ${eventType}.`);
    } catch (err: any) {
      setError(err?.message || 'Falha ao registrar feedback');
    }
  };

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

  const beginEditReference = useCallback((reference: ManagedReference) => {
    setEditingReferenceId(reference.id);
    setReferenceDrafts((current) => ({
      ...current,
      [reference.id]: current[reference.id] || createReferenceDraft(reference),
    }));
  }, []);

  const saveReferenceDraft = useCallback(async (referenceId: string) => {
    const draft = referenceDrafts[referenceId];
    if (!draft) return;
    setSavingReferenceId(referenceId);
    setError('');
    setSuccess('');
    try {
      await patchJson<{ success: boolean; reference: ManagedReference }>(`/studio/creative/da-memory/references/${referenceId}`, {
        title: toOptionalString(draft.title),
        source_url: toOptionalString(draft.source_url),
        platform: toOptionalString(draft.platform) ?? null,
        format: toOptionalString(draft.format) ?? null,
        segment: toOptionalString(draft.segment) ?? null,
        visual_intent: toOptionalString(draft.visual_intent) ?? null,
        creative_direction: toOptionalString(draft.creative_direction) ?? null,
        rationale: toOptionalString(draft.rationale) ?? null,
        status: draft.status,
      });
      setSuccess('Referência atualizada.');
      setEditingReferenceId(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar referência');
    } finally {
      setSavingReferenceId(null);
    }
  }, [load, patchJson, referenceDrafts]);

  const quickUpdateReferenceStatus = useCallback(async (referenceId: string, status: ManagedReference['status']) => {
    setSavingReferenceId(referenceId);
    setError('');
    setSuccess('');
    try {
      await patchJson<{ success: boolean; reference: ManagedReference }>(`/studio/creative/da-memory/references/${referenceId}`, {
        status,
      });
      setSuccess(`Referência movida para ${status}.`);
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
  const sources = data?.sources ?? [];
  const canons = data?.canons ?? [];
  const activeSources = useMemo(() => sources.filter((source) => source.enabled).length, [sources]);
  const canonGroups = useMemo(
    () =>
      CANON_GROUPS.map((group) => ({
        ...group,
        canon: canons.find((canon) => canon.slug === group.key) ?? null,
        concepts: (data?.concepts ?? []).filter((concept) =>
          group.key === 'formatos_aplicacoes'
            ? concept.category === 'formatos_aplicacoes' || concept.category === 'formatos_midias'
            : concept.category === group.key,
        ),
      })),
    [canons, data?.concepts],
  );

  const nextStep = useMemo(() => {
    if (!stats) return 'Carregando status do pipeline.';
    if ((canons.length === 0) && (data?.concepts?.length ?? 0) === 0) {
      return 'O canon ainda não carregou para este recorte. Recarregue a tela; se continuar zerado, ainda há problema de setup.';
    }
    if (stats.references.discovered === 0 && stats.references.analyzed === 0) {
      return 'Próximo passo: buscar referências para enfileirar repertório visual neste recorte.';
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
    <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" sx={{ color: '#E85219', fontWeight: 800, letterSpacing: '0.08em' }}>
            Motor de DA
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.04em', mt: 0.5 }}>
            Direção de Arte Intelligence
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 860 }}>
            Painel de governança do cérebro de direção de arte da Edro. Aqui você controla o canon, aciona a
            descoberta web, acompanha as tendências e alimenta o sistema com feedback humano.
          </Typography>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {warning ? <Alert severity="warning">{warning}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <ScoreCard
              title="Canon ativo"
              value={canons.length ? canons.reduce((sum, canon) => sum + canon.active_entries, 0) : data?.concepts?.length ?? 0}
              subtitle={
                canons.length
                  ? `${canons.length} canons da Edro estruturados`
                  : 'conceitos-base do DA da Edro'
              }
              icon={<IconBrain size={20} />}
              color="#5D87FF"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <ScoreCard
              title="Memória de referência"
              value={stats?.references?.analyzed ?? data?.references?.length ?? 0}
              subtitle={
                stats
                  ? `${stats.references.discovered} na fila • ${stats.references.rejected} descartadas`
                  : 'casos visuais analisados e prontos para uso'
              }
              icon={<IconEyeSearch size={20} />}
              color="#13DEB9"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <ScoreCard
              title="Trend radar"
              value={stats?.trends?.snapshots ?? data?.trends?.length ?? 0}
              subtitle={
                topTrend
                  ? `principal sinal: ${topTrend.tag}`
                  : stats?.references?.analyzed
                  ? 'aguardando snapshots no recorte'
                  : 'nenhum snapshot no recorte'
              }
              icon={<IconFlame size={20} />}
              color="#FFAE1F"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <ScoreCard
              title="Fontes ativas"
              value={activeSources}
              subtitle={sources.length ? `${sources.length} fontes cadastradas na Edro` : 'cadastre sites de referência da Edro'}
              icon={<IconTargetArrow size={20} />}
              color="#FA896B"
            />
          </Grid>
        </Grid>

        <SectionCard
          title="Curadoria de referências"
          subtitle="Aqui você revisa a fila descoberta, reclassifica descartes e limpa a memória antes da análise final."
        >
          {loading ? (
            <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
          ) : (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={2}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Fila descoberta
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Referências capturadas que ainda não passaram pela análise final.
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
                      const draft = referenceDrafts[reference.id] || createReferenceDraft(reference);
                      const isEditing = editingReferenceId === reference.id;
                      const isSaving = savingReferenceId === reference.id;

                      return (
                        <Grid key={reference.id} size={{ xs: 12, xl: 6 }}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                            <Stack direction="row" justifyContent="space-between" gap={2} mb={1}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                  {reference.title || 'Sem título'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {reference.source_name || reference.domain || 'fonte não classificada'}
                                  {reference.search_query ? ` • ${reference.search_query}` : ''}
                                  {' • '}
                                  {timeAgo(reference.discovered_at)}
                                </Typography>
                              </Box>
                              <Stack direction="row" gap={1} flexWrap="wrap">
                                <Chip size="small" color="warning" label={reference.status} />
                                <Button
                                  size="small"
                                  component={Link}
                                  href={reference.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  endIcon={<IconArrowUpRight size={14} />}
                                >
                                  Abrir
                                </Button>
                              </Stack>
                            </Stack>

                            {isEditing ? (
                              <Stack spacing={1.5}>
                                {renderReferenceDraftFields({
                                  draft,
                                  compact: true,
                                  onChange: (patch) =>
                                    setReferenceDrafts((current) => ({
                                      ...current,
                                      [reference.id]: {
                                        ...(current[reference.id] || createReferenceDraft(reference)),
                                        ...patch,
                                      },
                                    })),
                                })}
                                <Stack direction="row" gap={1} flexWrap="wrap">
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => void saveReferenceDraft(reference.id)}
                                    disabled={isSaving}
                                  >
                                    {isSaving ? 'Salvando...' : 'Salvar'}
                                  </Button>
                                  <Button variant="outlined" size="small" onClick={() => setEditingReferenceId(null)} disabled={isSaving}>
                                    Cancelar
                                  </Button>
                                </Stack>
                              </Stack>
                            ) : (
                              <>
                                <Typography variant="body2" color="text.secondary">
                                  {reference.snippet || reference.rationale || 'Sem snippet salvo nesta descoberta.'}
                                </Typography>
                                <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
                                  <Chip size="small" label={reference.platform || 'geral'} />
                                  {reference.segment ? <Chip size="small" variant="outlined" label={reference.segment} /> : null}
                                  {reference.visual_intent ? <Chip size="small" variant="outlined" label={reference.visual_intent} /> : null}
                                </Stack>
                                <Divider sx={{ my: 1.5 }} />
                                <Stack direction="row" gap={1} flexWrap="wrap">
                                  <Button size="small" variant="outlined" onClick={() => beginEditReference(reference)}>
                                    Editar
                                  </Button>
                                  <Button size="small" onClick={() => void quickUpdateReferenceStatus(reference.id, 'analyzed')} disabled={isSaving}>
                                    Marcar analisada
                                  </Button>
                                  <Button size="small" color="error" onClick={() => void quickUpdateReferenceStatus(reference.id, 'rejected')} disabled={isSaving}>
                                    Rejeitar
                                  </Button>
                                </Stack>
                              </>
                            )}
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
          title="Controle do motor"
          subtitle="O cérebro é da Edro. Cliente, plataforma e segmento servem só como recorte de aplicação e pesquisa."
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
                fullWidth
                label="Cliente opcional"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="id do cliente para recorte"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Plataforma"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {PLATFORM_OPTIONS.map((item) => (
                  <MenuItem key={item} value={item}>{item}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Segmento"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="varejo, saúde, industrial..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Categoria de busca"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="social media, retail, editorial..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Mood opcional"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="premium, clean, bold, documentary..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
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
                  O motor parte do canon da Edro e aplica o recorte em cima disso:
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                  <Chip size="small" label="Canon Edro" />
                  <Chip size="small" label="Estética do Cliente" />
                  <Chip size="small" label="Reference Memory" />
                  <Chip size="small" label="Trend Memory" />
                  <Chip size="small" label="Feedback Loop" />
                </Stack>
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

        <SectionCard
          sectionId="da-framework"
          title="Manual canônico de pilotagem do DA-IA"
          subtitle="Esta é a doutrina operacional do motor: o micro método de pilotagem do DA-IA, o Edro OS visual, a matriz de repertório, o stack híbrido e os módulos especializados."
          eyebrow="Framework"
          tone="#5D87FF"
          action={<IconBrain size={18} color="#5D87FF" />}
        >
          {data?.framework ? (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(93,135,255,0.04)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Tese central
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>
                  {data.framework.thesis}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1.25, fontWeight: 700 }}>
                  {data.framework.operatorRole}
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
                  <Chip size="small" color="primary" label={data.framework.directionFormula} />
                  {data.framework.commandments.map((item) => (
                    <Chip key={item} size="small" variant="outlined" label={item} />
                  ))}
                </Stack>
              </Paper>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, lg: 5 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      7 camadas de pilotagem
                    </Typography>
                    <Stack spacing={1.25} mt={1.25}>
                      {data.framework.layers.map((layer) => (
                        <Paper key={layer.key} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {layer.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                            {layer.description}
                          </Typography>
                          <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                            {layer.prompts.map((prompt) => (
                              <Chip key={prompt} size="small" variant="outlined" label={prompt} />
                            ))}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, lg: 7 }}>
                  <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Briefing obrigatório do DA-IA
                      </Typography>
                      <Stack spacing={1} mt={1.25}>
                        {data.framework.briefingSchema.map((field) => (
                          <Box key={field.key}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {field.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {field.description}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Critérios fixos de revisão
                      </Typography>
                      <Stack direction="row" gap={1} flexWrap="wrap" mt={1.25}>
                        {data.framework.critiqueAxes.map((axis) => (
                          <Chip key={axis.key} size="small" color="warning" variant="outlined" label={`${axis.label}: ${axis.question}`} />
                        ))}
                      </Stack>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Fases operacionais
                      </Typography>
                      <Stack spacing={1} mt={1.25}>
                        {data.framework.workflowPhases.map((phase) => (
                          <Box key={phase.key}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {phase.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {phase.description}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  </Stack>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Edro OS visual
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>
                      A macro sequência que transforma problema real em campanha viva. Aqui o DA deixa de ser executor e passa a operar junto da estratégia.
                    </Typography>
                    <Stack spacing={1.25} mt={1.25}>
                      {data.framework.operatingSystem.map((layer) => (
                        <Paper key={layer.key} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {layer.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                            {layer.question}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.8, fontWeight: 700 }}>
                            Saída: {layer.output}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Régua de resultado incrível
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>
                      Esta é a pontuação estrutural que substitui gosto solto por critério. O peso ajuda a calibrar o que mais importa quando a equipe julga uma direção.
                    </Typography>
                    <Stack spacing={1.1} mt={1.25}>
                      {data.framework.resultCriteria.map((criterion) => (
                        <Paper key={criterion.key} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                          <Stack direction="row" justifyContent="space-between" gap={2}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {criterion.label}
                            </Typography>
                            <Chip size="small" color="warning" variant="outlined" label={`${criterion.weight}%`} />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>
                            {criterion.description}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Matriz problema x repertório
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>
                  O DA da Edro não escolhe referência pelo gosto. Ele escolhe repertório pela função que precisa resolver e pelo risco de leitura que precisa evitar.
                </Typography>
                <Grid container spacing={1.5} mt={0.25}>
                  {data.framework.repertoireMatrix.map((entry) => (
                    <Grid key={entry.key} size={{ xs: 12, xl: 6 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, height: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" gap={1.5} alignItems="flex-start">
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {entry.problem}
                          </Typography>
                          <Chip size="small" color="primary" variant="outlined" label={entry.bestFor[0] || 'uso amplo'} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                          {entry.desiredEffect}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary', fontWeight: 700 }}>
                          Repertório dominante
                        </Typography>
                        <Stack direction="row" gap={1} flexWrap="wrap" mt={0.5}>
                          {entry.dominantRepertoires.map((item) => (
                            <Chip key={`${entry.key}-${item}`} size="small" variant="outlined" label={item} />
                          ))}
                        </Stack>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1.1, color: 'text.secondary', fontWeight: 700 }}>
                          Melhor para
                        </Typography>
                        <Stack direction="row" gap={1} flexWrap="wrap" mt={0.5}>
                          {entry.bestFor.map((item) => (
                            <Chip key={`${entry.key}-best-${item}`} size="small" color="success" variant="outlined" label={item} />
                          ))}
                        </Stack>
                        <Paper variant="outlined" sx={{ p: 1.1, borderRadius: 2, mt: 1.2, bgcolor: 'rgba(255,174,31,0.06)' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                            Risco principal
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                            {entry.principalRisk}
                          </Typography>
                        </Paper>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Stack híbrido de repertório
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>
                      A arquitetura certa para a Edro não é um banco monstruoso. É um stack que cruza excelência, sinais vivos e memória curta com filtro crítico.
                    </Typography>
                    <Stack spacing={1.25} mt={1.25}>
                      {data.framework.intelligenceStack.map((layer) => (
                        <Paper key={layer.key} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {layer.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                            {layer.role}
                          </Typography>
                          <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                            {layer.sources.map((source) => (
                              <Chip key={`${layer.key}-${source}`} size="small" variant="outlined" label={source} />
                            ))}
                          </Stack>
                          <Typography variant="body2" sx={{ mt: 0.9, fontWeight: 700 }}>
                            Output: {layer.output}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Artefatos operacionais
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>
                      Estes são os artefatos mínimos para a operação parar de depender de feeling e começar a rodar como sistema.
                    </Typography>
                    <Stack spacing={1.25} mt={1.25}>
                      {data.framework.operationalArtifacts.map((artifact) => (
                        <Paper key={artifact.key} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {artifact.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                            {artifact.purpose}
                          </Typography>
                          <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                            {artifact.steps.map((step) => (
                              <Chip key={`${artifact.key}-${step}`} size="small" color="primary" variant="outlined" label={step} />
                            ))}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Módulos especializados
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>
                  O método-mãe não muda, mas a régua muda por função. Cada tipo de entrega precisa de uma lógica própria para o DA-IA deixar de operar em modo genérico.
                </Typography>
                <Grid container spacing={1.5} mt={0.25}>
                  {data.framework.specializedModules.map((module) => (
                    <Grid key={module.key} size={{ xs: 12, xl: 6 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, height: '100%' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {module.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.55 }}>
                          {module.function}
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1.1, borderRadius: 2, mt: 1.1, bgcolor: 'rgba(93,135,255,0.05)' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                            Pergunta-mãe
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.35, fontWeight: 700 }}>
                            {module.coreQuestion}
                          </Typography>
                        </Paper>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1.1, color: 'text.secondary', fontWeight: 700 }}>
                          Repertório dominante
                        </Typography>
                        <Stack direction="row" gap={1} flexWrap="wrap" mt={0.5}>
                          {module.dominantRepertoires.map((item) => (
                            <Chip key={`${module.key}-rep-${item}`} size="small" variant="outlined" label={item} />
                          ))}
                        </Stack>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1.1, color: 'text.secondary', fontWeight: 700 }}>
                          Critérios de sucesso
                        </Typography>
                        <Stack direction="row" gap={1} flexWrap="wrap" mt={0.5}>
                          {module.successCriteria.map((item) => (
                            <Chip key={`${module.key}-ok-${item}`} size="small" color="success" variant="outlined" label={item} />
                          ))}
                        </Stack>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1.1, color: 'text.secondary', fontWeight: 700 }}>
                          Antipadrões
                        </Typography>
                        <Stack direction="row" gap={1} flexWrap="wrap" mt={0.5}>
                          {module.antipatterns.map((item) => (
                            <Chip key={`${module.key}-bad-${item}`} size="small" color="error" variant="outlined" label={item} />
                          ))}
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Stack>
          ) : (
            <EmptySection
              title="Framework canônico indisponível."
              description="O manual operacional do DA-IA deveria vir do backend em todas as cargas do painel."
            />
          )}
        </SectionCard>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              title="Área de canons"
              subtitle="Os canons da Edro ficam separados por pilares. Cada grupo organiza um pedaço do repertório-base do DA."
            >
              {loading ? (
                <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
              ) : !(canons.length || data?.concepts?.length) ? (
                <EmptySection
                  title="Nenhum conceito retornou para este recorte."
                  description="O canon base deveria aparecer automaticamente. Se isso continuar zerado após o refresh, ainda há problema de provisionamento ou filtro agressivo demais."
                />
              ) : (
                <Stack spacing={1.5}>
                  {canonGroups.map((group) => (
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
                              ? `${group.canon.active_entries} ativos • ${group.canon.draft_entries} draft`
                              : `${group.concepts.length} conceitos`
                          }
                        />
                      </Stack>

                      <Stack direction="row" gap={1} flexWrap="wrap" mb={group.concepts.length ? 1.25 : 0}>
                        {group.coverage.map((item) => (
                          <Chip key={item} size="small" variant="outlined" label={item} />
                        ))}
                      </Stack>

                      {group.canon?.entries?.length ? (
                        <Stack spacing={1}>
                          {group.canon.entries.map((entry) => (
                            <Paper key={entry.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                              <Stack direction="row" justifyContent="space-between" gap={2} mb={0.75}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{entry.title}</Typography>
                                <Stack direction="row" gap={1} flexWrap="wrap">
                                  <Chip size="small" label={entry.slug} />
                                  <Chip
                                    size="small"
                                    color={entry.status === 'active' ? 'success' : entry.status === 'draft' ? 'warning' : 'default'}
                                    variant="outlined"
                                    label={entry.status}
                                  />
                                </Stack>
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                {entry.definition}
                              </Typography>
                              <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                                {entry.heuristics.slice(0, 3).map((item) => (
                                  <Chip key={item} size="small" variant="outlined" label={item} />
                                ))}
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
                </Stack>
              )}
            </SectionCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              title="Trend radar"
              subtitle="Padrões recorrentes detectados nas referências analisadas."
            >
              {loading ? (
                <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
              ) : !(data?.trends?.length) ? (
                <EmptySection
                  title="Trend radar ainda vazio."
                  description={
                    (stats?.references.analyzed ?? 0) > 0
                      ? 'Já existem referências analisadas, mas ainda faltam snapshots para este recorte. Rode Recalcular.'
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
                  {(data?.trends ?? []).map((trend) => (
                    <Paper key={trend.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{trend.tag}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {trend.cluster_key} {trend.platform ? `• ${trend.platform}` : ''} {trend.segment ? `• ${trend.segment}` : ''}
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
          title="Repertório analisado"
          subtitle="Referências já capturadas e analisadas que o motor usa como repertório vivo."
        >
          {loading ? (
            <Stack alignItems="center" py={6}><CircularProgress size={28} /></Stack>
          ) : !(data?.references?.length) ? (
            <EmptySection
              title="Ainda não há referências analisadas neste recorte."
              description={
                (stats?.references.discovered ?? 0) > 0
                  ? `Existem ${stats?.references.discovered ?? 0} referências descobertas na fila. Falta rodar Recalcular para analisá-las e trazê-las para a memória viva.`
                  : 'O motor ainda não encontrou repertório para este cliente/plataforma. Use Buscar referências para começar a ingestão.'
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
            <Grid container spacing={2}>
              {(data?.references ?? []).map((reference) => (
                <Grid key={reference.id} size={{ xs: 12, xl: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" gap={2}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {reference.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {reference.platform || 'geral'}{reference.format ? ` • ${reference.format}` : ''}{reference.segment ? ` • ${reference.segment}` : ''} • {timeAgo(reference.discovered_at)}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        component={Link}
                        href={reference.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<IconArrowUpRight size={14} />}
                      >
                        Abrir
                      </Button>
                    </Stack>

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
              ))}
            </Grid>
          )}
        </SectionCard>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              title="Bloco de prompt"
              subtitle="O resumo que o motor envia para geração como memória externa."
              action={<IconRoute size={18} color="#5D87FF" />}
            >
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#0f172a', color: '#e2e8f0', overflowX: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}>
                  {data?.memory?.promptBlock || 'Sem bloco gerado ainda. Ele aparece quando o canon já carregou e houver memória de referência ou tendência suficiente para este recorte.'}
                </pre>
              </Paper>
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard
              title="Bloco de critique"
              subtitle="Os critérios extras que entram na revisão de direção de arte."
              action={<IconChecklist size={18} color="#13DEB9" />}
            >
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#111827', color: '#d1fae5', overflowX: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}>
                  {data?.memory?.critiqueBlock || 'Sem bloco crítico gerado ainda. Ele aparece quando o sistema já consegue combinar canon, referências e sinais do recorte atual.'}
                </pre>
              </Paper>
            </SectionCard>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
