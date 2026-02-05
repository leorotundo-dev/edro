'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconRefresh } from '@tabler/icons-react';

type ClientRow = {
  id: string;
  name: string;
};

type CampaignRow = {
  id: string;
  name: string;
  objective: string;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget_brl?: number | null;
  created_at?: string | null;
};

type BoardClientProps = {
  clientId?: string;
};

const STATUS_ORDER = ['draft', 'active', 'paused', 'completed', 'archived'];
const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  archived: 'Arquivado',
};

function formatStatusLabel(status: string) {
  if (!status) return 'Sem status';
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value?: number | null) {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

export default function BoardClient({ clientId }: BoardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedClientId = clientId || searchParams.get('clientId') || '';
  const isLocked = Boolean(lockedClientId);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClientRow[]>('/clients');
      setClients(response || []);
      if (response?.length) {
        const desired = lockedClientId;
        const match = desired ? response.find((client) => client.id === desired) : response[0];
        setSelectedClient(match || response[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, [lockedClientId]);

  const loadClientDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClientRow>(`/clients/${id}`);
      if (response?.id) {
        setSelectedClient(response);
        setClients([response]);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar cliente.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (selectedClient?.id) qs.set('client_id', selectedClient.id);
      const response = await apiGet<{ success: boolean; data: CampaignRow[] }>(
        `/campaigns?${qs.toString()}`
      );
      setCampaigns(response?.data || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar campanhas.');
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    if (isLocked && lockedClientId) {
      loadClientDetail(lockedClientId);
    } else {
      loadClients();
    }
  }, [isLocked, lockedClientId, loadClientDetail, loadClients]);

  useEffect(() => {
    if (!selectedClient) return;
    loadCampaigns();
  }, [selectedClient, loadCampaigns]);

  const grouped = useMemo(() => {
    const map = new Map<string, CampaignRow[]>();
    campaigns.forEach((campaign) => {
      const key = (campaign.status || 'active').toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(campaign);
    });

    const orderedKeys = Array.from(new Set([...STATUS_ORDER, ...Array.from(map.keys())]));
    return orderedKeys.map((status) => ({
      status,
      items: map.get(status) || [],
    }));
  }, [campaigns]);

  if (loading && clients.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando Kanban...
        </Typography>
      </Stack>
    );
  }

  return (
    <AppShell
      title="Kanban"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Studio</Typography>
          <Typography variant="body2" color="text.secondary">/</Typography>
          <Typography variant="body2" fontWeight={600}>Pipeline de Campanhas</Typography>
        </Stack>
      }
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4">Pipeline de Campanhas</Typography>
          <Typography variant="body2" color="text.secondary">
            Acompanhe o andamento das campanhas por status.
          </Typography>
        </Box>

        {error ? (
          <Card variant="outlined">
            <CardContent>
              <Typography color="error">{error}</Typography>
            </CardContent>
          </Card>
        ) : null}

        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="overline" color="text.secondary">Cliente</Typography>
                <Typography variant="subtitle1">{selectedClient?.name || 'Global'}</Typography>
                <Typography variant="caption" color="text.secondary">Kanban por status</Typography>
              </Box>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                <TextField
                  select
                  value={selectedClient?.id || ''}
                  onChange={(event) => {
                    const match = clients.find((client) => client.id === event.target.value) || null;
                    setSelectedClient(match);
                    if (match) router.replace(`/board?clientId=${match.id}`);
                  }}
                  disabled={isLocked}
                  size="small"
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Button variant="outlined" startIcon={<IconRefresh size={16} />} onClick={loadCampaigns}>
                  Atualizar
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {grouped.map((column) => (
            <Card key={column.status} variant="outlined" sx={{ minWidth: 280, flexShrink: 0 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">{formatStatusLabel(column.status)}</Typography>
                  <Chip size="small" label={column.items.length} />
                </Stack>
                <Stack spacing={1}>
                  {column.items.length ? (
                    column.items.map((campaign) => (
                      <Card key={campaign.id} variant="outlined" sx={{ p: 1 }}>
                        <CardContent>
                          <Chip size="small" label={campaign.objective} sx={{ mb: 1 }} />
                          <Button
                            variant="text"
                            onClick={() => router.push(`/clients?clientId=${selectedClient?.id || ''}`)}
                            sx={{ textAlign: 'left', p: 0, textTransform: 'none' }}
                          >
                            <Typography variant="subtitle2">{campaign.name}</Typography>
                          </Button>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                          </Typography>
                          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {campaign.id.slice(0, 6)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatCurrency(campaign.budget_brl)}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sem campanhas
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>
    </AppShell>
  );
}
