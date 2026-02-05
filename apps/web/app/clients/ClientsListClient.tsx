'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconBriefcase,
  IconCalendar,
  IconMapPin,
  IconPlus,
  IconSearch,
  IconSparkles,
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
  updated_at?: string;
  logo_url?: string;
};

export default function ClientsListClient() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  return (
    <Box sx={{ px: { xs: 3, sm: 'clamp(24px, 4vw, 64px)' }, py: 3.5, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4">Clientes</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestão do portfólio ativo e operação editorial.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => router.push('/clients/new')}>
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
            <Button variant="contained" startIcon={<IconBriefcase size={16} />} onClick={() => router.push('/clients/new')}>
              Criar cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredClients.map((client) => (
            <Grid key={client.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: 'primary.light', boxShadow: 4 },
                }}
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        variant="rounded"
                        src={client.logo_url}
                        sx={{ bgcolor: 'grey.100', width: 48, height: 48, color: 'primary.main' }}
                      >
                        <IconBriefcase size={22} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{client.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {client.segment_primary || 'Sem segmento'}
                        </Typography>
                      </Box>
                    </Stack>
                    {getStatusBadge(client.status)}
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                    <IconMapPin size={14} />
                    <Typography variant="caption">
                      {[client.city, client.uf, client.country].filter(Boolean).join(', ') || 'Brasil'}
                    </Typography>
                  </Stack>

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
                        router.push(`/studio?clientId=${client.id}`);
                      }}
                    >
                      Criar
                    </Button>
                  </Stack>

                  {client.urgent_tasks ? (
                    <Chip size="small" color="warning" label={`${client.urgent_tasks} tarefas urgentes`} />
                  ) : null}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
