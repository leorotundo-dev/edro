'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiDelete, apiPatch, apiPost } from '@/lib/api';
import { useConfirm } from '@/hooks/useConfirm';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Checkbox from '@mui/material/Checkbox';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Popover from '@mui/material/Popover';
import Select from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import StatusChip from '@/components/shared/StatusChip';
import UserAvatar from '@/components/shared/UserAvatar';
import EdroAvatar from '@/components/shared/EdroAvatar';
import {
  IconDownload,
  IconPlus,
  IconCalendar,
  IconUser,
  IconBuilding,
  IconSourceCode,
  IconAlertTriangle,
  IconArchive,
  IconClipboardList,
  IconDotsVertical,
  IconFileText,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerSkipForward,
  IconSearch,
  IconTrash,
  IconUsers,
  IconX,
  IconLayoutList,
  IconLayoutKanban,
  IconVideo,
} from '@tabler/icons-react';
import BriefingsKanban from './BriefingsKanban';
import BriefingCardDrawer from './BriefingCardDrawer';

type Briefing = {
  id: string;
  client_name: string | null;
  client_logo_url?: string | null;
  client_brand_color?: string | null;
  title: string;
  status: string;
  created_at: string;
  due_at: string | null;
  traffic_owner: string | null;
  source: string | null;
  labels?: string[];
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  meeting_url?: string | null;
};

type UpcomingMeeting = {
  id: string;
  calendar_event_id: string;
  event_title: string | null;
  video_url: string;
  video_platform: string | null;
  scheduled_at: string;
  organizer_email: string | null;
  meeting_id: string | null;
  job_enqueued_at: string | null;
  has_briefing: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  iclips_in: 'iClips Entrada',
  alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovação',
  producao: 'Produção',
  revisao: 'Revisão',
  iclips_out: 'iClips Saída',
  done: 'Concluído',
  archived: 'Arquivado',
};

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatRelativeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Atrasado ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays <= 7) return `${diffDays} dias`;
  return null;
}

type Metrics = {
  total: number;
  byStatus: Record<string, number>;
  avgTimePerStage: Record<string, number>;
  totalCopies: number;
  tasksByType: Record<string, number>;
  recentBriefings: number;
  staleArchivedCount: number;
  bottlenecks: { stage: string; count: number }[];
};

type EdroClient = {
  id: string;
  name: string;
};

const PAGE_SIZE = 30;

export default function BriefingsClient() {
  const router = useRouter();
  const confirm = useConfirm();
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuBriefingId, setMenuBriefingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [clients, setClients] = useState<EdroClient[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [hoveredBriefing, setHoveredBriefing] = useState<Briefing | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [stageChangingId, setStageChangingId] = useState<string | null>(null);
  const [drawerBriefingId, setDrawerBriefingId] = useState<string | null>(null);
  const [filterOwner, setFilterOwner] = useState<string>('');
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [pendingProposals, setPendingProposals] = useState(0);
  // ── Nova Reunião dialog ─────────────────────────────────────────────────
  const [meetDialogOpen,    setMeetDialogOpen]    = useState(false);
  const [meetTitle,         setMeetTitle]         = useState('');
  const [meetEmails,        setMeetEmails]        = useState('');
  const [meetDuration,      setMeetDuration]      = useState(60);
  const [meetStartNow,      setMeetStartNow]      = useState(true);
  const [meetScheduledAt,   setMeetScheduledAt]   = useState('');
  const [meetLoading,       setMeetLoading]       = useState(false);
  const [meetError,         setMeetError]         = useState('');
  const [meetResult,        setMeetResult]        = useState<{ url: string; htmlLink: string } | null>(null);
  const showError = (message: string) => setSnackbar({ open: true, message });

  const loadBriefings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (viewMode === 'list' && filterStatus) params.set('status', filterStatus);
      if (search) params.set('search', search);
      if (clientFilter) params.set('clientId', clientFilter);
      if (viewMode === 'kanban') {
        params.set('limit', '500');
      } else {
        params.set('limit', String(PAGE_SIZE));
        params.set('offset', String(page * PAGE_SIZE));
      }

      const response = await apiGet<{ success: boolean; data: Briefing[]; total: number }>(
        `/edro/briefings?${params.toString()}`
      );
      setBriefings(response?.data || []);
      setTotal(response?.total ?? 0);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefings.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search, clientFilter, page, viewMode]);

  const loadMetrics = useCallback(async () => {
    try {
      const response = await apiGet<{ success: boolean; data: Metrics }>('/edro/metrics');
      setMetrics(response?.data || null);
    } catch (err: any) {
      console.error('Falha ao carregar métricas:', err);
    }
  }, []);

  useEffect(() => {
    loadBriefings();
    loadMetrics();
  }, [loadBriefings, loadMetrics]);

  useEffect(() => {
    apiGet<{ success: boolean; data: EdroClient[] }>('/edro/clients')
      .then((res) => setClients(res?.data || []))
      .catch(() => {});
    apiGet<{ success: boolean; data: UpcomingMeeting[] }>('/edro/upcoming-meetings')
      .then((res) => setUpcomingMeetings((res?.data || []).filter((m) => !m.has_briefing)))
      .catch(() => {});
    apiGet<{ success: boolean; total_pending: number }>('/meetings/proposals')
      .then((res) => setPendingProposals(res?.total_pending ?? 0))
      .catch(() => {});
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      setPage(0);
    }, 400);
  };

  const handleNewBriefing = () => {
    router.push('/edro/novo');
  };

  const handleCreateFromMeeting = async (meeting: UpcomingMeeting) => {
    try {
      const scheduledDate = new Date(meeting.scheduled_at).toISOString().slice(0, 10);
      await apiPost('/edro/briefings', {
        title: meeting.event_title || 'Reunião',
        client_name: meeting.organizer_email?.split('@')[0] || 'Cliente',
        meeting_url: meeting.video_url,
        due_at: scheduledDate,
        source: 'calendar',
      });
      setUpcomingMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
      loadBriefings();
      setSnackbar({ open: true, message: 'Briefing criado a partir da reunião!' });
    } catch {
      showError('Erro ao criar briefing da reunião.');
    }
  };

  const handleCreateMeeting = async () => {
    setMeetLoading(true);
    setMeetError('');
    setMeetResult(null);
    try {
      const emails = meetEmails.split(/[,;\n]/).map((e) => e.trim()).filter(Boolean);
      const payload: Record<string, any> = {
        title: meetTitle.trim() || 'Reunião Edro',
        attendee_emails: emails,
        duration_minutes: meetDuration,
        enqueue_bot: true,
      };
      if (!meetStartNow && meetScheduledAt) {
        payload.start_at = new Date(meetScheduledAt).toISOString();
      }
      const res = await apiPost<{ meet_url: string; html_link: string }>('/meetings/instant', payload);
      setMeetResult({ url: res.meet_url, htmlLink: res.html_link });
    } catch (e: any) {
      setMeetError(e?.message ?? 'Erro ao criar reunião no Google Calendar.');
    } finally {
      setMeetLoading(false);
    }
  };

  const handleBriefingClick = (id: string) => {
    if (viewMode === 'kanban') {
      setDrawerBriefingId(id);
    } else {
      router.push(`/edro/${id}`);
    }
  };

  const handleDrawerUpdate = (id: string, patch: Partial<Briefing>) => {
    setBriefings((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const url = `/edro/reports/export?format=${format}`;

      if (format === 'csv') {
        window.open(`${process.env.NEXT_PUBLIC_API_URL || '/api'}${url}`, '_blank');
      } else {
        const response = await apiGet<{ success: boolean; data: any[] }>(url);
        const blob = new Blob([JSON.stringify(response?.data || [], null, 2)], {
          type: 'application/json',
        });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `edro-briefings-${Date.now()}.json`;
        a.click();
      }
    } catch (err: any) {
      showError(err?.message || 'Erro ao exportar relatório.');
    }
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, briefingId: string) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuBriefingId(briefingId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuBriefingId(null);
  };

  const handleArchive = async () => {
    if (!menuBriefingId) return;
    const id = menuBriefingId;
    handleMenuClose();
    try {
      await apiPatch(`/edro/briefings/${id}/archive`);
      setBriefings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'archived' } : b)));
    } catch (err: any) {
      showError(err?.message || 'Erro ao arquivar briefing.');
    }
  };

  const handleDelete = async () => {
    if (!menuBriefingId) return;
    const id = menuBriefingId;
    handleMenuClose();
    if (!await confirm('Excluir este briefing permanentemente? Todas as copies e tarefas associadas serão removidas.')) return;
    try {
      await apiDelete(`/edro/briefings/${id}`);
      setBriefings((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      showError(err?.message || 'Erro ao excluir briefing.');
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === briefings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(briefings.map((b) => b.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => apiPatch(`/edro/briefings/${id}/archive`)));
      setBriefings((prev) => prev.map((b) => (ids.includes(b.id) ? { ...b, status: 'archived' } : b)));
      setSelectedIds(new Set());
    } catch (err: any) {
      showError(err?.message || 'Erro ao arquivar briefings.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!await confirm(`Excluir ${selectedIds.size} briefing(s) permanentemente? Todas as copies e tarefas associadas serão removidas.`)) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => apiDelete(`/edro/briefings/${id}`)));
      setBriefings((prev) => prev.filter((b) => !ids.includes(b.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      showError(err?.message || 'Erro ao excluir briefings.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkAdvance = async () => {
    if (selectedIds.size === 0) return;
    if (!await confirm(`Avançar ${selectedIds.size} briefing(s) para a próxima etapa?`)) return;
    setBulkLoading(true);
    try {
      await apiPost('/edro/briefings/bulk/advance', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      await loadBriefings();
    } catch (err: any) {
      showError(err?.message || 'Erro ao avançar briefings.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleStageChange = async (briefingId: string, newStage: string) => {
    setStageChangingId(briefingId);
    try {
      await apiPatch(`/edro/briefings/${briefingId}/stages/${newStage}`, { status: 'in_progress' });
      setBriefings((prev) => prev.map((b) => (b.id === briefingId ? { ...b, status: newStage } : b)));
    } catch (err: any) {
      showError(err?.message || 'Não foi possível mover o briefing. Verifique se a etapa anterior está concluída.');
    } finally {
      setStageChangingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading && briefings.length === 0) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Carregando briefings...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <AppShell
      title="Briefings Edro"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Edro
          </Typography>
          <Typography variant="caption" color="text.secondary">
            / Briefings
          </Typography>
        </Stack>
      }
      topbarRight={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            onClick={() => router.push('/edro/inbox')}
          >
            Pauta Inbox
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconDownload size={16} />}
            onClick={() => handleExport('csv')}
          >
            Exportar CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconVideo size={16} />}
            onClick={() => { setMeetDialogOpen(true); setMeetResult(null); setMeetError(''); }}
          >
            Nova Reunião
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<IconPlus size={16} />}
            onClick={handleNewBriefing}
          >
            Novo Briefing
          </Button>
        </Stack>
      }
    >
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        {metrics && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                      <IconFileText size={18} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">{metrics.total}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Briefings
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    +{metrics.recentBriefings} últimos 7 dias
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                      <IconClipboardList size={18} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">{metrics.totalCopies}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Copies Geradas
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    IA automatizada
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                      <IconCalendar size={18} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">{metrics.byStatus.aprovacao || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Em Aprovação
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Aguardando gestor
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                      <IconUsers size={18} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4">{metrics.byStatus.done || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Concluídos
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Entregues
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {pendingProposals > 0 && (
          <Alert
            severity="info"
            icon={<IconUsers size={18} />}
            action={
              <Button color="inherit" size="small" href="/edro/jarvis" component="a">
                Revisar ({pendingProposals})
              </Button>
            }
          >
            <Typography variant="body2">
              <strong>Jarvis</strong> analisou reuniões e tem <strong>{pendingProposals}</strong> proposta{pendingProposals !== 1 ? 's' : ''} pendente{pendingProposals !== 1 ? 's' : ''} — briefings e tarefas prontos para aprovar.
            </Typography>
          </Alert>
        )}

        {metrics && metrics.bottlenecks.length > 0 && (
          <Alert
            severity="warning"
            icon={<IconAlertTriangle size={18} />}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle2">Etapas com Gargalos</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {metrics.bottlenecks.map((bottleneck) => (
                  <Chip
                    key={bottleneck.stage}
                    label={`${STATUS_LABELS[bottleneck.stage] || bottleneck.stage}: ${bottleneck.count}`}
                    size="small"
                  />
                ))}
              </Stack>
            </Stack>
          </Alert>
        )}

        {metrics && metrics.staleArchivedCount > 0 && filterStatus !== 'archived' && (
          <Alert
            severity="info"
            icon={<IconArchive size={18} />}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => { setFilterStatus('archived'); setPage(0); }}
              >
                Ver histórico
              </Button>
            }
          >
            <Typography variant="body2">
              <strong>{metrics.staleArchivedCount}</strong> briefing{metrics.staleArchivedCount !== 1 ? 's' : ''} arquivado{metrics.staleArchivedCount !== 1 ? 's' : ''} automaticamente por data passada — o conhecimento gerado está preservado no histórico.
            </Typography>
          </Alert>
        )}

        {upcomingMeetings.length > 0 && (
          <Card variant="outlined" sx={{ borderColor: '#1976d2', bgcolor: '#e3f2fd11' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.25}>
                <IconVideo size={16} color="#1976d2" />
                <Typography variant="subtitle2" fontWeight={700} color="primary">
                  Reuniões Detectadas pelo Google Calendar
                </Typography>
                <Chip
                  label={upcomingMeetings.length}
                  size="small"
                  color="primary"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              </Stack>
              <Stack spacing={0.75}>
                {upcomingMeetings.map((meeting) => {
                  const date = new Date(meeting.scheduled_at);
                  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const platformIcon = meeting.video_platform === 'meet'
                    ? '📹 Meet'
                    : meeting.video_platform === 'zoom'
                    ? '🔵 Zoom'
                    : meeting.video_platform === 'teams'
                    ? '💜 Teams'
                    : '🎥 Vídeo';
                  return (
                    <Stack
                      key={meeting.id}
                      direction={{ xs: 'column', sm: 'row' }}
                      alignItems={{ sm: 'center' }}
                      justifyContent="space-between"
                      spacing={1}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} flex={1} minWidth={0}>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>
                          {platformIcon}
                        </Typography>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {meeting.event_title || 'Reunião sem título'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dateStr} às {timeStr}
                            {meeting.organizer_email && ` · ${meeting.organizer_email}`}
                          </Typography>
                        </Box>
                        {meeting.job_enqueued_at && (
                          <Chip label="Bot agendado" size="small" color="success" variant="outlined"
                            sx={{ height: 18, fontSize: '0.6rem' }} />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} flexShrink={0}>
                        <Button
                          size="small"
                          variant="outlined"
                          href={meeting.video_url}
                          target="_blank"
                          component="a"
                          sx={{ fontSize: '0.72rem', py: 0.25 }}
                        >
                          Entrar
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<IconPlus size={13} />}
                          onClick={() => handleCreateFromMeeting(meeting)}
                          sx={{ fontSize: '0.72rem', py: 0.25 }}
                        >
                          Criar Briefing
                        </Button>
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            size="small"
            placeholder="Buscar por título ou cliente..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={18} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 280 }}
          />
          {clients.length > 0 && (
            <Autocomplete
              options={[{ id: '', name: 'Todos os clientes' }, ...clients]}
              getOptionLabel={(o) => o.name}
              value={clients.find((c) => c.id === clientFilter) ?? { id: '', name: 'Todos os clientes' }}
              onChange={(_, v) => { setClientFilter(v?.id ?? ''); setPage(0); }}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              sx={{ minWidth: 200 }}
              renderInput={(params) => <TextField {...params} label="Cliente" />}
              disableClearable
            />
          )}
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {total} resultado{total !== 1 ? 's' : ''}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          {viewMode === 'list' && (
            <ToggleButtonGroup
              value={filterStatus}
              exclusive
              onChange={(_, v) => { if (v !== null) { setFilterStatus(v); setPage(0); } }}
              size="small"
              sx={{ flexWrap: 'wrap', gap: '4px' }}
            >
              <ToggleButton value="">Todos</ToggleButton>
              {Object.keys(STATUS_LABELS).map((status) => (
                <ToggleButton key={status} value={status}>
                  {STATUS_LABELS[status]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          {viewMode === 'kanban' && <Box sx={{ flex: 1 }} />}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => { if (v) setViewMode(v); }}
            size="small"
          >
            <ToggleButton value="list" title="Vista em Lista">
              <IconLayoutList size={16} />
            </ToggleButton>
            <ToggleButton value="kanban" title="Vista Kanban">
              <IconLayoutKanban size={16} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {selectedIds.size > 0 && (
          <Card
            variant="outlined"
            sx={{ bgcolor: 'primary.50', borderColor: 'primary.light' }}
          >
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Checkbox
                    checked={selectedIds.size === briefings.length}
                    indeterminate={selectedIds.size > 0 && selectedIds.size < briefings.length}
                    onChange={toggleSelectAll}
                    size="small"
                  />
                  <Typography variant="body2" fontWeight={600}>
                    {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="info"
                    startIcon={<IconPlayerSkipForward size={16} />}
                    onClick={handleBulkAdvance}
                    disabled={bulkLoading}
                  >
                    Avançar Stage
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<IconArchive size={16} />}
                    onClick={handleBulkArchive}
                    disabled={bulkLoading}
                  >
                    Arquivar
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<IconTrash size={16} />}
                    onClick={handleBulkDelete}
                    disabled={bulkLoading}
                  >
                    Excluir
                  </Button>
                  {bulkLoading && <CircularProgress size={20} />}
                </Stack>
                <IconButton size="small" onClick={clearSelection}>
                  <IconX size={18} />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        )}

        {viewMode === 'kanban' ? (
          loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Owner filter chips */}
              {(() => {
                const owners = Array.from(new Set(briefings.map((b) => b.traffic_owner).filter(Boolean))) as string[];
                if (!owners.length) return null;
                return (
                  <Stack direction="row" spacing={0.75} alignItems="center" mb={1.5} flexWrap="wrap">
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Responsável:</Typography>
                    <Chip
                      size="small"
                      label="Todos"
                      onClick={() => setFilterOwner('')}
                      variant={filterOwner === '' ? 'filled' : 'outlined'}
                      color={filterOwner === '' ? 'primary' : 'default'}
                    />
                    {owners.map((owner) => (
                      <Chip
                        key={owner}
                        size="small"
                        avatar={<Avatar sx={{ width: 18, height: 18, fontSize: '0.55rem' }}>{owner[0].toUpperCase()}</Avatar>}
                        label={owner.split(' ')[0]}
                        onClick={() => setFilterOwner(filterOwner === owner ? '' : owner)}
                        variant={filterOwner === owner ? 'filled' : 'outlined'}
                        color={filterOwner === owner ? 'primary' : 'default'}
                      />
                    ))}
                  </Stack>
                );
              })()}
              {clientFilter && (() => {
                const selectedClient = clients.find((c) => c.id === clientFilter);
                return selectedClient ? (
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                    <Typography variant="h6" fontWeight={700}>{selectedClient.name}</Typography>
                    <Chip
                      label={`${briefings.length} card${briefings.length !== 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.72rem' }}
                    />
                    <Chip
                      label="Kanban do Cliente"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontSize: '0.72rem' }}
                    />
                  </Stack>
                ) : null;
              })()}
              <BriefingsKanban
                briefings={filterOwner ? briefings.filter((b) => b.traffic_owner === filterOwner) : briefings}
                onBriefingClick={handleBriefingClick}
                onStageChange={handleStageChange}
                stageChangingId={stageChangingId}
              />
              <BriefingCardDrawer
                briefingId={drawerBriefingId}
                onClose={() => setDrawerBriefingId(null)}
                onUpdate={handleDrawerUpdate}
              />
            </>
          )
        ) : briefings.length === 0 && !loading ? (
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 6, px: 3, background: 'radial-gradient(ellipse at 50% 0%, rgba(232,82,25,0.05) 0%, transparent 70%)', borderRadius: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: '#fdeee8', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, mx: 'auto', color: '#E85219' }}>
                <IconFileText size={28} />
              </Box>
              <Typography variant="h6" gutterBottom>
                Nenhum briefing encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Comece criando seu primeiro briefing para automatizar o fluxo da agência.
              </Typography>
              <Button variant="contained" onClick={handleNewBriefing}>
                Criar Primeiro Briefing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {briefings.map((briefing) => {
              const relativeDate = formatRelativeDate(briefing.due_at);
              const isOverdue = relativeDate?.includes('Atrasado');

              return (
                <Card
                  key={briefing.id}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { boxShadow: 3 },
                  }}
                  onClick={() => handleBriefingClick(briefing.id)}
                  onMouseEnter={(e) => { setPopoverAnchor(e.currentTarget); setHoveredBriefing(briefing); }}
                  onMouseLeave={() => { setPopoverAnchor(null); setHoveredBriefing(null); }}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Checkbox
                            size="small"
                            checked={selectedIds.has(briefing.id)}
                            onClick={(e) => toggleSelect(briefing.id, e)}
                            sx={{ p: 0.5 }}
                          />
                          <Avatar variant="rounded" sx={{ bgcolor: 'grey.100', color: 'primary.main' }}>
                            <IconFileText size={18} />
                          </Avatar>
                          <Box>
                            <Typography variant="h6">{briefing.title}</Typography>
                            <Stack direction="row" spacing={2} flexWrap="wrap" mt={0.5}>
                              {briefing.client_name && (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <EdroAvatar
                                    src={briefing.client_logo_url}
                                    name={briefing.client_name}
                                    size={20}
                                    sx={briefing.client_brand_color ? { bgcolor: `${briefing.client_brand_color}33` } : undefined}
                                  />
                                  <Typography variant="body2" color="text.secondary">
                                    {briefing.client_name}
                                  </Typography>
                                </Stack>
                              )}
                              {briefing.traffic_owner && (
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                  <UserAvatar name={briefing.traffic_owner} size={20} tooltip />
                                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {briefing.traffic_owner}
                                  </Typography>
                                </Stack>
                              )}
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <IconCalendar size={14} />
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(briefing.created_at)}
                                </Typography>
                              </Stack>
                              {briefing.source && (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <IconSourceCode size={14} />
                                  <Typography variant="body2" color="text.secondary">
                                    {briefing.source}
                                  </Typography>
                                </Stack>
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <StatusChip
                            status={briefing.status}
                            label={STATUS_LABELS[briefing.status] || briefing.status}
                          />
                          {briefing.due_at && (
                            <Stack spacing={0} alignItems="flex-end">
                              <Typography
                                variant="body2"
                                color={isOverdue ? 'error.main' : 'text.secondary'}
                              >
                                {relativeDate || formatDate(briefing.due_at)}
                              </Typography>
                              {relativeDate && (
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(briefing.due_at)}
                                </Typography>
                              )}
                            </Stack>
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, briefing.id)}
                          >
                            <IconDotsVertical size={18} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}

        {viewMode === 'list' && totalPages > 1 && (
          <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
            <IconButton
              size="small"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <IconChevronLeft size={20} />
            </IconButton>
            <Typography variant="body2">
              Página {page + 1} de {totalPages}
            </Typography>
            <IconButton
              size="small"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <IconChevronRight size={20} />
            </IconButton>
          </Stack>
        )}
      </Stack>

      {/* Hover preview Popover */}
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
        onClose={() => { setPopoverAnchor(null); setHoveredBriefing(null); }}
        disableRestoreFocus
        sx={{ pointerEvents: 'none', ml: 1 }}
        slotProps={{ paper: { sx: { width: 280, p: 2, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.14)' } } }}
      >
        {hoveredBriefing && (
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {hoveredBriefing.title}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <StatusChip status={hoveredBriefing.status} label={STATUS_LABELS[hoveredBriefing.status] || hoveredBriefing.status} />
              {hoveredBriefing.client_name && (
                <Chip size="small" label={hoveredBriefing.client_name} variant="outlined" />
              )}
            </Stack>
            <Divider />
            <Stack spacing={0.75}>
              {hoveredBriefing.traffic_owner && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <UserAvatar name={hoveredBriefing.traffic_owner} size={18} />
                  <Typography variant="caption" color="text.secondary">{hoveredBriefing.traffic_owner}</Typography>
                </Stack>
              )}
              {hoveredBriefing.source && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconSourceCode size={13} />
                  <Typography variant="caption" color="text.secondary">{hoveredBriefing.source}</Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={1} alignItems="center">
                <IconCalendar size={13} />
                <Typography variant="caption" color="text.secondary">
                  Criado em {formatDate(hoveredBriefing.created_at)}
                  {hoveredBriefing.due_at && ` · Prazo ${formatDate(hoveredBriefing.due_at)}`}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        )}
      </Popover>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleArchive}>
          <ListItemIcon><IconArchive size={16} /></ListItemIcon>
          <ListItemText>Arquivar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon><IconTrash size={16} color="inherit" /></ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ── Nova Reunião Dialog ── */}
      <Dialog
        open={meetDialogOpen}
        onClose={() => { if (!meetLoading) { setMeetDialogOpen(false); setMeetResult(null); } }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconVideo size={20} />
            <span>Nova Reunião Google Meet</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {meetError && (
              <Alert severity="error" sx={{ fontSize: '0.82rem' }}>
                {meetError}
                {meetError.includes('configurado') && (
                  <Box mt={0.5}>
                    <Button size="small" href="/admin/integrations" component="a">
                      Conectar Google Calendar →
                    </Button>
                  </Box>
                )}
              </Alert>
            )}

            {meetResult ? (
              /* ── Success state ── */
              <Stack spacing={2}>
                <Alert severity="success">
                  Reunião criada! O Jarvis entrará automaticamente.
                </Alert>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: '#e3f2fd',
                    border: '1px solid #90caf9',
                    wordBreak: 'break-all',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    Link da reunião:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.dark">
                    {meetResult.url}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<IconVideo size={16} />}
                    href={meetResult.url}
                    target="_blank"
                    component="a"
                  >
                    Entrar na Reunião
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigator.clipboard.writeText(meetResult.url)}
                  >
                    Copiar Link
                  </Button>
                </Stack>
                {meetResult.htmlLink && (
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    <Box
                      component="a"
                      href={meetResult.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: 'inherit' }}
                    >
                      Ver no Google Calendar →
                    </Box>
                  </Typography>
                )}
              </Stack>
            ) : (
              /* ── Form state ── */
              <>
                <TextField
                  label="Título da reunião"
                  value={meetTitle}
                  onChange={(e) => setMeetTitle(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Ex: Alinhamento de Campanha"
                  autoFocus
                />
                <TextField
                  label="Participantes (e-mails, separados por vírgula)"
                  value={meetEmails}
                  onChange={(e) => setMeetEmails(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  placeholder="cliente@email.com, colega@empresa.com"
                  helperText="Os participantes receberão um convite por e-mail automaticamente."
                />
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                      Duração
                    </Typography>
                    <Select
                      size="small"
                      value={meetDuration}
                      onChange={(e) => setMeetDuration(Number(e.target.value))}
                      fullWidth
                      sx={{ fontSize: '0.85rem' }}
                    >
                      {[15, 30, 45, 60, 90, 120].map((m) => (
                        <MenuItem key={m} value={m} sx={{ fontSize: '0.85rem' }}>
                          {m < 60 ? `${m} min` : `${m / 60}h`}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                      Início
                    </Typography>
                    <Select
                      size="small"
                      value={meetStartNow ? 'now' : 'schedule'}
                      onChange={(e) => setMeetStartNow(e.target.value === 'now')}
                      fullWidth
                      sx={{ fontSize: '0.85rem' }}
                    >
                      <MenuItem value="now" sx={{ fontSize: '0.85rem' }}>Agora</MenuItem>
                      <MenuItem value="schedule" sx={{ fontSize: '0.85rem' }}>Agendar</MenuItem>
                    </Select>
                  </Box>
                </Stack>
                {!meetStartNow && (
                  <TextField
                    label="Data e hora"
                    type="datetime-local"
                    size="small"
                    fullWidth
                    value={meetScheduledAt}
                    onChange={(e) => setMeetScheduledAt(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
                <Typography variant="caption" color="text.secondary">
                  O Jarvis (bot de IA) entrará automaticamente na reunião e gerará um resumo com próximas ações.
                  Requer Google Calendar conectado.
                </Typography>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setMeetDialogOpen(false); setMeetResult(null); }} disabled={meetLoading}>
            {meetResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {!meetResult && (
            <Button
              variant="contained"
              onClick={handleCreateMeeting}
              disabled={meetLoading}
              startIcon={meetLoading ? <CircularProgress size={14} color="inherit" /> : <IconVideo size={16} />}
            >
              {meetLoading ? 'Criando…' : 'Criar e Entrar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
