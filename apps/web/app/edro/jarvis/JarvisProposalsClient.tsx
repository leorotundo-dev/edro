'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBriefcase,
  IconBulb,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconListCheck,
  IconMicrophone,
  IconNote,
  IconRefresh,
  IconRobot,
  IconUser,
  IconX,
} from '@tabler/icons-react';

const EDRO_ORANGE = '#E85219';

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

function actionIcon(type: string) {
  switch (type) {
    case 'briefing': return <IconBriefcase size={14} />;
    case 'campaign': return <IconBulb size={14} />;
    case 'pauta':    return <IconNote size={14} />;
    case 'task':     return <IconListCheck size={14} />;
    default:         return <IconNote size={14} />;
  }
}

function priorityColor(p: string): 'error' | 'warning' | 'default' {
  if (p === 'high') return 'error';
  if (p === 'medium') return 'warning';
  return 'default';
}

function platformLabel(platform: string) {
  if (platform === 'meet')  return '📹 Google Meet';
  if (platform === 'zoom')  return '🔵 Zoom';
  if (platform === 'teams') return '💜 Teams';
  return '🎥 Vídeo';
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    briefing: 'Briefing',
    task: 'Tarefa',
    campaign: 'Campanha',
    pauta: 'Pauta',
    note: 'Nota',
  };
  return map[type] ?? type;
}

function MeetingProposalCard({
  proposal,
  onActionChange,
}: {
  proposal: MeetingProposal;
  onActionChange: (actionId: string, status: 'approved' | 'rejected', systemItemId?: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [approving, setApproving] = useState<Set<string>>(new Set());
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  const handleApprove = async (action: ProposedAction) => {
    setApproving((prev) => new Set(prev).add(action.action_id));
    try {
      const res = await apiPatch<{ success: boolean; system_item_id: string | null }>(
        `/meeting-actions/${action.action_id}/approve`,
        { create_in_system: true },
      );
      onActionChange(action.action_id, 'approved', res.system_item_id ?? undefined);
    } catch { /* silent */ } finally {
      setApproving((prev) => { const s = new Set(prev); s.delete(action.action_id); return s; });
    }
  };

  const handleReject = async (action: ProposedAction) => {
    setApproving((prev) => new Set(prev).add(action.action_id));
    try {
      await apiPatch(`/meeting-actions/${action.action_id}/reject`, {});
      onActionChange(action.action_id, 'rejected');
    } catch { /* silent */ } finally {
      setApproving((prev) => { const s = new Set(prev); s.delete(action.action_id); return s; });
    }
  };

  const handleApproveAll = async () => {
    setApproveAllLoading(true);
    try {
      await apiPost(`/meetings/${proposal.meeting_id}/approve-all`, {});
      for (const a of proposal.actions) {
        onActionChange(a.action_id, 'approved');
      }
    } catch { /* silent */ } finally {
      setApproveAllLoading(false);
    }
  };

  const date = new Date(proposal.recorded_at);
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const pendingActions = proposal.actions.filter((a) => a.status === 'pending');

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Meeting header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={1.5} flex={1} minWidth={0}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: `${EDRO_ORANGE}22`, color: EDRO_ORANGE }}>
              <IconMicrophone size={18} />
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {proposal.meeting_title || 'Reunião sem título'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {platformLabel(proposal.platform)} · {dateStr} às {timeStr}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
            <Chip
              label={`${pendingActions.length} proposta${pendingActions.length !== 1 ? 's' : ''}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
            {pendingActions.length > 1 && (
              <Button
                size="small"
                variant="contained"
                sx={{ fontSize: '0.72rem', py: 0.3 }}
                onClick={handleApproveAll}
                disabled={approveAllLoading}
                startIcon={approveAllLoading ? <CircularProgress size={12} color="inherit" /> : <IconCheck size={13} />}
              >
                Aprovar Tudo
              </Button>
            )}
            <IconButton size="small" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </IconButton>
          </Stack>
        </Stack>

        {/* Summary */}
        {proposal.summary && (
          <Box
            sx={{
              mb: 1.5,
              p: 1.25,
              bgcolor: 'grey.50',
              borderRadius: 1.5,
              borderLeft: `3px solid ${EDRO_ORANGE}`,
            }}
          >
            <Stack direction="row" spacing={0.75} alignItems="flex-start">
              <IconRobot size={13} color={EDRO_ORANGE} style={{ marginTop: 2, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                {proposal.summary}
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Actions */}
        <Collapse in={expanded}>
          <Stack spacing={1}>
            {proposal.actions.map((action) => {
              const isLoading = approving.has(action.action_id);
              return (
                <Box
                  key={action.action_id}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" alignItems="flex-start" spacing={1} flex={1} minWidth={0}>
                      <Box sx={{ color: 'text.secondary', mt: 0.25, flexShrink: 0 }}>
                        {actionIcon(action.type)}
                      </Box>
                      <Box flex={1} minWidth={0}>
                        <Stack direction="row" alignItems="center" spacing={0.75} mb={0.25} flexWrap="wrap">
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                            {action.title}
                          </Typography>
                          <Chip
                            label={typeLabel(action.type)}
                            size="small"
                            variant="outlined"
                            sx={{ height: 16, fontSize: '0.6rem' }}
                          />
                          <Chip
                            label={action.priority}
                            size="small"
                            color={priorityColor(action.priority)}
                            sx={{ height: 16, fontSize: '0.6rem' }}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          {action.description}
                        </Typography>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap">
                          {action.responsible && (
                            <Stack direction="row" alignItems="center" spacing={0.4}>
                              <IconUser size={10} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                                {action.responsible}
                              </Typography>
                            </Stack>
                          )}
                          {action.deadline && (
                            <Stack direction="row" alignItems="center" spacing={0.4}>
                              <IconClock size={10} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                                {new Date(action.deadline).toLocaleDateString('pt-BR')}
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                        {action.raw_excerpt && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              fontStyle: 'italic',
                              color: 'text.disabled',
                              fontSize: '0.68rem',
                              borderLeft: '2px solid',
                              borderColor: 'divider',
                              pl: 0.75,
                            }}
                          >
                            "{action.raw_excerpt.slice(0, 120)}{action.raw_excerpt.length > 120 ? '…' : ''}"
                          </Typography>
                        )}
                      </Box>
                    </Stack>

                    {/* Approve / Reject buttons */}
                    <Stack direction="row" spacing={0.5} flexShrink={0}>
                      {isLoading ? (
                        <CircularProgress size={18} />
                      ) : (
                        <>
                          <Tooltip title="Aprovar — cria briefing/tarefa automaticamente">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprove(action)}
                              sx={{
                                bgcolor: 'success.main',
                                color: 'white',
                                borderRadius: 1,
                                width: 28,
                                height: 28,
                                '&:hover': { bgcolor: 'success.dark' },
                              }}
                            >
                              <IconCheck size={14} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Rejeitar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReject(action)}
                              sx={{
                                bgcolor: 'error.main',
                                color: 'white',
                                borderRadius: 1,
                                width: 28,
                                height: 28,
                                '&:hover': { bgcolor: 'error.dark' },
                              }}
                            >
                              <IconX size={14} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function JarvisProposalsClient() {
  const [proposals, setProposals] = useState<MeetingProposal[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{
        success: boolean;
        data: MeetingProposal[];
        total_pending: number;
      }>('/meetings/proposals');
      setProposals(res.data ?? []);
      setTotalPending(res.total_pending ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar propostas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActionChange = (
    actionId: string,
    newStatus: 'approved' | 'rejected',
  ) => {
    setProposals((prev) =>
      prev
        .map((m) => ({
          ...m,
          actions: m.actions.map((a) =>
            a.action_id === actionId ? { ...a, status: newStatus } : a,
          ),
        }))
        .filter((m) => m.actions.some((a) => a.status === 'pending')),
    );
    setTotalPending((t) => Math.max(0, t - 1));
  };

  const pendingMeetings = proposals.filter((m) => m.actions.some((a) => a.status === 'pending'));

  return (
    <AppShell
      title="Jarvis — Propostas de Reunião"
      topbarRight={
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconRefresh size={16} />}
          onClick={load}
          disabled={loading}
        >
          Atualizar
        </Button>
      }
    >
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Header stats */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ bgcolor: `${EDRO_ORANGE}22`, color: EDRO_ORANGE, width: 48, height: 48 }}>
            <IconRobot size={24} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {loading ? '…' : totalPending} proposta{totalPending !== 1 ? 's' : ''} pendente{totalPending !== 1 ? 's' : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Jarvis analisou {pendingMeetings.length} reuniõe{pendingMeetings.length !== 1 ? 's' : ''} e extraiu ações para revisão.
              Aprovadas criam briefings/tarefas automaticamente no Kanban.
            </Typography>
          </Box>
        </Stack>

        <Divider />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : pendingMeetings.length === 0 ? (
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: `${EDRO_ORANGE}22`, color: EDRO_ORANGE, mx: 'auto', mb: 2 }}>
                <IconCheck size={28} />
              </Avatar>
              <Typography variant="h6" gutterBottom>Tudo em dia!</Typography>
              <Typography variant="body2" color="text.secondary">
                Nenhuma proposta pendente. O Jarvis vai analisar as próximas reuniões automaticamente.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {pendingMeetings.map((proposal) => (
              <MeetingProposalCard
                key={proposal.meeting_id}
                proposal={proposal}
                onActionChange={handleActionChange}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </AppShell>
  );
}
