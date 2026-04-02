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
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconCurrencyDollar,
  IconExternalLink,
  IconLabel,
  IconRefresh,
  IconTarget,
  IconX,
} from '@tabler/icons-react';
import { getLabelPreset, LABEL_PRESETS } from '@/app/edro/BriefingCardDrawer';

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
  labels?: string[];
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
  const [drawerCampaign, setDrawerCampaign] = useState<CampaignRow | null>(null);
  const [labelAnchor, setLabelAnchor] = useState<HTMLElement | null>(null);

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
  const totalBudget = useMemo(
    () => campaigns.reduce((sum, campaign) => sum + (Number(campaign.budget_brl) || 0), 0),
    [campaigns],
  );

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
      <Stack spacing={2.5}>
        {error && (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: '14px !important' }}>
              <Typography color="error">{error}</Typography>
            </CardContent>
          </Card>
        )}

        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          justifyContent="space-between"
          alignItems={{ lg: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
              Pipeline de Campanhas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalCampaigns} campanhas no quadro
              {selectedClient?.name ? ` · ${selectedClient.name}` : ''}
              {formatCurrency(totalBudget) ? ` · ${formatCurrency(totalBudget)}` : ''}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
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
                sx={{ minWidth: 220 }}
              >
                {clients.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
            )}
            <Button
              variant="contained"
              size="small"
              startIcon={refreshing ? <CircularProgress size={14} color="inherit" /> : <IconRefresh size={16} />}
              onClick={() => loadCampaigns(true)}
              disabled={refreshing}
            >
              Atualizar
            </Button>
            {selectedClient ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<IconExternalLink size={16} />}
                onClick={() => router.push(`/clients/${selectedClient.id}`)}
              >
                Ver cliente
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Box
          sx={(theme) => ({
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.03) : '#f6f8fc',
            p: 1.5,
          })}
        >
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, alignItems: 'flex-start' }}>
            {grouped.map((column) => {
              const cfg = getStatusCfg(column.status);
              return (
                <Box
                  key={column.status}
                  sx={(theme) => ({
                    width: 312,
                    minWidth: 312,
                    flexShrink: 0,
                    borderRadius: 2.5,
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.04) : '#eaf0f7',
                    p: 1,
                  })}
                >
                  <Stack spacing={1.1}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ px: 0.75, py: 0.5 }}
                    >
                      <Stack direction="row" spacing={0.9} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                          {cfg.label}
                        </Typography>
                      </Stack>
                      <Chip
                        size="small"
                        label={column.items.length}
                        sx={{
                          height: 22,
                          fontSize: '0.68rem',
                          bgcolor: alpha(cfg.color, 0.12),
                          color: cfg.color,
                          fontWeight: 700,
                        }}
                      />
                    </Stack>

                    {column.items.length ? (
                      column.items.map((campaign) => (
                        <Card
                          key={campaign.id}
                          variant="outlined"
                          sx={(theme) => ({
                            cursor: 'pointer',
                            borderRadius: 2.5,
                            borderColor: alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.08 : 0.08),
                            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.94) : '#fff',
                            boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.18 : 0.04)}`,
                            opacity: movingId === campaign.id ? 0.5 : 1,
                            transition: 'all 140ms ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: `0 10px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.26 : 0.08)}`,
                            },
                          })}
                          onClick={() => setDrawerCampaign(campaign)}
                        >
                          <CardContent sx={{ p: '14px !important' }}>
                            <Stack spacing={1.2}>
                              {(campaign.labels ?? []).length > 0 && (
                                <Stack direction="row" spacing={0.4} flexWrap="wrap">
                                  {(campaign.labels ?? []).slice(0, 3).map((key) => {
                                    const preset = getLabelPreset(key);
                                    if (!preset) return null;
                                    return (
                                      <Tooltip key={key} title={preset.label}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: preset.color }} />
                                      </Tooltip>
                                    );
                                  })}
                                </Stack>
                              )}

                              <Typography
                                variant="body1"
                                fontWeight={700}
                                sx={{
                                  lineHeight: 1.35,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  minHeight: '2.7em',
                                }}
                              >
                                {campaign.name}
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  minHeight: '2.5em',
                                }}
                              >
                                {campaign.objective || 'Sem objetivo informado'}
                              </Typography>

                              <Stack direction="row" spacing={0.7} alignItems="center" flexWrap="wrap" useFlexGap>
                                {(campaign.start_date || campaign.end_date) ? (
                                  <Chip
                                    size="small"
                                    icon={<IconCalendar size={11} />}
                                    label={`${formatDate(campaign.start_date) || '?'} → ${formatDate(campaign.end_date) || '?'}`}
                                    sx={{
                                      height: 24,
                                      fontSize: '0.64rem',
                                      '& .MuiChip-label': { px: 0.75 },
                                      '& .MuiChip-icon': { ml: 0.45, mr: -0.1 },
                                    }}
                                  />
                                ) : null}
                                {campaign.budget_brl ? (
                                  <Chip
                                    size="small"
                                    icon={<IconCurrencyDollar size={11} />}
                                    label={formatCurrency(campaign.budget_brl)}
                                    sx={{
                                      height: 24,
                                      fontSize: '0.64rem',
                                      '& .MuiChip-label': { px: 0.75 },
                                      '& .MuiChip-icon': { ml: 0.45, mr: -0.1 },
                                    }}
                                  />
                                ) : null}
                              </Stack>

                              {(() => {
                                const currentIdx = STATUS_ORDER.indexOf(column.status);
                                const nextStatus =
                                  currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1
                                    ? STATUS_ORDER[currentIdx + 1]
                                    : null;
                                if (!nextStatus) return null;
                                const nextCfg = getStatusCfg(nextStatus);
                                return (
                                  <Button
                                    variant="text"
                                    size="small"
                                    endIcon={<IconArrowRight size={14} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (movingId !== campaign.id) moveStatus(campaign, nextStatus);
                                    }}
                                    sx={{
                                      alignSelf: 'flex-start',
                                      px: 0,
                                      minWidth: 0,
                                      fontWeight: 700,
                                      color: nextCfg.color,
                                      '&:hover': { bgcolor: 'transparent', opacity: 0.85 },
                                    }}
                                  >
                                    Mover para {nextCfg.label}
                                  </Button>
                                );
                              })()}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Box
                        sx={{
                          border: `2px dashed ${cfg.color}24`,
                          borderRadius: 2,
                          p: 3,
                          textAlign: 'center',
                          bgcolor: '#fff',
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
        </Box>
      </Stack>

      {/* Campaign drawer */}
      <Drawer
        anchor="right"
        open={Boolean(drawerCampaign)}
        onClose={() => setDrawerCampaign(null)}
        PaperProps={{
          sx: (theme) => ({
            width: { xs: '100vw', sm: 460 },
            p: 3,
            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.96) : alpha(theme.palette.background.default, 0.98),
          }),
        }}
      >
        {drawerCampaign && (
          <Stack spacing={2.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    Campaign Detail
                  </Typography>
                  <Chip
                    size="small"
                    label={getStatusCfg(drawerCampaign.status ?? 'draft').label}
                    sx={{
                      bgcolor: getStatusCfg(drawerCampaign.status ?? 'draft').bg,
                      color: getStatusCfg(drawerCampaign.status ?? 'draft').color,
                      fontWeight: 700,
                    }}
                  />
                </Stack>
                <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2, mb: 0.5 }}>
                  {drawerCampaign.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {drawerCampaign.objective || 'Acompanhe a campanha, leia a janela e decida o próximo movimento sem sair do quadro.'}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setDrawerCampaign(null)}>
                <IconX size={16} />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {selectedClient ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<IconExternalLink size={16} />}
                  onClick={() => router.push(`/clients/${selectedClient.id}`)}
                >
                  Abrir cliente
                </Button>
              ) : null}
              <Button
                variant="contained"
                size="small"
                startIcon={<IconExternalLink size={16} />}
                onClick={() => router.push(`/clients/${selectedClient?.id || ''}?campaign=${drawerCampaign.id}`)}
              >
                Abrir studio
              </Button>
            </Stack>

            <Box
              sx={(theme) => ({
                p: 2,
                borderRadius: 2.5,
                border: `1px solid ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.08 : 0.08)}`,
                bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.9) : '#fff',
              })}
            >
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '0.08em' }}>
                Overview
              </Typography>
              <Box
                sx={{
                  mt: 1.25,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 1.25,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>
                    Janela
                  </Typography>
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <IconCalendar size={14} color="#94a3b8" />
                    <Typography variant="body2" fontWeight={700}>
                      {(drawerCampaign.start_date || drawerCampaign.end_date)
                        ? `${formatDate(drawerCampaign.start_date) || '?'} → ${formatDate(drawerCampaign.end_date) || '?'}`
                        : 'Sem janela'}
                    </Typography>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>
                    Budget
                  </Typography>
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <IconCurrencyDollar size={14} color="#94a3b8" />
                    <Typography variant="body2" fontWeight={700}>
                      {formatCurrency(drawerCampaign.budget_brl) || 'Não informado'}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            </Box>

            <Box
              sx={(theme) => ({
                p: 2,
                borderRadius: 2.5,
                border: `1px solid ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.08 : 0.08)}`,
                bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.9) : '#fff',
              })}
            >
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '0.08em' }}>
                Actions
              </Typography>
              <Box
                sx={{
                  mt: 1.25,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1.25,
                }}
              >
                <Box
                  sx={(theme) => ({
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  })}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Próximo movimento
                  </Typography>
                  {(() => {
                    const currentIdx = STATUS_ORDER.indexOf(drawerCampaign.status ?? '');
                    const nextStatus = currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;
                    if (!nextStatus) {
                      return <Typography variant="body2" fontWeight={700}>Campanha já está no estágio final.</Typography>;
                    }
                    const nextCfg = getStatusCfg(nextStatus);
                    return (
                      <Stack spacing={1}>
                        <Typography variant="body2" fontWeight={700}>
                          Mover para {nextCfg.label}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={movingId === drawerCampaign.id}
                          onClick={() => { moveStatus(drawerCampaign, nextStatus); setDrawerCampaign(null); }}
                          sx={{
                            alignSelf: 'flex-start',
                            color: nextCfg.color,
                            borderColor: alpha(nextCfg.color, 0.55),
                            '&:hover': { bgcolor: alpha(nextCfg.color, 0.12) },
                          }}
                        >
                          Executar agora
                        </Button>
                      </Stack>
                    );
                  })()}
                </Box>

                <Box
                  sx={(theme) => ({
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.08 : 0.08)}`,
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.common.black, 0.015),
                  })}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Contexto
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {(drawerCampaign.labels ?? []).length > 0
                      ? `${(drawerCampaign.labels ?? []).length} label(s) ativas`
                      : 'Sem labels ainda'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Use as labels para marcar objetivo, canal e nuances da campanha.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box
              sx={(theme) => ({
                p: 2,
                borderRadius: 2.5,
                border: `1px solid ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.08 : 0.08)}`,
                bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.9) : '#fff',
              })}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '0.08em' }}>
                  Labels
                </Typography>
                <Tooltip title="Adicionar label">
                  <IconButton size="small" onClick={(e) => setLabelAnchor(e.currentTarget)}>
                    <IconLabel size={14} />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={0.6} alignItems="center">
                {(drawerCampaign.labels ?? []).length ? (
                  (drawerCampaign.labels ?? []).map((key) => {
                    const preset = getLabelPreset(key);
                    if (!preset) return null;
                    return (
                      <Chip
                        key={key}
                        label={preset.label}
                        size="small"
                        onDelete={async () => {
                          const next = (drawerCampaign.labels ?? []).filter((k) => k !== key);
                          const updated = { ...drawerCampaign, labels: next };
                          setDrawerCampaign(updated);
                          setCampaigns((prev) => prev.map((c) => c.id === drawerCampaign.id ? updated : c));
                          await apiPatch(`/campaigns/${drawerCampaign.id}`, { labels: next });
                        }}
                        sx={{
                          bgcolor: preset.color + '22',
                          color: preset.color,
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          borderLeft: `3px solid ${preset.color}`,
                          borderRadius: 1.25,
                        }}
                      />
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma label aplicada ainda.
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        )}
      </Drawer>

      {/* Label popover for campaigns drawer */}
      <Popover
        open={Boolean(labelAnchor)}
        anchorEl={labelAnchor}
        onClose={() => setLabelAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, minWidth: 180 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" mb={1} display="block">Labels</Typography>
          <Stack spacing={0.5}>
            {LABEL_PRESETS.map((preset) => {
              const active = (drawerCampaign?.labels ?? []).includes(preset.key);
              return (
                <Stack
                  key={preset.key}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  onClick={async () => {
                    if (!drawerCampaign) return;
                    const next = active
                      ? (drawerCampaign.labels ?? []).filter((k) => k !== preset.key)
                      : [...(drawerCampaign.labels ?? []), preset.key];
                    const updated = { ...drawerCampaign, labels: next };
                    setDrawerCampaign(updated);
                    setCampaigns((prev) => prev.map((c) => c.id === drawerCampaign.id ? updated : c));
                    await apiPatch(`/campaigns/${drawerCampaign.id}`, { labels: next });
                  }}
                  sx={{ cursor: 'pointer', borderRadius: 1, px: 1, py: 0.5, bgcolor: active ? preset.color + '22' : 'transparent', '&:hover': { bgcolor: preset.color + '11' } }}
                >
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: preset.color, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{preset.label}</Typography>
                  {active && <IconCheck size={14} color={preset.color} />}
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Popover>
    </AppShell>
  );
}
