'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { useConfirm } from '@/hooks/useConfirm';
import EdroAvatar from '@/components/shared/EdroAvatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconArchive,
  IconBrain,
  IconBriefcase,
  IconCalendar,
  IconDotsVertical,
  IconEdit,
  IconMapPin,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';

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
  updated_at?: string;
  logo_url?: string;
  profile?: { brand_colors?: string[] } | null;
};

export default function ClientsListClient() {
  const router = useRouter();
  const confirm = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuClient, setMenuClient] = useState<Client | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet<Client[]>('/clients');
      setClients(response || []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = clients.filter((client) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.segment_primary?.toLowerCase().includes(query) ||
      client.city?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status?: string) => {
    if (status === 'active') {
      return <Chip size="small" color="success" label="Ativo" />;
    }
    if (status === 'paused') {
      return <Chip size="small" color="warning" label="Pausado" />;
    }
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
    const ok = await confirm(`Excluir o cliente "${menuClient.name}"? Esta acao nao pode ser desfeita.`);
    handleCloseMenu();
    if (!ok) return;
    try {
      await apiDelete(`/clients/${menuClient.id}`);
      await loadClients();
    } catch { /* ignore */ }
  };

  return (
    <Box sx={{ px: { xs: 3, sm: 'clamp(24px, 4vw, 64px)' }, py: 3.5, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
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
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Chip size="small" label="Busca rápida" />
            <Chip size="small" variant="outlined" label={`${filteredClients.length} clientes`} />
          </Stack>
          <TextField
            fullWidth
            placeholder="Nome, segmento ou cidade"
            label="Buscar cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 520 }}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Carregando clientes...
          </Typography>
        </Stack>
      ) : filteredClients.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" gutterBottom>
              Nenhum cliente encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Comece criando o primeiro cliente da sua operação.
            </Typography>
            <Button variant="contained" startIcon={<IconBriefcase size={16} />} onClick={() => router.push('/clients/novo')}>
              Criar cliente
            </Button>
          </CardContent>
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

        <Grid container spacing={2}>
          {filteredClients.map((client) => (
            <Grid key={client.id} size={{ xs: 12, md: 6, lg: 4 }}>
              {(() => {
                const brandColor = client.profile?.brand_colors?.[0];
                return (
              <Card
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  transition: 'all 0.2s ease',
                  borderLeftWidth: brandColor ? 4 : 1,
                  borderLeftColor: brandColor || undefined,
                  '&:hover': { borderColor: brandColor || 'primary.light', boxShadow: 4 },
                }}
                onClick={() => router.push(`/clients/${client.id}`)}
              >
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

                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<IconCalendar size={16} />}
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/clients/${client.id}/calendar`);
                      }}
                    >
                      Calendário
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<IconSparkles size={16} />}
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/studio/brief?clientId=${client.id}`);
                      }}
                    >
                      Criar
                    </Button>
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
                );
              })()}
            </Grid>
          ))}
        </Grid>
        </>
      )}
    </Box>
  );
}
