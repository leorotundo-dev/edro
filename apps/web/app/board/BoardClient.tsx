'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPatch } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconCalendar,
  IconCurrencyDollar,
  IconExternalLink,
  IconRefresh,
  IconTarget,
} from '@tabler/icons-react';

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

const STATUS_ORDER = ['draft', 'active', 'paused', 'completed', 'archived'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; chipColor: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'secondary' }> = {
  draft:     { label: 'Rascunho',  color: '#64748b', bg: '#f8fafc', chipColor: 'default' },
  active:    { label: 'Ativo',     color: '#16a34a', bg: '#f0fdf4', chipColor: 'success' },
  paused:    { label: 'Pausado',   color: '#d97706', bg: '#fffbeb', chipColor: 'warning' },
  completed: { label: 'Concluído', color: '#2563eb', bg: '#eff6ff', chipColor: 'primary' },
  archived:  { label: 'Arquivado', color: '#94a3b8', bg: '#f1f5f9', chipColor: 'default' },
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, color: '#64748b', bg: '#f8fafc', chipColor: 'default' as const };
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatCurrency(value?: number | null) {
  if (!Number.isFinite(value)) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(value));
}

export default function BoardClient({ clientId }: { clientId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedClientId = clientId || searchParams.get('clientId') || '';
  const isLocked = Boolean(lockedClientId);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClientRow[]>('/clients');
      setClients(response || []);
      if (response?.length) {
        const match = lockedClientId ? response.find((c) => c.id === lockedClientId) : response[0];
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
    try {
      const response = await apiGet<ClientRow>(`/clients/${id}`);
      if (response?.id) { setSelectedClient(response); setClients([response]); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadCampaigns = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (selectedClient?.id) qs.set('client_id', selectedClient.id);
      const response = await apiGet<{ success: boolean; data: CampaignRow[] }>(`/campaigns?${qs.toString()}`);
      setCampaigns(response?.data || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar campanhas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    if (isLocked && lockedClientId) loadClientDetail(lockedClientId);
    else loadClients();
  }, [isLocked, lockedClientId, loadClientDetail, loadClients]);

  useEffect(() => {
    if (!selectedClient) return;
    loadCampaigns();
  }, [selectedClient, loadCampaigns]);

  const moveStatus = async (campaign: CampaignRow, newStatus: string) => {
    setMovingId(campaign.id);
    try {
      await apiPatch(`/campaigns/${campaign.id}`, { status: newStatus });
      setCampaigns((prev) => prev.map((c) => c.id === campaign.id ? { ...c, status: newStatus } : c));
    } catch { /* ignore */ } finally { setMovingId(null); }
  };

  // Only show columns that have items OR are 'active'
  const grouped = useMemo(() => {
    const map = new Map<string, CampaignRow[]>();
    campaigns.forEach((c) => {
      const key = (c.status || 'draft').toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    const keys = Array.from(new Set([...STATUS_ORDER, ...Array.from(map.keys())]));
    return keys
      .map((status) => ({ status, items: map.get(status) || [] }))
      .filter((col) => col.items.length > 0 || col.status === 'active' || col.status === 'draft');
  }, [campaigns]);

  const totalCampaigns = campaigns.length;

  if (loading && clients.length === 0) {
    return (
      <AppShell title="Kanban">
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Skeleton variant="text" width={200} height={32} />
            <Skeleton variant="text" width={280} height={18} />
          </Stack>
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
            {Array.from({ length: 4 }).map((_, col) => (
              <Box key={col} sx={{ minWidth: 280, flexShrink: 0 }}>
                <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2 }} />
              </Box>
            ))}
          </Box>
        </Stack>
      </AppShell>
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
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h4">Pipeline de Campanhas</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedClient?.name ? `${selectedClient.name} · ` : ''}{totalCampaigns} campanha{totalCampaigns !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {!isLocked && clients.length > 1 && (
              <TextField
                select
                value={selectedClient?.id || ''}
                onChange={(e) => {
                  const match = clients.find((c) => c.id === e.target.value) || null;
                  setSelectedClient(match);
                  if (match) router.replace(`/board?clientId=${match.id}`);
                }}
                size="small"
                sx={{ minWidth: 200 }}
              >
                {clients.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={refreshing ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={16} />}
              onClick={() => loadCampaigns(true)}
              disabled={refreshing}
            >
              Atualizar
            </Button>
            {selectedClient && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<IconExternalLink size={16} />}
                onClick={() => router.push(`/clients/${selectedClient.id}`)}
              >
                Ver cliente
              </Button>
            )}
          </Stack>
        </Stack>

        {error && (
          <Card variant="outlined">
            <CardContent><Typography color="error">{error}</Typography></CardContent>
          </Card>
        )}

        {/* Kanban columns */}
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
          {grouped.map((column) => {
            const cfg = getStatusCfg(column.status);
            return (
              <Box key={column.status} sx={{ minWidth: 290, maxWidth: 320, flexShrink: 0 }}>
                {/* Column header */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    px: 1.5,
                    py: 1,
                    mb: 1.5,
                    borderRadius: 1.5,
                    bgcolor: cfg.bg,
                    border: `1px solid ${cfg.color}22`,
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: cfg.color }}>
                      {cfg.label}
                    </Typography>
                  </Stack>
                  <Chip
                    size="small"
                    label={column.items.length}
                    sx={{ height: 20, fontSize: '0.65rem', bgcolor: `${cfg.color}18`, color: cfg.color, fontWeight: 700 }}
                  />
                </Stack>

                {/* Cards */}
                <Stack spacing={1.5}>
                  {column.items.length ? (
                    column.items.map((campaign) => (
                      <Card
                        key={campaign.id}
                        variant="outlined"
                        sx={{
                          cursor: 'pointer',
                          transition: 'box-shadow 0.15s',
                          '&:hover': { boxShadow: 3 },
                          borderLeft: `3px solid ${cfg.color}`,
                          opacity: movingId === campaign.id ? 0.5 : 1,
                        }}
                        onClick={() => router.push(`/clients/${selectedClient?.id || ''}?campaign=${campaign.id}`)}
                      >
                        <CardContent sx={{ p: '12px !important' }}>
                          <Stack spacing={1}>
                            {/* Name */}
                            <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                              {campaign.name}
                            </Typography>

                            {/* Objective chip */}
                            {campaign.objective && (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <IconTarget size={12} color="#94a3b8" />
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {campaign.objective}
                                </Typography>
                              </Stack>
                            )}

                            <Divider />

                            {/* Dates + Budget */}
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              {(campaign.start_date || campaign.end_date) ? (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <IconCalendar size={12} color="#94a3b8" />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(campaign.start_date) || '?'} → {formatDate(campaign.end_date) || '?'}
                                  </Typography>
                                </Stack>
                              ) : <Box />}
                              {campaign.budget_brl ? (
                                <Stack direction="row" spacing={0.25} alignItems="center">
                                  <IconCurrencyDollar size={12} color="#94a3b8" />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatCurrency(campaign.budget_brl)}
                                  </Typography>
                                </Stack>
                              ) : null}
                            </Stack>

                            {/* Move to next status */}
                            {(() => {
                              const currentIdx = STATUS_ORDER.indexOf(column.status);
                              const nextStatus = currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1
                                ? STATUS_ORDER[currentIdx + 1] : null;
                              if (!nextStatus) return null;
                              const nextCfg = getStatusCfg(nextStatus);
                              return (
                                <Tooltip title={`Mover para ${nextCfg.label}`}>
                                  <Button
                                    size="small"
                                    variant="text"
                                    fullWidth
                                    disabled={movingId === campaign.id}
                                    onClick={(e) => { e.stopPropagation(); moveStatus(campaign, nextStatus); }}
                                    sx={{
                                      fontSize: '0.68rem',
                                      textTransform: 'none',
                                      color: nextCfg.color,
                                      py: 0.25,
                                      '&:hover': { bgcolor: `${nextCfg.color}12` },
                                    }}
                                  >
                                    → Mover para {nextCfg.label}
                                  </Button>
                                </Tooltip>
                              );
                            })()}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Box
                      sx={{
                        border: `2px dashed ${cfg.color}30`,
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.disabled">
                        Sem campanhas
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Stack>
    </AppShell>
  );
}
