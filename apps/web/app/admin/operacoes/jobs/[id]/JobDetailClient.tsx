'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Autocomplete from '@mui/material/Autocomplete';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClipboardList,
  IconExternalLink,
  IconHistory,
  IconMessage,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import {
  PRIORITY_LABELS,
  formatMinutes,
  formatSkillLabel,
  formatSourceLabel,
  getDeliveryStatus,
  getNextAction,
  getRisk,
  cleanJobTitle,
  type OperationsOwner,
  type OperationsJob,
} from '@/components/operations/model';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  intake: 'Intake',
  planned: 'Planejado',
  ready: 'Pronto',
  allocated: 'Alocado',
  in_progress: 'Em execução',
  in_review: 'Em revisão',
  blocked: 'Bloqueado',
  adjustment: 'Ajuste',
  awaiting_approval: 'Aguardando aprovação',
  copy_review: 'Revisão copy',
  approved: 'Aprovado',
  finalizing: 'Finalizando',
  billing: 'Faturamento',
  done: 'Concluído',
  published: 'Publicado',
  archived: 'Arquivado',
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: '#5D87FF',
  blocked: '#FA896B',
  awaiting_approval: '#7C3AED',
  in_review: '#5D87FF',
  done: '#43A047',
  published: '#43A047',
  approved: '#43A047',
};

function statusColor(status: string) {
  return STATUS_COLORS[status] || '#9E9E9E';
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function initials(name?: string | null) {
  return (name || '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function checklistPct(job: OperationsJob) {
  const items = job.checklists?.flatMap((c) => c.items) ?? [];
  if (!items.length) return null;
  return Math.round((items.filter((i) => i.checked).length / items.length) * 100);
}

function deadlinePulse(deadline?: string | null) {
  if (!deadline) return { label: 'Sem prazo definido', tone: 'neutral' as const };
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return { label: 'Prazo inválido', tone: 'warning' as const };
  const diffHours = (date.getTime() - Date.now()) / 3600000;
  if (diffHours <= 0) return { label: 'Prazo estourado', tone: 'error' as const };
  if (diffHours <= 24) return { label: 'Vence nas próximas 24h', tone: 'warning' as const };
  if (diffHours <= 72) return { label: 'Vence nesta janela de 72h', tone: 'info' as const };
  return { label: 'Prazo sob controle', tone: 'success' as const };
}

// ── Markdown link parser ──────────────────────────────────────────────────────

function renderDescription(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <Box key={key++} component="a" href={match[2]} target="_blank" rel="noreferrer"
           sx={{ color: '#5D87FF', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
        {match[1]}
      </Box>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1.25 }}>
      <Box sx={{ color: 'text.disabled', mt: '2px', flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.25 }}>
          {label}
        </Typography>
        {children}
      </Box>
    </Stack>
  );
}

function SignalTile({
  eyebrow,
  value,
  caption,
  color,
}: {
  eyebrow: string;
  value: string;
  caption?: string;
  color: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: 1.5,
        borderRadius: 2.5,
        borderColor: alpha(color, 0.22),
        bgcolor: theme.palette.mode === 'dark' ? alpha(color, 0.08) : alpha(color, 0.045),
      })}
    >
      <Typography
        variant="caption"
        sx={{ display: 'block', mb: 0.65, fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color }}
      >
        {eyebrow}
      </Typography>
      <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {caption ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.45, fontSize: '0.72rem', lineHeight: 1.45 }}>
          {caption}
        </Typography>
      ) : null}
    </Paper>
  );
}

function CommentBubble({ comment }: { comment: { id: string; author_name?: string | null; body: string; created_at: string } }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Avatar sx={{ width: 28, height: 28, fontSize: '0.62rem', fontWeight: 800, bgcolor: alpha('#5D87FF', 0.2), color: '#5D87FF' }}>
        {initials(comment.author_name)}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.78rem' }}>
            {comment.author_name || 'Anônimo'}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
            {fmtDateTime(comment.created_at)}
          </Typography>
        </Stack>
        <Box
          sx={{
            mt: 0.5,
            p: 1.25,
            borderRadius: 2,
            bgcolor: dark ? alpha('#fff', 0.04) : alpha('#000', 0.03),
            border: `1px solid ${dark ? alpha('#fff', 0.07) : alpha('#000', 0.06)}`,
          }}
        >
          <Typography variant="body2" sx={{ fontSize: '0.84rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {comment.body}
          </Typography>
        </Box>
      </Box>
    </Stack>
  );
}

function HistoryRow({ row }: { row: { id: string; from_status?: string | null; to_status: string; changed_by_name?: string | null; changed_at: string; reason?: string | null } }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 0.75 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusColor(row.to_status), mt: '5px', flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
          {row.from_status ? `${STATUS_LABELS[row.from_status] ?? row.from_status} → ` : ''}
          <Box component="span" sx={{ color: statusColor(row.to_status) }}>{STATUS_LABELS[row.to_status] ?? row.to_status}</Box>
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.68rem' }}>
          {row.changed_by_name ? `por ${row.changed_by_name} · ` : ''}{fmtDateTime(row.changed_at)}
        </Typography>
        {row.reason ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, fontSize: '0.72rem', lineHeight: 1.5 }}>
            {row.reason}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function JobDetailClient({ id, onClose }: { id: string; onClose?: () => void }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const router = useRouter();

  const [job, setJob] = useState<OperationsJob | null>(null);
  const [owners, setOwners] = useState<OperationsOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState(0);
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  const [peopleOpen, setPeopleOpen] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [savingPeople, setSavingPeople] = useState(false);
  const [peopleError, setPeopleError] = useState('');

  const commentsEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [jobRes, lookupsRes] = await Promise.all([
        apiGet<{ data?: OperationsJob }>(`/trello/ops-cards/${id}`),
        apiGet<{ owners?: OperationsOwner[] }>('/jobs/lookups').catch(() => null),
      ]);
      if (!jobRes?.data) { setError('Job não encontrado.'); return; }
      setJob(jobRes.data);
      setOwners(lookupsRes?.owners ?? []);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar job.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!job) return;
    const nextAssigneeIds = (job.assignees ?? [])
      .map((assignee) => assignee.user_id)
      .filter(Boolean);
    const normalized = Array.from(new Set(nextAssigneeIds.length ? nextAssigneeIds : (job.owner_id ? [job.owner_id] : [])));
    setSelectedOwnerId(job.owner_id ?? normalized[0] ?? null);
    setSelectedAssigneeIds(normalized);
    setPeopleError('');
  }, [job]);

  const submitComment = async () => {
    if (!commentText.trim() || !job) return;
    setSubmitting(true);
    setCommentError('');
    try {
      const res = await apiPost<{ data?: OperationsJob['comments'] extends Array<infer T> ? T : never }>(
        `/trello/ops-cards/${id}/comments`,
        { body: commentText.trim() },
      );
      if (res?.data) {
        setJob((prev) => prev ? {
          ...prev,
          comments: [res.data!, ...(prev.comments ?? [])],
        } : prev);
        setCommentText('');
      }
    } catch (e: any) {
      setCommentError(e?.message || 'Falha ao enviar comentário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePeopleSave = async () => {
    if (!job) return;
    setSavingPeople(true);
    setPeopleError('');
    try {
      const effectiveOwnerId = selectedOwnerId || selectedAssigneeIds[0] || null;
      const effectiveAssigneeIds = Array.from(new Set([
        ...(effectiveOwnerId ? [effectiveOwnerId] : []),
        ...selectedAssigneeIds,
      ]));
      const response = await apiPatch<{ data?: OperationsJob }>(`/trello/ops-cards/${id}`, {
        owner_id: effectiveOwnerId,
        assignee_ids: effectiveAssigneeIds,
      });
      if (!response?.data) throw new Error('Falha ao salvar pessoas do job.');
      setJob(response.data);
      setPeopleOpen(false);
    } catch (e: any) {
      setPeopleError(e?.message || 'Falha ao salvar pessoas do job.');
    } finally {
      setSavingPeople(false);
    }
  };

  const pct = job ? checklistPct(job) : null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !job) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error || 'Job não encontrado.'}</Alert>
        <Button startIcon={<IconArrowLeft size={16} />} sx={{ mt: 2 }} onClick={() => onClose ? onClose() : router.back()}>Voltar</Button>
      </Box>
    );
  }

  const hasChecklist = (job.checklists?.length ?? 0) > 0;
  const allItems = job.checklists?.flatMap((c) => c.items) ?? [];
  const checkedCount = allItems.filter((i) => i.checked).length;
  const risk = getRisk(job);
  const nextAction = getNextAction(job);
  const delivery = getDeliveryStatus(job);
  const deadlineInfo = deadlinePulse(job.deadline_at);
  const priorityLabel = PRIORITY_LABELS[job.priority_band] ?? job.priority_band;
  const skillLabel = formatSkillLabel(job.required_skill);
  const sourceLabel = formatSourceLabel(job.source);
  const estimateLabel = job.estimated_minutes ? formatMinutes(job.estimated_minutes) : 'Sem estimativa';
  const queueLabel = job.queue_minutes ? formatMinutes(job.queue_minutes) : 'Sem fila';
  const blockedLabel = job.blocked_minutes ? formatMinutes(job.blocked_minutes) : 'Sem bloqueio';
  const railStickyTop = onClose ? 20 : 80;
  const selectedOwner = owners.find((owner) => owner.id === selectedOwnerId) || null;
  const selectedAssignees = owners.filter((owner) => selectedAssigneeIds.includes(owner.id));

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      {/* ── Breadcrumb (hidden in modal mode) ── */}
      {!onClose && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <Button
            component={Link}
            href="/admin/operacoes"
            startIcon={<IconArrowLeft size={15} />}
            size="small"
            sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.78rem', textTransform: 'none', p: '4px 8px', minWidth: 0 }}
          >
            Central de Operações
          </Button>
          <Typography color="text.disabled" sx={{ fontSize: '0.78rem' }}>/</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
            {job.client_name || 'Sem cliente'}
          </Typography>
        </Stack>
      )}

      {/* ── Header ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Stack spacing={1.15} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
            <Avatar
              src={job.client_logo_url ?? undefined}
              sx={{
                width: 34,
                height: 34,
                fontSize: '0.78rem',
                fontWeight: 800,
                bgcolor: alpha(job.client_brand_color || '#E85219', 0.14),
                color: job.client_brand_color || '#E85219',
              }}
            >
              {initials(job.client_name)}
            </Avatar>
            <Chip
              size="small"
              label={STATUS_LABELS[job.status] ?? job.status}
              sx={{
                fontWeight: 800,
                fontSize: '0.68rem',
                height: 22,
                bgcolor: alpha(statusColor(job.status), 0.12),
                color: statusColor(job.status),
                border: `1px solid ${alpha(statusColor(job.status), 0.3)}`,
              }}
            />
            <Chip
              size="small"
              label={risk.label}
              sx={{
                fontWeight: 800,
                fontSize: '0.68rem',
                height: 22,
                bgcolor: alpha(risk.level === 'critical' ? '#FA896B' : risk.level === 'high' ? '#FFAE1F' : risk.level === 'medium' ? '#5D87FF' : '#13DEB9', 0.12),
                color: risk.level === 'critical' ? '#FA896B' : risk.level === 'high' ? '#B26A00' : risk.level === 'medium' ? '#5D87FF' : '#13DEB9',
                border: `1px solid ${alpha(risk.level === 'critical' ? '#FA896B' : risk.level === 'high' ? '#FFAE1F' : risk.level === 'medium' ? '#5D87FF' : '#13DEB9', 0.3)}`,
              }}
            />
            <Chip
              size="small"
              label={priorityLabel}
              sx={{
                fontWeight: 800,
                fontSize: '0.68rem',
                height: 22,
                bgcolor: alpha('#111827', 0.06),
                color: 'text.secondary',
                border: `1px solid ${alpha('#111827', 0.1)}`,
              }}
            />
            {job.is_urgent && (
              <Chip size="small" label="Urgente" sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22, bgcolor: alpha('#F9A825', 0.12), color: '#F9A825', border: `1px solid ${alpha('#F9A825', 0.3)}` }} />
            )}
          </Stack>
          <Typography fontWeight={800} sx={{ lineHeight: 1.2, fontSize: { xs: '1.4rem', md: '1.7rem' }, color: 'text.primary' }}>
            {cleanJobTitle(job.title, job.client_name)}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {job.client_name && (
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.78rem' }}>
                {job.client_name}
              </Typography>
            )}
            {job.deadline_at && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconCalendar size={13} color={theme.palette.text.disabled as string} />
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                  Entrega {fmtDate(job.deadline_at)}
                </Typography>
              </Stack>
            )}
          </Stack>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip size="small" variant="outlined" label={sourceLabel} sx={{ fontWeight: 700 }} />
            <Chip size="small" variant="outlined" label={job.job_type} sx={{ fontWeight: 700 }} />
            <Chip size="small" variant="outlined" label={skillLabel} sx={{ fontWeight: 700 }} />
            {job.channel ? <Chip size="small" variant="outlined" label={job.channel} sx={{ fontWeight: 700 }} /> : null}
            {job.job_size ? <Chip size="small" variant="outlined" label={`Tamanho ${job.job_size}`} sx={{ fontWeight: 700 }} /> : null}
          </Stack>
        </Stack>

        {/* Action buttons */}
        <Stack direction="row" spacing={1} flexShrink={0}>
          <Tooltip title="Recarregar">
            <IconButton size="small" onClick={load} sx={{ opacity: 0.6, border: `1px solid ${theme.palette.divider}` }}>
              <IconRefresh size={16} />
            </IconButton>
          </Tooltip>
          {job.external_link && (
            <Tooltip title="Abrir no Trello">
              <IconButton size="small" component="a" href={job.external_link} target="_blank" rel="noreferrer" sx={{ opacity: 0.6, border: `1px solid ${theme.palette.divider}` }}>
                <IconExternalLink size={16} />
              </IconButton>
            </Tooltip>
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<IconSparkles size={14} />}
            component={Link}
            href={`/admin/briefings/new?job_id=${job.id}${job.client_id ? `&client_id=${job.client_id}` : ''}`}
            sx={{ fontWeight: 800, fontSize: '0.78rem', textTransform: 'none', borderRadius: 2, boxShadow: 'none', whiteSpace: 'nowrap' }}
          >
            Gerar Copy
          </Button>
        </Stack>
      </Stack>

      {/* ── Body: 2 columns ── */}
      <Grid container spacing={3}>
        {/* ── Left column ── */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: 1.25,
              }}
            >
              <SignalTile
                eyebrow="Próxima ação"
                value={nextAction.label}
                caption={job.owner_name ? `Com ${job.owner_name}` : 'Ainda sem responsável definido'}
                color={nextAction.intent === 'error' ? '#FA896B' : nextAction.intent === 'warning' ? '#FFAE1F' : nextAction.intent === 'success' ? '#13DEB9' : '#5D87FF'}
              />
              <SignalTile
                eyebrow="Status da entrega"
                value={delivery.label}
                caption={deadlineInfo.label}
                color={delivery.color}
              />
              <SignalTile
                eyebrow="Esforço"
                value={estimateLabel}
                caption={hasChecklist ? `${checkedCount}/${allItems.length} itens de checklist` : 'Sem checklist operacional'}
                color="#5D87FF"
              />
            </Box>

            {/* Progress bar */}
            {pct !== null && (
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                    Progresso
                  </Typography>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                    {checkedCount}/{allItems.length}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: dark ? alpha('#fff', 0.1) : alpha('#000', 0.07),
                    '& .MuiLinearProgress-bar': { bgcolor: '#5D87FF', borderRadius: 3 },
                  }}
                />
              </Box>
            )}

            {/* Description */}
            {job.summary && (
              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}>
                  Descrição e contexto
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'text.primary' }}>
                  {renderDescription(job.summary)}
                </Typography>
                {job.definition_of_done ? (
                  <Box
                    sx={(theme) => ({
                      mt: 2,
                      p: 1.5,
                      borderRadius: 2.5,
                      bgcolor: theme.palette.mode === 'dark' ? alpha('#13DEB9', 0.08) : alpha('#13DEB9', 0.045),
                      border: `1px solid ${alpha('#13DEB9', 0.18)}`,
                    })}
                  >
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.45, fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#13DEB9' }}>
                      Definition of Done
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
                      {job.definition_of_done}
                    </Typography>
                  </Box>
                ) : null}
              </Paper>
            )}

            {/* Checklists */}
            {hasChecklist && (
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ px: 2.5, py: 1.75, cursor: 'pointer', '&:hover': { bgcolor: dark ? alpha('#fff', 0.03) : alpha('#000', 0.02) } }}
                  onClick={() => setChecklistOpen((v) => !v)}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconClipboardList size={16} />
                    <Typography fontWeight={700} sx={{ fontSize: '0.9rem' }}>Checklists</Typography>
                    {pct !== null && (
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>{pct}%</Typography>
                    )}
                  </Stack>
                  {checklistOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                </Stack>
                {checklistOpen && (
                  <>
                    <Divider />
                    <Box sx={{ px: 2.5, py: 2 }}>
                      {job.checklists?.map((cl) => (
                        <Box key={cl.id} sx={{ mb: 2.5 }}>
                          {cl.name && (
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                              {cl.name}
                            </Typography>
                          )}
                          <Stack spacing={0.75}>
                            {cl.items.map((item, i) => (
                              <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                                <Box sx={{ width: 16, height: 16, mt: '1px', flexShrink: 0, borderRadius: '4px', border: `2px solid ${item.checked ? '#5D87FF' : theme.palette.divider}`, bgcolor: item.checked ? '#5D87FF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {item.checked && <IconCheck size={10} color="#fff" />}
                                </Box>
                                <Typography variant="body2" sx={{ fontSize: '0.84rem', lineHeight: 1.5, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'text.disabled' : 'text.primary' }}>
                                  {item.text}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </Paper>
            )}

            {/* Tabs: Comentários | Histórico */}
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '& .MuiTab-root': { fontSize: '0.82rem', fontWeight: 700, textTransform: 'none', minHeight: 44 },
                }}
              >
                <Tab
                  icon={<IconMessage size={15} />}
                  iconPosition="start"
                  label={`Comentários${(job.comments?.length ?? 0) > 0 ? ` (${job.comments!.length})` : ''}`}
                  sx={{ gap: 0.5 }}
                />
                <Tab
                  icon={<IconHistory size={15} />}
                  iconPosition="start"
                  label="Histórico"
                  sx={{ gap: 0.5 }}
                />
              </Tabs>

              <Box sx={{ p: 2.5 }}>
                {tab === 0 && (
                  <Stack spacing={2.5}>
                    {/* Comment composer */}
                    <Box>
                      <TextField
                        multiline
                        minRows={2}
                        maxRows={6}
                        fullWidth
                        placeholder="Adicione um comentário..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.84rem' } }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment();
                        }}
                      />
                      {commentError && <Alert severity="error" sx={{ mt: 1 }}>{commentError}</Alert>}
                      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          endIcon={submitting ? <CircularProgress size={12} /> : <IconSend size={14} />}
                          disabled={!commentText.trim() || submitting}
                          onClick={submitComment}
                          sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', borderRadius: 2, boxShadow: 'none' }}
                        >
                          {submitting ? 'Enviando...' : 'Comentar'}
                        </Button>
                      </Stack>
                    </Box>

                    {(job.comments?.length ?? 0) === 0 ? (
                      <Typography color="text.disabled" variant="body2" sx={{ textAlign: 'center', py: 2 }}>
                        Nenhum comentário ainda. Seja o primeiro!
                      </Typography>
                    ) : (
                      <Stack spacing={2} divider={<Divider />}>
                        {(job.comments ?? []).map((c) => (
                          <CommentBubble key={c.id} comment={c} />
                        ))}
                      </Stack>
                    )}
                    <div ref={commentsEndRef} />
                  </Stack>
                )}

                {tab === 1 && (
                  <Stack spacing={0}>
                    {(job.history?.length ?? 0) === 0 ? (
                      <Typography color="text.disabled" variant="body2" sx={{ textAlign: 'center', py: 2 }}>
                        Nenhum histórico registrado.
                      </Typography>
                    ) : (
                      (job.history ?? []).map((h) => (
                        <HistoryRow key={h.id} row={h} />
                      ))
                    )}
                  </Stack>
                )}
              </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* ── Right column: Metadata ── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, position: 'sticky', top: railStickyTop }}>
            <Typography variant="caption" fontWeight={800} color="text.disabled" sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>
              Detalhes
            </Typography>
            <Divider sx={{ mb: 1 }} />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 1,
                mb: 1.5,
              }}
            >
              <SignalTile eyebrow="Risco" value={risk.label} caption={`Score ${risk.score}`} color={risk.level === 'critical' ? '#FA896B' : risk.level === 'high' ? '#FFAE1F' : risk.level === 'medium' ? '#5D87FF' : '#13DEB9'} />
              <SignalTile eyebrow="Fila" value={queueLabel} caption={blockedLabel} color="#5D87FF" />
            </Box>

            {/* Status */}
            <MetaRow icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusColor(job.status) }} />} label="Status">
              <Chip
                size="small"
                label={STATUS_LABELS[job.status] ?? job.status}
                sx={{ fontWeight: 700, fontSize: '0.72rem', height: 20, bgcolor: alpha(statusColor(job.status), 0.12), color: statusColor(job.status) }}
              />
            </MetaRow>
            <Divider sx={{ my: 0.25 }} />

            {/* Client */}
            {job.client_name && (
              <>
                <MetaRow icon={<IconUser size={14} />} label="Cliente">
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.84rem' }}>{job.client_name}</Typography>
                </MetaRow>
                <Divider sx={{ my: 0.25 }} />
              </>
            )}

            {/* Deadline */}
            <MetaRow icon={<IconCalendar size={14} />} label="Prazo de entrega">
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.84rem', color: job.deadline_at && new Date(job.deadline_at) < new Date() ? '#FA896B' : 'text.primary' }}>
                {fmtDate(job.deadline_at)}
              </Typography>
            </MetaRow>
            <Divider sx={{ my: 0.25 }} />

            {/* Size */}
            {job.job_size && (
              <>
                <MetaRow icon={<IconClipboardList size={14} />} label="Tamanho">
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.84rem' }}>{job.job_size}</Typography>
                </MetaRow>
                <Divider sx={{ my: 0.25 }} />
              </>
            )}

            {/* Type */}
            {job.job_type && (
              <>
                <MetaRow icon={<IconPencil size={14} />} label="Tipo">
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.84rem' }}>{job.job_type}</Typography>
                </MetaRow>
                <Divider sx={{ my: 0.25 }} />
              </>
            )}

            <MetaRow icon={<IconSparkles size={14} />} label="Próxima ação">
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.84rem' }}>{nextAction.label}</Typography>
            </MetaRow>
            <Divider sx={{ my: 0.25 }} />

            <MetaRow icon={<IconClipboardList size={14} />} label="Origem">
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.84rem' }}>{sourceLabel}</Typography>
            </MetaRow>
            <Divider sx={{ my: 0.25 }} />

            <MetaRow icon={<IconClipboardList size={14} />} label="Especialidade">
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.84rem' }}>{skillLabel}</Typography>
            </MetaRow>
            <Divider sx={{ my: 0.25 }} />

            {/* Owner / Responsável */}
            <MetaRow icon={<IconUser size={14} />} label="Responsável">
              {job.owner_name ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar src={job.owner_avatar_url ?? undefined} sx={{ width: 22, height: 22, fontSize: '0.55rem', fontWeight: 800 }}>
                    {initials(job.owner_name)}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.84rem' }}>{job.owner_name}</Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.84rem' }}>Sem responsável</Typography>
              )}
            </MetaRow>

            {/* Assignees */}
            {(job.assignees?.length ?? 0) > 0 && (
              <>
                <Divider sx={{ my: 0.25 }} />
                <MetaRow icon={<IconUser size={14} />} label="Equipe">
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {job.assignees?.map((a) => (
                      <Tooltip key={a.user_id} title={a.name}>
                        <Avatar src={a.avatar_url ?? undefined} sx={{ width: 26, height: 26, fontSize: '0.6rem', fontWeight: 800 }}>
                          {initials(a.name)}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </Stack>
                </MetaRow>
              </>
            )}

            <Divider sx={{ my: 0.25 }} />
            <MetaRow icon={<IconCalendar size={14} />} label="Ritmo da entrega">
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  fontSize: '0.84rem',
                  color: deadlineInfo.tone === 'error' ? '#FA896B' : deadlineInfo.tone === 'warning' ? '#B26A00' : deadlineInfo.tone === 'info' ? '#5D87FF' : 'text.primary',
                }}
              >
                {deadlineInfo.label}
              </Typography>
            </MetaRow>

            <Divider sx={{ my: 1.5 }} />

            {/* People picker */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" fontWeight={800} color="text.disabled" sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Pessoas no job
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => { setPeopleOpen((v) => !v); setPeopleError(''); }}
                  sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}
                >
                  {peopleOpen ? <IconX size={14} /> : <IconPlus size={14} />}
                </IconButton>
              </Stack>

              {!peopleOpen ? (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {job.owner_name ? (
                      <>
                        <Avatar src={job.owner_avatar_url ?? undefined} sx={{ width: 24, height: 24, fontSize: '0.58rem', fontWeight: 800 }}>
                          {initials(job.owner_name)}
                        </Avatar>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>
                          {job.owner_name}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                        Sem responsável principal
                      </Typography>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {(job.assignees?.length ?? 0) > 0 ? (
                      job.assignees?.map((assignee) => (
                        <Chip
                          key={assignee.user_id}
                          size="small"
                          avatar={<Avatar src={assignee.avatar_url ?? undefined}>{initials(assignee.name)}</Avatar>}
                          label={assignee.name}
                        />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        Nenhuma pessoa adicional no job.
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={1}>
                  <Autocomplete
                    options={owners}
                    value={selectedOwner}
                    onChange={(_event, value) => {
                      const nextOwnerId = value?.id || null;
                      setSelectedOwnerId(nextOwnerId);
                      if (nextOwnerId && !selectedAssigneeIds.includes(nextOwnerId)) {
                        setSelectedAssigneeIds((current) => [...current, nextOwnerId]);
                      }
                    }}
                    getOptionLabel={(option) => option.name}
                    renderInput={(params) => <TextField {...params} label="Responsável principal" size="small" />}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.6rem', fontWeight: 800 }}>
                            {initials(option.name)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'} · {option.specialty || option.role}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    )}
                  />

                  <Autocomplete
                    multiple
                    options={owners}
                    value={selectedAssignees}
                    onChange={(_event, value) => {
                      const ids = value.map((item) => item.id);
                      setSelectedAssigneeIds(ids);
                      if (selectedOwnerId && !ids.includes(selectedOwnerId)) {
                        setSelectedOwnerId(ids[0] ?? null);
                      }
                    }}
                    getOptionLabel={(option) => option.name}
                    renderInput={(params) => <TextField {...params} label="Equipe do job" size="small" placeholder="Adicionar pessoa..." />}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          key={option.id}
                          size="small"
                          avatar={<Avatar>{initials(option.name)}</Avatar>}
                          label={option.name}
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.6rem', fontWeight: 800 }}>
                            {initials(option.name)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'} · {option.specialty || option.role}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    )}
                  />

                  {peopleError && <Alert severity="error" sx={{ fontSize: '0.78rem', py: 0.5 }}>{peopleError}</Alert>}

                  <Button
                    variant="outlined"
                    size="small"
                    disabled={savingPeople}
                    onClick={handlePeopleSave}
                    endIcon={savingPeople ? <CircularProgress size={12} /> : undefined}
                    sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', borderRadius: 2 }}
                  >
                    {savingPeople ? 'Salvando...' : 'Salvar pessoas do job'}
                  </Button>
                </Stack>
              )}
            </Box>

            {/* External link */}
            {job.external_link && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Button
                  component="a"
                  href={job.external_link}
                  target="_blank"
                  rel="noreferrer"
                  size="small"
                  fullWidth
                  endIcon={<IconExternalLink size={13} />}
                  sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', borderRadius: 2, color: 'text.secondary', border: `1px solid ${theme.palette.divider}` }}
                >
                  Abrir no Trello
                </Button>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
