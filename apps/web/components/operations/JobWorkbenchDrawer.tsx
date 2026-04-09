'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import { alpha } from '@mui/material/styles';
import Link from 'next/link';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconUserPlus,
  IconDeviceFloppy,
  IconRefresh,
  IconThumbUp,
  IconBrush,
  IconSparkles,
  IconFileText,
  IconCircleCheck,
  IconCircleX,
  IconCalendar,
} from '@tabler/icons-react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import { IconShieldCheck, IconChevronDown, IconChevronUp, IconBolt, IconCheck, IconX as IconXMark } from '@tabler/icons-react';
import AskJarvisButton from '@/components/jarvis/AskJarvisButton';
import {
  AutomationPipeline,
  BlockReason,
  ContextDrawer,
  EntityLinkCard,
  GuidedFormSection,
  NextActionBar,
  PriorityPill,
  RiskFlag,
} from './primitives';
import {
  calculatePriorityPreview,
  estimateJobMinutes,
  cleanJobTitle,
  formatSourceLabel,
  formatDateTime,
  formatMinutes,
  getNextAction,
  getStageIndex,
  getRisk,
  isIntakeComplete,
  STAGE_FLOW,
  STAGE_LABELS,
  type OperationsJob,
  type OperationsLookup,
  type OperationsOwner,
} from './model';

type JobDraft = {
  client_id: string | null;
  title: string;
  summary: string;
  job_type: string;
  complexity: 's' | 'm' | 'l';
  job_size: 'P' | 'M' | 'G' | 'GG' | '';
  channel: string | null;
  source: string;
  impact_level: number;
  dependency_level: number;
  required_skill: string | null;
  owner_id: string | null;
  assignee_ids: string[];
  external_link: string;
  deadline_at: string;
  is_urgent: boolean;
  urgency_reason: string;
  definition_of_done: string;
};

type CreativeDraft = {
  id: string;
  draft_type: 'copy' | 'image' | 'layout';
  status: string;
  approval_status?: string | null;
  draft_approved_by?: string | null;
  draft_approved_at?: string | null;
  hook_text?: string | null;
  content_text?: string | null;
  cta_text?: string | null;
  fogg_score?: { motivation?: number; ability?: number; trigger?: number } | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  error_message?: string | null;
  generated_at?: string | null;
  created_at: string;
};

type ComposerPath = 'briefing' | 'job' | 'adjustment' | 'client_request';

const COMPOSER_PATHS: Array<{
  key: ComposerPath;
  title: string;
  subtitle: string;
  helper: string;
  source: string;
  preferredTypes: string[];
  definitionOfDone: string;
  titlePlaceholder: string;
  summaryPlaceholder: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'briefing',
    title: 'Novo briefing',
    subtitle: 'Quando a demanda ainda precisa nascer com contexto e direcionamento.',
    helper: 'Bom para pedidos grandes, campanhas e demandas que ainda precisam virar plano.',
    source: 'briefing',
    preferredTypes: ['briefing'],
    definitionOfDone: 'Briefing preenchido, aprovado e pronto para gerar a execucao.',
    titlePlaceholder: 'Ex.: Briefing campanha de abril',
    summaryPlaceholder: 'Explique o objetivo, o contexto do cliente e o que ainda precisa ser decidido antes da execucao.',
    icon: <IconFileText size={18} />,
  },
  {
    key: 'job',
    title: 'Novo job',
    subtitle: 'Quando ja esta claro o que precisa ser produzido e por quem.',
    helper: 'Bom para peças, producoes e entregas que ja podem entrar direto na fila.',
    source: 'internal',
    preferredTypes: ['copy', 'design_static', 'design_carousel', 'video_edit', 'publication'],
    definitionOfDone: 'Peca produzida, revisada e pronta para entregar ou publicar.',
    titlePlaceholder: 'Ex.: Card institucional para feira de abril',
    summaryPlaceholder: 'Descreva o pedido com foco no que precisa sair e no criterio de entrega.',
    icon: <IconBrush size={18} />,
  },
  {
    key: 'adjustment',
    title: 'Novo ajuste',
    subtitle: 'Quando algo que ja existe precisa voltar para correcao ou refinamento.',
    helper: 'Bom para retrabalho, correcao de material, ajuste de copy e troca de prazo.',
    source: 'whatsapp',
    preferredTypes: ['copy', 'design_static', 'design_carousel', 'publication'],
    definitionOfDone: 'Ajuste aplicado, validado e liberado para seguir o fluxo.',
    titlePlaceholder: 'Ex.: Ajuste no panfleto de abril',
    summaryPlaceholder: 'Explique o que mudou, o que deve ser corrigido e o que nao pode se perder do material original.',
    icon: <IconRefresh size={18} />,
  },
  {
    key: 'client_request',
    title: 'Novo pedido do cliente',
    subtitle: 'Quando o cliente puxou algo novo por WhatsApp, reuniao ou mensagem solta.',
    helper: 'Bom para entradas novas, urgencias e tudo que ainda precisa ser triado na agencia.',
    source: 'whatsapp',
    preferredTypes: ['briefing', 'copy', 'design_static'],
    definitionOfDone: 'Pedido entendido, dono definido e proximo passo combinado com a operacao.',
    titlePlaceholder: 'Ex.: Pedido da Fabiola para o calendario de abril',
    summaryPlaceholder: 'Conte o que o cliente pediu, por onde chegou e o que precisa ser respondido ou entregue agora.',
    icon: <IconUserPlus size={18} />,
  },
];

function FoggBar({ label, value }: { label: string; value?: number | null }) {
  const pct = Math.max(0, Math.min(100, Number(value ?? 0)));
  const color = pct >= 70 ? '#13DEB9' : pct >= 40 ? '#FFAE1F' : '#FA896B';
  return (
    <Stack spacing={0.25}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700 }}>{label}</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 800, color }}>{pct}</Typography>
      </Stack>
      <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.06)' }}>
        <Box sx={{ height: 4, borderRadius: 2, bgcolor: color, width: `${pct}%`, transition: 'width 300ms ease' }} />
      </Box>
    </Stack>
  );
}

// ─── Briefing Approval Panel ──────────────────────────────────────────────────

function BriefingApprovalPanel({ jobId, onApproved }: { jobId: string; onApproved: () => void }) {
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    apiGet<any>(`/jobs/${jobId}/briefing`)
      .then((res) => setBriefing(res.briefing))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleApprove = async () => {
    setActing('approve');
    try {
      await apiPost(`/jobs/${jobId}/briefing/approve`, {});
      onApproved();
    } catch { /* silent */ } finally { setActing(null); }
  };

  const handleReject = async () => {
    setActing('reject');
    try {
      await apiPost(`/jobs/${jobId}/briefing/reject`, { reason: rejectReason || undefined });
      onApproved();
    } catch { /* silent */ } finally { setActing(null); }
  };

  if (loading) return <Skeleton variant="rounded" height={80} />;
  if (!briefing || briefing.status !== 'submitted') return null;

  return (
    <Box sx={(theme) => ({
      p: 2,
      borderRadius: 2.5,
      border: '1.5px solid',
      borderColor: alpha(theme.palette.warning.main, 0.4),
      bgcolor: alpha(theme.palette.warning.main, 0.05),
    })}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <IconFileText size={16} color="#FFAE1F" />
        <Typography variant="body2" fontWeight={800} sx={{ color: 'warning.dark', flex: 1 }}>
          Briefing aguardando aprovação
        </Typography>
        <Button
          component={Link}
          href={`/admin/operacoes/jobs/${jobId}/briefing`}
          size="small"
          variant="text"
          sx={{ fontSize: '0.72rem', color: 'text.secondary' }}
        >
          Ver briefing →
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        O briefing foi preenchido e submetido. Revise e aprove para iniciar a geração de copy pelo Jarvis.
      </Typography>

      {showReject ? (
        <Stack spacing={1}>
          <TextField
            size="small"
            fullWidth
            label="Motivo da rejeição (opcional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            multiline
            rows={2}
            placeholder="Descreva o que precisa ser ajustado..."
          />
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<IconCircleX size={15} />}
              disabled={acting === 'reject'}
              onClick={handleReject}
              sx={{ flex: 1 }}
            >
              {acting === 'reject' ? 'Rejeitando…' : 'Confirmar rejeição'}
            </Button>
            <Button size="small" variant="text" onClick={() => setShowReject(false)} disabled={!!acting}>
              Cancelar
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<IconCircleCheck size={15} />}
            disabled={!!acting}
            onClick={handleApprove}
            sx={{ flex: 1 }}
          >
            {acting === 'approve' ? 'Aprovando…' : 'Aprovar e gerar copy'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            disabled={!!acting}
            onClick={() => setShowReject(true)}
          >
            Rejeitar
          </Button>
        </Stack>
      )}
    </Box>
  );
}

function CreativeDraftsPanel({ jobId }: { jobId: string }) {
  const [drafts, setDrafts] = useState<CreativeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await apiGet<{ data: CreativeDraft[] }>(`/jobs/${jobId}/creative-drafts`);
      setDrafts(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const handleRegenerate = async (step: 'copy' | 'image') => {
    setRegenerating(step);
    try {
      await apiPost(`/jobs/${jobId}/creative-drafts/regenerate`, { step });
      setTimeout(fetchDrafts, 2000);
    } catch {
      // silent
    } finally {
      setRegenerating(null);
    }
  };

  const handleApprove = async (draftId: string) => {
    setApproving(draftId);
    try {
      await apiPost(`/jobs/${jobId}/creative-drafts/${draftId}/approve`, {});
      await fetchDrafts();
    } catch { /* silent */ } finally { setApproving(null); }
  };

  const handleReject = async (draftId: string) => {
    setApproving(`reject_${draftId}`);
    try {
      await apiPost(`/jobs/${jobId}/creative-drafts/${draftId}/reject`, { reason: 'needs_revision' });
      await fetchDrafts();
    } catch { /* silent */ } finally { setApproving(null); }
  };

  const copyDrafts = drafts.filter((d) => d.draft_type === 'copy' && d.status === 'done');
  const imageDraft = drafts.find((d) => d.draft_type === 'image' && d.status === 'done');
  const pendingCopy = drafts.find((d) => d.draft_type === 'copy' && (d.status === 'pending' || d.status === 'generating'));
  const pendingImage = drafts.find((d) => d.draft_type === 'image' && (d.status === 'pending' || d.status === 'generating'));

  if (loading) {
    return (
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={80} />
        <Skeleton variant="rounded" height={120} />
      </Stack>
    );
  }

  if (!drafts.length) return null;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <IconSparkles size={16} />
        <Typography variant="body2" fontWeight={900}>Rascunho do Jarvis</Typography>
        {copyDrafts.length > 1 && (
          <Chip label={`${copyDrafts.length} peças`} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
        )}
      </Stack>

      {/* Copy Drafts — one card per piece */}
      {copyDrafts.length > 0 ? copyDrafts.map((copyDraft, idx) => (
        <Box key={copyDraft.id} sx={(theme) => ({
          p: 2,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.2),
          bgcolor: alpha(theme.palette.primary.main, 0.03),
        })}>
          <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ display: 'block', mb: 1 }}>
            {copyDrafts.length > 1 ? `PEÇA ${idx + 1} — COPY GERADO` : 'COPY GERADO'}
          </Typography>
          {copyDraft.hook_text ? (
            <Typography variant="body1" fontWeight={800} sx={{ mb: 0.5, lineHeight: 1.3 }}>
              {copyDraft.hook_text}
            </Typography>
          ) : null}
          {copyDraft.content_text ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, whiteSpace: 'pre-line' }}>
              {copyDraft.content_text}
            </Typography>
          ) : null}
          {copyDraft.cta_text ? (
            <Chip label={copyDraft.cta_text} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
          ) : null}
          {copyDraft.fogg_score ? (
            <Stack spacing={0.5} sx={{ mt: 1.5 }}>
              <FoggBar label="Motivacao" value={copyDraft.fogg_score.motivation} />
              <FoggBar label="Facilidade" value={copyDraft.fogg_score.ability} />
              <FoggBar label="Gatilho" value={copyDraft.fogg_score.trigger} />
            </Stack>
          ) : null}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            {copyDraft.draft_approved_at ? (
              <Chip size="small" icon={<IconCheck size={11} />} label="Aprovado" color="success"
                sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
            ) : (
              <>
                <Button size="small" variant="contained" color="success"
                  startIcon={approving === copyDraft.id ? undefined : <IconThumbUp size={14} />}
                  disabled={!!approving}
                  onClick={() => handleApprove(copyDraft.id)}
                >
                  {approving === copyDraft.id ? 'Aprovando...' : 'Aprovar'}
                </Button>
                <Button size="small" variant="outlined" color="error"
                  startIcon={<IconXMark size={14} />}
                  disabled={!!approving}
                  onClick={() => handleReject(copyDraft.id)}
                >
                  Rejeitar
                </Button>
              </>
            )}
            {idx === 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<IconRefresh size={14} />}
                onClick={() => handleRegenerate('copy')}
                disabled={!!regenerating}
              >
                {regenerating === 'copy' ? 'Gerando...' : 'Regenerar tudo'}
              </Button>
            )}
          </Stack>
        </Box>
      )) : pendingCopy ? (
        <Box sx={{ p: 2, borderRadius: 2.5, border: '1px dashed', borderColor: 'divider', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            O Jarvis esta rabiscando o copy...
          </Typography>
          <Skeleton variant="text" width="80%" sx={{ mx: 'auto', mt: 1 }} />
          <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} />
        </Box>
      ) : null}

      {/* Image Draft */}
      {imageDraft?.image_url ? (
        <Box sx={(theme) => ({
          borderRadius: 2.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.2),
        })}>
          <Box
            component="img"
            src={imageDraft.image_url}
            alt="Rascunho visual"
            sx={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }}
          />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.5 }}>
            {imageDraft.draft_approved_at ? (
              <Chip size="small" icon={<IconCheck size={11} />} label="Aprovada" color="success"
                sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
            ) : (
              <>
                <Button size="small" variant="contained" color="success"
                  startIcon={approving === imageDraft.id ? undefined : <IconThumbUp size={14} />}
                  disabled={!!approving}
                  onClick={() => handleApprove(imageDraft.id)}
                >
                  {approving === imageDraft.id ? 'Aprovando...' : 'Aprovar'}
                </Button>
                <Button size="small" variant="outlined" color="error"
                  startIcon={<IconXMark size={14} />}
                  disabled={!!approving}
                  onClick={() => handleReject(imageDraft.id)}
                >
                  Rejeitar
                </Button>
              </>
            )}
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconRefresh size={14} />}
              onClick={() => handleRegenerate('image')}
              disabled={!!regenerating}
            >
              {regenerating === 'image' ? 'Gerando...' : 'Regenerar'}
            </Button>
            <Button size="small" variant="outlined" color="warning" startIcon={<IconBrush size={14} />} href={`/studio/canvas?jobId=${jobId}`}>
              Refinar no Canvas
            </Button>
          </Stack>
        </Box>
      ) : pendingImage ? (
        <Box sx={{ p: 2, borderRadius: 2.5, border: '1px dashed', borderColor: 'divider', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            O Jarvis esta desenhando a imagem...
          </Typography>
          <Skeleton variant="rounded" height={120} sx={{ mt: 1 }} />
        </Box>
      ) : null}
    </Stack>
  );
}

const SOURCE_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'briefing', label: 'Briefing' },
  { value: 'campaign', label: 'Campanha' },
  { value: 'calendar', label: 'Calendário' },
  { value: 'internal', label: 'Equipe interna' },
  { value: 'manual', label: 'Manual' },
];

function toInputDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function toIsoDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function nextStatus(job: OperationsJob | null, complete: boolean) {
  if (!job) return null;
  if (job.status === 'blocked') return complete ? 'ready' : 'planned';
  if (job.status === 'intake' || job.status === 'planned') return 'ready';
  if (job.status === 'ready') return 'allocated';
  if (job.status === 'allocated') return 'in_progress';
  if (job.status === 'in_progress') return 'in_review';
  if (job.status === 'in_review') return 'awaiting_approval';
  if (job.status === 'awaiting_approval') return 'approved';
  if (job.status === 'approved') return 'scheduled';
  if (job.status === 'scheduled') return 'published';
  if (job.status === 'published') return 'done';
  if (job.status === 'done') return 'archived';
  return null;
}

function buildDraft(job: OperationsJob | null, lookups: { jobTypes: OperationsLookup[] }) : JobDraft {
  const jobType = job?.job_type || lookups.jobTypes[0]?.code || 'briefing';
  return {
    client_id: job?.client_id || null,
    title: job?.title || '',
    summary: job?.summary || '',
    job_type: jobType,
    complexity: job?.complexity || 'm',
    job_size: (job?.job_size as 'P' | 'M' | 'G' | 'GG' | undefined) || '',
    channel: job?.channel || null,
    source: job?.source || 'manual',
    impact_level: job?.impact_level ?? 2,
    dependency_level: job?.dependency_level ?? 2,
    required_skill: job?.required_skill || null,
    owner_id: job?.owner_id || null,
    assignee_ids: job?.assignees?.map((a) => a.user_id) ?? (job?.owner_id ? [job.owner_id] : []),
    external_link: job?.external_link || '',
    deadline_at: toInputDateTime(job?.deadline_at),
    is_urgent: Boolean(job?.is_urgent),
    urgency_reason: job?.urgency_reason || '',
    definition_of_done: job?.definition_of_done || '',
  };
}

function getMissingDecisionItems(form: JobDraft) {
  const missing: string[] = [];
  if (!form.title.trim()) missing.push('pedido');
  if (!form.client_id) missing.push('cliente');
  if (!form.job_type) missing.push('tipo');
  if (!form.required_skill) missing.push('especialidade');
  if (!form.owner_id) missing.push('responsavel');
  if (!form.deadline_at) missing.push('prazo');
  return missing;
}

function formatMissingDecisionLabel(item: string) {
  switch (item) {
    case 'pedido':
      return 'Nome do pedido';
    case 'cliente':
      return 'Cliente';
    case 'tipo':
      return 'Tipo';
    case 'especialidade':
      return 'Especialidade';
    case 'responsavel':
      return 'Responsavel';
    case 'prazo':
      return 'Prazo';
    default:
      return item;
  }
}

function pickPreferredJobType(jobTypes: OperationsLookup[], preferredTypes: string[]) {
  for (const code of preferredTypes) {
    const found = jobTypes.find((item) => item.code === code);
    if (found) return found.code;
  }
  return jobTypes[0]?.code || 'briefing';
}

/* ─── Time Entries Panel ──────────────────────────────────────── */

type TimeEntry = { id: string; user_name: string; minutes: number; notes?: string | null; logged_at: string };

function TimeEntriesPanel({ jobId }: { jobId: string }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [logMinutes, setLogMinutes] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ data: TimeEntry[]; total_minutes: number }>(`/jobs/${jobId}/time-entries`);
      setEntries(res?.data ?? []);
      setTotalMinutes(res?.total_minutes ?? 0);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const handleLog = async () => {
    const mins = parseInt(logMinutes, 10);
    if (!mins || mins < 1) { setError('Informe um valor válido em minutos.'); return; }
    setSaving(true); setError('');
    try {
      await apiPost(`/jobs/${jobId}/time-entries`, { minutes: mins, notes: logNotes.trim() || undefined });
      setLogMinutes(''); setLogNotes(''); setLogOpen(false);
      await load();
    } catch (e: any) { setError(e?.message || 'Erro ao registrar tempo.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await apiDelete(`/jobs/${jobId}/time-entries/${entryId}`);
      await load();
    } catch { /* ignore */ }
  };

  const fmtMins = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}min` : ''}` : `${m}min`;

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6" fontWeight={800}>Tempo registrado</Typography>
          {totalMinutes > 0 && (
            <Typography variant="caption" color="text.secondary">{fmtMins(totalMinutes)} total</Typography>
          )}
        </Box>
        <Button size="small" variant="outlined" onClick={() => setLogOpen(!logOpen)} sx={{ fontSize: '0.7rem', py: 0.25 }}>
          + Registrar
        </Button>
      </Stack>

      <Collapse in={logOpen}>
        <Box sx={(theme) => ({ p: 1.5, borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`, bgcolor: alpha(theme.palette.primary.main, 0.03) })}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small" label="Minutos" type="number" value={logMinutes}
                onChange={(e) => setLogMinutes(e.target.value)}
                inputProps={{ min: 1, max: 1440 }}
                sx={{ width: 110 }}
              />
              <TextField
                size="small" fullWidth label="Observação (opcional)" value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
              />
            </Stack>
            {error && <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>}
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" onClick={handleLog} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
              <Button size="small" onClick={() => { setLogOpen(false); setError(''); }}>Cancelar</Button>
            </Stack>
          </Stack>
        </Box>
      </Collapse>

      {loading ? <Skeleton variant="rounded" height={40} /> : entries.length === 0 ? (
        <Typography variant="caption" color="text.disabled">Nenhum tempo registrado ainda.</Typography>
      ) : (
        <Stack spacing={0.5}>
          {entries.map((e) => (
            <Stack key={e.id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
              <Typography variant="caption" fontWeight={800} sx={{ minWidth: 44 }}>{fmtMins(e.minutes)}</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" fontWeight={600} noWrap>{e.user_name}</Typography>
                {e.notes && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{e.notes}</Typography>}
              </Box>
              <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap', fontSize: '0.62rem' }}>
                {new Date(e.logged_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </Typography>
              <Tooltip title="Remover">
                <IconButton size="small" onClick={() => handleDelete(e.id)} sx={{ p: 0.25, opacity: 0.4, '&:hover': { opacity: 1 } }}>
                  <IconXMark size={13} />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/* ─── Status Timeline ─────────────────────────────────────────── */

const STATUS_DOT_COLOR: Record<string, string> = {
  intake: '#29ABE2', planned: '#29ABE2', ready: '#29ABE2',
  allocated: '#13DEB9', in_progress: '#13DEB9', in_review: '#13DEB9',
  awaiting_approval: '#FFAE1F', approved: '#FFAE1F', scheduled: '#FFAE1F',
  blocked: '#FA896B',
  published: '#13DEB9', done: '#13DEB9',
};

function StatusTimeline({ history }: { history: NonNullable<OperationsJob['history']> }) {
  const items = [...history].reverse().slice(0, 12); // newest first
  return (
    <Box>
      {items.map((item, idx) => {
        const color = STATUS_DOT_COLOR[item.to_status] || '#94a3b8';
        const isLast = idx === items.length - 1;
        return (
          <Box key={item.id} sx={{ display: 'flex', gap: 1.5 }}>
            {/* dot + line */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0, mt: 0.5, boxShadow: `0 0 0 3px ${color}28` }} />
              {!isLast && <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', my: 0.5 }} />}
            </Box>
            {/* content */}
            <Box sx={{ pb: isLast ? 0 : 1.5, minWidth: 0, flex: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={0.5}>
                <Box>
                  {item.from_status && (
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', display: 'block', lineHeight: 1 }}>
                      de: {STAGE_LABELS[item.from_status] || item.from_status}
                    </Typography>
                  )}
                  <Typography variant="body2" fontWeight={700} sx={{ color, lineHeight: 1.3 }}>
                    {STAGE_LABELS[item.to_status] || item.to_status}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                  {formatDateTime(item.changed_at)}
                  {item.changed_by_name ? ` · ${item.changed_by_name}` : ''}
                </Typography>
              </Stack>
              {item.reason && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontStyle: 'italic' }}>
                  {item.reason}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/* ─── Compact Kanban (Quick View) ────────────────────────────── */

function JobFlowKanban({
  job,
  submitting,
  onChange,
}: {
  job: OperationsJob;
  submitting: boolean;
  onChange: (status: string) => void;
}) {
  const blocked = job.status === 'blocked';
  const activeIndex = getStageIndex(job.status);
  const currentListName = String(job.metadata?.list_name || '').trim();

  return (
    <Box sx={(theme) => ({
      p: 1.25,
      borderRadius: 2,
      border: '1px solid',
      borderColor: alpha(theme.palette.primary.main, 0.16),
      bgcolor: alpha(theme.palette.primary.main, 0.03),
    })}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: 0.45, lineHeight: 1 }}>
          Etapa do fluxo
        </Typography>
        {currentListName && (
          <Chip size="small" variant="outlined" color="primary" label={`Trello · ${currentListName}`} sx={{ fontWeight: 700, height: 18, fontSize: '0.62rem' }} />
        )}
        {blocked && (
          <Chip size="small" color="warning" label="Pausado" sx={{ fontWeight: 700, height: 18, fontSize: '0.62rem' }} />
        )}
      </Stack>
      <Box sx={{ overflowX: 'auto', pb: 0.25, mx: -0.25 }}>
        <Stack direction="row" spacing={0.5} sx={{ minWidth: 'max-content', px: 0.25 }}>
          {STAGE_FLOW.map((stage, index) => {
            const isCurrent = job.status === stage.key;
            const isDone = !blocked && index < activeIndex;
            const disabled = submitting || isCurrent;
            const dotColor = isCurrent ? '#ff6600' : isDone ? '#13DEB9' : '#e4e4e7';
            return (
              <Box
                key={stage.key}
                component="button"
                type="button"
                disabled={disabled}
                onClick={() => { if (!disabled) onChange(stage.key); }}
                sx={(theme) => ({
                  appearance: 'none',
                  textAlign: 'center',
                  width: 76,
                  flexShrink: 0,
                  py: 0.75,
                  px: 0.5,
                  borderRadius: 1.5,
                  border: '1.5px solid',
                  borderColor: isCurrent ? '#ff6600' : isDone ? alpha('#13DEB9', 0.4) : alpha(theme.palette.text.primary, 0.1),
                  bgcolor: isCurrent ? 'rgba(255,102,0,0.08)' : isDone ? alpha('#13DEB9', 0.06) : theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.55) : '#fff',
                  cursor: disabled ? 'default' : 'pointer',
                  transition: 'all 130ms ease',
                  '&:hover': disabled ? undefined : {
                    borderColor: '#ff6600',
                    bgcolor: 'rgba(255,102,0,0.06)',
                  },
                  '&:disabled': { opacity: isCurrent ? 1 : 0.85 },
                })}
              >
                <Stack spacing={0.3} alignItems="center">
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: dotColor, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto' }}>
                    {isDone && <IconCheck size={9} color="#fff" />}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: isCurrent ? 900 : 600, fontSize: '0.62rem', color: isCurrent ? '#ff6600' : 'text.primary', lineHeight: 1.2, display: 'block' }}>
                    {stage.label}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}

/* ─── Types hoisted for use in sub-components ────────────────── */

type AllocationProposal = {
  freelancerId: string;
  name: string;
  specialty: string | null;
  experienceLevel: string | null;
  score: number;
  estimatedMinutes: number;
  estimatedAvailableAt: string;
  estimatedCompletionAt: string;
  currentActiveJobs: number;
  maxConcurrentJobs: number;
  punctualityScore: number | null;
  approvalRate: number | null;
  jobsCompleted: number;
  rationale: string;
  skills?: Array<{ id: string; label: string; level: string }>;
};

/* ─── Deadline countdown ─────────────────────────────────────── */

function DeadlineBar({ deadline_at, is_urgent }: { deadline_at?: string | null; is_urgent?: boolean }) {
  if (!deadline_at) return null;
  const daysLeft = Math.ceil((new Date(deadline_at).getTime() - Date.now()) / 86_400_000);
  const color = daysLeft < 0 ? '#FA896B' : daysLeft <= 2 ? '#FA896B' : daysLeft <= 5 ? '#FFAE1F' : '#13DEB9';
  const label = daysLeft < 0
    ? `Atrasado ${Math.abs(daysLeft)}d`
    : daysLeft === 0 ? 'Vence hoje'
    : daysLeft === 1 ? 'Vence amanhã'
    : `${daysLeft}d restantes`;

  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={(theme) => ({
      px: 1.5, py: 0.875, borderRadius: 2,
      bgcolor: alpha(color, 0.08),
      border: `1px solid ${alpha(color, 0.25)}`,
    })}>
      <IconCalendar size={15} color={color} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" fontWeight={900} sx={{ color, display: 'block', fontSize: '0.76rem' }}>
          {label}{is_urgent ? ' · URGENTE' : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
          {new Date(deadline_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
    </Stack>
  );
}

/* ─── Copy preview (approved draft inline) ───────────────────── */

function CopyPreviewInline({ jobId }: { jobId: string }) {
  const [draft, setDraft] = useState<Pick<CreativeDraft, 'hook_text' | 'content_text' | 'cta_text'> | null>(null);

  useEffect(() => {
    apiGet<{ data: CreativeDraft[] }>(`/jobs/${jobId}/creative-drafts`)
      .then((res) => {
        const approved = (res.data ?? []).find(
          (d) => d.draft_type === 'copy' && (d.approval_status === 'approved' || d.status === 'done'),
        );
        if (approved) setDraft({ hook_text: approved.hook_text, content_text: approved.content_text, cta_text: approved.cta_text });
      })
      .catch(() => undefined);
  }, [jobId]);

  if (!draft) return null;

  return (
    <Box sx={(theme) => ({
      mt: 0.75, p: 1.25, borderRadius: 1.5,
      bgcolor: alpha('#13DEB9', 0.05),
      border: `1px solid ${alpha('#13DEB9', 0.2)}`,
    })}>
      {draft.hook_text && (
        <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 0.3, fontSize: '0.72rem', color: 'text.primary' }}>
          {draft.hook_text}
        </Typography>
      )}
      {draft.content_text && (
        <Typography variant="caption" color="text.secondary" sx={{
          fontSize: '0.7rem', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {draft.content_text}
        </Typography>
      )}
      {draft.cta_text && (
        <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mt: 0.4, fontSize: '0.68rem', color: '#13DEB9' }}>
          CTA: {draft.cta_text}
        </Typography>
      )}
    </Box>
  );
}

/* ─── DA Assignment Block ─────────────────────────────────────── */

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function avatarBg(name: string) {
  const palette = ['#5D87FF', '#E85219', '#13DEB9', '#FFAE1F', '#FA896B', '#9B59B6', '#2ECC71'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function DAAssignmentBlock({
  job,
  allProposals,
  onAssign,
  onTakeOwnership,
  submitting,
  currentUserId,
}: {
  job: OperationsJob;
  allProposals: AllocationProposal[];
  onAssign: (id: string) => void;
  onTakeOwnership: () => void;
  submitting: boolean;
  currentUserId?: string | null;
}) {
  const [picking, setPicking] = useState(!job.owner_id);

  // Reset to "show picker" if job loses its owner
  useEffect(() => {
    if (!job.owner_id) setPicking(true);
  }, [job.owner_id]);

  // Only DAs who still have capacity
  const available = allProposals.filter(
    (p) => p.currentActiveJobs < p.maxConcurrentJobs && p.freelancerId !== job.owner_id,
  );

  return (
    <Box sx={(theme) => ({
      p: 1.5, borderRadius: 2,
      border: `1px solid ${alpha(theme.palette.divider, 1)}`,
      bgcolor: theme.palette.background.paper,
    })}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
        <Typography variant="caption" fontWeight={900} sx={{ textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 0.5, color: 'text.secondary' }}>
          DA responsável
        </Typography>
        {job.owner_id && !picking && (
          <Button size="small" variant="text" onClick={() => setPicking(true)} disabled={submitting}
            sx={{ fontSize: '0.65rem', py: 0, minWidth: 'unset' }}>
            Trocar
          </Button>
        )}
      </Stack>

      {/* Current assignee */}
      {job.owner_id && !picking ? (
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: avatarBg(job.owner_name || ''), fontSize: '0.72rem', fontWeight: 800 }}>
            {initials(job.owner_name || '?')}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>{job.owner_name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
              Responsável atual
            </Typography>
          </Box>
        </Stack>
      ) : (
        /* Picker — only available DAs */
        <Stack spacing={0.625}>
          {/* "Assumir eu mesmo" */}
          {!job.owner_id && currentUserId && (
            <Box
              component="button"
              type="button"
              disabled={submitting}
              onClick={() => { onTakeOwnership(); setPicking(false); }}
              sx={(theme) => ({
                appearance: 'none', textAlign: 'left', width: '100%', cursor: 'pointer',
                p: 0.875, borderRadius: 1.5,
                border: `1px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                '&:disabled': { opacity: 0.5 },
              })}
            >
              <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ fontSize: '0.72rem' }}>
                ↩ Assumir eu mesmo
              </Typography>
            </Box>
          )}

          {available.length === 0 && allProposals.length > 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem', py: 0.5 }}>
              Todos os DAs estão com capacidade cheia no momento.
            </Typography>
          )}
          {available.length === 0 && allProposals.length === 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem', py: 0.5 }}>
              Carregando disponibilidade…
            </Typography>
          )}

          {available.map((p) => {
            const slotsLeft = p.maxConcurrentJobs - p.currentActiveJobs;
            const bg = avatarBg(p.name);
            const availNow = new Date(p.estimatedAvailableAt) <= new Date();
            const scoreColor = p.score >= 85 ? '#13DEB9' : p.score >= 65 ? '#5D87FF' : p.score >= 50 ? '#FFAE1F' : '#B0BEC5';
            return (
              <Box
                key={p.freelancerId}
                component="button"
                type="button"
                disabled={submitting}
                onClick={() => { onAssign(p.freelancerId); setPicking(false); }}
                sx={(theme) => ({
                  appearance: 'none', textAlign: 'left', width: '100%', cursor: 'pointer',
                  p: 0.875, borderRadius: 1.5,
                  border: `1px solid ${alpha(theme.palette.divider, 1)}`,
                  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : '#fafafa',
                  transition: 'all 130ms ease',
                  '&:hover': { borderColor: '#ff6600', bgcolor: 'rgba(255,102,0,0.04)' },
                  '&:disabled': { opacity: 0.5 },
                })}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1.25}>
                  <Avatar sx={{ width: 30, height: 30, bgcolor: bg, fontSize: '0.65rem', fontWeight: 800, flexShrink: 0, mt: 0.25 }}>
                    {initials(p.name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.1 }}>
                      <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.75rem' }}>{p.name}</Typography>
                      <Box sx={{
                        px: 0.6, py: 0.05, borderRadius: 0.75,
                        bgcolor: alpha(scoreColor, 0.15), color: scoreColor,
                        fontSize: '0.6rem', fontWeight: 800, lineHeight: 1.6, flexShrink: 0,
                      }}>
                        {p.score}
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>
                      {p.specialty || 'Freelancer'} · {p.currentActiveJobs}/{p.maxConcurrentJobs} jobs
                    </Typography>
                    {p.rationale && (
                      <Typography variant="caption" color="text.disabled" sx={{
                        fontSize: '0.6rem', display: 'block', mt: 0.25,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {p.rationale}
                      </Typography>
                    )}
                  </Box>
                  <Stack alignItems="flex-end" spacing={0.25} sx={{ flexShrink: 0 }}>
                    <Chip
                      size="small"
                      label={availNow ? 'Disponível' : 'Em breve'}
                      color={availNow ? 'success' : 'warning'}
                      sx={{ height: 18, fontSize: '0.58rem', fontWeight: 700 }}
                    />
                    {slotsLeft > 0 && (
                      <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>
                        {slotsLeft} vaga{slotsLeft > 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Box>
            );
          })}

          {picking && job.owner_id && (
            <Button size="small" variant="text" onClick={() => setPicking(false)} sx={{ alignSelf: 'flex-start', fontSize: '0.65rem', py: 0.25 }}>
              Cancelar
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}

/* ─── Job Journey Panel (Quick View) ─────────────────────────── */

const JOURNEY_STATUS_ORDER = ['intake', 'planned', 'ready', 'allocated', 'in_progress', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'done', 'archived'];

function JobJourneyPanel({
  job,
  directives,
  allProposals,
  onTakeOwnership,
  onAssignOwner,
  onStatusChange,
  submitting,
  currentUserId,
}: {
  job: OperationsJob;
  directives: Array<{ id: string; directive_type: 'boost' | 'avoid'; directive: string }>;
  allProposals: AllocationProposal[];
  onTakeOwnership: () => void;
  onAssignOwner: (id: string) => void;
  onStatusChange: (s: string) => void;
  submitting: boolean;
  currentUserId?: string | null;
}) {
  const idx = JOURNEY_STATUS_ORDER.indexOf(job.status);
  const past = (s: string) => idx >= JOURNEY_STATUS_ORDER.indexOf(s);

  const hasAuto = Boolean(job.automation_status && job.automation_status !== 'none');
  const briefingDone = hasAuto && job.automation_status !== 'briefing_pending';
  const copyActive = ['copy_generating', 'copy_pending'].includes(job.automation_status ?? '');
  const copyDone = ['copy_done', 'copy_approved'].includes(job.automation_status ?? '');

  type StepDef = {
    id: string;
    label: string;
    icon: React.ReactNode;
    status: 'done' | 'active' | 'pending';
    detail: string;
    href?: string;
    action?: { label: string; fn: () => void };
  };

  const steps: StepDef[] = [
    {
      id: 'briefing',
      label: 'Briefing do cliente',
      icon: <IconFileText size={13} />,
      status: briefingDone ? 'done' : hasAuto ? 'active' : 'pending',
      detail: briefingDone ? 'Aprovado e completo' : hasAuto ? 'Aguardando aprovação' : 'Ainda não iniciado',
      href: `/admin/operacoes/jobs/${job.id}/briefing`,
    },
    {
      id: 'copy',
      label: 'Copy / Produção',
      icon: <IconBrush size={13} />,
      status: copyDone ? 'done' : copyActive ? 'active' : past('in_progress') ? 'active' : 'pending',
      detail: copyDone ? 'Pronto para revisão' : copyActive ? 'Sendo gerado pelo Jarvis…' : past('in_progress') ? 'Em produção' : 'Não iniciado',
      href: `/studio?jobId=${job.id}`,
    },
    {
      id: 'approval',
      label: 'Aprovação',
      icon: <IconThumbUp size={13} />,
      status: past('approved') ? 'done' : past('awaiting_approval') ? 'active' : 'pending',
      detail: past('approved') ? 'Aprovado pelo cliente' : past('awaiting_approval') ? 'Aguardando aprovação do cliente' : 'Ainda não chegou aqui',
    },
    {
      id: 'debrief',
      label: 'Debriefing',
      icon: <IconCalendar size={13} />,
      status: past('published') ? 'done' : past('scheduled') ? 'active' : 'pending',
      detail: past('published') ? 'Reunião realizada' : past('scheduled') ? 'Agendar com o cliente' : 'Após publicação',
      href: past('scheduled') ? '/admin/reunioes' : undefined,
    },
    {
      id: 'delivery',
      label: 'Entrega',
      icon: <IconCircleCheck size={13} />,
      status: past('done') ? 'done' : past('published') ? 'active' : 'pending',
      detail: job.status === 'done' ? 'Job concluído' : job.status === 'published' ? 'Publicado e monitorando' : 'Pendente',
    },
  ];

  const briefingSummary = String(job.summary || '').trim();

  return (
    <Stack spacing={2}>
      {/* Compact kanban — change status without leaving the popup */}
      <JobFlowKanban job={job} submitting={submitting} onChange={onStatusChange} />

      {/* Prazo visual */}
      <DeadlineBar deadline_at={job.deadline_at} is_urgent={job.is_urgent} />

      {/* DA responsável + picker com disponibilidade */}
      <DAAssignmentBlock
        job={job}
        allProposals={allProposals}
        onAssign={onAssignOwner}
        onTakeOwnership={onTakeOwnership}
        submitting={submitting}
        currentUserId={currentUserId}
      />

      {/* Journey timeline */}
      <Box sx={{ position: 'relative', pl: 0.5 }}>
        <Box sx={{ position: 'absolute', left: 9, top: 12, bottom: 12, width: '1px', bgcolor: 'divider' }} />
        <Stack spacing={0}>
          {steps.map((step) => {
            const dotColor = step.status === 'done' ? '#13DEB9' : step.status === 'active' ? '#ff6600' : '#e4e4e7';
            const isActive = step.status === 'active';
            return (
              <Stack key={step.id} direction="row" alignItems="flex-start" spacing={1.5} sx={{ py: 1.1, position: 'relative' }}>
                <Box sx={{
                  width: 20, height: 20, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.15, zIndex: 1,
                  boxShadow: isActive ? '0 0 0 3px rgba(255,102,0,0.18)' : 'none',
                }}>
                  {step.status === 'done' && <IconCheck size={11} color="#fff" />}
                  {step.status === 'active' && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff' }} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={isActive ? 800 : step.status === 'done' ? 600 : 500}
                        sx={{ color: step.status === 'pending' ? 'text.disabled' : 'text.primary', fontSize: '0.8rem', lineHeight: 1.3 }}
                      >
                        {step.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: isActive ? '#ff6600' : 'text.secondary', fontWeight: isActive ? 700 : 400, fontSize: '0.72rem' }}
                      >
                        {step.detail}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, mt: 0.15 }}>
                      {step.action && (
                        <Button size="small" variant="outlined" onClick={step.action.fn} disabled={submitting}
                          sx={{ fontSize: '0.68rem', py: 0.25, px: 0.75, minWidth: 'unset', lineHeight: 1.4 }}>
                          {step.action.label}
                        </Button>
                      )}
                      {step.href && !step.action && (
                        <Button component={Link} href={step.href} size="small" variant="text"
                          sx={{ fontSize: '0.68rem', py: 0.25, px: 0.75, minWidth: 'unset', color: isActive ? '#ff6600' : 'primary.main', lineHeight: 1.4 }}>
                          Abrir →
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                  {/* Copy preview when copy is done */}
                  {step.id === 'copy' && copyDone && <CopyPreviewInline jobId={job.id} />}
                </Box>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      {/* Briefing / contexto que chegou com a demanda */}
      {briefingSummary && (
        <Box sx={(theme) => ({
          p: 1.5, borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
          bgcolor: alpha(theme.palette.info.main, 0.04),
        })}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
            <Typography variant="caption" fontWeight={900} sx={{ color: 'info.main', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 0.5 }}>
              {job.source === 'trello' ? 'Briefing do Trello' : 'Resumo da demanda'}
            </Typography>
            {job.metadata?.trello_url && (
              <Button size="small" variant="text" color="info" component="a" href={String(job.metadata.trello_url)} target="_blank" rel="noreferrer"
                sx={{ fontSize: '0.65rem', py: 0, px: 0.5, minWidth: 'unset' }}>
                Abrir →
              </Button>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{
            fontSize: '0.72rem', lineHeight: 1.5, whiteSpace: 'pre-line',
            display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {briefingSummary}
          </Typography>
        </Box>
      )}

      {/* Radar de Comunicação */}
      {directives.length > 0 && (
        <Box sx={(theme) => ({
          p: 1.5, borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
          bgcolor: alpha(theme.palette.warning.main, 0.04),
        })}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
            <IconShieldCheck size={13} color="#E85219" />
            <Typography variant="caption" fontWeight={900} sx={{ color: '#E85219', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 0.5 }}>
              Radar de Comunicação · {directives.length} {directives.length === 1 ? 'regra' : 'regras'} ativas
            </Typography>
          </Stack>
          <Stack spacing={0.35}>
            {directives.slice(0, 4).map((d) => (
              <Typography key={d.id} variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.4, color: d.directive_type === 'boost' ? 'success.dark' : 'error.dark' }}>
                {d.directive_type === 'boost' ? '✅' : '🚫'} {d.directive}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}

      {/* Quick links */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button component={Link} href={`/studio?jobId=${job.id}`} size="small" variant="outlined" startIcon={<IconBrush size={14} />} sx={{ fontSize: '0.72rem' }}>
          Abrir Studio
        </Button>
        {job.client_id && (
          <Button component={Link} href={`/clients/${job.client_id}`} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }}>
            Ver cliente
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

export default function JobWorkbenchDrawer({
  open,
  mode,
  job,
  initialComposerPath,
  presentation,
  jobTypes,
  skills,
  channels,
  clients,
  owners,
  currentUserId,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onStatusChange,
  onFetchDetail,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  job: OperationsJob | null;
  initialComposerPath?: ComposerPath;
  presentation?: 'drawer' | 'modal';
  jobTypes: OperationsLookup[];
  skills: OperationsLookup[];
  channels: OperationsLookup[];
  clients: Array<{ id: string; name: string }>;
  owners: OperationsOwner[];
  currentUserId?: string | null;
  onClose: () => void;
  onCreate: (payload: Record<string, any>) => Promise<OperationsJob>;
  onUpdate: (jobId: string, payload: Record<string, any>) => Promise<OperationsJob>;
  onDelete?: (jobId: string) => Promise<void>;
  onStatusChange: (jobId: string, status: string, reason?: string | null) => Promise<OperationsJob>;
  onFetchDetail?: (jobId: string) => Promise<OperationsJob>;
}) {
  const [form, setForm] = useState<JobDraft>(() => buildDraft(job, { jobTypes }));
  const [composerPath, setComposerPath] = useState<ComposerPath>('client_request');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [error, setError] = useState('');
  const [detailJob, setDetailJob] = useState<OperationsJob | null>(job);
  const [clientDirectives, setClientDirectives] = useState<Array<{ id: string; directive_type: 'boost' | 'avoid'; directive: string }>>([]);
  const [directivesOpen, setDirectivesOpen] = useState(true);

  // ── Allocation proposals ──
  type CalibratedEstimate = {
    median: number;
    p25: number;
    p75: number;
    confidence: 'high' | 'medium' | 'low' | 'none';
    sampleCount: number;
  };
  const [allocationProposals, setAllocationProposals] = useState<AllocationProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [calibratedEstimate, setCalibratedEstimate] = useState<CalibratedEstimate | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(buildDraft(job, { jobTypes }));
    setComposerPath(initialComposerPath ?? 'client_request');
    setDetailJob(job);
    setError('');
    setDeleteConfirmOpen(false);
    setDeleteConfirmation('');
  }, [initialComposerPath, open, job, jobTypes]);

  useEffect(() => {
    if (!open || mode !== 'edit' || !job?.id || !onFetchDetail) return;
    let cancelled = false;
    onFetchDetail(job.id)
      .then((data) => {
        if (!cancelled) {
          setDetailJob(data);
          setForm(buildDraft(data, { jobTypes }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, mode, job?.id, onFetchDetail, jobTypes]);

  useEffect(() => {
    setClientDirectives([]);
    if (!form.client_id) return;
    let cancelled = false;
    apiGet<{ success: boolean; data: Array<{ id: string; directive_type: 'boost' | 'avoid'; directive: string }> }>(
      `/clients/${form.client_id}/directives`
    ).then((res) => {
      if (!cancelled) setClientDirectives(res?.data ?? []);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [form.client_id]);

  useEffect(() => {
    setAllocationProposals([]);
    if (mode !== 'edit' || !detailJob?.id) return;
    let cancelled = false;
    setLoadingProposals(true);
    apiGet<{ data: AllocationProposal[] }>(`/jobs/${detailJob.id}/allocation-proposals`)
      .then((res) => { if (!cancelled) setAllocationProposals(res?.data ?? []); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoadingProposals(false); });
    return () => { cancelled = true; };
  }, [mode, detailJob?.id, form.required_skill]);

  useEffect(() => {
    if (!open || !form.job_type) { setCalibratedEstimate(null); return; }
    let cancelled = false;
    const complexity = form.complexity === 's' ? 'low' : form.complexity === 'l' ? 'high' : 'medium';
    apiGet<{ data: CalibratedEstimate | null }>(`/jobs/calibration/estimate?job_type=${encodeURIComponent(form.job_type)}&complexity=${complexity}`)
      .then((res) => { if (!cancelled) setCalibratedEstimate(res?.data ?? null); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [open, form.job_type, form.complexity]);

  const selectedClient = clients.find((item) => item.id === form.client_id) || null;
  const selectedOwner = owners.find((item) => item.id === form.owner_id) || null;
  const selectedType = jobTypes.find((item) => item.code === form.job_type) || null;
  const selectedComposer = COMPOSER_PATHS.find((item) => item.key === composerPath) || COMPOSER_PATHS[0];

  const estimatePreview = useMemo(
    () => estimateJobMinutes({ jobType: form.job_type, complexity: form.complexity, channel: form.channel }),
    [form.channel, form.complexity, form.job_type]
  );

  const intakeComplete = isIntakeComplete({
    client_id: form.client_id,
    job_type: form.job_type,
    complexity: form.complexity,
    source: form.source,
    deadline_at: toIsoDateTime(form.deadline_at),
    required_skill: form.required_skill,
    owner_id: form.owner_id,
  });

  const priorityPreview = useMemo(
    () => calculatePriorityPreview({
      deadlineAt: toIsoDateTime(form.deadline_at),
      impactLevel: form.impact_level,
      dependencyLevel: form.dependency_level,
      isUrgent: form.is_urgent,
      intakeComplete,
      blocked: detailJob?.status === 'blocked',
    }),
    [detailJob?.status, form.deadline_at, form.dependency_level, form.impact_level, form.is_urgent, intakeComplete]
  );

  const payload = {
    client_id: form.client_id,
    title: form.title.trim(),
    summary: form.summary.trim() || null,
    job_type: form.job_type,
    complexity: form.complexity,
    job_size: form.job_size || null,
    channel: form.channel,
    source: form.source,
    impact_level: form.impact_level,
    dependency_level: form.dependency_level,
    required_skill: form.required_skill,
    owner_id: form.owner_id,
    assignee_ids: form.assignee_ids,
    external_link: form.external_link.trim() || null,
    deadline_at: toIsoDateTime(form.deadline_at),
    is_urgent: form.is_urgent,
    urgency_reason: form.is_urgent ? form.urgency_reason.trim() || null : null,
    definition_of_done: form.definition_of_done.trim() || null,
  };

  const handleChange = <K extends keyof JobDraft>(field: K, value: JobDraft[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleComposerPath = (path: ComposerPath) => {
    const preset = COMPOSER_PATHS.find((item) => item.key === path);
    if (!preset) return;
    setComposerPath(path);
    setForm((current) => ({
      ...current,
      source: preset.source,
      job_type: pickPreferredJobType(jobTypes, preset.preferredTypes),
      definition_of_done: current.definition_of_done.trim() ? current.definition_of_done : preset.definitionOfDone,
      impact_level: path === 'client_request' ? Math.max(current.impact_level, 3) : current.impact_level,
      dependency_level: path === 'briefing' ? Math.max(current.dependency_level, 3) : current.dependency_level,
    }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = mode === 'create'
        ? await onCreate(payload)
        : await onUpdate(detailJob!.id, payload);
      setDetailJob(result);
      if (mode === 'create') {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar demanda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (targetStatus: string) => {
    if (!detailJob) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await onStatusChange(detailJob.id, targetStatus);
      setDetailJob(result);
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar etapa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeOwnership = async () => {
    if (!currentUserId || !detailJob) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await onUpdate(detailJob.id, { owner_id: currentUserId });
      setDetailJob(result);
      setForm((current) => ({ ...current, owner_id: currentUserId }));
    } catch (err: any) {
      setError(err?.message || 'Falha ao assumir a demanda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignOwner = async (ownerId: string) => {
    if (!detailJob) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await onUpdate(detailJob.id, { owner_id: ownerId });
      setDetailJob(result);
      setForm((current) => ({
        ...current,
        owner_id: ownerId,
        assignee_ids: current.assignee_ids.includes(ownerId) ? current.assignee_ids : [...current.assignee_ids, ownerId],
      }));
    } catch (err: any) {
      setError(err?.message || 'Falha ao trocar o responsavel.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!detailJob || !onDelete) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete(detailJob.id);
      setDeleteConfirmOpen(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao excluir demanda.');
    } finally {
      setDeleting(false);
    }
  };

  const progressTarget = nextStatus(detailJob, intakeComplete);
  const nextAction = getNextAction(detailJob || { ...payload, priority_band: priorityPreview.priorityBand } as Partial<OperationsJob>);
  const detailRisk = detailJob ? getRisk(detailJob) : null;
  const demandBriefing = String(detailJob?.summary || '').trim();
  const missingDecisionItems = getMissingDecisionItems(form);
  const createReady = Boolean(form.title.trim()) && missingDecisionItems.length === 0;
  const quickAllocationOptions = allocationProposals
    .filter((proposal) => proposal.freelancerId !== detailJob?.owner_id)
    .slice(0, 2);
  const saveLabel = submitting
    ? 'Salvando...'
    : mode === 'create'
      ? (createReady ? 'Entrar na fila' : 'Salvar rascunho')
      : 'Salvar mudancas';
  const isQuickView = presentation === 'modal' && mode === 'edit';

  return (
    <ContextDrawer
      open={open}
      presentation={presentation}
      title={mode === 'create' ? selectedComposer.title : cleanJobTitle(detailJob?.title || 'Demanda operacional', detailJob?.client_name)}
      subtitle={mode === 'create'
        ? selectedComposer.subtitle
        : `${selectedClient?.name || detailJob?.client_name || 'Sem cliente'} · ${STAGE_LABELS[detailJob?.status || 'intake'] || 'Na fila'} · ${formatSourceLabel(detailJob?.source || form.source)}`}
      onClose={onClose}
      actions={
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <PriorityPill priorityBand={priorityPreview.priorityBand} />
            {detailJob ? <RiskFlag job={detailJob} /> : <Chip size="small" color="info" label="Beta guiado" />}
            {detailJob ? <Chip size="small" variant="outlined" label={detailJob.status} /> : null}
            {calibratedEstimate && calibratedEstimate.confidence !== 'none' ? (
              <Tooltip title={`${calibratedEstimate.sampleCount} jobs históricos · P25 ${formatMinutes(calibratedEstimate.p25)} → P75 ${formatMinutes(calibratedEstimate.p75)}`} arrow>
                <Chip
                  size="small"
                  icon={<IconSparkles size={12} />}
                  label={`Real ${formatMinutes(calibratedEstimate.median)}`}
                  sx={{
                    bgcolor: calibratedEstimate.confidence === 'high' ? 'rgba(19,222,185,0.12)' : 'rgba(245,158,11,0.1)',
                    color: calibratedEstimate.confidence === 'high' ? '#059669' : '#d97706',
                    fontWeight: 700,
                    '& .MuiChip-icon': { color: 'inherit' },
                  }}
                />
              </Tooltip>
            ) : (
              <Chip size="small" label={`Estimativa ${formatMinutes(estimatePreview)}`} />
            )}
          </Stack>
          {mode === 'create' ? (
            <Box
              sx={(theme) => ({
                p: 1.5,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: createReady
                  ? alpha(theme.palette.success.main, 0.28)
                  : alpha(theme.palette.warning.main, 0.28),
                bgcolor: createReady
                  ? alpha(theme.palette.success.main, 0.06)
                  : alpha(theme.palette.warning.main, 0.06),
              })}
            >
              <Stack spacing={1}>
                <Typography
                  variant="caption"
                  fontWeight={900}
                  sx={{ color: createReady ? 'success.dark' : 'warning.dark', textTransform: 'uppercase', letterSpacing: 0.3 }}
                >
                  {createReady ? 'Pronta para entrar na fila' : 'Falta decidir'}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {createReady
                    ? 'A demanda ja tem cliente, dono, especialidade e prazo para entrar na operacao sem travar.'
                    : 'Feche os pontos abaixo para a Central entender para quem vai, quando vence e o quanto pesa na semana.'}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  <Chip size="small" color="info" label={selectedComposer.title} />
                  {createReady ? (
                    <>
                      <Chip size="small" color="success" label="Vai para a Fila" />
                      <Chip size="small" color="success" label="Aparece na Semana" />
                      <Chip size="small" color="success" label="Ja entra com dono" />
                    </>
                  ) : (
                    missingDecisionItems.map((item) => (
                      <Chip key={item} size="small" color="warning" variant="outlined" label={formatMissingDecisionLabel(item)} />
                    ))
                  )}
                </Stack>
              </Stack>
            </Box>
          ) : detailJob ? (
            <Stack spacing={1.5}>
              {!isQuickView && (
                <JobFlowKanban
                  job={{ ...detailJob, ...payload, priority_band: priorityPreview.priorityBand, owner_name: selectedOwner?.name || detailJob.owner_name }}
                  submitting={submitting}
                  onChange={handleStatusChange}
                />
              )}
              <NextActionBar
                job={{ ...detailJob, ...payload, priority_band: priorityPreview.priorityBand, owner_name: selectedOwner?.name || detailJob.owner_name }}
                onPrimaryAction={progressTarget ? () => handleStatusChange(progressTarget) : undefined}
                primaryLabel={progressTarget ? nextAction.label : undefined}
              />
            </Stack>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      }
    >
      <Stack spacing={isQuickView ? 2.25 : 3}>
        {detailJob?.status === 'blocked' ? <BlockReason reason={detailJob.urgency_reason || 'Bloqueio ativo na etapa atual.'} onResolve={() => handleStatusChange(intakeComplete ? 'ready' : 'planned')} /> : null}

        {!isQuickView && mode === 'create' ? (
          <Box
            sx={(theme) => ({
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.16),
              bgcolor: alpha(theme.palette.primary.main, 0.03),
            })}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: 0.5 }}>
                  COMO ESSA DEMANDA ENTRA
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  Escolha o caminho mais parecido com o que chegou na agencia
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Isso ja organiza origem, tipo sugerido e o jeito certo de descrever a entrada.
                </Typography>
              </Box>
              <Grid container spacing={1.5}>
                {COMPOSER_PATHS.map((path) => {
                  const active = composerPath === path.key;
                  return (
                    <Grid key={path.key} size={{ xs: 12, md: 6 }}>
                      <Box
                        onClick={() => handleComposerPath(path.key)}
                        sx={(theme) => ({
                          cursor: 'pointer',
                          p: 1.5,
                          borderRadius: 2.5,
                          border: '1px solid',
                          borderColor: active ? alpha(theme.palette.primary.main, 0.4) : alpha(theme.palette.divider, 0.9),
                          bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.background.paper, 0.6),
                          transition: 'all 160ms ease',
                          '&:hover': {
                            borderColor: alpha(theme.palette.primary.main, 0.34),
                            bgcolor: alpha(theme.palette.primary.main, 0.06),
                          },
                        })}
                      >
                        <Stack spacing={1.2}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                              sx={(theme) => ({
                                width: 34,
                                height: 34,
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: alpha(theme.palette.primary.main, active ? 0.16 : 0.1),
                                color: 'primary.main',
                                border: `1px solid ${alpha(theme.palette.primary.main, active ? 0.3 : 0.18)}`,
                              })}
                            >
                              {path.icon}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={800}>
                                {path.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {path.subtitle}
                              </Typography>
                            </Box>
                            {active ? <Chip size="small" color="primary" label="Selecionado" /> : null}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                            {path.helper}
                          </Typography>
                        </Stack>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          </Box>
        ) : null}

        {!isQuickView ? (
        <GuidedFormSection
          title="O que entrou"
          subtitle={mode === 'create' ? 'Nomeie o pedido, diga de onde veio e deixe o contexto claro.' : 'Ajuste o pedido, a origem e o combinado do que precisa ficar pronto.'}
          completed={Boolean(form.client_id && form.title.trim() && form.job_type && form.source)}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                options={clients}
                value={selectedClient}
                onChange={(_event, value) => handleChange('client_id', value?.id || null)}
                getOptionLabel={(option) => option.name}
                renderInput={(params) => <TextField {...params} label="Cliente" />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth label="Tipo de trabalho" value={form.job_type} onChange={(event) => handleChange('job_type', event.target.value)}>
                {jobTypes.map((item) => (
                  <MenuItem key={item.code} value={item.code}>{item.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Titulo"
                value={form.title}
                onChange={(event) => handleChange('title', event.target.value)}
                placeholder={mode === 'create' ? selectedComposer.titlePlaceholder : undefined}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth label="Origem" value={form.source} onChange={(event) => handleChange('source', event.target.value)}>
                {SOURCE_OPTIONS.map((item) => (
                  <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Critério de conclusão"
                fullWidth
                value={form.definition_of_done}
                onChange={(event) => handleChange('definition_of_done', event.target.value)}
                placeholder={mode === 'create'
                  ? selectedComposer.definitionOfDone
                  : selectedType?.default_definition_of_done || 'O que precisa acontecer para esta demanda ser considerada pronta?'}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Resumo operacional"
                value={form.summary}
                onChange={(event) => handleChange('summary', event.target.value)}
                placeholder={mode === 'create'
                  ? selectedComposer.summaryPlaceholder
                  : 'Explique o contexto do pedido com o minimo necessario para producao e decisao.'}
              />
            </Grid>
          </Grid>
        </GuidedFormSection>
        ) : null}

        {!isQuickView && clientDirectives.length > 0 && (
          <Box sx={(theme) => ({
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            bgcolor: alpha(theme.palette.warning.main, 0.04),
            px: 1.5, py: 1,
          })}>
            <Stack direction="row" spacing={0.75} alignItems="center" onClick={() => setDirectivesOpen(!directivesOpen)} sx={{ cursor: 'pointer' }}>
              <IconShieldCheck size={14} color="#E85219" />
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem', flex: 1, color: '#E85219' }}>
                {clientDirectives.length} regra{clientDirectives.length !== 1 ? 's' : ''} permanente{clientDirectives.length !== 1 ? 's' : ''} deste cliente
              </Typography>
              <IconButton size="small" sx={{ p: 0.25 }}>
                {directivesOpen ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
              </IconButton>
            </Stack>
            <Collapse in={directivesOpen}>
              <Stack spacing={0.4} sx={{ mt: 0.75 }}>
                {clientDirectives.map((d) => (
                  <Stack key={d.id} direction="row" spacing={0.75} alignItems="flex-start">
                    <Box sx={{ mt: 0.1, flexShrink: 0, color: d.directive_type === 'boost' ? 'success.main' : 'error.main', fontSize: '0.6rem', fontWeight: 900 }}>
                      {d.directive_type === 'boost' ? '✅' : '🚫'}
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.4 }}>{d.directive}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Collapse>
          </Box>
        )}

        {!isQuickView ? (
        <GuidedFormSection
          title="Quem faz e ate quando"
          subtitle={mode === 'create' ? 'Escolha dono, especialidade e janela de entrega.' : 'Aqui voce decide dono, prazo, urgencia e encaixe na semana.'}
          completed={Boolean(form.owner_id && form.required_skill && form.deadline_at)}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">Tamanho</Typography>
              <ToggleButtonGroup exclusive value={form.job_size} onChange={(_event, value) => value !== null && handleChange('job_size', value)} size="small">
                <ToggleButton value="P" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 700 }}>P</ToggleButton>
                <ToggleButton value="M" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 700 }}>M</ToggleButton>
                <ToggleButton value="G" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 700 }}>G</ToggleButton>
                <ToggleButton value="GG" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 700 }}>GG</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField select fullWidth label="Canal" value={form.channel || ''} onChange={(event) => handleChange('channel', event.target.value || null)}>
                  <MenuItem value="">Sem canal</MenuItem>
                  {channels.map((item) => (
                    <MenuItem key={item.code} value={item.code}>{item.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField select fullWidth label="Especialidade principal" value={form.required_skill || ''} onChange={(event) => handleChange('required_skill', event.target.value || null)}>
                  <MenuItem value="">Definir depois</MenuItem>
                  {skills.map((item) => (
                    <MenuItem key={item.code} value={item.code}>{item.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Prazo"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={form.deadline_at}
                  onChange={(event) => handleChange('deadline_at', event.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Autocomplete
                  options={owners}
                  value={selectedOwner}
                  onChange={(_event, value) => {
                    const newOwnerId = value?.id || null;
                    handleChange('owner_id', newOwnerId);
                    if (newOwnerId && !form.assignee_ids.includes(newOwnerId)) {
                      handleChange('assignee_ids', [...form.assignee_ids, newOwnerId]);
                    }
                  }}
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => <TextField {...params} label="Responsável principal" />}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Stack spacing={0.3}>
                        <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'} · {option.specialty || option.role}
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  multiple
                  options={owners}
                  value={owners.filter((o) => form.assignee_ids.includes(o.id))}
                  onChange={(_event, value) => handleChange('assignee_ids', value.map((v) => v.id))}
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => <TextField {...params} label="Todos os responsáveis" placeholder="Adicionar responsável…" />}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        key={option.id}
                        label={option.name}
                        size="small"
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Link externo (Trello, Drive, Notion…)"
                  value={form.external_link}
                  onChange={(event) => handleChange('external_link', event.target.value)}
                  placeholder="https://"
                />
              </Grid>
              {/* ── Allocation proposals panel ── */}
              {mode === 'edit' && (loadingProposals || allocationProposals.length > 0) && (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5, bgcolor: 'background.paper' }}>
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: loadingProposals ? 1 : 1.25 }}>
                      <IconBolt size={14} color="#E85219" />
                      <Typography variant="caption" fontWeight={700} color="#E85219">
                        Quem alocar? — Top {allocationProposals.length} candidatos
                      </Typography>
                    </Stack>
                    {loadingProposals && <LinearProgress sx={{ borderRadius: 1 }} />}
                    {!loadingProposals && allocationProposals.map((p, idx) => {
                      const scoreColor = p.score >= 75 ? '#059669' : p.score >= 50 ? '#d97706' : '#dc2626';
                      const levelLabel: Record<string, string> = { junior: 'Jr', mid: 'Pl', senior: 'Sr' };
                      const isSelected = form.owner_id === p.freelancerId;
                      const avail = new Date(p.estimatedAvailableAt);
                      const comp = new Date(p.estimatedCompletionAt);
                      const availStr = avail <= new Date() ? 'Disponível agora' : avail.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                      const durH = p.estimatedMinutes >= 60 ? `${Math.round(p.estimatedMinutes / 60)}h` : `${p.estimatedMinutes}min`;
                      return (
                        <Tooltip key={p.freelancerId} title={p.rationale} placement="left" arrow>
                          <Box
                            onClick={() => {
                              const owner = owners.find((o) => o.id === p.freelancerId);
                              if (owner) handleChange('owner_id', owner.id);
                            }}
                            sx={{
                              cursor: 'pointer',
                              p: 1,
                              mb: 0.75,
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: isSelected ? 'rgba(232,82,25,0.5)' : 'divider',
                              bgcolor: isSelected ? 'rgba(232,82,25,0.06)' : 'action.hover',
                              '&:hover': { borderColor: 'rgba(232,82,25,0.4)', bgcolor: 'rgba(232,82,25,0.04)' },
                              transition: 'all 0.15s',
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box sx={{
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                bgcolor: scoreColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Typography variant="caption" fontWeight={800} sx={{ color: '#fff', fontSize: '0.6rem' }}>
                                  {idx === 0 ? '★' : `#${idx + 1}`}
                                </Typography>
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Typography variant="caption" fontWeight={700} noWrap>{p.name}</Typography>
                                  {p.experienceLevel && (
                                    <Chip label={levelLabel[p.experienceLevel] ?? p.experienceLevel} size="small"
                                      sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700 }} />
                                  )}
                                  {p.punctualityScore != null && (
                                    <Chip label={`${Math.round(p.punctualityScore)}%`} size="small"
                                      sx={{ height: 16, fontSize: '0.55rem',
                                        bgcolor: p.punctualityScore >= 85 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                        color: p.punctualityScore >= 85 ? '#059669' : '#d97706' }} />
                                  )}
                                </Stack>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem' }}>
                                  {availStr} · {durH} · {p.currentActiveJobs}/{p.maxConcurrentJobs} jobs ativos
                                </Typography>
                                {p.skills && p.skills.length > 0 && (
                                  <Stack direction="row" spacing={0.4} flexWrap="wrap" useFlexGap sx={{ mt: 0.4 }}>
                                    {p.skills.slice(0, 5).map((sk) => {
                                      const lvlEmoji: Record<string, string> = { ninja: '🧙', pleno: '🚀', junior: '🌱' };
                                      return (
                                        <Chip
                                          key={sk.id}
                                          label={`${lvlEmoji[sk.level] ?? ''} ${sk.label}`}
                                          size="small"
                                          sx={{ height: 15, fontSize: '0.52rem', fontWeight: 600,
                                            bgcolor: 'action.selected', color: 'text.secondary' }}
                                        />
                                      );
                                    })}
                                  </Stack>
                                )}
                              </Box>
                              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                <Typography variant="caption" fontWeight={800} sx={{ color: scoreColor, fontSize: '0.75rem' }}>
                                  {p.score}
                                </Typography>
                                <LinearProgress variant="determinate" value={p.score}
                                  sx={{ width: 36, height: 3, borderRadius: 2, mt: 0.25,
                                    '& .MuiLinearProgress-bar': { bgcolor: scoreColor } }} />
                              </Box>
                            </Stack>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Grid>
              )}

              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={700}>Urgência aprovada</Typography>
                    <Switch checked={form.is_urgent} onChange={(event) => handleChange('is_urgent', event.target.checked)} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Use só quando a urgência precisa consumir buffer ou reordenar a semana.
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
            {form.is_urgent ? (
              <TextField
                fullWidth
                label="Motivo da urgência"
                value={form.urgency_reason}
                onChange={(event) => handleChange('urgency_reason', event.target.value)}
                placeholder="Explique por que este item precisa furar a fila."
              />
            ) : null}
          </Stack>
        </GuidedFormSection>
        ) : null}

        {!isQuickView ? (
        <GuidedFormSection
          title="Quanto isso mexe na operacao"
          subtitle="Ajude a Central a entender se isso pode furar a fila ou destravar outras demandas."
          completed={Boolean(form.impact_level >= 0 && form.dependency_level >= 0)}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth label="Impacto do atraso" value={String(form.impact_level)} onChange={(event) => handleChange('impact_level', Number(event.target.value))}>
                <MenuItem value="1">1 · Baixo</MenuItem>
                <MenuItem value="2">2 · Controlado</MenuItem>
                <MenuItem value="3">3 · Médio</MenuItem>
                <MenuItem value="4">4 · Alto</MenuItem>
                <MenuItem value="5">5 · Crítico</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth label="Dependência / destravamento" value={String(form.dependency_level)} onChange={(event) => handleChange('dependency_level', Number(event.target.value))}>
                <MenuItem value="1">1 · Isolado</MenuItem>
                <MenuItem value="2">2 · Baixo</MenuItem>
                <MenuItem value="3">3 · Médio</MenuItem>
                <MenuItem value="4">4 · Alto</MenuItem>
                <MenuItem value="5">5 · Destrava vários itens</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </GuidedFormSection>
        ) : null}

        {!isQuickView ? (
        <Alert severity={intakeComplete ? 'success' : 'warning'}>
          <Stack spacing={1}>
            <Typography variant="body2" fontWeight={700}>
              {intakeComplete
                ? 'Tudo certo. Esta demanda ja consegue andar pela operacao sem travar.'
                : 'Ainda faltam definicoes para a Central saber dono, prazo e destino desta demanda.'}
            </Typography>
            {!intakeComplete ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {missingDecisionItems.map((item) => (
                  <Chip key={item} size="small" variant="outlined" color="warning" label={formatMissingDecisionLabel(item)} />
                ))}
              </Stack>
            ) : null}
          </Stack>
        </Alert>
        ) : null}

        {!isQuickView ? (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Chip label={`Prioridade prevista ${priorityPreview.priorityBand.toUpperCase()}`} color={priorityPreview.priorityBand === 'p0' || priorityPreview.priorityBand === 'p1' ? 'error' : priorityPreview.priorityBand === 'p2' ? 'warning' : 'default'} />
          {calibratedEstimate && calibratedEstimate.confidence !== 'none' ? (
            <Tooltip title={`${calibratedEstimate.sampleCount} jobs históricos · intervalo P25-P75: ${formatMinutes(calibratedEstimate.p25)}–${formatMinutes(calibratedEstimate.p75)}`} arrow>
              <Chip
                icon={<IconSparkles size={14} />}
                label={`Real ${formatMinutes(calibratedEstimate.median)} · confiança ${calibratedEstimate.confidence === 'high' ? 'alta' : 'média'}`}
                sx={{
                  bgcolor: calibratedEstimate.confidence === 'high' ? 'rgba(19,222,185,0.12)' : 'rgba(245,158,11,0.1)',
                  color: calibratedEstimate.confidence === 'high' ? '#059669' : '#d97706',
                  fontWeight: 700,
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            </Tooltip>
          ) : (
            <Chip label={`Estimativa base ${formatMinutes(estimatePreview)}`} />
          )}
          <Chip label={selectedOwner ? `Responsável ${selectedOwner.name}` : 'Sem responsável'} variant="outlined" />
          {form.deadline_at ? <Chip label={`Prazo ${formatDateTime(toIsoDateTime(form.deadline_at))}`} variant="outlined" /> : null}
        </Stack>
        ) : null}

        {!isQuickView ? <Divider /> : null}

        {!isQuickView ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between">
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {detailJob ? (
              <>
                <Button variant="outlined" color={detailJob.status === 'blocked' ? 'success' : 'warning'} startIcon={detailJob.status === 'blocked' ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />} onClick={() => handleStatusChange(detailJob.status === 'blocked' ? (intakeComplete ? 'ready' : 'planned') : 'blocked')} disabled={submitting}>
                  {detailJob.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                </Button>
                {!detailJob.owner_id && currentUserId ? (
                  <Button variant="outlined" startIcon={<IconUserPlus size={16} />} onClick={handleTakeOwnership} disabled={submitting}>
                    Assumir demanda
                  </Button>
                ) : null}
                {mode === 'edit' && onDelete ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setDeleteConfirmation('');
                      setDeleteConfirmOpen(true);
                    }}
                    disabled={submitting || deleting}
                  >
                    Excluir demanda
                  </Button>
                ) : null}
              </>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" onClick={onClose}>Fechar</Button>
            <Button variant="contained" startIcon={<IconDeviceFloppy size={16} />} onClick={handleSave} disabled={submitting || !form.title.trim()}>
              {saveLabel}
            </Button>
          </Stack>
        </Stack>
        ) : null}

        {detailJob ? (
          <>
            {!isQuickView ? <Divider /> : null}
            {isQuickView ? (
              <JobJourneyPanel
                job={detailJob}
                directives={clientDirectives}
                allProposals={allocationProposals}
                onTakeOwnership={handleTakeOwnership}
                onAssignOwner={handleAssignOwner}
                onStatusChange={handleStatusChange}
                submitting={submitting}
                currentUserId={currentUserId}
              />
            ) : null}
            {!isQuickView ? (
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={800}>Painel da demanda</Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <EntityLinkCard
                    label="Proxima decisao"
                    value={nextAction.label}
                    subtitle={`${STAGE_LABELS[detailJob.status] || detailJob.status} · ${detailRisk?.label || 'Sem leitura de risco'}`}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <EntityLinkCard
                    label="Dono e prazo"
                    value={detailJob.owner_name || 'Sem responsavel'}
                    subtitle={detailJob.deadline_at ? `Prazo ${formatDateTime(detailJob.deadline_at)}` : 'Defina um prazo para tirar a demanda do escuro'}
                  />
                </Grid>
              </Grid>
              <Box
                sx={(theme) => ({
                  p: 1.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.18),
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                })}
              >
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: 0.45 }}>
                      COMANDOS RAPIDOS
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      O que voce pode fazer agora sem sair da Central
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tudo abaixo mexe na operacao real e reflete no Trello quando a acao existe no fluxo.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {progressTarget ? (
                      <Button
                        variant="contained"
                        startIcon={<IconBolt size={16} />}
                        onClick={() => handleStatusChange(progressTarget)}
                        disabled={submitting}
                      >
                        {nextAction.label}
                      </Button>
                    ) : null}
                    {!detailJob.owner_id && currentUserId ? (
                      <Button variant="outlined" startIcon={<IconUserPlus size={16} />} onClick={handleTakeOwnership} disabled={submitting}>
                        Assumir agora
                      </Button>
                    ) : null}
                    {quickAllocationOptions.map((proposal) => (
                      <Button
                        key={proposal.freelancerId}
                        variant="outlined"
                        onClick={() => handleAssignOwner(proposal.freelancerId)}
                        disabled={submitting}
                      >
                        Alocar {proposal.name.split(' ')[0]}
                      </Button>
                    ))}
                    <Button
                      variant="outlined"
                      color={detailJob.status === 'blocked' ? 'success' : 'warning'}
                      startIcon={detailJob.status === 'blocked' ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
                      onClick={() => handleStatusChange(detailJob.status === 'blocked' ? (intakeComplete ? 'ready' : 'planned') : 'blocked')}
                      disabled={submitting}
                    >
                      {detailJob.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                    </Button>
                    <Button variant="outlined" component={Link} href={`/studio?jobId=${detailJob.id}`} startIcon={<IconBrush size={16} />}>
                      Abrir studio
                    </Button>
                    {detailJob.client_id ? (
                      <Button variant="outlined" component={Link} href={`/clients/${detailJob.client_id}`}>
                        Abrir cliente
                      </Button>
                    ) : null}
                    {detailJob.source === 'meeting' ? (
                      <Button variant="outlined" component={Link} href="/admin/reunioes">
                        Ver reunioes
                      </Button>
                    ) : null}
                    {detailJob.job_type === 'publication' ? (
                      <Button variant="outlined" component={Link} href="/calendar">
                        Ver calendario
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
              <Box
                sx={(theme) => ({
                  p: 1.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: alpha(theme.palette.warning.main, 0.18),
                  bgcolor: alpha(theme.palette.warning.main, 0.05),
                })}
              >
                <Stack spacing={1.25}>
                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 900, color: 'warning.dark', letterSpacing: 0.45 }}>
                      JARVIS NESTA DEMANDA
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      Use o Jarvis no contexto certo, sem sair do workspace
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      O Jarvis não é uma etapa da demanda. Ele entra aqui para resumir, virar briefing, gerar copy ou preparar aprovação.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <AskJarvisButton
                      message={`Resuma a demanda "${cleanJobTitle(detailJob.title, detailJob.client_name)}" do cliente "${detailJob.client_name || 'Sem cliente'}" e me diga o próximo passo operacional.`}
                      label="Resumir demanda"
                      variant="outlined"
                    />
                    <AskJarvisButton
                      message={`Transforme a demanda "${cleanJobTitle(detailJob.title, detailJob.client_name)}" do cliente "${detailJob.client_name || 'Sem cliente'}" em um briefing objetivo para a equipe executar.`}
                      label="Virar briefing"
                      variant="outlined"
                    />
                    <AskJarvisButton
                      message={`Gere o copy inicial e a direção criativa da demanda "${cleanJobTitle(detailJob.title, detailJob.client_name)}" do cliente "${detailJob.client_name || 'Sem cliente'}".`}
                      label="Gerar copy"
                      variant="outlined"
                    />
                    <AskJarvisButton
                      message={`Prepare a aprovação da demanda "${cleanJobTitle(detailJob.title, detailJob.client_name)}" para o cliente, com resumo do que foi feito e do que precisa ser validado.`}
                      label="Preparar aprovação"
                      variant="outlined"
                    />
                  </Stack>
                </Stack>
              </Box>
              <Grid container spacing={1.5}>
                {detailJob.client_id ? (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <EntityLinkCard label="Cliente" value={detailJob.client_name || detailJob.client_id} href={`/clients/${detailJob.client_id}`} subtitle="Conta e contexto operacional" />
                  </Grid>
                ) : null}
                <Grid size={{ xs: 12, md: 6 }}>
                  <EntityLinkCard label="Studio criativo" value="Abrir contexto criativo" href={`/studio?jobId=${detailJob.id}`} subtitle="Criacao, briefing e Jarvis ligados a esta demanda" />
                </Grid>
                {detailJob.source === 'meeting' ? (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <EntityLinkCard label="Origem" value="Reunioes" href="/admin/reunioes" subtitle="Pedido nasceu de uma reuniao" />
                  </Grid>
                ) : null}
                {detailJob.job_type === 'publication' ? (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <EntityLinkCard label="Calendario editorial" value="Contexto de publicacao" href="/calendar" subtitle="Pauta e publicacao seguem ligadas a esta demanda" />
                  </Grid>
                ) : null}
              </Grid>

              {(detailJob.metadata?.trello_url || detailJob.checklists?.length || detailJob.comments?.length) ? (
                <Box
                  sx={(theme) => ({
                    p: 1.5,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.warning.main, 0.18),
                    bgcolor: alpha(theme.palette.warning.main, 0.05),
                  })}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                      <Box>
                        <Typography variant="overline" sx={{ fontWeight: 900, color: 'warning.dark', letterSpacing: 0.45 }}>
                          ESPELHO TRELLO
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          Estado atual do card no board
                        </Typography>
                      </Box>
                      {detailJob.metadata?.trello_url ? (
                        <Button
                          variant="outlined"
                          color="warning"
                          component="a"
                          href={String(detailJob.metadata.trello_url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir no Trello
                        </Button>
                      ) : null}
                    </Stack>

                    {detailJob.checklists?.length ? (
                      <Stack spacing={1}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                          Checklists
                        </Typography>
                        {detailJob.checklists.map((checklist) => {
                          const total = checklist.items.length;
                          const done = checklist.items.filter((item) => item.checked).length;
                          return (
                            <Box key={checklist.id} sx={{ p: 1.25, borderRadius: 2, bgcolor: alpha('#fff', 0.4), border: '1px solid', borderColor: 'divider' }}>
                              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" fontWeight={700}>{checklist.name}</Typography>
                                <Chip
                                  size="small"
                                  label={total ? `${done}/${total}` : 'Vazio'}
                                  color={done === total && total > 0 ? 'success' : 'default'}
                                  variant="outlined"
                                />
                              </Stack>
                              {checklist.items.length ? (
                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                  {checklist.items.slice(0, isQuickView ? 4 : 8).map((item, index) => (
                                    <Chip
                                      key={`${checklist.id}:${index}`}
                                      size="small"
                                      label={item.text}
                                      color={item.checked ? 'success' : 'default'}
                                      variant={item.checked ? 'filled' : 'outlined'}
                                      sx={{ maxWidth: '100%' }}
                                    />
                                  ))}
                                </Stack>
                              ) : null}
                            </Box>
                          );
                        })}
                      </Stack>
                    ) : null}

                    {detailJob.comments?.length ? (
                      <Stack spacing={1}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                          Comentários recentes
                        </Typography>
                        {detailJob.comments.slice(0, isQuickView ? 3 : 6).map((comment) => (
                          <Box key={comment.id} sx={{ p: 1.25, borderRadius: 2, bgcolor: alpha('#fff', 0.45), border: '1px solid', borderColor: 'divider' }}>
                            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                              <Typography variant="caption" fontWeight={800}>
                                {comment.author_name || 'Comentário'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(comment.created_at)}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                              {comment.body}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    ) : null}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
            ) : null}

            {!isQuickView && detailJob.automation_status && detailJob.automation_status !== 'none' ? (
              <>
                <Divider />
                <Stack spacing={1.5}>
                  <Typography variant="h6" fontWeight={800}>Pipeline criativo</Typography>
                  <AutomationPipeline automationStatus={detailJob.automation_status} />
                  {detailJob.automation_status === 'briefing_pending' && (
                    <BriefingApprovalPanel
                      jobId={detailJob.id}
                      onApproved={() => {
                        // Refresh job data so automation_status updates
                        setDetailJob((prev) => prev ? { ...prev, automation_status: 'copy_pending' } : prev);
                      }}
                    />
                  )}
                  <CreativeDraftsPanel jobId={detailJob.id} />
                </Stack>
              </>
            ) : null}

            {!isQuickView ? (
              <>
                <Divider />
                <TimeEntriesPanel jobId={detailJob.id} />
              </>
            ) : null}

            {!isQuickView && detailJob.history?.length ? (
              <>
                <Divider />
                <Stack spacing={1.25}>
                  <Typography variant="h6" fontWeight={800}>Linha do tempo</Typography>
                  <StatusTimeline history={detailJob.history} />
                </Stack>
              </>
            ) : null}
          </>
        ) : null}
      </Stack>

      <Dialog open={deleteConfirmOpen} onClose={() => !deleting && setDeleteConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Tem certeza que deseja excluir esta demanda?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {detailJob
                ? `A demanda "${cleanJobTitle(detailJob.title, detailJob.client_name)}" será removida da Central de Operações.`
                : 'A demanda selecionada será removida da Central de Operações.'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Essa ação é permanente e remove também alocação, agenda, riscos e histórico vinculados.
            </Typography>
            <TextField
              fullWidth
              size="small"
              label='Digite EXCLUIR para confirmar'
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={!detailJob || deleting || deleteConfirmation.trim().toUpperCase() !== 'EXCLUIR'}
          >
            {deleting ? 'Excluindo...' : 'Excluir demanda'}
          </Button>
        </DialogActions>
      </Dialog>
    </ContextDrawer>
  );
}
