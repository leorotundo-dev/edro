'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconMicrophone, IconCheck, IconX, IconChevronDown, IconChevronUp,
  IconRefresh, IconBriefcase, IconBulb, IconListCheck, IconNote,
  IconClock, IconUser, IconAlertTriangle, IconChevronRight,
  IconChecks, IconCalendar, IconBrandGoogle, IconBrandZoom,
  IconBrandTeams, IconVideo, IconBrandWhatsapp, IconMail,
  IconSend, IconRobot, IconFileText, IconPlayerPlay, IconHeadphones,
} from '@tabler/icons-react';

const EDRO_ORANGE = '#E85219';

// ── Types ────────────────────────────────────────────────────────────

type Stats = {
  total_meetings: number;
  analyzed: number;
  processing: number;
  failed: number;
  last_7_days: number;
  last_30_days: number;
};

type RecentMeeting = {
  id: string;
  title: string;
  client_id: string;
  client_name: string | null;
  platform: string;
  recorded_at: string;
  status: string;
  summary: string | null;
  analysis_payload?: {
    intelligence?: {
      attention_level?: string;
      meeting_kind?: string;
    } | null;
  } | null;
  total_actions: number;
  pending_actions: number;
  has_recording?: boolean;
  has_audio_recording?: boolean;
};

type ClientBreakdown = {
  client_id: string;
  client_name: string | null;
  meeting_count: number;
  pending_actions: number;
};

type ProposedAction = {
  action_id: string;
  type: 'briefing' | 'task' | 'campaign' | 'pauta' | 'note';
  title: string;
  description: string;
  responsible?: string | null;
  deadline?: string | null;
  priority: 'high' | 'medium' | 'low';
  status: string;
  raw_excerpt?: string | null;
};

type MeetingProposal = {
  meeting_id: string;
  meeting_title: string;
  client_id: string;
  recorded_at: string;
  summary: string;
  platform: string;
  actions: ProposedAction[];
};

type Contact = {
  id: string;
  person_id?: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  whatsapp_jid?: string;
  client_id?: string;
  client_name?: string;
  is_primary?: boolean;
  source: 'client_contact' | 'team';
};

type InviteContact = Contact & { send_via: 'whatsapp' | 'email' | 'both' };
type CalendarStatus = {
  configured: boolean;
  email?: string;
  watchStatus?: string;
};

type Platform = 'meet' | 'zoom' | 'teams' | 'other';
type RecentMeetingFilter = 'all' | 'active' | 'approval' | 'failed' | 'done' | 'archived';

// ── Helpers ──────────────────────────────────────────────────────────

function actionIcon(type: string) {
  switch (type) {
    case 'briefing': return <IconBriefcase size={14} />;
    case 'campaign': return <IconBulb size={14} />;
    case 'pauta': return <IconNote size={14} />;
    case 'task': return <IconListCheck size={14} />;
    default: return <IconNote size={14} />;
  }
}

function priorityColor(p: string): 'error' | 'warning' | 'default' {
  if (p === 'high') return 'error';
  if (p === 'medium') return 'warning';
  return 'default';
}

function platformLabel(platform: string) {
  if (platform === 'meet') return 'Google Meet';
  if (platform === 'zoom') return 'Zoom';
  if (platform === 'teams') return 'Teams';
  return 'Video';
}

function platformIcon(platform: string) {
  if (platform === 'meet') return <IconBrandGoogle size={18} />;
  if (platform === 'zoom') return <IconBrandZoom size={18} />;
  if (platform === 'teams') return <IconBrandTeams size={18} />;
  return <IconVideo size={18} />;
}

function platformColor(platform: string) {
  if (platform === 'meet') return '#4285f4';
  if (platform === 'zoom') return '#2d8cff';
  if (platform === 'teams') return '#6264a7';
  return '#666';
}

function typeLabel(type: string) {
  const map: Record<string, string> = { briefing: 'Briefing', task: 'Tarefa', campaign: 'Campanha', pauta: 'Pauta', note: 'Nota' };
  return map[type] ?? type;
}

function statusChip(status: string) {
  const map = {
    scheduled: { label: 'Agendada', color: 'info' },
    bot_scheduled: { label: 'Bot agendado', color: 'info' },
    joining: { label: 'Entrando', color: 'warning' },
    in_call: { label: 'Em call', color: 'warning' },
    recorded: { label: 'Gravada', color: 'info' },
    transcript_pending: { label: 'Transcript pendente', color: 'warning' },
    transcribed: { label: 'Transcrita', color: 'info' },
    analysis_pending: { label: 'Analisando', color: 'warning' },
    analyzed: { label: 'Analisada', color: 'success' },
    approval_pending: { label: 'Aprovacao pendente', color: 'warning' },
    partially_approved: { label: 'Parcialmente aprovada', color: 'warning' },
    completed: { label: 'Concluida', color: 'success' },
    approved: { label: 'Aprovada', color: 'success' },
    processing: { label: 'Processando', color: 'warning' },
    failed: { label: 'Falha', color: 'error' },
    archived: { label: 'Arquivada', color: 'default' },
  } as const;

  const meta = map[status as keyof typeof map];
  return (
    <Chip
      label={meta?.label ?? status}
      size="small"
      color={meta?.color ?? 'default'}
      variant="outlined"
      sx={{ fontSize: '0.7rem', height: 22 }}
    />
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return `${fmtDate(iso)} as ${fmtTime(iso)}`;
}

function toLocalISO(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function stageLabel(stage: string | null | undefined) {
  const map: Record<string, string> = {
    calendar_detect: 'Calendar',
    bot_create: 'Criacao do bot',
    bot_join: 'Entrada do bot',
    bot_finalize: 'Finalizacao do bot',
    transcript_fetch: 'Coleta do transcript',
    analysis: 'Analise',
    approval: 'Aprovacao',
    system_create: 'Criacao no sistema',
    whatsapp_notify: 'WhatsApp',
  };
  if (!stage) return '—';
  return map[stage] ?? stage;
}

function sourceLabel(source: string | null | undefined) {
  const map: Record<string, string> = {
    upload: 'Upload',
    calendar: 'Google Calendar',
    manual_bot: 'Bot manual',
    instant: 'Instantanea',
  };
  if (!source) return '—';
  return map[source] ?? source;
}

function transcriptProviderLabel(provider: string | null | undefined) {
  const map: Record<string, string> = {
    recall: 'Recall.ai',
    whisper: 'Whisper',
    manual: 'Manual',
  };
  if (!provider) return '—';
  return map[provider] ?? provider;
}

function shortText(value: string | null | undefined, fallback = '—') {
  if (!value) return fallback;
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function jobStatusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'error' {
  if (status === 'done' || status === 'completed') return 'success';
  if (status === 'pending' || status === 'scheduled' || status === 'running') return 'warning';
  if (status === 'failed') return 'error';
  return 'default';
}

function attentionColor(level?: string | null): 'default' | 'info' | 'warning' | 'success' | 'error' {
  if (level === 'critical') return 'error';
  if (level === 'high') return 'warning';
  if (level === 'medium') return 'info';
  if (level === 'low') return 'success';
  return 'default';
}

function describeCreateMeetingError(err: any) {
  const code = err?.code ?? err?.payload?.error_code ?? null;
  const message = err?.message ?? err?.payload?.error ?? 'Erro ao criar reunião';

  if (code === 'invalid_meeting_payload') {
    const fieldErrors = err?.details?.fieldErrors as Record<string, string[] | undefined> | undefined;
    const flattened = fieldErrors
      ? Object.values(fieldErrors).flat().filter(Boolean)
      : [];
    return flattened.length ? flattened.join(' ') : message;
  }

  if (code === 'invalid_scheduled_at') return 'A data e hora da reunião estão inválidas. Revise o horário e tente novamente.';
  if (code === 'invalid_meeting_client' || code === 'client_not_found') return 'O cliente selecionado não existe mais. Atualize a página e selecione o cliente novamente.';
  if (code === 'google_calendar_not_configured') return 'Google Calendar não está conectado para este tenant. Conecte a integração ou use Video com link manual.';
  if (code === 'google_meet_create_failed') return message;

  return message;
}

function detectPlatform(url: string): Platform {
  if (/teams\.microsoft\.com/i.test(url)) return 'teams';
  if (/zoom\.us/i.test(url)) return 'zoom';
  if (/meet\.google\.com/i.test(url)) return 'meet';
  return 'other';
}

function meetingKindLabel(kind?: string | null) {
  const map: Record<string, string> = {
    client_status: 'Status de cliente',
    client_briefing: 'Briefing de cliente',
    client_review: 'Revisão de cliente',
    internal_ops: 'Operação interna',
    commercial: 'Comercial',
    alignment: 'Alinhamento',
    other: 'Outro',
  };
  return map[kind || ''] ?? 'Leitura operacional';
}

function temperatureLabel(value?: string | null) {
  const map: Record<string, string> = {
    engaged: 'Engajado',
    neutral: 'Neutro',
    pressured: 'Pressionado',
    at_risk: 'Em risco',
    blocked: 'Travado',
    internal: 'Interno',
  };
  return map[value || ''] ?? 'Sem leitura';
}

function operationLaneLabel(value?: string | null) {
  const map: Record<string, string> = {
    atendimento: 'Atendimento',
    operacao: 'Operação',
    criacao: 'Criação',
    midia: 'Mídia',
    estrategia: 'Estratégia',
    cliente: 'Cliente',
    comercial: 'Comercial',
  };
  return map[value || ''] ?? value ?? '';
}

function matchesRecentMeetingFilter(meeting: RecentMeeting, filter: RecentMeetingFilter) {
  if (filter === 'all') return true;
  if (filter === 'failed') return meeting.status === 'failed';
  if (filter === 'approval') return meeting.status === 'approval_pending' || meeting.status === 'partially_approved';
  if (filter === 'done') return meeting.status === 'completed' || meeting.status === 'analyzed' || meeting.status === 'approved';
  if (filter === 'archived') return meeting.status === 'archived';
  if (filter === 'active') {
    return !['failed', 'completed', 'analyzed', 'approved', 'archived'].includes(meeting.status)
      && meeting.status !== 'approval_pending'
      && meeting.status !== 'partially_approved';
  }
  return true;
}

function normalizeClientsResponse(payload: unknown): Array<{ id: string; name: string }> {
  const raw = Array.isArray(payload)
    ? payload
    : ((payload as { clients?: Array<{ id: string; name: string }>; data?: Array<{ id: string; name: string }> } | null)?.clients
      ?? (payload as { data?: Array<{ id: string; name: string }> } | null)?.data
      ?? []);
  return raw
    .filter((item): item is { id: string; name: string } => Boolean(item?.id && item?.name))
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

// ── Stat Card ────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ color, lineHeight: 1.2 }}>
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ width: 44, height: 44, bgcolor: `${color}15`, color }}>
            {icon}
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Proposal Card (pending actions) ──────────────────────────────────

function ProposalCard({
  proposal,
  onActionChange,
}: {
  proposal: MeetingProposal;
  onActionChange: (actionId: string, status: 'approved' | 'rejected') => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [approving, setApproving] = useState<Set<string>>(new Set());
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  const handleApprove = async (a: ProposedAction) => {
    setApproving(prev => new Set(prev).add(a.action_id));
    try {
      await apiPatch(`/meeting-actions/${a.action_id}/approve`, { create_in_system: true });
      onActionChange(a.action_id, 'approved');
    } catch { /* silent */ } finally {
      setApproving(prev => { const s = new Set(prev); s.delete(a.action_id); return s; });
    }
  };

  const handleReject = async (a: ProposedAction) => {
    setApproving(prev => new Set(prev).add(a.action_id));
    try {
      await apiPatch(`/meeting-actions/${a.action_id}/reject`, {});
      onActionChange(a.action_id, 'rejected');
    } catch { /* silent */ } finally {
      setApproving(prev => { const s = new Set(prev); s.delete(a.action_id); return s; });
    }
  };

  const handleApproveAll = async () => {
    setApproveAllLoading(true);
    try {
      await apiPost(`/meetings/${proposal.meeting_id}/approve-all`, {});
      for (const a of proposal.actions) onActionChange(a.action_id, 'approved');
    } catch { /* silent */ } finally {
      setApproveAllLoading(false);
    }
  };

  const pendingActions = proposal.actions.filter(a => a.status === 'pending');
  if (!pendingActions.length) return null;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={1.5} flex={1} minWidth={0}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: `${EDRO_ORANGE}22`, color: EDRO_ORANGE }}>
              <IconMicrophone size={18} />
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {proposal.meeting_title || 'Reuniao sem titulo'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {platformLabel(proposal.platform)} · {fmtDate(proposal.recorded_at)} as {fmtTime(proposal.recorded_at)}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
            <Chip label={`${pendingActions.length} pendente${pendingActions.length !== 1 ? 's' : ''}`} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
            {pendingActions.length > 1 && (
              <Button size="small" variant="contained" sx={{ fontSize: '0.72rem', py: 0.3 }} onClick={handleApproveAll} disabled={approveAllLoading}
                startIcon={approveAllLoading ? <CircularProgress size={12} color="inherit" /> : <IconChecks size={13} />}>
                Aprovar Tudo
              </Button>
            )}
            <IconButton size="small" onClick={() => setExpanded(v => !v)}>
              {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </IconButton>
          </Stack>
        </Stack>

        {proposal.summary && (
          <Box sx={{ mb: 1.5, p: 1.25, bgcolor: 'grey.50', borderRadius: 1.5, borderLeft: `3px solid ${EDRO_ORANGE}` }}>
            <Typography variant="body2" sx={{ fontSize: '0.78rem', lineHeight: 1.5, color: 'text.secondary' }}>
              {proposal.summary.length > 300 ? proposal.summary.slice(0, 300) + '...' : proposal.summary}
            </Typography>
          </Box>
        )}

        <Collapse in={expanded}>
          <Stack spacing={1}>
            {pendingActions.map(action => (
              <Box key={action.action_id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box sx={{ pt: 0.3 }}>{actionIcon(action.type)}</Box>
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" alignItems="center" spacing={0.75} mb={0.25}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{action.title}</Typography>
                    <Chip label={typeLabel(action.type)} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                    <Chip label={action.priority} size="small" color={priorityColor(action.priority)} sx={{ fontSize: '0.62rem', height: 18 }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    {action.description?.length > 200 ? action.description.slice(0, 200) + '...' : action.description}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {action.responsible && (
                      <Chip icon={<IconUser size={10} />} label={action.responsible} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                    )}
                    {action.deadline && (
                      <Chip icon={<IconClock size={10} />} label={action.deadline} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                    )}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.5} flexShrink={0}>
                  <Tooltip title="Aprovar e criar no sistema">
                    <span>
                      <IconButton size="small" color="success" onClick={() => handleApprove(action)} disabled={approving.has(action.action_id)}>
                        {approving.has(action.action_id) ? <CircularProgress size={14} /> : <IconCheck size={16} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Rejeitar">
                    <span>
                      <IconButton size="small" color="error" onClick={() => handleReject(action)} disabled={approving.has(action.action_id)}>
                        <IconX size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

// ── Meeting Detail (expandable row content) ─────────────────────────

type MeetingDetail = {
  id: string;
  title: string;
  summary: string | null;
  transcript: string | null;
  status: string;
  meeting_url: string | null;
  analysis_payload?: {
    intelligence?: {
      meeting_kind?: string;
      attention_level?: string;
      client_temperature?: string;
      account_pulse?: string;
      recommended_next_step?: string;
      owner_hint?: string | null;
      deadlines_cited?: string[];
      decisions_taken?: string[];
      blockers?: string[];
      risks?: string[];
      opportunities?: string[];
      approvals_needed?: string[];
      follow_up_questions?: string[];
      suggested_tags?: string[];
    } | null;
    action_hints?: Array<{
      title?: string;
      type?: string;
      priority?: string;
      operation_lane?: string | null;
      required_skill?: string | null;
      owner_hint?: string | null;
      should_create_job?: boolean | null;
      needs_approval?: boolean | null;
      urgency_reason?: string | null;
    }> | null;
  } | null;
  prep_payload?: {
    meeting_goal?: string;
    opening_question?: string;
    suggested_agenda?: string[];
    agency_defense_points?: string[];
    likely_client_pushbacks?: string[];
    materials_to_prepare?: string[];
    internal_alignment_notes?: string[];
    red_flags?: string[];
    success_criteria?: string[];
    recommended_positioning?: string;
  } | null;
  actions: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    responsible: string | null;
    deadline: string | null;
    metadata?: {
      operation_lane?: string | null;
      required_skill?: string | null;
      owner_hint?: string | null;
      should_create_job?: boolean | null;
      needs_approval?: boolean | null;
      urgency_reason?: string | null;
    } | null;
  }> | null;
  participants?: Array<{
    id: string;
    person_id?: string | null;
    display_name: string;
    email?: string | null;
    phone?: string | null;
    is_internal: boolean;
    is_organizer: boolean;
    is_attendee: boolean;
    is_invited: boolean;
    response_status?: string | null;
    invited_via?: string | null;
    source_type?: string | null;
  }> | null;
  participant_count?: number;
  internal_participant_count?: number;
  external_participant_count?: number;
};

type MeetingStatusData = {
  id: string;
  title: string;
  client_id: string;
  platform: string;
  status: string;
  source: string | null;
  meeting_url: string | null;
  recorded_at: string;
  bot_id: string | null;
  bot_status: string | null;
  transcript_provider: string | null;
  analysis_version: number | null;
  failed_stage: string | null;
  failed_reason: string | null;
  retry_count: number | null;
  summary_sent_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  total_actions: number;
  pending_actions: number;
  approved_actions: number;
  rejected_actions: number;
  participant_count: number;
  internal_participant_count: number;
  external_participant_count: number;
  auto_join_id: string | null;
  auto_join_status: string | null;
  auto_join_bot_id: string | null;
  auto_join_last_error: string | null;
  auto_join_attempt_count: number | null;
  auto_join_scheduled_at: string | null;
  latest_event_type: string | null;
  latest_event_stage: string | null;
  latest_event_message: string | null;
  latest_event_at: string | null;
};

type MeetingAuditEvent = {
  id: string;
  event_type: string;
  stage: string | null;
  status: string;
  message: string | null;
  actor_type: string | null;
  actor_id: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
};

type MeetingAuditJob = {
  id: string;
  type: string;
  status: string;
  attempts: number;
  error_message: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string | null;
  payload?: Record<string, unknown> | null;
};

type MeetingAuditData = {
  meeting: MeetingStatusData;
  events: MeetingAuditEvent[];
  jobs: MeetingAuditJob[];
};

type OperationKey = 'retry-bot' | 'reprocess-transcript' | 'reanalyze' | 'resend-whatsapp' | 'unarchive' | 'send-prep';
type FeedbackState = { severity: 'success' | 'error'; message: string } | null;

function OpsInfoCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
}) {
  return (
    <Box sx={{ p: 1.25, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: 'background.paper', minHeight: '100%' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem', lineHeight: 1.4, wordBreak: 'break-word' }}>
        {value}
      </Typography>
      {helper && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.45, lineHeight: 1.5 }}>
          {helper}
        </Typography>
      )}
    </Box>
  );
}

function MeetingDetailPanel({ meetingId, onUnarchive }: { meetingId: string; onUnarchive?: () => void }) {
  const [detail, setDetail] = useState<MeetingDetail | null>(null);
  const [ops, setOps] = useState<MeetingStatusData | null>(null);
  const [audit, setAudit] = useState<MeetingAuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [operationLoading, setOperationLoading] = useState<OperationKey | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [approvingAction, setApprovingAction] = useState<Set<string>>(new Set());
  const [showJarvisContext, setShowJarvisContext] = useState(false);
  const [jarvisContext, setJarvisContext] = useState<{ conversationMemories: any[]; totalDocuments: number; bySourceType: Record<string, number>; lastMemoryAt: string | null } | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);

    const [detailRes, statusRes, auditRes] = await Promise.allSettled([
      apiGet<{ data: MeetingDetail }>(`/meetings/${meetingId}/detail`),
      apiGet<{ data: MeetingStatusData }>(`/meetings/${meetingId}/status`),
      apiGet<{ data: MeetingAuditData }>(`/meetings/${meetingId}/audit`),
    ]);

    if (detailRes.status === 'fulfilled') setDetail(detailRes.value.data);
    else setDetail(null);

    if (statusRes.status === 'fulfilled') setOps(statusRes.value.data);
    else setOps(null);

    if (auditRes.status === 'fulfilled') setAudit(auditRes.value.data);
    else setAudit(null);

    if (detailRes.status === 'rejected' && statusRes.status === 'rejected') {
      setFeedback({ severity: 'error', message: 'Erro ao carregar detalhes operacionais desta reuniao.' });
    }

    setLoading(false);
  }, [meetingId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (loading) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!detail && !ops && !audit?.meeting) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
        Erro ao carregar detalhes.
      </Typography>
    );
  }

  const operational = ops ?? audit?.meeting ?? null;
  const actions = detail?.actions ?? [];
  const participants = detail?.participants ?? [];
  const intelligence = detail?.analysis_payload?.intelligence ?? null;

  const handleOperation = async (operation: OperationKey) => {
    const operationMap: Record<OperationKey, { path: string; success: string }> = {
      'retry-bot': {
        path: `/meetings/${meetingId}/retry-bot`,
        success: 'Fila operacional atualizada para novo ciclo do bot.',
      },
      'reprocess-transcript': {
        path: `/meetings/${meetingId}/reprocess-transcript`,
        success: 'Transcript reprocessado com sucesso.',
      },
      'reanalyze': {
        path: `/meetings/${meetingId}/reanalyze`,
        success: 'Reanalise executada. O painel foi atualizado.',
      },
      'resend-whatsapp': {
        path: `/meetings/${meetingId}/resend-whatsapp`,
        success: 'Resumo reenviado ao grupo do cliente.',
      },
      'unarchive': {
        path: `/meetings/${meetingId}/unarchive`,
        success: 'Reuniao restaurada com sucesso.',
      },
      'send-prep': {
        path: `/meetings/${meetingId}/send-prep`,
        success: 'Briefing pré-reunião enviado ao WhatsApp do cliente.',
      },
    };

    setOperationLoading(operation);
    setFeedback(null);
    try {
      await apiPost(operationMap[operation].path, {});
      setFeedback({ severity: 'success', message: operationMap[operation].success });
      await loadDetail();
      if (operation === 'unarchive') onUnarchive?.();
    } catch (error: any) {
      setFeedback({ severity: 'error', message: error?.message ?? 'Falha ao executar operacao.' });
    } finally {
      setOperationLoading(null);
    }
  };

  return (
    <Box sx={{ px: 2, py: 2 }}>
      {feedback && <Alert severity={feedback.severity} sx={{ mb: 2 }}>{feedback.message}</Alert>}

      {operational && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {statusChip(operational.status)}
              {operational.source === 'calendar' && (
                <Chip
                  label="Google Calendar"
                  size="small"
                  variant="outlined"
                  color="info"
                  sx={{ fontSize: '0.68rem', height: 22 }}
                />
              )}
              {operational.auto_join_status && (
                <Chip
                  label={`Auto-join: ${operational.auto_join_status}`}
                  size="small"
                  variant="outlined"
                  color={
                    operational.auto_join_status === 'failed' ? 'error'
                      : operational.auto_join_status === 'done' ? 'success'
                        : ['queued', 'meeting_created', 'bot_created', 'waiting', 'processing'].includes(operational.auto_join_status) ? 'warning'
                          : 'default'
                  }
                  sx={{ fontSize: '0.68rem', height: 22 }}
                />
              )}
              {operational.auto_join_id && (
                <Chip
                  label="Vinculada ao auto-join"
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ fontSize: '0.68rem', height: 22 }}
                />
              )}
              {operational.failed_stage && (
                <Chip
                  label={`Falha em ${stageLabel(operational.failed_stage)}`}
                  size="small"
                  variant="outlined"
                  color="error"
                  sx={{ fontSize: '0.68rem', height: 22 }}
                />
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="text.secondary">
                Versao da analise: {operational.analysis_version ?? 1}
              </Typography>
              {operational.latest_event_at && (
                <Typography variant="caption" color="text.secondary">
                  Ultimo evento: {fmtDateTime(operational.latest_event_at)}
                </Typography>
              )}
            </Stack>
          </Stack>

          <Grid container spacing={1.25}>
            <Grid size={{ xs: 12, md: 3 }}>
              <OpsInfoCard
                label="Origem"
                value={sourceLabel(operational.source)}
                helper={`${platformLabel(operational.platform)} · ${fmtDateTime(operational.recorded_at)}`}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <OpsInfoCard
                label="Bot Recall"
                value={operational.bot_id ? shortText(operational.bot_id) : 'Nao criado'}
                helper={[
                  operational.bot_status ? `Status: ${operational.bot_status}` : null,
                  operational.retry_count != null ? `Retries: ${operational.retry_count}` : null,
                ].filter(Boolean).join(' · ')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <OpsInfoCard
                label="Auto-join"
                value={operational.auto_join_status ? operational.auto_join_status : 'Sem auto-join'}
                helper={[
                  operational.auto_join_scheduled_at ? `Agendado: ${fmtDateTime(operational.auto_join_scheduled_at)}` : null,
                  operational.auto_join_attempt_count != null ? `Tentativas: ${operational.auto_join_attempt_count}` : null,
                ].filter(Boolean).join(' · ')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <OpsInfoCard
                label="Pipeline"
                value={transcriptProviderLabel(operational.transcript_provider)}
                helper={`${operational.pending_actions}/${operational.total_actions} pendentes · ${operational.approved_actions} aprovadas`}
              />
            </Grid>
          </Grid>

          {(operational.failed_reason || operational.auto_join_last_error) && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {operational.failed_reason ?? operational.auto_join_last_error}
            </Alert>
          )}

          {operational.latest_event_message && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              {stageLabel(operational.latest_event_stage)}: {operational.latest_event_message}
            </Alert>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            {operational.status === 'archived' && (
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={operationLoading === 'unarchive' ? <CircularProgress size={14} /> : <IconPlayerPlay size={14} />}
                disabled={operationLoading !== null}
                onClick={() => void handleOperation('unarchive')}
              >
                Reativar reuniao
              </Button>
            )}
            {operational.auto_join_id && (
              <Button
                size="small"
                variant="outlined"
                href={`/admin/integrations?autoJoinId=${encodeURIComponent(operational.auto_join_id)}`}
              >
                Abrir auto-join
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              startIcon={operationLoading === 'retry-bot' ? <CircularProgress size={14} /> : <IconPlayerPlay size={14} />}
              disabled={operationLoading !== null || !operational.meeting_url}
              onClick={() => void handleOperation('retry-bot')}
            >
              Retry bot
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={operationLoading === 'reprocess-transcript' ? <CircularProgress size={14} /> : <IconFileText size={14} />}
              disabled={operationLoading !== null || (!operational.bot_id && !detail?.transcript)}
              onClick={() => void handleOperation('reprocess-transcript')}
            >
              Reprocessar transcript
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={operationLoading === 'reanalyze' ? <CircularProgress size={14} /> : <IconRobot size={14} />}
              disabled={operationLoading !== null || !detail?.transcript}
              onClick={() => void handleOperation('reanalyze')}
            >
              Reanalisar
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={operationLoading === 'resend-whatsapp' ? <CircularProgress size={14} /> : <IconBrandWhatsapp size={14} />}
              disabled={operationLoading !== null || !detail?.summary}
              onClick={() => void handleOperation('resend-whatsapp')}
            >
              Reenviar WhatsApp
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={operationLoading === 'send-prep' ? <CircularProgress size={14} /> : <IconSend size={14} />}
              disabled={operationLoading !== null}
              onClick={() => void handleOperation('send-prep')}
            >
              Enviar Prep
            </Button>
            <Button
              size="small"
              variant="text"
              startIcon={<IconChevronDown size={14} style={{ transform: showAudit ? 'rotate(180deg)' : 'none' }} />}
              onClick={() => setShowAudit(v => !v)}
            >
              {showAudit ? 'Ocultar auditoria' : 'Ver auditoria'}
            </Button>
          </Stack>
        </Box>
      )}

      {/* Summary */}
      {detail?.summary && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, borderLeft: `3px solid ${EDRO_ORANGE}` }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            <IconRobot size={12} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
            Resumo Jarvis
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
            {detail.summary}
          </Typography>
        </Box>
      )}

      {intelligence && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.2 }}>
            <Chip label={meetingKindLabel(intelligence.meeting_kind)} size="small" variant="outlined" />
            <Chip label={`Atenção ${intelligence.attention_level ?? 'média'}`} size="small" color={attentionColor(intelligence.attention_level)} />
            <Chip label={temperatureLabel(intelligence.client_temperature)} size="small" variant="outlined" />
            {intelligence.owner_hint && (
              <Chip label={`Puxar com ${intelligence.owner_hint}`} size="small" variant="outlined" />
            )}
          </Stack>

          <Grid container spacing={1.25}>
            <Grid size={{ xs: 12, md: 6 }}>
              <OpsInfoCard
                label="Pulso da conta"
                value={intelligence.account_pulse || 'Sem pulso consolidado'}
                helper={intelligence.suggested_tags?.length ? `Tags: ${intelligence.suggested_tags.join(' · ')}` : undefined}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <OpsInfoCard
                label="Próximo movimento"
                value={intelligence.recommended_next_step || 'Sem próximo passo sugerido'}
                helper={intelligence.deadlines_cited?.length ? `Prazos citados: ${intelligence.deadlines_cited.join(' · ')}` : undefined}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.25} sx={{ mt: 0.5 }}>
            {[
              { label: 'Decisões', values: intelligence.decisions_taken },
              { label: 'Bloqueios', values: intelligence.blockers },
              { label: 'Riscos', values: intelligence.risks },
              { label: 'Oportunidades', values: intelligence.opportunities },
              { label: 'Aprovações', values: intelligence.approvals_needed },
              { label: 'Perguntas em aberto', values: intelligence.follow_up_questions },
            ].map((section) => (
              <Grid key={section.label} size={{ xs: 12, md: 6 }}>
                <Box sx={{ p: 1.25, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: '#fcfcfd', minHeight: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.7, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {section.label}
                  </Typography>
                  {section.values?.length ? (
                    <Stack spacing={0.5}>
                      {section.values.map((entry, idx) => (
                        <Typography key={`${section.label}-${idx}`} variant="body2" sx={{ fontSize: '0.78rem', lineHeight: 1.55 }}>
                          • {entry}
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                      Nenhum item relevante nessa faixa.
                    </Typography>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {detail?.prep_payload && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: '#fffaf4' }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Briefing pré-reunião da equipe
          </Typography>

          <Grid container spacing={1.25}>
            <Grid size={{ xs: 12, md: 6 }}>
              <OpsInfoCard
                label="Objetivo"
                value={detail.prep_payload.meeting_goal || 'Sem objetivo sugerido'}
                helper={detail.prep_payload.opening_question ? `Pergunta de abertura: ${detail.prep_payload.opening_question}` : undefined}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <OpsInfoCard
                label="Postura recomendada"
                value={detail.prep_payload.recommended_positioning || 'Sem postura sugerida'}
              />
            </Grid>
          </Grid>

          <Grid container spacing={1.25} sx={{ mt: 0.5 }}>
            {[
              { label: 'Pauta sugerida', values: detail.prep_payload.suggested_agenda },
              { label: 'Defesa da agência', values: detail.prep_payload.agency_defense_points },
              { label: 'Objeções prováveis', values: detail.prep_payload.likely_client_pushbacks },
              { label: 'Materiais para levar', values: detail.prep_payload.materials_to_prepare },
              { label: 'Alinhamento interno', values: detail.prep_payload.internal_alignment_notes },
              { label: 'Red flags', values: detail.prep_payload.red_flags },
              { label: 'Critérios de sucesso', values: detail.prep_payload.success_criteria },
            ].map((section) => (
              <Grid key={section.label} size={{ xs: 12, md: 6 }}>
                <Box sx={{ p: 1.25, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: 'background.paper', minHeight: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.7, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    {section.label}
                  </Typography>
                  {section.values?.length ? (
                    <Stack spacing={0.5}>
                      {section.values.map((entry, idx) => (
                        <Typography key={`${section.label}-${idx}`} variant="body2" sx={{ fontSize: '0.78rem', lineHeight: 1.55 }}>
                          • {entry}
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                      Nenhum item sugerido.
                    </Typography>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Actions extracted */}
      {actions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Acoes extraidas ({actions.length})
            </Typography>
            {actions.filter(a => a.status === 'pending').length > 1 && (
              <Button
                size="small"
                variant="contained"
                color="success"
                sx={{ fontSize: '0.68rem', py: 0.3, px: 1 }}
                disabled={approvingAction.size > 0}
                onClick={() => {
                  void apiPost(`/meetings/${meetingId}/approve-all`, {})
                    .then(() => loadDetail())
                    .catch(() => {});
                }}
              >
                Aprovar tudo
              </Button>
            )}
          </Stack>
          <Stack spacing={0.75}>
            {actions.map(a => (
              <Stack key={a.id} direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                {actionIcon(a.type)}
                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.78rem', flex: 1 }} noWrap>
                  {a.title}
                </Typography>
                <Chip label={typeLabel(a.type)} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                <Chip label={a.priority} size="small" color={priorityColor(a.priority)} sx={{ fontSize: '0.6rem', height: 18 }} />
                {a.metadata?.operation_lane && (
                  <Chip label={operationLaneLabel(a.metadata.operation_lane)} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                )}
                {a.metadata?.required_skill && (
                  <Chip label={a.metadata.required_skill} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                )}
                {a.status === 'approved' && <IconCheck size={14} style={{ color: '#4caf50' }} />}
                {a.status === 'rejected' && <IconX size={14} style={{ color: '#f44336' }} />}
                {a.status === 'pending' && (
                  <>
                    {approvingAction.has(a.id) ? (
                      <CircularProgress size={14} />
                    ) : (
                      <>
                        <Tooltip title="Aprovar e criar no sistema">
                          <IconButton
                            size="small"
                            sx={{ color: 'success.main', p: 0.3 }}
                            onClick={() => {
                              setApprovingAction(prev => new Set(prev).add(a.id));
                              void apiPatch(`/meeting-actions/${a.id}/approve`, { create_in_system: true })
                                .then(() => loadDetail())
                                .catch(() => {})
                                .finally(() => setApprovingAction(prev => { const n = new Set(prev); n.delete(a.id); return n; }));
                            }}
                          >
                            <IconCheck size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rejeitar">
                          <IconButton
                            size="small"
                            sx={{ color: 'error.main', p: 0.3 }}
                            onClick={() => {
                              setApprovingAction(prev => new Set(prev).add(a.id));
                              void apiPatch(`/meeting-actions/${a.id}/reject`, {})
                                .then(() => loadDetail())
                                .catch(() => {})
                                .finally(() => setApprovingAction(prev => { const n = new Set(prev); n.delete(a.id); return n; }));
                            }}
                          >
                            <IconX size={14} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </>
                )}
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* Transcript toggle */}
      {detail?.transcript && (
        <Box>
          <Button
            size="small"
            variant="text"
            startIcon={<IconFileText size={14} />}
            onClick={() => setShowTranscript(v => !v)}
            sx={{ mb: 0.5, textTransform: 'none', fontSize: '0.75rem' }}
          >
            {showTranscript ? 'Ocultar transcricao' : 'Ver transcricao completa'}
          </Button>
          <Collapse in={showTranscript}>
            <Box sx={{
              p: 1.5, bgcolor: '#fafafa', borderRadius: 1.5, border: 1, borderColor: 'divider',
              maxHeight: 400, overflow: 'auto', fontFamily: 'monospace',
            }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {detail.transcript}
              </Typography>
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Jarvis memory context */}
      {operational?.client_id && (
        <Box sx={{ mt: 1, mb: 1 }}>
          <Button
            size="small"
            variant="text"
            startIcon={<IconRobot size={14} />}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            onClick={() => {
              if (!showJarvisContext && !jarvisContext) {
                void apiGet<{ totalDocuments: number; bySourceType: Record<string, number>; conversationMemories: any[]; lastMemoryAt: string | null }>(
                  `/clients/${operational.client_id}/jarvis-context`,
                ).then(res => setJarvisContext(res)).catch(() => {});
              }
              setShowJarvisContext(v => !v);
            }}
          >
            {showJarvisContext ? 'Ocultar memória Jarvis' : 'Ver memória Jarvis'}
          </Button>
          <Collapse in={showJarvisContext}>
            {jarvisContext ? (
              <Box sx={{ mt: 0.5, p: 1.5, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: '#f8f4ff' }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.2 }}>
                  <Chip label={`${jarvisContext.totalDocuments} docs totais`} size="small" variant="outlined" />
                  {Object.entries(jarvisContext.bySourceType).map(([type, count]) => (
                    <Chip key={type} label={`${type}: ${count}`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 20 }} />
                  ))}
                </Stack>
                {jarvisContext.conversationMemories.length > 0 ? (
                  <Stack spacing={0.6}>
                    {jarvisContext.conversationMemories.map((m: any) => (
                      <Box key={m.id} sx={{ p: 0.8, borderRadius: 1, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.3 }}>
                          <Chip label={m.source_type} size="small" sx={{ fontSize: '0.58rem', height: 16 }} />
                          {m.created_at && (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                              {fmtDate(m.created_at)}
                            </Typography>
                          )}
                        </Stack>
                        <Typography variant="body2" sx={{ fontSize: '0.73rem', lineHeight: 1.5, color: 'text.secondary' }}>
                          {m.excerpt || m.title || '—'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                    Nenhuma memória de conversa encontrada para este cliente.
                  </Typography>
                )}
              </Box>
            ) : (
              <Box sx={{ py: 1, textAlign: 'center' }}><CircularProgress size={20} /></Box>
            )}
          </Collapse>
        </Box>
      )}

      <Collapse in={showAudit}>
        <Box sx={{ mt: 2, mb: 2, p: 1.5, borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: '#fcfcfd' }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Timeline operacional
          </Typography>

          {audit?.events?.length ? (
            <Stack spacing={1}>
              {audit.events.slice(0, 12).map(event => (
                <Box key={event.id} sx={{ p: 1, borderRadius: 1.25, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap" useFlexGap>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip label={stageLabel(event.stage)} size="small" variant="outlined" sx={{ fontSize: '0.64rem', height: 20 }} />
                      {statusChip(event.status)}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {fmtDateTime(event.created_at)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.8, fontSize: '0.78rem' }}>
                    {event.event_type}
                  </Typography>
                  {event.message && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4, lineHeight: 1.5 }}>
                      {event.message}
                    </Typography>
                  )}
                  {(event.actor_type || event.actor_id) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4 }}>
                      {event.actor_type ?? 'ator'}{event.actor_id ? ` · ${event.actor_id}` : ''}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              Nenhum evento operacional registrado.
            </Typography>
          )}

          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Jobs relacionados
          </Typography>

          {audit?.jobs?.length ? (
            <Stack spacing={1}>
              {audit.jobs.slice(0, 8).map(job => (
                <Box key={job.id} sx={{ p: 1, borderRadius: 1.25, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap" useFlexGap>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip label={job.type} size="small" variant="outlined" sx={{ fontSize: '0.64rem', height: 20 }} />
                      <Chip label={job.status} size="small" color={jobStatusColor(job.status)} variant="outlined" sx={{ fontSize: '0.64rem', height: 20 }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {fmtDateTime(job.updated_at ?? job.created_at)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.45 }}>
                    Tentativas: {job.attempts} · Agenda: {fmtDateTime(job.scheduled_for)}
                  </Typography>
                  {job.error_message && (
                    <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.45, lineHeight: 1.5 }}>
                      {job.error_message}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              Nenhum job relacionado encontrado.
            </Typography>
          )}
        </Box>
      </Collapse>

      {/* No analysis yet */}
      {!detail?.summary && !detail?.transcript && operational?.status !== 'analyzed' && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 1 }}>
          {operational?.status === 'processing' || operational?.status === 'analysis_pending' ? (
            <>
              <CircularProgress size={14} />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                Jarvis esta analisando esta reuniao...
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.8rem' }}>
              Nenhuma analise disponivel.
            </Typography>
          )}
        </Stack>
      )}

      {/* Meeting URL */}
      {(detail?.meeting_url || operational?.meeting_url) && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">Link:</Typography>
          <Typography
            variant="caption"
            component="a"
            href={detail?.meeting_url ?? operational?.meeting_url ?? undefined}
            target="_blank"
            rel="noopener"
            sx={{ color: 'primary.main', textDecoration: 'underline', wordBreak: 'break-all' }}
          >
            {detail?.meeting_url ?? operational?.meeting_url}
          </Typography>
        </Stack>
      )}

      {participants.length > 0 && (
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconUser size={16} color={EDRO_ORANGE} />
            <Typography variant="caption" color="text.secondary">
              Participantes: {participants.length}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {participants.map((participant) => (
              <Chip
                key={participant.id}
                size="small"
                variant="outlined"
                color={participant.is_internal ? 'warning' : 'default'}
                label={[
                  participant.display_name,
                  participant.is_organizer ? 'organizador' : null,
                  participant.response_status ? participant.response_status : null,
                ].filter(Boolean).join(' · ')}
                sx={{ maxWidth: '100%' }}
              />
            ))}
          </Stack>
        </Stack>
      )}

      {operational && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">Aprovada em: {fmtDateTime(operational.approved_at)}</Typography>
          <Typography variant="caption" color="text.secondary">WhatsApp: {fmtDateTime(operational.summary_sent_at)}</Typography>
          <Typography variant="caption" color="text.secondary">Concluida em: {fmtDateTime(operational.completed_at)}</Typography>
          <Typography variant="caption" color="text.secondary">Bot: {shortText(operational.bot_id)}</Typography>
          <Typography variant="caption" color="text.secondary">
            Pessoas: {operational.participant_count} ({operational.internal_participant_count} Edro / {operational.external_participant_count} externas)
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────

export default function MeetingsDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentMeeting[]>([]);
  const [byClient, setByClient] = useState<ClientBreakdown[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [proposals, setProposals] = useState<MeetingProposal[]>([]);
  const [error, setError] = useState('');
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);

  // ── New meeting form state ─────────────────────────────────────────
  const [platform, setPlatform] = useState<Platform>('other');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState(toLocalISO(new Date(Date.now() + 3600_000)));
  const [duration, setDuration] = useState(60);
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [teamMembers, setTeamMembers] = useState<Contact[]>([]);
  const [selectedInvites, setSelectedInvites] = useState<InviteContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<any>(null);
  const [createError, setCreateError] = useState('');
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const [recentFilter, setRecentFilter] = useState<RecentMeetingFilter>('all');
  const [archivedMeetings, setArchivedMeetings] = useState<RecentMeeting[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const requestedMeetingId = searchParams.get('meetingId');

  // ── Quick Bot dialog state ─────────────────────────────────────────
  const [quickBotOpen, setQuickBotOpen] = useState(false);
  const [quickBotUrl, setQuickBotUrl] = useState('');
  const [quickBotTime, setQuickBotTime] = useState(toLocalISO(new Date(Date.now() + 30 * 60_000)));
  const [quickBotClient, setQuickBotClient] = useState<string | null>(null);
  const [quickBotLoading, setQuickBotLoading] = useState(false);
  const [quickBotError, setQuickBotError] = useState('');
  const [quickBotDone, setQuickBotDone] = useState(false);

  // ── Load dashboard data ────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [calendarRes, dashRes, propRes] = await Promise.all([
        apiGet<CalendarStatus>('/calendar/watch-status').catch(() => ({ configured: false } as CalendarStatus)),
        apiGet<{ stats: Stats; recent: RecentMeeting[]; total_pending: number; by_client: ClientBreakdown[] }>('/meetings/dashboard'),
        apiGet<{ data: MeetingProposal[]; total_pending: number }>('/meetings/proposals'),
      ]);
      setCalendarStatus(calendarRes ?? { configured: false });
      setStats(dashRes.stats);
      setRecent(dashRes.recent);
      setByClient(dashRes.by_client);
      setTotalPending(dashRes.total_pending);
      setProposals(propRes.data ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (calendarStatus && !calendarStatus.configured && platform === 'meet') {
      setPlatform('other');
    }
  }, [calendarStatus, platform]);

  useEffect(() => {
    if (!requestedMeetingId || !recent.length) return;
    if (recent.some((meeting) => meeting.id === requestedMeetingId)) {
      setExpandedMeetingId(requestedMeetingId);
    }
  }, [requestedMeetingId, recent]);

  useEffect(() => {
    if (recentFilter !== 'archived' || archivedMeetings.length > 0) return;
    setArchivedLoading(true);
    apiGet<{ data: RecentMeeting[] }>('/meetings/archived')
      .then((res) => setArchivedMeetings(res.data ?? []))
      .catch(() => {})
      .finally(() => setArchivedLoading(false));
  }, [recentFilter, archivedMeetings.length]);

  // Load clients
  useEffect(() => {
    apiGet<unknown>('/clients?limit=200&status=active')
      .then((response) => setClients(normalizeClientsResponse(response)))
      .catch(() => {});
  }, []);

  // Load contacts when client changes
  useEffect(() => {
    setLoadingContacts(true);
    const url = clientId ? `/meetings/contacts?client_id=${clientId}` : '/meetings/contacts';
    apiGet<{ contacts: Contact[]; team: Contact[] }>(url)
      .then(r => {
        setAllContacts(r.contacts ?? []);
        setTeamMembers(r.team ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, [clientId]);

  const handleActionChange = useCallback((actionId: string, status: 'approved' | 'rejected') => {
    setProposals(prev =>
      prev.map(p => ({
        ...p,
        actions: p.actions.map(a => a.action_id === actionId ? { ...a, status } : a),
      })).filter(p => p.actions.some(a => a.status === 'pending')),
    );
    setTotalPending(prev => Math.max(0, prev - 1));
  }, []);

  // ── Invite helpers ─────────────────────────────────────────────────
  const handleAddContact = (contact: Contact) => {
    if (selectedInvites.find(c => c.id === contact.id)) return;
    const sendVia = contact.phone ? 'whatsapp' : contact.email ? 'email' : 'email';
    setSelectedInvites(prev => [...prev, { ...contact, send_via: sendVia as any }]);
  };

  const handleRemoveInvite = (id: string) => {
    setSelectedInvites(prev => prev.filter(c => c.id !== id));
  };

  const handleChangeSendVia = (id: string, via: 'whatsapp' | 'email' | 'both') => {
    setSelectedInvites(prev => prev.map(c => c.id === id ? { ...c, send_via: via } : c));
  };

  const availableContacts = [...allContacts, ...teamMembers].filter(
    c => !selectedInvites.find(s => s.id === c.id),
  );
  const calendarConnected = Boolean(calendarStatus?.configured);

  const handleCalendarConnect = useCallback(async () => {
    setConnectingCalendar(true);
    setCreateError('');
    try {
      const response = await apiGet<{ url: string }>('/auth/google/calendar/start?mode=json');
      if (!response?.url) {
        throw new Error('URL de autenticacao do Google Calendar indisponivel.');
      }
      window.location.assign(response.url);
    } catch (e: any) {
      setCreateError(e?.message ?? 'Falha ao iniciar autenticacao do Google Calendar.');
      setConnectingCalendar(false);
    }
  }, []);

  // ── Quick Bot ──────────────────────────────────────────────────────
  const handleQuickBot = async () => {
    if (!quickBotUrl.trim()) { setQuickBotError('Insira o link da reuniao'); return; }
    setQuickBotLoading(true);
    setQuickBotError('');
    const detectedPlatform = detectPlatform(quickBotUrl);
    try {
      await apiPost('/meetings/create', {
        title: 'Reuniao via link',
        platform: detectedPlatform,
        meeting_url: quickBotUrl.trim(),
        scheduled_at: new Date(quickBotTime).toISOString(),
        duration_minutes: 60,
        client_id: quickBotClient || undefined,
        schedule_bot: true,
      });
      setQuickBotDone(true);
      load();
    } catch (err: any) {
      setQuickBotError(describeCreateMeetingError(err));
    } finally {
      setQuickBotLoading(false);
    }
  };

  // ── Create meeting ─────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim()) { setCreateError('Titulo obrigatorio'); return; }
    if (platform === 'meet' && !calendarConnected) {
      setCreateError('Google Calendar nao esta conectado. Conecte o Calendar ou use Video e cole um link Meet/Zoom/Teams manualmente.');
      return;
    }
    if ((platform === 'zoom' || platform === 'teams' || platform === 'other') && !meetingUrl.trim()) {
      setCreateError('Insira o link da reuniao para esta plataforma');
      return;
    }

    setCreating(true);
    setCreateError('');
    setCreateResult(null);

    try {
      const res = await apiPost<any>('/meetings/create', {
        title: title.trim(),
        client_id: clientId || undefined,
        platform,
        meeting_url: platform !== 'meet' ? meetingUrl.trim() : undefined,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: duration,
        description: description.trim() || undefined,
        invite_contacts: selectedInvites.map(c => ({
          id: c.id,
          person_id: c.person_id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          whatsapp_jid: c.whatsapp_jid,
          role: c.role,
          source: c.source,
          send_via: c.send_via,
        })),
        schedule_bot: true,
      });
      setCreateResult(res);
      // Reset form
      setTitle('');
      setDescription('');
      setMeetingUrl('');
      setSelectedInvites([]);
      setScheduledAt(toLocalISO(new Date(Date.now() + 3600_000)));
      // Refresh dashboard
      load();
    } catch (err: any) {
      setCreateError(describeCreateMeetingError(err));
    } finally {
      setCreating(false);
    }
  };

  const pendingProposals = proposals.filter(p => p.actions.some(a => a.status === 'pending'));
  const recentCounts = {
    all: recent.length,
    active: recent.filter((meeting) => matchesRecentMeetingFilter(meeting, 'active')).length,
    approval: recent.filter((meeting) => matchesRecentMeetingFilter(meeting, 'approval')).length,
    failed: recent.filter((meeting) => matchesRecentMeetingFilter(meeting, 'failed')).length,
    done: recent.filter((meeting) => matchesRecentMeetingFilter(meeting, 'done')).length,
    archived: archivedMeetings.length,
  };
  const filteredRecent = recentFilter === 'archived'
    ? archivedMeetings
    : recent.filter((meeting) => matchesRecentMeetingFilter(meeting, recentFilter));

  return (
    <AppShell title="Reunioes">
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconMicrophone size={28} color={EDRO_ORANGE} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Reunioes</Typography>
            <Typography variant="caption" color="text.secondary">
              Agende, transcreva e extraia acoes automaticamente com Jarvis
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="small"
            startIcon={<IconRobot size={16} />}
            onClick={() => {
              setQuickBotUrl('');
              setQuickBotTime(toLocalISO(new Date(Date.now() + 30 * 60_000)));
              setQuickBotClient(null);
              setQuickBotError('');
              setQuickBotDone(false);
              setQuickBotOpen(true);
            }}
            sx={{ bgcolor: EDRO_ORANGE, '&:hover': { bgcolor: '#c44411' } }}
          >
            Bot Rapido
          </Button>
          <Button variant="outlined" size="small" startIcon={<IconRefresh size={16} />} onClick={load} disabled={loading}>
            Atualizar
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {loading && <LinearProgress />}

      {/* ── Nova Reuniao — inline form ──────────────────────────────── */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            <IconCalendar size={18} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
            Nova Reuniao
          </Typography>

          {/* Success banner */}
          {createResult && (
            <Alert
              severity="success"
              sx={{ mb: 2 }}
              onClose={() => setCreateResult(null)}
              action={
                createResult.meeting_url ? (
                  <Button size="small" color="inherit" onClick={() => navigator.clipboard.writeText(createResult.meeting_url)}>
                    Copiar link
                  </Button>
                ) : undefined
              }
            >
              Reuniao criada!
              {createResult.meeting_url && (
                <Typography variant="caption" component="span" sx={{ ml: 1 }}>
                  {createResult.meeting_url}
                </Typography>
              )}
              {createResult.bot_scheduled && ' — Jarvis Bot agendado.'}
              {createResult.invites?.length > 0 && ` — ${createResult.invites.filter((i: any) => i.ok).length} convite(s) enviado(s).`}
            </Alert>
          )}

          {/* Platform picker */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Plataforma
            </Typography>
            <ToggleButtonGroup
              value={platform}
              exclusive
              onChange={(_, v) => v && setPlatform(v)}
              sx={{ display: 'flex', gap: 1 }}
            >
              {(['meet', 'zoom', 'teams', 'other'] as Platform[]).map(p => (
                <ToggleButton
                  key={p}
                  value={p}
                  disabled={p === 'meet' && !calendarConnected}
                  sx={{
                    flex: 1,
                    border: '1.5px solid',
                    borderColor: platform === p ? platformColor(p) : 'divider',
                    borderRadius: '12px !important',
                    py: 1.2,
                    textTransform: 'none',
                    color: platform === p ? platformColor(p) : 'text.secondary',
                    '&.Mui-selected': {
                      bgcolor: `${platformColor(p)}12`,
                      color: platformColor(p),
                      borderColor: platformColor(p),
                    },
                  }}
                >
                  <Stack alignItems="center" spacing={0.3}>
                    {platformIcon(p)}
                    <Typography variant="caption" fontWeight={600}>{platformLabel(p)}</Typography>
                    {p === 'meet' && (
                      <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>
                        {calendarConnected ? 'Link automatico' : 'Conecte o Calendar'}
                      </Typography>
                    )}
                  </Stack>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {!calendarConnected ? (
              <Alert
                severity="warning"
                sx={{ mt: 1.5 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => void handleCalendarConnect()}
                    disabled={connectingCalendar}
                  >
                    {connectingCalendar ? 'Conectando...' : 'Conectar Calendar'}
                  </Button>
                }
              >
                Google Calendar nao esta conectado. Para criar Google Meet automaticamente, conecte o Calendar. Sem isso, o bot ainda funciona em Meet, Zoom e Teams usando a opcao Video com link manual.
              </Alert>
            ) : calendarStatus?.email ? (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                Google Calendar conectado como {calendarStatus.email}.
              </Alert>
            ) : null}
          </Box>

          {/* Meeting URL for non-Meet platforms */}
          {platform !== 'meet' && (
            <TextField
              label="Link da reuniao"
              placeholder={platform === 'zoom' ? 'https://zoom.us/j/...' : platform === 'teams' ? 'https://teams.microsoft.com/...' : 'https://...'}
              value={meetingUrl}
              onChange={e => setMeetingUrl(e.target.value)}
              size="small"
              fullWidth
              helperText={
                platform === 'other'
                  ? 'Cole um link do Google Meet, Zoom, Teams ou outra plataforma.'
                  : 'Cole o link da reuniao criada na plataforma.'
              }
              sx={{ mb: 2 }}
            />
          )}

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                label="Titulo da reuniao"
                value={title}
                onChange={e => setTitle(e.target.value)}
                size="small"
                fullWidth
                placeholder="Ex: Alinhamento mensal - Cliente X"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                label="Cliente"
                value={clientId ?? ''}
                onChange={e => setClientId(e.target.value || null)}
                size="small"
                fullWidth
              >
                <MenuItem value="">Interno (sem cliente)</MenuItem>
                {clients.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField
                label="Data e hora"
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 3, sm: 1 }}>
              <TextField
                label="Duracao"
                type="number"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 15, max: 480, step: 15 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 1 }}>
              <Stack justifyContent="center" sx={{ height: '100%', minHeight: 40 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <IconRobot size={14} color={EDRO_ORANGE} />
                  <Typography variant="caption" fontWeight={700} color="warning.main">
                    Bot sempre ativo
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                  Entra sozinho no horário agendado.
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mb: 2 }}>
            O bot é sempre agendado para entrar sozinho. Sua presença não é necessária para a tentativa de entrada. Se a plataforma exigir admissão manual ou se a sala não estiver aberta, ele pode ficar em espera ou falhar.
          </Alert>

          <TextField
            label="Descricao (opcional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
            placeholder="Pauta ou notas para a reuniao..."
            sx={{ mb: 2 }}
          />

          {/* ── Invite contacts ─────────────────────── */}
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            <IconSend size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Convidar participantes
          </Typography>

          <Autocomplete
            options={availableContacts}
            getOptionLabel={(c) => `${c.name}${c.client_name ? ` (${c.client_name})` : c.source === 'team' ? ' (Equipe)' : ''}`}
            groupBy={(c) => c.source === 'team' ? 'Equipe' : (c.client_name ?? 'Contatos')}
            onChange={(_, value) => { if (value) handleAddContact(value); }}
            value={null}
            loading={loadingContacts}
            size="small"
            renderInput={(params) => (
              <TextField {...params} placeholder="Buscar contato ou membro da equipe..." size="small" />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: option.source === 'team' ? '#e3f2fd' : '#fce4ec' }}>
                    {option.name?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={500} noWrap>{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {option.role ? `${option.role} · ` : ''}
                      {option.email ?? ''} {option.phone ? `· ${option.phone}` : ''}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    {option.phone && <IconBrandWhatsapp size={14} color="#25D366" />}
                    {option.email && <IconMail size={14} color="#999" />}
                  </Stack>
                </Stack>
              </li>
            )}
            sx={{ mb: 1.5 }}
            noOptionsText="Nenhum contato encontrado"
          />

          {/* Selected invites */}
          {selectedInvites.length > 0 && (
            <Stack spacing={0.75} sx={{ mb: 2 }}>
              {selectedInvites.map(contact => (
                <Stack key={contact.id} direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
                  <Avatar sx={{ width: 26, height: 26, fontSize: '0.65rem' }}>
                    {contact.name?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.78rem' }}>
                      {contact.name}
                    </Typography>
                  </Box>
                  <ToggleButtonGroup
                    value={contact.send_via}
                    exclusive
                    onChange={(_, v) => v && handleChangeSendVia(contact.id, v)}
                    size="small"
                    sx={{ '& .MuiToggleButton-root': { py: 0.2, px: 0.8 } }}
                  >
                    {contact.phone && (
                      <ToggleButton value="whatsapp" sx={{ borderRadius: '8px !important' }}>
                        <IconBrandWhatsapp size={13} style={{ marginRight: 3 }} />
                        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>WhatsApp</Typography>
                      </ToggleButton>
                    )}
                    {contact.email && (
                      <ToggleButton value="email" sx={{ borderRadius: '8px !important' }}>
                        <IconMail size={13} style={{ marginRight: 3 }} />
                        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>Email</Typography>
                      </ToggleButton>
                    )}
                    {contact.phone && contact.email && (
                      <ToggleButton value="both" sx={{ borderRadius: '8px !important' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>Ambos</Typography>
                      </ToggleButton>
                    )}
                  </ToggleButtonGroup>
                  <IconButton size="small" onClick={() => handleRemoveInvite(contact.id)}>
                    <IconX size={14} />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}

          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}

          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={creating}
              startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <IconCalendar size={16} />}
              sx={{ bgcolor: EDRO_ORANGE, '&:hover': { bgcolor: '#c94515' } }}
            >
              {creating ? 'Criando...' : 'Criar Reuniao'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      {stats && (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Total Reunioes" value={stats.total_meetings} icon={<IconMicrophone size={22} />} color={EDRO_ORANGE} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Ultimos 7 dias" value={stats.last_7_days} icon={<IconCalendar size={22} />} color="#2196f3" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Acoes Pendentes" value={totalPending} icon={<IconClock size={22} />} color="#ff9800" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Falhas" value={stats.failed} icon={<IconAlertTriangle size={22} />} color={stats.failed > 0 ? '#f44336' : '#4caf50'} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Left column — Recent meetings + per client */}
            <Grid size={{ xs: 12, lg: 7 }}>
              <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap" useFlexGap mb={1.5}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Reunioes Recentes
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {([
                        ['all', 'Todas'],
                        ['active', 'Em andamento'],
                        ['approval', 'Aprovacao'],
                        ['failed', 'Falhas'],
                        ['done', 'Concluidas'],
                        ['archived', 'Arquivadas'],
                      ] as Array<[RecentMeetingFilter, string]>).map(([value, label]) => (
                        <Chip
                          key={value}
                          label={`${label} (${recentCounts[value]})`}
                          clickable
                          color={recentFilter === value ? 'primary' : 'default'}
                          variant={recentFilter === value ? 'filled' : 'outlined'}
                          onClick={() => setRecentFilter(value)}
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                  {archivedLoading && recentFilter === 'archived' ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>
                  ) : recent.length === 0 && recentFilter !== 'archived' ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      Nenhuma reuniao encontrada. Crie sua primeira reuniao acima.
                    </Typography>
                  ) : filteredRecent.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      Nenhuma reuniao encontrada para esse filtro.
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Data</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Cliente</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Titulo</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Plataforma</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.72rem' }} align="center">Acoes</TableCell>
                            <TableCell />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredRecent.slice(0, 20).map(m => {
                            const isExpanded = expandedMeetingId === m.id;
                            return (
                              <React.Fragment key={m.id}>
                                <TableRow
                                  hover
                                  sx={{
                                    cursor: 'pointer',
                                    bgcolor: isExpanded ? 'action.selected' : undefined,
                                    '&:last-child td': { border: isExpanded ? undefined : 0 },
                                  }}
                                  onClick={() => setExpandedMeetingId(isExpanded ? null : m.id)}
                                >
                                  <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                    {fmtDate(m.recorded_at)}<br />
                                    <Typography variant="caption" color="text.disabled">{fmtTime(m.recorded_at)}</Typography>
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.78rem', maxWidth: 140 }}>
                                    <Typography variant="body2" noWrap sx={{ fontSize: '0.78rem' }}>
                                      {m.client_name || 'Interno'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.78rem', maxWidth: 200 }}>
                                    <Typography variant="body2" noWrap sx={{ fontSize: '0.78rem' }}>
                                      {m.title || 'Sem titulo'}
                                    </Typography>
                                    {m.analysis_payload?.intelligence && (
                                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.35 }} flexWrap="wrap" useFlexGap>
                                        <Chip
                                          label={meetingKindLabel(m.analysis_payload.intelligence.meeting_kind)}
                                          size="small"
                                          variant="outlined"
                                          sx={{ fontSize: '0.58rem', height: 18 }}
                                        />
                                        {m.analysis_payload.intelligence.attention_level && (
                                          <Chip
                                            label={`Atenção ${m.analysis_payload.intelligence.attention_level}`}
                                            size="small"
                                            color={attentionColor(m.analysis_payload.intelligence.attention_level)}
                                            variant="outlined"
                                            sx={{ fontSize: '0.58rem', height: 18 }}
                                          />
                                        )}
                                      </Stack>
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.75rem' }}>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                      {platformIcon(m.platform)}
                                      <Typography variant="caption">{platformLabel(m.platform)}</Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell>{statusChip(m.status)}</TableCell>
                                  <TableCell align="center">
                                    {m.pending_actions > 0 ? (
                                      <Chip label={`${m.pending_actions}/${m.total_actions}`} size="small" color="warning" sx={{ fontSize: '0.7rem', height: 20 }} />
                                    ) : m.total_actions > 0 ? (
                                      <Chip label={m.total_actions} size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                                    ) : (
                                      <Typography variant="caption" color="text.disabled">-</Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                      {m.has_recording && (
                                        <Tooltip title="Ver gravação de vídeo">
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void apiGet<{ url: string }>(`/meetings/${m.id}/recording`)
                                                .then((res) => window.open(res.url, '_blank', 'noopener'))
                                                .catch(() => {});
                                            }}
                                            sx={{ color: EDRO_ORANGE }}
                                          >
                                            <IconPlayerPlay size={14} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                      {m.has_audio_recording && (
                                        <Tooltip title="Ouvir gravação de áudio">
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void apiGet<{ url: string }>(`/meetings/${m.id}/audio`)
                                                .then((res) => window.open(res.url, '_blank', 'noopener'))
                                                .catch(() => {});
                                            }}
                                            sx={{ color: '#666' }}
                                          >
                                            <IconHeadphones size={14} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                      {isExpanded ? <IconChevronDown size={14} style={{ color: '#999' }} /> : <IconChevronRight size={14} style={{ color: '#999' }} />}
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow>
                                    <TableCell colSpan={7} sx={{ p: 0, bgcolor: '#fafbfc', borderBottom: 1, borderColor: 'divider' }}>
                                      <MeetingDetailPanel
                                        meetingId={m.id}
                                        onUnarchive={() => {
                                          setArchivedMeetings(prev => prev.filter(a => a.id !== m.id));
                                          void load();
                                        }}
                                      />
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>

              {/* Per-client breakdown */}
              {byClient.length > 0 && (
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                      Por Cliente (90 dias)
                    </Typography>
                    <Stack spacing={1}>
                      {byClient.map(c => (
                        <Stack
                          key={c.client_id}
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer' }}
                          onClick={() => router.push(`/clients/${c.client_id}/meetings`)}
                        >
                          <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.82rem' }}>
                            {c.client_name || 'Interno'}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={`${c.meeting_count} reunioes`} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 20 }} />
                            {c.pending_actions > 0 && (
                              <Chip label={`${c.pending_actions} pendente${c.pending_actions !== 1 ? 's' : ''}`} size="small" color="warning" sx={{ fontSize: '0.68rem', height: 20 }} />
                            )}
                            <IconChevronRight size={14} style={{ color: '#999' }} />
                          </Stack>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Right column — Pending proposals */}
            <Grid size={{ xs: 12, lg: 5 }}>
              <Box sx={{ position: 'sticky', top: 80 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Acoes Pendentes ({totalPending})
                  </Typography>
                </Stack>

                {pendingProposals.length === 0 && !loading ? (
                  <Card variant="outlined" sx={{ borderRadius: 2, p: 3, textAlign: 'center' }}>
                    <IconChecks size={32} style={{ color: '#4caf50', marginBottom: 8 }} />
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma acao pendente de aprovacao!
                    </Typography>
                  </Card>
                ) : (
                  <Stack spacing={2}>
                    {pendingProposals.map(p => (
                      <ProposalCard
                        key={p.meeting_id}
                        proposal={p}
                        onActionChange={handleActionChange}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            </Grid>
          </Grid>
        </>
      )}
      {/* ── Quick Bot Dialog ─────────────────────────────────────── */}
      <Dialog open={quickBotOpen} onClose={() => setQuickBotOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconRobot size={20} color={EDRO_ORANGE} />
            <Typography fontWeight={700}>Agendar Bot Rapido</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Cole o link e defina o horario. O Jarvis Bot entra automaticamente.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {quickBotDone ? (
              <Alert severity="success" onClose={() => setQuickBotOpen(false)}>
                Bot agendado com sucesso!
              </Alert>
            ) : (
              <>
                <TextField
                  label="Link da reuniao"
                  placeholder="https://teams.microsoft.com/meet/..."
                  value={quickBotUrl}
                  onChange={e => setQuickBotUrl(e.target.value)}
                  fullWidth
                  size="small"
                  helperText={
                    quickBotUrl
                      ? `Plataforma detectada: ${platformLabel(detectPlatform(quickBotUrl))}`
                      : 'Suporte: Teams, Zoom, Google Meet'
                  }
                />
                <TextField
                  label="Horario"
                  type="datetime-local"
                  value={quickBotTime}
                  onChange={e => setQuickBotTime(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  select
                  label="Cliente (opcional)"
                  value={quickBotClient ?? ''}
                  onChange={e => setQuickBotClient(e.target.value || null)}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">Sem cliente</MenuItem>
                  {clients.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </TextField>
                {quickBotError && <Alert severity="error">{quickBotError}</Alert>}
              </>
            )}
          </Stack>
        </DialogContent>
        {!quickBotDone && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setQuickBotOpen(false)} size="small">Cancelar</Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleQuickBot}
              disabled={quickBotLoading || !quickBotUrl.trim()}
              sx={{ bgcolor: EDRO_ORANGE, '&:hover': { bgcolor: '#c44411' } }}
              startIcon={quickBotLoading ? <CircularProgress size={14} color="inherit" /> : <IconSend size={14} />}
            >
              Agendar Bot
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </AppShell>
  );
}
