'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import StatusChip from '@/components/shared/StatusChip';
import { apiGet, apiPost } from '@/lib/api';
import { useConfirm } from '@/hooks/useConfirm';
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
  IconSparkles,
} from '@tabler/icons-react';
import PautaFromClippingModal from './PautaFromClippingModal';
import type { PautaSuggestion } from '@/app/edro/PautaComparisonCard';

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
  noShell?: boolean;
  embedded?: boolean;
  backHref?: string;
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

const PAYLOAD_LABELS: Record<string, string> = {
  clientIds: 'Clientes',
  client_id: 'Cliente',
  platform: 'Plataforma',
  format: 'Formato',
  scope: 'Escopo',
  feedback: 'Feedback',
  note: 'Nota',
  status: 'Status',
  reason: 'Motivo',
  url: 'URL',
  name: 'Nome',
};

function renderPayload(payload: Record<string, any> | null | undefined) {
  if (!payload) return null;
  const entries = Object.entries(payload).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return null;
  return (
    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
      {entries.map(([key, value]) => (
        <Stack key={key} direction="row" spacing={1} alignItems="flex-start">
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72, fontWeight: 600, flexShrink: 0 }}>
            {PAYLOAD_LABELS[key] || key}:
          </Typography>
          <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
            {Array.isArray(value)
              ? value.join(', ')
              : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value)}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'Twitter / X', 'Pinterest', 'Google'];
const FORMATS_BY_PLATFORM: Record<string, string[]> = {
  Instagram: ['Feed', 'Stories', 'Reels', 'Carrossel', 'IGTV', 'Live'],
  Facebook: ['Feed', 'Stories', 'Reels', 'Live', 'Evento'],
  LinkedIn: ['Feed', 'Artigo', 'Vídeo'],
  TikTok: ['Vídeo', 'Live'],
  YouTube: ['Vídeo', 'Shorts', 'Live'],
  'Twitter / X': ['Post', 'Thread'],
  Pinterest: ['Pin', 'Ideia'],
  Google: ['Anúncio', 'Post GMB'],
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export default function ClippingDetailClient({ itemId, noShell, backHref }: ClippingDetailClientProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const backTo = backHref || '/clipping';
  const [item, setItem] = useState<ClippingItemDetail | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientId, setClientId] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [format, setFormat] = useState('Feed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [pautaLoading, setPautaLoading] = useState(false);
  const [pautaModal, setPautaModal] = useState<{ open: boolean; suggestion: PautaSuggestion | null }>({ open: false, suggestion: null });

  useEffect(() => {
    if (!isUuid(itemId)) {
      router.replace(backTo);
    }
  }, [backTo, itemId, router]);

  const loadDetail = useCallback(async () => {
    if (!isUuid(itemId)) {
      setItem(null);
      setLoading(false);
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
    if (!await confirm('Arquivar este item? Ele não aparecerá mais na lista principal.')) return;
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

  const content = (
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

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
              {item?.image_url ? (
                <CardMedia
                  component="img"
                  image={item.image_url}
                  alt=""
                  sx={{ maxHeight: 420, objectFit: 'cover' }}
                />
              ) : null}

              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <StatusChip status={item?.status || 'NEW'} />
                  <Chip size="small" label={item?.type || 'NEWS'} variant="outlined" />
                  <Chip
                    size="small"
                    icon={<IconStarFilled size={14} />}
                    label={`Score ${formatNumber(item?.score)}`}
                    color="primary"
                    variant="outlined"
                  />
                </Stack>

                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                  {item?.source_name || 'Fonte não informada'} · {formatDate(item?.published_at)}
                </Typography>

                <Typography variant="h3" fontWeight={700} sx={{ mt: 1, lineHeight: 1.1 }}>
                  {item?.title}
                </Typography>

                <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mt: 2, lineHeight: 1.55 }}>
                  {item?.snippet || 'Sem resumo disponível.'}
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="body1" sx={{ lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                  {item?.content || item?.snippet || 'Sem conteúdo expandido.'}
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
                  {item?.source_url ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<IconExternalLink size={14} />}
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir matéria
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<IconPin size={14} />}
                    onClick={handlePin}
                    disabled={saving || !clientId}
                  >
                    Fixar no cliente
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<IconArchive size={14} />}
                    color="error"
                    onClick={handleArchive}
                    disabled={saving}
                  >
                    Arquivar
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <DashboardCard
              title="Histórico editorial"
              subtitle="Tudo o que já aconteceu com este item dentro do radar."
              action={<Chip size="small" icon={<IconHistory size={14} />} label={`${actions.length} ações`} variant="outlined" />}
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
                        <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                          {renderPayload(action.payload)}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Sem detalhes.</Typography>
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Nenhuma ação registrada.
                  </Typography>
                )}
              </Stack>
            </DashboardCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            <DashboardCard title="Ações rápidas" subtitle="Leve este insight para a operação.">
              <Stack spacing={2}>
                <TextField
                  select
                  label="Cliente"
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  size="small"
                  fullWidth
                  helperText={!clientId ? 'Selecione um cliente para as ações abaixo.' : undefined}
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Plataforma"
                  value={platform}
                  onChange={(event) => {
                    setPlatform(event.target.value);
                    const options = FORMATS_BY_PLATFORM[event.target.value];
                    if (options) setFormat(options[0]);
                  }}
                  size="small"
                  fullWidth
                >
                  {PLATFORMS.map((p) => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Formato"
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                  size="small"
                  fullWidth
                >
                  {(FORMATS_BY_PLATFORM[platform] || ['Feed', 'Stories', 'Reels', 'Vídeo', 'Post']).map((f) => (
                    <MenuItem key={f} value={f}>{f}</MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  startIcon={<IconSend size={16} />}
                  onClick={handleCreatePost}
                  disabled={saving || !clientId}
                  fullWidth
                >
                  Criar post
                </Button>
                <Button
                  variant="outlined"
                  startIcon={pautaLoading ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <IconSparkles size={16} />}
                  disabled={pautaLoading || !clientId || !item}
                  fullWidth
                  sx={{ borderColor: '#E85219', color: '#E85219', '&:hover': { borderColor: '#c94315', bgcolor: 'rgba(232,82,25,0.04)' } }}
                  onClick={async () => {
                    if (!clientId || !item) return;
                    setPautaLoading(true);
                    try {
                      const res = await apiPost<{ ok: boolean; suggestion: PautaSuggestion }>(
                        '/pauta-inbox/from-clipping',
                        {
                          client_id: clientId,
                          clipping_id: item.id,
                          title: item.title || 'Pauta',
                          snippet: item.snippet || item.content?.slice(0, 300) || undefined,
                          url: item.url || undefined,
                          score: item.score ?? undefined,
                        }
                      );
                      if (res?.suggestion) {
                        setPautaModal({ open: true, suggestion: { ...res.suggestion, client_id: clientId } });
                      }
                    } finally {
                      setPautaLoading(false);
                    }
                  }}
                >
                  {pautaLoading ? 'Gerando pauta...' : 'Criar pauta IA'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<IconUserPlus size={16} />}
                  onClick={handleAssign}
                  disabled={saving || !clientId}
                  fullWidth
                >
                  Atribuir ao cliente
                </Button>
              </Stack>
            </DashboardCard>

            <DashboardCard title="Classificação" subtitle="Defina a relevância deste item para a base.">
              <Stack spacing={1.5}>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<IconThumbUp size={16} />}
                  onClick={() => handleFeedback('relevant')}
                  disabled={saving}
                  fullWidth
                >
                  Marcar como relevante
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconThumbDown size={16} />}
                  onClick={() => handleFeedback('irrelevant')}
                  disabled={saving}
                  fullWidth
                >
                  Marcar como irrelevante
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<IconAlertTriangle size={16} />}
                  onClick={() => handleFeedback('wrong_client')}
                  disabled={saving || !clientId}
                  fullWidth
                >
                  Cliente errado
                </Button>
              </Stack>
            </DashboardCard>

            <DashboardCard title="Ficha do item" subtitle="Metadados rápidos para leitura e decisão.">
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Fonte</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>
                    {item?.source_name || 'Não informada'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Publicado em</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatDate(item?.published_at)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Tipo</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {item?.type || 'NEWS'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Score</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatNumber(item?.score)}
                  </Typography>
                </Stack>
                {item?.source_url ? (
                  <>
                    <Divider />
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<IconExternalLink size={14} />}
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir fonte original
                    </Button>
                  </>
                ) : null}
              </Stack>
            </DashboardCard>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );

  if (noShell) {
    return content;
  }

  return (
    <>
      <AppShell
        title="Radar"
        topbarLeft={
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="text" size="small" onClick={() => router.push(backTo)} sx={{ color: 'text.secondary', textTransform: 'none' }}>
              Radar
            </Button>
            <IconChevronRight size={14} />
            <Typography variant="body2" fontWeight={600}>Detalhe do item</Typography>
          </Stack>
        }
      >
        {content}
      </AppShell>
      <PautaFromClippingModal
        open={pautaModal.open}
        suggestion={pautaModal.suggestion}
        onClose={() => setPautaModal({ open: false, suggestion: null })}
      />
    </>
  );
}
