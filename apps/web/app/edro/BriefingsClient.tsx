'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiDelete, apiPatch, apiPost } from '@/lib/api';
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
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import StatusChip from '@/components/shared/StatusChip';
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
} from '@tabler/icons-react';

type Briefing = {
  id: string;
  client_name: string | null;
  title: string;
  status: string;
  created_at: string;
  due_at: string | null;
  traffic_owner: string | null;
  source: string | null;
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
  bottlenecks: { stage: string; count: number }[];
};

type EdroClient = {
  id: string;
  name: string;
};

const PAGE_SIZE = 30;

export default function BriefingsClient() {
  const router = useRouter();
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

  const loadBriefings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (search) params.set('search', search);
      if (clientFilter) params.set('clientId', clientFilter);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));

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
  }, [filterStatus, search, clientFilter, page]);

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

  const handleBriefingClick = (id: string) => {
    router.push(`/edro/${id}`);
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
      alert(err?.message || 'Erro ao exportar relatório.');
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
      alert(err?.message || 'Erro ao arquivar briefing.');
    }
  };

  const handleDelete = async () => {
    if (!menuBriefingId) return;
    const id = menuBriefingId;
    handleMenuClose();
    if (!window.confirm('Excluir este briefing permanentemente? Todas as copies e tarefas associadas serão removidas.')) return;
    try {
      await apiDelete(`/edro/briefings/${id}`);
      setBriefings((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir briefing.');
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
      alert(err?.message || 'Erro ao arquivar briefings.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Excluir ${selectedIds.size} briefing(s) permanentemente? Todas as copies e tarefas associadas serão removidas.`)) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => apiDelete(`/edro/briefings/${id}`)));
      setBriefings((prev) => prev.filter((b) => !ids.includes(b.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir briefings.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkAdvance = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Avançar ${selectedIds.size} briefing(s) para a próxima etapa?`)) return;
    setBulkLoading(true);
    try {
      await apiPost('/edro/briefings/bulk/advance', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      await loadBriefings();
    } catch (err: any) {
      alert(err?.message || 'Erro ao avançar briefings.');
    } finally {
      setBulkLoading(false);
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
            startIcon={<IconDownload size={16} />}
            onClick={() => handleExport('csv')}
          >
            Exportar CSV
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
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={clientFilter}
                label="Cliente"
                onChange={(e) => { setClientFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">Todos</MenuItem>
                {clients.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {total} resultado{total !== 1 ? 's' : ''}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant={filterStatus === '' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => { setFilterStatus(''); setPage(0); }}
          >
            Todos
          </Button>
          {Object.keys(STATUS_LABELS).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'contained' : 'outlined'}
              size="small"
              onClick={() => { setFilterStatus(status); setPage(0); }}
            >
              {STATUS_LABELS[status]}
            </Button>
          ))}
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

        {briefings.length === 0 && !loading ? (
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
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
                                  <IconBuilding size={14} />
                                  <Typography variant="body2" color="text.secondary">
                                    {briefing.client_name}
                                  </Typography>
                                </Stack>
                              )}
                              {briefing.traffic_owner && (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <IconUser size={14} />
                                  <Typography variant="body2" color="text.secondary">
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

        {totalPages > 1 && (
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
    </AppShell>
  );
}
