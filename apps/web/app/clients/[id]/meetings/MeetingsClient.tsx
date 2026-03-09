'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import {
  IconMicrophone, IconUpload, IconChevronDown, IconChevronUp,
  IconCheck, IconX, IconChecks, IconBriefcase, IconBulb,
  IconListCheck, IconNote, IconClock, IconUser, IconRobot, IconCalendarPlus,
} from '@tabler/icons-react';

const EDRO_ORANGE = '#E85219';

type MeetingAction = {
  id: string;
  type: 'briefing' | 'task' | 'campaign' | 'pauta' | 'note';
  title: string;
  description: string;
  responsible?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'done';
  raw_excerpt?: string;
  system_item_id?: string;
};

type Meeting = {
  id: string;
  title: string;
  platform: string;
  recorded_at: string;
  duration_secs?: number;
  summary: string;
  status: string;
  pending_actions: number;
  total_actions: number;
  actions?: MeetingAction[];
};

function actionIcon(type: string) {
  switch (type) {
    case 'briefing': return <IconBriefcase size={14} />;
    case 'campaign': return <IconBulb size={14} />;
    case 'pauta': return <IconNote size={14} />;
    case 'task': return <IconListCheck size={14} />;
    default: return <IconNote size={14} />;
  }
}

function priorityColor(p: string) {
  if (p === 'high') return 'error';
  if (p === 'medium') return 'warning';
  return 'default';
}

function formatDuration(secs?: number) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function MeetingCard({ meeting: initialMeeting, clientId, onUpdate }: {
  meeting: Meeting;
  clientId: string;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<Meeting | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const meeting = detail ?? initialMeeting;

  const loadDetail = async () => {
    if (detail || loadingDetail) return;
    setLoadingDetail(true);
    try {
      const res = await apiGet<{ data: Meeting }>(`/clients/${clientId}/meetings/${initialMeeting.id}`);
      if (res?.data) setDetail(res.data);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggle = () => {
    if (!expanded) loadDetail();
    setExpanded(e => !e);
  };

  const approveAction = async (actionId: string) => {
    setApproving(actionId);
    try {
      await apiPatch(`/meeting-actions/${actionId}/approve`, { create_in_system: true });
      await loadDetail();
      onUpdate();
    } finally {
      setApproving(null);
    }
  };

  const rejectAction = async (actionId: string) => {
    setApproving(actionId);
    try {
      await apiPatch(`/meeting-actions/${actionId}/reject`, {});
      await loadDetail();
      onUpdate();
    } finally {
      setApproving(null);
    }
  };

  const approveAll = async () => {
    setApprovingAll(true);
    try {
      await apiPost(`/meetings/${initialMeeting.id}/approve-all`, {});
      await loadDetail();
      onUpdate();
    } finally {
      setApprovingAll(false);
    }
  };

  const pendingCount = (detail?.actions ?? []).filter(a => a.status === 'pending').length;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <Box sx={{ p: 0.75, bgcolor: `${EDRO_ORANGE}15`, borderRadius: 1.5 }}>
              <IconMicrophone size={18} style={{ color: EDRO_ORANGE }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600} noWrap>{meeting.title}</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(meeting.recorded_at).toLocaleDateString('pt-BR')}
                </Typography>
                {meeting.duration_secs && (
                  <Typography variant="caption" color="text.secondary">
                    · {formatDuration(meeting.duration_secs)}
                  </Typography>
                )}
                <Chip
                  label={meeting.platform ?? 'upload'}
                  size="small"
                  sx={{ fontSize: '0.65rem', height: 18 }}
                />
              </Stack>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
            {meeting.pending_actions > 0 && (
              <Chip
                label={`${meeting.pending_actions} pendente${meeting.pending_actions > 1 ? 's' : ''}`}
                size="small"
                color="warning"
                sx={{ fontSize: '0.68rem' }}
              />
            )}
            <Button size="small" onClick={handleToggle} endIcon={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}>
              {expanded ? 'Fechar' : 'Ver ações'}
            </Button>
          </Stack>
        </Stack>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            {loadingDetail && <CircularProgress size={20} sx={{ color: EDRO_ORANGE }} />}

            {meeting.summary && (
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1.5, p: 1.5, mb: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Resumo
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.8rem' }}>
                  {meeting.summary}
                </Typography>
              </Box>
            )}

            {pendingCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={approvingAll ? <CircularProgress size={12} color="inherit" /> : <IconChecks size={14} />}
                  onClick={approveAll}
                  disabled={approvingAll}
                  sx={{ bgcolor: EDRO_ORANGE, '&:hover': { bgcolor: '#c94215' }, fontSize: '0.75rem' }}
                >
                  Aprovar tudo ({pendingCount})
                </Button>
              </Box>
            )}

            <Stack spacing={1}>
              {(detail?.actions ?? []).map(action => (
                <Box
                  key={action.id}
                  sx={{
                    border: 1,
                    borderColor: action.status === 'pending' ? 'divider' : action.status === 'approved' ? 'success.light' : 'action.disabledBackground',
                    borderRadius: 2,
                    p: 1.25,
                    opacity: action.status !== 'pending' ? 0.65 : 1,
                    bgcolor: action.status === 'approved' ? 'success.light' + '18' : 'transparent',
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
                      <Box sx={{ mt: 0.2, color: EDRO_ORANGE, flexShrink: 0 }}>{actionIcon(action.type)}</Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                          {action.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                          {action.description}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap">
                          <Chip label={action.type} size="small" sx={{ fontSize: '0.62rem', height: 16 }} />
                          <Chip label={action.priority} size="small" color={priorityColor(action.priority) as any} sx={{ fontSize: '0.62rem', height: 16 }} />
                          {action.responsible && (
                            <Stack direction="row" alignItems="center" spacing={0.25}>
                              <IconUser size={10} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{action.responsible}</Typography>
                            </Stack>
                          )}
                          {action.deadline && (
                            <Stack direction="row" alignItems="center" spacing={0.25}>
                              <IconClock size={10} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                {new Date(action.deadline).toLocaleDateString('pt-BR')}
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Box>
                    </Stack>

                    {action.status === 'pending' && (
                      <Stack direction="row" spacing={0.5} flexShrink={0}>
                        <Tooltip title="Aprovar e criar no sistema">
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              disabled={approving === action.id}
                              onClick={() => approveAction(action.id)}
                              sx={{ minWidth: 0, px: 1, py: 0.25 }}
                            >
                              {approving === action.id ? <CircularProgress size={12} /> : <IconCheck size={14} />}
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Rejeitar">
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={approving === action.id}
                              onClick={() => rejectAction(action.id)}
                              sx={{ minWidth: 0, px: 1, py: 0.25 }}
                            >
                              <IconX size={14} />
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    )}

                    {action.status === 'approved' && (
                      <Chip label="Aprovado" size="small" color="success" sx={{ fontSize: '0.65rem' }} />
                    )}
                    {action.status === 'rejected' && (
                      <Chip label="Rejeitado" size="small" color="error" sx={{ fontSize: '0.65rem' }} />
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function MeetingsClient({ clientId }: { clientId: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [recallUrl, setRecallUrl] = useState('');
  const [recallTitle, setRecallTitle] = useState('');
  const [recallWhen, setRecallWhen] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ data: Meeting[] }>(`/clients/${clientId}/meetings`);
      setMeetings(res?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const initial = new Date(Date.now() + 20 * 60 * 1000);
    const local = new Date(initial.getTime() - initial.getTimezoneOffset() * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    setRecallWhen(local);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/clients/${clientId}/meetings/upload`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Falha no upload' }));
        throw new Error(err.error ?? 'Falha no upload');
      }
      await load();
    } catch (err: any) {
      setUploadError(err.message ?? 'Erro ao processar reunião.');
    } finally {
      setUploading(false);
    }
  };

  const handleScheduleRecall = async () => {
    setScheduling(true);
    setUploadError('');
    setScheduleSuccess('');

    try {
      const scheduledAt = new Date(recallWhen);
      if (!recallUrl.trim()) throw new Error('Informe o link da reunião.');
      if (Number.isNaN(scheduledAt.getTime())) throw new Error('Informe data e hora válidas.');

      const res = await apiPost<{ scheduled_at: string }>(`/clients/${clientId}/meetings/recall-bot`, {
        meeting_url: recallUrl.trim(),
        scheduled_at: scheduledAt.toISOString(),
        title: recallTitle.trim() || undefined,
      });

      setScheduleSuccess(`Bot agendado para ${new Date(String(res?.scheduled_at || scheduledAt.toISOString())).toLocaleString('pt-BR')}.`);
      setRecallUrl('');
      setRecallTitle('');
      await load();
    } catch (err: any) {
      setUploadError(err.message ?? 'Erro ao agendar bot da reunião.');
    } finally {
      setScheduling(false);
    }
  };

  const totalPending = meetings.reduce((acc, m) => acc + (Number(m.pending_actions) || 0), 0);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 3, px: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Reuniões</Typography>
          <Typography variant="body2" color="text.secondary">
            Envie gravações ou agende o bot ao vivo — o Jarvis transcreve, decupa e extrai as ações.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {totalPending > 0 && (
            <Chip
              label={`${totalPending} ação${totalPending > 1 ? 'ões' : ''} pendente${totalPending > 1 ? 's' : ''}`}
              color="warning"
              size="small"
            />
          )}
          <Box component="label" aria-hidden="true" sx={{ display: 'none' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.mp4,.m4a,.wav,.ogg,.webm"
              title="Upload de reunião"
              aria-label="Upload de reunião"
              onChange={handleUpload}
            />
          </Box>
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <IconUpload size={16} />}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            sx={{ bgcolor: EDRO_ORANGE, '&:hover': { bgcolor: '#c94215' } }}
          >
            {uploading ? 'Processando…' : 'Nova Reunião'}
          </Button>
        </Stack>
      </Stack>

      {uploadError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError('')}>{uploadError}</Alert>}
      {scheduleSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setScheduleSuccess('')}>{scheduleSuccess}</Alert>}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box sx={{ p: 0.9, bgcolor: `${EDRO_ORANGE}15`, borderRadius: 1.5 }}>
                <IconRobot size={18} style={{ color: EDRO_ORANGE }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Agendar bot ao vivo</Typography>
                <Typography variant="caption" color="text.secondary">
                  Use a Recall para entrar na reunião sem depender de upload manual.
                </Typography>
              </Box>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label="Link da reunião"
                placeholder="https://meet.google.com/..."
                value={recallUrl}
                onChange={(e) => setRecallUrl(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Data e hora"
                type="datetime-local"
                value={recallWhen}
                onChange={(e) => setRecallWhen(e.target.value)}
                size="small"
                sx={{ minWidth: { md: 220 } }}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
              <TextField
                label="Título interno"
                placeholder="Reunião comercial, kickoff, alinhamento..."
                value={recallTitle}
                onChange={(e) => setRecallTitle(e.target.value)}
                fullWidth
                size="small"
              />
              <Button
                variant="contained"
                startIcon={scheduling ? <CircularProgress size={14} color="inherit" /> : <IconCalendarPlus size={16} />}
                onClick={handleScheduleRecall}
                disabled={scheduling}
                sx={{ bgcolor: EDRO_ORANGE, '&:hover': { bgcolor: '#c94215' }, minWidth: 180 }}
              >
                {scheduling ? 'Agendando…' : 'Agendar bot'}
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Agende com pelo menos 11 minutos de antecedência. Para automação total via Google Calendar, conecte em{' '}
              <Link href="/admin/integrations" underline="hover">Integrações da Agência</Link>.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {uploading && (
        <Card variant="outlined" sx={{ mb: 2, bgcolor: `${EDRO_ORANGE}08` }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={24} sx={{ color: EDRO_ORANGE }} />
              <Box>
                <Typography variant="subtitle2">Processando reunião…</Typography>
                <Typography variant="caption" color="text.secondary">
                  Transcrevendo com Whisper e analisando com IA. Isso pode levar 1–2 minutos.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {loading && !uploading && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={28} sx={{ color: EDRO_ORANGE }} />
        </Stack>
      )}

      {!loading && meetings.length === 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
              <Box sx={{ p: 2, bgcolor: `${EDRO_ORANGE}15`, borderRadius: '50%' }}>
                <IconMicrophone size={32} style={{ color: EDRO_ORANGE }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={600}>Nenhuma reunião ainda</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 360 }}>
                Faça upload de uma gravação de reunião (MP3, MP4, M4A, WAV) e o Jarvis extrai as ações automaticamente.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<IconUpload size={16} />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ borderColor: EDRO_ORANGE, color: EDRO_ORANGE, mt: 1 }}
              >
                Enviar primeira reunião
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {meetings.map(m => (
        <MeetingCard key={m.id} meeting={m} clientId={clientId} onUpdate={load} />
      ))}
    </Box>
  );
}
