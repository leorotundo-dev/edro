'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import StatusChip from '@/components/shared/StatusChip';
import { apiGet, apiPost } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconChevronRight,
  IconExternalLink,
  IconSend,
  IconUserPlus,
  IconPin,
  IconArchive,
  IconHistory,
  IconNews,
  IconStarFilled,
  IconThumbUp,
  IconThumbDown,
  IconAlertTriangle,
} from '@tabler/icons-react';

type ClientRow = {
  id: string;
  name: string;
};

type ActionRow = {
  id: string;
  action: string;
  payload?: Record<string, any> | null;
  created_at?: string | null;
};

type ClippingItemDetail = {
  id: string;
  title: string;
  snippet?: string | null;
  content?: string | null;
  url?: string | null;
  image_url?: string | null;
  score?: number | null;
  status?: string | null;
  type?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  published_at?: string | null;
  actions?: ActionRow[];
};

type ClippingDetailClientProps = {
  itemId: string;
};

function formatNumber(value?: number | null) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export default function ClippingDetailClient({ itemId }: ClippingDetailClientProps) {
  const router = useRouter();
  const [item, setItem] = useState<ClippingItemDetail | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientId, setClientId] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [format, setFormat] = useState('Feed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!isUuid(itemId)) {
      setItem(null);
      setLoading(false);
      setError('ID do item invalido.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await apiGet<ClippingItemDetail>(`/clipping/items/${itemId}`);
      setItem(response || null);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar item.');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  const loadClients = useCallback(async () => {
    try {
      const response = await apiGet<ClientRow[]>('/clients');
      setClients(response || []);
      if (response?.length && !clientId) {
        setClientId(response[0].id);
      }
    } catch {
      setClients([]);
    }
  }, [clientId]);

  useEffect(() => {
    loadDetail();
    loadClients();
  }, [loadDetail, loadClients]);

  const handleAssign = async () => {
    if (!clientId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost(`/clipping/items/${itemId}/assign`, { clientIds: [clientId] });
      setSuccess('Item atribuido ao cliente.');
      await loadDetail();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atribuir item.');
    } finally {
      setSaving(false);
    }
  };

  const handlePin = async () => {
    if (!clientId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost(`/clipping/items/${itemId}/pin`, { scope: 'CLIENT', client_id: clientId });
      setSuccess('Item fixado.');
      await loadDetail();
    } catch (err: any) {
      setError(err?.message || 'Falha ao fixar item.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost(`/clipping/items/${itemId}/archive`, {});
      setSuccess('Item arquivado.');
      await loadDetail();
    } catch (err: any) {
      setError(err?.message || 'Falha ao arquivar item.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePost = async () => {
    if (!clientId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost(`/clipping/items/${itemId}/create-post`, {
        clientIds: [clientId],
        platform,
        format,
      });
      setSuccess('Post criado no calendario.');
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar post.');
    } finally {
      setSaving(false);
    }
  };

  const handleFeedback = async (feedback: 'relevant' | 'irrelevant' | 'wrong_client') => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPost(`/clipping/items/${itemId}/feedback`, {
        feedback,
        clientId: clientId || undefined,
      });
      setSuccess(
        feedback === 'relevant'
          ? 'Marcado como relevante.'
          : feedback === 'irrelevant'
            ? 'Marcado como irrelevante.'
            : 'Marcado como cliente errado.'
      );
      await loadDetail();
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar feedback.');
    } finally {
      setSaving(false);
    }
  };

  const actions = useMemo(() => item?.actions || [], [item]);

  if (loading && !item) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando detalhe...
        </Typography>
      </Stack>
    );
  }

  return (
    <AppShell
      title="Radar"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="text" size="small" onClick={() => router.push('/clipping')} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Radar
          </Button>
          <IconChevronRight size={14} />
          <Typography variant="body2" fontWeight={600}>Detalhe do item</Typography>
        </Stack>
      }
    >
      <Stack spacing={3}>
        {error ? (
          <Card sx={{ bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="error.main" variant="body2">{error}</Typography>
            </CardContent>
          </Card>
        ) : null}
        {success ? (
          <Card sx={{ bgcolor: 'success.lighter', border: '1px solid', borderColor: 'success.light' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography color="success.main" variant="body2">{success}</Typography>
            </CardContent>
          </Card>
        ) : null}

        <DashboardCard
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <StatusChip status={item?.status || 'NEW'} />
              <Chip
                size="small"
                icon={<IconStarFilled size={14} />}
                label={`Score ${formatNumber(item?.score)}`}
                color="primary"
                variant="outlined"
              />
            </Stack>
          }
        >
          {item?.image_url ? (
            <CardMedia
              component="img"
              image={item.image_url}
              alt=""
              sx={{ borderRadius: 2, maxHeight: 300, objectFit: 'cover', mb: 2 }}
            />
          ) : null}

          <Typography variant="h5" fontWeight={700} gutterBottom>{item?.title}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {item?.snippet || item?.content || 'Sem resumo.'}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle2" gutterBottom>Fonte</Typography>
              <Typography variant="body2" color="text.secondary">
                {item?.source_name || 'Nao informado'}
              </Typography>
            </Box>
            {item?.source_url ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<IconExternalLink size={14} />}
                href={item.source_url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir fonte
              </Button>
            ) : null}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
            <Chip size="small" label={item?.type || 'NEWS'} variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              {formatDate(item?.published_at)}
            </Typography>
          </Stack>
        </DashboardCard>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <DashboardCard title="Acoes">
              <Stack spacing={2}>
                <TextField
                  select
                  label="Cliente"
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  size="small"
                  fullWidth
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Plataforma"
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Formato"
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                  size="small"
                  fullWidth
                />
                <Button
                  variant="contained"
                  startIcon={<IconSend size={16} />}
                  onClick={handleCreatePost}
                  disabled={saving}
                  fullWidth
                >
                  Criar post
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<IconUserPlus size={16} />}
                  onClick={handleAssign}
                  disabled={saving}
                  fullWidth
                >
                  Atribuir ao cliente
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<IconPin size={16} />}
                  onClick={handlePin}
                  disabled={saving}
                  fullWidth
                >
                  Fixar no cliente
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconArchive size={16} />}
                  onClick={handleArchive}
                  disabled={saving}
                  fullWidth
                >
                  Arquivar
                </Button>
                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                  Feedback de qualidade
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<IconThumbUp size={16} />}
                    onClick={() => handleFeedback('relevant')}
                    disabled={saving}
                    sx={{ flex: 1 }}
                  >
                    Relevante
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<IconThumbDown size={16} />}
                    onClick={() => handleFeedback('irrelevant')}
                    disabled={saving}
                    sx={{ flex: 1 }}
                  >
                    Irrelevante
                  </Button>
                </Stack>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<IconAlertTriangle size={16} />}
                  onClick={() => handleFeedback('wrong_client')}
                  disabled={saving || !clientId}
                  fullWidth
                  size="small"
                >
                  Cliente errado
                </Button>
              </Stack>
            </DashboardCard>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <DashboardCard
              title="Historico"
              action={<Chip size="small" icon={<IconHistory size={14} />} label={`${actions.length} acoes`} variant="outlined" />}
            >
              <Stack spacing={1.5}>
                {actions.length ? (
                  actions.map((action) => (
                    <Box
                      key={action.id}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">{action.action}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(action.created_at)}
                        </Typography>
                      </Stack>
                      {action.payload ? (
                        <Box
                          component="pre"
                          sx={{
                            bgcolor: 'grey.50',
                            p: 1.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            overflow: 'auto',
                            maxHeight: 200,
                            m: 0,
                          }}
                        >
                          {JSON.stringify(action.payload, null, 2)}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Sem detalhes.</Typography>
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Nenhuma acao registrada.
                  </Typography>
                )}
              </Stack>
            </DashboardCard>
          </Grid>
        </Grid>
      </Stack>
    </AppShell>
  );
}
