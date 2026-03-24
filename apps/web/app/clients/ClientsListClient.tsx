'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { useConfirm } from '@/hooks/useConfirm';
import EdroAvatar from '@/components/shared/EdroAvatar';
import PlatformIcon from '@/components/shared/PlatformIcon';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconArchive,
  IconBrain,
  IconBrandTrello,
  IconBriefcase,
  IconCalendar,
  IconDotsVertical,
  IconEdit,
  IconHeartRateMonitor,
  IconLayoutKanban,
  IconLink,
  IconMapPin,
  IconMessageCircle,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconSortAscending,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';

type Client = {
  id: string;
  name: string;
  segment_primary?: string;
  country?: string;
  uf?: string;
  city?: string;
  status?: string;
  pending_posts?: number;
  approval_rate?: number;
  urgent_tasks?: number;
  intelligence_score?: number;
  health_score?: number | null;
  health_trend?: string | null;
  updated_at?: string;
  logo_url?: string;
  profile?: { brand_colors?: string[]; platforms?: string[] } | null;
  // board fields (null when no board linked)
  board_id?: string | null;
  board_name?: string | null;
  board_card_count?: number | null;
  board_trello_id?: string | null;
};

type UnlinkedBoard = {
  id: string;
  name: string;
  description?: string | null;
  trello_board_id?: string | null;
  last_synced_at?: string | null;
  card_count: number;
};

type SortMode = 'urgency' | 'az' | 'ia';

const BOARD_COLORS = ['#0052cc', '#0079bf', '#61bd4f', '#ff9f1a', '#eb5a46', '#c377e0'];

export default function ClientsListClient() {
  const router = useRouter();
  const confirm = useConfirm();
  const { open: openJarvis } = useJarvis();
  const [clients, setClients] = useState<Client[]>([]);
  const [unlinkedBoards, setUnlinkedBoards] = useState<UnlinkedBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('urgency');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuClient, setMenuClient] = useState<Client | null>(null);
  // Link board dialog
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; boardId: string; boardName: string }>({
    open: false, boardId: '', boardName: '',
  });
  const [linkClientId, setLinkClientId] = useState('');
  const [linking, setLinking] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet<{ clients: Client[]; unlinked_boards: UnlinkedBoard[] }>('/clients/overview');
      setClients(response?.clients || []);
      setUnlinkedBoards(response?.unlinked_boards || []);
    } catch {
      setClients([]);
      setUnlinkedBoards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = clients
    .filter((client) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        client.name?.toLowerCase().includes(q) ||
        client.segment_primary?.toLowerCase().includes(q) ||
        client.city?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortMode === 'urgency') {
        const urgA = (a.urgent_tasks ?? 0) * 10 + (a.pending_posts ?? 0);
        const urgB = (b.urgent_tasks ?? 0) * 10 + (b.pending_posts ?? 0);
        if (urgB !== urgA) return urgB - urgA;
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      }
      if (sortMode === 'ia') {
        return (b.intelligence_score ?? 0) - (a.intelligence_score ?? 0);
      }
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });

  const getStatusBadge = (status?: string) => {
    if (status === 'active') return <Chip size="small" color="success" label="Ativo" />;
    if (status === 'paused') return <Chip size="small" color="warning" label="Pausado" />;
    return <Chip size="small" variant="outlined" label="Rascunho" />;
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuClient(client);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuClient(null);
  };

  const handleArchiveClient = async () => {
    if (!menuClient) return;
    const isArchived = menuClient.status === 'archived';
    const newStatus = isArchived ? 'active' : 'archived';
    handleCloseMenu();
    try {
      await apiPatch(`/clients/${menuClient.id}`, { status: newStatus });
      await loadClients();
    } catch { /* ignore */ }
  };

  const handleDeleteClient = async () => {
    if (!menuClient) return;
    const ok = await confirm(`Excluir o cliente "${menuClient.name}"? Esta ação não pode ser desfeita.`);
    handleCloseMenu();
    if (!ok) return;
    try {
      await apiDelete(`/clients/${menuClient.id}`);
      await loadClients();
    } catch { /* ignore */ }
  };

  const handleLinkBoard = async () => {
    if (!linkClientId || !linkDialog.boardId) return;
    setLinking(true);
    try {
      await apiPatch(`/trello/project-boards/${linkDialog.boardId}`, { client_id: linkClientId });
      setLinkDialog({ open: false, boardId: '', boardName: '' });
      setLinkClientId('');
      await loadClients();
    } catch { /* ignore */ } finally {
      setLinking(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4">Clientes</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestão do portfólio ativo e operação editorial.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => router.push('/clients/novo')}>
          Novo cliente
        </Button>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Nome, segmento ou cidade"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={16} />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />
            <Stack direction="row" spacing={0.75} alignItems="center" flexShrink={0}>
              <IconSortAscending size={16} style={{ opacity: 0.5 }} />
              {([
                { id: 'urgency', label: 'Urgência' },
                { id: 'az',      label: 'A–Z' },
                { id: 'ia',      label: 'IA Score' },
              ] as { id: SortMode; label: string }[]).map(opt => (
                <Chip
                  key={opt.id}
                  label={opt.label}
                  size="small"
                  variant={sortMode === opt.id ? 'filled' : 'outlined'}
                  color={sortMode === opt.id ? 'primary' : 'default'}
                  onClick={() => setSortMode(opt.id)}
                  sx={{ cursor: 'pointer', fontWeight: sortMode === opt.id ? 700 : 400 }}
                />
              ))}
              <Chip size="small" variant="outlined" label={`${filteredClients.length}`} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Skeleton variant="circular" width={44} height={44} />
                      <Stack spacing={0.5}>
                        <Skeleton variant="text" width={120} height={20} />
                        <Skeleton variant="text" width={80} height={14} />
                      </Stack>
                    </Stack>
                    <Skeleton variant="circular" width={28} height={28} />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: '99px' }} />
                    <Skeleton variant="rounded" width={50} height={22} sx={{ borderRadius: '99px' }} />
                  </Stack>
                  <Skeleton variant="rounded" height={6} sx={{ borderRadius: 4 }} />
                  <Stack direction="row" spacing={2}>
                    <Skeleton variant="text" width={60} height={14} />
                    <Skeleton variant="text" width={60} height={14} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filteredClients.length === 0 && unlinkedBoards.length === 0 ? (
        <Card variant="outlined">
          <EmptyState
            icon={<IconBriefcase size={26} />}
            title="Nenhum cliente encontrado"
            description="Comece criando o primeiro cliente da sua operação."
            action={{ label: 'Criar cliente', onClick: () => router.push('/clients/novo'), icon: <IconPlus size={16} /> }}
            iconColor="#E85219"
            iconBg="#fdeee8"
            gradient
          />
        </Card>
      ) : (
        <>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleCloseMenu}
            onClick={(e) => e.stopPropagation()}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { handleCloseMenu(); if (menuClient) router.push(`/clients/${menuClient.id}`); }}>
              <ListItemIcon><IconEdit size={18} /></ListItemIcon>
              <ListItemText>Editar</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleArchiveClient}>
              <ListItemIcon>
                {menuClient?.status === 'archived' ? <IconPlayerPlay size={18} /> : <IconArchive size={18} />}
              </ListItemIcon>
              <ListItemText>{menuClient?.status === 'archived' ? 'Reativar' : 'Arquivar'}</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDeleteClient} sx={{ color: 'error.main' }}>
              <ListItemIcon><IconTrash size={18} color="inherit" /></ListItemIcon>
              <ListItemText>Excluir</ListItemText>
            </MenuItem>
          </Menu>

          {/* ── Clients grid ── */}
          <Grid container spacing={2}>
            {filteredClients.map((client) => {
              const brandColor = client.profile?.brand_colors?.[0];
              return (
                <Grid key={client.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      height: '100%',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      borderLeftWidth: brandColor ? 4 : 1,
                      borderLeftColor: brandColor || undefined,
                      '&:hover': { borderColor: brandColor || 'primary.light', boxShadow: 4 },
                    }}
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                    <Box sx={{ height: 4, bgcolor: brandColor || 'grey.200', borderRadius: '12px 12px 0 0' }} />
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <EdroAvatar
                            src={client.logo_url}
                            alt={client.name}
                            size={48}
                            sx={{ bgcolor: brandColor ? `${brandColor}22` : 'grey.100', color: brandColor || 'primary.main' }}
                          >
                            <IconBriefcase size={20} />
                          </EdroAvatar>
                          <Box>
                            <Typography variant="h6">{client.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {client.segment_primary || 'Sem segmento'}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {getStatusBadge(client.status)}
                          <IconButton size="small" onClick={(e) => handleOpenMenu(e, client)}>
                            <IconDotsVertical size={18} />
                          </IconButton>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                        <IconMapPin size={14} />
                        <Typography variant="caption">
                          {[client.city, client.uf, client.country].filter(Boolean).join(', ') || 'Brasil'}
                        </Typography>
                      </Stack>

                      {client.intelligence_score != null && client.intelligence_score > 0 && (() => {
                        const score = client.intelligence_score!;
                        const colorHex = score >= 85 ? '#16a34a' : score >= 60 ? '#2563eb' : score >= 30 ? '#d97706' : '#dc2626';
                        const colorPath = score >= 85 ? 'success.main' : score >= 60 ? 'info.dark' : score >= 30 ? 'warning.main' : 'error.main';
                        return (
                          <Box>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                              <IconBrain size={13} color={colorHex} />
                              <Typography variant="caption" sx={{ color: colorPath, fontWeight: 600 }}>
                                IA {score}%
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={score}
                              sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover',
                                '& .MuiLinearProgress-bar': { bgcolor: colorPath, borderRadius: 2 } }}
                            />
                          </Box>
                        );
                      })()}

                      {client.health_score != null && (() => {
                        const hs = client.health_score!;
                        const [color, label] = hs >= 70
                          ? ['success' as const, 'Saudável']
                          : hs >= 40
                          ? ['warning' as const, 'Atenção']
                          : ['error' as const, 'Em risco'];
                        const trendArrow = client.health_trend === 'up' ? ' ↑' : client.health_trend === 'down' ? ' ↓' : '';
                        return (
                          <Tooltip title={`Health Score: ${hs}/100${trendArrow}`} arrow>
                            <Chip
                              icon={<IconHeartRateMonitor size={13} />}
                              label={`${label} ${hs}${trendArrow}`}
                              size="small"
                              color={color}
                              variant="outlined"
                              sx={{ fontSize: '0.72rem', cursor: 'default', alignSelf: 'flex-start' }}
                              onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}/financeiro`); }}
                            />
                          </Tooltip>
                        );
                      })()}

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Posts pendentes
                          </Typography>
                          <Typography variant="h6">{client.pending_posts || 0}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Taxa de aprovação
                          </Typography>
                          <Typography variant="h6">
                            {client.approval_rate ? `${client.approval_rate}%` : '--'}
                          </Typography>
                        </Grid>
                      </Grid>

                      {(client.profile?.platforms?.length ?? 0) > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {client.profile!.platforms!.map((p) => (
                            <PlatformIcon key={p} platform={p} size={14} variant="icon" tooltip />
                          ))}
                        </Stack>
                      )}

                      {/* Board Trello vinculado */}
                      {client.board_id && (
                        <Chip
                          icon={<IconBrandTrello size={13} />}
                          label={`${client.board_name} · ${client.board_card_count ?? 0} cards`}
                          size="small"
                          variant="outlined"
                          onClick={(e) => { e.stopPropagation(); router.push(`/projetos/${client.board_id}`); }}
                          sx={{ fontSize: '0.7rem', cursor: 'pointer', alignSelf: 'flex-start',
                            borderColor: '#0079bf', color: '#0079bf',
                            '&:hover': { bgcolor: '#0079bf14' } }}
                        />
                      )}

                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<IconMessageCircle size={14} />}
                          onClick={(e) => { e.stopPropagation(); openJarvis(client.id); }}
                          sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c94215' }, fontSize: '0.72rem', py: 0.5, flex: 1 }}
                        >
                          Jarvis
                        </Button>
                        <Tooltip title="Criar pauta">
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); router.push(`/studio/brief?clientId=${client.id}`); }}
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <IconSparkles size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Calendário">
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}/calendar`); }}
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <IconCalendar size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Planning">
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}/planning`); }}
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <IconBrain size={16} />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      {client.urgent_tasks ? (
                        <Chip
                          size="small"
                          color="warning"
                          label={`${client.urgent_tasks} tarefas urgentes`}
                          onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}/planning`); }}
                          sx={{ cursor: 'pointer' }}
                        />
                      ) : null}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* ── Boards sem cliente ── */}
          {unlinkedBoards.length > 0 && (
            <Box>
              <Divider sx={{ mb: 3 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconLayoutKanban size={18} style={{ opacity: 0.6 }} />
                  <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                    Boards sem cliente vinculado
                  </Typography>
                  <Chip size="small" label={unlinkedBoards.length} variant="outlined" />
                </Stack>
              </Stack>
              <Grid container spacing={2}>
                {unlinkedBoards.map((board, i) => (
                  <Grid key={board.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Box sx={{ height: 4, bgcolor: BOARD_COLORS[i % BOARD_COLORS.length] }} />
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Box sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <IconBrandTrello size={16} color="#0079bf" />
                              <Typography variant="subtitle2" fontWeight={700} noWrap>
                                {board.name}
                              </Typography>
                            </Stack>
                            <Chip label={`${board.card_count} cards`} size="small" sx={{ mt: 0.5 }} />
                          </Box>
                          <Stack direction="row" spacing={0.5} flexShrink={0}>
                            <Tooltip title="Ver kanban">
                              <IconButton size="small" onClick={() => router.push(`/projetos/${board.id}`)}>
                                <IconLayoutKanban size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Vincular a cliente">
                              <IconButton
                                size="small"
                                onClick={() => { setLinkDialog({ open: true, boardId: board.id, boardName: board.name }); setLinkClientId(''); }}
                                sx={{ color: 'primary.main' }}
                              >
                                <IconLink size={16} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      )}

      {/* Dialog: vincular board a cliente */}
      <Dialog open={linkDialog.open} onClose={() => setLinkDialog({ open: false, boardId: '', boardName: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>Vincular board ao cliente</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Board: <strong>{linkDialog.boardName}</strong>
          </Typography>
          <Autocomplete
            options={clients.filter(c => !c.board_id)}
            getOptionLabel={(c) => c.name}
            onChange={(_, val) => setLinkClientId(val?.id ?? '')}
            renderInput={(params) => (
              <TextField {...params} label="Selecionar cliente" size="small" />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialog({ open: false, boardId: '', boardName: '' })}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!linkClientId || linking}
            onClick={handleLinkBoard}
            startIcon={linking ? <CircularProgress size={14} /> : undefined}
          >
            Vincular
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
