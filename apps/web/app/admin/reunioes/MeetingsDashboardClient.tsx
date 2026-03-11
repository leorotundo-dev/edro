'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
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
  IconChecks, IconCalendar, IconPlus, IconBrandGoogle, IconBrandZoom,
  IconBrandTeams, IconVideo, IconBrandWhatsapp, IconMail,
  IconSend, IconRobot,
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
  total_actions: number;
  pending_actions: number;
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
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  client_id?: string;
  client_name?: string;
  is_primary?: boolean;
  source: 'client_contact' | 'team';
};

type InviteContact = Contact & { send_via: 'whatsapp' | 'email' | 'both' };

type Platform = 'meet' | 'zoom' | 'teams' | 'other';

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
  if (status === 'analyzed') return <Chip label="Analisada" size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />;
  if (status === 'processing') return <Chip label="Processando" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />;
  if (status === 'failed') return <Chip label="Falha" size="small" color="error" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />;
  if (status === 'scheduled') return <Chip label="Agendada" size="small" color="info" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />;
  return <Chip label={status} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function toLocalISO(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

// ── Nova Reuniao Dialog ──────────────────────────────────────────────

function NovaReuniaoDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const defaultTime = new Date(Date.now() + 3600_000); // 1h from now

  const [platform, setPlatform] = useState<Platform>('meet');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState(toLocalISO(defaultTime));
  const [duration, setDuration] = useState(60);
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [scheduleBot, setScheduleBot] = useState(true);

  // Contacts
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [teamMembers, setTeamMembers] = useState<Contact[]>([]);
  const [selectedInvites, setSelectedInvites] = useState<InviteContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Load clients list
  useEffect(() => {
    if (!open) return;
    apiGet<{ clients: Array<{ id: string; name: string }> }>('/clients?limit=200&status=active')
      .then(r => setClients(r.clients ?? []))
      .catch(() => {});
  }, [open]);

  // Load contacts when client changes
  useEffect(() => {
    if (!open) return;
    setLoadingContacts(true);
    const url = clientId ? `/meetings/contacts?client_id=${clientId}` : '/meetings/contacts';
    apiGet<{ contacts: Contact[]; team: Contact[] }>(url)
      .then(r => {
        setAllContacts(r.contacts ?? []);
        setTeamMembers(r.team ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, [open, clientId]);

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

  const handleCreate = async () => {
    if (!title.trim()) { setError('Titulo obrigatorio'); return; }
    if ((platform === 'zoom' || platform === 'teams' || platform === 'other') && !meetingUrl.trim()) {
      setError('Insira o link da reuniao para esta plataforma');
      return;
    }

    setCreating(true);
    setError('');
    setResult(null);

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
          name: c.name,
          email: c.email,
          phone: c.phone,
          send_via: c.send_via,
        })),
        schedule_bot: scheduleBot,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao criar reuniao');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (result) onCreated();
    onClose();
    // Reset form after close
    setTimeout(() => {
      setTitle('');
      setPlatform('meet');
      setScheduledAt(toLocalISO(new Date(Date.now() + 3600_000)));
      setDuration(60);
      setDescription('');
      setClientId(null);
      setMeetingUrl('');
      setScheduleBot(true);
      setSelectedInvites([]);
      setResult(null);
      setError('');
    }, 300);
  };

  const availableContacts = [...allContacts, ...teamMembers].filter(
    c => !selectedInvites.find(s => s.id === c.id),
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: `${EDRO_ORANGE}15`, color: EDRO_ORANGE }}>
            <IconCalendar size={20} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>Nova Reuniao</Typography>
            <Typography variant="caption" color="text.secondary">
              Agende, convide e o Jarvis analisa automaticamente
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {result ? (
          /* ── Success state ─────────────────────────── */
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: '#e8f5e9', color: '#4caf50', mx: 'auto', mb: 2 }}>
              <IconCheck size={28} />
            </Avatar>
            <Typography variant="h6" fontWeight={700} mb={1}>Reuniao Criada!</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {result.platform === 'meet' ? 'Link do Google Meet gerado automaticamente.' : 'Reuniao registrada no sistema.'}
            </Typography>

            {result.meeting_url && (
              <Card variant="outlined" sx={{ mb: 2, p: 1.5, textAlign: 'left' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {platformIcon(result.platform)}
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1, wordBreak: 'break-all' }}>
                    {result.meeting_url}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigator.clipboard.writeText(result.meeting_url)}
                  >
                    Copiar
                  </Button>
                </Stack>
              </Card>
            )}

            {result.bot_scheduled && (
              <Chip icon={<IconRobot size={14} />} label="Jarvis Bot agendado para transcrever" color="info" size="small" sx={{ mb: 1 }} />
            )}

            {result.invites?.length > 0 && (
              <Box sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Convites enviados:
                </Typography>
                <Stack spacing={0.5}>
                  {result.invites.map((inv: any, i: number) => (
                    <Stack key={i} direction="row" alignItems="center" spacing={1}>
                      {inv.channel === 'whatsapp' ? <IconBrandWhatsapp size={14} color="#25D366" /> : <IconMail size={14} color="#666" />}
                      <Typography variant="caption">{inv.name}</Typography>
                      {inv.ok ? (
                        <Chip label="Enviado" size="small" color="success" sx={{ height: 18, fontSize: '0.6rem' }} />
                      ) : (
                        <Chip label={inv.error || 'Falha'} size="small" color="error" sx={{ height: 18, fontSize: '0.6rem' }} />
                      )}
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        ) : (
          /* ── Form ──────────────────────────────────── */
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {/* Platform picker */}
            <Box>
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
                    sx={{
                      flex: 1,
                      border: '1.5px solid',
                      borderColor: platform === p ? platformColor(p) : 'divider',
                      borderRadius: '12px !important',
                      py: 1.5,
                      textTransform: 'none',
                      color: platform === p ? platformColor(p) : 'text.secondary',
                      bgcolor: platform === p ? `${platformColor(p)}08` : 'transparent',
                      '&.Mui-selected': {
                        bgcolor: `${platformColor(p)}12`,
                        color: platformColor(p),
                        borderColor: platformColor(p),
                      },
                    }}
                  >
                    <Stack alignItems="center" spacing={0.5}>
                      {platformIcon(p)}
                      <Typography variant="caption" fontWeight={600}>{platformLabel(p)}</Typography>
                      {p === 'meet' && (
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
                          Link automatico
                        </Typography>
                      )}
                    </Stack>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
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
                helperText="Cole o link da reuniao criada na plataforma"
              />
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Titulo da reuniao"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Ex: Alinhamento mensal - Cliente X"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
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
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
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
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Duracao (min)"
                  type="number"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { min: 15, max: 480, step: 15 } }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Stack justifyContent="center" sx={{ height: '100%' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scheduleBot}
                        onChange={e => setScheduleBot(e.target.checked)}
                        size="small"
                        color="warning"
                      />
                    }
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <IconRobot size={14} />
                        <Typography variant="caption" fontWeight={600}>Jarvis Bot</Typography>
                      </Stack>
                    }
                  />
                </Stack>
              </Grid>
            </Grid>

            <TextField
              label="Descricao (opcional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={2}
              placeholder="Pauta ou notas para a reuniao..."
            />

            {/* ── Invite contacts ──────────────────────── */}
            <Divider />
            <Box>
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
                <Stack spacing={0.75}>
                  {selectedInvites.map(contact => (
                    <Card key={contact.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 0.75 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                          {contact.name?.[0]?.toUpperCase() ?? '?'}
                        </Avatar>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.8rem' }}>
                            {contact.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {contact.email ?? ''} {contact.phone ?? ''}
                          </Typography>
                        </Box>
                        <ToggleButtonGroup
                          value={contact.send_via}
                          exclusive
                          onChange={(_, v) => v && handleChangeSendVia(contact.id, v)}
                          size="small"
                          sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 1 } }}
                        >
                          {contact.phone && (
                            <ToggleButton value="whatsapp" sx={{ borderRadius: '8px !important' }}>
                              <IconBrandWhatsapp size={14} style={{ marginRight: 4 }} />
                              <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>WhatsApp</Typography>
                            </ToggleButton>
                          )}
                          {contact.email && (
                            <ToggleButton value="email" sx={{ borderRadius: '8px !important' }}>
                              <IconMail size={14} style={{ marginRight: 4 }} />
                              <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Email</Typography>
                            </ToggleButton>
                          )}
                          {contact.phone && contact.email && (
                            <ToggleButton value="both" sx={{ borderRadius: '8px !important' }}>
                              <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Ambos</Typography>
                            </ToggleButton>
                          )}
                        </ToggleButtonGroup>
                        <IconButton size="small" onClick={() => handleRemoveInvite(contact.id)}>
                          <IconX size={14} />
                        </IconButton>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}

              {selectedInvites.length === 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                  Nenhum participante adicionado. Convites serao enviados por WhatsApp ou email.
                </Typography>
              )}
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {result ? (
          <Button onClick={handleClose} variant="contained">Fechar</Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={creating}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={creating}
              startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <IconCalendar size={16} />}
              sx={{ bgcolor: EDRO_ORANGE, '&:hover': { bgcolor: '#c94515' } }}
            >
              {creating ? 'Criando...' : 'Criar Reuniao'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────

export default function MeetingsDashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentMeeting[]>([]);
  const [byClient, setByClient] = useState<ClientBreakdown[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [proposals, setProposals] = useState<MeetingProposal[]>([]);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, propRes] = await Promise.all([
        apiGet<{ stats: Stats; recent: RecentMeeting[]; total_pending: number; by_client: ClientBreakdown[] }>('/meetings/dashboard'),
        apiGet<{ data: MeetingProposal[]; total_pending: number }>('/meetings/proposals'),
      ]);
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

  const handleActionChange = useCallback((actionId: string, status: 'approved' | 'rejected') => {
    setProposals(prev =>
      prev.map(p => ({
        ...p,
        actions: p.actions.map(a => a.action_id === actionId ? { ...a, status } : a),
      })).filter(p => p.actions.some(a => a.status === 'pending')),
    );
    setTotalPending(prev => Math.max(0, prev - 1));
  }, []);

  const pendingProposals = proposals.filter(p => p.actions.some(a => a.status === 'pending'));

  return (
    <AppShell title="Reunioes">
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>

        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: `${EDRO_ORANGE}15`, color: EDRO_ORANGE }}>
              <IconMicrophone size={20} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>Reunioes</Typography>
              <Typography variant="body2" color="text.secondary">
                Agende, transcreva e extraia acoes automaticamente com Jarvis
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" startIcon={<IconRefresh size={16} />} onClick={load} disabled={loading}>
              Atualizar
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<IconPlus size={16} />}
              onClick={() => setDialogOpen(true)}
              sx={{ bgcolor: EDRO_ORANGE, '&:hover': { bgcolor: '#c94515' } }}
            >
              Nova Reuniao
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {stats && (
          <>
            {/* Stat Cards */}
            <Grid container spacing={2} mb={3}>
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

                {/* Recent Meetings table */}
                <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                      Reunioes Recentes
                    </Typography>
                    {recent.length === 0 ? (
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <IconMicrophone size={36} style={{ color: '#ccc', marginBottom: 8 }} />
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          Nenhuma reuniao encontrada
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<IconPlus size={14} />}
                          onClick={() => setDialogOpen(true)}
                        >
                          Agendar primeira reuniao
                        </Button>
                      </Box>
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
                            {recent.slice(0, 20).map(m => (
                              <TableRow
                                key={m.id}
                                hover
                                sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                                onClick={() => router.push(`/clients/${m.client_id}/meetings`)}
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
                                  <IconChevronRight size={14} style={{ color: '#999' }} />
                                </TableCell>
                              </TableRow>
                            ))}
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
      </Box>

      <NovaReuniaoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />
    </AppShell>
  );
}
