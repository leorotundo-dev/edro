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
  const activeCount = grouped.find((column) => column.status === 'active')?.items.length ?? 0;
  const draftCount = grouped.find((column) => column.status === 'draft')?.items.length ?? 0;
  const pausedCount = grouped.find((column) => column.status === 'paused')?.items.length ?? 0;
  const completedCount = grouped.find((column) => column.status === 'completed')?.items.length ?? 0;
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
      <Stack spacing={3}>
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            background:
              'linear-gradient(135deg, rgba(93,135,255,0.10) 0%, rgba(93,135,255,0.03) 55%, rgba(15,23,42,0.02) 100%)',
          }}
        >
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label="Kanban" color="primary" size="small" sx={{ fontWeight: 700 }} />
                <Chip label={`${totalCampaigns} campanhas`} size="small" variant="outlined" />
                {selectedClient?.name ? (
                  <Chip label={selectedClient.name} size="small" variant="outlined" />
                ) : null}
              </Stack>

              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
                  Pipeline de Campanhas
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  O quadro visual das campanhas para mover estágio, entender o volume e abrir a
                  campanha certa sem ruído.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          {[
            { label: 'Ativas', value: activeCount, helper: 'rodando agora', color: '#16a34a' },
            { label: 'Rascunho', value: draftCount, helper: 'ainda montando', color: '#64748b' },
            { label: 'Pausadas', value: pausedCount, helper: 'fora de jogo', color: '#d97706' },
            { label: 'Concluídas', value: completedCount, helper: 'fechadas', color: '#2563eb' },
            { label: 'Budget total', value: formatCurrency(totalBudget) || '—', helper: 'volume planejado', color: '#5D87FF' },
          ].map((item) => (
            <Card key={item.label} variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: '18px !important' }}>
                <Stack spacing={1.25}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {item.label}
                    </Typography>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: item.color,
                        boxShadow: `0 0 0 6px ${alpha(item.color, 0.12)}`,
                      }}
                    />
                  </Stack>
                  <Typography variant="h4" fontWeight={800}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.helper}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Quadro de fluxo</Typography>
            <Typography variant="body2" color="text.secondary">
              Veja o andamento por estágio e mova cada campanha sem sair do quadro.
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
                        sx={(theme) => ({
                          cursor: 'pointer',
                          borderLeft: `3px solid ${cfg.color}`,
                          borderRadius: 2.25,
                          borderColor: alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.08 : 0.08),
                          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.92) : '#fff',
                          boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.05)}`,
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
                          <Stack spacing={1.1}>
                            {/* Label dots */}
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
                            {/* Name */}
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                fontSize: '0.97rem',
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

                            {/* Objective chip */}
                            {campaign.objective && (
                              <Chip
                                size="small"
                                icon={<IconTarget size={11} />}
                                label={campaign.objective}
                                sx={{
                                  alignSelf: 'flex-start',
                                  maxWidth: '100%',
                                  height: 24,
                                  fontSize: '0.64rem',
                                  fontWeight: 800,
                                  bgcolor: alpha(cfg.color, 0.1),
                                  color: cfg.color,
                                  border: `1px solid ${alpha(cfg.color, 0.2)}`,
                                  '& .MuiChip-label': {
                                    px: 0.75,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  },
                                  '& .MuiChip-icon': { color: 'inherit', ml: 0.45, mr: -0.1 },
                                }}
                              />
                            )}

                            <Divider />

                            {/* Dates + Budget */}
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

                            {/* Move to next status */}
                            {(() => {
                              const currentIdx = STATUS_ORDER.indexOf(column.status);
                              const nextStatus = currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1
                                ? STATUS_ORDER[currentIdx + 1] : null;
                              if (!nextStatus) return null;
                              const nextCfg = getStatusCfg(nextStatus);
                              return (
                                <Tooltip title={`Mover para ${nextCfg.label}`}>
                                  <Box
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (movingId !== campaign.id) moveStatus(campaign, nextStatus);
                                    }}
                                    sx={{
                                      px: 0.95,
                                      height: 28,
                                      borderRadius: 1.25,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 0.45,
                                      bgcolor: alpha(nextCfg.color, 0.12),
                                      color: nextCfg.color,
                                      cursor: movingId === campaign.id ? 'progress' : 'pointer',
                                      opacity: movingId === campaign.id ? 0.6 : 0.9,
                                      alignSelf: 'flex-end',
                                      transition: 'opacity 120ms, background-color 120ms',
                                      '&:hover': { bgcolor: alpha(nextCfg.color, 0.24), opacity: 1 },
                                    }}
                                  >
                                    <IconExternalLink size={13} />
                                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, lineHeight: 1 }}>
                                      Mover para {nextCfg.label}
                                    </Typography>
                                  </Box>
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

      {/* Campaign drawer */}
      <Drawer
        anchor="right"
        open={Boolean(drawerCampaign)}
        onClose={() => setDrawerCampaign(null)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 440 }, p: 3 } }}
      >
        {drawerCampaign && (
          <Stack spacing={2.5}>
            {/* Header */}
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
              <Box flex={1}>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                  {drawerCampaign.name}
                </Typography>
                {drawerCampaign.objective && (
                  <Typography variant="caption" color="text.secondary">{drawerCampaign.objective}</Typography>
                )}
              </Box>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Abrir studio">
                  <IconButton
                    size="small"
                    onClick={() => router.push(`/clients/${selectedClient?.id || ''}?campaign=${drawerCampaign.id}`)}
                  >
                    <IconExternalLink size={16} />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={() => setDrawerCampaign(null)}>
                  <IconX size={16} />
                </IconButton>
              </Stack>
            </Stack>

            <Divider />

            {/* Status chip */}
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Status</Typography>
              <Chip
                size="small"
                label={getStatusCfg(drawerCampaign.status ?? 'draft').label}
                sx={{ bgcolor: getStatusCfg(drawerCampaign.status ?? 'draft').bg, color: getStatusCfg(drawerCampaign.status ?? 'draft').color, fontWeight: 600 }}
              />
            </Box>

            {/* Dates */}
            {(drawerCampaign.start_date || drawerCampaign.end_date) && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <IconCalendar size={14} color="#94a3b8" />
                <Typography variant="body2" color="text.secondary">
                  {formatDate(drawerCampaign.start_date) || '?'} → {formatDate(drawerCampaign.end_date) || '?'}
                </Typography>
              </Stack>
            )}

            {/* Budget */}
            {drawerCampaign.budget_brl && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <IconCurrencyDollar size={14} color="#94a3b8" />
                <Typography variant="body2" color="text.secondary">{formatCurrency(drawerCampaign.budget_brl)}</Typography>
              </Stack>
            )}

            <Divider />

            {/* Labels */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>Labels</Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
                {(drawerCampaign.labels ?? []).map((key) => {
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
                      sx={{ bgcolor: preset.color + '22', color: preset.color, fontWeight: 600, fontSize: '0.7rem', borderLeft: `3px solid ${preset.color}`, borderRadius: 1 }}
                    />
                  );
                })}
                <Tooltip title="Adicionar label">
                  <IconButton size="small" onClick={(e) => setLabelAnchor(e.currentTarget)}>
                    <IconLabel size={14} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            {/* Move to next status */}
            {(() => {
              const currentIdx = STATUS_ORDER.indexOf(drawerCampaign.status ?? '');
              const nextStatus = currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;
              if (!nextStatus) return null;
              const nextCfg = getStatusCfg(nextStatus);
              return (
                <Button
                  variant="outlined"
                  size="small"
                  disabled={movingId === drawerCampaign.id}
                  onClick={() => { moveStatus(drawerCampaign, nextStatus); setDrawerCampaign(null); }}
                  sx={{ color: nextCfg.color, borderColor: nextCfg.color + '88', '&:hover': { bgcolor: nextCfg.color + '12' } }}
                >
                  → Mover para {nextCfg.label}
                </Button>
              );
            })()}
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
