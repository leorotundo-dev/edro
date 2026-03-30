'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useConfirm } from '@/hooks/useConfirm';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import {
  IconPlus,
  IconChartBar,
  IconLock,
  IconLockOpen,
  IconRefresh,
  IconTrash,
  IconX,
  IconTarget,
  IconCoin,
  IconCalendar,
  IconBrain,
  IconTrendingUp,
  IconCheck,
  IconSparkles,
  IconArrowLeft,
  IconArrowRight,
  IconExternalLink,
  IconStarFilled,
  IconFlag,
  IconBulb,
  IconFileText,
  IconBrandInstagram,
  IconLink,
  IconLinkOff,
  IconUsersGroup,
} from '@tabler/icons-react';
import { apiDelete } from '@/lib/api';
import CampaignCanvasView from '@/app/studio/canvas/components/CampaignCanvasView';

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = {
  id: string;
  name: string;
  order: number;
  objective?: string;
};

type CreativeConcept = {
  id: string;
  campaign_id: string;
  phase_id: string | null;
  name: string;
  insight: string | null;
  triggers: string[];
  example_copy: string | null;
  hero_piece: string | null;
  status: string;
  created_at: string;
};

type LinkedBriefing = {
  id: string;
  title: string;
  status: string;
  campaign_phase_id: string | null;
  behavior_intent_id: string | null;
  created_at: string;
};

type Campaign = {
  id: string;
  client_id: string;
  name: string;
  objective: string;
  budget_brl: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  phases: Phase[];
  audiences: Record<string, any>[];
  behavior_intents: Record<string, any>[];
};

type CampaignFormat = {
  id: string;
  campaign_id: string;
  format_name: string;
  platform: string;
  production_type: string;
  predicted_ml_score: number;
  predicted_measurability_score: number;
  predicted_roi_multiplier: number;
  predicted_success_probability: number;
  predicted_confidence_level: string;
  predicted_time_to_results: string;
  predicted_market_trend: string;
  estimated_production_cost_min_brl: number;
  estimated_production_cost_max_brl: number;
  estimated_media_cost_brl: number | null;
  estimated_hours: number;
  estimated_skill_level: string;
  actual_production_cost_brl: number | null;
  actual_media_cost_brl: number | null;
  actual_hours_spent: number | null;
  produced_at: string | null;
  launched_at: string | null;
  is_locked: boolean;
  locked_at: string | null;
  instagram_post_url: string | null;
  instagram_media_id: string | null;
  last_metrics_synced_at: string | null;
};

type FormatSummary = {
  total_impressions: number;
  total_reach: number;
  total_clicks: number;
  total_engagements: number;
  total_conversions: number;
  total_revenue_brl: number;
  total_spend_brl: number;
  avg_engagement_rate: number | null;
  actual_roi_multiplier: number | null;
  actual_roas: number | null;
  predicted_ml_score: number;
  predicted_roi_multiplier: number;
  score_accuracy: number | null;
  is_finalized: boolean;
};

type FormatRow = {
  format_name: string;
  platform: string;
  production_type: string;
};

type BehavioralCopyResult = {
  id?: string | null;  // persisted row id in campaign_behavioral_copies
  draft: {
    hook_text: string;
    content_text: string;
    cta_text: string;
    media_type: string;
    behavioral_rationale: string;
  };
  audit: {
    approval_status: 'approved' | 'needs_revision' | 'blocked';
    approved_text: string;
    revision_notes: string[];
    fogg_score: { motivation: number; ability: number; prompt: number };
    behavior_tags: { emotional_tone: string; micro_behavior: string; triggers: string[] };
    policy_flags: string[];
  };
  phase?: string;
  persona_used?: string;
};

type BehaviorCluster = {
  cluster_type: 'salvadores' | 'clicadores' | 'leitores_silenciosos' | 'convertidos';
  cluster_label: string;
  avg_save_rate: number;
  avg_click_rate: number;
  avg_like_rate: number;
  avg_engagement_rate: number;
  preferred_format: string | null;
  preferred_amd: string | null;
  preferred_triggers: string[];
  sample_size: number;
  confidence_score: number;
  top_formats: Array<{ format_id: string; format_name: string; platform: string; rate: number; metric: string }>;
};

type LearningRule = {
  rule_name: string;
  segment_definition: Record<string, any>;
  effective_pattern: string;
  uplift_metric: string;
  uplift_value: number;
  confidence_score: number;
  sample_size: number;
  is_active: boolean;
};

type RecoFormat = {
  format_id?: string;
  format_name: string;
  platform: string;
  production_type: string;
  recommendation_score: number;
  recommendation_reasons?: string[];
  estimated_hours_total?: number;
};

type RecoCase = {
  title: string;
  snippet: string | null;
  url: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const OBJECTIVES = ['performance', 'branding', 'balanced'];
const STATUSES = ['active', 'paused', 'completed', 'cancelled'];
const PLATFORMS = ['Instagram', 'LinkedIn', 'YouTube', 'TikTok', 'Facebook', 'Google', 'Twitter/X', 'WhatsApp'];

function fmtBrl(v: number | null | undefined): string {
  if (v == null) return '—';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}

function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#2563eb';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

function statusColor(s: string): 'success' | 'warning' | 'default' | 'error' {
  if (s === 'active') return 'success';
  if (s === 'paused') return 'warning';
  if (s === 'cancelled') return 'error';
  return 'default';
}

function objectiveLabel(o: string): string {
  const map: Record<string, string> = { performance: 'Performance', branding: 'Branding', balanced: 'Equilibrado' };
  return map[o] || o;
}

// ── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: scoreColor(pct) }}>{value}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 5, borderRadius: 3,
          bgcolor: 'grey.100',
          '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: scoreColor(pct) },
        }}
      />
    </Box>
  );
}

// ── Format Metrics Dialog ────────────────────────────────────────────────────

function MetricsDialog({
  open,
  format,
  clientId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  format: CampaignFormat | null;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    measurement_date: new Date().toISOString().slice(0, 10),
    impressions: '',
    reach: '',
    clicks: '',
    likes: '',
    comments: '',
    shares: '',
    saves: '',
    conversions: '',
    revenue_brl: '',
    spend_brl: '',
    roas: '',
    data_source: '',
  });

  const set = (k: string, v: string) => setFields((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!format) return;
    setSaving(true);
    try {
      await apiPost(`/campaign-formats/${format.id}/metrics`, {
        measurement_date: fields.measurement_date,
        impressions: fields.impressions ? Number(fields.impressions) : 0,
        reach: fields.reach ? Number(fields.reach) : 0,
        clicks: fields.clicks ? Number(fields.clicks) : 0,
        likes: fields.likes ? Number(fields.likes) : 0,
        comments: fields.comments ? Number(fields.comments) : 0,
        shares: fields.shares ? Number(fields.shares) : 0,
        saves: fields.saves ? Number(fields.saves) : 0,
        conversions: fields.conversions ? Number(fields.conversions) : 0,
        revenue_brl: fields.revenue_brl ? Number(fields.revenue_brl) : null,
        spend_brl: fields.spend_brl ? Number(fields.spend_brl) : null,
        roas: fields.roas ? Number(fields.roas) : null,
        data_source: fields.data_source || null,
      });
      onSuccess();
      onClose();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Registrar Métricas</Typography>
          <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
        </Stack>
        {format && (
          <Typography variant="caption" color="text.secondary">
            {format.format_name} · {format.platform}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Data de medição"
            type="date"
            size="small"
            value={fields.measurement_date}
            onChange={(e) => set('measurement_date', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Grid container spacing={1.5}>
            {[
              { k: 'impressions', label: 'Impressões' },
              { k: 'reach', label: 'Alcance' },
              { k: 'clicks', label: 'Cliques' },
              { k: 'likes', label: 'Curtidas' },
              { k: 'comments', label: 'Comentários' },
              { k: 'shares', label: 'Compartilhamentos' },
              { k: 'saves', label: 'Salvamentos' },
              { k: 'conversions', label: 'Conversões' },
            ].map(({ k, label }) => (
              <Grid size={{ xs: 6 }} key={k}>
                <TextField
                  label={label}
                  size="small"
                  type="number"
                  value={(fields as any)[k]}
                  onChange={(e) => set(k, e.target.value)}
                  fullWidth
                />
              </Grid>
            ))}
          </Grid>
          <Divider />
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 4 }}>
              <TextField label="Receita (R$)" size="small" type="number" value={fields.revenue_brl} onChange={(e) => set('revenue_brl', e.target.value)} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField label="Gasto (R$)" size="small" type="number" value={fields.spend_brl} onChange={(e) => set('spend_brl', e.target.value)} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField label="ROAS" size="small" type="number" value={fields.roas} onChange={(e) => set('roas', e.target.value)} fullWidth />
            </Grid>
          </Grid>
          <TextField
            label="Fonte dos dados"
            size="small"
            placeholder="ex: Meta Ads, Google Analytics"
            value={fields.data_source}
            onChange={(e) => set('data_source', e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
          Salvar métricas
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Campaign Detail Panel ─────────────────────────────────────────────────────

const DEFAULT_PHASES: Phase[] = [
  { id: 'historia', name: 'História', order: 1, objective: 'Awareness e contexto emocional' },
  { id: 'prova', name: 'Prova', order: 2, objective: 'Social proof e evidências' },
  { id: 'convite', name: 'Convite', order: 3, objective: 'CTA e conversão' },
];

const PHASE_COLORS: Record<string, string> = {
  historia: '#6366f1',
  prova: '#0ea5e9',
  convite: '#f59e0b',
};

const AMD_LABELS: Record<string, string> = {
  salvar: 'Salvar',
  compartilhar: 'Compartilhar',
  clicar: 'Clicar',
  responder: 'Responder',
  marcar_alguem: 'Marcar alguém',
  pedir_proposta: 'Pedir proposta',
};

function phaseColor(phaseId: string | null | undefined): string {
  if (!phaseId) return '#94a3b8';
  return PHASE_COLORS[phaseId] || '#6366f1';
}

type AiConceptSuggestion = {
  concept_id: string;
  headline_concept: string;
  emotional_truth: string;
  cultural_angle: string;
  visual_direction: string;
  suggested_structure: string;
  risk_level: 'safe' | 'bold' | 'disruptive';
  rationale: string;
};

const RISK_COLOR: Record<string, string> = { safe: '#22c55e', bold: '#f59e0b', disruptive: '#ef4444' };

function ConceptDialog({
  open,
  campaignId,
  clientId,
  campaignName,
  campaignObjective,
  phases,
  onClose,
  onCreated,
}: {
  open: boolean;
  campaignId: string;
  clientId: string;
  campaignName: string;
  campaignObjective: string;
  phases: Phase[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiConcepts, setAiConcepts] = useState<AiConceptSuggestion[]>([]);
  const [selectedAiIdx, setSelectedAiIdx] = useState<number | null>(null);
  const [form, setForm] = useState({ phase_id: '', name: '', insight: '', triggers: '', example_copy: '', hero_piece: '' });
  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    setGenerating(true);
    setAiError('');
    setAiConcepts([]);
    setSelectedAiIdx(null);
    try {
      const res = await apiPost<{ success: boolean; data?: { concepts: AiConceptSuggestion[] }; error?: string }>(
        '/studio/creative/conceito',
        { briefing: { title: campaignName, objective: campaignObjective }, clientId: clientId || undefined },
      );
      if (res.success && res.data?.concepts?.length) {
        setAiConcepts(res.data.concepts);
      } else {
        setAiError(res.error || 'Nenhum conceito gerado');
      }
    } catch (e: any) {
      setAiError(e?.message || 'Erro ao gerar conceitos');
    } finally {
      setGenerating(false);
    }
  };

  const applyAiConcept = (c: AiConceptSuggestion, idx: number) => {
    setSelectedAiIdx(idx);
    setForm((f) => ({
      ...f,
      name: c.headline_concept,
      insight: c.emotional_truth,
      example_copy: c.rationale,
      hero_piece: c.visual_direction,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const triggers = form.triggers.split(',').map((t) => t.trim()).filter(Boolean);
      await apiPost(`/campaigns/${campaignId}/creative-concepts`, {
        phase_id: form.phase_id || null,
        name: form.name.trim(),
        insight: form.insight.trim() || null,
        triggers,
        example_copy: form.example_copy.trim() || null,
        hero_piece: form.hero_piece.trim() || null,
      });
      setForm({ phase_id: '', name: '', insight: '', triggers: '', example_copy: '', hero_piece: '' });
      setAiConcepts([]);
      setSelectedAiIdx(null);
      onCreated();
      onClose();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Novo Território Criativo</Typography>
          <IconButton size="small" onClick={onClose}><IconX size={18} /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* AI suggestion strip */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Sugestões da IA</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={generating ? <CircularProgress size={12} /> : <IconSparkles size={14} />}
              onClick={handleGenerate}
              disabled={generating}
              sx={{ fontSize: '0.72rem', textTransform: 'none', borderColor: 'divider' }}
            >
              {generating ? 'Gerando…' : 'Sugerir com IA'}
            </Button>
          </Stack>

          {aiError && <Alert severity="warning" sx={{ py: 0.5, fontSize: '0.75rem' }}>{aiError}</Alert>}

          {aiConcepts.length > 0 && (
            <Stack spacing={0.75}>
              {aiConcepts.map((c, i) => (
                <Box
                  key={c.concept_id}
                  onClick={() => applyAiConcept(c, i)}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: selectedAiIdx === i ? 'primary.main' : 'divider',
                    bgcolor: selectedAiIdx === i ? 'primary.lighter' : 'transparent',
                    cursor: 'pointer',
                    transition: 'border-color 0.12s',
                    '&:hover': { borderColor: 'primary.light' },
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                        {c.headline_concept}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {c.emotional_truth}
                      </Typography>
                    </Box>
                    <Chip
                      label={c.risk_level}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        bgcolor: `${RISK_COLOR[c.risk_level]}20`,
                        color: RISK_COLOR[c.risk_level],
                        border: 'none',
                        flexShrink: 0,
                      }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                    {c.suggested_structure} · {c.cultural_angle}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}

          <Divider />

          <FormControl size="small" fullWidth>
            <InputLabel>Fase</InputLabel>
            <Select value={form.phase_id} label="Fase" onChange={(e) => setF('phase_id', e.target.value)}>
              <MenuItem value=""><em>Todas as fases</em></MenuItem>
              {phases.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Nome do território *" size="small" fullWidth value={form.name} onChange={(e) => setF('name', e.target.value)} />
          <TextField label="Insight humano" size="small" fullWidth multiline rows={2} value={form.insight} onChange={(e) => setF('insight', e.target.value)} placeholder="O que move o público a agir?" />
          <TextField label="Gatilhos (vírgula)" size="small" fullWidth value={form.triggers} onChange={(e) => setF('triggers', e.target.value)} placeholder="curiosidade, autoridade, pertencimento" />
          <TextField label="Exemplo de copy / linha" size="small" fullWidth multiline rows={2} value={form.example_copy} onChange={(e) => setF('example_copy', e.target.value)} />
          <TextField label="Peça hero (descrição)" size="small" fullWidth value={form.hero_piece} onChange={(e) => setF('hero_piece', e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
          Criar território
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CampaignDetail({
  campaign,
  clientId,
  onRefresh,
}: {
  campaign: Campaign;
  clientId: string;
  onRefresh: () => void;
}) {
  const confirm = useConfirm();
  const [formats, setFormats] = useState<CampaignFormat[]>([]);
  const [concepts, setConcepts] = useState<CreativeConcept[]>([]);
  const [briefings, setBriefings] = useState<LinkedBriefing[]>([]);
  const [summaries, setSummaries] = useState<Record<string, FormatSummary>>({});
  const [loading, setLoading] = useState(true);
  const [metricsFormat, setMetricsFormat] = useState<CampaignFormat | null>(null);
  const [recalcLoading, setRecalcLoading] = useState<string | null>(null);
  const [lockLoading, setLockLoading] = useState<string | null>(null);
  const [conceptDialogOpen, setConceptDialogOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [linkingPost, setLinkingPost] = useState<{ formatId: string; url: string } | null>(null);
  const [behaviorProfiles, setBehaviorProfiles] = useState<BehaviorCluster[]>([]);
  const [computingProfiles, setComputingProfiles] = useState(false);
  const [learningRules, setLearningRules] = useState<LearningRule[]>([]);
  const [computingRules, setComputingRules] = useState(false);
  const [generatingCopyFor, setGeneratingCopyFor] = useState<string | null>(null);
  const [behavioralCopyMap, setBehavioralCopyMap] = useState<Record<string, BehavioralCopyResult>>({});
  const [biPlatform, setBiPlatform] = useState<Record<string, string>>({});
  const [expandedBiCopy, setExpandedBiCopy] = useState<string | null>(null);

  // Campaign layout pieces
  const [generatingPiecesFor, setGeneratingPiecesFor] = useState<string | null>(null);
  const [campaignPieces, setCampaignPieces] = useState<any[]>([]);
  const [showCampaignCanvas, setShowCampaignCanvas] = useState(false);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [campaignArtDirection, setCampaignArtDirection] = useState<Record<string, any>>({});

  const phases: Phase[] = (campaign.phases && campaign.phases.length > 0)
    ? [...campaign.phases].sort((a, b) => a.order - b.order)
    : DEFAULT_PHASES;

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [res, profilesRes, rulesRes, copiesRes] = await Promise.all([
        apiGet<{
          success: boolean;
          data: {
            campaign: Campaign;
            formats: CampaignFormat[];
            briefings: LinkedBriefing[];
            concepts: CreativeConcept[];
          };
        }>(`/campaigns/${campaign.id}`),
        apiGet<{ success: boolean; data: BehaviorCluster[] }>(
          `/clients/${clientId}/behavior-profiles`
        ).catch(() => ({ success: false, data: [] as BehaviorCluster[] })),
        apiGet<{ success: boolean; data: LearningRule[] }>(
          `/clients/${clientId}/learning-rules`
        ).catch(() => ({ success: false, data: [] as LearningRule[] })),
        apiGet<{ success: boolean; data: any[] }>(
          `/campaigns/${campaign.id}/behavioral-copies?limit=50`
        ).catch(() => ({ success: false, data: [] as any[] })),
      ]);
      setFormats(res?.data?.formats || []);
      setBriefings(res?.data?.briefings || []);
      setConcepts(res?.data?.concepts || []);
      setBehaviorProfiles(profilesRes?.data || []);
      setLearningRules(rulesRes?.data || []);

      // Reconstruct behavioralCopyMap from persisted results (most recent per behavior_intent_id)
      const storedCopies: any[] = copiesRes?.data || [];
      if (storedCopies.length > 0) {
        const copyMap: Record<string, BehavioralCopyResult> = {};
        // storedCopies is ordered DESC by created_at — first occurrence per bi_id wins
        for (const row of storedCopies) {
          const biId: string = row.behavior_intent_id;
          if (copyMap[biId]) continue; // already have the most recent
          copyMap[biId] = {
            id: row.id,
            draft: {
              hook_text: row.hook_text ?? '',
              content_text: row.content_text ?? '',
              cta_text: row.cta_text ?? '',
              media_type: row.media_type ?? '',
              behavioral_rationale: row.behavioral_rationale ?? '',
            },
            audit: {
              approval_status: row.approval_status ?? 'approved',
              approved_text: row.approved_text ?? '',
              revision_notes: row.revision_notes ?? [],
              fogg_score: (row.fogg_motivation != null)
                ? { motivation: Number(row.fogg_motivation), ability: Number(row.fogg_ability), prompt: Number(row.fogg_prompt) }
                : { motivation: 0, ability: 0, prompt: 0 },
              behavior_tags: row.behavioral_tags
                ? { emotional_tone: row.emotional_tone ?? '', micro_behavior: '', triggers: [] }
                : { emotional_tone: row.emotional_tone ?? '', micro_behavior: '', triggers: [] },
              policy_flags: row.policy_flags ?? [],
            },
          };
        }
        setBehavioralCopyMap((prev) => ({ ...copyMap, ...prev })); // prefer session results over persisted
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [campaign.id, clientId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const handleLock = async (format: CampaignFormat) => {
    setLockLoading(format.id);
    try {
      await apiPost(`/campaign-formats/${format.id}/lock`, {});
      await loadDetail();
    } catch {
      //
    } finally {
      setLockLoading(null);
    }
  };

  const handleRecalc = async (format: CampaignFormat) => {
    setRecalcLoading(format.id);
    try {
      const res = await apiPost<{ success: boolean; data: FormatSummary }>(
        `/campaign-formats/${format.id}/summary/recalc`,
        {}
      );
      if (res?.data) {
        setSummaries((prev) => ({ ...prev, [format.id]: res.data }));
      }
    } catch {
      //
    } finally {
      setRecalcLoading(null);
    }
  };

  const handleApproveConcept = async (concept: CreativeConcept) => {
    setApproving(concept.id);
    try {
      await apiPatch(`/creative-concepts/${concept.id}`, { status: 'approved' });
      await loadDetail();
    } catch { /* silent */ } finally { setApproving(null); }
  };

  const handleDeleteConcept = async (concept: CreativeConcept) => {
    if (!await confirm(`Excluir território "${concept.name}"?`)) return;
    try {
      await apiDelete(`/creative-concepts/${concept.id}`);
      await loadDetail();
    } catch { /* silent */ }
  };

  const handleGenerateStrategy = async () => {
    setGenerating(true);
    try {
      const res = await apiPost<{ success: boolean; data: { concepts: CreativeConcept[] } }>(
        `/campaigns/${campaign.id}/generate-strategy`,
        {}
      );
      if (res?.data?.concepts?.length) {
        setConcepts(res.data.concepts);
      }
      onRefresh();
    } catch {
      // silent — parent will reload on next interaction
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateBehavioralCopy = async (biId: string, platform: string) => {
    if (!platform) return;
    setGeneratingCopyFor(biId);
    try {
      const res = await apiPost<{ success: boolean; data: BehavioralCopyResult }>(
        `/campaigns/${campaign.id}/behavioral-copy`,
        { behavior_intent_id: biId, platform }
      );
      if (res?.data) {
        setBehavioralCopyMap((prev) => ({ ...prev, [biId]: res.data }));
        setExpandedBiCopy(biId);
      }
    } catch { /* silent */ } finally {
      setGeneratingCopyFor(null);
    }
  };

  const handleGenerateCampaignPieces = async (camp: any) => {
    const bis = (camp.behavior_intents ?? []) as any[];
    if (!bis.length) return;
    setGeneratingPiecesFor(camp.id);
    try {
      // Build pieces from behavior intents — Feed + Stories per intent
      const pieces = bis.flatMap((bi: any, idx: number) => {
        const plat = biPlatform[bi.id] || 'Instagram';
        const copyResult = behavioralCopyMap[bi.id];
        const basePiece = {
          behavior_intent_id: bi.id,
          behavioral_copy_id: copyResult?.id ?? undefined,
          platform: plat,
          copy: copyResult ? {
            headline: copyResult.draft.hook_text,
            body: copyResult.draft.content_text,
            cta: copyResult.draft.cta_text,
          } : undefined,
        };
        // Feed + Stories for each intent
        return [
          { ...basePiece, format: 'Feed 1:1' },
          { ...basePiece, format: 'Stories 9:16' },
        ];
      }).slice(0, 20); // max 20

      const res = await apiPost<any>('/studio/canvas/generate-campaign', {
        campaign_id: camp.id,
        pieces,
        boldness: 0.5,
        image_provider: 'fal',
        fal_model: 'flux-pro',
      });

      if (res?.success && res.pieces?.length) {
        setCampaignPieces(res.pieces);
        setCampaignArtDirection(res.art_direction ?? {});
        setShowCampaignCanvas(true);
      }
    } catch { /* silent */ } finally {
      setGeneratingPiecesFor(null);
    }
  };

  const handleRegeneratePiece = async (idx: number) => {
    const piece = campaignPieces[idx];
    if (!piece || regeneratingIdx !== null) return;
    setRegeneratingIdx(idx);
    try {
      const res = await apiPost<any>('/studio/canvas/regenerate-piece', {
        format: piece.format,
        platform: piece.platform,
        copy: piece.copy,
        art_direction: campaignArtDirection,
        boldness: 0.5,
        image_provider: 'fal',
        fal_model: 'flux-pro',
      });
      if (res?.success) {
        setCampaignPieces(prev => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            layout: res.layout,
            image_url: res.image_url,
            error: undefined,
          };
          return next;
        });
      }
    } catch { /* silent */ } finally {
      setRegeneratingIdx(null);
    }
  };

  const handleSyncMetrics = async () => {
    setSyncing(true);
    try {
      await apiPost(`/clients/${clientId}/connectors/meta/sync`, {});
      await loadDetail();
    } catch { /* silent */ } finally {
      setSyncing(false);
    }
  };

  const handleLinkPost = async (formatId: string, url: string) => {
    try {
      await apiPost(`/campaign-formats/${formatId}/link-post`, { instagram_post_url: url || null });
      setLinkingPost(null);
      await loadDetail();
    } catch { /* silent */ }
  };

  const handleComputeRules = async () => {
    setComputingRules(true);
    try {
      const res = await apiPost<{ success: boolean; data: LearningRule[] }>(
        `/clients/${clientId}/learning-rules/compute`,
        {}
      );
      setLearningRules(res?.data || []);
    } catch { /* silent */ } finally {
      setComputingRules(false);
    }
  };

  const handleComputeProfiles = async () => {
    setComputingProfiles(true);
    try {
      const res = await apiPost<{ success: boolean; data: BehaviorCluster[] }>(
        `/clients/${clientId}/behavior-profiles/compute`,
        {}
      );
      setBehaviorProfiles(res?.data || []);
    } catch { /* silent */ } finally {
      setComputingProfiles(false);
    }
  };

  const handleActualUpdate = async (format: CampaignFormat, field: string, value: string) => {
    try {
      await apiPatch(`/campaign-formats/${format.id}`, { [field]: value ? Number(value) : null });
      await loadDetail();
    } catch {
      //
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Box>
      {/* Campaign Header */}
      <Card variant="outlined" sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{campaign.name}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap">
                <Chip size="small" label={objectiveLabel(campaign.objective)} color="primary" variant="outlined" />
                <Chip size="small" label={campaign.status} color={statusColor(campaign.status)} />
              </Stack>
            </Box>
            <Stack spacing={0.5} alignItems="flex-end">
              {campaign.budget_brl && (
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmtBrl(campaign.budget_brl)}</Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {fmtDate(campaign.start_date)}{campaign.end_date ? ` → ${fmtDate(campaign.end_date)}` : ''}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Phases Timeline ───────────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
            <IconFlag size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Fases
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={generating ? <CircularProgress size={12} /> : <IconSparkles size={13} />}
              onClick={handleGenerateStrategy}
              disabled={generating}
              sx={{ fontSize: '0.7rem', height: 24, px: 1 }}
            >
              {generating ? 'Gerando…' : (campaign.phases?.length ? 'Regenerar' : 'Gerar estratégia')}
            </Button>
            {phases.map((p) => (
              <Chip
                key={p.id}
                size="small"
                label={p.name}
                onClick={() => setSelectedPhase(selectedPhase === p.id ? null : p.id)}
                variant={selectedPhase === p.id ? 'filled' : 'outlined'}
                sx={{
                  height: 22,
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  bgcolor: selectedPhase === p.id ? phaseColor(p.id) : 'transparent',
                  color: selectedPhase === p.id ? '#fff' : 'text.secondary',
                  borderColor: phaseColor(p.id),
                }}
              />
            ))}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1}>
          {phases.map((p, idx) => {
            const phaseBriefings = briefings.filter((b) => b.campaign_phase_id === p.id);
            const phaseConcepts = concepts.filter((c) => c.phase_id === p.id);
            const color = phaseColor(p.id);
            return (
              <Card
                key={p.id}
                variant="outlined"
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  borderColor: selectedPhase === p.id ? color : 'divider',
                  borderTopWidth: 3,
                  borderTopColor: color,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: color },
                }}
                onClick={() => setSelectedPhase(selectedPhase === p.id ? null : p.id)}
              >
                <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color }}>{p.name}</Typography>
                  {p.objective && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem', mt: 0.25 }}>
                      {p.objective}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                    <Chip size="small" label={`${phaseBriefings.length} brief`} sx={{ height: 16, fontSize: '0.58rem' }} />
                    <Chip size="small" label={`${phaseConcepts.length} território${phaseConcepts.length !== 1 ? 's' : ''}`} sx={{ height: 16, fontSize: '0.58rem' }} />
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Box>

      {/* ── Mapa de Intenções Comportamentais ───────────────────────────── */}
      {(campaign.behavior_intents?.length > 0 || generating) && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em', flex: 1 }}>
              <IconBrain size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Mapa de Intenções ({campaign.behavior_intents?.filter((bi: any) => !selectedPhase || bi.phase_id === selectedPhase).length ?? 0})
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={generatingPiecesFor === campaign.id ? <CircularProgress size={12} /> : <IconSparkles size={13} />}
              onClick={() => handleGenerateCampaignPieces(campaign)}
              disabled={!!generatingPiecesFor}
              sx={{
                fontSize: '0.65rem', textTransform: 'none', py: 0.25,
                borderColor: '#E85219', color: '#E85219',
                '&:hover': { borderColor: '#c94215', bgcolor: 'rgba(232,82,25,0.08)' },
              }}
            >
              {generatingPiecesFor === campaign.id ? 'Gerando peças…' : 'Gerar Peças'}
            </Button>
          </Box>
          {generating ? (
            <Stack alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Gerando estratégia comportamental…</Typography>
            </Stack>
          ) : (
            <Stack spacing={0.75}>
              {(campaign.behavior_intents as any[])
                .filter((bi) => !selectedPhase || bi.phase_id === selectedPhase)
                .map((bi: any, idx: number) => {
                  const amdColors: Record<string, string> = {
                    salvar: '#7c3aed',
                    compartilhar: '#2563eb',
                    clicar: '#ea580c',
                    responder: '#16a34a',
                    marcar_alguem: '#0891b2',
                    pedir_proposta: '#dc2626',
                  };
                  const amdColor = amdColors[bi.amd] ?? '#6b7280';
                  const biPhase = phases.find(p => p.id === bi.phase_id);
                  const biAudience = (campaign.audiences as any[])?.find((a: any) => a.id === bi.audience_id);
                  return (
                    <Card key={bi.id ?? idx} variant="outlined" sx={{ borderRadius: 2, borderLeft: `3px solid ${amdColor}` }}>
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Stack direction="row" alignItems="flex-start" spacing={1} flexWrap="wrap">
                          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ flex: 1, minWidth: 0 }}>
                            {biPhase && (
                              <Chip size="small" label={biPhase.name} sx={{ height: 16, fontSize: '0.58rem', bgcolor: phaseColor(bi.phase_id), color: '#fff' }} />
                            )}
                            {biAudience && (
                              <Chip size="small" label={biAudience.persona_name || biAudience.persona_id} variant="outlined" sx={{ height: 16, fontSize: '0.58rem' }} />
                            )}
                            <Chip size="small" label={bi.amd} sx={{ height: 16, fontSize: '0.58rem', bgcolor: amdColor, color: '#fff' }} />
                            <Chip size="small" label={bi.momento} variant="outlined" sx={{ height: 16, fontSize: '0.58rem' }} />
                          </Stack>
                        </Stack>
                        {bi.target_behavior && (
                          <Typography variant="caption" color="text.primary" sx={{ display: 'block', mt: 0.5, fontSize: '0.72rem' }}>
                            {bi.target_behavior}
                          </Typography>
                        )}
                        {bi.triggers?.length > 0 && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                            {(bi.triggers as string[]).map((t) => (
                              <Chip key={t} size="small" label={t} variant="outlined" sx={{ height: 14, fontSize: '0.56rem' }} />
                            ))}
                          </Stack>
                        )}
                        {/* ── Copy generation row ── */}
                        {bi.id && (
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap">
                            <Select
                              size="small"
                              displayEmpty
                              value={biPlatform[bi.id] || ''}
                              onChange={(e) => setBiPlatform((prev) => ({ ...prev, [bi.id]: e.target.value }))}
                              sx={{ fontSize: '0.7rem', height: 24, minWidth: 110, '& .MuiSelect-select': { py: '2px', px: '8px' } }}
                            >
                              <MenuItem value="" disabled sx={{ fontSize: '0.7rem' }}>Canal…</MenuItem>
                              {['LinkedIn', 'Instagram', 'Instagram Story', 'Email', 'TikTok'].map((p) => (
                                <MenuItem key={p} value={p} sx={{ fontSize: '0.7rem' }}>{p}</MenuItem>
                              ))}
                            </Select>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={generatingCopyFor === bi.id ? <CircularProgress size={11} /> : <IconSparkles size={12} />}
                              onClick={() => handleGenerateBehavioralCopy(bi.id, biPlatform[bi.id] || '')}
                              disabled={generatingCopyFor !== null || !biPlatform[bi.id]}
                              sx={{ fontSize: '0.65rem', height: 24, px: 1, borderColor: amdColor, color: amdColor, '&:hover': { borderColor: amdColor, bgcolor: `${amdColor}10` } }}
                            >
                              {generatingCopyFor === bi.id ? 'Gerando…' : behavioralCopyMap[bi.id] ? 'Regenerar' : 'Gerar Copy'}
                            </Button>
                            {behavioralCopyMap[bi.id] && (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => setExpandedBiCopy(expandedBiCopy === bi.id ? null : bi.id)}
                                sx={{ fontSize: '0.65rem', height: 24, color: 'text.secondary', textTransform: 'none' }}
                              >
                                {expandedBiCopy === bi.id ? 'Ocultar' : 'Ver copy'}
                              </Button>
                            )}
                          </Stack>
                        )}
                        {/* ── Copy result ── */}
                        {bi.id && expandedBiCopy === bi.id && behavioralCopyMap[bi.id] && (() => {
                          const result = behavioralCopyMap[bi.id];
                          const statusColor = result.audit.approval_status === 'approved' ? 'success.main' : result.audit.approval_status === 'blocked' ? 'error.main' : 'warning.main';
                          return (
                            <Box sx={{ mt: 1, p: 1.25, bgcolor: 'action.hover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                                <Chip size="small" label={result.audit.approval_status} sx={{ height: 16, fontSize: '0.58rem', bgcolor: statusColor, color: '#fff', fontWeight: 700 }} />
                                {result.persona_used && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>para {result.persona_used}</Typography>}
                                {result.phase && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>· fase {result.phase}</Typography>}
                              </Stack>
                              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.25, fontSize: '0.65rem', color: 'text.secondary', textTransform: 'uppercase' }}>Hook</Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.78rem', mb: 1, fontStyle: 'italic' }}>{result.draft.hook_text}</Typography>
                              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.25, fontSize: '0.65rem', color: 'text.secondary', textTransform: 'uppercase' }}>Copy</Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.78rem', mb: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{result.audit.approved_text}</Typography>
                              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.25, fontSize: '0.65rem', color: 'text.secondary', textTransform: 'uppercase' }}>CTA</Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.78rem', mb: 1, color: amdColor, fontWeight: 600 }}>{result.draft.cta_text}</Typography>
                              {/* Fogg scores */}
                              <Stack spacing={0.5} sx={{ mb: 0.75 }}>
                                {([['Motivação', result.audit.fogg_score.motivation], ['Habilidade', result.audit.fogg_score.ability], ['Prompt/CTA', result.audit.fogg_score.prompt]] as [string, number][]).map(([label, val]) => (
                                  <Stack key={label} direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="caption" sx={{ minWidth: 64, fontSize: '0.6rem', color: 'text.secondary' }}>{label}</Typography>
                                    <LinearProgress variant="determinate" value={(val / 10) * 100} sx={{ flex: 1, height: 3, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: val >= 8 ? 'success.main' : val >= 6 ? 'warning.main' : 'error.main' } }} />
                                    <Typography variant="caption" sx={{ fontSize: '0.6rem', minWidth: 18, textAlign: 'right' }}>{val}</Typography>
                                  </Stack>
                                ))}
                              </Stack>
                              {result.audit.revision_notes.length > 0 && (
                                <Box sx={{ mt: 0.75 }}>
                                  {result.audit.revision_notes.map((note, i) => (
                                    <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.62rem', color: 'warning.main' }}>⚠ {note}</Typography>
                                  ))}
                                </Box>
                              )}
                              {/* ── Briefing CTA ── */}
                              {(() => {
                                const linkedBriefing = briefings.find(b => b.behavior_intent_id === bi.id);
                                return (
                                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.25 }}>
                                    {linkedBriefing ? (
                                      <Chip
                                        size="small"
                                        icon={<IconFileText size={11} />}
                                        label={linkedBriefing.title || 'Briefing vinculado'}
                                        component="a"
                                        href={`/studio/brief/${linkedBriefing.id}`}
                                        clickable
                                        sx={{ height: 22, fontSize: '0.62rem', bgcolor: 'rgba(232,82,25,0.08)', color: '#E85219', border: '1px solid rgba(232,82,25,0.3)', maxWidth: 180, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                                      />
                                    ) : (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        component="a"
                                        href={`/studio/brief?clientId=${encodeURIComponent(clientId)}&title=${encodeURIComponent(result.draft.hook_text)}&message=${encodeURIComponent(result.audit.approved_text)}&source=behavioral_copy&campaign_id=${encodeURIComponent(campaign.id)}&campaign_phase_id=${encodeURIComponent(bi.phase_id ?? '')}&behavior_intent_id=${encodeURIComponent(bi.id ?? '')}${result.id ? `&behavioral_copy_id=${encodeURIComponent(result.id)}` : ''}`}
                                        sx={{ fontSize: '0.65rem', height: 24, px: 1.25, bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' }, textTransform: 'none' }}
                                      >
                                        Criar Briefing
                                      </Button>
                                    )}
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() => navigator.clipboard?.writeText(result.audit.approved_text).catch(() => {})}
                                      sx={{ fontSize: '0.65rem', height: 24, color: 'text.secondary', textTransform: 'none' }}
                                    >
                                      Copiar texto
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<IconSparkles size={11} />}
                                      component="a"
                                      href={(() => {
                                        const copyText = [result.draft.hook_text, result.audit.approved_text, result.draft.cta_text].filter(Boolean).join('\n\n');
                                        const triggers = (result.audit.behavior_tags?.triggers ?? bi.triggers ?? []) as string[];
                                        const params = new URLSearchParams({
                                          client_id: clientId,
                                          campaign_id: campaign.id,
                                          platform: biPlatform[bi.id] || 'instagram',
                                          v0_text: copyText.slice(0, 2000),
                                          v0_amd: bi.amd ?? '',
                                          v0_triggers: triggers.join(','),
                                          v0_fm: String(result.audit.fogg_score?.motivation ?? 7),
                                          v0_fa: String(result.audit.fogg_score?.ability ?? 7),
                                          v0_fp: String(result.audit.fogg_score?.prompt ?? 7),
                                        });
                                        return `/studio/simulation?${params}`;
                                      })()}
                                      sx={{ fontSize: '0.65rem', height: 24, px: 1, color: '#13DEB9', borderColor: '#13DEB940', textTransform: 'none', '&:hover': { bgcolor: 'rgba(19,222,185,0.06)', borderColor: '#13DEB9' } }}
                                    >
                                      Simular
                                    </Button>
                                  </Stack>
                                );
                              })()}
                            </Box>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  );
                })}
            </Stack>
          )}
        </Box>
      )}

      {/* ── Perfis de Audiência (Behavior Clusters) ─────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
            <IconUsersGroup size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Perfis de Audiência ({behaviorProfiles.length})
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={computingProfiles ? <CircularProgress size={12} /> : <IconRefresh size={13} />}
            onClick={handleComputeProfiles}
            disabled={computingProfiles}
            sx={{ fontSize: '0.7rem', height: 24, px: 1 }}
          >
            {computingProfiles ? 'Computando…' : 'Computar perfis'}
          </Button>
        </Stack>

        {behaviorProfiles.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            Nenhum perfil computado. Vincule posts do Instagram e sincronize métricas para derivar os clusters de audiência.
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {behaviorProfiles.map((profile) => {
              const clusterColors: Record<string, { bg: string; border: string; text: string }> = {
                salvadores:          { bg: '#f3e8ff', border: '#7c3aed', text: '#5b21b6' },
                clicadores:          { bg: '#fff7ed', border: '#ea580c', text: '#9a3412' },
                leitores_silenciosos: { bg: '#f0f9ff', border: '#0284c7', text: '#075985' },
                convertidos:         { bg: '#f0fdf4', border: '#16a34a', text: '#14532d' },
              };
              const colors = clusterColors[profile.cluster_type] ?? { bg: '#f8fafc', border: '#94a3b8', text: '#475569' };
              return (
                <Card
                  key={profile.cluster_type}
                  variant="outlined"
                  sx={{
                    minWidth: 200, maxWidth: 260, flex: '1 1 200px',
                    borderColor: colors.border,
                    borderTopWidth: 3,
                    borderRadius: 2,
                    bgcolor: colors.bg,
                  }}
                >
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Stack spacing={0.75}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: colors.text, fontSize: '0.72rem' }}>
                        {profile.cluster_label}
                      </Typography>
                      {profile.preferred_format && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {profile.preferred_format}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {profile.preferred_amd && (
                          <Chip size="small" label={profile.preferred_amd} sx={{ height: 14, fontSize: '0.58rem', bgcolor: colors.border, color: '#fff' }} />
                        )}
                        {profile.preferred_triggers.slice(0, 3).map((t) => (
                          <Chip key={t} size="small" label={t} variant="outlined" sx={{ height: 14, fontSize: '0.56rem', borderColor: colors.border, color: colors.text }} />
                        ))}
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                          save {(profile.avg_save_rate * 100).toFixed(2)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                          click {(profile.avg_click_rate * 100).toFixed(2)}%
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                          n={profile.sample_size}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* ── Regras de Aprendizado ───────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
            <IconTrendingUp size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Regras de Aprendizado ({learningRules.length})
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={computingRules ? <CircularProgress size={12} /> : <IconRefresh size={13} />}
            onClick={handleComputeRules}
            disabled={computingRules}
            sx={{ fontSize: '0.7rem', height: 24, px: 1 }}
          >
            {computingRules ? 'Computando…' : 'Computar regras'}
          </Button>
        </Stack>

        {learningRules.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            Nenhuma regra derivada. Registre métricas de performance e compute para identificar padrões com uplift comprovado.
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {learningRules.slice(0, 10).map((rule) => {
              const segType = rule.segment_definition?.type ?? 'unknown';
              const segTypeColors: Record<string, { border: string; bg: string; chip: string }> = {
                amd:      { border: '#7c3aed', bg: '#faf5ff', chip: '#7c3aed' },
                trigger:  { border: '#0284c7', bg: '#f0f9ff', chip: '#0284c7' },
                platform: { border: '#059669', bg: '#f0fdf4', chip: '#059669' },
              };
              const colors = segTypeColors[segType] ?? { border: '#94a3b8', bg: '#f8fafc', chip: '#64748b' };
              const upliftLabel = `+${rule.uplift_value.toFixed(1)}%`;
              const metricLabel = rule.uplift_metric.replace(/_/g, ' ');
              const confidencePct = Math.round(rule.confidence_score * 100);
              return (
                <Card
                  key={rule.rule_name}
                  variant="outlined"
                  sx={{ borderRadius: 2, borderLeft: `3px solid ${colors.border}`, bgcolor: colors.bg }}
                >
                  <CardContent sx={{ py: 0.75, '&:last-child': { pb: 0.75 } }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        label={segType}
                        sx={{ height: 15, fontSize: '0.56rem', bgcolor: colors.chip, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                      />
                      <Typography variant="caption" sx={{ flex: 1, minWidth: 0, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rule.effective_pattern}
                      </Typography>
                      <Tooltip title={`Uplift em ${metricLabel} · confiança ${confidencePct}% · n=${rule.sample_size}`}>
                        <Chip
                          size="small"
                          label={upliftLabel}
                          sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'success.light', color: 'success.dark', flexShrink: 0 }}
                        />
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
            {learningRules.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                +{learningRules.length - 10} regras adicionais
              </Typography>
            )}
          </Stack>
        )}
      </Box>

      {/* ── Creative Concepts ────────────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
            <IconBulb size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Territórios Criativos ({concepts.filter(c => !selectedPhase || c.phase_id === selectedPhase).length})
          </Typography>
          <Button
            size="small"
            startIcon={<IconPlus size={13} />}
            onClick={() => setConceptDialogOpen(true)}
            sx={{ fontSize: '0.72rem', height: 26 }}
          >
            Novo território
          </Button>
        </Stack>

        {concepts.filter(c => !selectedPhase || c.phase_id === selectedPhase).length === 0 && (
          <Typography variant="caption" color="text.secondary">
            Nenhum território criativo{selectedPhase ? ' nesta fase' : ''}. Crie o primeiro para guiar a criação.
          </Typography>
        )}

        <Stack spacing={1}>
          {concepts
            .filter(c => !selectedPhase || c.phase_id === selectedPhase)
            .map((concept) => {
              const cPhase = phases.find(p => p.id === concept.phase_id);
              return (
                <Card key={concept.id} variant="outlined" sx={{ borderRadius: 2, borderColor: concept.status === 'approved' ? 'success.light' : 'divider' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{concept.name}</Typography>
                          <Chip
                            size="small"
                            label={concept.status === 'approved' ? 'Aprovado' : concept.status === 'rejected' ? 'Rejeitado' : 'Rascunho'}
                            color={concept.status === 'approved' ? 'success' : concept.status === 'rejected' ? 'error' : 'default'}
                            sx={{ height: 16, fontSize: '0.58rem' }}
                          />
                          {cPhase && (
                            <Chip size="small" label={cPhase.name} sx={{ height: 16, fontSize: '0.58rem', bgcolor: phaseColor(concept.phase_id), color: '#fff' }} />
                          )}
                        </Stack>
                        {concept.insight && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {concept.insight.slice(0, 120)}{concept.insight.length > 120 ? '…' : ''}
                          </Typography>
                        )}
                        {concept.triggers.length > 0 && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                            {concept.triggers.map((t) => (
                              <Chip key={t} size="small" label={t} variant="outlined" sx={{ height: 16, fontSize: '0.58rem' }} />
                            ))}
                          </Stack>
                        )}
                        {concept.example_copy && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', color: 'text.secondary', borderLeft: '2px solid', borderColor: 'divider', pl: 1 }}>
                            "{concept.example_copy.slice(0, 100)}{concept.example_copy.length > 100 ? '…' : ''}"
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={0.25} sx={{ ml: 1, flexShrink: 0 }}>
                        {concept.status === 'draft' && (
                          <Tooltip title="Aprovar território">
                            <span>
                              <IconButton size="small" color="success" onClick={() => handleApproveConcept(concept)} disabled={approving === concept.id}>
                                {approving === concept.id ? <CircularProgress size={12} /> : <IconCheck size={14} />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title="Excluir">
                          <IconButton size="small" color="error" onClick={() => handleDeleteConcept(concept)}>
                            <IconTrash size={14} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
        </Stack>
      </Box>

      {/* ── Briefings Vinculados ─────────────────────────────────────────── */}
      {briefings.filter(b => !selectedPhase || b.campaign_phase_id === selectedPhase).length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
            <IconFileText size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Briefings ({briefings.filter(b => !selectedPhase || b.campaign_phase_id === selectedPhase).length})
          </Typography>
          <Stack spacing={0.75}>
            {briefings
              .filter(b => !selectedPhase || b.campaign_phase_id === selectedPhase)
              .map((b) => {
                const bPhase = phases.find(p => p.id === b.campaign_phase_id);
                return (
                  <Card key={b.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.title}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
                          <Chip size="small" label={b.status} sx={{ height: 15, fontSize: '0.58rem' }} />
                          {bPhase && (
                            <Chip size="small" label={bPhase.name} sx={{ height: 15, fontSize: '0.58rem', bgcolor: phaseColor(b.campaign_phase_id), color: '#fff' }} />
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', alignSelf: 'center' }}>
                            {fmtDate(b.created_at)}
                          </Typography>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
          </Stack>
        </Box>
      )}

      {/* Formats */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Formatos ({formats.length})
        </Typography>
        {formats.some(f => f.instagram_post_url) && (
          <Button
            size="small"
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={12} /> : <IconBrandInstagram size={13} />}
            onClick={handleSyncMetrics}
            disabled={syncing}
            sx={{ fontSize: '0.7rem', height: 24, px: 1 }}
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar métricas'}
          </Button>
        )}
      </Stack>

      {formats.length === 0 && (
        <Typography variant="body2" color="text.secondary">Nenhum formato nesta campanha.</Typography>
      )}

      <Stack spacing={2}>
        {formats.map((fmt) => {
          const summary = summaries[fmt.id];
          return (
            <Card key={fmt.id} variant="outlined" sx={{ borderRadius: 3, borderColor: fmt.is_locked ? 'success.light' : 'divider' }}>
              <CardContent>
                {/* Format Header */}
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{fmt.format_name}</Typography>
                      {fmt.is_locked && (
                        <Chip size="small" icon={<IconLock size={10} />} label="Finalizado" color="success" sx={{ height: 18, fontSize: '0.62rem' }} />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap">
                      {fmt.platform && <Chip size="small" label={fmt.platform} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />}
                      {fmt.production_type && <Chip size="small" label={fmt.production_type} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />}
                      {fmt.predicted_market_trend && <Chip size="small" label={fmt.predicted_market_trend} sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'primary.lighter', color: 'primary.main' }} />}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Adicionar métricas">
                      <IconButton size="small" onClick={() => setMetricsFormat(fmt)} disabled={fmt.is_locked}>
                        <IconChartBar size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Recalcular resumo">
                      <span>
                        <IconButton size="small" onClick={() => handleRecalc(fmt)} disabled={recalcLoading === fmt.id}>
                          {recalcLoading === fmt.id ? <CircularProgress size={14} /> : <IconRefresh size={16} />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    {!fmt.is_locked && (
                      <Tooltip title="Finalizar formato (imutável)">
                        <span>
                          <IconButton size="small" onClick={() => handleLock(fmt)} disabled={lockLoading === fmt.id} color="success">
                            {lockLoading === fmt.id ? <CircularProgress size={14} /> : <IconLock size={16} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>

                {/* Instagram Post Link */}
                <Box sx={{ mb: 1.5 }}>
                  {linkingPost?.formatId === fmt.id ? (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <TextField
                        size="small"
                        placeholder="https://www.instagram.com/p/..."
                        value={linkingPost.url}
                        onChange={(e) => setLinkingPost({ formatId: fmt.id, url: e.target.value })}
                        sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.72rem', py: 0.5 } }}
                        autoFocus
                      />
                      <Button size="small" variant="contained" sx={{ fontSize: '0.68rem', height: 28, px: 1 }}
                        onClick={() => handleLinkPost(fmt.id, linkingPost.url)}>
                        Salvar
                      </Button>
                      <IconButton size="small" onClick={() => setLinkingPost(null)}><IconX size={14} /></IconButton>
                    </Stack>
                  ) : (
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      {fmt.instagram_post_url ? (
                        <>
                          <IconBrandInstagram size={13} color="#e1306c" />
                          <Typography
                            component="a" href={fmt.instagram_post_url} target="_blank" rel="noopener"
                            variant="caption" sx={{ color: '#e1306c', fontSize: '0.68rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {fmt.instagram_post_url}
                          </Typography>
                          {fmt.last_metrics_synced_at && (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', flexShrink: 0 }}>
                              sync {fmtDate(fmt.last_metrics_synced_at)}
                            </Typography>
                          )}
                          <Tooltip title="Desvincular">
                            <IconButton size="small" onClick={() => handleLinkPost(fmt.id, '')} sx={{ p: 0.25 }}>
                              <IconLinkOff size={12} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar URL">
                            <IconButton size="small" onClick={() => setLinkingPost({ formatId: fmt.id, url: fmt.instagram_post_url ?? '' })} sx={{ p: 0.25 }}>
                              <IconLink size={12} />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Button size="small" variant="text" startIcon={<IconBrandInstagram size={12} />}
                          onClick={() => setLinkingPost({ formatId: fmt.id, url: '' })}
                          sx={{ fontSize: '0.68rem', color: 'text.disabled', height: 22, px: 0.5 }}>
                          Vincular post do Instagram
                        </Button>
                      )}
                    </Stack>
                  )}
                </Box>

                {/* Predicted Scores */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>PREDIÇÕES</Typography>
                    <Stack spacing={0.75}>
                      <ScoreBar label="Score ML" value={fmt.predicted_ml_score} />
                      <ScoreBar label="Mensurabilidade" value={fmt.predicted_measurability_score} />
                      <ScoreBar label="Probabilidade sucesso" value={fmt.predicted_success_probability} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">ROI Previsto</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmt.predicted_roi_multiplier}x</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">Confiança</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmt.predicted_confidence_level}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">Resultado em</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmt.predicted_time_to_results}</Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>ESTIMATIVAS</Typography>
                    <Stack spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Produção</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {fmtBrl(fmt.estimated_production_cost_min_brl)} – {fmtBrl(fmt.estimated_production_cost_max_brl)}
                        </Typography>
                      </Stack>
                      {fmt.estimated_media_cost_brl != null && (
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Mídia</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmtBrl(fmt.estimated_media_cost_brl)}</Typography>
                        </Stack>
                      )}
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Horas</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmt.estimated_hours}h · {fmt.estimated_skill_level}</Typography>
                      </Stack>
                    </Stack>

                    {/* Actual editable fields */}
                    {!fmt.is_locked && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>REALIZADO</Typography>
                        <Stack spacing={1}>
                          <TextField
                            label="Custo produção real (R$)"
                            size="small"
                            type="number"
                            defaultValue={fmt.actual_production_cost_brl ?? ''}
                            onBlur={(e) => handleActualUpdate(fmt, 'actual_production_cost_brl', e.target.value)}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                          />
                          <TextField
                            label="Custo mídia real (R$)"
                            size="small"
                            type="number"
                            defaultValue={fmt.actual_media_cost_brl ?? ''}
                            onBlur={(e) => handleActualUpdate(fmt, 'actual_media_cost_brl', e.target.value)}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                          />
                          <TextField
                            label="Horas reais"
                            size="small"
                            type="number"
                            defaultValue={fmt.actual_hours_spent ?? ''}
                            onBlur={(e) => handleActualUpdate(fmt, 'actual_hours_spent', e.target.value)}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                          />
                        </Stack>
                      </Box>
                    )}
                    {fmt.is_locked && (
                      <Box sx={{ mt: 1 }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Produção real</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmtBrl(fmt.actual_production_cost_brl)}</Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Mídia real</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmtBrl(fmt.actual_media_cost_brl)}</Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Horas reais</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmt.actual_hours_spent != null ? `${fmt.actual_hours_spent}h` : '—'}</Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    )}
                  </Grid>

                  {/* Summary column */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                      PERFORMANCE ACUMULADA
                    </Typography>
                    {summary ? (
                      <Stack spacing={0.5}>
                        {[
                          { label: 'Impressões', v: summary.total_impressions.toLocaleString('pt-BR') },
                          { label: 'Alcance', v: summary.total_reach.toLocaleString('pt-BR') },
                          { label: 'Cliques', v: summary.total_clicks.toLocaleString('pt-BR') },
                          { label: 'Engajamentos', v: summary.total_engagements.toLocaleString('pt-BR') },
                          { label: 'Conversões', v: summary.total_conversions.toLocaleString('pt-BR') },
                          { label: 'Receita', v: fmtBrl(summary.total_revenue_brl) },
                          { label: 'Gasto', v: fmtBrl(summary.total_spend_brl) },
                          { label: 'ROI real', v: summary.actual_roi_multiplier != null ? `${summary.actual_roi_multiplier.toFixed(2)}x` : '—' },
                          { label: 'ROAS real', v: summary.actual_roas != null ? summary.actual_roas.toFixed(2) : '—' },
                        ].map(({ label, v }) => (
                          <Stack key={label} direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{v}</Typography>
                          </Stack>
                        ))}
                        {summary.score_accuracy != null && (
                          <Box sx={{ mt: 1 }}>
                            <ScoreBar label="Acurácia do score ML" value={Math.round(summary.score_accuracy)} />
                          </Box>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Adicione métricas e clique em
                        <IconRefresh size={12} style={{ verticalAlign: 'middle', margin: '0 2px' }} />
                        para calcular.
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <MetricsDialog
        open={!!metricsFormat}
        format={metricsFormat}
        clientId={clientId}
        onClose={() => setMetricsFormat(null)}
        onSuccess={loadDetail}
      />

      <ConceptDialog
        open={conceptDialogOpen}
        campaignId={campaign.id}
        clientId={clientId}
        campaignName={campaign.name}
        campaignObjective={campaign.objective}
        phases={phases}
        onClose={() => setConceptDialogOpen(false)}
        onCreated={loadDetail}
      />

      {/* Campaign Canvas View — full-screen overlay with generated pieces */}
      {showCampaignCanvas && campaignPieces.length > 0 && (
        <CampaignCanvasView
          campaignName={campaign.name}
          pieces={campaignPieces}
          onOpenPiece={(piece) => {
            const params = new URLSearchParams({
              client_id: clientId,
              layout: JSON.stringify(piece.layout),
              image_url: piece.image_url || '',
            });
            window.open(`/studio/canvas?${params.toString()}`, '_blank', 'noopener');
          }}
          onRegeneratePiece={handleRegeneratePiece}
          onClose={() => setShowCampaignCanvas(false)}
          regeneratingIdx={regeneratingIdx}
        />
      )}
    </Box>
  );
}

// ── Create Campaign Dialog ────────────────────────────────────────────────────

function CreateCampaignDialog({
  open,
  clientId,
  onClose,
  onCreated,
}: {
  open: boolean;
  clientId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [dialogStep, setDialogStep] = useState<0 | 1>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    objective: 'performance',
    budget_brl: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    status: 'active',
  });
  const [formats, setFormats] = useState<FormatRow[]>([{ format_name: '', platform: 'Instagram', production_type: '' }]);

  // IA state
  const [briefingText, setBriefingText] = useState('');
  const [recommending, setRecommending] = useState(false);
  const [recoFormats, setRecoFormats] = useState<RecoFormat[]>([]);
  const [recoCases, setRecoCases] = useState<RecoCase[]>([]);
  const [usedRecos, setUsedRecos] = useState<Set<string>>(new Set());

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const addFormat = () => setFormats((f) => [...f, { format_name: '', platform: 'Instagram', production_type: '' }]);
  const removeFormat = (i: number) => setFormats((f) => f.filter((_, idx) => idx !== i));
  const setFormatField = (i: number, k: keyof FormatRow, v: string) =>
    setFormats((f) => f.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const handleRecommend = async () => {
    setRecommending(true);
    setRecoFormats([]);
    setRecoCases([]);
    try {
      const res = await apiPost<{ recommended_formats: RecoFormat[]; reference_cases: RecoCase[] }>(
        '/recommendations/enxoval',
        {
          briefing_text: briefingText || form.name || 'campanha de marketing',
          objective: form.objective,
          budget_total: form.budget_brl ? Number(form.budget_brl) : undefined,
          client_id: clientId,
          include_cases: true,
        }
      );
      setRecoFormats(res?.recommended_formats?.slice(0, 6) || []);
      setRecoCases(res?.reference_cases || []);
    } catch { /* silent */ }
    finally { setRecommending(false); }
  };

  const handleUseFormat = (fmt: RecoFormat) => {
    const key = `${fmt.format_name}::${fmt.platform}`;
    setUsedRecos((prev) => { const next = new Set(prev); next.add(key); return next; });
    setFormats((prev) => {
      const clean = prev.filter((f) => f.format_name.trim());
      return [...clean, { format_name: fmt.format_name, platform: fmt.platform, production_type: fmt.production_type }];
    });
  };

  const handleCreate = async () => {
    setError('');
    if (!form.name.trim()) { setError('Nome obrigatório.'); return; }
    const validFormats = formats.filter((f) => f.format_name.trim());
    if (validFormats.length === 0) { setError('Adicione ao menos 1 formato com nome.'); return; }

    setSaving(true);
    try {
      await apiPost('/campaigns', {
        client_id: clientId,
        name: form.name.trim(),
        objective: form.objective,
        budget_brl: form.budget_brl ? Number(form.budget_brl) : null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status,
        formats: validFormats,
      });
      onCreated();
      onClose();
      // Reset
      setDialogStep(0);
      setForm({ name: '', objective: 'performance', budget_brl: '', start_date: new Date().toISOString().slice(0, 10), end_date: '', status: 'active' });
      setFormats([{ format_name: '', platform: 'Instagram', production_type: '' }]);
      setBriefingText('');
      setRecoFormats([]);
      setRecoCases([]);
      setUsedRecos(new Set());
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar campanha.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    setDialogStep(0);
    setError('');
    setRecoFormats([]);
    setRecoCases([]);
    setUsedRecos(new Set());
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h6">Nova Campanha</Typography>
            {/* Step indicator */}
            <Stack direction="row" spacing={0.75} alignItems="center">
              {[0, 1].map((s) => (
                <Box
                  key={s}
                  sx={{
                    width: s === dialogStep ? 20 : 8,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: s === dialogStep ? '#E85219' : s < dialogStep ? '#13DEB9' : 'grey.300',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
              <Typography variant="caption" color="text.secondary">
                {dialogStep === 0 ? 'Dados básicos' : 'Formatos + IA'}
              </Typography>
            </Stack>
          </Stack>
          <IconButton size="small" onClick={handleClose}><IconX size={18} /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* ── STEP 0: Dados básicos ─────────────────────────────────────── */}
        {dialogStep === 0 && (
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Nome da campanha *" size="small" fullWidth value={form.name} onChange={(e) => setF('name', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Objetivo</InputLabel>
                  <Select label="Objetivo" value={form.objective} onChange={(e) => setF('objective', e.target.value)}>
                    {OBJECTIVES.map((o) => <MenuItem key={o} value={o}>{objectiveLabel(o)}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Budget (R$)" size="small" type="number" fullWidth value={form.budget_brl}
                  onChange={(e) => setF('budget_brl', e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="Início *" size="small" type="date" fullWidth value={form.start_date}
                  onChange={(e) => setF('start_date', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="Fim" size="small" type="date" fullWidth value={form.end_date}
                  onChange={(e) => setF('end_date', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={form.status} onChange={(e) => setF('status', e.target.value)}>
                    {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Stack>
        )}

        {/* ── STEP 1: Formatos + IA ─────────────────────────────────────── */}
        {dialogStep === 1 && (
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>

            {/* AI Assistant Card */}
            <Box sx={{ border: '1px dashed rgba(232,82,25,0.4)', borderRadius: 2, p: 2, bgcolor: 'rgba(232,82,25,0.025)' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <IconSparkles size={18} color="#E85219" />
                <Typography variant="subtitle2" fontWeight={700} color="#E85219">
                  Assistente IA — Recomendação de Formatos
                </Typography>
              </Stack>
              <TextField
                multiline
                rows={2}
                fullWidth
                size="small"
                placeholder="Descreva o briefing da campanha... Ex: quero gerar leads qualificados para o produto X, público 30-50 anos, presença forte no Instagram e LinkedIn"
                value={briefingText}
                onChange={(e) => setBriefingText(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={recommending ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <IconSparkles size={15} />}
                onClick={handleRecommend}
                disabled={recommending}
                sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}
              >
                {recommending ? 'Analisando...' : 'Sugerir formatos com IA'}
              </Button>

              {/* Recommended formats */}
              {recoFormats.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Formatos recomendados para esta campanha
                  </Typography>
                  <Grid container spacing={1.5}>
                    {recoFormats.map((fmt, idx) => {
                      const key = `${fmt.format_name}::${fmt.platform}`;
                      const used = usedRecos.has(key);
                      return (
                        <Grid key={idx} size={{ xs: 12, sm: 6 }}>
                          <Card variant="outlined" sx={{ opacity: used ? 0.5 : 1, transition: 'opacity 0.2s', borderColor: used ? 'success.light' : 'divider' }}>
                            <CardContent sx={{ p: '10px !important' }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="caption" fontWeight={700} noWrap sx={{ display: 'block' }}>
                                    {fmt.format_name}
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
                                    <Chip label={fmt.platform} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                                    {fmt.production_type && (
                                      <Chip label={fmt.production_type} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                                    )}
                                  </Stack>
                                </Box>
                                <Stack alignItems="center" spacing={0.5} sx={{ ml: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    <IconStarFilled size={11} color={scoreColor(fmt.recommendation_score)} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: scoreColor(fmt.recommendation_score), lineHeight: 1 }}>
                                      {fmt.recommendation_score}
                                    </Typography>
                                  </Box>
                                  <Button
                                    size="small"
                                    variant={used ? 'outlined' : 'contained'}
                                    onClick={() => !used && handleUseFormat(fmt)}
                                    disabled={used}
                                    startIcon={used ? <IconCheck size={12} /> : <IconPlus size={12} />}
                                    sx={{
                                      fontSize: '0.65rem', py: 0.25, px: 0.75, minWidth: 0,
                                      bgcolor: used ? 'transparent' : '#E85219',
                                      '&:hover': { bgcolor: used ? 'transparent' : '#4570EA' },
                                    }}
                                  >
                                    {used ? 'Adicionado' : 'Usar'}
                                  </Button>
                                </Stack>
                              </Stack>
                              {fmt.recommendation_reasons && fmt.recommendation_reasons.length > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block', lineHeight: 1.3, fontSize: '0.62rem' }}>
                                  {fmt.recommendation_reasons[0]}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}

              {/* Tavily cases */}
              {recoCases.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Cases de inspiração (buscados na web)
                  </Typography>
                  <Stack spacing={1}>
                    {recoCases.map((c, i) => (
                      <Box
                        key={i}
                        component="a"
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'block', p: 1.25, borderRadius: 1.5,
                          border: '1px solid', borderColor: 'divider',
                          bgcolor: 'background.paper',
                          textDecoration: 'none', color: 'inherit',
                          '&:hover': { borderColor: '#E85219', bgcolor: 'rgba(232,82,25,0.03)' },
                          transition: 'all 0.15s',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ display: 'block', lineHeight: 1.3 }}>
                              {c.title}
                            </Typography>
                            {c.snippet && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, mt: 0.25 }}>
                                {c.snippet}
                              </Typography>
                            )}
                          </Box>
                          <IconExternalLink size={13} color="#999" style={{ marginLeft: 8, flexShrink: 0, marginTop: 2 }} />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            <Divider>
              <Typography variant="caption" color="text.secondary">Formatos da campanha</Typography>
            </Divider>

            {/* Manual formats */}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {formats.filter(f => f.format_name.trim()).length} formato{formats.filter(f => f.format_name.trim()).length !== 1 ? 's' : ''} adicionado{formats.filter(f => f.format_name.trim()).length !== 1 ? 's' : ''}
                </Typography>
                <Button size="small" startIcon={<IconPlus size={14} />} onClick={addFormat}>Adicionar manualmente</Button>
              </Stack>
              <Stack spacing={1.5}>
                {formats.map((fmt, i) => (
                  <Grid container spacing={1.5} key={i} alignItems="center">
                    <Grid size={{ xs: 12, md: 5 }}>
                      <TextField
                        label="Nome do formato *" size="small" fullWidth
                        placeholder="ex: Carrossel educativo, Reels trending..."
                        value={fmt.format_name}
                        onChange={(e) => setFormatField(i, 'format_name', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Plataforma</InputLabel>
                        <Select label="Plataforma" value={fmt.platform} onChange={(e) => setFormatField(i, 'platform', e.target.value)}>
                          {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 5, md: 3 }}>
                      <TextField
                        label="Tipo produção" size="small" fullWidth
                        placeholder="ex: vídeo, imagem"
                        value={fmt.production_type}
                        onChange={(e) => setFormatField(i, 'production_type', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 1 }}>
                      {formats.length > 1 && (
                        <IconButton size="small" onClick={() => removeFormat(i)} color="error">
                          <IconTrash size={15} />
                        </IconButton>
                      )}
                    </Grid>
                  </Grid>
                ))}
              </Stack>
            </Box>

            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        {dialogStep === 0 ? (
          <>
            <Button onClick={handleClose} color="inherit">Cancelar</Button>
            <Button
              variant="contained"
              endIcon={<IconArrowRight size={16} />}
              onClick={() => {
                if (!form.name.trim()) { setError('Informe o nome da campanha.'); return; }
                setError('');
                setDialogStep(1);
              }}
              sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c43e10' } }}
            >
              Próximo: Formatos
            </Button>
          </>
        ) : (
          <>
            <Button startIcon={<IconArrowLeft size={16} />} onClick={() => { setDialogStep(0); setError(''); }} color="inherit">
              Voltar
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} /> : <IconCheck size={16} />}
              sx={{ bgcolor: '#13DEB9', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#0fc9a8' } }}
            >
              {saving ? 'Criando...' : 'Criar Campanha'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CampaignsClient({ clientId }: { clientId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const selected = campaigns.find((c) => c.id === selectedId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Campaign[] }>(
        `/campaigns?client_id=${clientId}`
      );
      setCampaigns(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const filtered = statusFilter === 'all' ? campaigns : campaigns.filter((c) => c.status === statusFilter);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    budget: campaigns.reduce((sum, c) => sum + (c.budget_brl || 0), 0),
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Campanhas</Typography>
          <Typography variant="body2" color="text.secondary">Motor comportamental · predição e rastreamento de formatos</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<IconPlus size={16} />}
          onClick={() => setCreateOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Nova campanha
        </Button>
      </Stack>

      {/* Stats row */}
      {!loading && campaigns.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total', value: stats.total, icon: <IconTarget size={18} />, color: '#6366f1' },
            { label: 'Ativas', value: stats.active, icon: <IconTrendingUp size={18} />, color: 'success.main' },
            { label: 'Concluídas', value: stats.completed, icon: <IconCheck size={18} />, color: '#2563eb' },
            { label: 'Budget total', value: fmtBrl(stats.budget), icon: <IconCoin size={18} />, color: 'warning.main' },
          ].map(({ label, value, icon, color }) => (
            <Grid size={{ xs: 6, md: 3 }} key={label}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Box sx={{ color, opacity: 0.85 }}>{icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Main layout: list + detail */}
      <Grid container spacing={2}>
        {/* Left: campaign list */}
        <Grid size={{ xs: 12, md: selected ? 4 : 12 }}>
          {/* Filter */}
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap">
            {['all', ...STATUSES].map((s) => (
              <Chip
                key={s}
                size="small"
                label={s === 'all' ? 'Todas' : s}
                onClick={() => setStatusFilter(s)}
                color={statusFilter === s ? 'primary' : 'default'}
                variant={statusFilter === s ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>

          {loading && (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
              <CircularProgress size={24} />
            </Stack>
          )}

          {!loading && filtered.length === 0 && (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack alignItems="center" spacing={2} sx={{ py: 5 }}>
                  <IconBrain size={36} stroke={1.5} color="#94a3b8" />
                  <Typography variant="h6">Nenhuma campanha ainda</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 340 }}>
                    Crie a primeira campanha para começar a rastrear predições vs. resultados reais.
                  </Typography>
                  <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
                    Nova campanha
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Stack spacing={1.5}>
            {filtered.map((c) => {
              const isSelected = c.id === selectedId;
              return (
                <Card
                  key={c.id}
                  variant="outlined"
                  onClick={() => setSelectedId(isSelected ? null : c.id)}
                  sx={{
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'primary.lighter' : 'background.paper',
                    '&:hover': { borderColor: 'primary.light', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.name}
                        </Typography>
                        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap">
                          <Chip size="small" label={objectiveLabel(c.objective)} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
                          <Chip size="small" label={c.status} color={statusColor(c.status)} sx={{ height: 18, fontSize: '0.62rem' }} />
                        </Stack>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>
                        {c.budget_brl && (
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{fmtBrl(c.budget_brl)}</Typography>
                        )}
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <IconCalendar size={11} color="#94a3b8" />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{fmtDate(c.start_date)}</Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {/* Right: campaign detail */}
        {selected && (
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ position: 'sticky', top: 16 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary">Detalhes da campanha</Typography>
                <IconButton size="small" onClick={() => setSelectedId(null)}><IconX size={16} /></IconButton>
              </Stack>
              <CampaignDetail campaign={selected} clientId={clientId} onRefresh={load} />
            </Box>
          </Grid>
        )}
      </Grid>

      <CreateCampaignDialog
        open={createOpen}
        clientId={clientId}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </Box>
  );
}
