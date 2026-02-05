'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import StatusChip from '@/components/shared/StatusChip';
import BulkPostActions from '@/components/BulkPostActions';
import { apiGet, apiPost, buildApiUrl } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconX, IconArrowLeft, IconUsers, IconDownload, IconFileText, IconSend, IconBuildingStore } from '@tabler/icons-react';

type PostAsset = {
  id: string;
  post_index: number;
  status: string;
  payload: any;
};

const STATUS_COLORS: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  approved: 'success',
  rejected: 'error',
  review: 'warning',
  draft: 'default',
};

export default function CalendarReviewPage() {
  const router = useRouter();
  const params = useParams();
  const calendarId = String(params?.id || '');

  const [rows, setRows] = useState<PostAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const [iclipsUrl, setIclipsUrl] = useState('');
  const [iclipsKey, setIclipsKey] = useState('');
  const [iclipsResult, setIclipsResult] = useState('');

  const [briefsOpen, setBriefsOpen] = useState(false);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourcesTarget, setSourcesTarget] = useState<PostAsset | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet(`/calendars/${calendarId}/posts`);
      setRows(data || []);
      setSelected({});
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar posts.');
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    loadPosts();
  }, [calendarId, loadPosts]);

  const indices = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([key]) => Number(key)),
    [selected]
  );

  const hasSelection = indices.length > 0;

  const setStatus = async (index: number, status: string) => {
    setError('');
    try {
      await apiPost(`/calendars/${calendarId}/posts/${index}/status`, { status });
      await loadPosts();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar status.');
    }
  };

  const bulkAction = async (action: 'approve' | 'reject' | 'move_to_review') => {
    if (!indices.length) {
      setError('Selecione pelo menos um post.');
      return;
    }
    setError('');
    try {
      await apiPost(`/calendars/${calendarId}/posts/bulk`, { action, indices });
      await loadPosts();
    } catch (err: any) {
      setError(err?.message || 'Falha na aprovacao em lote.');
    }
  };

  const downloadFile = async (kind: 'csv' | 'iclips') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) return;

    const path =
      kind === 'csv'
        ? `/api/calendars/${calendarId}/export.csv`
        : `/api/calendars/${calendarId}/export.iclips.json`;

    const response = await fetch(buildApiUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setError('Falha ao exportar.');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = kind === 'csv' ? `calendar-${calendarId}.csv` : `calendar-${calendarId}.iclips.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleIclipsPush = async () => {
    setError('');
    setIclipsResult('');
    try {
      const res = await apiPost(`/integrations/iclips/push/${calendarId}`, {
        url: iclipsUrl,
        apiKey: iclipsKey || undefined,
      });
      setIclipsResult(typeof res === 'string' ? res : JSON.stringify(res));
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar para iClips.');
    }
  };

  const loadBriefs = async () => {
    setError('');
    try {
      const data = await apiGet(`/calendars/${calendarId}/briefs`);
      setBriefs(Array.isArray(data) ? data : []);
      setBriefsOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefs.');
    }
  };

  const loadSources = async (post: PostAsset) => {
    setSourcesTarget(post);
    setSourcesOpen(true);
    setSourcesLoading(true);
    setError('');
    try {
      const data = await apiGet(`/posts/${post.id}/sources`);
      setSources(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar fontes.');
      setSources([]);
    } finally {
      setSourcesLoading(false);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando aprovacao...
        </Typography>
      </Stack>
    );
  }

  return (
    <AppShell
      title="Calendar Review"
      meta={`Calendar ${calendarId}`}
      topbarExtra={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" size="small" onClick={() => router.push('/calendar')}>
            Back to calendar
          </Button>
          <Button variant="outlined" size="small" onClick={() => router.push('/clients')}>
            Clients
          </Button>
        </Stack>
      }
    >
      <Stack spacing={3}>
        {error ? <Alert severity="error">{error}</Alert> : null}

        {/* Header card */}
        <DashboardCard>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems={{ lg: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="overline" color="text.secondary">Calendar Review</Typography>
              <Typography variant="h4">Calendar {calendarId}</Typography>
              <Typography variant="body2" color="text.secondary">{rows.length} posts prontos para aprovacao</Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" size="small" startIcon={<IconDownload size={16} />} onClick={() => downloadFile('csv')}>
                Export CSV
              </Button>
              <Button variant="outlined" size="small" startIcon={<IconDownload size={16} />} onClick={() => downloadFile('iclips')}>
                Export iClips
              </Button>
              <Button variant="outlined" size="small" startIcon={<IconFileText size={16} />} onClick={loadBriefs}>
                Briefs AdCreative
              </Button>
            </Stack>
          </Stack>
        </DashboardCard>

        {/* Bulk actions */}
        <DashboardCard>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <Typography variant="overline" color="text.secondary">
              Selected {indices.length} posts
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" size="small" color="info" onClick={() => setShowBulkActions(true)}>
                Advanced Bulk Actions
              </Button>
              <Button variant="outlined" size="small" onClick={() => bulkAction('move_to_review')} disabled={!hasSelection}>
                Mover p/ review
              </Button>
              <Button variant="contained" size="small" onClick={() => bulkAction('approve')} disabled={!hasSelection}>
                Aprovar em lote
              </Button>
              <Button variant="outlined" size="small" color="error" onClick={() => bulkAction('reject')} disabled={!hasSelection}>
                Rejeitar em lote
              </Button>
            </Stack>
          </Stack>
        </DashboardCard>

        {/* Posts table */}
        <Card variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">Sel</TableCell>
                  <TableCell>#</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Formato</TableCell>
                  <TableCell>Headline</TableCell>
                  <TableCell>Acoes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={!!selected[row.post_index]}
                        onChange={(event) =>
                          setSelected((state) => ({ ...state, [row.post_index]: event.target.checked }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="text.secondary">{row.post_index}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={row.status || 'pending'} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{row.payload?.date}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{row.payload?.format}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {row.payload?.copy?.headline || 'Sem headline'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        <Button variant="outlined" size="small" onClick={() => loadSources(row)}>
                          Fontes
                        </Button>
                        <Button variant="outlined" size="small" onClick={() => setStatus(row.post_index, 'review')}>
                          Review
                        </Button>
                        <Button variant="contained" size="small" onClick={() => setStatus(row.post_index, 'approved')}>
                          Aprovar
                        </Button>
                        <Button variant="outlined" size="small" color="error" onClick={() => setStatus(row.post_index, 'rejected')}>
                          Rejeitar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {rows.length === 0 ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary">Nenhum post encontrado.</Typography>
            </Box>
          ) : null}
        </Card>

        {/* iClips bridge */}
        <DashboardCard title="Ponte iClips" subtitle="Envio direto via webhook/endpoint">
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="URL do endpoint"
                  value={iclipsUrl}
                  onChange={(event) => setIclipsUrl(event.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, lg: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="API Key (opcional)"
                  value={iclipsKey}
                  onChange={(event) => setIclipsKey(event.target.value)}
                />
              </Grid>
            </Grid>
            <Stack direction="row" justifyContent="flex-end">
              <Button variant="contained" startIcon={<IconSend size={16} />} onClick={handleIclipsPush}>
                Enviar para iClips
              </Button>
            </Stack>
            {iclipsResult ? (
              <Alert severity="success">{iclipsResult}</Alert>
            ) : null}
          </Stack>
        </DashboardCard>
      </Stack>

      {/* Briefs Dialog */}
      <Dialog open={briefsOpen} onClose={() => setBriefsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Briefs para AdCreative</Typography>
            <IconButton size="small" onClick={() => setBriefsOpen(false)}>
              <IconX size={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {briefs.length === 0 ? (
            <Typography variant="body2">Sem briefs encontrados.</Typography>
          ) : (
            <Stack spacing={2}>
              {briefs.map((item: any) => (
                <Card key={item.post_id} variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      {item.date} - {item.platform} - {item.format}
                    </Typography>
                    <Box component="pre" sx={{ fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(item.brief, null, 2)}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Sources Dialog */}
      <Dialog
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {sourcesTarget ? `Fontes do post #${sourcesTarget.post_index}` : 'Fontes do post'}
            </Typography>
            <IconButton size="small" onClick={() => setSourcesOpen(false)}>
              <IconX size={18} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {sourcesLoading ? (
            <Typography variant="body2">Carregando fontes...</Typography>
          ) : sources.length === 0 ? (
            <Typography variant="body2">Nenhuma fonte registrada.</Typography>
          ) : (
            <Stack spacing={2}>
              {sources.map((source: any) => (
                <Card key={source.id} variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2">{source.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {source.type} | {source.category} | peso {source.weight}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      score {Number(source.score || 0).toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <BulkPostActions
        calendarId={calendarId}
        isOpen={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        onSuccess={loadPosts}
      />
    </AppShell>
  );
}
