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
import Skeleton from '@mui/material/Skeleton';
import { alpha } from '@mui/material/styles';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconUserPlus,
  IconDeviceFloppy,
  IconRefresh,
  IconThumbUp,
  IconBrush,
  IconSparkles,
} from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import { IconShieldCheck, IconChevronDown, IconChevronUp, IconBolt, IconCheck, IconX as IconXMark } from '@tabler/icons-react';
import {
  AutomationPipeline,
  BlockReason,
  ContextDrawer,
  EntityLinkCard,
  GuidedFormSection,
  NextActionBar,
  PriorityPill,
  RiskFlag,
  StageRail,
} from './primitives';
import {
  calculatePriorityPreview,
  estimateJobMinutes,
  formatSourceLabel,
  formatDateTime,
  formatMinutes,
  getNextAction,
  isIntakeComplete,
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
  channel: string | null;
  source: string;
  impact_level: number;
  dependency_level: number;
  required_skill: string | null;
  owner_id: string | null;
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

  const copyDraft = drafts.find((d) => d.draft_type === 'copy' && d.status === 'done');
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
        <Typography variant="body2" fontWeight={900}>Rascunho IA</Typography>
      </Stack>

      {/* Copy Draft */}
      {copyDraft ? (
        <Box sx={(theme) => ({
          p: 2,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.2),
          bgcolor: alpha(theme.palette.primary.main, 0.03),
        })}>
          <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ display: 'block', mb: 1 }}>
            COPY GERADO
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
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconRefresh size={14} />}
              onClick={() => handleRegenerate('copy')}
              disabled={!!regenerating}
            >
              {regenerating === 'copy' ? 'Gerando...' : 'Regenerar'}
            </Button>
          </Stack>
        </Box>
      ) : pendingCopy ? (
        <Box sx={{ p: 2, borderRadius: 2.5, border: '1px dashed', borderColor: 'divider', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            A IA esta rabiscando o copy...
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
            A IA esta desenhando a imagem...
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
    channel: job?.channel || null,
    source: job?.source || 'manual',
    impact_level: job?.impact_level ?? 2,
    dependency_level: job?.dependency_level ?? 2,
    required_skill: job?.required_skill || null,
    owner_id: job?.owner_id || null,
    deadline_at: toInputDateTime(job?.deadline_at),
    is_urgent: Boolean(job?.is_urgent),
    urgency_reason: job?.urgency_reason || '',
    definition_of_done: job?.definition_of_done || '',
  };
}

export default function JobWorkbenchDrawer({
  open,
  mode,
  job,
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
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [error, setError] = useState('');
  const [detailJob, setDetailJob] = useState<OperationsJob | null>(job);
  const [clientDirectives, setClientDirectives] = useState<Array<{ id: string; directive_type: 'boost' | 'avoid'; directive: string }>>([]);
  const [directivesOpen, setDirectivesOpen] = useState(true);

  // ── Allocation proposals ──
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
  };
  const [allocationProposals, setAllocationProposals] = useState<AllocationProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(buildDraft(job, { jobTypes }));
    setDetailJob(job);
    setError('');
    setDeleteConfirmOpen(false);
    setDeleteConfirmation('');
  }, [open, job, jobTypes]);

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

  const selectedClient = clients.find((item) => item.id === form.client_id) || null;
  const selectedOwner = owners.find((item) => item.id === form.owner_id) || null;
  const selectedType = jobTypes.find((item) => item.code === form.job_type) || null;

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
    channel: form.channel,
    source: form.source,
    impact_level: form.impact_level,
    dependency_level: form.dependency_level,
    required_skill: form.required_skill,
    owner_id: form.owner_id,
    deadline_at: toIsoDateTime(form.deadline_at),
    is_urgent: form.is_urgent,
    urgency_reason: form.is_urgent ? form.urgency_reason.trim() || null : null,
    definition_of_done: form.definition_of_done.trim() || null,
  };

  const handleChange = <K extends keyof JobDraft>(field: K, value: JobDraft[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
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

  return (
    <ContextDrawer
      open={open}
      title={mode === 'create' ? 'Nova Demanda' : detailJob?.title || 'Demanda operacional'}
      subtitle={mode === 'create'
        ? 'Use travas fortes e classificação guiada para não deixar nada solto.'
        : `${selectedClient?.name || detailJob?.client_name || 'Sem cliente'} · ${formatSourceLabel(detailJob?.source || form.source)}`}
      onClose={onClose}
      actions={
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <PriorityPill priorityBand={priorityPreview.priorityBand} />
            {detailJob ? <RiskFlag job={detailJob} /> : <Chip size="small" color="info" label="Beta guiado" />}
            {detailJob ? <Chip size="small" variant="outlined" label={detailJob.status} /> : null}
            <Chip size="small" label={`Estimativa ${formatMinutes(estimatePreview)}`} />
          </Stack>
          {detailJob ? (
            <NextActionBar
              job={{ ...detailJob, ...payload, priority_band: priorityPreview.priorityBand, owner_name: selectedOwner?.name || detailJob.owner_name }}
              onPrimaryAction={progressTarget ? () => handleStatusChange(progressTarget) : undefined}
              primaryLabel={progressTarget ? nextAction.label : undefined}
            />
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      }
    >
      <Stack spacing={3}>
        {detailJob?.status === 'blocked' ? <BlockReason reason={detailJob.urgency_reason || 'Bloqueio ativo na etapa atual.'} onResolve={() => handleStatusChange(intakeComplete ? 'ready' : 'planned')} /> : null}

        <GuidedFormSection
          title="Entrada estruturada"
          subtitle="Cliente, tipo, origem e contexto mínimo."
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
              <TextField fullWidth label="Título" value={form.title} onChange={(event) => handleChange('title', event.target.value)} />
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
                placeholder={selectedType?.default_definition_of_done || 'O que precisa acontecer para esta demanda ser considerada pronta?'}
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
                placeholder="Explique o contexto do pedido com o mínimo necessário para produção e decisão."
              />
            </Grid>
          </Grid>
        </GuidedFormSection>

        {clientDirectives.length > 0 && (
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

        <GuidedFormSection
          title="Planejamento e responsável"
          subtitle="Tudo o que permite alocar e mover a demanda no fluxo."
          completed={Boolean(form.owner_id && form.required_skill && form.deadline_at)}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">Complexidade</Typography>
              <ToggleButtonGroup exclusive value={form.complexity} onChange={(_event, value) => value && handleChange('complexity', value)} size="small">
                <ToggleButton value="s">S</ToggleButton>
                <ToggleButton value="m">M</ToggleButton>
                <ToggleButton value="l">L</ToggleButton>
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
                  onChange={(_event, value) => handleChange('owner_id', value?.id || null)}
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => <TextField {...params} label="Responsável" />}
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

        <GuidedFormSection
          title="Governança e risco"
          subtitle="O sistema usa esses sinais para priorizar e evitar caos operacional."
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

        <Alert severity={intakeComplete ? 'success' : 'warning'}>
          {intakeComplete
            ? 'Entrada completa. Esta demanda já pode seguir para planejamento e alocação.'
            : 'Faltam cliente, especialidade, responsável, prazo ou contexto mínimo. O sistema vai travar o avanço até isso ser resolvido.'}
        </Alert>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Chip label={`Prioridade prevista ${priorityPreview.priorityBand.toUpperCase()}`} color={priorityPreview.priorityBand === 'p0' || priorityPreview.priorityBand === 'p1' ? 'error' : priorityPreview.priorityBand === 'p2' ? 'warning' : 'default'} />
          <Chip label={`Estimativa base ${formatMinutes(estimatePreview)}`} />
          <Chip label={selectedOwner ? `Responsável ${selectedOwner.name}` : 'Sem responsável'} variant="outlined" />
          {form.deadline_at ? <Chip label={`Prazo ${formatDateTime(toIsoDateTime(form.deadline_at))}`} variant="outlined" /> : null}
        </Stack>

        <Divider />

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
              {submitting ? 'Salvando...' : mode === 'create' ? 'Criar demanda' : 'Salvar demanda'}
            </Button>
          </Stack>
        </Stack>

        {detailJob ? (
          <>
            <Divider />
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={800}>Fluxo e contexto</Typography>
              <StageRail status={detailJob.status} />
              <Grid container spacing={1.5}>
                {detailJob.client_id ? (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <EntityLinkCard label="Cliente" value={detailJob.client_name || detailJob.client_id} href={`/clients/${detailJob.client_id}`} subtitle="Conta e contexto operacional" />
                  </Grid>
                ) : null}
                <Grid size={{ xs: 12, md: 6 }}>
                  <EntityLinkCard label="Studio criativo" value="Abrir contexto criativo" href={`/studio?jobId=${detailJob.id}`} subtitle="Execução criativa vinculada à demanda atual" />
                </Grid>
                {detailJob.source === 'meeting' ? (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <EntityLinkCard label="Origem" value="Reuniões" href="/admin/reunioes" subtitle="Ação derivada de reunião" />
                  </Grid>
                ) : null}
                {detailJob.job_type === 'publication' ? (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <EntityLinkCard label="Calendário Editorial" value="Contexto de publicação" href="/calendar" subtitle="Agenda editorial permanece separada da agenda operacional" />
                  </Grid>
                ) : null}
              </Grid>
            </Stack>

            {detailJob.automation_status && detailJob.automation_status !== 'none' ? (
              <>
                <Divider />
                <Stack spacing={1.5}>
                  <Typography variant="h6" fontWeight={800}>Pipeline IA</Typography>
                  <AutomationPipeline automationStatus={detailJob.automation_status} />
                  <CreativeDraftsPanel jobId={detailJob.id} />
                </Stack>
              </>
            ) : null}

            {detailJob.history?.length ? (
              <>
                <Divider />
                <Stack spacing={1.25}>
                  <Typography variant="h6" fontWeight={800}>Linha do tempo</Typography>
                  {detailJob.history.slice(0, 8).map((item) => (
                    <Box key={item.id} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
                        <Typography variant="body2" fontWeight={700}>
                          {item.from_status ? `${item.from_status} → ` : ''}{item.to_status}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(item.changed_at)}{item.changed_by_name ? ` · ${item.changed_by_name}` : ''}
                        </Typography>
                      </Stack>
                      {item.reason ? <Typography variant="caption" color="text.secondary">{item.reason}</Typography> : null}
                    </Box>
                  ))}
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
                ? `A demanda "${detailJob.title}" será removida da Central de Operações.`
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
