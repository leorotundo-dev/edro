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
  IconBrandWhatsapp,
  IconBrush,
  IconCalendar,
  IconCalendarEvent,
  IconCalendarPlus,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClipboardList,
  IconClock,
  IconExternalLink,
  IconFileText,
  IconFlag,
  IconFlame,
  IconHistory,
  IconMessage,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconUser,
  IconUserPlus,
  IconVideo,
  IconX,
} from '@tabler/icons-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import {
  PRIORITY_LABELS,
  formatMinutes,
  formatSkillLabel,
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

const JOB_TYPE_LABELS: Record<string, string> = {
  copy:            'Copy / Texto',
  design_static:   'Design Estático',
  design_carousel: 'Carrossel',
  video_edit:      'Vídeo',
  meeting:         'Reunião',
  briefing:        'Briefing',
  publication:     'Publicação',
  campaign:        'Campanha',
  urgent_request:  'Pedido Urgente',
};

function formatJobType(type: string | null | undefined) {
  return JOB_TYPE_LABELS[type ?? ''] ?? type ?? '—';
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

/** Convert ISO/date string → YYYY-MM-DD for <input type="date"> */
function toDateInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
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

export default function JobDetailClient({
  id,
  onClose,
  onStatusChange,
}: {
  id: string;
  onClose?: () => void;
  onStatusChange?: (status: string) => Promise<void>;
}) {
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

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  // Inline description editing
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);

  // Status change
  const [movingStatus, setMovingStatus] = useState(false);
  const [statusSelectOpen, setStatusSelectOpen] = useState(false);

  // Campaign link
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [availableCampaigns, setAvailableCampaigns] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [linkingCampaign, setLinkingCampaign] = useState(false);

  // Checklist item toggling
  const [togglingItem, setTogglingItem] = useState<string | null>(null);

  // Quick copy generation
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [quickCopyText, setQuickCopyText] = useState<string | null>(null);

  // Inline deadline editing
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);

  // Job controls: urgency, size, estimate
  const [urgentSaving, setUrgentSaving] = useState(false);
  const [sizeSaving, setSizeSaving] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [estimateDraft, setEstimateDraft] = useState('');
  const [estimateSaving, setEstimateSaving] = useState(false);

  // WhatsApp notify
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappPhoneOpen, setWhatsappPhoneOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappSent, setWhatsappSent] = useState(false);

  // Meeting scheduler
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('09:00');
  const [meetingDuration, setMeetingDuration] = useState('60');
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingResult, setMeetingResult] = useState<{ meet_url?: string; html_link?: string } | null>(null);

  // Definition of Done editing
  const [editingDOD, setEditingDOD] = useState(false);
  const [dodDraft, setDodDraft] = useState('');
  const [savingDOD, setSavingDOD] = useState(false);

  // Checklist template
  const [checklistTemplateOpen, setChecklistTemplateOpen] = useState(false);
  const [addingChecklistTemplate, setAddingChecklistTemplate] = useState(false);

  // Add attachment / URL reference
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [addingAttachment, setAddingAttachment] = useState(false);

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

  const saveTitle = async () => {
    if (!job || !titleDraft.trim() || titleDraft.trim() === job.title) { setEditingTitle(false); return; }
    setSavingTitle(true);
    try {
      const res = await apiPatch<{ data?: OperationsJob }>(`/trello/ops-cards/${id}`, { title: titleDraft.trim() });
      if (res?.data) setJob(res.data);
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  };

  const saveDesc = async () => {
    if (!job) { setEditingDesc(false); return; }
    setSavingDesc(true);
    try {
      const res = await apiPatch<{ data?: OperationsJob }>(`/trello/ops-cards/${id}`, { summary: descDraft });
      if (res?.data) setJob(res.data);
    } finally {
      setSavingDesc(false);
      setEditingDesc(false);
    }
  };

  const toggleChecklistItem = async (checklistId: string, itemId: string | undefined, currentChecked: boolean, itemIndex: number) => {
    if (!job) return;
    const newState = currentChecked ? 'incomplete' : 'complete';

    // Optimistic update
    setJob((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklists: prev.checklists?.map((cl) =>
          cl.id !== checklistId ? cl : {
            ...cl,
            items: cl.items.map((item, i) =>
              i !== itemIndex ? item : { ...item, checked: !currentChecked }
            ),
          }
        ),
      };
    });

    if (itemId) {
      setTogglingItem(itemId);
      try {
        await apiPatch(`/trello/ops-cards/${id}/checklist-items/${itemId}`, { state: newState });
      } catch {
        // Revert optimistic update on failure
        setJob((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            checklists: prev.checklists?.map((cl) =>
              cl.id !== checklistId ? cl : {
                ...cl,
                items: cl.items.map((item, i) =>
                  i !== itemIndex ? item : { ...item, checked: currentChecked }
                ),
              }
            ),
          };
        });
      } finally {
        setTogglingItem(null);
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!job || !onStatusChange || newStatus === job.status) return;
    setMovingStatus(true);
    try {
      await onStatusChange(newStatus);
      await load();
    } catch { /* silent */ } finally {
      setMovingStatus(false);
      setStatusSelectOpen(false);
    }
  };

  const openCampaignPicker = async () => {
    if (!job?.client_id) return;
    setCampaignPickerOpen((v) => !v);
    if (availableCampaigns.length) return; // already loaded
    setLoadingCampaigns(true);
    try {
      const res = await apiGet<{ data?: Array<{ id: string; name: string; status: string }> }>(
        `/campaigns?client_id=${job.client_id}`
      );
      setAvailableCampaigns((res?.data ?? []).filter((c) => c.status !== 'cancelled'));
    } catch { /* silent */ } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleLinkCampaign = async (campaignId: string | null) => {
    if (!job) return;
    setLinkingCampaign(true);
    try {
      if (campaignId) {
        await apiPatch(`/campaigns/${campaignId}/jobs/${job.id}`, { link: true });
      } else {
        // unlink: find current campaign and unlink
        const cur = job.campaign_id;
        if (cur) await apiPatch(`/campaigns/${cur}/jobs/${job.id}`, { link: false });
      }
      await load();
      setCampaignPickerOpen(false);
    } catch { /* silent */ } finally {
      setLinkingCampaign(false);
    }
  };

  const generateQuickCopy = async () => {
    if (!job || generatingCopy) return;
    setGeneratingCopy(true);
    try {
      const res = await apiPost<{ data?: { copy_text: string; generated_at: string } }>(
        `/trello/ops-cards/${id}/quick-copy`,
        {},
      );
      if (res?.data?.copy_text) {
        setQuickCopyText(res.data.copy_text);
        setCopyDialogOpen(true);
        // optimistically update job metadata so the icon flips green
        setJob((prev) => prev ? {
          ...prev,
          metadata: { ...(prev.metadata ?? {}), quick_copy: res.data!.copy_text, quick_copy_generated_at: res.data!.generated_at },
        } : prev);
      }
    } catch { /* silent — user already sees loading stopped */ } finally {
      setGeneratingCopy(false);
    }
  };

  // ── Job controls ──────────────────────────────────────────────────────────────

  const saveDeadline = async () => {
    if (!job || savingDeadline) return;
    setSavingDeadline(true);
    try {
      const res = await apiPatch<{ data?: OperationsJob }>(`/trello/ops-cards/${id}`, {
        deadline_at: deadlineDraft || null,
      });
      if (res?.data) setJob(res.data);
    } finally {
      setSavingDeadline(false);
      setEditingDeadline(false);
    }
  };

  const toggleUrgent = async () => {
    if (!job || urgentSaving) return;
    setUrgentSaving(true);
    try {
      const res = await apiPatch<{ data?: OperationsJob }>(`/trello/ops-cards/${id}`, {
        is_urgent: !job.is_urgent,
      });
      if (res?.data) setJob(res.data);
    } finally {
      setUrgentSaving(false);
    }
  };

  const setJobSizeValue = async (size: string | null) => {
    if (!job || sizeSaving) return;
    const newSize = job.job_size === size ? null : size; // toggle off if already selected
    setSizeSaving(true);
    try {
      const res = await apiPatch<{ data?: OperationsJob }>(`/trello/ops-cards/${id}`, {
        job_size: newSize as any,
      });
      if (res?.data) setJob(res.data);
    } finally {
      setSizeSaving(false);
    }
  };

  const saveEstimate = async () => {
    if (!job || estimateSaving) return;
    const minutes = Math.max(0, Math.round(parseFloat(estimateDraft) * 60));
    setEstimateSaving(true);
    try {
      const res = await apiPatch<{ data?: OperationsJob }>(`/trello/ops-cards/${id}`, {
        estimated_minutes: minutes || null,
      });
      if (res?.data) setJob(res.data);
    } finally {
      setEstimateSaving(false);
      setEditingEstimate(false);
    }
  };

  const sendWhatsApp = async (overridePhone?: string) => {
    if (!job || whatsappSending) return;
    setWhatsappSending(true);
    setWhatsappSent(false);
    try {
      const res = await apiPost<{ ok?: boolean; error?: string; owner_name?: string }>(
        `/trello/ops-cards/${id}/notify-owner`,
        { phone: overridePhone?.trim() || undefined },
      );
      if ((res as any)?.error === 'no_phone') {
        setWhatsappPhoneOpen(true);
      } else if (res?.ok) {
        setWhatsappSent(true);
        setWhatsappPhoneOpen(false);
        setTimeout(() => setWhatsappSent(false), 4000);
      }
    } catch (e: any) {
      // surface error as warning — silent for now
    } finally {
      setWhatsappSending(false);
    }
  };

  const scheduleMeeting = async () => {
    if (!job || meetingLoading || !meetingDate) return;
    setMeetingLoading(true);
    try {
      const startAt = new Date(`${meetingDate}T${meetingTime}:00`).toISOString();
      const res = await apiPost<{ ok?: boolean; data?: { meet_url?: string; html_link?: string } }>(
        `/trello/ops-cards/${id}/meeting`,
        { start_at: startAt, duration_minutes: parseInt(meetingDuration, 10) },
      );
      if (res?.data) {
        setMeetingResult(res.data);
      }
    } catch { /* silent */ } finally {
      setMeetingLoading(false);
    }
  };

  // ── Definition of Done ────────────────────────────────────────────────────────

  const saveDOD = async () => {
    if (!job || savingDOD) return;
    setSavingDOD(true);
    try {
      const res = await apiPatch<{ data?: OperationsJob }>(`/trello/ops-cards/${id}`, {
        definition_of_done: dodDraft.trim() || null,
      });
      if (res?.data) setJob(res.data);
      setEditingDOD(false);
    } catch { /* silent */ } finally {
      setSavingDOD(false);
    }
  };

  // ── Checklist template ────────────────────────────────────────────────────────

  const addChecklistTemplate = async (jobType: string) => {
    if (!job || addingChecklistTemplate) return;
    setAddingChecklistTemplate(true);
    setChecklistTemplateOpen(false);
    try {
      const res = await apiPost<{ data?: OperationsJob }>(`/trello/ops-cards/${id}/add-checklist`, { job_type: jobType });
      if (res?.data) setJob(res.data);
      else await load();
    } catch { /* silent */ } finally {
      setAddingChecklistTemplate(false);
    }
  };

  // ── Add attachment / URL reference ────────────────────────────────────────────

  const addAttachment = async () => {
    if (!job || addingAttachment || !attachmentUrl.trim()) return;
    setAddingAttachment(true);
    try {
      const res = await apiPost<{ data?: OperationsJob }>(`/trello/ops-cards/${id}/add-attachment`, {
        url: attachmentUrl.trim(),
        name: attachmentName.trim() || undefined,
      });
      if (res?.data) setJob(res.data);
      else await load();
      setAttachmentOpen(false);
      setAttachmentUrl('');
      setAttachmentName('');
    } catch { /* silent */ } finally {
      setAddingAttachment(false);
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
  const deadlineInfo = deadlinePulse(job.deadline_at);
  const priorityLabel = PRIORITY_LABELS[job.priority_band] ?? job.priority_band;
  const skillLabel = formatSkillLabel(job.required_skill);
  const estimateLabel = job.estimated_minutes ? formatMinutes(job.estimated_minutes) : 'Sem estimativa';
  const railStickyTop = onClose ? 20 : 80;
  const selectedOwner = owners.find((owner) => owner.id === selectedOwnerId) || null;
  const selectedAssignees = owners.filter((owner) => selectedAssigneeIds.includes(owner.id));

  const trelloLabels = (job.labels ?? (job.metadata?.labels as any[]) ?? []) as Array<{ color: string | null; name: string; hex?: string }>;
  const trelloAttachments = (job.attachments ?? (job.metadata?.attachments as any[]) ?? []) as Array<{ url: string; name: string; preview_url?: string | null; is_image?: boolean }>;
  const coverUrl = job.cover_url ?? (job.metadata?.cover_image_url as string | null) ?? null;

  // Copy status: green if quick_copy is saved in metadata, or if a briefing_id is linked
  const hasCopy = Boolean(job.metadata?.quick_copy || job.metadata?.briefing_id);
  const existingCopyText = (job.metadata?.quick_copy as string | undefined) ?? null;

  // Date helpers
  const entryDate = job.start_date ?? job.created_at ?? null;
  const deadlineOverdue = job.deadline_at ? new Date(job.deadline_at) < new Date() : false;
  const deadlineThisWeek = job.deadline_at
    ? !deadlineOverdue && (new Date(job.deadline_at).getTime() - Date.now()) < 7 * 86400000
    : false;

  // ── Metric tiles (concrete, actionable) ──────────────────────────────────────
  const daysDiff = job.deadline_at
    ? Math.round((new Date(job.deadline_at).getTime() - Date.now()) / 86400000)
    : null;
  const prazoValue = daysDiff === null ? 'Sem prazo'
    : daysDiff < 0  ? `${Math.abs(daysDiff)} dia${Math.abs(daysDiff) !== 1 ? 's' : ''} de atraso`
    : daysDiff === 0 ? 'Vence hoje'
    : daysDiff === 1 ? 'Vence amanhã'
    : `${daysDiff} dias restantes`;
  const prazoCaption = daysDiff === null ? 'Defina um prazo de entrega'
    : daysDiff < 0  ? 'Prazo ultrapassado — ação necessária'
    : daysDiff <= 2 ? 'Atenção: vence em breve'
    : 'Dentro do prazo';
  const prazoColor = daysDiff === null ? '#9E9E9E'
    : daysDiff < 0  ? '#FA896B'
    : daysDiff <= 2 ? '#FFAE1F'
    : '#13DEB9';

  const progressValue = pct !== null
    ? `${checkedCount}/${allItems.length} itens`
    : 'Sem checklist';
  const progressCaption = pct !== null
    ? pct === 100 ? 'Tudo concluído!' : `${pct}% do checklist feito`
    : 'Adicione um checklist para acompanhar';
  const progressColor = pct === null ? '#9E9E9E'
    : pct === 100 ? '#13DEB9'
    : pct >= 50 ? '#5D87FF'
    : '#FFAE1F';

  const tamanhoValue = job.job_size
    ? `Tamanho ${job.job_size}`
    : job.estimated_minutes
      ? estimateLabel
      : 'Não definido';
  const tamanhoCaption = job.job_size && job.estimated_minutes
    ? estimateLabel
    : job.job_size
      ? 'Defina uma estimativa de horas'
      : 'Configure tamanho ou estimativa';
  const tamanhoColor = (job.job_size || job.estimated_minutes) ? '#5D87FF' : '#9E9E9E';

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      {/* ── Cover image (Trello-style) ── */}
      {coverUrl && (
        <Box
          sx={{
            mx: { xs: -2, md: -4 },
            mt: -3,
            mb: 2.5,
            height: 120,
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px 12px 0 0',
          }}
        />
      )}

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
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
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
          {editingTitle ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                onBlur={saveTitle}
                disabled={savingTitle}
                size="small"
                fullWidth
                inputProps={{ style: { fontSize: '1.2rem', fontWeight: 800 } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              {savingTitle && <CircularProgress size={16} />}
            </Stack>
          ) : (
            <Tooltip title="Clique para editar o título" placement="top-start">
              <Typography
                fontWeight={800}
                sx={{
                  lineHeight: 1.2,
                  fontSize: { xs: '1.4rem', md: '1.7rem' },
                  color: 'text.primary',
                  cursor: 'text',
                  borderRadius: 1,
                  px: 0.5,
                  mx: -0.5,
                  '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                }}
                onClick={() => { setTitleDraft(job.title); setEditingTitle(true); }}
              >
                {cleanJobTitle(job.title, job.client_name)}
              </Typography>
            </Tooltip>
          )}
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip size="small" variant="outlined" label={formatJobType(job.job_type)} sx={{ fontWeight: 700 }} />
            {skillLabel && !skillLabel.toLowerCase().includes('indefin') && (
              <Chip size="small" variant="outlined" label={skillLabel} sx={{ fontWeight: 700 }} />
            )}
            {job.channel ? <Chip size="small" variant="outlined" label={job.channel} sx={{ fontWeight: 700 }} /> : null}
            {job.job_size ? (
              <Chip size="small" variant="outlined" label={`Tamanho ${job.job_size}`} sx={{ fontWeight: 700, color: '#5D87FF', borderColor: '#5D87FF' }} />
            ) : null}
            {job.is_urgent ? null : null /* urgent already shown as top chip */}
          </Stack>

          {/* ── Trello labels row ── */}
          {trelloLabels.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {trelloLabels.map((label, i) => (
                <Box
                  key={i}
                  sx={{
                    height: 20,
                    minWidth: 48,
                    px: 1,
                    borderRadius: '4px',
                    bgcolor: label.hex ?? (label.color ? `#${label.color}` : '#B3BEC4'),
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'default',
                  }}
                  title={label.name || label.color || ''}
                >
                  {label.name && (
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', lineHeight: 1, textShadow: '0 1px 1px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
                      {label.name}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}
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
        </Stack>
      </Stack>

      {/* ── DATE HERO BANNER ── */}
      <Paper
        variant="outlined"
        sx={(t) => ({
          borderRadius: 3,
          mb: 2.5,
          overflow: 'hidden',
          borderColor: deadlineOverdue
            ? alpha('#FA896B', 0.4)
            : deadlineThisWeek
              ? alpha('#FFAE1F', 0.35)
              : t.palette.divider,
          bgcolor: deadlineOverdue
            ? alpha('#FA896B', 0.04)
            : deadlineThisWeek
              ? alpha('#FFAE1F', 0.04)
              : 'transparent',
        })}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} divider={<Divider orientation="vertical" flexItem />}>
          {/* Entrada */}
          <Box sx={{ flex: 1, px: 3, py: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <IconCalendarEvent size={15} color={theme.palette.text.disabled as string} />
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Entrada
              </Typography>
            </Stack>
            <Typography
              fontWeight={800}
              sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1, color: 'text.primary' }}
            >
              {entryDate ? fmtDate(entryDate) : '—'}
            </Typography>
            {job.client_name && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 600, mt: 0.35, display: 'block' }}>
                {job.client_name}
              </Typography>
            )}
          </Box>

          {/* Entrega — click to edit */}
          <Box
            sx={{ flex: 1, px: 3, py: 2, cursor: editingDeadline ? 'default' : 'pointer', position: 'relative' }}
            onClick={() => {
              if (!editingDeadline) {
                setDeadlineDraft(toDateInput(job.deadline_at));
                setEditingDeadline(true);
              }
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <IconFlag
                size={15}
                color={deadlineOverdue ? '#FA896B' : deadlineThisWeek ? '#FFAE1F' : theme.palette.text.disabled as string}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: deadlineOverdue ? '#FA896B' : deadlineThisWeek ? '#B26A00' : 'text.disabled',
                }}
              >
                Entrega
              </Typography>
              {!editingDeadline && (
                <Tooltip title="Clique para alterar o prazo">
                  <Box sx={{ ml: 'auto', opacity: 0.4, '&:hover': { opacity: 0.8 } }}>
                    <IconPencil size={12} />
                  </Box>
                </Tooltip>
              )}
              {deadlineOverdue && !editingDeadline && (
                <Chip size="small" label="Atrasado" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: alpha('#FA896B', 0.15), color: '#FA896B', ml: 0.5 }} />
              )}
              {!deadlineOverdue && deadlineThisWeek && !editingDeadline && (
                <Chip size="small" label="Esta semana" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800, bgcolor: alpha('#FFAE1F', 0.15), color: '#B26A00', ml: 0.5 }} />
              )}
            </Stack>
            {editingDeadline ? (
              <Stack direction="row" spacing={1} alignItems="center" onClick={(e) => e.stopPropagation()}>
                <Box
                  component="input"
                  type="date"
                  value={deadlineDraft}
                  onChange={(e) => setDeadlineDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveDeadline();
                    if (e.key === 'Escape') setEditingDeadline(false);
                  }}
                  autoFocus
                  sx={{
                    fontSize: '1.1rem', fontWeight: 800, border: 'none', outline: 'none', p: '4px 8px',
                    borderRadius: 1, bgcolor: dark ? alpha('#fff', 0.08) : alpha('#000', 0.05),
                    color: 'inherit', fontFamily: 'inherit', width: 'auto',
                  }}
                />
                <Button
                  size="small" variant="contained"
                  disabled={savingDeadline}
                  onClick={saveDeadline}
                  sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', minWidth: 0, px: 1.5 }}
                >
                  {savingDeadline ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : 'Salvar'}
                </Button>
                <Button size="small" onClick={() => setEditingDeadline(false)}
                  sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1.5, minWidth: 0 }}>
                  ✕
                </Button>
              </Stack>
            ) : (
              <>
                <Typography
                  fontWeight={800}
                  sx={{
                    fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1,
                    color: deadlineOverdue ? '#FA896B' : deadlineThisWeek ? '#B26A00' : 'text.primary',
                  }}
                >
                  {job.deadline_at ? fmtDate(job.deadline_at) : 'Sem prazo'}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600, mt: 0.35, display: 'block', color: deadlineOverdue ? alpha('#FA896B', 0.8) : 'text.secondary' }}>
                  {deadlineInfo.label}
                </Typography>
              </>
            )}
          </Box>
        </Stack>
      </Paper>

      {/* ── OWNER HERO ── */}
      <Paper
        variant="outlined"
        sx={(t) => ({
          borderRadius: 3,
          mb: 2.5,
          px: 2.5,
          py: 1.75,
          borderColor: !job.owner_id ? alpha('#FFAE1F', 0.4) : t.palette.divider,
          bgcolor: !job.owner_id ? alpha('#FFAE1F', 0.03) : 'transparent',
        })}
      >
        {job.owner_id && job.owner_name ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={job.owner_avatar_url ?? undefined}
              sx={{
                width: 52,
                height: 52,
                fontSize: '1.05rem',
                fontWeight: 800,
                bgcolor: alpha('#5D87FF', 0.15),
                color: '#5D87FF',
                flexShrink: 0,
              }}
            >
              {initials(job.owner_name)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Responsável
              </Typography>
              <Typography fontWeight={800} sx={{ fontSize: '1.1rem', lineHeight: 1.2, mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {job.owner_name}
              </Typography>
              {job.person_type && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                  {job.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'}
                </Typography>
              )}
            </Box>
            <Tooltip title="Trocar responsável">
              <IconButton
                size="small"
                onClick={() => { setPeopleOpen(true); setPeopleError(''); }}
                sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
              >
                <IconUser size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                border: `2px dashed ${alpha('#FFAE1F', 0.5)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconUser size={22} color={alpha('#FFAE1F', 0.7)} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Responsável
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: '0.9rem', fontWeight: 600, mt: 0.25 }}>
                Nenhum responsável definido
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconUserPlus size={15} />}
              onClick={() => { setPeopleOpen(true); setPeopleError(''); }}
              sx={{
                fontWeight: 700, fontSize: '0.8rem', textTransform: 'none', borderRadius: 2,
                borderColor: alpha('#FFAE1F', 0.5), color: '#B26A00',
                '&:hover': { borderColor: '#FFAE1F', bgcolor: alpha('#FFAE1F', 0.06) },
                whiteSpace: 'nowrap',
              }}
            >
              Atribuir a alguém
            </Button>
          </Stack>
        )}

        {/* ── People picker — inline below owner hero ── */}
        {peopleOpen && (
          <Stack spacing={1.25} sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
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
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.6rem', fontWeight: 800 }}>{initials(option.name)}</Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{option.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'} · {option.specialty || option.role}</Typography>
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
                if (selectedOwnerId && !ids.includes(selectedOwnerId)) setSelectedOwnerId(ids[0] ?? null);
              }}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => <TextField {...params} label="Equipe do job" size="small" placeholder="Adicionar pessoa..." />}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip key={option.id} size="small" avatar={<Avatar>{initials(option.name)}</Avatar>} label={option.name} {...getTagProps({ index })} />
                ))
              }
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.6rem', fontWeight: 800 }}>{initials(option.name)}</Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{option.person_type === 'freelancer' ? 'Freelancer' : 'Equipe interna'} · {option.specialty || option.role}</Typography>
                    </Box>
                  </Stack>
                </Box>
              )}
            />
            {peopleError && <Alert severity="error" sx={{ fontSize: '0.78rem', py: 0.5 }}>{peopleError}</Alert>}
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" disabled={savingPeople} onClick={handlePeopleSave}
                endIcon={savingPeople ? <CircularProgress size={12} /> : undefined}
                sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', flex: 1 }}>
                {savingPeople ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button size="small" onClick={() => { setPeopleOpen(false); setPeopleError(''); }}
                sx={{ fontWeight: 600, fontSize: '0.78rem', textTransform: 'none', borderRadius: 1.5 }}>
                Cancelar
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>

      {/* ── JOB CONTROLS PANEL ── */}
      <Paper
        variant="outlined"
        sx={(t) => ({ borderRadius: 3, mb: 2.5, overflow: 'hidden', borderColor: t.palette.divider })}
      >
        <Box sx={{ px: 2.5, pt: 1.75, pb: 2 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Configurar job
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>

            {/* Urgente toggle */}
            <Tooltip title={job.is_urgent ? 'Remover urgência' : 'Marcar como urgente'}>
              <Chip
                icon={urgentSaving ? <CircularProgress size={12} /> : <IconFlame size={14} />}
                label="Urgente"
                clickable
                onClick={toggleUrgent}
                disabled={urgentSaving}
                sx={{
                  fontWeight: 800, fontSize: '0.78rem',
                  bgcolor: job.is_urgent ? alpha('#F9A825', 0.15) : (dark ? alpha('#fff', 0.07) : alpha('#000', 0.06)),
                  color: job.is_urgent ? '#F9A825' : 'text.secondary',
                  border: job.is_urgent ? `1px solid ${alpha('#F9A825', 0.4)}` : '1px solid transparent',
                  '&:hover': { bgcolor: alpha('#F9A825', 0.2) },
                }}
              />
            </Tooltip>

            {/* Divider */}
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            {/* Size picker */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem', fontWeight: 700, mr: 0.5 }}>
                Tamanho
              </Typography>
              {(['P', 'M', 'G', 'GG'] as const).map((size) => (
                <Chip
                  key={size}
                  label={size}
                  size="small"
                  clickable
                  disabled={sizeSaving}
                  onClick={() => setJobSizeValue(size)}
                  sx={{
                    fontWeight: 800, fontSize: '0.72rem', height: 26, minWidth: 32,
                    bgcolor: job.job_size === size ? '#5D87FF' : (dark ? alpha('#fff', 0.07) : alpha('#000', 0.06)),
                    color: job.job_size === size ? '#fff' : 'text.secondary',
                    border: job.job_size === size ? `1px solid #5D87FF` : '1px solid transparent',
                    '&:hover': { bgcolor: job.job_size === size ? '#4a72f5' : alpha('#5D87FF', 0.15) },
                  }}
                />
              ))}
            </Stack>

            {/* Divider */}
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            {/* Estimated time */}
            <Stack direction="row" spacing={0.75} alignItems="center">
              <IconClock size={15} color={theme.palette.text.disabled as string} />
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem', fontWeight: 700 }}>
                Estimativa
              </Typography>
              {editingEstimate ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Box
                    component="input"
                    type="number"
                    min="0"
                    step="0.5"
                    value={estimateDraft}
                    onChange={(e) => setEstimateDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEstimate();
                      if (e.key === 'Escape') setEditingEstimate(false);
                    }}
                    placeholder="horas"
                    autoFocus
                    sx={{
                      width: 72, fontSize: '0.82rem', fontWeight: 700, border: 'none', outline: 'none',
                      p: '3px 8px', borderRadius: 1,
                      bgcolor: dark ? alpha('#fff', 0.08) : alpha('#000', 0.05),
                      color: 'inherit', fontFamily: 'inherit',
                    }}
                  />
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>h</Typography>
                  <IconButton size="small" onClick={saveEstimate} disabled={estimateSaving} sx={{ p: 0.25 }}>
                    {estimateSaving ? <CircularProgress size={10} /> : <IconCheck size={13} />}
                  </IconButton>
                  <IconButton size="small" onClick={() => setEditingEstimate(false)} sx={{ p: 0.25, opacity: 0.5 }}>
                    <IconX size={13} />
                  </IconButton>
                </Stack>
              ) : (
                <Tooltip title="Clique para definir estimativa">
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    onClick={() => {
                      setEstimateDraft(job.estimated_minutes ? String(job.estimated_minutes / 60) : '');
                      setEditingEstimate(true);
                    }}
                    sx={{
                      fontSize: '0.82rem', cursor: 'pointer', color: job.estimated_minutes ? 'text.primary' : 'text.disabled',
                      borderRadius: 1, px: 0.5, '&:hover': { bgcolor: dark ? alpha('#fff', 0.06) : alpha('#000', 0.05) },
                    }}
                  >
                    {job.estimated_minutes ? formatMinutes(job.estimated_minutes) : 'Definir →'}
                  </Typography>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* ── NOTIFY / DISPATCH PANEL ── */}
      <Paper
        variant="outlined"
        sx={(t) => ({ borderRadius: 3, mb: 2.5, overflow: 'hidden', borderColor: t.palette.divider })}
      >
        <Box sx={{ px: 2.5, pt: 1.75, pb: meetingOpen ? 0 : 2 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Notificar & Despachar
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>

            {/* WhatsApp pro DA */}
            {!whatsappPhoneOpen ? (
              <Tooltip title={!job.owner_id ? 'Atribua um responsável primeiro' : whatsappSent ? 'Mensagem enviada!' : 'Enviar WhatsApp para o DA'}>
                <span>
                  <Button
                    size="small"
                    startIcon={whatsappSending ? <CircularProgress size={13} /> : whatsappSent ? <IconCheck size={15} /> : <IconBrandWhatsapp size={15} />}
                    disabled={!job.owner_id || whatsappSending}
                    onClick={() => sendWhatsApp()}
                    sx={{
                      fontWeight: 700, fontSize: '0.82rem', textTransform: 'none', borderRadius: 2,
                      color: whatsappSent ? '#13DEB9' : '#25D366',
                      bgcolor: whatsappSent ? alpha('#13DEB9', 0.1) : alpha('#25D366', 0.1),
                      border: `1px solid ${whatsappSent ? alpha('#13DEB9', 0.3) : alpha('#25D366', 0.3)}`,
                      '&:hover': { bgcolor: alpha('#25D366', 0.18) },
                      '&:disabled': { opacity: 0.45 },
                    }}
                  >
                    {whatsappSent ? 'WA enviado!' : `WhatsApp${job.owner_name ? ` → ${job.owner_name.split(' ')[0]}` : ' pro DA'}`}
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box
                  component="input"
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                  autoFocus
                  sx={{
                    fontSize: '0.82rem', fontWeight: 600, border: 'none', outline: 'none',
                    p: '6px 10px', borderRadius: 1.5, width: 180,
                    bgcolor: dark ? alpha('#fff', 0.08) : alpha('#000', 0.05),
                    color: 'inherit', fontFamily: 'inherit',
                  }}
                />
                <Button
                  size="small" variant="contained"
                  disabled={whatsappSending || !whatsappPhone.trim()}
                  onClick={() => sendWhatsApp(whatsappPhone)}
                  sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', bgcolor: '#25D366', '&:hover': { bgcolor: '#1da851' } }}
                >
                  {whatsappSending ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : 'Enviar'}
                </Button>
                <IconButton size="small" onClick={() => setWhatsappPhoneOpen(false)} sx={{ opacity: 0.5 }}>
                  <IconX size={14} />
                </IconButton>
              </Stack>
            )}

            {/* Agendar Kickoff */}
            <Button
              size="small"
              startIcon={<IconCalendarPlus size={15} />}
              onClick={() => { setMeetingOpen((v) => !v); setMeetingResult(null); }}
              sx={{
                fontWeight: 700, fontSize: '0.82rem', textTransform: 'none', borderRadius: 2,
                color: '#5D87FF',
                bgcolor: alpha('#5D87FF', 0.1),
                border: `1px solid ${alpha('#5D87FF', 0.3)}`,
                '&:hover': { bgcolor: alpha('#5D87FF', 0.18) },
              }}
            >
              Agendar Kickoff
            </Button>

          </Stack>
        </Box>

        {/* Meeting form — expands inline */}
        {meetingOpen && (
          <Box sx={{ px: 2.5, pb: 2, pt: 1.5, borderTop: `1px solid ${dark ? alpha('#fff', 0.07) : alpha('#000', 0.06)}`, mt: 1.5 }}>
            {meetingResult ? (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconCheck size={16} color="#13DEB9" />
                  <Typography fontWeight={700} sx={{ fontSize: '0.88rem', color: '#13DEB9' }}>Reunião criada!</Typography>
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  {meetingResult.meet_url && (
                    <Button
                      size="small" variant="contained"
                      component="a" href={meetingResult.meet_url} target="_blank" rel="noreferrer"
                      startIcon={<IconVideo size={14} />}
                      sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', borderRadius: 2, boxShadow: 'none' }}
                    >
                      Abrir Meet
                    </Button>
                  )}
                  {meetingResult.html_link && (
                    <Button
                      size="small" variant="outlined"
                      component="a" href={meetingResult.html_link} target="_blank" rel="noreferrer"
                      startIcon={<IconCalendarEvent size={14} />}
                      sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', borderRadius: 2 }}
                    >
                      Ver no Calendar
                    </Button>
                  )}
                  <Button size="small" onClick={() => { setMeetingOpen(false); setMeetingResult(null); }}
                    sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: 2, opacity: 0.6 }}>
                    Fechar
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  Kickoff: {cleanJobTitle(job.title, job.client_name)}
                  {job.owner_name ? ` • com ${job.owner_name.split(' ')[0]}` : ''}
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <Box>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Data</Typography>
                    <Box
                      component="input"
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      sx={{
                        fontSize: '0.82rem', fontWeight: 600, border: 'none', outline: 'none',
                        p: '6px 10px', borderRadius: 1.5,
                        bgcolor: dark ? alpha('#fff', 0.08) : alpha('#000', 0.05),
                        color: 'inherit', fontFamily: 'inherit',
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Hora</Typography>
                    <Box
                      component="input"
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      sx={{
                        fontSize: '0.82rem', fontWeight: 600, border: 'none', outline: 'none',
                        p: '6px 10px', borderRadius: 1.5,
                        bgcolor: dark ? alpha('#fff', 0.08) : alpha('#000', 0.05),
                        color: 'inherit', fontFamily: 'inherit',
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>Duração</Typography>
                    <Stack direction="row" spacing={0.5}>
                      {[30, 60, 90].map((min) => (
                        <Chip
                          key={min}
                          label={`${min}min`}
                          size="small"
                          clickable
                          onClick={() => setMeetingDuration(String(min))}
                          sx={{
                            fontWeight: 700, fontSize: '0.7rem', height: 26,
                            bgcolor: meetingDuration === String(min) ? '#5D87FF' : (dark ? alpha('#fff', 0.07) : alpha('#000', 0.06)),
                            color: meetingDuration === String(min) ? '#fff' : 'text.secondary',
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small" variant="contained"
                    disabled={meetingLoading || !meetingDate}
                    onClick={scheduleMeeting}
                    startIcon={meetingLoading ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <IconCalendarPlus size={14} />}
                    sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', borderRadius: 2, boxShadow: 'none' }}
                  >
                    {meetingLoading ? 'Criando...' : 'Criar com Google Meet'}
                  </Button>
                  <Button size="small" onClick={() => setMeetingOpen(false)}
                    sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: 2, opacity: 0.6 }}>
                    Cancelar
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        )}
      </Paper>

      {/* ── COPY STATUS BANNER ── */}
      <Paper
        variant="outlined"
        sx={(t) => ({
          borderRadius: 3,
          mb: 2.5,
          px: 2.5,
          py: 1.5,
          borderColor: hasCopy ? alpha('#13DEB9', 0.35) : alpha('#5D87FF', 0.25),
          bgcolor: hasCopy ? alpha('#13DEB9', 0.03) : alpha('#5D87FF', 0.03),
        })}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2, flexShrink: 0,
              bgcolor: hasCopy ? alpha('#13DEB9', 0.12) : alpha('#5D87FF', 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {hasCopy
              ? <IconFileText size={20} color="#13DEB9" />
              : <IconSparkles size={20} color="#5D87FF" />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={700} sx={{ fontSize: '0.88rem', color: hasCopy ? '#13DEB9' : 'text.primary' }}>
              {hasCopy ? 'Copy disponível' : 'Sem copy gerado'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              {hasCopy
                ? 'Clique para visualizar o copy gerado pelo Jarvis'
                : 'O Jarvis pode gerar um copy na hora para este job'}
            </Typography>
          </Box>
          {hasCopy ? (
            <Button
              size="small"
              startIcon={<IconFileText size={14} />}
              onClick={() => { setQuickCopyText(existingCopyText); setCopyDialogOpen(true); }}
              sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', borderRadius: 2, color: '#13DEB9', whiteSpace: 'nowrap' }}
            >
              Ver copy
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              startIcon={generatingCopy ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <IconSparkles size={14} />}
              disabled={generatingCopy}
              onClick={generateQuickCopy}
              sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'none', borderRadius: 2, boxShadow: 'none', whiteSpace: 'nowrap' }}
            >
              {generatingCopy ? 'Gerando...' : 'Gerar com Jarvis'}
            </Button>
          )}
        </Stack>
      </Paper>

      {/* ── COPY DIALOG ── */}
      {copyDialogOpen && (
        <Paper
          variant="outlined"
          sx={(t) => ({
            borderRadius: 3,
            mb: 2.5,
            p: 2.5,
            borderColor: alpha('#13DEB9', 0.4),
            bgcolor: dark ? alpha('#13DEB9', 0.05) : alpha('#13DEB9', 0.03),
            position: 'relative',
          })}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconSparkles size={16} color="#13DEB9" />
              <Typography fontWeight={800} sx={{ fontSize: '0.88rem', color: '#13DEB9' }}>
                Copy gerado pelo Jarvis
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Abrir briefing completo">
                <IconButton size="small" component={Link} href={`/admin/operacoes/jobs/${job.id}/briefing`}
                  sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}>
                  <IconExternalLink size={14} />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setCopyDialogOpen(false)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                <IconX size={14} />
              </IconButton>
            </Stack>
          </Stack>
          <Box
            sx={{
              p: 2, borderRadius: 2,
              bgcolor: dark ? alpha('#fff', 0.04) : alpha('#000', 0.025),
              border: `1px solid ${dark ? alpha('#fff', 0.07) : alpha('#000', 0.07)}`,
            }}
          >
            <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', color: 'text.primary' }}>
              {quickCopyText || '(copy não disponível)'}
            </Typography>
          </Box>
        </Paper>
      )}

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
                eyebrow="Prazo"
                value={prazoValue}
                caption={prazoCaption}
                color={prazoColor}
              />
              <SignalTile
                eyebrow="Progresso"
                value={progressValue}
                caption={progressCaption}
                color={progressColor}
              />
              <SignalTile
                eyebrow="Tamanho / Estimativa"
                value={tamanhoValue}
                caption={tamanhoCaption}
                color={tamanhoColor}
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
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Descrição e contexto
                </Typography>
                {!editingDesc && (
                  <Tooltip title="Editar descrição">
                    <IconButton
                      size="small"
                      onClick={() => { setDescDraft(job.summary ?? ''); setEditingDesc(true); }}
                      sx={{ p: 0.25, opacity: 0.4, '&:hover': { opacity: 1 } }}
                    >
                      <IconPencil size={13} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
              {editingDesc ? (
                <Stack spacing={1}>
                  <TextField
                    autoFocus
                    multiline
                    minRows={4}
                    maxRows={16}
                    fullWidth
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    disabled={savingDesc}
                    size="small"
                    placeholder="Adicione uma descrição..."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.84rem' } }}
                  />
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => setEditingDesc(false)} disabled={savingDesc} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', borderRadius: 2 }}>
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={saveDesc}
                      disabled={savingDesc}
                      endIcon={savingDesc ? <CircularProgress size={12} /> : undefined}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', borderRadius: 2, boxShadow: 'none' }}
                    >
                      {savingDesc ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </Stack>
                </Stack>
              ) : job.summary ? (
                <Typography variant="body2" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'text.primary' }}>
                  {renderDescription(job.summary)}
                </Typography>
              ) : (
                <Typography
                  variant="body2"
                  color="text.disabled"
                  sx={{ cursor: 'text', fontStyle: 'italic', fontSize: '0.84rem' }}
                  onClick={() => { setDescDraft(''); setEditingDesc(true); }}
                >
                  Clique para adicionar uma descrição...
                </Typography>
              )}
              {!editingDesc && (
                <Box
                  sx={(theme) => ({
                    mt: 2,
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: theme.palette.mode === 'dark' ? alpha('#13DEB9', 0.06) : alpha('#13DEB9', 0.03),
                    border: `1px solid ${alpha('#13DEB9', job.definition_of_done ? 0.18 : 0.1)}`,
                  })}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: job.definition_of_done && !editingDOD ? 0.45 : 0 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.64rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#13DEB9' }}>
                      Definition of Done
                    </Typography>
                    {!editingDOD && (
                      <Tooltip title={job.definition_of_done ? 'Editar' : 'Adicionar'}>
                        <IconButton
                          size="small"
                          onClick={() => { setDodDraft(job.definition_of_done ?? ''); setEditingDOD(true); }}
                          sx={{ p: 0.25, opacity: 0.45, '&:hover': { opacity: 1 } }}
                        >
                          <IconPencil size={12} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  {editingDOD ? (
                    <Stack spacing={1} sx={{ mt: 0.5 }}>
                      <TextField
                        autoFocus
                        multiline
                        minRows={2}
                        maxRows={8}
                        fullWidth
                        value={dodDraft}
                        onChange={(e) => setDodDraft(e.target.value)}
                        disabled={savingDOD}
                        size="small"
                        placeholder="Ex: Copy aprovada pelo cliente + link do doc no comentário"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.82rem' } }}
                      />
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => setEditingDOD(false)} disabled={savingDOD} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: 2 }}>
                          Cancelar
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={saveDOD}
                          disabled={savingDOD}
                          endIcon={savingDOD ? <CircularProgress size={11} /> : undefined}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: 2, boxShadow: 'none', bgcolor: '#13DEB9', '&:hover': { bgcolor: '#0ec8a8' } }}
                        >
                          {savingDOD ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </Stack>
                    </Stack>
                  ) : job.definition_of_done ? (
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
                      {job.definition_of_done}
                    </Typography>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.disabled"
                      sx={{ cursor: 'text', fontStyle: 'italic', fontSize: '0.8rem', mt: 0.5 }}
                      onClick={() => { setDodDraft(''); setEditingDOD(true); }}
                    >
                      Clique para definir o critério de pronto...
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>

            {/* Checklists */}
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
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Tooltip title="Adicionar checklist padrão por tipo">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setChecklistTemplateOpen((v) => !v); }}
                      disabled={addingChecklistTemplate}
                      sx={{ p: 0.5, opacity: 0.55, '&:hover': { opacity: 1 } }}
                    >
                      {addingChecklistTemplate ? <CircularProgress size={13} /> : <IconPlus size={13} />}
                    </IconButton>
                  </Tooltip>
                  {hasChecklist ? (checklistOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />) : null}
                </Stack>
              </Stack>

              {/* Template picker */}
              {checklistTemplateOpen && (
                <Box sx={(t) => ({ px: 2.5, pb: 1.5, borderTop: `1px solid ${t.palette.divider}` })}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mt: 1.25, mb: 1, fontSize: '0.7rem' }}>
                    Escolha o tipo de checklist:
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {[
                      { type: 'copy', label: '✍️ Copy' },
                      { type: 'design', label: '🎨 Design' },
                      { type: 'video', label: '🎬 Vídeo' },
                      { type: 'social', label: '📱 Social' },
                      { type: 'ads', label: '📊 Mídia Paga' },
                      { type: 'generic', label: '📋 Padrão' },
                    ].map(({ type, label }) => (
                      <Chip
                        key={type}
                        label={label}
                        size="small"
                        clickable
                        onClick={() => addChecklistTemplate(type)}
                        sx={{
                          fontWeight: 700, fontSize: '0.72rem', height: 28,
                          bgcolor: dark ? alpha('#5D87FF', 0.12) : alpha('#5D87FF', 0.08),
                          color: '#5D87FF',
                          '&:hover': { bgcolor: alpha('#5D87FF', 0.2) },
                        }}
                      />
                    ))}
                    <Chip
                      label="Cancelar"
                      size="small"
                      clickable
                      onClick={() => setChecklistTemplateOpen(false)}
                      sx={{ fontWeight: 600, fontSize: '0.72rem', height: 28 }}
                    />
                  </Stack>
                </Box>
              )}

              {hasChecklist && checklistOpen && (
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
                          {cl.items.map((item, i) => {
                            const isToggling = item.id ? togglingItem === item.id : false;
                            return (
                              <Stack
                                key={item.id ?? i}
                                direction="row"
                                spacing={1}
                                alignItems="flex-start"
                                onClick={() => !isToggling && toggleChecklistItem(cl.id, item.id, item.checked, i)}
                                sx={{ cursor: 'pointer', borderRadius: 1, px: 0.5, mx: -0.5, py: 0.25, '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }, opacity: isToggling ? 0.5 : 1, transition: 'opacity 0.15s' }}
                              >
                                <Box sx={{ width: 16, height: 16, mt: '1px', flexShrink: 0, borderRadius: '4px', border: `2px solid ${item.checked ? '#5D87FF' : theme.palette.divider}`, bgcolor: item.checked ? '#5D87FF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                  {item.checked && <IconCheck size={10} color="#fff" />}
                                </Box>
                                <Typography variant="body2" sx={{ fontSize: '0.84rem', lineHeight: 1.5, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'text.disabled' : 'text.primary', transition: 'all 0.15s', userSelect: 'none' }}>
                                  {item.text}
                                </Typography>
                              </Stack>
                            );
                          })}
                        </Stack>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Paper>

            {/* ── Attachments + URL references ── */}
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: trelloAttachments.length > 0 ? 1.5 : 0 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Anexos e referências
                  </Typography>
                  {trelloAttachments.length > 0 && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                      ({trelloAttachments.length})
                    </Typography>
                  )}
                </Stack>
                <Tooltip title="Adicionar URL de referência">
                  <IconButton
                    size="small"
                    onClick={() => setAttachmentOpen((v) => !v)}
                    sx={{ p: 0.5, opacity: 0.55, '&:hover': { opacity: 1 } }}
                  >
                    <IconPlus size={13} />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Add URL form */}
              {attachmentOpen && (
                <Stack spacing={1} sx={(t) => ({ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: dark ? alpha('#fff', 0.04) : alpha('#000', 0.02), border: `1px solid ${t.palette.divider}` })}>
                  <TextField
                    autoFocus
                    size="small"
                    fullWidth
                    placeholder="https://..."
                    label="URL"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    disabled={addingAttachment}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.84rem' } }}
                    onKeyDown={(e) => { if (e.key === 'Enter') addAttachment(); }}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Nome da referência (opcional)"
                    label="Nome"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    disabled={addingAttachment}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.84rem' } }}
                    onKeyDown={(e) => { if (e.key === 'Enter') addAttachment(); }}
                  />
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => { setAttachmentOpen(false); setAttachmentUrl(''); setAttachmentName(''); }} disabled={addingAttachment}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: 2 }}>
                      Cancelar
                    </Button>
                    <Button
                      variant="contained" size="small"
                      onClick={addAttachment}
                      disabled={addingAttachment || !attachmentUrl.trim()}
                      endIcon={addingAttachment ? <CircularProgress size={11} sx={{ color: '#fff' }} /> : undefined}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', borderRadius: 2, boxShadow: 'none' }}
                    >
                      {addingAttachment ? 'Adicionando...' : 'Adicionar'}
                    </Button>
                  </Stack>
                </Stack>
              )}

              {trelloAttachments.length === 0 && !attachmentOpen && (
                <Typography
                  variant="body2"
                  color="text.disabled"
                  sx={{ cursor: 'text', fontStyle: 'italic', fontSize: '0.82rem' }}
                  onClick={() => setAttachmentOpen(true)}
                >
                  Nenhum anexo. Clique em + para adicionar uma referência.
                </Typography>
              )}

              {trelloAttachments.length > 0 && (
                <Stack spacing={1}>
                  {trelloAttachments.map((att, i) => (
                    <Stack
                      key={i}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      component="a"
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ textDecoration: 'none', color: 'inherit', '&:hover .att-name': { textDecoration: 'underline' } }}
                    >
                      {att.is_image && att.preview_url ? (
                        <Box
                          component="img"
                          src={att.preview_url}
                          alt={att.name}
                          sx={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 1, flexShrink: 0, border: `1px solid ${alpha('#000', 0.08)}` }}
                        />
                      ) : (
                        <Box sx={{ width: 56, height: 40, borderRadius: 1, flexShrink: 0, bgcolor: alpha('#5D87FF', 0.1), border: `1px solid ${alpha('#5D87FF', 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: '#5D87FF', textTransform: 'uppercase' }}>
                            {att.name.split('.').pop()?.slice(0, 4) ?? 'FILE'}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography className="att-name" variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.name}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>
                          Abrir anexo →
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>

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

        {/* ── Right column: Trello-style sidebar ── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2.5} sx={{ position: 'sticky', top: railStickyTop }}>

            {/* ── ADICIONAR AO CARTÃO ── */}
            <Box>
              <Typography variant="caption" fontWeight={800} color="text.disabled" sx={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                Adicionar ao cartão
              </Typography>
              <Stack spacing={0.75}>

                {/* Mover (status) */}
                {/* Campanha */}
                {job.client_id && (
                  <Box>
                    <Button
                      fullWidth size="small"
                      startIcon={linkingCampaign ? <CircularProgress size={14} /> : <IconFlag size={15} />}
                      onClick={openCampaignPicker}
                      disabled={linkingCampaign}
                      sx={(t) => ({
                        justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                        borderRadius: 1.5, px: 1.5, color: 'text.primary',
                        bgcolor: dark ? alpha('#fff', 0.06) : alpha('#000', 0.055),
                        '&:hover': { bgcolor: dark ? alpha('#fff', 0.1) : alpha('#000', 0.09) },
                      })}
                    >
                      Campanha
                      {job.campaign_id && (
                        <Chip size="small" label="✓" sx={{ ml: 'auto', height: 16, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#13DEB920', color: '#13DEB9' }} />
                      )}
                    </Button>

                    {campaignPickerOpen && (
                      <Box sx={(t) => ({ mt: 0.75, p: 1.5, borderRadius: 2, border: `1px solid ${t.palette.divider}`, bgcolor: t.palette.background.paper })}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>Vincular a uma campanha</Typography>
                        {loadingCampaigns ? (
                          <CircularProgress size={18} sx={{ display: 'block', mx: 'auto' }} />
                        ) : (
                          <Stack spacing={0.5}>
                            {availableCampaigns.length === 0 && (
                              <Typography variant="caption" color="text.disabled">Nenhuma campanha ativa para este cliente.</Typography>
                            )}
                            {availableCampaigns.map((c) => (
                              <Button
                                key={c.id} fullWidth size="small"
                                onClick={() => handleLinkCampaign(job.campaign_id === c.id ? null : c.id)}
                                sx={(t) => ({
                                  justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, fontSize: '0.78rem',
                                  borderRadius: 1.5, px: 1.25,
                                  bgcolor: job.campaign_id === c.id ? alpha('#13DEB9', 0.12) : 'transparent',
                                  color: job.campaign_id === c.id ? '#13DEB9' : 'text.primary',
                                  '&:hover': { bgcolor: job.campaign_id === c.id ? alpha('#13DEB9', 0.2) : (dark ? alpha('#fff', 0.08) : alpha('#000', 0.06)) },
                                })}
                              >
                                {job.campaign_id === c.id && <IconCheck size={13} style={{ marginRight: 6 }} />}
                                {c.name}
                              </Button>
                            ))}
                            <Button size="small" fullWidth onClick={() => setCampaignPickerOpen(false)}
                              sx={{ mt: 0.5, fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1.5 }}>
                              Fechar
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    )}
                  </Box>
                )}

                {onStatusChange && (
                  <Box>
                    <Button
                      fullWidth
                      size="small"
                      startIcon={movingStatus ? <CircularProgress size={14} /> : <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: statusColor(job.status) }} />}
                      onClick={() => setStatusSelectOpen((v) => !v)}
                      disabled={movingStatus}
                      sx={(t) => ({
                        justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                        borderRadius: 1.5, px: 1.5,
                        color: 'text.primary',
                        bgcolor: dark ? alpha('#fff', 0.06) : alpha('#000', 0.055),
                        '&:hover': { bgcolor: dark ? alpha('#fff', 0.1) : alpha('#000', 0.09) },
                      })}
                    >
                      Mover
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontWeight: 600, fontSize: '0.75rem' }}>
                        {STATUS_LABELS[job.status] ?? job.status}
                      </Typography>
                    </Button>
                    {statusSelectOpen && (
                      <Box sx={(t) => ({
                        mt: 0.75, p: 1.5, borderRadius: 2,
                        border: `1px solid ${t.palette.divider}`,
                        bgcolor: t.palette.background.paper,
                      })}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: '0.72rem' }}>
                          Mover para
                        </Typography>
                        <Stack spacing={0.5}>
                          {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <Box
                              key={key}
                              component="button"
                              type="button"
                              disabled={key === job.status || movingStatus}
                              onClick={() => handleStatusChange(key)}
                              sx={(t) => ({
                                appearance: 'none', textAlign: 'left', width: '100%', cursor: key === job.status ? 'default' : 'pointer',
                                py: 0.625, px: 1, borderRadius: 1.5,
                                border: key === job.status ? `1.5px solid ${alpha(statusColor(key), 0.5)}` : '1.5px solid transparent',
                                bgcolor: key === job.status ? alpha(statusColor(key), 0.08) : 'transparent',
                                '&:hover:not(:disabled)': { bgcolor: dark ? alpha('#fff', 0.06) : alpha('#000', 0.055) },
                                '&:disabled': { opacity: key === job.status ? 1 : 0.4 },
                              })}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusColor(key), flexShrink: 0 }} />
                                <Typography variant="caption" fontWeight={key === job.status ? 800 : 600} sx={{ fontSize: '0.78rem', color: key === job.status ? statusColor(key) : 'text.primary' }}>
                                  {label}
                                </Typography>
                                {key === job.status && <Box component="span" sx={{ ml: 'auto', fontSize: '0.65rem', color: 'text.disabled' }}>atual</Box>}
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                        <Button size="small" fullWidth onClick={() => setStatusSelectOpen(false)}
                          sx={{ mt: 1, fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: 1.5 }}>
                          Cancelar
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </Stack>
            </Box>

            {/* ── AÇÕES ── */}
            <Box>
              <Typography variant="caption" fontWeight={800} color="text.disabled" sx={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                Ações
              </Typography>
              <Stack spacing={0.75}>
                <Button
                  fullWidth size="small"
                  startIcon={<IconBrush size={15} />}
                  component={Link}
                  href={`/studio?jobId=${job.id}`}
                  sx={(t) => ({
                    justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                    borderRadius: 1.5, px: 1.5, color: 'text.primary',
                    bgcolor: dark ? alpha('#fff', 0.06) : alpha('#000', 0.055),
                    '&:hover': { bgcolor: dark ? alpha('#fff', 0.1) : alpha('#000', 0.09) },
                  })}
                >
                  Abrir Studio
                </Button>
                {job.campaign_id && job.client_id && (
                  <Button
                    fullWidth size="small"
                    startIcon={<IconFlag size={15} />}
                    component={Link}
                    href={`/clients/${job.client_id}/campaigns`}
                    sx={(t) => ({
                      justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                      borderRadius: 1.5, px: 1.5, color: '#13DEB9',
                      bgcolor: dark ? alpha('#13DEB9', 0.08) : alpha('#13DEB9', 0.07),
                      '&:hover': { bgcolor: dark ? alpha('#13DEB9', 0.14) : alpha('#13DEB9', 0.13) },
                    })}
                  >
                    Abrir Campanha
                  </Button>
                )}
                {onStatusChange && (
                  <Button
                    fullWidth size="small"
                    startIcon={job.status === 'blocked' ? <IconPlayerPlay size={15} /> : <IconPlayerPause size={15} />}
                    onClick={() => handleStatusChange(job.status === 'blocked' ? 'in_progress' : 'blocked')}
                    disabled={movingStatus}
                    sx={(t) => ({
                      justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                      borderRadius: 1.5, px: 1.5,
                      color: job.status === 'blocked' ? '#13DEB9' : '#FFAE1F',
                      bgcolor: dark ? alpha('#fff', 0.06) : alpha('#000', 0.055),
                      '&:hover': { bgcolor: dark ? alpha('#fff', 0.1) : alpha('#000', 0.09) },
                    })}
                  >
                    {job.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                  </Button>
                )}
              </Stack>
            </Box>

            {/* ── DETALHES ── */}
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
              <Box sx={{ px: 1.5, py: 1.25 }}>
                <Typography variant="caption" fontWeight={800} color="text.disabled" sx={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Detalhes
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ px: 1.5, py: 1 }}>
                <Stack spacing={0} divider={<Divider />}>
                  {[
                    { label: 'Cliente', value: job.client_name },
                    {
                      label: 'Prazo',
                      value: job.deadline_at ? fmtDate(job.deadline_at) : '—',
                      color: daysDiff !== null && daysDiff < 0 ? '#FA896B' : undefined,
                      extra: daysDiff !== null && daysDiff < 0 ? `${Math.abs(daysDiff)}d de atraso` : undefined,
                    },
                    { label: 'Status', value: STATUS_LABELS[job.status] ?? job.status, color: statusColor(job.status) },
                    { label: 'Tipo', value: formatJobType(job.job_type) },
                    skillLabel && !skillLabel.toLowerCase().includes('indefin') ? { label: 'Especialidade', value: skillLabel } : null,
                    job.job_size ? { label: 'Tamanho', value: job.job_size } : null,
                    job.estimated_minutes ? { label: 'Estimativa', value: estimateLabel } : null,
                  ].filter(Boolean).map((row) => (
                    <Stack key={row!.label} direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ py: 0.875 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{row!.label}</Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        {(row as any).extra && (
                          <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#FA896B' }}>
                            {(row as any).extra}
                          </Typography>
                        )}
                        <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.78rem', textAlign: 'right', color: (row as any).color ?? 'text.primary' }}>{row!.value ?? '—'}</Typography>
                      </Stack>
                    </Stack>
                  ))}
                  {/* Campanha — rendered separately to allow navigation link */}
                  {job.campaign_name && (
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ py: 0.875 }}>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>Campanha</Typography>
                      <Typography
                        component={Link}
                        href={`/clients/${job.client_id}/campaigns`}
                        variant="caption"
                        fontWeight={600}
                        sx={{ fontSize: '0.78rem', textAlign: 'right', color: '#13DEB9', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {job.campaign_name}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Paper>

          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
